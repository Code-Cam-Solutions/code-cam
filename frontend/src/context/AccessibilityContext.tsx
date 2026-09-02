import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

export type FontSize = "sm" | "md" | "lg" | "xl";

export interface AccessibilitySettings {
  fontSize: FontSize;
  openDyslexic: boolean;
  highContrast: boolean;
  ttsEnabled: boolean;
  ttsRate: number;
}

interface AccessibilityContextType {
  settings: AccessibilitySettings;
  setFontSize: (size: FontSize) => void;
  toggleOpenDyslexic: () => void;
  toggleHighContrast: () => void;
  toggleTTS: () => void;
  setTTSRate: (rate: number) => void;
  resetSettings: () => void;
  speak: (text: string) => void;
  stopSpeaking: () => void;
}

const defaultSettings: AccessibilitySettings = {
  fontSize: "md",
  openDyslexic: false,
  highContrast: false,
  ttsEnabled: false,
  ttsRate: 1,
};

const STORAGE_KEY = "codecam-accessibility";

const AccessibilityContext = createContext<AccessibilityContextType | null>(null);

function loadSettings(): AccessibilitySettings {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return defaultSettings;

    // Mesclar sobre os padrões mantém as preferências salvas válidas mesmo
    // quando uma nova opção é adicionada em uma versão posterior do app.
    const parsed = JSON.parse(stored) as Partial<AccessibilitySettings>;
    return { ...defaultSettings, ...parsed };
  } catch {
    // Preferências corrompidas: voltar ao padrão acessível.
    return defaultSettings;
  }
}

function saveSettings(settings: AccessibilitySettings) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch {
    // ignore
  }
}

function applySettings(settings: AccessibilitySettings) {
  const html = document.documentElement;

  // Font size
  html.dataset.fontSize = settings.fontSize;

  // OpenDyslexic
  if (settings.openDyslexic) {
    html.classList.add("dyslexic");
  } else {
    html.classList.remove("dyslexic");
  }

  // High contrast
  if (settings.highContrast) {
    html.classList.add("high-contrast");
  } else {
    html.classList.remove("high-contrast");
  }
}

export function AccessibilityProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<AccessibilitySettings>(loadSettings);

  useEffect(() => {
    applySettings(settings);
    saveSettings(settings);
  }, [settings]);

  function setFontSize(size: FontSize) {
    setSettings((prev) => ({ ...prev, fontSize: size }));
  }

  function toggleOpenDyslexic() {
    setSettings((prev) => ({ ...prev, openDyslexic: !prev.openDyslexic }));
  }

  function toggleHighContrast() {
    setSettings((prev) => ({ ...prev, highContrast: !prev.highContrast }));
  }

  function toggleTTS() {
    setSettings((prev) => ({ ...prev, ttsEnabled: !prev.ttsEnabled }));
  }

  function setTTSRate(rate: number) {
    setSettings((prev) => ({ ...prev, ttsRate: rate }));
  }

  function resetSettings() {
    setSettings(defaultSettings);
  }

  function speak(text: string) {
    if (!settings.ttsEnabled) return;
    if (!("speechSynthesis" in window)) return;

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "pt-BR";
    utterance.rate = settings.ttsRate;
    utterance.pitch = 1;
    utterance.volume = 1;

    // Try to find a Portuguese voice
    const voices = window.speechSynthesis.getVoices();
    const ptVoice =
      voices.find((v) => v.lang.startsWith("pt") && v.localService) ||
      voices.find((v) => v.lang.startsWith("pt"));
    if (ptVoice) utterance.voice = ptVoice;

    window.speechSynthesis.speak(utterance);
  }

  function stopSpeaking() {
    if ("speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
  }

  return (
    <AccessibilityContext.Provider
      value={{
        settings,
        setFontSize,
        toggleOpenDyslexic,
        toggleHighContrast,
        toggleTTS,
        setTTSRate,
        resetSettings,
        speak,
        stopSpeaking,
      }}
    >
      {children}
    </AccessibilityContext.Provider>
  );
}

export function useAccessibility() {
  const ctx = useContext(AccessibilityContext);
  if (!ctx) {
    throw new Error("useAccessibility must be used within AccessibilityProvider");
  }
  return ctx;
}
