import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsUUID, Max, Min } from 'class-validator';

/** Teto da fila. Sessões longas demais cansam antes de ensinar. */
const MAX_QUEUE = 100;

export class StudyQueueDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(MAX_QUEUE)
  limit?: number;

  /** Restringe a fila a uma pasta — estudar só Biologia antes da prova. */
  @IsOptional()
  @IsUUID()
  folderId?: string;
}
