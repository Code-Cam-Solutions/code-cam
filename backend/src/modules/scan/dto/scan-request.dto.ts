import { Transform } from 'class-transformer';
import { ArrayNotEmpty, IsArray, IsIn, IsOptional } from 'class-validator';
import { STUDY_FORMATS, type StudyFormat } from '../scan.types';

/**
 * Formatos pedidos na captura.
 *
 * Chega por `multipart/form-data`, junto da imagem, então o valor bruto é
 * sempre texto: `"summary,flashcards"`. O `Transform` normaliza para lista
 * antes da validação — sem isso, `@IsArray` reprovaria toda requisição.
 */
export class ScanRequestDto {
  @IsOptional()
  @Transform(({ value }): unknown => {
    if (Array.isArray(value)) return value;
    if (typeof value !== 'string') return value;
    return value
      .split(',')
      .map((format) => format.trim())
      .filter(Boolean);
  })
  @IsArray()
  @ArrayNotEmpty()
  @IsIn(STUDY_FORMATS, {
    each: true,
    message: `Formato inválido. Use: ${STUDY_FORMATS.join(', ')}.`,
  })
  formats?: StudyFormat[];
}
