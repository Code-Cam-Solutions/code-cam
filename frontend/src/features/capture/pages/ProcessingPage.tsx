import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Check, Sparkles } from "lucide-react";
import { scanImages } from "@/api";
import { useRouteState } from "@/shared/lib/navigation";
import { Card, Progress, cn } from "@/design-system";

const STEPS = [
  "Preparando imagem",
  "Analisando com IA",
  "Extraindo conteúdo",
  "Gerando flashcards",
  "Quase pronto!",
] as const;

/** A barra desacelera ao se aproximar deste valor e nunca o ultrapassa. */
const CEILING = 96;
const TICK_MS = 140;

export function ProcessingPage() {
  const navigate = useNavigate();
  const { imageBlobs, formats, thumbnail } = useRouteState<"/processing">();
  const hasFired = useRef(false);
  const [progress, setProgress] = useState(6);
  /** Segundos desde o início, só para escolher a mensagem de espera. */
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    // Guard: if accessed directly without a blob, send back to camera
    if (!imageBlobs || imageBlobs.length === 0) {
      void navigate("/camera", { replace: true });
      return;
    }

    // Prevent StrictMode double-invocation from firing twice
    if (hasFired.current) return;
    hasFired.current = true;

    async function process(blobs: Blob[]) {
      try {
        const result = await scanImages(blobs, formats ?? ["summary", "topics", "flashcards"]);
        await navigate("/result", { state: { result, formats, thumbnail }, replace: true });
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Erro ao processar imagem. Tente novamente.";
        await navigate("/camera", { state: { scanError: message }, replace: true });
      }
    }

    void process(imageBlobs);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  /*
   * A duração real da análise é desconhecida, então o avanço é assintótico:
   * cada tique cobre uma fração do que ainda falta. A barra anda rápido no
   * começo — quando a espera ainda parece longa — e vai freando, sem nunca
   * encostar no fim antes de a resposta chegar e a rota trocar.
   */
  useEffect(() => {
    const id = window.setInterval(() => setElapsed((s) => s + 1), 1000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    const id = window.setInterval(() => {
      setProgress((current) =>
        Math.min(CEILING, current + Math.max(0.3, (CEILING - current) * 0.03)),
      );
    }, TICK_MS);

    return () => {
      window.clearInterval(id);
    };
  }, []);

  const stepIndex = Math.min(
    STEPS.length - 1,
    Math.floor((progress / CEILING) * (STEPS.length - 0.001)),
  );
  const currentStep = STEPS[stepIndex] ?? STEPS[0];

  return (
    <div
      className="flex min-h-dvh flex-col items-center justify-center bg-bg px-4 py-10"
      role="status"
      aria-live="polite"
      aria-label="Processando imagem"
    >
      <div className="w-full max-w-sm animate-fade-in">
        {/* Selo animado */}
        <div className="relative mx-auto grid size-28 place-items-center" aria-hidden="true">
          <span className="absolute inset-0 animate-pulse rounded-full bg-accent-subtle" />
          <span className="absolute inset-1.5 animate-spin rounded-full border-2 border-border border-t-accent" />
          <Sparkles size={34} className="relative text-accent" strokeWidth={1.8} />
        </div>

        <h1 className="mt-8 text-center text-2xl font-bold text-text">Analisando…</h1>
        <p className="mt-2 text-center text-sm text-text-muted">
          A IA está lendo seu material e organizando o conteúdo.
        </p>

        {/*
         * A barra e a lista repetem, em forma visual, o que o texto oculto
         * abaixo anuncia. Deixá-las expostas ao leitor de tela dentro de uma
         * região `live` faria o progresso ser lido a cada tique.
         */}
        <div className="mt-8" aria-hidden="true">
          <Progress value={progress} label={currentStep} />

          <Card elevation="raised" padding="md" className="mt-4">
            <ol className="flex flex-col gap-1">
              {STEPS.map((step, index) => {
                const done = index < stepIndex;
                const current = index === stepIndex;

                return (
                  <li
                    key={step}
                    className={cn(
                      "flex min-h-[2rem] items-center gap-3 rounded-lg px-2 transition-colors duration-200",
                      current && "bg-accent-subtle",
                    )}
                  >
                    <span className="grid size-5 shrink-0 place-items-center">
                      {done ? (
                        <Check size={16} className="text-success" strokeWidth={2.5} />
                      ) : (
                        <span
                          className={cn(
                            "rounded-full transition-all duration-200",
                            current ? "size-2.5 animate-pulse bg-accent" : "size-1.5 bg-border",
                          )}
                        />
                      )}
                    </span>

                    <span
                      className={cn(
                        "text-sm transition-colors duration-200",
                        current && "font-semibold text-text",
                        done && "text-text-muted",
                        !current && !done && "text-text-subtle",
                      )}
                    >
                      {step}
                    </span>
                  </li>
                );
              })}
            </ol>
          </Card>
        </div>

        {/*
          A mensagem muda com o tempo decorrido. "Alguns segundos" era verdade
          com o fornecedor anterior; hoje a análise costuma levar de vinte
          segundos a um minuto, e em dia de fila passa disso. Quem está há um
          minuto olhando a tela precisa saber que isso ainda é normal — do
          contrário desiste e refaz a foto, pagando a espera duas vezes.
        */}
        <p className="mt-6 text-center text-xs text-text-subtle" aria-live="polite">
          {elapsed < 25
            ? "Isso costuma levar menos de um minuto"
            : elapsed < 70
              ? "Ainda analisando — a IA está lendo o texto da imagem"
              : "A fila da IA está cheia agora. Seguimos tentando, não feche a tela."}
        </p>
      </div>

      <p className="sr-only">
        Etapa {stepIndex + 1} de {STEPS.length}: {currentStep}
      </p>
    </div>
  );
}
