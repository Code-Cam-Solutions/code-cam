import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { ScanModule } from './scan/scan.module';
import { FoldersModule } from './folders/folders.module';
import { ContentsModule } from './contents/contents.module';
import { HealthController } from './health/health.controller';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    PrismaModule,
    AuthModule,
    ScanModule,
    FoldersModule,
    ContentsModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
