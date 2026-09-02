import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  BookOpen,
  Check,
  Dumbbell,
  Layers,
  Minus,
  RotateCcw,
  ThumbsUp,
  Trophy,
  X,
} from "lucide-react";
import { Badge, Button, EmptyState, Progress, cn } from "../design-system";
import { Navbar } from "../components/Navbar";
import { TTSButton } from "../components/TTSButton";
import type { Flashcard } from "../services/api";
import { useRouteState } from "../types/navigation";

type Score = "correct" | "almost" | "wrong";

interface FlashcardResult {
  card: Flashcard;
  score: Score;
}

/**
 * As três autoavaliações, em uma tabela só.
 *
 * Botão da sessão e número do resumo compartilham o mesmo tom porque são a
 * mesma coisa vista em dois momentos — o ícone acompanha a cor para que a
 * distinção não dependa de enxergá-la. WCAG 1.4.1.
 */
const SCORES = [
  {
    score: "correct",
    label: "Acertei",
    ariaLabel: "Acertei este flashcard",
    Icon: Check,
    surface: "border-success/30 bg-success-subtle text-success hover:border-success/60",
  },
  {
    score: "almost",
    label: "Quase",
    ariaLabel: "Quase acertei este flashcard",
    Icon: Minus,
    surface: "border-warning/30 bg-warning-subtle text-warning hover:border-warning/60",
  },
  {
    score: "wrong",
    label: "Errei",
    ariaLabel: "Errei este flashcard",
    Icon: X,
    surface: "border-danger/30 bg-danger-subtle text-danger hover:border-danger/60",
  },
] as const;

const GRADES = {
  excellent: {
    Icon: Trophy,
    text: "Excelente!",
    tone: "text-success",
    halo: "bg-success-subtle text-success",
  },
  good: {
    Icon: ThumbsUp,
    text: "Bom trabalho!",
    tone: "text-accent",
    halo: "bg-accent-subtle text-accent",
  },
  fair: {
    Icon: BookOpen,
    text: "Continue praticando!",
    tone: "text-warning",
    halo: "bg-warning-subtle text-warning",
  },
  poor: {
    Icon: Dumbbell,
    text: "Não desista, tente novamente!",
    tone: "text-danger",
    halo: "bg-danger-subtle text-danger",
  },
} as const;

function getGrade(percent: number) {
  if (percent >= 80) return GRADES.excellent;
  if (percent >= 60) return GRADES.good;
  if (percent >= 40) return GRADES.fair;
  return GRADES.poor;
}

export function FlashcardsPage() {
  const navigate = useNavigate();
  const { flashcards = [] } = useRouteState<"/flashcards">();

  const [currentIndex, setCurrentIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [results, setResults] = useState<FlashcardResult[]>([]);
  const [finished, setFinished] = useState(false);

  const current = flashcards[currentIndex];
  const total = flashcards.length;

  if (total === 0 || !current) {
    return (
      <div className="flex min-h-dvh flex-col bg-bg">
        <Navbar title="Flashcards" showBack />
        <main id="main-content" className="flex flex-1 items-center justify-center px-4">
          <EmptyState
            className="animate-rise-in"
            icon={<Layers size={26} />}
            title="Nenhum flashcard disponível."
            description="Escaneie um material ou abra um conteúdo salvo para gerar perguntas de revisão."
            action={<Button onClick={() => void navigate(-1)}>Voltar</Button>}
          />
        </main>
      </div>
    );
  }

  function handleFlip() {
    setFlipped((v) => !v);
  }

  function handleScore(score: Score) {
    if (!current) return;

    const newResults = [...results, { card: current, score }];
    setResults(newResults);

    if (currentIndex + 1 >= total) {
      setFinished(true);
    } else {
      setCurrentIndex((i) => i + 1);
      setFlipped(false);
    }
  }

  function handleRestart() {
    setCurrentIndex(0);
    setFlipped(false);
    setResults([]);
    setFinished(false);
  }

  const scoreCount = {
    correct: results.filter((r) => r.score === "correct").length,
    almost: results.filter((r) => r.score === "almost").length,
    wrong: results.filter((r) => r.score === "wrong").length,
  };

  const scorePercent = Math.round((scoreCount.correct / total) * 100);

  if (finished) {
    const grade = getGrade(scorePercent);
    const summaryText = `Você terminou a sessão. Acertou ${scoreCount.correct} de ${total} flashcards. ${grade.text}`;

    return (
      <div className="flex min-h-dvh flex-col bg-bg">
        <Navbar title="Resultado" showBack />

        <main
          id="main-content"
          className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center px-4 py-8"
        >
          <div className="animate-rise-in">
            <div className="text-center">
              <span
                className={cn(
                  "mx-auto grid size-20 animate-scale-in place-items-center rounded-full",
                  grade.halo,
                )}
                aria-hidden="true"
              >
                <grade.Icon size={34} />
              </span>

              <h1 className="mt-6 text-xs font-semibold tracking-wide text-text-subtle uppercase">
                Sessão concluída
              </h1>

              <div className="mt-2 flex items-center justify-center gap-2">
                <p className={cn("text-4xl font-bold tabular-nums", grade.tone)}>
                  {scoreCount.correct}
                  <span className="text-text-subtle">/{total}</span>
                </p>
                <TTSButton text={summaryText} label="resultado final" />
              </div>

              <p className={cn("mt-2 text-xl font-semibold", grade.tone)}>{grade.text}</p>
            </div>

            {/* O percentual vira o rótulo da barra: um número só, dito uma vez,
                em vez de repetido acima e ao lado dela. */}
            <Progress
              className="mt-7"
              value={scoreCount.correct}
              max={total}
              label={`${scorePercent}% de acerto`}
              tone="success"
            />

            <ul className="mt-6 grid grid-cols-3 gap-2" aria-label="Detalhamento da pontuação">
              {SCORES.map(({ score, label, Icon, surface }) => (
                <li
                  key={score}
                  className={cn(
                    "flex flex-col items-center gap-1 rounded-xl border px-2 py-3",
                    surface,
                  )}
                >
                  <Icon size={16} aria-hidden="true" />
                  <span className="text-2xl leading-none font-bold tabular-nums">
                    {scoreCount[score]}
                  </span>
                  <span className="text-xs font-medium">{label}</span>
                </li>
              ))}
            </ul>

            <div className="mt-8 flex flex-col gap-3">
              <Button
                fullWidth
                size="lg"
                icon={<RotateCcw size={18} />}
                onClick={handleRestart}
                aria-label="Reiniciar sessão de flashcards"
              >
                Reiniciar sessão
              </Button>
              <Button
                variant="secondary"
                fullWidth
                size="lg"
                onClick={() => void navigate(-1)}
                aria-label="Voltar ao resultado"
              >
                Ver resultado
              </Button>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="flex min-h-dvh flex-col bg-bg">
      <Navbar title="Flashcards" showBack />

      <main
        id="main-content"
        className="mx-auto flex w-full max-w-lg flex-1 flex-col px-4 pt-5 pb-8"
      >
        <Progress value={currentIndex} max={total} label={`Card ${currentIndex + 1} de ${total}`} />

        <div className="flex flex-1 flex-col justify-center py-6">
          {/*
            O cartão inteiro é o alvo de virada, e por isso é um `button` de
            verdade: Enter e Espaço já funcionam, o foco já é visível e o estado
            aberto/fechado é anunciado por `aria-pressed`. A face escondida sai
            da árvore de acessibilidade — de outro modo o leitor de tela leria a
            resposta enquanto a pessoa ainda olha a pergunta.
          */}
          <button
            type="button"
            onClick={handleFlip}
            aria-pressed={flipped}
            className="flashcard-scene block h-[clamp(15rem,44vh,21rem)] w-full rounded-2xl"
          >
            <span className="sr-only">
              {flipped ? "Voltar para a pergunta" : "Mostrar a resposta"}
            </span>

            <span className="flashcard-inner block" aria-live="polite">
              <span
                className={cn(
                  "flashcard-face flex flex-col items-center justify-center gap-4 overflow-y-auto",
                  "rounded-2xl border border-border bg-surface p-6 text-center shadow-sm",
                )}
                data-face="front"
                aria-hidden={flipped}
              >
                <Badge tone="accent">Pergunta</Badge>
                <span className="text-lg leading-relaxed font-medium text-text">
                  {current.question}
                </span>
                <span className="text-xs text-text-muted" aria-hidden="true">
                  Toque para ver a resposta
                </span>
              </span>

              <span
                className={cn(
                  "flashcard-face flex flex-col items-center justify-center gap-4 overflow-y-auto",
                  "rounded-2xl border border-accent/25 bg-accent-subtle p-6 text-center shadow-sm",
                )}
                data-face="back"
                aria-hidden={!flipped}
              >
                {/* Selo sólido: sobre a face já tingida de acento, o selo
                    esmaecido do padrão desapareceria no fundo. */}
                <Badge tone="accent" className="border-accent bg-accent text-accent-contrast">
                  Resposta
                </Badge>
                <span className="text-base leading-relaxed text-text">{current.answer}</span>
                <span className="text-xs text-text-muted" aria-hidden="true">
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
              label={flipped ? "resposta do flashcard" : "pergunta do flashcard"}
            />
          </div>
        </div>

        {flipped && (
          <div className="animate-rise-in">
            <p className="mb-3 text-center text-sm font-medium text-text">Como você se saiu?</p>

            <div className="grid grid-cols-3 gap-3">
              {SCORES.map(({ score, label, ariaLabel, Icon, surface }) => (
                <button
                  key={score}
                  type="button"
                  onClick={() => handleScore(score)}
                  aria-label={ariaLabel}
                  className={cn(
                    "flex min-h-[4rem] flex-col items-center justify-center gap-1.5 rounded-xl border",
                    "text-sm font-semibold transition-[border-color,transform] duration-150",
                    "active:scale-95",
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
      </main>
    </div>
  );
}
