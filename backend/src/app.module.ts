import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from '@infra/prisma/prisma.module';
import { AuthModule } from '@modules/auth/auth.module';
import { ContentsModule } from '@modules/contents/contents.module';
import { FoldersModule } from '@modules/folders/folders.module';
import { HealthController } from '@modules/health/health.controller';
import { ScanModule } from '@modules/scan/scan.module';
import { SearchModule } from '@modules/search/search.module';
import { StatsModule } from '@modules/stats/stats.module';
import { StudyModule } from '@modules/study/study.module';
import { validateEnv } from '@config/env.validation';

/**
 * Raiz da aplicação.
 *
 * A árvore de pastas separa três coisas que envelhecem em ritmos diferentes:
 * `config` (como o processo é parametrizado), `infra` (o que fala com o mundo
 * externo — banco, IA) e `modules` (as regras do produto). Um módulo de
 * produto pode importar infraestrutura; o caminho contrário nunca acontece.
 */
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      // A validação roda antes de qualquer provider ser instanciado: uma
      // variável faltando derruba o boot em vez de virar erro 500 na primeira
      // requisição que dependesse dela.
      validate: validateEnv,
    }),
    PrismaModule,
    AuthModule,
    ScanModule,
    FoldersModule,
    ContentsModule,
    StudyModule,
    StatsModule,
    SearchModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
