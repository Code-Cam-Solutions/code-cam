import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleGenerativeAI, type GenerativeModel } from '@google/generative-ai';
import type { Env } from '@config/env.validation';

/** Imagem pronta para envio ao modelo. */
export interface ImagePart {
  base64: string;
  mimeType: string;
}

/**
 * Modelos tentados quando o principal está sem capacidade, em ordem.
 *
 * Não é redundância teórica: medindo os modelos disponíveis com a mesma foto,
 * no mesmo minuto, `gemini-3.6-flash` e `gemini-flash-latest` responderam 503
 * ("high demand") enquanto `gemini-3.5-flash` respondeu em 3,5s. Sobrecarga no
 * Gemini é por modelo, então trocar de modelo resolve onde insistir no mesmo
 * só gasta o tempo do usuário — uma rodada de teste levou 109s para acabar em
 * erro, tentando três vezes o mesmo modelo lotado.
 *
 * A ordem é por qualidade de leitura: os `flash` completos leem letra de lousa
 * melhor que os `lite`, que entram no fim como último recurso.
 */
const FALLBACK_MODELS = ['gemini-3.5-flash', 'gemini-3.6-flash', 'gemini-3.5-flash-lite'];

/**
 * Ordem em que os modelos são tentados: o configurado primeiro, as alternativas
 * depois. O `Set` evita tentar duas vezes o mesmo modelo quando o configurado
 * já está na lista de alternativas — o que faria a análise gastar o dobro do
 * tempo em um modelo lotado antes de passar ao próximo.
 */
export function buildCandidates(configured: string): string[] {
  return [...new Set([configured, ...FALLBACK_MODELS])];
}

/**
 * Tentativas por modelo antes de passar ao próximo.
 *
 * Duas, e não mais: falha passageira que não é sobrecarga (rede oscilando)
 * costuma passar na segunda; sobrecarga não passa por insistência, e para ela
 * a saída é o próximo modelo da lista.
 */
const ATTEMPTS_PER_MODEL = 2;

/** Espera base entre tentativas no mesmo modelo. Dobra a cada uma, com ruído. */
const RETRY_BASE_MS = 700;

/**
 * Teto de tempo para a análise inteira, somando modelos e tentativas.
 *
 * Existe porque a alternativa é pior que o erro: sem teto, uma sequência de
 * modelos lentos deixa alguém olhando a tela de "analisando" por minutos para
 * receber uma falha no fim. Preferível avisar em 45s.
 */
const TOTAL_BUDGET_MS = 45_000;

/**
 * Teto de uma única chamada ao modelo.
 *
 * Sem isto, a lista de modelos alternativos era decorativa. Uma chamada que
 * trava não devolve erro: ela fica pendurada até o orçamento inteiro acabar, e
 * aí não sobra tempo para tentar o próximo modelo. Foi exatamente o que os
 * logs mostraram — "tentativa 1" seguida de "orçamento esgotado" no mesmo
 * segundo, com dois modelos livres que nunca chegaram a ser chamados.
 *
 * O valor é dividido pelo que resta de orçamento e de candidatos, para que a
 * fila inteira caiba no tempo total, e limitado por baixo para não cortar uma
 * resposta que estava quase chegando.
 */
const MIN_ATTEMPT_MS = 9_000;
const MAX_ATTEMPT_MS = 20_000;

/** Reparte o tempo que sobra entre os modelos que ainda não foram tentados. */
export function attemptBudget(remainingMs: number, remainingModels: number): number {
  const share = remainingMs / Math.max(1, remainingModels);
  return Math.round(Math.min(MAX_ATTEMPT_MS, Math.max(MIN_ATTEMPT_MS, share)));
}

/**
 * Corre a chamada contra um relógio.
 *
 * O SDK do Gemini não expõe cancelamento, então a promessa perdedora segue
 * viva em segundo plano — o que se ganha é o direito de seguir em frente sem
 * esperá-la, que é o ponto.
 */
function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`timeout: o modelo não respondeu em ${ms}ms`));
    }, ms);

    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (err: unknown) => {
        clearTimeout(timer);
        reject(err instanceof Error ? err : new Error(String(err)));
      },
    );
  });
}

/**
 * Fronteira com o Google Gemini.
 *
 * Isolado em `infra` porque é a única parte do scan que depende de rede,
 * de chave de API e do formato de um fornecedor específico. O módulo de scan
 * conhece esta interface e não o SDK — trocar de modelo (ou cair para um
 * fornecedor alternativo) não toca em regra de produto nenhuma.
 */
@Injectable()
export class GeminiClient {
  private readonly logger = new Logger(GeminiClient.name);
  private readonly genAI: GoogleGenerativeAI | null;
  /** O modelo configurado primeiro, depois as alternativas, sem repetição. */
  private readonly candidates: string[];
  /** Instâncias do SDK criadas sob demanda e reaproveitadas. */
  private readonly models = new Map<string, GenerativeModel>();

  constructor(config: ConfigService<Env, true>) {
    const apiKey = config.get('GEMINI_API_KEY', { infer: true });
    const configured = config.get('GEMINI_MODEL', { infer: true });

    // Sem chave o cliente não é criado. A alternativa anterior — instanciar com
    // a string 'mock' — deixava um objeto que parecia utilizável e só falhava
    // na primeira chamada de rede.
    this.genAI = apiKey ? new GoogleGenerativeAI(apiKey) : null;
    this.candidates = buildCandidates(configured);
  }

  /** `false` quando não há chave configurada; o scan cai para dados de demonstração. */
  get isConfigured(): boolean {
    return this.genAI !== null;
  }

  /** Devolve o texto cru do modelo. Interpretá-lo é responsabilidade de quem chama. */
  async describeImage(prompt: string, image: ImagePart): Promise<string> {
    if (!this.genAI) {
      throw new ServiceUnavailableException('A análise por IA não está configurada.');
    }

    const deadline = Date.now() + TOTAL_BUDGET_MS;
    let lastError: unknown;

    for (const [index, modelName] of this.candidates.entries()) {
      for (let attempt = 1; attempt <= ATTEMPTS_PER_MODEL; attempt++) {
        try {
          const budget = attemptBudget(deadline - Date.now(), this.candidates.length - index);
          const result = await withTimeout(
            this.modelFor(modelName).generateContent([
              prompt,
              { inlineData: { data: image.base64, mimeType: image.mimeType } },
            ]),
            budget,
          );
          return result.response.text();
        } catch (err) {
          lastError = err;
          const message = err instanceof Error ? err.message : String(err);

          // Modelo aposentado, chave inválida, imagem recusada: insistir não
          // muda o resultado, e trocar de modelo não conserta chave errada.
          if (!isTransient(message) && !isModelUnavailable(message)) {
            throw this.translate(err, modelName);
          }

          this.logger.warn(`Modelo ${modelName}, tentativa ${attempt}: ${message.slice(0, 120)}`);

          // Sobrecarga é por modelo: o próximo da lista pode estar livre agora.
          if (isOverloaded(message) || isModelUnavailable(message)) break;

          if (attempt === ATTEMPTS_PER_MODEL) break;

          const delay = backoffDelay(attempt);
          if (Date.now() + delay > deadline) break;
          await sleep(delay);
        }
      }

      if (Date.now() > deadline) {
        this.logger.error(`Orçamento de ${TOTAL_BUDGET_MS}ms esgotado na análise da imagem.`);
        break;
      }
    }

    throw this.translate(lastError, this.candidates.join(', '));
  }

  private modelFor(name: string): GenerativeModel {
    const cached = this.models.get(name);
    if (cached) return cached;

    // O `genAI` nulo já foi barrado em describeImage; aqui ele existe.
    const model = this.genAI!.getGenerativeModel({
      model: name,
      generationConfig: {
        /*
         * Obriga o modelo a devolver JSON sintaticamente válido, em vez de
         * pedir isso por educação no prompt. Duas consequências medidas na
         * mesma imagem de teste: a resposta parou de vir embrulhada em cercas
         * de markdown (que o parser tinha de raspar na mão) e o tempo caiu de
         * ~19s para ~11s, porque o modelo deixa de gastar tokens escrevendo
         * texto ao redor do JSON.
         */
        responseMimeType: 'application/json',
      },
    });

    this.models.set(name, model);
    return model;
  }

  /**
   * Converte a falha do fornecedor em algo acionável. As mensagens do SDK são
   * em inglês e citam detalhes de cota que não ajudam quem está com o celular
   * na mão diante de uma lousa.
   *
   * A distinção que importa é entre falha passageira e falha de configuração: a
   * primeira melhora tentando de novo, a segunda não melhora nunca. Confundir
   * as duas foi o que aconteceu quando o modelo fixo no código foi aposentado —
   * o app pedia "tente novamente" para um erro que nenhuma tentativa resolveria.
   */
  private translate(err: unknown, model: string): ServiceUnavailableException {
    const message = err instanceof Error ? err.message : String(err);
    this.logger.error(`Falha na chamada ao Gemini (${model}): ${message}`);

    if (isModelUnavailable(message)) {
      // Grito deliberado no log: só quem opera o servidor pode resolver isto, e
      // a única pista que existe é esta linha.
      this.logger.error(
        `Nenhum modelo da lista está disponível para esta chave (${model}). ` +
          'Modelos do Gemini são aposentados sem aviso — ajuste GEMINI_MODEL no .env ' +
          'com um modelo atual (lista em https://ai.google.dev/gemini-api/docs/models).',
      );
      return new ServiceUnavailableException(
        'A análise por IA está fora do ar. Avise quem cuida do aplicativo — não adianta tentar de novo.',
      );
    }

    if (isOverloaded(message)) {
      return new ServiceUnavailableException(
        'A IA está sobrecarregada neste momento. Aguarde alguns segundos e tente de novo.',
      );
    }

    /*
     * O filtro de recitação bloqueia a resposta quando ela se parece demais com
     * texto protegido — o que acontece justamente com página de livro didático,
     * que é material típico deste app. Não é sobrecarga nem erro de rede:
     * repetir a mesma foto dá o mesmo bloqueio, e o que muda o resultado é
     * mudar o enquadramento.
     */
    if (message.includes('RECITATION')) {
      return new ServiceUnavailableException(
        'A IA bloqueou a resposta por semelhança com texto protegido por direitos autorais. ' +
          'Fotografe um trecho menor ou enquadre só a parte que você quer estudar.',
      );
    }

    if (message.includes('quota') || message.includes('429')) {
      return new ServiceUnavailableException(
        'O limite de análises foi atingido. Aguarde um instante e tente de novo.',
      );
    }

    if (message.includes('timeout') || message.includes('ETIMEDOUT')) {
      return new ServiceUnavailableException(
        'A análise demorou mais que o esperado. Tente novamente.',
      );
    }

    if (message.includes('API key') || message.includes('API_KEY')) {
      return new ServiceUnavailableException(
        'A análise por IA está indisponível no momento. Avise quem cuida do aplicativo.',
      );
    }

    return new ServiceUnavailableException('Não foi possível analisar a imagem. Tente novamente.');
  }
}

/**
 * Reconhece a falha de "esse modelo não existe (mais) para você".
 *
 * O Google usa redações diferentes para a mesma situação — 404 seco para
 * modelo inexistente, e uma frase explicativa para modelo descontinuado que
 * ainda atende quem já usava.
 */
export function isModelUnavailable(message: string): boolean {
  return (
    message.includes('404') ||
    message.includes('NOT_FOUND') ||
    message.includes('is not found') ||
    message.includes('no longer available') ||
    message.includes('not supported for generateContent')
  );
}

/**
 * Falha do lado do fornecedor que costuma passar sozinha: sobrecarga do
 * modelo, limite de vazão momentâneo, rede instável.
 */
export function isTransient(message: string): boolean {
  return (
    isOverloaded(message) ||
    message.includes('429') ||
    message.includes('timeout') ||
    message.includes('ETIMEDOUT') ||
    message.includes('ECONNRESET') ||
    message.includes('fetch failed')
  );
}

/** Modelo momentaneamente sem capacidade — a falha mais comum na prática. */
export function isOverloaded(message: string): boolean {
  return (
    message.includes('503') ||
    message.includes('high demand') ||
    message.includes('overloaded') ||
    message.includes('UNAVAILABLE')
  );
}

/**
 * Espera exponencial com ruído. O ruído importa: sem ele, várias capturas que
 * falharam juntas voltariam exatamente no mesmo instante e manteriam a
 * sobrecarga que causou a falha.
 */
export function backoffDelay(attempt: number, random: () => number = Math.random): number {
  const exponential = RETRY_BASE_MS * 2 ** (attempt - 1);
  return Math.round(exponential * (0.75 + random() * 0.5));
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
