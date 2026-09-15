import { useEffect, useState, type ReactNode } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  BookOpen,
  CalendarDays,
  ChevronDown,
  FileText,
  ImageOff,
  Layers,
  ListChecks,
  Maximize2,
  Play,
  X,
} from "lucide-react";
import { getContent } from "@/api";
import type { Content } from "@/api";
import { Badge, Button, Card, EmptyState, SkeletonList, cn } from "@/design-system";
import { Navbar } from "@/shared/components/Navbar";
import { BottomNav } from "@/shared/components/BottomNav";
import { TTSButton } from "@/shared/components/TTSButton";
import { EmojiText, MarkedItem, ReadableProse } from "@/shared/components/ReadingAid";
import { withoutLeadingEmoji } from "@/shared/lib/emoji";
import { useEscapeKey } from "@/shared/hooks/useEscapeKey";

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

/**
 * A foto que originou o material.
 *
 * Fica no topo porque é o que o estudante reconhece antes de ler qualquer
 * palavra — semanas depois, "aquela lousa de fotossíntese" é uma imagem na
 * memória, não um título. O toque abre em tela cheia porque a miniatura de
 * 800px serve para reconhecer, e às vezes é preciso conferir um detalhe.
 */
function CapturePhoto({ src, title }: { src: string; title: string }) {
  const [expanded, setExpanded] = useState(false);
  const [broken, setBroken] = useState(false);

  useEscapeKey(expanded, () => setExpanded(false));

  if (broken) {
    return (
      <div className="mb-6 flex items-center gap-2.5 rounded-xl border border-border bg-surface-sunken px-4 py-3">
        <ImageOff size={18} className="shrink-0 text-text-subtle" aria-hidden="true" />
        <p className="text-sm text-text-subtle">A foto deste material não pôde ser carregada.</p>
      </div>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setExpanded(true)}
        aria-label={`Ampliar a foto de ${title}`}
        className={cn(
          "group relative mb-6 block w-full overflow-hidden rounded-2xl",
          "border border-border bg-black",
          "transition-transform duration-200 ease-enter active:scale-[0.99]",
        )}
      >
        <img
          src={src}
          alt={`Foto capturada de ${title}`}
          onError={() => setBroken(true)}
          className="max-h-56 w-full object-cover"
        />
        {/* Véu inferior: garante contraste do selo sobre foto de qualquer cor. */}
        <span
          className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black/70 to-transparent"
          aria-hidden="true"
        />
        <span
          className={cn(
            "absolute right-3 bottom-3 flex items-center gap-1.5 rounded-full",
            "bg-black/55 px-2.5 py-1 text-xs font-medium text-white backdrop-blur-sm",
            "transition-transform duration-200 ease-enter group-hover:scale-105",
          )}
          aria-hidden="true"
        >
          <Maximize2 size={13} />
          Ampliar
        </span>
      </button>

      {expanded && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`Foto de ${title} em tela cheia`}
          className="fixed inset-0 animate-fade-in bg-black/95"
          style={{ zIndex: "var(--ds-z-modal)" }}
        >
          {/* O fundo é um botão, não uma `div` com `onClick`: tocar fora para
              fechar precisa existir também para quem navega por teclado. */}
          <button
            type="button"
            onClick={() => setExpanded(false)}
            aria-label="Fechar a foto ampliada"
            tabIndex={-1}
            className="absolute inset-0 size-full cursor-zoom-out"
          />

          <div className="pointer-events-none grid size-full place-items-center p-4">
            <img
              src={src}
              alt={`Foto capturada de ${title}`}
              className="max-h-full max-w-full object-contain"
            />
          </div>
          <button
            type="button"
            onClick={() => setExpanded(false)}
            aria-label="Fechar a foto ampliada"
            autoFocus
            className={cn(
              "absolute top-[calc(1rem+env(safe-area-inset-top))] right-4",
              "grid size-11 place-items-center rounded-full",
              "border border-white/20 bg-black/60 text-white backdrop-blur-md",
            )}
          >
            <X size={22} aria-hidden="true" />
          </button>
        </div>
      )}
    </>
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
        {content.imageUrl && <CapturePhoto src={content.imageUrl} title={content.title} />}

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
            <ReadableProse text={content.summary} />
          </Card>

          {/* Tópicos */}
          {content.topics.length > 0 && (
            <Card padding="lg" aria-labelledby="content-topics">
              <SectionHeading icon={ListChecks} id="content-topics" title="Tópicos" />
              <ul className="flex flex-wrap gap-2">
                {content.topics.map((topic, i) => (
                  <li key={i} className="flex items-center gap-1">
                    {/* O marcador fica à esquerda do selo, fora da linha do
                        texto — ponto de retorno para o olho, sem interromper
                        a leitura da frase. */}
                    <MarkedItem kind="topic">
                      <Badge tone="accent" className="max-w-full whitespace-normal">
                        <EmojiText value={topic} />
                      </Badge>
                    </MarkedItem>
                    {/* A fala recebe o texto sem o emoji: um leitor de tela o
                        anunciaria por extenso no meio do tópico. */}
                    <TTSButton text={withoutLeadingEmoji(topic)} label={`tópico ${i + 1}`} />
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
                // Estuda os cartões salvos, não uma cópia: é o que faz cada
                // resposta contar para a repetição espaçada deste material.
                onClick={() => void navigate(`/study/${content.id}`)}
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
