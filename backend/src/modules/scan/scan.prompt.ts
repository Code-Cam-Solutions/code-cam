import type { StudyFormat } from './scan.types';

/**
 * Monta a instrução enviada ao modelo.
 *
 * O prompt é construído a partir dos formatos pedidos, e não fixo, por um
 * motivo prático: gerar oito flashcards que ninguém pediu custa tokens, custa
 * segundos de espera e ainda dilui a atenção do modelo no que foi realmente
 * solicitado. Quem pede só o resumo recebe um prompt que só fala de resumo.
 */

const FIELD_SPECS: Record<StudyFormat, { schema: string; rule: string }> = {
  summary: {
    schema: '"summary": "Resumo claro e acessível em 2 a 4 frases"',
    rule: '- summary: escreva para quem vai ouvir o texto em voz alta — frases curtas, sem abreviação.',
  },
  topics: {
    schema: '"topics": ["tópico 1", "tópico 2", "tópico 3"]',
    rule: '- topics: entre 3 e 7 tópicos principais, cada um com no máximo uma linha.',
  },
  flashcards: {
    schema:
      '"flashcards": [{ "question": "Pergunta sobre o conteúdo?", "answer": "Resposta clara e direta" }]',
    rule: '- flashcards: entre 3 e 8 pares. A pergunta cobra um conceito, não a literalidade da imagem.',
  },
};

export function buildScanPrompt(formats: readonly StudyFormat[]): string {
  const requested = formats.length > 0 ? formats : (['summary'] as const);

  const schemaLines = [
    '"title": "Título curto e descritivo do conteúdo (máximo 60 caracteres)"',
    ...requested.map((format) => FIELD_SPECS[format].schema),
    '"rawText": "Todo o texto extraído da imagem, de forma literal"',
  ];

  return `Você é um assistente educacional especializado em acessibilidade para estudantes.
Analise esta imagem de material de estudo (lousa, caderno, livro, folha) e devolva um JSON estruturado.

IMPORTANTE: responda APENAS com JSON válido. Sem markdown, sem cercas de código, sem texto antes ou depois.

Estrutura exata esperada:
{
  ${schemaLines.join(',\n  ')}
}

Regras:
${requested.map((format) => FIELD_SPECS[format].rule).join('\n')}
- Escreva em português do Brasil.
- Se a imagem não tiver texto legível, devolva title "Imagem sem texto identificado", summary explicando o que houve, e os demais campos vazios.
- Não invente conteúdo que não esteja na imagem.`;
}
