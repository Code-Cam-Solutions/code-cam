/**
 * Formas devolvidas pela API.
 *
 * Espelham os contratos do backend e são a fonte única de verdade para as
 * telas — nenhuma página redeclara o formato de um conteúdo ou de um cartão.
 */

export interface AuthSession {
  userId: string;
  name: string;
  token: string;
}

// ─── Estudo ────────────────────────────────────────────────────────────────

/** Como o estudante avaliou o próprio desempenho. Espelha o enum do backend. */
export type ReviewRating = "AGAIN" | "HARD" | "GOOD" | "EASY";

export interface Flashcard {
  id: string;
  question: string;
  answer: string;
  dueAt: string;
  intervalDays: number;
  repetitions: number;
  lapses: number;
  easeFactor: number;
  content: { id: string; title: string; folderId: string | null };
}

/** Cartão recém-gerado pela IA, ainda sem identidade no banco. */
export interface DraftFlashcard {
  question: string;
  answer: string;
}

export interface StudySession {
  id: string;
  startedAt: string;
}

export interface SessionSummary {
  sessionId: string;
  total: number;
  again: number;
  hard: number;
  good: number;
  easy: number;
  /** Percentual de cartões lembrados. */
  accuracy: number;
}

// ─── Biblioteca ────────────────────────────────────────────────────────────

export interface Folder {
  id: string;
  name: string;
  color: string;
  createdAt: string;
  _count?: { contents: number };
}

export interface Content {
  id: string;
  title: string;
  summary: string;
  topics: string[];
  rawText: string;
  imageUrl?: string | null;
  folderId?: string | null;
  createdAt: string;
  flashcards: Pick<Flashcard, "id" | "question" | "answer" | "dueAt">[];
}

// ─── Captura ───────────────────────────────────────────────────────────────

/** Formatos que a IA pode gerar a partir de uma foto. */
export type StudyFormat = "summary" | "topics" | "flashcards";

export interface ScanResult {
  title: string;
  summary: string;
  topics: string[];
  flashcards: DraftFlashcard[];
  rawText: string;
}

// ─── Painel ────────────────────────────────────────────────────────────────

export interface ActivityDay {
  /** Data local do estudante, em ISO (`2026-09-02`). */
  date: string;
  reviews: number;
}

export interface StatsOverview {
  contents: number;
  folders: number;
  flashcards: number;
  /** Cartões vencidos, esperando revisão. */
  dueNow: number;
  mastered: number;
  masteryRate: number;
  reviewedToday: number;
  streakDays: number;
  accuracy: number;
  activity: ActivityDay[];
  lastReviewAt: string | null;
}

// ─── Busca ─────────────────────────────────────────────────────────────────

export interface SearchHit {
  id: string;
  title: string;
  summary: string;
  folderId: string | null;
  folderName: string | null;
  folderColor: string | null;
  createdAt: string;
  flashcardCount: number;
  /** Trecho com os termos marcados por `<mark>`, vindo do `ts_headline`. */
  excerpt: string;
  rank: number;
}
