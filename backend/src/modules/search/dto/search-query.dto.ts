import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, IsUUID, Max, MaxLength, Min } from 'class-validator';

const MAX_QUERY_LENGTH = 120;
const MAX_RESULTS = 50;

export class SearchQueryDto {
  @IsString()
  @MaxLength(MAX_QUERY_LENGTH)
  q: string;

  /** Restringe a busca a uma pasta. */
  @IsOptional()
  @IsUUID()
  folderId?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(MAX_RESULTS)
  limit?: number;
}
