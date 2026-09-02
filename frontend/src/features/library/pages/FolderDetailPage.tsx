import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { BookOpen, Camera, CalendarDays, FileText, Trash2 } from "lucide-react";
import { deleteContent, getContents } from "@/api";
import type { Content } from "@/api";
import { Card, EmptyState, SkeletonList, cn } from "@/design-system";
import { Navbar } from "@/shared/components/Navbar";
import { BottomNav } from "@/shared/components/BottomNav";
import { TTSButton } from "@/shared/components/TTSButton";
import { ToastContainer, useToast } from "@/shared/components/Toast";

/**
 * Link com a aparência do botão primário.
 *
 * `Button` renderiza um `<button>`, e navegar exige uma âncora de verdade —
 * sem ela não há abrir em nova aba, nem menu de contexto, nem endereço na barra
 * de status. Daí repetir as classes em vez de forçar o primitivo.
 */
const LINK_AS_BUTTON = cn(
  "inline-flex min-h-[2.75rem] items-center justify-center gap-2 rounded-lg px-5 py-2.5",
  "bg-accent font-semibold text-accent-contrast shadow-accent",
  "transition-colors duration-150 ease-enter hover:bg-accent-hover",
);

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
  }, [id, addToast]);

  useEffect(() => {
    void loadContents();
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

  const subtitle = loading
    ? "Carregando…"
    : contents.length === 0
      ? "Nada salvo aqui por enquanto"
      : `${contents.length} ${contents.length === 1 ? "conteúdo" : "conteúdos"}`;

  return (
    <div className="flex min-h-dvh flex-col bg-bg">
      <Navbar title="Pasta" showBack backTo="/folders" />
      <ToastContainer toasts={toasts} onClose={removeToast} />

      <main id="main-content" className="mx-auto w-full max-w-2xl flex-1 px-4 pt-4 pb-28">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-text">Conteúdos da pasta</h1>
          <p className="mt-1 text-sm text-text-muted">{subtitle}</p>
        </div>

        {loading ? (
          <SkeletonList count={3} />
        ) : contents.length === 0 ? (
          <div role="status">
            <Card padding="none" className="animate-rise-in border-dashed">
              <EmptyState
                icon={<FileText size={26} />}
                title="Pasta vazia"
                description="Fotografe uma lousa, um caderno ou um livro e o material organizado aparece aqui."
                action={
                  <Link to="/camera" className={LINK_AS_BUTTON}>
                    <Camera size={18} aria-hidden="true" />
                    Escanear material
                  </Link>
                }
              />
            </Card>
          </div>
        ) : (
          <ul className="flex animate-rise-in flex-col gap-3" aria-label="Conteúdos da pasta">
            {contents.map((content) => (
              <li key={content.id}>
                <Card padding="none" interactive className="overflow-hidden">
                  <Link
                    to={`/content/${content.id}`}
                    className="block p-4 transition-colors duration-150 hover:bg-surface-sunken"
                    aria-label={`Ver conteúdo: ${content.title}`}
                  >
                    <div className="flex items-start gap-3">
                      <span
                        className="mt-0.5 grid size-11 shrink-0 place-items-center rounded-xl bg-accent-subtle text-accent"
                        aria-hidden="true"
                      >
                        <BookOpen size={20} />
                      </span>

                      <div className="min-w-0 flex-1">
                        <h2 className="truncate text-base font-semibold text-text">
                          {content.title}
                        </h2>

                        <p className="mt-1 line-clamp-2 text-sm text-text-muted">
                          {content.summary}
                        </p>

                        <span className="mt-2 inline-flex items-center gap-1.5 text-xs text-text-subtle">
                          <CalendarDays size={13} aria-hidden="true" />
                          {formatDate(content.createdAt)}
                        </span>
                      </div>
                    </div>
                  </Link>

                  <div className="flex items-center gap-1 border-t border-border px-2 py-1">
                    <TTSButton text={content.title} label={`conteúdo ${content.title}`} />

                    <button
                      type="button"
                      onClick={() => void handleDelete(content.id, content.title)}
                      disabled={deletingId === content.id}
                      aria-label={`Remover ${content.title}`}
                      className={cn(
                        "ml-auto grid size-11 shrink-0 place-items-center rounded-lg",
                        "text-danger transition-colors duration-150",
                        "hover:bg-danger-subtle disabled:opacity-50",
                      )}
                    >
                      {deletingId === content.id ? (
                        <span
                          className="size-4 animate-spin rounded-full border-2 border-current border-t-transparent"
                          aria-hidden="true"
                        />
                      ) : (
                        <Trash2 size={16} aria-hidden="true" />
                      )}
                    </button>
                  </div>
                </Card>
              </li>
            ))}
          </ul>
        )}
      </main>

      <BottomNav />
    </div>
  );
}
