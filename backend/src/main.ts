import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { Logger, ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import type { Env } from '@config/env.validation';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const config = app.get(ConfigService<Env, true>);

  app.enableCors({
    // Lista explícita em vez de `origin: true`, que refletia qualquer origem —
    // com `credentials: true` isso equivale a liberar a API para qualquer site
    // que o usuário visite enquanto estiver logado.
    origin: config.get('FRONTEND_URL', { infer: true }),
    methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      // Recusar campo desconhecido em vez de descartá-lo em silêncio: um nome
      // de campo digitado errado no frontend vira erro visível, não um dado que
      // some sem explicação.
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  const port = config.get('PORT', { infer: true });
  await app.listen(port);
  new Logger('Bootstrap').log(`CodeCam backend disponível na porta ${port}`);
}

void bootstrap();
