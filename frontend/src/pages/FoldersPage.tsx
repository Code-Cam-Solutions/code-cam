import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { FolderPlus, Folder, Trash2, Pencil, X, Check } from "lucide-react";
import { getFolders, createFolder, updateFolder, deleteFolder } from "../services/api";
import type { Folder as FolderType } from "../services/api";
import { Navbar } from "../components/Navbar";
import { BottomNav } from "../components/BottomNav";
import { Button } from "../components/Button";
import { TTSButton } from "../components/TTSButton";
import { useToast, ToastContainer } from "../components/Toast";
import { SkeletonList } from "../components/SkeletonCard";
import { useEscapeKey } from "../hooks/useEscapeKey";

const PALETTE = [
  "#6C5CE7",
  "#0984E3",
  "#00B894",
  "#FDCB6E",
  "#E17055",
  "#D63031",
  "#A29BFE",
  "#74B9FF",
  "#55EFC4",
  "#FD79A8",
] as const;

type FolderColor = (typeof PALETTE)[number];

export function FoldersPage() {
  const [folders, setFolders] = useState<FolderType[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newName, setNewName] = useState("");
  const [newColor, setNewColor] = useState<FolderColor>(PALETTE[0]);
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

  useEscapeKey(
    showCreateModal,
    useCallback(() => setShowCreateModal(false), []),
  );

  async function handleCreate() {
    if (!newName.trim()) return;
    setCreating(true);
    try {
      const folder = await createFolder(newName.trim(), newColor);
      setFolders((prev) => [...prev, folder]);
      setNewName("");
      setNewColor(PALETTE[0]);
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

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ backgroundColor: "var(--color-background)" }}
    >
      <Navbar title="Pastas" />
      <ToastContainer toasts={toasts} onClose={removeToast} />

      <main className="flex-1 px-4 pt-4 pb-24 max-w-2xl mx-auto w-full" id="main-content">
        <div className="flex items-center justify-between mb-4">
          <h1 className="font-bold text-white" style={{ fontSize: "var(--text-xl)" }}>
            Minhas Pastas
          </h1>
          <Button
            size="sm"
            icon={<FolderPlus size={16} aria-hidden="true" />}
            onClick={() => setShowCreateModal(true)}
            aria-label="Criar nova pasta"
          >
            Nova pasta
          </Button>
        </div>

        {loading ? (
          <SkeletonList count={4} />
        ) : folders.length === 0 ? (
          <div className="text-center py-16" role="status">
            <Folder
              size={48}
              className="mx-auto mb-3"
              style={{ color: "var(--color-text-muted)" }}
              aria-hidden="true"
            />
            <p className="text-white mb-1" style={{ fontSize: "var(--text-base)" }}>
              Nenhuma pasta criada
            </p>
            <p style={{ color: "var(--color-text-muted)", fontSize: "var(--text-sm)" }}>
              Crie pastas para organizar seus materiais
            </p>
          </div>
        ) : (
          <ul className="grid grid-cols-2 gap-3" aria-label="Lista de pastas">
            {folders.map((folder) => (
              <li key={folder.id}>
                {editingId === folder.id ? (
                  <div
                    className="p-4 rounded-2xl flex flex-col gap-2"
                    style={{ backgroundColor: "var(--color-surface)" }}
                  >
                    <input
                      type="text"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      autoFocus
                      aria-label="Novo nome da pasta"
                      className="w-full px-3 py-2 rounded-lg text-white border focus:outline-none focus-visible:ring-2 focus-visible:ring-codecam"
                      style={{
                        backgroundColor: "var(--color-surface-2)",
                        borderColor: "var(--color-border)",
                        fontSize: "var(--text-sm)",
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") void handleRename(folder.id);
                        if (e.key === "Escape") setEditingId(null);
                      }}
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleRename(folder.id)}
                        aria-label="Confirmar renomear"
                        className="flex-1 flex items-center justify-center py-2 rounded-lg transition-colors hover:opacity-80"
                        style={{
                          backgroundColor: "var(--color-success)" + "30",
                          color: "var(--color-success)",
                        }}
                      >
                        <Check size={16} aria-hidden="true" />
                      </button>
                      <button
                        onClick={() => setEditingId(null)}
                        aria-label="Cancelar"
                        className="flex-1 flex items-center justify-center py-2 rounded-lg transition-colors hover:opacity-80"
                        style={{
                          backgroundColor: "var(--color-surface-2)",
                          color: "var(--color-text-muted)",
                        }}
                      >
                        <X size={16} aria-hidden="true" />
                      </button>
                    </div>
                  </div>
                ) : (
                  <div
                    className="rounded-2xl overflow-hidden"
                    style={{ backgroundColor: "var(--color-surface)" }}
                  >
                    <Link
                      to={`/folders/${folder.id}`}
                      className="flex flex-col p-4 transition-colors hover:bg-surface-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-codecam"
                      aria-label={`Abrir pasta ${folder.name}`}
                    >
                      <div
                        className="w-10 h-10 rounded-xl flex items-center justify-center mb-3"
                        style={{ backgroundColor: folder.color + "30" }}
                        aria-hidden="true"
                      >
                        <Folder size={20} style={{ color: folder.color }} aria-hidden="true" />
                      </div>
                      <span
                        className="font-semibold text-white truncate"
                        style={{ fontSize: "var(--text-sm)" }}
                      >
                        {folder.name}
                      </span>
                      <span
                        style={{ color: "var(--color-text-muted)", fontSize: "var(--text-xs)" }}
                      >
                        {folder._count?.contents ?? 0} item(s)
                      </span>
                    </Link>

                    <div
                      className="flex items-center justify-between px-3 py-2"
                      style={{ borderTop: "1px solid var(--color-border)" }}
                    >
                      <TTSButton text={folder.name} label={`pasta ${folder.name}`} size={14} />
                      <div className="flex gap-1">
                        <button
                          onClick={() => {
                            setEditingId(folder.id);
                            setEditName(folder.name);
                          }}
                          aria-label={`Renomear pasta ${folder.name}`}
                          className="w-8 h-8 flex items-center justify-center rounded-lg transition-colors hover:bg-surface-2"
                          style={{ color: "var(--color-text-muted)" }}
                        >
                          <Pencil size={14} aria-hidden="true" />
                        </button>
                        <button
                          onClick={() => handleDelete(folder.id, folder.name)}
                          disabled={deletingId === folder.id}
                          aria-label={`Deletar pasta ${folder.name}`}
                          className="w-8 h-8 flex items-center justify-center rounded-lg transition-colors hover:bg-error/20"
                          style={{ color: "var(--color-error)" }}
                        >
                          {deletingId === folder.id ? (
                            <span className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
                          ) : (
                            <Trash2 size={14} aria-hidden="true" />
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </main>

      <BottomNav />

      {/* Create folder modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-end">
          {/* Backdrop puramente visual: o descarte por teclado é o Escape. */}
          <div
            className="absolute inset-0"
            style={{ backgroundColor: "rgba(0,0,0,0.7)" }}
            aria-hidden="true"
            onMouseDown={() => setShowCreateModal(false)}
          />
          <div
            className="relative w-full rounded-t-3xl p-6 animate-fade-in"
            style={{ backgroundColor: "var(--color-surface)" }}
            role="dialog"
            aria-modal="true"
            aria-labelledby="create-folder-title"
          >
            <h2
              id="create-folder-title"
              className="font-bold text-white mb-4"
              style={{ fontSize: "var(--text-xl)" }}
            >
              Nova pasta
            </h2>

            <div className="mb-4">
              <label
                htmlFor="folder-name"
                className="block text-white mb-2"
                style={{ fontSize: "var(--text-sm)" }}
              >
                Nome da pasta
              </label>
              <input
                id="folder-name"
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Ex: Matemática, Física..."
                autoFocus
                aria-required="true"
                onKeyDown={(e) => e.key === "Enter" && handleCreate()}
                className="w-full px-4 py-3 rounded-xl text-white border focus:outline-none focus-visible:ring-2 focus-visible:ring-codecam"
                style={{
                  backgroundColor: "var(--color-surface-2)",
                  borderColor: "var(--color-border)",
                  fontSize: "var(--text-base)",
                  minHeight: "48px",
                }}
              />
            </div>

            <div className="mb-6">
              <p className="text-white mb-2" style={{ fontSize: "var(--text-sm)" }}>
                Cor
              </p>
              <div
                className="flex flex-wrap gap-3"
                role="radiogroup"
                aria-label="Selecionar cor da pasta"
              >
                {PALETTE.map((color) => (
                  <button
                    key={color}
                    role="radio"
                    aria-checked={newColor === color}
                    onClick={() => setNewColor(color)}
                    aria-label={`Cor ${color}`}
                    className="w-9 h-9 rounded-full transition-all focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
                    style={{
                      backgroundColor: color,
                      outline: newColor === color ? `3px solid white` : "none",
                      outlineOffset: "2px",
                      transform: newColor === color ? "scale(1.15)" : "scale(1)",
                    }}
                  />
                ))}
              </div>
            </div>

            <div className="flex gap-3">
              <Button variant="ghost" fullWidth onClick={() => setShowCreateModal(false)}>
                Cancelar
              </Button>
              <Button
                fullWidth
                loading={creating}
                disabled={!newName.trim()}
                onClick={handleCreate}
                aria-label="Criar pasta"
              >
                Criar
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
