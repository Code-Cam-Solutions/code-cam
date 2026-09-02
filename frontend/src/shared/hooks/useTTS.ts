import { useCallback } from "react";
import { useAccessibility } from "@/shared/context/AccessibilityContext";

export function useTTS() {
  const { speak, stopSpeaking, settings } = useAccessibility();

  const speakText = useCallback(
    (text: string) => {
      speak(text);
    },
    [speak],
  );

  return {
    speakText,
    stopSpeaking,
    isEnabled: settings.ttsEnabled,
  };
}
