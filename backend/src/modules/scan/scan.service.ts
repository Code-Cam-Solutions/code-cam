import { BadRequestException, Inject, Injectable, Logger } from '@nestjs/common';
import { VISION_PROVIDER, type VisionProvider } from '@infra/ai/vision-provider';
import { buildScanPrompt } from './scan.prompt';
import { parseScanResponse, ScanParseError } from './scan.parser';
import { STUDY_FORMATS, type ScanResult, type StudyFormat } from './scan.types';

/** Teto do upload. Acima disso a análise fica lenta sem ganhar legibilidade. */
const MAX_IMAGE_BYTES = 10 * 1024 * 1024;

/**
 * Quantas fotos podem descrever o mesmo material.
 *
 * Existe porque um material nem sempre cabe em uma foto: lousa larga, página
 * dupla, caderno com continuação. As fotos vão juntas na mesma análise e
 * produzem um resumo só.
 *
 * Três é o teto porque cada imagem soma tempo à resposta — e a análise já leva
 * de 10 a 20 segundos com uma. Sem limite, alguém manda oito fotos e espera
 * minutos por um resultado que a fila do fornecedor pode nem entregar.
 */
export const MAX_IMAGES_PER_SCAN = 3;

@Injectable()
export class ScanService {
  private readonly logger = new Logger(ScanService.name);

  constructor(@Inject(VISION_PROVIDER) private readonly vision: VisionProvider) {}

  /**
   * Analisa de uma a três fotos do mesmo material.
   *
   * As fotos entram juntas na mesma chamada de propósito: são partes de um
   * conteúdo só, e o que sai é um resumo, um conjunto de tópicos e um conjunto
   * de flashcards. Analisar uma por vez devolveria materiais separados, que é
   * o oposto do que a pessoa pediu ao fotografar a lousa em dois pedaços.
   */
  async analyzeImages(
    files: Express.Multer.File[] | undefined,
    formats: readonly StudyFormat[] = STUDY_FORMATS,
  ): Promise<ScanResult> {
    this.assertUsableImages(files);

    // Sem chave de API o app continua percorrível de ponta a ponta — o que
    // permite desenvolver a interface e demonstrar o fluxo sem gastar cota.
    if (!this.vision.isConfigured) {
      this.logger.debug('Sem chave de IA: devolvendo conteúdo de demonstração.');
      return demoResult();
    }

    const text = await this.vision.describeImages(
      buildScanPrompt(formats, files.length),
      files.map((file) => ({
        base64: file.buffer.toString('base64'),
        mimeType: file.mimetype,
      })),
    );

    try {
      return parseScanResponse(text);
    } catch (err) {
      if (err instanceof ScanParseError) {
        this.logger.error(`Resposta não interpretável da IA: ${err.rawResponse.slice(0, 500)}`);
        throw new BadRequestException(
          'Não consegui ler o material. Tente fotos mais nítidas ou mais próximas do texto.',
        );
      }
      throw err;
    }
  }

  /** Estreita o tipo além de validar: depois daqui a lista é garantida. */
  private assertUsableImages(
    files: Express.Multer.File[] | undefined,
  ): asserts files is Express.Multer.File[] {
    if (!files || files.length === 0) {
      throw new BadRequestException('Nenhuma imagem foi enviada.');
    }

    if (files.length > MAX_IMAGES_PER_SCAN) {
      throw new BadRequestException(`Envie no máximo ${MAX_IMAGES_PER_SCAN} fotos por material.`);
    }

    for (const file of files) {
      if (!file.mimetype.startsWith('image/')) {
        throw new BadRequestException('Envie imagens (JPG, PNG ou WEBP).');
      }
      if (file.size > MAX_IMAGE_BYTES) {
        throw new BadRequestException('Imagem muito grande. O limite é 10 MB por foto.');
      }
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
