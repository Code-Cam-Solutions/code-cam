import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  ValidateNested,
} from 'class-validator';

/**
 * Limites de tamanho.
 *
 * O corpo desta requisição vem de uma resposta de modelo de linguagem, não de
 * um formulário: se o modelo alucinar um resumo de dez mil palavras, é isto que
 * impede a linha de ir parar no banco.
 */
const MAX_TITLE = 200;
const MAX_SUMMARY = 8_000;
const MAX_RAW_TEXT = 40_000;
const MAX_TOPICS = 30;
const MAX_TOPIC = 300;
const MAX_FLASHCARDS = 50;
const MAX_CARD_SIDE = 2_000;
/**
 * Miniatura em data URL. Casado com o teto do gerador no frontend: acima disso
 * a miniatura é descartada lá, e o que chegar aqui maior que isso não veio do
 * app. Sem este limite, uma foto inteira em base64 iria direto para a coluna.
 */
const MAX_IMAGE_URL = 400_000;

export class FlashcardDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(MAX_CARD_SIDE)
  question: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(MAX_CARD_SIDE)
  answer: string;
}

export class CreateContentDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(MAX_TITLE)
  title: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(MAX_SUMMARY)
  summary: string;

  @IsArray()
  @ArrayMaxSize(MAX_TOPICS)
  @IsString({ each: true })
  @MaxLength(MAX_TOPIC, { each: true })
  topics: string[];

  /*
   * Antes bastava `@IsArray()`, o que aceitava `[1, null, {}]` como lista de
   * cartões — e só quebrava lá na frente, na criação das linhas de flashcard.
   * `ValidateNested` com `Type` faz a validação descer para cada item.
   */
  @IsArray()
  @ArrayMaxSize(MAX_FLASHCARDS)
  @ValidateNested({ each: true })
  @Type(() => FlashcardDto)
  flashcards: FlashcardDto[];

  @IsString()
  @MaxLength(MAX_RAW_TEXT)
  rawText: string;

  @IsString()
  @IsOptional()
  @MaxLength(MAX_IMAGE_URL)
  imageUrl?: string;

  @IsUUID()
  @IsOptional()
  folderId?: string;
}
