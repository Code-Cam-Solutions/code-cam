import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Env } from '@config/env.validation';
import { GeminiClient } from '@infra/gemini/gemini.client';
import { NvidiaClient } from '@infra/nvidia/nvidia.client';
import { FallbackVisionProvider } from './fallback-vision-provider';
import { VISION_PROVIDER, type VisionProvider } from './vision-provider';

/**
 * Monta a cadeia de fornecedores de visão conforme `AI_PROVIDER`.
 *
 * `AI_PROVIDER` deixa de escolher um e passa a definir a ordem: o nomeado
 * atende primeiro, o outro entra quando ele está sobrecarregado. A análise
 * costuma ser lenta não por causa do nosso código, mas da fila do serviço — e
 * medindo a mesma foto no mesmo dia, os dois oscilaram muito (Gemini 19,7s,
 * NVIDIA 83s a 105s, e o Gemini devolvendo 503 minutos depois). Encadear troca
 * uma falha por uma espera um pouco maior, que é o negócio certo aqui: quem
 * recebe erro precisa refazer a foto e esperar tudo de novo.
 */
@Module({
  providers: [
    GeminiClient,
    NvidiaClient,
    {
      provide: VISION_PROVIDER,
      inject: [ConfigService, NvidiaClient, GeminiClient],
      useFactory: (
        config: ConfigService<Env, true>,
        nvidia: NvidiaClient,
        gemini: GeminiClient,
      ): VisionProvider => {
        const preferido = config.get('AI_PROVIDER', { infer: true });
        return preferido === 'gemini'
          ? new FallbackVisionProvider(gemini, nvidia)
          : new FallbackVisionProvider(nvidia, gemini);
      },
    },
  ],
  exports: [VISION_PROVIDER],
})
export class AiModule {}
