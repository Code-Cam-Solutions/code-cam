import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { BookOpen, ListChecks, Layers, Play, ChevronDown, ChevronUp } from "lucide-react";
import { getContent } from "../services/api";
import type { Content } from "../services/api";
import { Navbar } from "../components/Navbar";
import { BottomNav } from "../components/BottomNav";
import { TTSButton } from "../components/TTSButton";
import { Button } from "../components/Button";
import { SkeletonList } from "../components/SkeletonCard";

export function ContentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [content, setContent] = useState<Content | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showRawText, setShowRawText] = useState(false);

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
      <div className="min-h-screen" style={{ backgroundColor: "var(--color-background)" }}>
        <Navbar title="Conteúdo" showBack />
        <div className="px-4 pt-4">
          <SkeletonList count={3} />
        </div>
      </div>
    );
  }

  if (error || !content) {
    return (
      <div
        className="min-h-screen flex flex-col items-center justify-center px-6 text-center"
        style={{ backgroundColor: "var(--color-background)" }}
        role="alert"
      >
        <p className="text-white mb-4">{error || "Conteúdo não encontrado."}</p>
        <Button onClick={() => navigate(-1)}>Voltar</Button>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ backgroundColor: "var(--color-background)" }}
    >
      <Navbar title="Conteúdo" showBack />

      <main className="flex-1 px-4 pt-4 pb-24 max-w-2xl mx-auto w-full" id="main-content">
        {/* Title */}
        <section
          className="mb-4 p-4 rounded-2xl"
          style={{ backgroundColor: "var(--color-surface)" }}
          aria-labelledby="content-title"
        >
          <div className="flex items-start justify-between gap-2">
            <h1
              id="content-title"
              className="font-bold text-white flex-1"
              style={{ fontSize: "var(--text-xl)" }}
            >
              {content.title}
            </h1>
            <TTSButton text={content.title} label="título" />
          </div>
          <p
            className="mt-1"
            style={{ color: "var(--color-text-muted)", fontSize: "var(--text-xs)" }}
          >
            {new Date(content.createdAt).toLocaleDateString("pt-BR", {
              day: "2-digit",
              month: "long",
              year: "numeric",
            })}
          </p>
        </section>

        {/* Summary */}
        <section
          className="mb-4 p-4 rounded-2xl"
          style={{ backgroundColor: "var(--color-surface)" }}
          aria-labelledby="content-summary"
        >
          <div className="flex items-center justify-between gap-2 mb-3">
            <div className="flex items-center gap-2">
              <BookOpen size={18} style={{ color: "var(--color-codecam)" }} aria-hidden="true" />
              <h2
                id="content-summary"
                className="font-semibold text-white"
                style={{ fontSize: "var(--text-base)" }}
              >
                Resumo
              </h2>
            </div>
            <TTSButton text={content.summary} label="resumo" />
          </div>
          <p
            className="text-white"
            style={{ fontSize: "var(--text-sm)", lineHeight: "1.7" }}
          >
            {content.summary}
          </p>
        </section>

        {/* Topics */}
        <section
          className="mb-4 p-4 rounded-2xl"
          style={{ backgroundColor: "var(--color-surface)" }}
          aria-labelledby="content-topics"
        >
          <div className="flex items-center gap-2 mb-3">
            <ListChecks size={18} style={{ color: "var(--color-codecam)" }} aria-hidden="true" />
            <h2
              id="content-topics"
              className="font-semibold text-white"
              style={{ fontSize: "var(--text-base)" }}
            >
              Tópicos
            </h2>
          </div>
          <ul className="flex flex-col gap-2">
            {content.topics.map((topic, i) => (
              <li
                key={i}
                className="flex items-center justify-between gap-2 p-2 rounded-lg"
                style={{ backgroundColor: "var(--color-surface-2)" }}
              >
                <div className="flex items-center gap-2">
                  <div
                    className="w-2 h-2 rounded-full flex-shrink-0"
                    style={{ backgroundColor: "var(--color-codecam)" }}
                    aria-hidden="true"
                  />
                  <span className="text-white" style={{ fontSize: "var(--text-sm)" }}>
                    {topic}
                  </span>
                </div>
                <TTSButton text={topic} label={`tópico ${i + 1}`} size={14} />
              </li>
            ))}
          </ul>
        </section>

        {/* Flashcards */}
        {content.flashcards?.length > 0 && (
          <section
            className="mb-4 p-4 rounded-2xl"
            style={{ backgroundColor: "var(--color-surface)" }}
            aria-labelledby="content-flashcards"
          >
            <div className="flex items-center gap-2 mb-3">
              <Layers size={18} style={{ color: "var(--color-codecam)" }} aria-hidden="true" />
              <h2
                id="content-flashcards"
                className="font-semibold text-white"
                style={{ fontSize: "var(--text-base)" }}
              >
                Flashcards ({content.flashcards.length})
              </h2>
            </div>
            <Button
              fullWidth
              icon={<Play size={18} aria-hidden="true" />}
              onClick={() =>
                navigate("/flashcards", { state: { flashcards: content.flashcards } })
              }
              aria-label={`Iniciar sessão com ${content.flashcards.length} flashcards`}
            >
              Iniciar flashcards
            </Button>
          </section>
        )}

        {/* Raw text */}
        <section
          className="mb-4 rounded-2xl overflow-hidden"
          style={{ backgroundColor: "var(--color-surface)" }}
        >
          <button
            onClick={() => setShowRawText((v) => !v)}
            className="flex items-center justify-between w-full p-4 transition-colors hover:bg-surface-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-codecam"
            aria-expanded={showRawText}
            aria-controls="raw-text-saved"
          >
            <span className="font-semibold text-white" style={{ fontSize: "var(--text-base)" }}>
              Texto extraído
            </span>
            {showRawText ? (
              <ChevronUp size={18} style={{ color: "var(--color-text-muted)" }} aria-hidden="true" />
            ) : (
              <ChevronDown size={18} style={{ color: "var(--color-text-muted)" }} aria-hidden="true" />
            )}
          </button>
          {showRawText && (
            <div
              id="raw-text-saved"
              className="px-4 pb-4"
              style={{ borderTop: "1px solid var(--color-border)" }}
            >
              <div className="flex justify-end mb-2 pt-3">
                <TTSButton text={content.rawText} label="texto extraído" />
              </div>
              <p
                className="text-white whitespace-pre-wrap"
                style={{ fontSize: "var(--text-sm)", lineHeight: "1.7" }}
              >
                {content.rawText}
              </p>
            </div>
          )}
        </section>
      </main>

      <BottomNav />
    </div>
  );
}
