import { IsString, IsNotEmpty, IsOptional, MaxLength } from 'class-validator';

export class CreateFolderDto {
  @IsString()
  @IsNotEmpty({ message: 'Nome é obrigatório' })
  @MaxLength(80, { message: 'Nome deve ter no máximo 80 caracteres' })
  name: string;

  @IsString()
  @IsOptional()
  color?: string;
}
