import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  BookOpen,
  Camera,
  CalendarDays,
  ChevronRight,
  Layers,
  ListChecks,
  Trash2,
} from "lucide-react";
import { deleteContent, getContents, getFolders, getUnfiledContents } from "@/api";
import type { Content, Folder } from "@/api";
import { Badge, Card, EmptyState, SkeletonList, cn } from "@/design-system";
import { Navbar } from "@/shared/components/Navbar";
import { BottomNav } from "@/shared/components/BottomNav";
import { PageHeader } from "@/shared/components/PageHeader";
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
  });
}

/** Selo redondo tingido com a cor da pasta. */
function FolderMark({ color }: { color: string }) {
  return (
    <span
      className="grid size-12 shrink-0 place-items-center rounded-2xl"
      // A cor da pasta é escolhida pelo usuário e guardada como hex; é o único
      // ponto do app em que a cor não pode vir de token, porque ela é dado.
      style={{ backgroundColor: `${color}22`, color }}
      aria-hidden="true"
    >
      <BookOpen size={22} />
    </span>
  );
}

/**
 * Identificador da pasta virtual que reúne o que não está em pasta nenhuma.
 *
 * Não é uma pasta no banco: é uma visão. Existe porque material salvo sem pasta
 * ficava inalcançável pela navegação — presente no banco e ausente da
 * interface.
 */
export const UNFILED_ID = "sem-pasta";

export function FolderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const isUnfiled = id === UNFILED_ID;
  const [contents, setContents] = useState<Content[]>([]);
  const [folder, setFolder] = useState<Folder | null>(null);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const { toasts, addToast, removeToast } = useToast();

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      // As duas chamadas são independentes: esperar uma para começar a outra
      // dobraria a espera à toa.
      if (isUnfiled) {
        setContents(await getUnfiledContents());
        setFolder(null);
        return;
      }

      const [data, folders] = await Promise.all([getContents(id), getFolders()]);
      setContents(data);
      setFolder(folders.find((f) => f.id === id) ?? null);
    } catch {
      addToast("error", "Não consegui carregar esta pasta.");
    } finally {
      setLoading(false);
    }
  }, [id, isUnfiled, addToast]);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleDelete(contentId: string, title: string) {
    setDeletingId(contentId);
    try {
      await deleteContent(contentId);
      setContents((prev) => prev.filter((c) => c.id !== contentId));
      addToast("info", `"${title}" removido.`);
    } catch {
      addToast("error", "Não consegui remover este material.");
    } finally {
      setDeletingId(null);
    }
  }

  const description = loading
    ? "Carregando…"
    : contents.length === 0
      ? "Nada salvo aqui por enquanto"
      : `${contents.length} ${contents.length === 1 ? "material" : "materiais"}`;

  return (
    <div className="flex min-h-dvh flex-col bg-bg">
      <Navbar showBack backTo="/folders" />
      <ToastContainer toasts={toasts} onClose={removeToast} />

      <main id="main-content" className="mx-auto w-full max-w-2xl flex-1 px-4 pt-4 pb-28">
        {/* O título é o nome da pasta, não "Conteúdos da pasta". A pessoa
            escolheu chamá-la de Biologia; repetir a palavra "pasta" na tela da
            pasta não informa nada que a navegação já não tenha dito. */}
        <PageHeader
          title={isUnfiled ? "Sem pasta" : (folder?.name ?? "Pasta")}
          description={
            isUnfiled && !loading && contents.length > 0
              ? `${description} — escaneados antes de escolher uma pasta`
              : description
          }
          badge={folder ? <FolderMark color={folder.color} /> : undefined}
        />

        {loading ? (
          <SkeletonList count={3} />
        ) : contents.length === 0 ? (
          <div role="status">
            <Card padding="none" className="animate-rise-in border-dashed">
              <EmptyState
                icon={<Camera size={26} />}
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
          <ul className="flex animate-rise-in flex-col gap-3" aria-label="Materiais desta pasta">
            {contents.map((content) => {
              const cards = content.flashcards?.length ?? 0;
              const removing = deletingId === content.id;

              return (
                <li key={content.id} className="group relative">
                  <Card
                    padding="none"
                    interactive
                    className={cn(
                      "overflow-hidden transition-opacity duration-200",
                      removing && "pointer-events-none opacity-50",
                    )}
                  >
                    <Link
                      to={`/content/${content.id}`}
                      className="block p-4 transition-colors duration-150 hover:bg-surface-sunken"
                      aria-label={`Abrir ${content.title}`}
                    >
                      <div className="flex items-start gap-3">
                        <div className="min-w-0 flex-1">
                          <h2 className="pr-8 text-base font-semibold text-balance text-text">
                            {content.title}
                          </h2>

                          <p className="mt-1 line-clamp-2 text-sm text-text-muted">
                            {content.summary}
                          </p>

                          {/* Contagens em vez de um ícone genérico: dizem o que
                              existe lá dentro antes de a pessoa abrir. */}
                          <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
                            {content.topics.length > 0 && (
                              <Badge icon={<ListChecks size={12} />}>{content.topics.length}</Badge>
                            )}
                            {cards > 0 && (
                              <Badge tone="accent" icon={<Layers size={12} />}>
                                {cards}
                              </Badge>
                            )}
                            <span className="ml-0.5 inline-flex items-center gap-1 text-xs text-text-subtle">
                              <CalendarDays size={12} aria-hidden="true" />
                              {formatDate(content.createdAt)}
                            </span>
                          </div>
                        </div>

                        <ChevronRight
                          size={18}
                          className="mt-0.5 shrink-0 text-text-subtle transition-transform duration-200 ease-enter group-hover:translate-x-0.5"
                          aria-hidden="true"
                        />
                      </div>
                    </Link>
                  </Card>

                  {/*
                    Fora do link, e não numa barra abaixo dele.
                    A faixa separada só para o excluir dobrava a altura de cada
                    item e dava a uma ação destrutiva a mesma presença
                    permanente do conteúdo. Aqui ele é discreto até receber foco
                    ou ponteiro — e continua sempre alcançável por teclado.
                  */}
                  <button
                    type="button"
                    onClick={() => void handleDelete(content.id, content.title)}
                    disabled={removing}
                    aria-label={`Remover ${content.title}`}
                    className={cn(
                      "absolute top-2 right-2 grid size-9 place-items-center rounded-lg",
                      "text-text-subtle opacity-0 transition-[opacity,color,background-color] duration-150",
                      "hover:bg-danger-subtle hover:text-danger focus-visible:opacity-100",
                      "group-hover:opacity-100 disabled:opacity-50",
                    )}
                  >
                    {removing ? (
                      <span
                        className="size-4 animate-spin rounded-full border-2 border-current border-t-transparent"
                        aria-hidden="true"
                      />
                    ) : (
                      <Trash2 size={15} aria-hidden="true" />
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </main>

      <BottomNav />
    </div>
  );
}
