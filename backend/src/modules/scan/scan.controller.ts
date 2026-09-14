import {
  BadRequestException,
  Body,
  Controller,
  Post,
  UploadedFiles,
  UseGuards,
  UseFilters,
  UseInterceptors,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { JwtAuthGuard } from '@modules/auth/jwt-auth.guard';
import { MAX_IMAGES_PER_SCAN, ScanService } from './scan.service';
import { MulterErrorFilter } from './multer-error.filter';
import { ScanRequestDto } from './dto/scan-request.dto';
import { STUDY_FORMATS } from './scan.types';

/** Mesmo teto do serviço, aplicado antes de o arquivo entrar na memória. */
const MAX_IMAGE_BYTES = 10 * 1024 * 1024;

@Controller('scan')
@UseGuards(JwtAuthGuard)
@UseFilters(MulterErrorFilter)
export class ScanController {
  constructor(private readonly scanService: ScanService) {}

  @Post()
  @UseInterceptors(
    FilesInterceptor('files', MAX_IMAGES_PER_SCAN, {
      // A imagem é analisada e descartada: nunca toca o disco do servidor.
      storage: memoryStorage(),
      limits: { fileSize: MAX_IMAGE_BYTES },
      fileFilter: (_req, file, cb) => {
        if (!file.mimetype.startsWith('image/')) {
          cb(new BadRequestException('Envie uma imagem (JPG, PNG ou WEBP).'), false);
          return;
        }
        cb(null, true);
      },
    }),
  )
  scan(@UploadedFiles() files: Express.Multer.File[] | undefined, @Body() dto: ScanRequestDto) {
    return this.scanService.analyzeImages(files, dto.formats ?? STUDY_FORMATS);
  }
}
