import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { CurrentUser } from '@common/decorators/current-user.decorator';
import type { AuthUser } from '@common/types/authenticated-request';
import { JwtAuthGuard } from '@modules/auth/jwt-auth.guard';
import { StatsService } from './stats.service';
import { StatsQueryDto } from './dto/stats-query.dto';

@Controller('stats')
@UseGuards(JwtAuthGuard)
export class StatsController {
  constructor(private readonly statsService: StatsService) {}

  @Get('overview')
  overview(@CurrentUser() user: AuthUser, @Query() query: StatsQueryDto) {
    return this.statsService.getOverview(user.userId, query.timezone);
  }
}
