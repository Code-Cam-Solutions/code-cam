import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ContentsService } from './contents.service';
import { CreateContentDto } from './dto/create-content.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('contents')
@UseGuards(JwtAuthGuard)
export class ContentsController {
  constructor(private readonly contentsService: ContentsService) {}

  @Post()
  create(@Request() req, @Body() dto: CreateContentDto) {
    return this.contentsService.create(req.user.userId, dto);
  }

  @Get()
  findAll(@Request() req, @Query('folderId') folderId?: string) {
    return this.contentsService.findAll(req.user.userId, folderId);
  }

  @Get(':id')
  findOne(@Request() req, @Param('id') id: string) {
    return this.contentsService.findOne(req.user.userId, id);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Request() req, @Param('id') id: string) {
    return this.contentsService.remove(req.user.userId, id);
  }
}
