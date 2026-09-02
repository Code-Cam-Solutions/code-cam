import { ReviewRating } from '@prisma/client';
import { IsEnum, IsOptional, IsUUID } from 'class-validator';

export class RecordReviewDto {
  @IsUUID()
  flashcardId: string;

  @IsEnum(ReviewRating, {
    message: `Nota inválida. Use: ${Object.values(ReviewRating).join(', ')}.`,
  })
  rating: ReviewRating;

  /** Agrupa a revisão em uma sessão de estudo. Ausente = revisão avulsa. */
  @IsOptional()
  @IsUUID()
  sessionId?: string;
}
