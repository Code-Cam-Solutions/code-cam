import { BadRequestException, Inject, Injectable, Logger } from '@nestjs/common';
import { VISION_PROVIDER, type VisionProvider } from '@infra/ai/vision-provider';
import { buildScanPrompt } from './scan.prompt';
import { parseScanResponse, ScanParseError } from './scan.parser';
import { STUDY_FORMATS, type ScanResult, type StudyFormat } from './scan.types';

/** Teto do upload. Acima disso a análise fica lenta sem ganhar legibilidade. */
const MAX_IMAGE_BYTES = 10 * 1024 * 1024;

@Injectable()
export class ScanService {
  private readonly logger = new Logger(ScanService.name);

  constructor(@Inject(VISION_PROVIDER) private readonly vision: VisionProvider) {}

  async analyzeImage(
    file: Express.Multer.File | undefined,
    formats: readonly StudyFormat[] = STUDY_FORMATS,
  ): Promise<ScanResult> {
    this.assertUsableImage(file);

    // Sem chave de API o app continua percorrível de ponta a ponta — o que
    // permite desenvolver a interface e demonstrar o fluxo sem gastar cota.
    if (!this.vision.isConfigured) {
      this.logger.debug('Sem GEMINI_API_KEY: devolvendo conteúdo de demonstração.');
      return demoResult();
    }

    const text = await this.vision.describeImage(buildScanPrompt(formats), {
      base64: file.buffer.toString('base64'),
      mimeType: file.mimetype,
    });

    try {
      return parseScanResponse(text);
    } catch (err) {
      if (err instanceof ScanParseError) {
        this.logger.error(`Resposta não interpretável da IA: ${err.rawResponse.slice(0, 500)}`);
        throw new BadRequestException(
          'Não consegui ler esta imagem. Tente uma foto mais nítida ou mais próxima do texto.',
        );
      }
      throw err;
    }
  }

  /** Estreita o tipo além de validar: depois daqui `file` é garantido. */
  private assertUsableImage(
    file: Express.Multer.File | undefined,
  ): asserts file is Express.Multer.File {
    if (!file) {
      throw new BadRequestException('Nenhuma imagem foi enviada.');
    }
    if (!file.mimetype.startsWith('image/')) {
      throw new BadRequestException('Envie uma imagem (JPG, PNG ou WEBP).');
    }
    if (file.size > MAX_IMAGE_BYTES) {
      throw new BadRequestException('Imagem muito grande. O limite é 10 MB.');
    }
  }
}

/** Conteúdo de demonstração usado quando não há chave de IA configurada. */
function demoResult(): ScanResult {
  return {
    title: 'Equações de Segundo Grau (demonstração)',
    summary:
      'Este material aborda as equações de segundo grau, a fórmula resolutiva de Bhaskara e os casos de discriminante positivo, nulo e negativo.',
    topics: [
      'Definição de equação quadrática',
      'Fórmula de Bhaskara',
      'Discriminante (Δ)',
      'Raízes reais e complexas',
      'Fatoração de polinômios',
    ],
    flashcards: [
      {
        question: 'Qual é a fórmula de Bhaskara?',
        answer: 'x = (-b ± √Δ) / 2a, onde Δ = b² - 4ac',
      },
      {
        question: 'O que é o discriminante (Δ)?',
        answer: 'É o valor b² - 4ac, que determina quantas raízes reais a equação tem.',
      },
      {
        question: 'Quando Δ > 0, quantas raízes reais existem?',
        answer: 'Duas raízes reais e distintas.',
      },
      {
        question: 'Quando Δ = 0, quantas raízes reais existem?',
        answer: 'Uma raiz real dupla.',
      },
    ],
    rawText:
      'ax² + bx + c = 0\nΔ = b² - 4ac\nx = (-b ± √Δ) / 2a\nSe Δ > 0: duas raízes reais\nSe Δ = 0: raiz dupla\nSe Δ < 0: sem raízes reais',
  };
}
