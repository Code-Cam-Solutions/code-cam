import { Module } from '@nestjs/common';
import { GeminiModule } from '@infra/gemini/gemini.module';
import { AuthModule } from '@modules/auth/auth.module';
import { ScanController } from './scan.controller';
import { ScanService } from './scan.service';

@Module({
  imports: [GeminiModule, AuthModule],
  controllers: [ScanController],
  providers: [ScanService],
})
export class ScanModule {}
