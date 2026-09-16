import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleGenerativeAI, type GenerativeModel } from '@google/generative-ai';
import type { Env } from '@config/env.validation';
import type { ImagePart, VisionProvider } from '@infra/ai/vision-provider';
import {
  ATTEMPTS_PER_MODEL,
  TOTAL_BUDGET_MS,
  attemptBudget,
  backoffDelay,
  buildCandidates,
  isModelUnavailable,
  isOverloaded,
  isTimeout,
  isTransient,
  sleep,
  withTimeout,
} from '@infra/ai/resilience';

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
 * Fronteira com o Google Gemini.
 *
 * Isolado em `infra` porque é a única parte do scan que depende de rede,
 * de chave de API e do formato de um fornecedor específico. O módulo de scan
 * conhece esta interface e não o SDK — trocar de modelo (ou cair para um
 * fornecedor alternativo) não toca em regra de produto nenhuma.
 */
@Injectable()
export class GeminiClient implements VisionProvider {
  private readonly logger = new Logger(GeminiClient.name);

  readonly providerName = 'Gemini';
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
    this.candidates = buildCandidates(configured, FALLBACK_MODELS);
  }

  /** `false` quando não há chave configurada; o scan cai para dados de demonstração. */
  get isConfigured(): boolean {
    return this.genAI !== null;
  }

  /** Devolve o texto cru do modelo. Interpretá-lo é responsabilidade de quem chama. */
  async describeImages(prompt: string, images: readonly ImagePart[]): Promise<string> {
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
              ...images.map((image) => ({
                inlineData: { data: image.base64, mimeType: image.mimeType },
              })),
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
          // Timeout entra aqui junto com sobrecarga: nos três casos o que
          // resolve é trocar de modelo, não insistir no mesmo.
          if (isOverloaded(message) || isModelUnavailable(message) || isTimeout(message)) break;

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

        /*
         * Teto explícito de saída.
         *
         * Sem ele a resposta vinha cortada no meio do JSON — o log registrou
         * `"topics": [ "A fotossí` e nada mais, e o parser recusava a análise
         * inteira. Os modelos flash atuais raciocinam antes de responder, e
         * esses tokens de raciocínio saem do mesmo orçamento da resposta: o
         * padrão não sobra para um resumo longo mais tópicos e flashcards.
         */
        maxOutputTokens: 8192,
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
