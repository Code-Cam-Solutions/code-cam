import { ArgumentsHost, BadRequestException, Catch, HttpException } from '@nestjs/common';
import { BaseExceptionFilter } from '@nestjs/core';
import { MAX_IMAGES_PER_SCAN } from './scan.service';

/**
 * Traduz as recusas do upload para algo que o usuário entenda.
 *
 * O Multer barra a requisição antes de o controlador rodar, então a validação
 * do serviço nunca é consultada nesses casos — e o que chegava ao app era
 * `"Unexpected field"`, que não diz o que aconteceu nem o que fazer. Quem manda
 * a quarta foto precisa saber que o limite é três.
 *
 * O filtro casa por mensagem, e não pelo tipo `MulterError`, porque o Nest já
 * converte o erro do Multer em `BadRequestException` dentro do interceptador:
 * quando chega aqui, o tipo original se perdeu e só a mensagem resta.
 */
const TRANSLATIONS: { matches: RegExp; message: string }[] = [
  {
    matches: /unexpected field|too many files|limit_file_count/i,
    message: `Envie no máximo ${MAX_IMAGES_PER_SCAN} fotos do mesmo material.`,
  },
  {
    matches: /file too large|limit_file_size/i,
    message: 'Imagem muito grande. O limite é 10 MB por foto.',
  },
];

@Catch(BadRequestException)
export class MulterErrorFilter extends BaseExceptionFilter {
  catch(exception: BadRequestException, host: ArgumentsHost): void {
    super.catch(this.translate(exception), host);
  }

  private translate(exception: BadRequestException): HttpException {
    const response = exception.getResponse();
    const raw =
      typeof response === 'string'
        ? response
        : ((response as { message?: unknown }).message ?? exception.message);

    /*
     * `String(raw)` produziria "[object Object]" quando a mensagem vier como
     * objeto — e aí nenhuma das expressões abaixo casaria, devolvendo ao
     * usuário o texto cru do Multer que este filtro existe para traduzir.
     * Só texto e lista de texto interessam; o resto não é mensagem.
     */
    const text = Array.isArray(raw)
      ? raw.filter((part): part is string => typeof part === 'string').join(' ')
      : typeof raw === 'string'
        ? raw
        : '';

    const known = TRANSLATIONS.find((entry) => entry.matches.test(text));

    // Mensagem que não veio do upload passa intacta: as do serviço já são
    // escritas para o usuário e traduzi-las de novo só pioraria.
    return known ? new BadRequestException(known.message) : exception;
  }
}
