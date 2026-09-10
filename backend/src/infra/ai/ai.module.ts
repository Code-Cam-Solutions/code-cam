import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Env } from '@config/env.validation';
import { GeminiClient } from '@infra/gemini/gemini.client';
import { NvidiaClient } from '@infra/nvidia/nvidia.client';
import { VISION_PROVIDER, type VisionProvider } from './vision-provider';

/**
 * Escolhe o fornecedor de visão no boot, conforme `AI_PROVIDER`.
 *
 * Os dois clientes são construídos, mas só o escolhido é exposto pelo token —
 * construir é barato (nenhum abre conexão no construtor) e manter os dois vivos
 * é o que permite trocar de fornecedor editando uma linha do `.env`, sem
 * recompilar nem mexer em código.
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
        return config.get('AI_PROVIDER', { infer: true }) === 'gemini' ? gemini : nvidia;
      },
    },
  ],
  exports: [VISION_PROVIDER],
})
export class AiModule {}
