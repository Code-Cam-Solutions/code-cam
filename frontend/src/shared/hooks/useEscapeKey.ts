import { useEffect } from "react";

/**
 * Fecha uma camada sobreposta quando o usuário pressiona Escape.
 *
 * Sem isto, quem navega por teclado fica preso dentro do diálogo — o backdrop
 * clicável só atende quem usa mouse ou toque.
 *
 * @param enabled  Só escuta enquanto a camada está aberta.
 * @param onEscape Chamado ao pressionar Escape.
 */
export function useEscapeKey(enabled: boolean, onEscape: () => void): void {
  useEffect(() => {
    if (!enabled) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onEscape();
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [enabled, onEscape]);
}
