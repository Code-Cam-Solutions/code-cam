import { Volume2, VolumeX } from "lucide-react";
import { useAccessibility } from "../context/AccessibilityContext";

interface TTSButtonProps {
  text: string;
  className?: string;
  size?: number;
  label?: string;
}

export function TTSButton({
  text,
  className = "",
  size = 18,
  label,
}: TTSButtonProps) {
  const { speak, stopSpeaking, settings } = useAccessibility();

  if (!settings.ttsEnabled) return null;

  function handleClick(e: React.MouseEvent) {
    e.stopPropagation();
    speak(text);
  }

  function handleStop(e: React.MouseEvent) {
    e.stopPropagation();
    stopSpeaking();
  }

  return (
    <div className={`flex items-center gap-1 ${className}`}>
      <button
        type="button"
        onClick={handleClick}
        aria-label={label ? `Ouvir: ${label}` : "Ouvir este conteúdo"}
        title="Ouvir"
        className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-codecam/20 text-codecam hover:bg-codecam/30 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-codecam"
        style={{ minWidth: "32px", minHeight: "32px" }}
      >
        <Volume2 size={size} aria-hidden="true" />
      </button>
      <button
        type="button"
        onClick={handleStop}
        aria-label="Parar leitura"
        title="Parar"
        className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-surface-2/50 text-text-muted hover:bg-surface-2 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-codecam"
        style={{ minWidth: "32px", minHeight: "32px" }}
      >
        <VolumeX size={size} aria-hidden="true" />
      </button>
    </div>
  );
}
