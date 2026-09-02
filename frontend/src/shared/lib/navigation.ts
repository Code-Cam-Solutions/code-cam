import { useLocation } from "react-router-dom";
import type { CapturedPhoto } from "@/features/capture/hooks/useCamera";
import type { DraftFlashcard, ScanResult, StudyFormat } from "@/api";

/**
 * O `location.state` do react-router é tipado como `any`. Declarar o formato
 * esperado por rota transforma a navegação em um contrato verificável — sem
 * isso, um `state` renomeado só falha em runtime, na mão do usuário.
 */
export interface RouteState {
  "/camera": { scanError?: string };
  "/camera/review": { photo?: CapturedPhoto };
  "/camera/formats": { photo?: CapturedPhoto };
  "/processing": { imageBlob?: Blob; formats?: StudyFormat[] };
  "/result": { result?: ScanResult; formats?: StudyFormat[] };
  /**
   * Cartões recém-gerados, ainda não salvos. Presente só no modo prática —
   * a revisão de verdade busca a fila no servidor e não recebe estado.
   */
  "/flashcards": { draftCards?: DraftFlashcard[]; title?: string };
}

/** Lê o `location.state` já tipado para a rota informada. */
export function useRouteState<TPath extends keyof RouteState>(): Partial<RouteState[TPath]> {
  const location = useLocation();
  return (location.state ?? {}) as Partial<RouteState[TPath]>;
}
