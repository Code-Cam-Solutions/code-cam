import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
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

const ENDPOINT = 'https://integrate.api.nvidia.com/v1/chat/completions';

/**
 * Modelos tentados quando o principal falha, em ordem.
 *
 * Medidos com a mesma foto de lousa, no mesmo dia:
 *
 *   moonshotai/kimi-k3                  18,3s  JSON válido, 5 tópicos, 7 cartões
 *   meta/llama-3.2-11b-vision-instruct  39,0s  JSON válido, 6 tópicos, 1 cartão
 *
 * O llama entra como rede de segurança, não como equivalente: ele lê a imagem,
 * mas obedece mal à instrução de quantidade — um único flashcard onde foram
 * pedidos de três a oito. Serve para o app não parar; não serve como padrão.
 *
 * Vários modelos do catálogo respondem 404 mesmo aparecendo em /v1/models: a
 * lista mostra o que existe, não o que a sua chave alcança.
 */
const FALLBACK_MODELS = ['moonshotai/kimi-k3', 'meta/llama-3.2-11b-vision-instruct'];

/** Resposta do endpoint, no formato compatível com OpenAI. */
interface ChatCompletion {
  choices?: { message?: { content?: unknown } }[];
  error?: { message?: unknown };
}

/**
 * Fronteira com a API de inferência da NVIDIA.
 *
 * O endpoint é compatível com OpenAI, então não há SDK: uma requisição HTTP com
 * `fetch` cobre tudo que o app precisa e evita mais uma dependência que precisa
 * ser mantida atualizada.
 */
@Injectable()
export class NvidiaClient implements VisionProvider {
  private readonly logger = new Logger(NvidiaClient.name);
  private readonly apiKey: string | undefined;
  private readonly candidates: string[];

  readonly providerName = 'NVIDIA';

  constructor(config: ConfigService<Env, true>) {
    this.apiKey = config.get('NVIDIA_API_KEY', { infer: true });
    this.candidates = buildCandidates(
      config.get('NVIDIA_MODEL', { infer: true }),
      FALLBACK_MODELS,
    );
  }

  get isConfigured(): boolean {
    return Boolean(this.apiKey);
  }

  async describeImages(prompt: string, images: readonly ImagePart[]): Promise<string> {
    if (!this.apiKey) {
      throw new ServiceUnavailableException('A análise por IA não está configurada.');
    }

    const deadline = Date.now() + TOTAL_BUDGET_MS;
    let lastError: unknown;

    for (const [index, model] of this.candidates.entries()) {
      for (let attempt = 1; attempt <= ATTEMPTS_PER_MODEL; attempt++) {
        try {
          const budget = attemptBudget(deadline - Date.now(), this.candidates.length - index);
          return await withTimeout(this.request(model, prompt, images), budget);
        } catch (err) {
          lastError = err;
          const message = err instanceof Error ? err.message : String(err);

          // Chave inválida, imagem recusada: insistir não muda o resultado, e
          // trocar de modelo não conserta credencial errada.
          if (!isTransient(message) && !isModelUnavailable(message)) {
            throw this.translate(err, model);
          }

          this.logger.warn(`Modelo ${model}, tentativa ${attempt}: ${message.slice(0, 140)}`);

          // Sobrecarga e indisponibilidade são por modelo: o próximo pode estar
          // livre agora.
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

  /** Uma chamada ao endpoint. Erros de HTTP viram exceção com o corpo junto. */
  private async request(
    model: string,
    prompt: string,
    images: readonly ImagePart[],
  ): Promise<string> {
    const response = await fetch(ENDPOINT, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.apiKey ?? ''}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        messages: [
          {
            role: 'user',
            content: [
              { type: 'text', text: prompt },
              // A API aceita data URL, que é exatamente o formato em que a
              // imagem já chega do multipart — sem upload intermediário.
              ...images.map((image) => ({
                type: 'image_url' as const,
                image_url: { url: `data:${image.mimeType};base64,${image.base64}` },
              })),
            ],
          },
        ],
        max_tokens: 2048,
        // Baixa de propósito: a tarefa é transcrever e resumir o que está na
        // foto, não inventar. Criatividade aqui vira conteúdo que a lousa não
        // tinha, e o estudante não tem como saber disso.
        temperature: 0.2,
        stream: false,
        response_format: { type: 'json_object' },
      }),
    });

    const texto = await response.text();

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${texto.slice(0, 200)}`);
    }

    const corpo = JSON.parse(texto) as ChatCompletion;
    const conteudo = corpo.choices?.[0]?.message?.content;

    if (typeof conteudo !== 'string' || conteudo.trim() === '') {
      throw new Error(`Resposta sem conteúdo utilizável: ${texto.slice(0, 200)}`);
    }

    return conteudo;
  }

  /**
   * Converte a falha do fornecedor em algo acionável. A distinção que importa é
   * entre falha passageira e falha de configuração: a primeira melhora tentando
   * de novo, a segunda não melhora nunca.
   */
  private translate(err: unknown, model: string): ServiceUnavailableException {
    const message = err instanceof Error ? err.message : String(err);
    this.logger.error(`Falha na chamada à NVIDIA (${model}): ${message.slice(0, 300)}`);

    if (message.includes('401') || message.includes('403')) {
      this.logger.error(
        'A NVIDIA recusou a credencial. Confira NVIDIA_API_KEY no .env — ' +
          'a chave começa com "nvapi-" e é gerada em https://build.nvidia.com.',
      );
      return new ServiceUnavailableException(
        'A análise por IA está indisponível. Avise quem cuida do aplicativo.',
      );
    }

    if (isModelUnavailable(message)) {
      this.logger.error(
        `Nenhum modelo da lista respondeu para esta chave (${model}). O catálogo em ` +
          '/v1/models mostra o que existe, não o que a chave alcança — ajuste NVIDIA_MODEL.',
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

    if (message.includes('429')) {
      return new ServiceUnavailableException(
        'O limite de análises foi atingido. Aguarde um instante e tente de novo.',
      );
    }

    if (message.includes('timeout')) {
      return new ServiceUnavailableException(
        'A análise demorou mais que o esperado. Tente novamente.',
      );
    }

    return new ServiceUnavailableException('Não foi possível analisar a imagem. Tente novamente.');
  }
}
