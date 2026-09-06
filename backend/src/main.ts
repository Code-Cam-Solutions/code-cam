import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { ConfigService } from '@nestjs/config';
import { Logger, ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import type { Env } from '@config/env.validation';
import { buildCorsOptions } from '@config/cors';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  /*
   * O padrão do Express é 100 KB, e a miniatura da foto capturada não cabe
   * nele: um material salvo com imagem devolvia 413 "request entity too large"
   * antes de chegar ao banco. A miniatura é limitada a 400 000 caracteres na
   * origem (~300 KB), então 1 MB dá folga para ela mais o resumo, os tópicos e
   * os flashcards no mesmo corpo — sem abrir espaço para envio de foto inteira,
   * que continua indo por multipart no /scan.
   */
  app.useBodyParser('json', { limit: '1mb' });
  const config = app.get(ConfigService<Env, true>);

  app.enableCors(
    buildCorsOptions(
      config.get('FRONTEND_URL', { infer: true }),
      process.env.NODE_ENV === 'production',
    ),
  );

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
