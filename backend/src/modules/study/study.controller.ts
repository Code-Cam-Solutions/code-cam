import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { CurrentUser } from '@common/decorators/current-user.decorator';
import type { AuthUser } from '@common/types/authenticated-request';
import { JwtAuthGuard } from '@modules/auth/jwt-auth.guard';
import { StudyService } from './study.service';
import { RecordReviewDto } from './dto/record-review.dto';
import { StudyQueueDto } from './dto/study-queue.dto';

@Controller('study')
@UseGuards(JwtAuthGuard)
export class StudyController {
  constructor(private readonly studyService: StudyService) {}

  /** Cartões que já venceram, do mais atrasado para o menos. */
  @Get('queue')
  queue(@CurrentUser() user: AuthUser, @Query() query: StudyQueueDto) {
    return this.studyService.getQueue(user.userId, query);
  }

  @Get('contents/:contentId')
  contentCards(
    @CurrentUser() user: AuthUser,
    @Param('contentId', ParseUUIDPipe) contentId: string,
  ) {
    return this.studyService.getContentCards(user.userId, contentId);
  }

  @Post('sessions')
  startSession(@CurrentUser() user: AuthUser) {
    return this.studyService.startSession(user.userId);
  }

  @Post('sessions/:id/finish')
  finishSession(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.studyService.finishSession(user.userId, id);
  }

  @Post('reviews')
  recordReview(@CurrentUser() user: AuthUser, @Body() dto: RecordReviewDto) {
    return this.studyService.recordReview(user.userId, dto);
  }
}
