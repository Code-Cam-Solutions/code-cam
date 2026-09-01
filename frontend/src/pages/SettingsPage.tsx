import { Type, BookOpen, Contrast, Volume2, RotateCcw, Info } from "lucide-react";
import type { FontSize } from "../context/AccessibilityContext";
import { useAccessibility } from "../context/AccessibilityContext";
import { Navbar } from "../components/Navbar";
import { BottomNav } from "../components/BottomNav";
import { Button } from "../components/Button";

const FONT_SIZES: { value: FontSize; label: string }[] = [
  { value: "sm", label: "Pequena" },
  { value: "md", label: "Normal" },
  { value: "lg", label: "Grande" },
  { value: "xl", label: "Extra grande" },
];

function Toggle({ checked, onChange, id, label }: { checked: boolean; onChange: () => void; id: string; label: string; }) {
  return (
    <button role="switch" aria-checked={checked} id={id} onClick={onChange} aria-label={label}
      className="relative inline-flex items-center w-12 h-6 rounded-full transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-codecam"
      style={{ backgroundColor: checked ? "var(--color-codecam)" : "var(--color-surface-2)", border: "2px solid", borderColor: checked ? "var(--color-codecam)" : "var(--color-border)" }}>
      <span className="inline-block w-4 h-4 rounded-full transition-transform" style={{ backgroundColor: "white", transform: checked ? "translateX(24px)" : "translateX(2px)" }} aria-hidden="true" />
      <span className="sr-only">{checked ? "Ativado" : "Desativado"}</span>
    </button>
  );
}

export function SettingsPage() {
  const { settings, setFontSize, toggleOpenDyslexic, toggleHighContrast, toggleTTS, setTTSRate, resetSettings, speak } = useAccessibility();
  const previewText = "O CodeCam transforma seus estudos com inteligência artificial acessível.";

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: "var(--color-background)" }}>
      <Navbar title="Acessibilidade" />
      <main className="flex-1 px-4 pt-4 pb-28 max-w-2xl mx-auto w-full" id="main-content">
        <h1 className="font-bold text-white mb-6" style={{ fontSize: "var(--text-2xl)" }}>Configurações de Acessibilidade</h1>

        {/* Preview */}
        <section className="mb-6 p-4 rounded-2xl" style={{ backgroundColor: "var(--color-surface)", border: "1px solid var(--color-border)" }} aria-labelledby="preview-heading">
          <h2 id="preview-heading" className="font-semibold mb-3" style={{ color: "var(--color-text-muted)", fontSize: "var(--text-sm)" }}>Pré-visualização</h2>
          <p className="text-white" style={{ fontSize: "var(--text-base)", lineHeight: "1.7", fontFamily: settings.openDyslexic ? "OpenDyslexic, sans-serif" : undefined }}>{previewText}</p>
        </section>

        {/* Font size */}
        <section className="mb-5 p-4 rounded-2xl" style={{ backgroundColor: "var(--color-surface)" }} aria-labelledby="font-size-heading">
          <div className="flex items-center gap-2 mb-4">
            <Type size={20} style={{ color: "var(--color-codecam)" }} aria-hidden="true" />
            <h2 id="font-size-heading" className="font-semibold text-white" style={{ fontSize: "var(--text-base)" }}>Tamanho do texto</h2>
          </div>
          <div className="grid grid-cols-4 gap-2" role="radiogroup" aria-label="Selecionar tamanho do texto">
            {FONT_SIZES.map(({ value, label }) => (
              <button key={value} role="radio" aria-checked={settings.fontSize === value} onClick={() => setFontSize(value)} aria-label={label}
                className="flex flex-col items-center py-3 rounded-xl transition-all focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-codecam"
                style={{ backgroundColor: settings.fontSize === value ? "var(--color-codecam)" : "var(--color-surface-2)", color: settings.fontSize === value ? "white" : "var(--color-text-muted)", border: settings.fontSize === value ? "2px solid var(--color-codecam)" : "2px solid transparent" }}>
                <span style={{ fontSize: value === "sm" ? "0.75rem" : value === "md" ? "1rem" : value === "lg" ? "1.2rem" : "1.4rem", fontWeight: "bold" }} aria-hidden="true">A</span>
                <span style={{ fontSize: "0.65rem", marginTop: "4px" }}>{label}</span>
              </button>
            ))}
          </div>
        </section>

        {/* OpenDyslexic */}
        <section className="mb-5 p-4 rounded-2xl" style={{ backgroundColor: "var(--color-surface)" }} aria-labelledby="dyslexic-heading">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 flex-1">
              <BookOpen size={20} style={{ color: "var(--color-codecam)" }} aria-hidden="true" />
              <div>
                <h2 id="dyslexic-heading" className="font-semibold text-white" style={{ fontSize: "var(--text-base)" }}>Fonte OpenDyslexic</h2>
                <p style={{ color: "var(--color-text-muted)", fontSize: "var(--text-xs)" }}>Facilita leitura para dislexia</p>
              </div>
            </div>
            <Toggle id="dyslexic-toggle" checked={settings.openDyslexic} onChange={toggleOpenDyslexic} label={`Fonte OpenDyslexic: ${settings.openDyslexic ? "ativada" : "desativada"}`} />
          </div>
          {settings.openDyslexic && (
            <p className="mt-3 p-2 rounded-lg text-white" style={{ fontFamily: "OpenDyslexic, sans-serif", backgroundColor: "var(--color-surface-2)", fontSize: "var(--text-sm)" }} aria-live="polite">Esta frase usa a fonte OpenDyslexic.</p>
          )}
        </section>

        {/* High contrast */}
        <section className="mb-5 p-4 rounded-2xl" style={{ backgroundColor: "var(--color-surface)" }} aria-labelledby="contrast-heading">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 flex-1">
              <Contrast size={20} style={{ color: "var(--color-codecam)" }} aria-hidden="true" />
              <div>
                <h2 id="contrast-heading" className="font-semibold text-white" style={{ fontSize: "var(--text-base)" }}>Alto contraste</h2>
                <p style={{ color: "var(--color-text-muted)", fontSize: "var(--text-xs)" }}>Aumenta contraste visual</p>
              </div>
            </div>
            <Toggle id="contrast-toggle" checked={settings.highContrast} onChange={toggleHighContrast} label={`Alto contraste: ${settings.highContrast ? "ativado" : "desativado"}`} />
          </div>
        </section>

        {/* TTS */}
        <section className="mb-5 p-4 rounded-2xl" style={{ backgroundColor: "var(--color-surface)" }} aria-labelledby="tts-heading">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3 flex-1">
              <Volume2 size={20} style={{ color: "var(--color-codecam)" }} aria-hidden="true" />
              <div>
                <h2 id="tts-heading" className="font-semibold text-white" style={{ fontSize: "var(--text-base)" }}>Leitura em voz alta</h2>
                <p style={{ color: "var(--color-text-muted)", fontSize: "var(--text-xs)" }}>Botões de leitura nos conteúdos</p>
              </div>
            </div>
            <Toggle id="tts-toggle" checked={settings.ttsEnabled} onChange={toggleTTS} label={`Leitura em voz alta: ${settings.ttsEnabled ? "ativada" : "desativada"}`} />
          </div>
          {settings.ttsEnabled && (
            <div className="mt-3 animate-fade-in">
              <div className="flex items-center justify-between mb-2">
                <label htmlFor="tts-rate" className="text-white" style={{ fontSize: "var(--text-sm)" }}>Velocidade: {settings.ttsRate.toFixed(1)}x</label>
              </div>
              <input id="tts-rate" type="range" min="0.5" max="2" step="0.1" value={settings.ttsRate} onChange={(e) => setTTSRate(parseFloat(e.target.value))} aria-label={`Velocidade da leitura: ${settings.ttsRate.toFixed(1)} vezes`}
                className="w-full h-2 rounded-full appearance-none focus-visible:outline-2 focus-visible:outline-codecam" style={{ backgroundColor: "var(--color-surface-2)", accentColor: "var(--color-codecam)" }} />
              <div className="flex justify-between mt-1">
                <span style={{ color: "var(--color-text-muted)", fontSize: "var(--text-xs)" }}>Lento</span>
                <span style={{ color: "var(--color-text-muted)", fontSize: "var(--text-xs)" }}>Rápido</span>
              </div>
              <button onClick={() => speak(previewText)} className="mt-3 w-full py-2 rounded-xl text-white transition-colors hover:opacity-80 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-codecam"
                style={{ backgroundColor: "var(--color-codecam)" + "30", border: "1px solid var(--color-codecam)" + "50", fontSize: "var(--text-sm)" }} aria-label="Testar leitura em voz alta">
                🔊 Testar voz
              </button>
            </div>
          )}
        </section>

        {/* Info */}
        <section className="mb-6 p-4 rounded-2xl flex items-start gap-3" style={{ backgroundColor: "var(--color-surface)", border: "1px solid var(--color-border)" }} aria-labelledby="info-heading">
          <Info size={18} style={{ color: "var(--color-codecam)", flexShrink: 0, marginTop: "2px" }} aria-hidden="true" />
          <div>
            <h2 id="info-heading" className="font-semibold text-white mb-1" style={{ fontSize: "var(--text-sm)" }}>Sobre as configurações</h2>
            <p style={{ color: "var(--color-text-muted)", fontSize: "var(--text-xs)", lineHeight: "1.6" }}>Todas as configurações são salvas automaticamente e aplicadas em todas as telas do CodeCam.</p>
          </div>
        </section>

        <Button variant="danger" fullWidth size="lg" icon={<RotateCcw size={18} aria-hidden="true" />} onClick={resetSettings} aria-label="Resetar todas as configurações de acessibilidade">Resetar configurações</Button>
      </main>
      <BottomNav />
    </div>
  );
}
