import { useState, useEffect, useCallback } from "react";
import { useParams, Link } from "react-router-dom";
import { FileText, Trash2, BookOpen } from "lucide-react";
import { getContents, deleteContent } from "../services/api";
import type { Content } from "../services/api";
import { Navbar } from "../components/Navbar";
import { BottomNav } from "../components/BottomNav";
import { TTSButton } from "../components/TTSButton";
import { useToast, ToastContainer } from "../components/Toast";
import { SkeletonList } from "../components/SkeletonCard";

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function FolderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [contents, setContents] = useState<Content[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const { toasts, addToast, removeToast } = useToast();

  const loadContents = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const data = await getContents(id);
      setContents(data);
    } catch {
      addToast("error", "Erro ao carregar conteúdos.");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadContents();
  }, [loadContents]);

  async function handleDelete(contentId: string, title: string) {
    setDeletingId(contentId);
    try {
      await deleteContent(contentId);
      setContents((prev) => prev.filter((c) => c.id !== contentId));
      addToast("info", `"${title}" removido.`);
    } catch {
      addToast("error", "Erro ao remover conteúdo.");
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ backgroundColor: "var(--color-background)" }}
    >
      <Navbar title="Pasta" showBack backTo="/folders" />
      <ToastContainer toasts={toasts} onClose={removeToast} />

      <main className="flex-1 px-4 pt-4 pb-24 max-w-2xl mx-auto w-full" id="main-content">
        {loading ? (
          <SkeletonList count={3} />
        ) : contents.length === 0 ? (
          <div className="text-center py-16" role="status">
            <FileText
              size={48}
              className="mx-auto mb-3"
              style={{ color: "var(--color-text-muted)" }}
              aria-hidden="true"
            />
            <p className="text-white mb-1" style={{ fontSize: "var(--text-base)" }}>
              Pasta vazia
            </p>
            <p
              className="mb-6"
              style={{ color: "var(--color-text-muted)", fontSize: "var(--text-sm)" }}
            >
              Salve conteúdos escaneados nesta pasta
            </p>
            <Link
              to="/camera"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-white font-medium transition-colors hover:opacity-90"
              style={{ backgroundColor: "var(--color-codecam)", fontSize: "var(--text-sm)" }}
            >
              Escanear material
            </Link>
          </div>
        ) : (
          <ul className="flex flex-col gap-3" aria-label="Conteúdos da pasta">
            {contents.map((content) => (
              <li
                key={content.id}
                className="rounded-2xl overflow-hidden"
                style={{ backgroundColor: "var(--color-surface)" }}
              >
                <Link
                  to={`/content/${content.id}`}
                  className="block p-4 transition-colors hover:bg-surface-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-codecam"
                  aria-label={`Ver conteúdo: ${content.title}`}
                >
                  <div className="flex items-start gap-3">
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5"
                      style={{ backgroundColor: "var(--color-codecam)" + "20" }}
                      aria-hidden="true"
                    >
                      <BookOpen size={18} style={{ color: "var(--color-codecam)" }} aria-hidden="true" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h2
                        className="font-semibold text-white truncate mb-1"
                        style={{ fontSize: "var(--text-base)" }}
                      >
                        {content.title}
                      </h2>
                      <p
                        className="line-clamp-2 mb-1"
                        style={{ color: "var(--color-text-muted)", fontSize: "var(--text-sm)", lineHeight: "1.5" }}
                      >
                        {content.summary}
                      </p>
                      <span
                        style={{ color: "var(--color-text-muted)", fontSize: "var(--text-xs)" }}
                      >
                        {formatDate(content.createdAt)}
                      </span>
                    </div>
                  </div>
                </Link>
                <div
                  className="flex items-center justify-between px-4 py-2"
                  style={{ borderTop: "1px solid var(--color-border)" }}
                >
                  <TTSButton text={content.title} label={`conteúdo ${content.title}`} size={14} />
                  <button
                    onClick={() => handleDelete(content.id, content.title)}
                    disabled={deletingId === content.id}
                    aria-label={`Remover ${content.title}`}
                    className="w-8 h-8 flex items-center justify-center rounded-lg transition-colors hover:bg-error/20"
                    style={{ color: "var(--color-error)" }}
                  >
                    {deletingId === content.id ? (
                      <span className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <Trash2 size={14} aria-hidden="true" />
                    )}
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </main>

      <BottomNav />
    </div>
  );
}
