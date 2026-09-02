import { useEffect, useState, type ReactNode } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  BookOpen,
  CalendarDays,
  ChevronDown,
  FileText,
  Layers,
  ListChecks,
  Play,
} from "lucide-react";
import { getContent } from "../services/api";
import type { Content } from "../services/api";
import { Badge, Button, Card, EmptyState, SkeletonList, cn } from "../design-system";
import { Navbar } from "../components/Navbar";
import { BottomNav } from "../components/BottomNav";
import { TTSButton } from "../components/TTSButton";

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

/** Cabeçalho de seção: selo do ícone, título e uma ação opcional à direita. */
function SectionHeading({
  icon: Icon,
  id,
  title,
  action,
  solidIcon = false,
}: {
  icon: typeof BookOpen;
  id: string;
  title: string;
  action?: ReactNode;
  /** Sobre um card já tingido de acento, o selo precisa ser sólido para existir. */
  solidIcon?: boolean;
}) {
  return (
    <div className="mb-3 flex items-center justify-between gap-3">
      <div className="flex min-w-0 items-center gap-2.5">
        <span
          className={cn(
            "grid size-8 shrink-0 place-items-center rounded-lg",
            solidIcon ? "bg-accent text-accent-contrast" : "bg-accent-subtle text-accent",
          )}
          aria-hidden="true"
        >
          <Icon size={17} />
        </span>
        <h2 id={id} className="truncate text-base font-semibold text-text">
          {title}
        </h2>
      </div>
      {action}
    </div>
  );
}

/**
 * Bloco recolhível do texto bruto.
 *
 * Fica fechado por padrão porque é o material cru do OCR: útil para conferir,
 * ruído para quem só quer o resumo.
 */
function RawTextSection({ text }: { text: string }) {
  const [open, setOpen] = useState(false);
  const regionId = "raw-text-saved";

  return (
    <Card padding="none" className="overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-controls={regionId}
        className={cn(
          "flex min-h-[3.25rem] w-full items-center justify-between gap-3 px-4 py-3",
          "transition-colors duration-150 hover:bg-surface-sunken",
        )}
      >
        <span className="flex items-center gap-2.5">
          <span
            className="grid size-8 shrink-0 place-items-center rounded-lg bg-surface-sunken text-text-subtle"
            aria-hidden="true"
          >
            <FileText size={17} />
          </span>
          <span className="text-base font-semibold text-text">Texto extraído</span>
        </span>

        <ChevronDown
          size={18}
          className={cn(
            "shrink-0 text-text-subtle transition-transform duration-200 ease-enter",
            open && "rotate-180",
          )}
          aria-hidden="true"
        />
      </button>

      {open && (
        <div id={regionId} className="animate-rise-in border-t border-border px-4 pt-3 pb-4">
          <div className="mb-2 flex justify-end">
            <TTSButton text={text} label="texto extraído" />
          </div>
          <p className="text-sm leading-relaxed whitespace-pre-wrap text-text-muted">{text}</p>
        </div>
      )}
    </Card>
  );
}

export function ContentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [content, setContent] = useState<Content | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    getContent(id)
      .then(setContent)
      .catch(() => setError("Não foi possível carregar o conteúdo."))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="flex min-h-dvh flex-col bg-bg">
        <Navbar title="Conteúdo" showBack />
        <main id="main-content" className="mx-auto w-full max-w-2xl flex-1 px-4 pt-6 pb-28">
          <SkeletonList count={3} label="Carregando conteúdo" />
        </main>
        <BottomNav />
      </div>
    );
  }

  if (error || !content) {
    return (
      <div className="flex min-h-dvh flex-col bg-bg">
        <Navbar title="Conteúdo" showBack />
        <main
          id="main-content"
          className="mx-auto flex w-full max-w-2xl flex-1 items-center px-4 pb-28"
        >
          <div role="alert" className="w-full">
            <EmptyState
              className="animate-rise-in"
              icon={<FileText size={26} />}
              title={error || "Conteúdo não encontrado."}
              description="Ele pode ter sido removido, ou o link não corresponde a nenhum material salvo."
              action={<Button onClick={() => void navigate(-1)}>Voltar</Button>}
            />
          </div>
        </main>
        <BottomNav />
      </div>
    );
  }

  const flashcardCount = content.flashcards?.length ?? 0;

  return (
    <div className="flex min-h-dvh flex-col bg-bg">
      <Navbar title="Conteúdo" showBack />

      <main id="main-content" className="mx-auto w-full max-w-2xl flex-1 px-4 pt-6 pb-28">
        {/* Cabeçalho — título e metadados soltos sobre o fundo, sem card, para
            que a leitura comece pelo assunto e não por uma moldura. */}
        <header className="mb-7 animate-rise-in">
          <div className="flex items-start justify-between gap-3">
            <h1 id="content-title" className="min-w-0 flex-1 text-3xl font-bold text-text">
              {content.title}
            </h1>
            <TTSButton text={content.title} label="título" />
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <Badge icon={<CalendarDays size={13} />}>{formatDate(content.createdAt)}</Badge>
            {content.topics.length > 0 && (
              <Badge>
                {content.topics.length} {content.topics.length === 1 ? "tópico" : "tópicos"}
              </Badge>
            )}
            {flashcardCount > 0 && (
              <Badge tone="accent" icon={<Layers size={13} />}>
                {flashcardCount} {flashcardCount === 1 ? "flashcard" : "flashcards"}
              </Badge>
            )}
          </div>
        </header>

        <div className="flex flex-col gap-4">
          {/* Resumo */}
          <Card padding="lg" elevation="raised" aria-labelledby="content-summary">
            <SectionHeading
              icon={BookOpen}
              id="content-summary"
              title="Resumo"
              action={<TTSButton text={content.summary} label="resumo" />}
            />
            <p className="text-base leading-relaxed text-text">{content.summary}</p>
          </Card>

          {/* Tópicos */}
          {content.topics.length > 0 && (
            <Card padding="lg" aria-labelledby="content-topics">
              <SectionHeading icon={ListChecks} id="content-topics" title="Tópicos" />
              <ul className="flex flex-wrap gap-2">
                {content.topics.map((topic, i) => (
                  <li key={i} className="flex items-center gap-1">
                    <Badge tone="accent" className="max-w-full whitespace-normal">
                      {topic}
                    </Badge>
                    <TTSButton text={topic} label={`tópico ${i + 1}`} />
                  </li>
                ))}
              </ul>
            </Card>
          )}

          {/* Flashcards */}
          {flashcardCount > 0 && (
            <Card
              padding="lg"
              className="border-accent/25 bg-accent-subtle"
              aria-labelledby="content-flashcards"
            >
              <SectionHeading
                icon={Layers}
                id="content-flashcards"
                title={`Flashcards (${flashcardCount})`}
                solidIcon
              />
              <p className="mb-4 text-sm text-text">
                Revise o conteúdo respondendo às perguntas geradas a partir dele.
              </p>
              <Button
                fullWidth
                size="lg"
                icon={<Play size={18} />}
                onClick={() =>
                  void navigate("/flashcards", { state: { flashcards: content.flashcards } })
                }
                aria-label={`Iniciar sessão com ${flashcardCount} flashcards`}
              >
                Iniciar flashcards
              </Button>
            </Card>
          )}

          <RawTextSection text={content.rawText} />
        </div>
      </main>

      <BottomNav />
    </div>
  );
}
