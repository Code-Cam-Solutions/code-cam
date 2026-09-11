import { Transform } from 'class-transformer';
import { IsBoolean, IsOptional, IsUUID } from 'class-validator';

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

  /**
   * Só os materiais que não estão em pasta nenhuma.
   *
   * Existe para que eles possam ser encontrados. Antes a listagem só aceitava
   * um `folderId`, então material salvo sem pasta não aparecia em tela alguma —
   * ficava no banco, contado nas estatísticas, e inalcançável pela navegação.
   *
   * Vem da query string, onde tudo é texto: sem o `Transform`, a string "false"
   * seria convertida pelo validador em `true`, como toda string não vazia.
   */
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  unfiled?: boolean;
}
