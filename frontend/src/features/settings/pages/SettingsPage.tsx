import {
  BookOpen,
  Check,
  Contrast,
  Download,
  Info,
  Palette,
  RotateCcw,
  Share,
  Type,
  Volume2,
} from "lucide-react";
import type { FontSize } from "@/shared/context/AccessibilityContext";
import { useAccessibility } from "@/shared/context/AccessibilityContext";
import { Navbar } from "@/shared/components/Navbar";
import { BottomNav } from "@/shared/components/BottomNav";
import { useInstallPrompt } from "@/shared/hooks/useInstallPrompt";
import { Button, Card, Switch, ThemeToggle } from "@/design-system";

const FONT_SIZES: { value: FontSize; label: string; sample: string }[] = [
  { value: "sm", label: "Pequena", sample: "0.8rem" },
  { value: "md", label: "Normal", sample: "1rem" },
  { value: "lg", label: "Grande", sample: "1.25rem" },
  { value: "xl", label: "Extra", sample: "1.5rem" },
];

const PREVIEW_TEXT = "O CodeCam transforma seus estudos com inteligência artificial acessível.";

/** Cabeçalho de seção com ícone, título e explicação do que a opção faz. */
function SectionHeading({
  icon: Icon,
  id,
  title,
  description,
}: {
  icon: typeof Type;
  id: string;
  title: string;
  description: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <span
        className="grid size-9 shrink-0 place-items-center rounded-lg bg-accent-subtle text-accent"
        aria-hidden="true"
      >
        <Icon size={18} />
      </span>
      <div className="min-w-0">
        <h2 id={id} className="text-base font-semibold text-text">
          {title}
        </h2>
        <p className="text-sm text-text-muted">{description}</p>
      </div>
    </div>
  );
}

export function SettingsPage() {
  const {
    settings,
    setFontSize,
    toggleOpenDyslexic,
    toggleHighContrast,
    toggleTTS,
    setTTSRate,
    resetSettings,
    speak,
  } = useAccessibility();

  const { canInstall, installed, promptInstall } = useInstallPrompt();

  return (
    <div className="flex min-h-dvh flex-col bg-bg">
      <Navbar title="Acessibilidade" />

      <main id="main-content" className="mx-auto w-full max-w-2xl flex-1 px-4 pt-4 pb-28">
        <h1 className="mb-1 text-2xl font-bold text-text">Aparência e acessibilidade</h1>
        <p className="mb-6 text-sm text-text-muted">
          Tudo aqui é salvo automaticamente e vale para todas as telas.
        </p>

        {/* A pré-visualização vem primeiro para que o efeito de cada ajuste
            apareça sem precisar sair da tela. */}
        <Card elevation="raised" padding="lg" className="mb-6">
          <p className="mb-2 text-xs font-medium tracking-wide text-text-subtle uppercase">
            Pré-visualização
          </p>
          <p className="text-base leading-relaxed text-text">{PREVIEW_TEXT}</p>
        </Card>

        <div className="flex flex-col gap-4">
          {/* Tema */}
          <Card padding="lg" aria-labelledby="theme-heading">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <SectionHeading
                icon={Palette}
                id="theme-heading"
                title="Tema"
                description="Claro, escuro ou seguindo o aparelho"
              />
              <ThemeToggle />
            </div>
          </Card>

          {/* Tamanho do texto */}
          <Card padding="lg" aria-labelledby="font-size-heading">
            <SectionHeading
              icon={Type}
              id="font-size-heading"
              title="Tamanho do texto"
              description="Vale para o app inteiro"
            />

            <div
              role="radiogroup"
              aria-labelledby="font-size-heading"
              className="mt-4 grid grid-cols-4 gap-2"
            >
              {FONT_SIZES.map(({ value, label, sample }) => {
                const selected = settings.fontSize === value;
                return (
                  <button
                    key={value}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    onClick={() => setFontSize(value)}
                    className={[
                      "flex min-h-[4rem] flex-col items-center justify-center gap-1 rounded-lg border-2",
                      "transition-colors duration-150",
                      selected
                        ? "border-accent bg-accent-subtle text-accent"
                        : "border-border bg-surface-sunken text-text-muted hover:border-border-strong",
                    ].join(" ")}
                  >
                    {/* O "A" é dimensionado em px fixo de propósito: ele mostra
                        a diferença entre as opções, então não pode escalar
                        junto com a escolha atual. */}
                    <span style={{ fontSize: sample, fontWeight: 700 }} aria-hidden="true">
                      A
                    </span>
                    <span className="text-2xs">{label}</span>
                  </button>
                );
              })}
            </div>
          </Card>

          {/* OpenDyslexic */}
          <Card padding="lg" aria-labelledby="dyslexic-heading">
            <div className="flex items-center justify-between gap-4">
              <SectionHeading
                icon={BookOpen}
                id="dyslexic-heading"
                title="Fonte OpenDyslexic"
                description="Desenhada para facilitar a leitura com dislexia"
              />
              <Switch
                checked={settings.openDyslexic}
                onChange={toggleOpenDyslexic}
                label="Fonte OpenDyslexic"
              />
            </div>
          </Card>

          {/* Alto contraste */}
          <Card padding="lg" aria-labelledby="contrast-heading">
            <div className="flex items-center justify-between gap-4">
              <SectionHeading
                icon={Contrast}
                id="contrast-heading"
                title="Alto contraste"
                description="Reforça bordas e cores para baixa visão"
              />
              <Switch
                checked={settings.highContrast}
                onChange={toggleHighContrast}
                label="Alto contraste"
              />
            </div>
          </Card>

          {/* Leitura em voz alta */}
          <Card padding="lg" aria-labelledby="tts-heading">
            <div className="flex items-center justify-between gap-4">
              <SectionHeading
                icon={Volume2}
                id="tts-heading"
                title="Leitura em voz alta"
                description="Mostra botões de áudio nos conteúdos"
              />
              <Switch
                checked={settings.ttsEnabled}
                onChange={toggleTTS}
                label="Leitura em voz alta"
              />
            </div>

            {settings.ttsEnabled && (
              <div className="mt-5 animate-rise-in border-t border-border pt-4">
                <label htmlFor="tts-rate" className="mb-2 block text-sm font-medium text-text">
                  Velocidade da voz
                  <span className="ml-2 tabular-nums text-text-muted">
                    {settings.ttsRate.toFixed(1)}x
                  </span>
                </label>

                <input
                  id="tts-rate"
                  type="range"
                  min="0.5"
                  max="2"
                  step="0.1"
                  value={settings.ttsRate}
                  onChange={(event) => setTTSRate(Number.parseFloat(event.target.value))}
                  className="h-2 w-full appearance-none rounded-full bg-surface-sunken"
                  style={{ accentColor: "var(--ds-accent)" }}
                />

                <div className="mt-1 flex justify-between text-xs text-text-subtle">
                  <span>Lento</span>
                  <span>Rápido</span>
                </div>

                <Button
                  variant="subtle"
                  fullWidth
                  className="mt-4"
                  icon={<Volume2 size={16} />}
                  onClick={() => speak(PREVIEW_TEXT)}
                >
                  Testar voz
                </Button>
              </div>
            )}
          </Card>

          {/* Instalação */}
          <Card padding="lg">
            <SectionHeading
              icon={Download}
              id="install-heading"
              title="Instalar o CodeCam"
              description="Abre direto da tela de início, sem barra de endereços, e funciona com o material já baixado mesmo sem internet."
            />

            <div className="mt-4">
              {installed ? (
                <p className="flex items-center gap-2 rounded-xl bg-success-subtle px-4 py-3 text-sm text-success">
                  <Check size={17} aria-hidden="true" />O app já está instalado neste aparelho.
                </p>
              ) : canInstall ? (
                <Button
                  fullWidth
                  icon={<Download size={18} />}
                  onClick={() => void promptInstall()}
                >
                  Instalar aplicativo
                </Button>
              ) : (
                /* Sem `beforeinstallprompt` não há botão que funcione — é o
                   caso do iPhone, onde a instalação é manual. Explicar o
                   caminho vale mais do que um botão inerte. */
                <p className="flex items-start gap-2 rounded-xl bg-surface-sunken px-4 py-3 text-sm text-text-muted">
                  <Share size={17} className="mt-0.5 shrink-0" aria-hidden="true" />
                  No iPhone, toque em Compartilhar na barra do Safari e escolha “Adicionar à Tela de
                  Início”.
                </p>
              )}
            </div>
          </Card>

          {/* Aviso */}
          <Card padding="lg" className="flex items-start gap-3">
            <Info size={18} className="mt-0.5 shrink-0 text-text-subtle" aria-hidden="true" />
            <p className="text-sm text-text-muted">
              As preferências ficam salvas neste aparelho. Ao entrar de outro dispositivo, será
              preciso configurá-las novamente.
            </p>
          </Card>

          <Button
            variant="danger"
            size="lg"
            fullWidth
            icon={<RotateCcw size={18} />}
            onClick={resetSettings}
          >
            Restaurar padrões
          </Button>
        </div>
      </main>

      <BottomNav />
    </div>
  );
}
