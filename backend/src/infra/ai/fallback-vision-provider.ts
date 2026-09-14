import { Logger, ServiceUnavailableException } from '@nestjs/common';
import { isOverloaded, isTransient } from './resilience';
import type { ImagePart, VisionProvider } from './vision-provider';

/**
 * Encadeia dois fornecedores de visão.
 *
 * Existe porque a lentidão da análise não vem do nosso código: vem da fila do
 * serviço. Medindo a mesma foto de lousa no mesmo dia, o Gemini respondeu em
 * 19,7s e a NVIDIA levou de 83s a 105s — e minutos depois o Gemini devolveu
 * 503 por sobrecarga. Nenhum dos dois é confiável sozinho, e os dois raramente
 * estão congestionados ao mesmo tempo.
 *
 * A ordem importa: o primeiro é o que costuma ser mais rápido, o segundo existe
 * para o app não parar quando o primeiro está lotado. Trocar de fornecedor no
 * meio é mais barato que devolver erro — o usuário já esperou, e refazer a foto
 * custaria a espera inteira de novo.
 */
export class FallbackVisionProvider implements VisionProvider {
  private readonly logger = new Logger(FallbackVisionProvider.name);

  constructor(
    private readonly primary: VisionProvider,
    private readonly secondary: VisionProvider,
  ) {}

  get providerName(): string {
    return `${this.primary.providerName} → ${this.secondary.providerName}`;
  }

  /** Basta um dos dois estar configurado para a análise ser possível. */
  get isConfigured(): boolean {
    return this.primary.isConfigured || this.secondary.isConfigured;
  }

  async describeImages(prompt: string, images: readonly ImagePart[]): Promise<string> {
    const disponiveis = [this.primary, this.secondary].filter((p) => p.isConfigured);

    if (disponiveis.length === 0) {
      throw new ServiceUnavailableException('A análise por IA não está configurada.');
    }

    let ultimoErro: unknown;

    for (const [indice, fornecedor] of disponiveis.entries()) {
      try {
        return await fornecedor.describeImages(prompt, images);
      } catch (err) {
        ultimoErro = err;
        const mensagem = err instanceof Error ? err.message : String(err);
        const ehUltimo = indice === disponiveis.length - 1;

        /*
         * Só vale trocar de fornecedor quando a falha é dele — sobrecarga,
         * timeout, rede. Imagem recusada ou resposta ilegível dariam o mesmo
         * resultado no outro, e tentar de novo só gastaria mais espera.
         */
        if (ehUltimo || !(isTransient(mensagem) || isOverloaded(mensagem))) {
          throw err;
        }

        this.logger.warn(
          `${fornecedor.providerName} indisponível (${mensagem.slice(0, 100)}). ` +
            `Tentando ${disponiveis[indice + 1]?.providerName}.`,
        );
      }
    }

    throw ultimoErro instanceof Error
      ? ultimoErro
      : new ServiceUnavailableException('Não foi possível analisar a imagem.');
  }
}
