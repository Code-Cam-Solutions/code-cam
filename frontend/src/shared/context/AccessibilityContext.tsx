import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

export type FontSize = "sm" | "md" | "lg" | "xl";

/** `system` acompanha a preferência do sistema operacional em tempo real. */
export type ThemePreference = "light" | "dark" | "system";
export type ResolvedTheme = "light" | "dark";

export interface AccessibilitySettings {
  theme: ThemePreference;
  fontSize: FontSize;
  openDyslexic: boolean;
  highContrast: boolean;
  ttsEnabled: boolean;
  ttsRate: number;
}

interface AccessibilityContextType {
  settings: AccessibilitySettings;
  /** O tema em vigor: `system` já resolvido para claro ou escuro. */
  resolvedTheme: ResolvedTheme;
  setTheme: (theme: ThemePreference) => void;
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
  theme: "system",
  fontSize: "md",
  openDyslexic: false,
  highContrast: false,
  ttsEnabled: false,
  ttsRate: 1,
};

const STORAGE_KEY = "codecam-accessibility";
const DARK_QUERY = "(prefers-color-scheme: dark)";

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
    // Storage indisponível (aba anônima, cota cheia): as preferências valem
    // para esta sessão e o app segue funcionando.
  }
}

function systemTheme(): ResolvedTheme {
  return window.matchMedia(DARK_QUERY).matches ? "dark" : "light";
}

/**
 * Escreve as preferências como atributos de `<html>`, de onde o CSS as lê.
 *
 * Nenhum componente consulta estas configurações para escolher cor: o tema
 * troca os tokens e a interface inteira acompanha.
 */
function applyToDocument(settings: AccessibilitySettings, resolved: ResolvedTheme) {
  const root = document.documentElement;

  root.dataset.theme = resolved;
  root.dataset.fontSize = settings.fontSize;

  if (settings.highContrast) {
    root.dataset.contrast = "high";
  } else {
    delete root.dataset.contrast;
  }

  if (settings.openDyslexic) {
    root.dataset.dyslexic = "true";
  } else {
    delete root.dataset.dyslexic;
  }
}

export function AccessibilityProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<AccessibilitySettings>(loadSettings);
  const [systemPreference, setSystemPreference] = useState<ResolvedTheme>(systemTheme);

  // Quem escolheu "system" espera que o app acompanhe a troca automática do
  // aparelho ao anoitecer, sem precisar recarregar a página.
  useEffect(() => {
    const media = window.matchMedia(DARK_QUERY);
    const onChange = (event: MediaQueryListEvent) => {
      setSystemPreference(event.matches ? "dark" : "light");
    };

    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, []);

  const resolvedTheme: ResolvedTheme =
    settings.theme === "system" ? systemPreference : settings.theme;

  useEffect(() => {
    applyToDocument(settings, resolvedTheme);
    saveSettings(settings);
  }, [settings, resolvedTheme]);

  const setTheme = useCallback((theme: ThemePreference) => {
    setSettings((prev) => ({ ...prev, theme }));
  }, []);

  const setFontSize = useCallback((fontSize: FontSize) => {
    setSettings((prev) => ({ ...prev, fontSize }));
  }, []);

  const toggleOpenDyslexic = useCallback(() => {
    setSettings((prev) => ({ ...prev, openDyslexic: !prev.openDyslexic }));
  }, []);

  const toggleHighContrast = useCallback(() => {
    setSettings((prev) => ({ ...prev, highContrast: !prev.highContrast }));
  }, []);

  const toggleTTS = useCallback(() => {
    setSettings((prev) => ({ ...prev, ttsEnabled: !prev.ttsEnabled }));
  }, []);

  const setTTSRate = useCallback((ttsRate: number) => {
    setSettings((prev) => ({ ...prev, ttsRate }));
  }, []);

  /*
   * As vozes chegam depois.
   *
   * `getVoices()` devolve lista vazia logo após o carregamento — medido neste
   * app: 0 vozes na primeira chamada e 180 um segundo depois. Como a busca pela
   * voz em português acontecia dentro do `speak`, a primeira leitura da sessão
   * saía na voz padrão do sistema, muitas vezes em inglês lendo texto em
   * português. Guardar a lista quando o navegador avisa resolve na origem.
   */
  const voicesRef = useRef<SpeechSynthesisVoice[]>([]);

  useEffect(() => {
    if (!("speechSynthesis" in window)) return;

    const synth = window.speechSynthesis;
    const load = () => {
      const voices = synth.getVoices();
      if (voices.length > 0) voicesRef.current = voices;
    };

    load();
    synth.addEventListener("voiceschanged", load);
    return () => synth.removeEventListener("voiceschanged", load);
  }, []);

  const resetSettings = useCallback(() => {
    setSettings(defaultSettings);
  }, []);

  const speak = useCallback(
    (text: string) => {
      if (!settings.ttsEnabled) return;
      if (!("speechSynthesis" in window)) return;

      const synth = window.speechSynthesis;

      /*
       * Cancelar e falar no mesmo instante deixa o motor do Chrome travado em
       * silêncio — um defeito antigo e bem conhecido dele. O `setTimeout` de
       * um tique dá ao cancelamento a chance de concluir antes do novo pedido.
       */
      synth.cancel();

      window.setTimeout(() => {
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = "pt-BR";
        utterance.rate = settings.ttsRate;

        // Vozes locais soam melhor e não dependem de rede; as remotas ficam
        // como segunda opção para quem não tem voz em português instalada.
        const voices = voicesRef.current.length > 0 ? voicesRef.current : synth.getVoices();
        const portuguese =
          voices.find((voice) => voice.lang.startsWith("pt") && voice.localService) ??
          voices.find((voice) => voice.lang.startsWith("pt"));
        if (portuguese) utterance.voice = portuguese;

        /*
         * O Chrome interrompe a fala sozinho por volta dos 15 segundos. Um
         * resumo inteiro passa disso com folga e era cortado no meio sem aviso.
         * Chamar `resume()` periodicamente enquanto fala mantém o motor vivo;
         * o intervalo é desligado no fim, no erro e no cancelamento.
         */
        let keepAlive = 0;
        const stopKeepAlive = () => {
          if (keepAlive !== 0) {
            window.clearInterval(keepAlive);
            keepAlive = 0;
          }
        };

        utterance.onstart = () => {
          keepAlive = window.setInterval(() => {
            if (synth.speaking) synth.resume();
            else stopKeepAlive();
          }, 10_000);
        };
        utterance.onend = stopKeepAlive;
        utterance.onerror = stopKeepAlive;

        synth.speak(utterance);
      }, 0);
    },
    [settings.ttsEnabled, settings.ttsRate],
  );

  const stopSpeaking = useCallback(() => {
    if ("speechSynthesis" in window) window.speechSynthesis.cancel();
  }, []);

  const value = useMemo(
    () => ({
      settings,
      resolvedTheme,
      setTheme,
      setFontSize,
      toggleOpenDyslexic,
      toggleHighContrast,
      toggleTTS,
      setTTSRate,
      resetSettings,
      speak,
      stopSpeaking,
    }),
    [
      settings,
      resolvedTheme,
      setTheme,
      setFontSize,
      toggleOpenDyslexic,
      toggleHighContrast,
      toggleTTS,
      setTTSRate,
      resetSettings,
      speak,
      stopSpeaking,
    ],
  );

  return <AccessibilityContext.Provider value={value}>{children}</AccessibilityContext.Provider>;
}

export function useAccessibility() {
  const ctx = useContext(AccessibilityContext);
  if (!ctx) {
    throw new Error("useAccessibility precisa estar dentro de AccessibilityProvider");
  }
  return ctx;
}
