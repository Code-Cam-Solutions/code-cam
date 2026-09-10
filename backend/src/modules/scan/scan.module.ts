import { Module } from '@nestjs/common';
import { AiModule } from '@infra/ai/ai.module';
import { AuthModule } from '@modules/auth/auth.module';
import { ScanController } from './scan.controller';
import { ScanService } from './scan.service';

@Module({
  imports: [AiModule, AuthModule],
  controllers: [ScanController],
  providers: [ScanService],
})
export class ScanModule {}
