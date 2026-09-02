import { IsOptional, IsUUID } from 'class-validator';

/**
 * Filtros da listagem de conteúdos.
 *
 * Existe porque `forbidNonWhitelisted` recusa qualquer campo não declarado: sem
 * um DTO para a query string, `?folderId=…` seria rejeitado como parâmetro
 * desconhecido.
 */
export class ListContentsDto {
  @IsOptional()
  @IsUUID()
  folderId?: string;
}
