import { Module } from '@nestjs/common';
import { AuthModule } from '@modules/auth/auth.module';
import { StatsController } from './stats.controller';
import { StatsService } from './stats.service';

@Module({
  imports: [AuthModule],
  controllers: [StatsController],
  providers: [StatsService],
})
export class StatsModule {}
