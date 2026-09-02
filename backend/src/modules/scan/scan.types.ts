/** Os três formatos de estudo que a IA sabe gerar a partir de uma imagem. */
export const STUDY_FORMATS = ['summary', 'topics', 'flashcards'] as const;
export type StudyFormat = (typeof STUDY_FORMATS)[number];

export interface Flashcard {
  question: string;
  answer: string;
}

export interface ScanResult {
  title: string;
  summary: string;
  topics: string[];
  flashcards: Flashcard[];
  /** Transcrição literal do que estava escrito na imagem. */
  rawText: string;
}
