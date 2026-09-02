import {
  BadRequestException,
  Body,
  Controller,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { JwtAuthGuard } from '@modules/auth/jwt-auth.guard';
import { ScanService } from './scan.service';
import { ScanRequestDto } from './dto/scan-request.dto';
import { STUDY_FORMATS } from './scan.types';

/** Mesmo teto do serviço, aplicado antes de o arquivo entrar na memória. */
const MAX_IMAGE_BYTES = 10 * 1024 * 1024;

@Controller('scan')
@UseGuards(JwtAuthGuard)
export class ScanController {
  constructor(private readonly scanService: ScanService) {}

  @Post()
  @UseInterceptors(
    FileInterceptor('file', {
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
  scan(@UploadedFile() file: Express.Multer.File | undefined, @Body() dto: ScanRequestDto) {
    return this.scanService.analyzeImage(file, dto.formats ?? STUDY_FORMATS);
  }
}
