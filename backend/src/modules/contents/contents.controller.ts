import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { CurrentUser } from '@common/decorators/current-user.decorator';
import type { AuthUser } from '@common/types/authenticated-request';
import { JwtAuthGuard } from '@modules/auth/jwt-auth.guard';
import { ContentsService } from './contents.service';
import { CreateContentDto } from './dto/create-content.dto';
import { ListContentsDto } from './dto/list-contents.dto';

@Controller('contents')
@UseGuards(JwtAuthGuard)
export class ContentsController {
  constructor(private readonly contentsService: ContentsService) {}

  @Post()
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateContentDto) {
    return this.contentsService.create(user.userId, dto);
  }

  @Get()
  findAll(@CurrentUser() user: AuthUser, @Query() query: ListContentsDto) {
    return this.contentsService.findAll(user.userId, query);
  }

  @Get(':id')
  findOne(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.contentsService.findOne(user.userId, id);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.contentsService.remove(user.userId, id);
  }
}
