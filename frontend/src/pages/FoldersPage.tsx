import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Check, ChevronRight, Folder, FolderPlus, Pencil, Trash2 } from "lucide-react";
import { createFolder, deleteFolder, getFolders, updateFolder } from "../services/api";
import type { Folder as FolderType } from "../services/api";
import { Button, Card, Dialog, EmptyState, Input, SkeletonList, cn } from "../design-system";
import { Navbar } from "../components/Navbar";
import { BottomNav } from "../components/BottomNav";
import { TTSButton } from "../components/TTSButton";
import { ToastContainer, useToast } from "../components/Toast";

/**
 * Paleta oferecida na criação da pasta.
 *
 * É o único lugar destas telas onde um hex aparece, e por um motivo: estes
 * valores não pintam a interface, são *dado*. Vão para o campo `color` da pasta
 * no banco e voltam de lá — trocá-los por tokens mudaria o que fica gravado.
 *
 * O nome acompanha cada cor porque "Cor #6C5CE7" não é um rótulo utilizável
 * para quem ouve a tela em vez de vê-la.
 */
const PALETTE = [
  { value: "#6C5CE7", name: "Violeta" },
  { value: "#0984E3", name: "Azul" },
  { value: "#00B894", name: "Verde" },
  { value: "#FDCB6E", name: "Amarelo" },
  { value: "#E17055", name: "Laranja" },
  { value: "#D63031", name: "Vermelho" },
  { value: "#A29BFE", name: "Lilás" },
  { value: "#74B9FF", name: "Azul claro" },
  { value: "#55EFC4", name: "Verde água" },
  { value: "#FD79A8", name: "Rosa" },
] as const;

type FolderColor = (typeof PALETTE)[number]["value"];

const COLOR_GROUP_ID = "create-folder-color";

/** Botão só de ícone no alvo de toque mínimo de 44px. */
const ICON_BUTTON =
  "grid size-11 shrink-0 place-items-center rounded-lg transition-colors duration-150";

function describeCount(total: number) {
  if (total === 0) return "Vazia";
  return total === 1 ? "1 item" : `${total} itens`;
}

export function FoldersPage() {
  const [folders, setFolders] = useState<FolderType[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newName, setNewName] = useState("");
  const [newColor, setNewColor] = useState<FolderColor>(PALETTE[0].value);
  const [creating, setCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const { toasts, addToast, removeToast } = useToast();

  const loadFolders = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getFolders();
      setFolders(data);
    } catch {
      addToast("error", "Erro ao carregar pastas.");
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  useEffect(() => {
    void loadFolders();
  }, [loadFolders]);

  async function handleCreate() {
    if (!newName.trim()) return;
    setCreating(true);
    try {
      const folder = await createFolder(newName.trim(), newColor);
      setFolders((prev) => [...prev, folder]);
      setNewName("");
      setNewColor(PALETTE[0].value);
      setShowCreateModal(false);
      addToast("success", `Pasta "${folder.name}" criada!`);
    } catch {
      addToast("error", "Erro ao criar pasta.");
    } finally {
      setCreating(false);
    }
  }

  async function handleRename(id: string) {
    if (!editName.trim()) return;
    try {
      const updated = await updateFolder(id, { name: editName.trim() });
      setFolders((prev) => prev.map((f) => (f.id === id ? updated : f)));
      setEditingId(null);
      addToast("success", "Pasta renomeada.");
    } catch {
      addToast("error", "Erro ao renomear pasta.");
    }
  }

  async function handleDelete(id: string, name: string) {
    setDeletingId(id);
    try {
      await deleteFolder(id);
      setFolders((prev) => prev.filter((f) => f.id !== id));
      addToast("info", `Pasta "${name}" removida.`);
    } catch {
      addToast("error", "Erro ao deletar pasta.");
    } finally {
      setDeletingId(null);
    }
  }

  const subtitle = loading
    ? "Carregando…"
    : folders.length === 0
      ? "Organize seus materiais por matéria, prova ou projeto"
      : `${folders.length} ${folders.length === 1 ? "pasta" : "pastas"}`;

  return (
    <div className="flex min-h-dvh flex-col bg-bg">
      <Navbar title="Pastas" />
      <ToastContainer toasts={toasts} onClose={removeToast} />

      <main id="main-content" className="mx-auto w-full max-w-2xl flex-1 px-4 pt-4 pb-28">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-2xl font-bold text-text">Minhas pastas</h1>
            <p className="mt-1 text-sm text-text-muted">{subtitle}</p>
          </div>

          <Button
            icon={<FolderPlus size={18} aria-hidden="true" />}
            onClick={() => setShowCreateModal(true)}
          >
            Nova pasta
          </Button>
        </div>

        {loading ? (
          <SkeletonList count={4} label="Carregando pastas" />
        ) : folders.length === 0 ? (
          <div role="status">
            <Card padding="none" className="animate-rise-in border-dashed">
              <EmptyState
                icon={<FolderPlus size={26} />}
                title="Nenhuma pasta ainda"
                description="Pastas agrupam os materiais que você escaneia — por matéria, por prova, do jeito que fizer sentido."
                action={
                  <Button
                    icon={<FolderPlus size={18} aria-hidden="true" />}
                    onClick={() => setShowCreateModal(true)}
                  >
                    Criar primeira pasta
                  </Button>
                }
              />
            </Card>
          </div>
        ) : (
          <ul
            className="grid animate-rise-in grid-cols-1 gap-3 sm:grid-cols-2"
            aria-label="Lista de pastas"
          >
            {folders.map((folder) => (
              <li key={folder.id}>
                {editingId === folder.id ? (
                  <Card elevation="raised" padding="md" className="h-full animate-fade-in">
                    <Input
                      label={`Novo nome da pasta ${folder.name}`}
                      hideLabel
                      value={editName}
                      onChange={(event) => setEditName(event.target.value)}
                      autoFocus
                      className="bg-surface-sunken"
                      onKeyDown={(event) => {
                        if (event.key === "Enter") void handleRename(folder.id);
                        if (event.key === "Escape") setEditingId(null);
                      }}
                    />

                    <div className="mt-3 flex justify-end gap-2">
                      <Button variant="ghost" size="sm" onClick={() => setEditingId(null)}>
                        Cancelar
                      </Button>
                      <Button
                        size="sm"
                        icon={<Check size={16} aria-hidden="true" />}
                        disabled={!editName.trim()}
                        onClick={() => void handleRename(folder.id)}
                      >
                        Salvar
                      </Button>
                    </div>
                  </Card>
                ) : (
                  <Card padding="none" interactive className="flex h-full flex-col overflow-hidden">
                    <Link
                      to={`/folders/${folder.id}`}
                      className="flex flex-1 items-center gap-3 p-4 transition-colors duration-150 hover:bg-surface-sunken"
                      aria-label={`Abrir pasta ${folder.name}`}
                    >
                      {/* A cor da pasta é escolha de quem a criou e chega do
                          banco: nenhum contraste pode ser garantido para ela.
                          Por isso ela só tinge o traço deste ícone decorativo,
                          nunca um texto nem um fundo com texto por cima. O
                          significado continua no nome ao lado. */}
                      <span
                        className="grid size-11 shrink-0 place-items-center rounded-xl border border-border bg-surface-sunken"
                        aria-hidden="true"
                      >
                        <Folder size={20} style={{ color: folder.color }} />
                      </span>

                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-semibold text-text">
                          {folder.name}
                        </span>
                        <span className="block text-xs text-text-subtle">
                          {describeCount(folder._count?.contents ?? 0)}
                        </span>
                      </span>

                      <ChevronRight
                        size={18}
                        className="shrink-0 text-text-subtle"
                        aria-hidden="true"
                      />
                    </Link>

                    <div className="flex items-center gap-0.5 border-t border-border px-2 py-1">
                      <TTSButton text={folder.name} label={`pasta ${folder.name}`} />

                      <button
                        type="button"
                        onClick={() => {
                          setEditingId(folder.id);
                          setEditName(folder.name);
                        }}
                        aria-label={`Renomear pasta ${folder.name}`}
                        className={cn(
                          ICON_BUTTON,
                          "ml-auto text-text-muted hover:bg-surface-sunken hover:text-text",
                        )}
                      >
                        <Pencil size={16} aria-hidden="true" />
                      </button>

                      <button
                        type="button"
                        onClick={() => void handleDelete(folder.id, folder.name)}
                        disabled={deletingId === folder.id}
                        aria-label={`Excluir pasta ${folder.name}`}
                        className={cn(
                          ICON_BUTTON,
                          "text-danger hover:bg-danger-subtle disabled:opacity-50",
                        )}
                      >
                        {deletingId === folder.id ? (
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
                )}
              </li>
            ))}
          </ul>
        )}
      </main>

      <BottomNav />

      <Dialog
        open={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Nova pasta"
        description="Dê um nome e escolha uma cor para reconhecê-la de relance."
      >
        <div className="flex flex-col gap-6">
          {/* `data-autofocus` em vez de `autoFocus`: o foco inicial é
              responsabilidade do `Dialog`, e esta marca diz a ele qual campo
              merece receber o foco em vez do botão de fechar. */}
          <Input
            data-autofocus
            label="Nome da pasta"
            value={newName}
            onChange={(event) => setNewName(event.target.value)}
            placeholder="Ex.: Matemática, Física…"
            required
            onKeyDown={(event) => {
              if (event.key === "Enter") void handleCreate();
            }}
          />

          <div>
            <p id={COLOR_GROUP_ID} className="mb-2 text-sm font-medium text-text">
              Cor
            </p>

            <div
              role="radiogroup"
              aria-labelledby={COLOR_GROUP_ID}
              className="flex flex-wrap gap-1"
            >
              {PALETTE.map(({ value, name }) => {
                const selected = newColor === value;
                return (
                  <button
                    key={value}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    aria-label={name}
                    onClick={() => setNewColor(value)}
                    className={cn(
                      "grid size-11 place-items-center rounded-full",
                      "transition-transform duration-150 ease-spring",
                      selected ? "scale-110" : "hover:scale-105",
                    )}
                  >
                    {/* A seleção é marcada por um anel mais grosso, não pela
                        cor: sobre dez amostras coloridas, cor não distingue
                        nada. WCAG 1.4.1. */}
                    <span
                      className={cn(
                        "block size-7 rounded-full ring-offset-2 ring-offset-surface-raised",
                        selected ? "ring-2 ring-accent" : "ring-1 ring-border",
                      )}
                      style={{ backgroundColor: value }}
                      aria-hidden="true"
                    />
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex gap-3">
            <Button variant="secondary" fullWidth onClick={() => setShowCreateModal(false)}>
              Cancelar
            </Button>
            <Button
              fullWidth
              loading={creating}
              loadingLabel="Criando…"
              disabled={!newName.trim()}
              onClick={handleCreate}
            >
              Criar pasta
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}
