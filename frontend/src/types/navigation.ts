import { useLocation } from "react-router-dom";
import type { CapturedPhoto } from "../hooks/useCamera";
import type { Flashcard, ScanResult } from "../services/api";

/**
 * O `location.state` do react-router é tipado como `any`. Declarar o formato
 * esperado por rota transforma a navegação em um contrato verificável — sem
 * isso, um `state` renomeado só falha em runtime, na mão do usuário.
 */
export interface RouteState {
  "/camera/review": { photo?: CapturedPhoto };
  "/processing": { imageBlob?: Blob };
  "/result": { result?: ScanResult };
  "/camera": { scanError?: string };
  "/flashcards": { flashcards?: Flashcard[]; title?: string };
}

/** Lê o `location.state` já tipado para a rota informada. */
export function useRouteState<TPath extends keyof RouteState>(): Partial<RouteState[TPath]> {
  const location = useLocation();
  return (location.state ?? {}) as Partial<RouteState[TPath]>;
}
