import {
  Injectable,
  BadRequestException,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { GoogleGenerativeAI } from '@google/generative-ai';

export interface ScanResult {
  title: string;
  summary: string;
  topics: string[];
  flashcards: { question: string; answer: string }[];
  rawText: string;
}

@Injectable()
export class ScanService {
  private readonly logger = new Logger(ScanService.name);
  private model: ReturnType<GoogleGenerativeAI['getGenerativeModel']>;

  constructor() {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      this.logger.warn('GEMINI_API_KEY not set. Scan will return mock data.');
    }
    const genAI = new GoogleGenerativeAI(apiKey || 'mock');
    this.model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
  }

  async analyzeImage(file: Express.Multer.File): Promise<ScanResult> {
    if (!file) {
      throw new BadRequestException('Nenhum arquivo enviado.');
    }

    if (!file.mimetype.startsWith('image/')) {
      throw new BadRequestException(
        'Arquivo inválido. Envie uma imagem (JPG, PNG, etc).',
      );
    }

    if (file.size > 10 * 1024 * 1024) {
      throw new BadRequestException(
        'Imagem muito grande. Tamanho máximo: 10MB.',
      );
    }

    // If no API key, return mock data for development
    if (!process.env.GEMINI_API_KEY) {
      return this.getMockResult();
    }

    try {
      const base64Image = file.buffer.toString('base64');
      const imagePart = {
        inlineData: {
          data: base64Image,
          mimeType: file.mimetype,
        },
      };

      const prompt = `Você é um assistente educacional especializado em acessibilidade para estudantes.
Analise esta imagem de material de estudo (lousa, caderno, livro, folha, etc.) e retorne um JSON estruturado.

IMPORTANTE: Responda APENAS com JSON válido, sem markdown, sem explicações, sem texto antes ou depois.

O JSON deve ter exatamente esta estrutura:
{
  "title": "Título curto e descritivo do conteúdo (máximo 60 caracteres)",
  "summary": "Resumo claro e acessível em 2-4 frases sobre o conteúdo identificado",
  "topics": ["tópico 1", "tópico 2", "tópico 3"],
  "flashcards": [
    { "question": "Pergunta sobre o conteúdo?", "answer": "Resposta clara e direta" }
  ],
  "rawText": "Todo o texto extraído da imagem de forma verbatim"
}

Regras:
- topics: entre 3 e 7 tópicos principais
- flashcards: entre 3 e 8 pares pergunta/resposta relevantes
- Se a imagem não contiver texto legível, retorne um JSON com title "Imagem sem texto identificado", summary explicando, topics e flashcards vazios, rawText vazio
- Escreva em português do Brasil`;

      const result = await this.model.generateContent([prompt, imagePart]);
      const text = result.response.text();

      // Clean potential markdown fences
      const cleaned = text
        .replace(/^```json\s*/i, '')
        .replace(/^```\s*/i, '')
        .replace(/\s*```$/i, '')
        .trim();

      let parsed: ScanResult;
      try {
        parsed = JSON.parse(cleaned);
      } catch {
        this.logger.error(`Failed to parse Gemini response: ${text}`);
        throw new InternalServerErrorException(
          'Não foi possível processar a resposta da IA. Tente novamente.',
        );
      }

      // Validate structure
      if (!parsed.title || !parsed.summary) {
        throw new InternalServerErrorException(
          'Resposta da IA incompleta. Tente novamente.',
        );
      }

      return {
        title: String(parsed.title || ''),
        summary: String(parsed.summary || ''),
        topics: Array.isArray(parsed.topics) ? parsed.topics.map(String) : [],
        flashcards: Array.isArray(parsed.flashcards)
          ? parsed.flashcards.map((f: any) => ({
              question: String(f.question || ''),
              answer: String(f.answer || ''),
            }))
          : [],
        rawText: String(parsed.rawText || ''),
      };
    } catch (err) {
      if (
        err instanceof BadRequestException ||
        err instanceof InternalServerErrorException
      ) {
        throw err;
      }

      this.logger.error('Gemini API error:', err);

      const message = (err as Error)?.message || '';
      if (message.includes('quota') || message.includes('429')) {
        throw new InternalServerErrorException(
          'Limite de requisições atingido. Aguarde um momento e tente novamente.',
        );
      }
      if (message.includes('timeout') || message.includes('ETIMEDOUT')) {
        throw new InternalServerErrorException(
          'A IA demorou muito para responder. Tente novamente.',
        );
      }

      throw new InternalServerErrorException(
        'Erro ao processar imagem com a IA. Tente novamente.',
      );
    }
  }

  private getMockResult(): ScanResult {
    return {
      title: 'Equações de Segundo Grau (Demo)',
      summary:
        'Este material aborda as equações de segundo grau, sua fórmula resolutiva (Bhaskara) e os casos especiais de discriminante positivo, nulo e negativo.',
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
          answer: 'É o valor b² - 4ac que determina o número de raízes reais.',
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
}
