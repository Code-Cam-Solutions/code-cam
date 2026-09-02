import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleGenerativeAI } from '@google/generative-ai';
import type { Env } from '@config/env.validation';

/** Imagem pronta para envio ao modelo. */
export interface ImagePart {
  base64: string;
  mimeType: string;
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
  private readonly model: ReturnType<GoogleGenerativeAI['getGenerativeModel']> | null;

  constructor(config: ConfigService<Env, true>) {
    const apiKey = config.get('GEMINI_API_KEY', { infer: true });

    // Sem chave o cliente não é criado. A alternativa anterior — instanciar com
    // a string 'mock' — deixava um objeto que parecia utilizável e só falhava
    // na primeira chamada de rede.
    this.model = apiKey
      ? new GoogleGenerativeAI(apiKey).getGenerativeModel({ model: 'gemini-1.5-flash' })
      : null;
  }

  /** `false` quando não há chave configurada; o scan cai para dados de demonstração. */
  get isConfigured(): boolean {
    return this.model !== null;
  }

  /** Devolve o texto cru do modelo. Interpretá-lo é responsabilidade de quem chama. */
  async describeImage(prompt: string, image: ImagePart): Promise<string> {
    if (!this.model) {
      throw new ServiceUnavailableException('A análise por IA não está configurada.');
    }

    try {
      const result = await this.model.generateContent([
        prompt,
        { inlineData: { data: image.base64, mimeType: image.mimeType } },
      ]);
      return result.response.text();
    } catch (err) {
      throw this.translate(err);
    }
  }

  /**
   * Converte a falha do fornecedor em algo que o usuário entenda. As mensagens
   * do SDK são em inglês e citam detalhes de cota que não ajudam quem está com
   * o celular na mão diante de uma lousa.
   */
  private translate(err: unknown): ServiceUnavailableException {
    const message = err instanceof Error ? err.message : String(err);
    this.logger.error(`Falha na chamada ao Gemini: ${message}`);

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
      return new ServiceUnavailableException('A análise por IA está indisponível no momento.');
    }

    return new ServiceUnavailableException('Não foi possível analisar a imagem. Tente novamente.');
  }
}
