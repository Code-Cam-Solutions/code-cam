import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AlignLeft, Check, Layers, ListTree, Sparkles } from "lucide-react";
import type { StudyFormat } from "@/api";
import { useRouteState } from "@/shared/lib/navigation";
import { Button, Card, cn } from "@/design-system";
import { Navbar } from "@/shared/components/Navbar";

interface FormatOption {
  id: StudyFormat;
  label: string;
  description: string;
  /** Para quem esse formato funciona melhor. */
  bestFor: string;
  icon: typeof AlignLeft;
}

/**
 * Cada formato serve a um modo de estudar diferente, e a descrição diz qual —
 * "resumo, tópicos ou flashcards" sozinho não ajuda ninguém a escolher.
 */
const FORMATS: FormatOption[] = [
  {
    id: "summary",
    label: "Resumo",
    description: "O conteúdo em poucas frases, pronto para ouvir.",
    bestFor: "Para revisar rápido",
    icon: AlignLeft,
  },
  {
    id: "topics",
    label: "Tópicos",
    description: "Os pontos-chave em lista, na ordem em que aparecem.",
    bestFor: "Para estudo dirigido",
    icon: ListTree,
  },
  {
    id: "flashcards",
    label: "Flashcards",
    description: "Perguntas e respostas com repetição espaçada.",
    bestFor: "Para memorizar",
    icon: Layers,
  },
];

/** Ninguém sai desta tela sem escolher nada, então o padrão já vem marcado. */
const DEFAULT_SELECTION: StudyFormat[] = ["summary", "flashcards"];

export function FormatSelectionPage() {
  const navigate = useNavigate();
  const { photo } = useRouteState<"/camera/formats">();
  const [selected, setSelected] = useState<StudyFormat[]>(DEFAULT_SELECTION);

  useEffect(() => {
    if (!photo) void navigate("/camera", { replace: true });
  }, [photo, navigate]);

  // A prévia acaba aqui: quem confirma segue para o processamento, que só
  // precisa do blob. Sem revogar, cada captura deixaria a imagem na memória
  // até a página recarregar.
  useEffect(() => {
    const url = photo?.url;
    return () => {
      if (url) URL.revokeObjectURL(url);
    };
  }, [photo?.url]);

  if (!photo) return null;

  function toggle(format: StudyFormat) {
    setSelected((current) =>
      current.includes(format)
        ? current.filter((item) => item !== format)
        : // Preserva a ordem declarada em FORMATS, não a ordem dos cliques: é
          // nessa ordem que os resultados aparecem na tela seguinte.
          FORMATS.map((option) => option.id).filter((id) => id === format || current.includes(id)),
    );
  }

  function handleGenerate() {
    if (!photo || selected.length === 0) return;
    void navigate("/processing", {
      state: { imageBlob: photo.blob, formats: selected, thumbnail: photo.thumbnail },
      replace: true,
    });
  }

  return (
    <div className="flex min-h-dvh flex-col bg-bg">
      <Navbar showBack />

      <main
        id="main-content"
        className="mx-auto w-full max-w-2xl flex-1 px-4 pt-4 pb-[calc(8.5rem+env(safe-area-inset-bottom))]"
      >
        {/* A pergunta sai da barra e vira o título da página: é a decisão que
            a tela inteira existe para tomar, e na barra ficava truncada. */}
        <h1 className="mb-1 text-2xl font-bold text-text">O que deseja gerar?</h1>
        <p className="mb-5 text-sm text-text-muted">
          Cada formato serve a um jeito de estudar. Escolha quantos quiser.
        </p>

        <div className="flex items-center gap-3">
          <img
            src={photo.url}
            alt="Miniatura da foto que será analisada"
            className="size-16 shrink-0 rounded-xl border border-border object-cover"
          />
          <p className="text-sm text-text-muted">
            Cada formato é otimizado para uma forma de estudo. Escolha um ou mais.
          </p>
        </div>

        <fieldset className="mt-6 border-0 p-0">
          <legend className="sr-only">Formatos a gerar</legend>

          <div className="flex flex-col gap-3">
            {FORMATS.map(({ id, label, description, bestFor, icon: Icon }, index) => {
              const checked = selected.includes(id);

              return (
                <label
                  key={id}
                  className="group block cursor-pointer opacity-0 animate-rise-in"
                  style={{ animationDelay: `${index * 60}ms` }}
                >
                  {/* `aria-label` explícito: o rótulo visível é montado por
                      vários elementos aninhados, e o leitor de tela se sai
                      melhor com uma frase única do que com a colagem deles. */}
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggle(id)}
                    aria-label={`${label} — ${description}`}
                    className="peer sr-only"
                  />

                  <Card
                    padding="md"
                    className={cn(
                      "flex items-start gap-3.5 transition-[border-color,background-color] duration-200",
                      // O estado marcado não depende só da cor: a borda engrossa
                      // e o ícone de confirmação aparece. WCAG 1.4.1.
                      checked ? "border-accent bg-accent-subtle" : "hover:border-border-strong",
                      "peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-accent",
                    )}
                  >
                    <span
                      className={cn(
                        "grid size-11 shrink-0 place-items-center rounded-xl transition-colors duration-200",
                        checked
                          ? "bg-accent text-accent-contrast"
                          : "bg-surface-sunken text-text-muted",
                      )}
                      aria-hidden="true"
                    >
                      <Icon size={21} strokeWidth={1.9} />
                    </span>

                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-2">
                        <span className="text-base font-semibold text-text">{label}</span>
                        <span className="rounded-full bg-surface-sunken px-2 py-0.5 text-2xs font-medium text-text-subtle">
                          {bestFor}
                        </span>
                      </span>
                      <span className="mt-0.5 block text-sm text-text-muted">{description}</span>
                    </span>

                    <span
                      className={cn(
                        "mt-0.5 grid size-6 shrink-0 place-items-center rounded-md border-2 transition-colors duration-200",
                        checked
                          ? "border-accent bg-accent text-accent-contrast"
                          : "border-border-strong",
                      )}
                      aria-hidden="true"
                    >
                      {checked && <Check size={15} strokeWidth={3} />}
                    </span>
                  </Card>
                </label>
              );
            })}
          </div>
        </fieldset>
      </main>

      <div
        className={cn(
          "fixed inset-x-0 bottom-0 bg-bg/92 backdrop-blur-xl",
          "px-4 pt-3 pb-[calc(1rem+env(safe-area-inset-bottom))]",
        )}
        style={{ zIndex: "var(--ds-z-sticky)" }}
      >
        <div className="mx-auto w-full max-w-2xl">
          <p className="mb-2 text-center text-xs text-text-subtle" aria-live="polite">
            {selected.length === 0
              ? "Escolha ao menos um formato"
              : `${selected.length} ${selected.length === 1 ? "formato selecionado" : "formatos selecionados"}`}
          </p>

          <Button
            variant="primary"
            size="lg"
            fullWidth
            disabled={selected.length === 0}
            onClick={handleGenerate}
            icon={<Sparkles size={19} />}
          >
            Gerar conteúdo
          </Button>
        </div>
      </div>
    </div>
  );
}
