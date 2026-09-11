/**
 * Camada de API.
 *
 * As telas importam daqui — nunca do `client`, e nunca montando uma URL à mão.
 * Cada função é o nome de uma operação do produto, não de um verbo HTTP.
 */
import { request } from "./client";
import type {
  AuthSession,
  Content,
  DraftFlashcard,
  Flashcard,
  Folder,
  ReviewRating,
  ScanResult,
  SearchHit,
  SessionSummary,
  StatsOverview,
  StudyFormat,
  StudySession,
} from "./types";

export { ApiError, AUTH_STORAGE_KEY } from "./client";
export type * from "./types";

// ─── Autenticação ──────────────────────────────────────────────────────────

export function login(name: string): Promise<AuthSession> {
  return request<AuthSession>("/auth/login", { method: "POST", json: { name } });
}

// ─── Captura ───────────────────────────────────────────────────────────────

export function scanImage(image: Blob, formats: StudyFormat[]): Promise<ScanResult> {
  const body = new FormData();
  body.append("file", image, "captura.jpg");
  // O backend recebe a lista como texto separado por vírgula: multipart não
  // transporta array.
  body.append("formats", formats.join(","));

  return request<ScanResult>("/scan", { method: "POST", formData: body });
}

// ─── Pastas ────────────────────────────────────────────────────────────────

export function getFolders(): Promise<Folder[]> {
  return request<Folder[]>("/folders");
}

export function createFolder(name: string, color: string): Promise<Folder> {
  return request<Folder>("/folders", { method: "POST", json: { name, color } });
}

export function updateFolder(id: string, data: { name?: string; color?: string }): Promise<Folder> {
  return request<Folder>(`/folders/${id}`, { method: "PATCH", json: data });
}

export function deleteFolder(id: string): Promise<void> {
  return request<void>(`/folders/${id}`, { method: "DELETE" });
}

// ─── Conteúdos ─────────────────────────────────────────────────────────────

export function getContents(folderId?: string): Promise<Content[]> {
  return request<Content[]>("/contents", { query: { folderId } });
}

/**
 * Materiais que não estão em pasta nenhuma.
 *
 * Existiam no banco e não apareciam em tela alguma: a listagem só era chamada
 * com um `folderId`, então salvar sem escolher pasta equivalia a perder o
 * material de vista.
 */
export function getUnfiledContents(): Promise<Content[]> {
  return request<Content[]>("/contents", { query: { unfiled: "true" } });
}

export function getContent(id: string): Promise<Content> {
  return request<Content>(`/contents/${id}`);
}

export function saveContent(data: {
  title: string;
  summary: string;
  topics: string[];
  flashcards: DraftFlashcard[];
  rawText: string;
  /** Miniatura da foto, em data URL. Opcional: nem toda captura gera uma. */
  imageUrl?: string;
  folderId?: string;
}): Promise<Content> {
  return request<Content>("/contents", { method: "POST", json: data });
}

export function deleteContent(id: string): Promise<void> {
  return request<void>(`/contents/${id}`, { method: "DELETE" });
}

// ─── Estudo ────────────────────────────────────────────────────────────────

/** Cartões vencidos, do mais atrasado para o menos. */
export function getStudyQueue(options: { limit?: number; folderId?: string } = {}) {
  return request<Flashcard[]>("/study/queue", { query: options });
}

/** Todos os cartões de um material, vencidos ou não. */
export function getContentCards(contentId: string): Promise<Flashcard[]> {
  return request<Flashcard[]>(`/study/contents/${contentId}`);
}

export function startStudySession(): Promise<StudySession> {
  return request<StudySession>("/study/sessions", { method: "POST" });
}

export function finishStudySession(sessionId: string): Promise<SessionSummary> {
  return request<SessionSummary>(`/study/sessions/${sessionId}/finish`, { method: "POST" });
}

export function recordReview(data: {
  flashcardId: string;
  rating: ReviewRating;
  sessionId?: string;
}): Promise<Flashcard> {
  return request<Flashcard>("/study/reviews", { method: "POST", json: data });
}

// ─── Painel ────────────────────────────────────────────────────────────────

export function getStatsOverview(): Promise<StatsOverview> {
  // O fuso vem do navegador: sem ele, o servidor contaria os dias em UTC e a
  // sequência de estudo quebraria para quem estuda à noite.
  return request<StatsOverview>("/stats/overview", {
    query: { timezone: Intl.DateTimeFormat().resolvedOptions().timeZone },
  });
}

// ─── Busca ─────────────────────────────────────────────────────────────────

export function searchContents(
  q: string,
  options: { folderId?: string; limit?: number } = {},
): Promise<SearchHit[]> {
  return request<SearchHit[]>("/search", { query: { q, ...options } });
}
