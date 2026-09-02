import { Volume2, VolumeX } from "lucide-react";
import type { MouseEvent } from "react";
import { useAccessibility } from "../context/AccessibilityContext";
import { cn } from "../design-system";

interface TTSButtonProps {
  text: string;
  className?: string;
  /** O que está sendo lido, para compor o rótulo: "Ouvir: resumo". */
  label?: string;
}

/**
 * Par de botões para ouvir e interromper um trecho.
 *
 * Só aparece com a leitura em voz alta ligada nos ajustes — caso contrário
 * poluiria a tela com controles que não fazem nada.
 */
export function TTSButton({ text, className, label }: TTSButtonProps) {
  const { speak, stopSpeaking, settings } = useAccessibility();

  if (!settings.ttsEnabled) return null;

  // Estes botões costumam ficar dentro de cards clicáveis; sem conter a
  // propagação, ouvir o resumo também navegaria para o conteúdo.
  function handleSpeak(event: MouseEvent) {
    event.stopPropagation();
    event.preventDefault();
    speak(text);
  }

  function handleStop(event: MouseEvent) {
    event.stopPropagation();
    event.preventDefault();
    stopSpeaking();
  }

  const button = cn("grid size-9 place-items-center rounded-full transition-colors duration-150");

  return (
    <div className={cn("flex shrink-0 items-center gap-1", className)}>
      <button
        type="button"
        onClick={handleSpeak}
        aria-label={label !== undefined ? `Ouvir: ${label}` : "Ouvir este conteúdo"}
        className={cn(button, "bg-accent-subtle text-accent hover:brightness-95")}
      >
        <Volume2 size={16} aria-hidden="true" />
      </button>

      <button
        type="button"
        onClick={handleStop}
        aria-label="Parar leitura"
        className={cn(button, "text-text-subtle hover:bg-surface-sunken hover:text-text")}
      >
        <VolumeX size={16} aria-hidden="true" />
      </button>
    </div>
  );
}
