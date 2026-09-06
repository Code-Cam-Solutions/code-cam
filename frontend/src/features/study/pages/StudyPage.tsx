import { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  BookOpen,
  Check,
  Dumbbell,
  Home,
  Minus,
  RefreshCcw,
  RotateCcw,
  ScrollText,
  ThumbsUp,
  Trophy,
  X,
} from "lucide-react";
import {
  finishStudySession,
  getContent,
  getContentCards,
  getStudyQueue,
  recordReview,
  startStudySession,
  type DraftFlashcard,
  type Content,
  type Flashcard,
  type ReviewRating,
} from "@/api";
import {
  Badge,
  Button,
  Card,
  Dialog,
  EmptyState,
  Progress,
  Ring,
  Skeleton,
  cn,
} from "@/design-system";
import { Navbar } from "@/shared/components/Navbar";
import { TTSButton } from "@/shared/components/TTSButton";
import { useAsync } from "@/shared/hooks/useAsync";
import { useRouteState } from "@/shared/lib/navigation";

/**
 * Cartão em estudo.
 *
 * Um cartão salvo tem identidade no banco e estado de repetição espaçada; um
 * cartão recém-gerado pela IA, ainda não salvo, não tem nem uma coisa nem
 * outra. A união deixa a tela servir aos dois casos sem fingir que o segundo
 * pode ser agendado.
 */
type StudyCard = Flashcard | (DraftFlashcard & { id?: undefined });

function isPersisted(card: StudyCard): card is Flashcard {
  return typeof card.id === "string";
}

/**
 * As três autoavaliações que a tela oferece, e a nota SM-2 de cada uma.
 *
 * O algoritmo aceita quatro notas, mas oferecer quatro botões em um celular
 * transforma cada cartão numa decisão — e quem está estudando não quer
 * classificar a própria memória em quatro faixas, quer dizer se lembrou.
 * "Muito fácil" fica de fora: na dúvida entre ele e "acertei", o custo de
 * escolher errado é um intervalo esticado demais e o conteúdo esquecido.
 */
const CHOICES = [
  {
    rating: "AGAIN",
    label: "Não sei",
    ariaLabel: "Não lembrei deste cartão",
    Icon: X,
    surface: "border-danger/30 bg-danger-subtle text-danger hover:border-danger/60",
  },
  {
    rating: "HARD",
    label: "Quase",
    ariaLabel: "Lembrei com dificuldade",
    Icon: Minus,
    surface: "border-warning/30 bg-warning-subtle text-warning hover:border-warning/60",
  },
  {
    rating: "GOOD",
    label: "Sei",
    ariaLabel: "Lembrei deste cartão",
    Icon: Check,
    surface: "border-success/30 bg-success-subtle text-success hover:border-success/60",
  },
] as const satisfies readonly {
  rating: ReviewRating;
  label: string;
  ariaLabel: string;
  Icon: typeof Check;
  surface: string;
}[];

const GRADES = {
  excellent: { Icon: Trophy, text: "Excelente!", halo: "bg-success-subtle text-success" },
  good: { Icon: ThumbsUp, text: "Bom trabalho!", halo: "bg-accent-subtle text-accent" },
  fair: { Icon: BookOpen, text: "Continue praticando!", halo: "bg-warning-subtle text-warning" },
  poor: {
    Icon: Dumbbell,
    text: "Não desista, tente de novo!",
    halo: "bg-danger-subtle text-danger",
  },
} as const;

function gradeFor(accuracy: number) {
  if (accuracy >= 80) return GRADES.excellent;
  if (accuracy >= 60) return GRADES.good;
  if (accuracy >= 40) return GRADES.fair;
  return GRADES.poor;
}

/** Quando o cartão volta, em linguagem de gente. */
function nextReviewLabel(days: number): string {
  if (days <= 0) return "volta ainda hoje";
  if (days === 1) return "volta amanhã";
  if (days < 30) return `volta em ${days} dias`;
  const months = Math.round(days / 30);
  return months === 1 ? "volta em um mês" : `volta em ${months} meses`;
}

/**
 * Consulta ao resumo durante a sessão.
 *
 * Existe porque travar em um cartão tinha uma única saída: sair da revisão,
 * reler o material e recomeçar do zero — perdendo o progresso e, no modo
 * agendado, contaminando a estatística com uma sessão abandonada. Consultar é
 * um gesto legítimo de quem estuda; o que não pode é custar a sessão inteira.
 *
 * O conteúdo é buscado só quando a pessoa abre, e uma vez por sessão: quem
 * nunca precisa não paga a requisição.
 */
function SummaryPeek({ contentId }: { contentId: string }) {
  const [open, setOpen] = useState(false);
  const [content, setContent] = useState<Content | null>(null);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);

  async function handleOpen() {
    setOpen(true);
    if (content || loading) return;

    setLoading(true);
    setFailed(false);
    try {
      setContent(await getContent(contentId));
    } catch {
      setFailed(true);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => void handleOpen()}
        className={cn(
          "flex min-h-[2.25rem] shrink-0 items-center gap-1.5 rounded-full border px-3",
          "border-border bg-surface text-xs font-medium text-text-muted",
          "transition-colors duration-150 hover:border-border-strong hover:text-text",
        )}
      >
        <ScrollText size={14} aria-hidden="true" />
        Resumo
      </button>

      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        title="Resumo do material"
        description="Sua sessão continua de onde parou."
      >
        {loading && <Skeleton className="h-24 rounded-xl" />}

        {failed && (
          <p role="alert" className="text-sm text-danger">
            Não consegui carregar o resumo agora. Sua sessão não foi afetada.
          </p>
        )}

        {content && !loading && (
          <div className="flex flex-col gap-4">
            <div>
              <div className="mb-2 flex items-center justify-between gap-2">
                <h3 className="text-sm font-semibold text-text-subtle uppercase">Resumo</h3>
                <TTSButton text={content.summary} label="resumo" />
              </div>
              <p className="text-base leading-relaxed text-text">{content.summary}</p>
            </div>

            {content.topics.length > 0 && (
              <div>
                <h3 className="mb-2 text-sm font-semibold text-text-subtle uppercase">Tópicos</h3>
                <ul className="flex flex-wrap gap-2">
                  {content.topics.map((topic) => (
                    <li key={topic}>
                      <Badge tone="accent" className="max-w-full whitespace-normal">
                        {topic}
                      </Badge>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        <Button variant="secondary" fullWidth className="mt-5" onClick={() => setOpen(false)}>
          Voltar ao cartão
        </Button>
      </Dialog>
    </>
  );
}

interface Tally {
  AGAIN: number;
  HARD: number;
  GOOD: number;
}

const EMPTY_TALLY: Tally = { AGAIN: 0, HARD: 0, GOOD: 0 };

export function StudyPage() {
  const navigate = useNavigate();
  const { draftCards, title } = useRouteState<"/flashcards">();

  // Modo prática: os cartões vieram da tela de resultado e ainda não existem no
  // banco. Nada é gravado, e a tela diz isso em vez de fingir que agendou algo.
  const isPractice = Array.isArray(draftCards) && draftCards.length > 0;

  // Com `contentId`, a sessão é sobre um material específico e traz todos os
  // seus cartões — vencidos ou não. Sem ele, é a revisão do dia: só o que já
  // venceu, de todos os materiais.
  const { contentId } = useParams<{ contentId?: string }>();

  const queue = useAsync<Flashcard[]>(
    useCallback(() => {
      if (isPractice) return Promise.resolve([]);
      if (contentId) return getContentCards(contentId);
      return getStudyQueue({ limit: 30 });
    }, [isPractice, contentId]),
    [isPractice, contentId],
  );

  const cards: StudyCard[] = isPractice ? (draftCards ?? []) : (queue.data ?? []);

  /**
   * Para onde o voltar leva. Estudando um material, leva de volta a ele; na
   * revisão do dia, ao início. Nunca `navigate(-1)`: o histórico depende do
   * caminho percorrido e mandava a pessoa para telas sem relação nenhuma.
   */
  const backTo = contentId ? `/content/${contentId}` : "/";

  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [tally, setTally] = useState<Tally>(EMPTY_TALLY);
  const [finished, setFinished] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [lastInterval, setLastInterval] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // A sessão abre uma vez, quando há o que estudar. Abrir na montagem criaria
  // sessões vazias toda vez que alguém entrasse na tela sem cartão vencido.
  useEffect(() => {
    if (isPractice || sessionId || cards.length === 0 || finished) return;

    let active = true;
    startStudySession()
      .then((session) => {
        if (active) setSessionId(session.id);
      })
      .catch(() => {
        // Sem sessão as revisões ainda são gravadas, só não ficam agrupadas.
        // Interromper o estudo por causa disso seria desproporcional.
      });

    return () => {
      active = false;
    };
  }, [isPractice, sessionId, cards.length, finished]);

  const studyTitle = isPractice
    ? (title ?? "Praticar")
    : contentId
      ? "Estudar material"
      : "Revisão do dia";

  const total = cards.length;
  const current = cards[index];

  async function handleRate(rating: ReviewRating) {
    if (!current || saving) return;

    setSaveError(null);
    const nextTally = { ...tally, [rating]: tally[rating as keyof Tally] + 1 };

    if (isPersisted(current)) {
      setSaving(true);
      try {
        const updated = await recordReview({
          flashcardId: current.id,
          rating,
          ...(sessionId ? { sessionId } : {}),
        });
        setLastInterval(updated.intervalDays);
      } catch {
        // A avaliação não chegou ao servidor. Avançar assim mesmo perderia o
        // dado em silêncio; parar aqui deixa o usuário decidir.
        setSaveError("Não consegui registrar esta resposta. Verifique a conexão e tente de novo.");
        setSaving(false);
        return;
      }
      setSaving(false);
    }

    setTally(nextTally);

    if (index + 1 >= total) {
      setFinished(true);
      return;
    }

    setIndex((value) => value + 1);
    setFlipped(false);
  }

  function handleRestart() {
    setIndex(0);
    setFlipped(false);
    setTally(EMPTY_TALLY);
    setFinished(false);
    setSessionId(null);
    setLastInterval(null);
    if (!isPractice) queue.reload();
  }

  // ─── Carregando ──────────────────────────────────────────────────────────
  if (!isPractice && queue.status === "loading" && !queue.data) {
    return (
      <Shell title="Revisão" backTo={backTo}>
        <div className="flex flex-col gap-4 pt-4">
          <Skeleton className="h-2 rounded-full" />
          <Skeleton className="h-[clamp(15rem,44vh,21rem)] rounded-2xl" />
        </div>
      </Shell>
    );
  }

  if (!isPractice && queue.status === "error") {
    return (
      <Shell title="Revisão" backTo={backTo}>
        <EmptyState
          className="animate-rise-in"
          icon={<RefreshCcw size={26} />}
          title="Não consegui carregar sua revisão"
          description={queue.error ?? undefined}
          action={<Button onClick={queue.reload}>Tentar novamente</Button>}
        />
      </Shell>
    );
  }

  // ─── Nada a estudar ──────────────────────────────────────────────────────
  if (total === 0 || !current) {
    return (
      <Shell title="Revisão" backTo={backTo}>
        <EmptyState
          className="animate-rise-in"
          icon={<Check size={26} />}
          title={contentId ? "Este material não tem cartões" : "Nada para revisar agora"}
          description={
            contentId
              ? "Escaneie o material de novo pedindo flashcards para poder estudá-lo assim."
              : "Os cartões voltam sozinhos no dia em que a memória estiver prestes a falhar. Enquanto isso, escaneie um material novo."
          }
          action={
            <div className="flex flex-col gap-2">
              <Button onClick={() => void navigate("/camera")}>Escanear material</Button>
              <Button variant="ghost" onClick={() => void navigate("/")}>
                Voltar ao início
              </Button>
            </div>
          }
        />
      </Shell>
    );
  }

  // ─── Resumo ──────────────────────────────────────────────────────────────
  if (finished) {
    return (
      <SessionSummaryView
        tally={tally}
        total={total}
        isPractice={isPractice}
        sessionId={sessionId}
        onRestart={handleRestart}
        contentId={contentId}
        onLeave={() => void navigate(backTo)}
      />
    );
  }

  // ─── Estudo ──────────────────────────────────────────────────────────────
  return (
    <Shell title={studyTitle} backTo={backTo}>
      <div className="pt-4">
        <Progress value={index} max={total} label={`Cartão ${index + 1} de ${total}`} />

        {isPersisted(current) && (
          <div className="mt-2 flex items-center justify-center gap-2">
            <p className="truncate text-xs text-text-subtle">{current.content.title}</p>
            <SummaryPeek contentId={current.content.id} />
          </div>
        )}
        {isPractice && (
          <p className="mt-2 text-center text-xs text-text-subtle">
            Prática livre — salve o material para que os cartões voltem no tempo certo.
          </p>
        )}
      </div>

      <div className="flex flex-1 flex-col justify-center py-6">
        {/*
          O cartão inteiro é o alvo de virada, e por isso é um `button` de
          verdade: Enter e Espaço já funcionam, o foco já é visível e o estado
          aberto/fechado é anunciado por `aria-pressed`. A face escondida sai da
          árvore de acessibilidade — de outro modo o leitor de tela leria a
          resposta enquanto a pessoa ainda olha a pergunta.
        */}
        <button
          type="button"
          onClick={() => setFlipped((value) => !value)}
          aria-pressed={flipped}
          className="flashcard-scene block h-[clamp(15rem,44vh,21rem)] w-full rounded-2xl"
        >
          <span className="sr-only">
            {flipped ? "Voltar para a pergunta" : "Mostrar a resposta"}
          </span>

          <span className="flashcard-inner block" aria-live="polite">
            <span
              className="flashcard-face flex flex-col items-center justify-center gap-4 overflow-y-auto rounded-2xl border border-accent/30 bg-accent p-6 text-center text-accent-contrast shadow-accent"
              data-face="front"
              aria-hidden={flipped}
            >
              <span className="rounded-full border border-accent-contrast/25 px-2.5 py-0.5 text-2xs font-semibold tracking-wide uppercase">
                Pergunta
              </span>
              <span className="text-lg leading-relaxed font-semibold">{current.question}</span>
              <span className="text-xs opacity-80" aria-hidden="true">
                Toque para ver a resposta
              </span>
            </span>

            <span
              className="flashcard-face flex flex-col items-center justify-center gap-4 overflow-y-auto rounded-2xl border border-border bg-surface-raised p-6 text-center shadow-lg"
              data-face="back"
              aria-hidden={!flipped}
            >
              <Badge tone="accent">Resposta</Badge>
              <span className="text-base leading-relaxed text-text">{current.answer}</span>
              <span className="text-xs text-text-subtle" aria-hidden="true">
                Toque para ver a pergunta
              </span>
            </span>
          </span>
        </button>

        {/* A leitura em voz alta acompanha a face visível. Fora do botão de
            virar, porque um botão não pode conter outro. */}
        <div className="mt-4 flex justify-center">
          <TTSButton
            text={flipped ? current.answer : current.question}
            label={flipped ? "resposta do cartão" : "pergunta do cartão"}
          />
        </div>

        {lastInterval !== null && !flipped && index > 0 && (
          <p className="mt-2 text-center text-xs text-text-subtle" aria-live="polite">
            Cartão anterior {nextReviewLabel(lastInterval)}.
          </p>
        )}
      </div>

      {flipped && (
        <div className="animate-rise-in pb-6">
          {saveError && (
            <p
              role="alert"
              className="mb-3 rounded-xl border border-danger/30 bg-danger-subtle px-4 py-3 text-sm text-danger"
            >
              {saveError}
            </p>
          )}

          <p className="mb-3 text-center text-sm font-medium text-text">Como você se saiu?</p>

          <div className="grid grid-cols-3 gap-3">
            {CHOICES.map(({ rating, label, ariaLabel, Icon, surface }) => (
              <button
                key={rating}
                type="button"
                disabled={saving}
                onClick={() => void handleRate(rating)}
                aria-label={ariaLabel}
                className={cn(
                  "flex min-h-[4rem] flex-col items-center justify-center gap-1.5 rounded-xl border",
                  "text-sm font-semibold transition-[border-color,transform] duration-150",
                  "active:scale-95 disabled:opacity-50 disabled:active:scale-100",
                  surface,
                )}
              >
                <Icon size={20} aria-hidden="true" />
                <span>{label}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </Shell>
  );
}

/**
 * `backTo` é explícito de propósito.
 *
 * Antes o voltar era sempre `navigate(-1)`, o que depende de como a pessoa
 * chegou aqui. Quem abre a revisão a partir de um material espera voltar para
 * aquele material — e o histórico podia mandá-la para a busca, para a pasta ou
 * para lugar nenhum, dependendo do caminho percorrido.
 */
function Shell({
  title,
  backTo,
  children,
}: {
  title: string;
  backTo?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-dvh flex-col bg-bg">
      <Navbar title={title} showBack backTo={backTo} />
      <main
        id="main-content"
        className="mx-auto flex w-full max-w-lg flex-1 flex-col px-4 pb-[calc(1rem+env(safe-area-inset-bottom))]"
      >
        {children}
      </main>
    </div>
  );
}

function SessionSummaryView({
  tally,
  total,
  isPractice,
  sessionId,
  contentId,
  onRestart,
  onLeave,
}: {
  tally: Tally;
  total: number;
  isPractice: boolean;
  sessionId: string | null;
  onRestart: () => void;
  contentId?: string;
  onLeave: () => void;
}) {
  const remembered = tally.HARD + tally.GOOD;
  const accuracy = total === 0 ? 0 : Math.round((remembered / total) * 100);
  const grade = gradeFor(accuracy);

  // Fecha a sessão no servidor. O placar exibido é o local — já está correto e
  // esperar a resposta só atrasaria a tela; a chamada existe para que a sessão
  // não fique aberta para sempre no banco.
  useEffect(() => {
    if (!sessionId) return;
    void finishStudySession(sessionId).catch(() => undefined);
  }, [sessionId]);

  const summaryText = `Sessão concluída. Você lembrou ${remembered} de ${total} cartões, ${accuracy} por cento. ${grade.text}`;

  return (
    <Shell title="Resultado" backTo={contentId ? `/content/${contentId}` : "/"}>
      <div className="flex flex-1 flex-col justify-center py-8">
        <div className="animate-rise-in text-center">
          <span
            className={cn(
              "mx-auto grid size-20 animate-scale-in place-items-center rounded-full",
              grade.halo,
            )}
            aria-hidden="true"
          >
            <grade.Icon size={34} />
          </span>

          <h1 className="mt-6 text-2xl font-bold text-text">{grade.text}</h1>
          <p className="mt-1 text-sm text-text-muted">
            {isPractice
              ? "Prática concluída. Salve o material para acompanhar sua evolução."
              : "Os cartões voltam sozinhos no dia certo."}
          </p>
        </div>

        <Card padding="lg" className="mt-7 flex items-center gap-5">
          <Ring
            value={accuracy}
            label="Acerto na sessão"
            caption="acerto"
            size={92}
            tone={accuracy >= 60 ? "success" : "accent"}
          />
          <div className="min-w-0 flex-1">
            <p className="text-sm text-text">
              <span className="font-semibold tabular-nums">{remembered}</span> de{" "}
              <span className="tabular-nums">{total}</span> cartões lembrados
            </p>
            <div className="mt-2 flex justify-center">
              <TTSButton text={summaryText} label="resultado da sessão" />
            </div>
          </div>
        </Card>

        <ul className="mt-3 grid grid-cols-3 gap-2" aria-label="Detalhamento das respostas">
          {CHOICES.map(({ rating, label, Icon, surface }) => (
            <li
              key={rating}
              className={cn(
                "flex flex-col items-center gap-1 rounded-xl border px-2 py-3",
                surface,
              )}
            >
              <Icon size={16} aria-hidden="true" />
              <span className="text-2xl leading-none font-bold tabular-nums">{tally[rating]}</span>
              <span className="text-xs font-medium">{label}</span>
            </li>
          ))}
        </ul>

        <div className="mt-8 flex flex-col gap-3">
          <Button fullWidth size="lg" icon={<RotateCcw size={18} />} onClick={onRestart}>
            {isPractice ? "Praticar de novo" : "Continuar revisando"}
          </Button>
          {/* O rótulo diz o destino real. "Voltar ao início" depois de estudar
              um material específico era mentira: a pessoa quer voltar para o
              material, e era para lá que ela precisava de um caminho. */}
          <Button
            variant="secondary"
            fullWidth
            size="lg"
            icon={contentId ? <ArrowLeft size={18} /> : <Home size={18} />}
            onClick={onLeave}
          >
            {contentId ? "Voltar ao material" : "Voltar ao início"}
          </Button>
        </div>
      </div>
    </Shell>
  );
}
