import { useAccessibility } from "@/shared/context/AccessibilityContext";

/**
 * `true` quando o usuário ativou o modo dislexia.
 *
 * Vive em um arquivo próprio, e não junto dos componentes que o usam, porque
 * misturar hook e componente no mesmo módulo quebra o fast refresh do Vite: a
 * cada edição o estado da tela inteira se perde em vez de só o componente
 * recarregar.
 */
export function useReadingAid(): boolean {
  return useAccessibility().settings.openDyslexic;
}
