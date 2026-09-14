import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { useAccessibility } from "@/shared/context/AccessibilityContext";

/**
 * Interrompe a leitura em voz alta ao trocar de tela.
 *
 * A Web Speech API é global e não sabe nada sobre rotas: uma vez iniciada, a
 * fala segue até terminar o texto, mesmo que a tela que a pediu já tenha saído.
 * Na prática, quem mandava ler um resumo e voltava para as pastas continuava
 * ouvindo o resumo — sem nada na tela para relacionar com o que estava sendo
 * dito, e sem um botão de parar à vista.
 *
 * Fica no nível do app, e não em cada página, porque o problema é da navegação:
 * resolver em um lugar cobre todas as telas, inclusive as que vierem depois.
 */
export function StopSpeechOnNavigate() {
  const { pathname } = useLocation();
  const { stopSpeaking } = useAccessibility();

  // A limpeza roda quando o caminho muda — ou seja, ao sair da tela anterior.
  useEffect(() => stopSpeaking, [pathname, stopSpeaking]);

  return null;
}
