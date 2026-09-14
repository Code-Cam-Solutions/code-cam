import { useLocation } from "react-router-dom";
import type { CapturedPhoto } from "@/features/capture/hooks/useCamera";
import type { DraftFlashcard, ScanResult, StudyFormat } from "@/api";

/**
 * O `location.state` do react-router é tipado como `any`. Declarar o formato
 * esperado por rota transforma a navegação em um contrato verificável — sem
 * isso, um `state` renomeado só falha em runtime, na mão do usuário.
 */
export interface RouteState {
  /** `photos` volta preenchido quando a pessoa pede outra foto do mesmo material. */
  "/camera": { scanError?: string; photos?: CapturedPhoto[] };
  "/camera/review": { photos?: CapturedPhoto[] };
  "/camera/formats": { photos?: CapturedPhoto[] };
  /**
   * `thumbnail` acompanha a foto até o fim do fluxo. Antes parava aqui: a
   * imagem era enviada para análise e descartada, e o material salvo ficava
   * sem a foto que o originou.
   */
  "/processing": { imageBlobs?: Blob[]; formats?: StudyFormat[]; thumbnail?: string | null };
  "/result": { result?: ScanResult; formats?: StudyFormat[]; thumbnail?: string | null };
  /**
   * Cartões recém-gerados, ainda não salvos. Presente só no modo prática —
   * a revisão de verdade busca a fila no servidor e não recebe estado.
   *
   * `result`, `formats` e `thumbnail` viajam junto para que a tela de estudo
   * consiga voltar ao resultado. Sem eles, praticar os cartões recém-gerados
   * era um beco sem saída: a análise se perdia e o material não tinha mais
   * como ser salvo em pasta nenhuma.
   */
  "/flashcards": {
    draftCards?: DraftFlashcard[];
    title?: string;
    result?: ScanResult;
    formats?: StudyFormat[];
    thumbnail?: string | null;
  };
}

/** Lê o `location.state` já tipado para a rota informada. */
export function useRouteState<TPath extends keyof RouteState>(): Partial<RouteState[TPath]> {
  const location = useLocation();
  return (location.state ?? {}) as Partial<RouteState[TPath]>;
}
