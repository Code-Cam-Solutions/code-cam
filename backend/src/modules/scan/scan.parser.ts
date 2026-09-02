import type { Flashcard, ScanResult } from './scan.types';

/**
 * Interpretação da resposta do modelo.
 *
 * Tudo aqui parte de `unknown` de propósito. A resposta é texto gerado por um
 * modelo de linguagem, não um contrato: tipá-la como `ScanResult` seria mentir
 * para o compilador sobre um dado que ninguém garante. O parser é o ponto único
 * onde o palpite vira estrutura conferida.
 */

interface RawScanResponse {
  title?: unknown;
  summary?: unknown;
  topics?: unknown;
  flashcards?: unknown;
  rawText?: unknown;
}

/**
 * Converte um valor desconhecido em texto.
 *
 * `String(valor)` não serve: quando o modelo devolve um objeto onde se esperava
 * texto, o resultado seria a string `"[object Object]"` salva como título ou
 * resumo do material do usuário.
 */
function toText(value: unknown): string {
  if (typeof value === 'string') return value.trim();
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  return '';
}

function toFlashcard(value: unknown): Flashcard | null {
  if (typeof value !== 'object' || value === null) return null;

  const record = value as Record<string, unknown>;
  const question = toText(record.question);
  const answer = toText(record.answer);

  // Cartão sem um dos lados não é estudável; descartar é melhor do que exibir
  // um card em branco no meio da sessão.
  if (!question || !answer) return null;

  return { question, answer };
}

/**
 * Remove as cercas de markdown que o modelo insiste em acrescentar mesmo
 * quando o prompt pede JSON puro.
 */
function stripCodeFences(text: string): string {
  return text
    .trim()
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();
}

export class ScanParseError extends Error {
  constructor(readonly rawResponse: string) {
    super('A resposta da IA não veio em JSON válido.');
    this.name = 'ScanParseError';
  }
}

export function parseScanResponse(text: string): ScanResult {
  let parsed: RawScanResponse;

  try {
    parsed = JSON.parse(stripCodeFences(text)) as RawScanResponse;
  } catch {
    throw new ScanParseError(text);
  }

  if (typeof parsed !== 'object' || parsed === null) {
    throw new ScanParseError(text);
  }

  return {
    title: toText(parsed.title) || 'Material sem título',
    summary: toText(parsed.summary),
    topics: Array.isArray(parsed.topics)
      ? parsed.topics.map(toText).filter((topic) => topic.length > 0)
      : [],
    flashcards: Array.isArray(parsed.flashcards)
      ? parsed.flashcards.map(toFlashcard).filter((card): card is Flashcard => card !== null)
      : [],
    rawText: toText(parsed.rawText),
  };
}
