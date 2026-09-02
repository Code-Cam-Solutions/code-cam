import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Sparkles } from "lucide-react";
import { scanImage } from "../services/api";
import { useRouteState } from "../types/navigation";

const STEPS = [
  "Preparando imagem...",
  "Analisando com IA...",
  "Extraindo conteúdo...",
  "Gerando flashcards...",
  "Quase pronto!",
];

export function ProcessingPage() {
  const navigate = useNavigate();
  const { imageBlob } = useRouteState<"/processing">();
  const hasFired = useRef(false);

  useEffect(() => {
    // Guard: if accessed directly without a blob, send back to camera
    if (!imageBlob) {
      void navigate("/camera", { replace: true });
      return;
    }

    // Prevent StrictMode double-invocation from firing twice
    if (hasFired.current) return;
    hasFired.current = true;

    async function process(blob: Blob) {
      try {
        const result = await scanImage(blob);
        await navigate("/result", { state: { result }, replace: true });
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Erro ao processar imagem. Tente novamente.";
        await navigate("/camera", { state: { scanError: message }, replace: true });
      }
    }

    void process(imageBlob);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-6"
      style={{ backgroundColor: "var(--color-background)" }}
      role="status"
      aria-live="polite"
      aria-label="Processando imagem"
    >
      <div className="text-center animate-fade-in w-full max-w-xs">
        {/* Animated icon */}
        <div
          className="w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-8 relative"
          style={{ backgroundColor: "var(--color-codecam)" + "15" }}
          aria-hidden="true"
        >
          <div
            className="absolute inset-0 rounded-full animate-ping"
            style={{ backgroundColor: "var(--color-codecam)" + "20" }}
          />
          <Sparkles size={40} style={{ color: "var(--color-codecam)" }} className="relative z-10" />
        </div>

        {/* Spinner */}
        <div
          className="w-10 h-10 border-2 border-t-transparent rounded-full animate-spin mx-auto mb-6"
          style={{ borderColor: "var(--color-codecam)" }}
          aria-hidden="true"
        />

        <h1 className="font-bold text-white mb-3" style={{ fontSize: "var(--text-2xl)" }}>
          Analisando...
        </h1>

        {/* Animated steps */}
        <div className="flex flex-col gap-2 mt-6" aria-hidden="true">
          {STEPS.map((step, i) => (
            <StepItem key={step} text={step} delay={i * 1200} />
          ))}
        </div>

        <p
          className="mt-8"
          style={{ color: "var(--color-text-muted)", fontSize: "var(--text-sm)" }}
        >
          Isso pode levar alguns segundos
        </p>
      </div>
    </div>
  );
}

function StepItem({ text, delay }: { text: string; delay: number }) {
  return (
    <div
      className="flex items-center gap-2 px-4 py-2 rounded-xl opacity-0"
      style={{
        backgroundColor: "var(--color-surface)",
        animation: `fadeIn 0.4s ease forwards`,
        animationDelay: `${delay}ms`,
      }}
    >
      <div
        className="w-1.5 h-1.5 rounded-full flex-shrink-0"
        style={{ backgroundColor: "var(--color-codecam)" }}
      />
      <span className="text-white" style={{ fontSize: "var(--text-sm)" }}>
        {text}
      </span>
    </div>
  );
}
