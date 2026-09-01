import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { RotateCcw, ChevronRight } from "lucide-react";
import { Navbar } from "../components/Navbar";
import { TTSButton } from "../components/TTSButton";
import { Button } from "../components/Button";

type Score = "correct" | "almost" | "wrong";

interface Flashcard {
  question: string;
  answer: string;
}

interface FlashcardResult {
  card: Flashcard;
  score: Score;
}

export function FlashcardsPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const flashcards: Flashcard[] = location.state?.flashcards || [];

  const [currentIndex, setCurrentIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [results, setResults] = useState<FlashcardResult[]>([]);
  const [finished, setFinished] = useState(false);

  const current = flashcards[currentIndex];
  const total = flashcards.length;

  if (total === 0) {
    return (
      <div
        className="min-h-screen flex flex-col items-center justify-center px-6 text-center"
        style={{ backgroundColor: "var(--color-background)" }}
      >
        <p className="text-white mb-4">Nenhum flashcard disponível.</p>
        <Button onClick={() => navigate(-1)}>Voltar</Button>
      </div>
    );
  }

  function handleFlip() {
    setFlipped((v) => !v);
  }

  function handleScore(score: Score) {
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

  function getGrade() {
    if (scorePercent >= 80) return { emoji: "🎉", text: "Excelente!", color: "var(--color-success)" };
    if (scorePercent >= 60) return { emoji: "👍", text: "Bom trabalho!", color: "var(--color-codecam)" };
    if (scorePercent >= 40) return { emoji: "📚", text: "Continue praticando!", color: "var(--color-warning)" };
    return { emoji: "💪", text: "Não desista, tente novamente!", color: "var(--color-error)" };
  }

  if (finished) {
    const grade = getGrade();
    const summaryText = `Você terminou a sessão. Acertou ${scoreCount.correct} de ${total} flashcards. ${grade.text}`;

    return (
      <div
        className="min-h-screen flex flex-col"
        style={{ backgroundColor: "var(--color-background)" }}
      >
        <Navbar title="Resultado" showBack />
        <main
          className="flex-1 flex flex-col items-center justify-center px-6 pb-8"
          id="main-content"
        >
          <div className="w-full max-w-sm text-center animate-fade-in">
            <div className="text-6xl mb-4" aria-hidden="true">{grade.emoji}</div>

            <div className="flex items-center justify-center gap-2 mb-2">
              <h1
                className="font-bold text-white"
                style={{ fontSize: "var(--text-3xl)", color: grade.color }}
              >
                {scoreCount.correct}/{total}
              </h1>
              <TTSButton text={summaryText} label="resultado final" />
            </div>

            <p
              className="font-semibold mb-1"
              style={{ color: grade.color, fontSize: "var(--text-xl)" }}
            >
              {grade.text}
            </p>
            <p
              className="mb-8"
              style={{ color: "var(--color-text-muted)", fontSize: "var(--text-base)" }}
            >
              {scorePercent}% de acerto
            </p>

            {/* Score breakdown */}
            <div
              className="flex justify-around p-4 rounded-2xl mb-8"
              style={{ backgroundColor: "var(--color-surface)" }}
              aria-label="Detalhamento da pontuação"
            >
              <div className="text-center">
                <div className="text-2xl font-bold" style={{ color: "var(--color-success)" }}>
                  {scoreCount.correct}
                </div>
                <div style={{ color: "var(--color-text-muted)", fontSize: "var(--text-xs)" }}>
                  Acertei
                </div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold" style={{ color: "var(--color-warning)" }}>
                  {scoreCount.almost}
                </div>
                <div style={{ color: "var(--color-text-muted)", fontSize: "var(--text-xs)" }}>
                  Quase
                </div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold" style={{ color: "var(--color-error)" }}>
                  {scoreCount.wrong}
                </div>
                <div style={{ color: "var(--color-text-muted)", fontSize: "var(--text-xs)" }}>
                  Errei
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-3">
              <Button
                fullWidth
                size="lg"
                icon={<RotateCcw size={18} aria-hidden="true" />}
                onClick={handleRestart}
                aria-label="Reiniciar sessão de flashcards"
              >
                Reiniciar sessão
              </Button>
              <Button
                variant="secondary"
                fullWidth
                size="lg"
                onClick={() => navigate(-1)}
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

  // Active flashcard
  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ backgroundColor: "var(--color-background)" }}
    >
      <Navbar title="Flashcards" showBack />

      <main className="flex-1 flex flex-col px-4 pt-4 pb-8 max-w-lg mx-auto w-full" id="main-content">
        {/* Progress */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <span
              style={{ color: "var(--color-text-muted)", fontSize: "var(--text-sm)" }}
              aria-label={`Card ${currentIndex + 1} de ${total}`}
            >
              {currentIndex + 1} / {total}
            </span>
            <span style={{ color: "var(--color-text-muted)", fontSize: "var(--text-sm)" }}>
              {Math.round(((currentIndex) / total) * 100)}%
            </span>
          </div>
          <div
            className="w-full h-2 rounded-full overflow-hidden"
            style={{ backgroundColor: "var(--color-surface-2)" }}
            role="progressbar"
            aria-valuenow={currentIndex}
            aria-valuemin={0}
            aria-valuemax={total}
            aria-label={`Progresso: ${currentIndex} de ${total} cards`}
          >
            <div
              className="h-full rounded-full transition-all duration-300"
              style={{
                width: `${(currentIndex / total) * 100}%`,
                backgroundColor: "var(--color-codecam)",
              }}
            />
          </div>
        </div>

        {/* Flashcard */}
        <div className="flex-1 flex flex-col justify-center mb-6">
          <div
            className="flashcard-container w-full"
            style={{ height: "280px" }}
          >
            <div
              className={`flashcard-inner ${flipped ? "flipped" : ""}`}
              aria-live="polite"
            >
              {/* Front - Question */}
              <div
                className="flashcard-front flex flex-col items-center justify-center p-6 rounded-2xl"
                style={{ backgroundColor: "var(--color-surface)" }}
              >
                <div
                  className="text-xs font-semibold uppercase tracking-wider mb-4 px-3 py-1 rounded-full"
                  style={{
                    color: "var(--color-codecam)",
                    backgroundColor: "var(--color-codecam)" + "20",
                    fontSize: "var(--text-xs)",
                  }}
                  aria-hidden="true"
                >
                  Pergunta
                </div>
                <p
                  className="text-white text-center font-medium"
                  style={{ fontSize: "var(--text-lg)", lineHeight: "1.6" }}
                >
                  {current.question}
                </p>
                <div className="mt-4">
                  <TTSButton text={current.question} label="pergunta do flashcard" />
                </div>
              </div>

              {/* Back - Answer */}
              <div
                className="flashcard-back flex flex-col items-center justify-center p-6 rounded-2xl"
                style={{ backgroundColor: "var(--color-codecam)" + "15", border: "1px solid var(--color-codecam)" + "40" }}
              >
                <div
                  className="text-xs font-semibold uppercase tracking-wider mb-4 px-3 py-1 rounded-full"
                  style={{
                    color: "var(--color-codecam-light)",
                    backgroundColor: "var(--color-codecam)" + "20",
                    fontSize: "var(--text-xs)",
                  }}
                  aria-hidden="true"
                >
                  Resposta
                </div>
                <p
                  className="text-white text-center"
                  style={{ fontSize: "var(--text-base)", lineHeight: "1.7" }}
                >
                  {current.answer}
                </p>
                <div className="mt-4">
                  <TTSButton text={current.answer} label="resposta do flashcard" />
                </div>
              </div>
            </div>
          </div>

          {/* Flip button */}
          {!flipped ? (
            <button
              onClick={handleFlip}
              className="mt-4 flex items-center justify-center gap-2 py-3 rounded-xl transition-colors hover:bg-surface-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-codecam"
              style={{
                backgroundColor: "var(--color-surface)",
                color: "var(--color-text-muted)",
                fontSize: "var(--text-sm)",
              }}
              aria-label="Revelar resposta"
            >
              Toque para ver a resposta
              <ChevronRight size={16} aria-hidden="true" />
            </button>
          ) : null}
        </div>

        {/* Self-assessment buttons */}
        {flipped && (
          <div className="flex flex-col gap-3 animate-fade-in">
            <p
              className="text-center font-medium text-white mb-1"
              style={{ fontSize: "var(--text-sm)" }}
            >
              Como você se saiu?
            </p>
            <div className="grid grid-cols-3 gap-3">
              <button
                onClick={() => handleScore("correct")}
                className="flex flex-col items-center gap-1 py-4 px-2 rounded-xl font-semibold transition-all active:scale-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-codecam hover:opacity-90"
                style={{
                  backgroundColor: "var(--color-success)" + "20",
                  border: "1px solid var(--color-success)" + "50",
                  color: "var(--color-success)",
                  fontSize: "var(--text-sm)",
                  minHeight: "64px",
                }}
                aria-label="Acertei este flashcard"
              >
                <span aria-hidden="true">✅</span>
                <span>Acertei</span>
              </button>
              <button
                onClick={() => handleScore("almost")}
                className="flex flex-col items-center gap-1 py-4 px-2 rounded-xl font-semibold transition-all active:scale-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-codecam hover:opacity-90"
                style={{
                  backgroundColor: "var(--color-warning)" + "20",
                  border: "1px solid var(--color-warning)" + "50",
                  color: "var(--color-warning)",
                  fontSize: "var(--text-sm)",
                  minHeight: "64px",
                }}
                aria-label="Quase acertei este flashcard"
              >
                <span aria-hidden="true">〰️</span>
                <span>Quase</span>
              </button>
              <button
                onClick={() => handleScore("wrong")}
                className="flex flex-col items-center gap-1 py-4 px-2 rounded-xl font-semibold transition-all active:scale-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-codecam hover:opacity-90"
                style={{
                  backgroundColor: "var(--color-error)" + "20",
                  border: "1px solid var(--color-error)" + "50",
                  color: "var(--color-error)",
                  fontSize: "var(--text-sm)",
                  minHeight: "64px",
                }}
                aria-label="Errei este flashcard"
              >
                <span aria-hidden="true">❌</span>
                <span>Errei</span>
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
