import { useState } from "react";
import { useLocation, useNavigate, Link } from "react-router-dom";
import {
  BookOpen,
  ListChecks,
  Layers,
  FolderPlus,
  Play,
  ChevronDown,
  ChevronUp,
  Check,
} from "lucide-react";
import type { ScanResult } from "../services/api";
import { getFolders, saveContent, createFolder } from "../services/api";
import { Navbar } from "../components/Navbar";
import { BottomNav } from "../components/BottomNav";
import { TTSButton } from "../components/TTSButton";
import { Button } from "../components/Button";
import { useToast, ToastContainer } from "../components/Toast";

export function ResultPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const result: ScanResult | undefined = location.state?.result;
  const { toasts, addToast, removeToast } = useToast();

  const [showRawText, setShowRawText] = useState(false);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [folders, setFolders] = useState<{ id: string; name: string; color: string }[]>([]);
  const [loadingFolders, setLoadingFolders] = useState(false);
  const [savingTo, setSavingTo] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [creatingFolder, setCreatingFolder] = useState(false);

  if (!result) {
    return (
      <div
        className="min-h-screen flex flex-col items-center justify-center px-6 text-center"
        style={{ backgroundColor: "var(--color-background)" }}
      >
        <p className="text-white mb-4" style={{ fontSize: "var(--text-lg)" }}>
          Nenhum resultado encontrado.
        </p>
        <Link to="/camera">
          <Button>Escanear material</Button>
        </Link>
      </div>
    );
  }

  async function handleOpenSaveModal() {
    setShowSaveModal(true);
    setLoadingFolders(true);
    try {
      const data = await getFolders();
      setFolders(data);
    } catch {
      addToast("error", "Não foi possível carregar as pastas.");
    } finally {
      setLoadingFolders(false);
    }
  }

  async function handleSave(folderId?: string) {
    setSavingTo(folderId || "none");
    try {
      await saveContent({
        title: result.title,
        summary: result.summary,
        topics: result.topics,
        flashcards: result.flashcards,
        rawText: result.rawText,
        folderId,
      });
      setSaved(true);
      setShowSaveModal(false);
      addToast("success", "Conteúdo salvo com sucesso!");
    } catch {
      addToast("error", "Erro ao salvar. Tente novamente.");
    } finally {
      setSavingTo(null);
    }
  }

  async function handleCreateAndSave() {
    if (!newFolderName.trim()) return;
    setCreatingFolder(true);
    try {
      const folder = await createFolder(newFolderName.trim(), "#6C5CE7");
      await handleSave(folder.id);
      setNewFolderName("");
    } catch {
      addToast("error", "Erro ao criar pasta.");
    } finally {
      setCreatingFolder(false);
    }
  }

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ backgroundColor: "var(--color-background)" }}
    >
      <Navbar title="Resultado" showBack backTo="/camera" />
      <ToastContainer toasts={toasts} onClose={removeToast} />

      <main className="flex-1 px-4 pt-4 pb-32 max-w-2xl mx-auto w-full" id="main-content">
        {/* Title */}
        <section
          className="mb-4 p-4 rounded-2xl"
          style={{ backgroundColor: "var(--color-surface)" }}
          aria-labelledby="result-title"
        >
          <div className="flex items-start justify-between gap-2">
            <h1
              id="result-title"
              className="font-bold text-white flex-1"
              style={{ fontSize: "var(--text-xl)" }}
            >
              {result.title}
            </h1>
            <TTSButton text={result.title} label="título" />
          </div>
        </section>

        {/* Summary */}
        <section
          className="mb-4 p-4 rounded-2xl"
          style={{ backgroundColor: "var(--color-surface)" }}
          aria-labelledby="summary-heading"
        >
          <div className="flex items-center justify-between gap-2 mb-3">
            <div className="flex items-center gap-2">
              <BookOpen size={18} style={{ color: "var(--color-codecam)" }} aria-hidden="true" />
              <h2
                id="summary-heading"
                className="font-semibold text-white"
                style={{ fontSize: "var(--text-base)" }}
              >
                Resumo
              </h2>
            </div>
            <TTSButton text={result.summary} label="resumo" />
          </div>
          <p
            className="text-white"
            style={{ fontSize: "var(--text-sm)", lineHeight: "1.7" }}
          >
            {result.summary}
          </p>
        </section>

        {/* Topics */}
        <section
          className="mb-4 p-4 rounded-2xl"
          style={{ backgroundColor: "var(--color-surface)" }}
          aria-labelledby="topics-heading"
        >
          <div className="flex items-center gap-2 mb-3">
            <ListChecks size={18} style={{ color: "var(--color-codecam)" }} aria-hidden="true" />
            <h2
              id="topics-heading"
              className="font-semibold text-white"
              style={{ fontSize: "var(--text-base)" }}
            >
              Tópicos principais
            </h2>
          </div>
          <ul className="flex flex-col gap-2" aria-label="Lista de tópicos">
            {result.topics.map((topic, i) => (
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

        {/* Flashcards CTA */}
        <section
          className="mb-4 p-4 rounded-2xl"
          style={{ backgroundColor: "var(--color-surface)" }}
          aria-labelledby="flashcards-heading"
        >
          <div className="flex items-center justify-between gap-2 mb-3">
            <div className="flex items-center gap-2">
              <Layers size={18} style={{ color: "var(--color-codecam)" }} aria-hidden="true" />
              <h2
                id="flashcards-heading"
                className="font-semibold text-white"
                style={{ fontSize: "var(--text-base)" }}
              >
                Flashcards
              </h2>
              <span
                className="px-2 py-0.5 rounded-full text-white"
                style={{
                  backgroundColor: "var(--color-codecam)",
                  fontSize: "var(--text-xs)",
                }}
              >
                {result.flashcards.length}
              </span>
            </div>
          </div>
          <p
            className="mb-3"
            style={{ color: "var(--color-text-muted)", fontSize: "var(--text-sm)" }}
          >
            Pratique com os flashcards gerados automaticamente.
          </p>
          <Button
            fullWidth
            icon={<Play size={18} aria-hidden="true" />}
            onClick={() => navigate("/flashcards", { state: { flashcards: result.flashcards } })}
            aria-label={`Iniciar sessão com ${result.flashcards.length} flashcards`}
          >
            Iniciar flashcards
          </Button>
        </section>

        {/* Raw text (collapsible) */}
        <section
          className="mb-6 rounded-2xl overflow-hidden"
          style={{ backgroundColor: "var(--color-surface)" }}
        >
          <button
            onClick={() => setShowRawText((v) => !v)}
            className="flex items-center justify-between w-full p-4 transition-colors hover:bg-surface-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-codecam"
            aria-expanded={showRawText}
            aria-controls="raw-text"
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
              id="raw-text"
              className="px-4 pb-4"
              style={{ borderTop: "1px solid var(--color-border)" }}
            >
              <div className="flex justify-end mb-2 pt-3">
                <TTSButton text={result.rawText} label="texto extraído" />
              </div>
              <p
                className="text-white whitespace-pre-wrap"
                style={{ fontSize: "var(--text-sm)", lineHeight: "1.7" }}
              >
                {result.rawText}
              </p>
            </div>
          )}
        </section>
      </main>

      {/* Fixed bottom action */}
      <div
        className="fixed bottom-16 left-0 right-0 px-4 pb-3 pt-3"
        style={{
          backgroundColor: "var(--color-background)",
          borderTop: "1px solid var(--color-border)",
        }}
      >
        {saved ? (
          <div
            className="flex items-center justify-center gap-2 py-3 rounded-xl"
            style={{ backgroundColor: "var(--color-success)" + "20" }}
            role="status"
          >
            <Check size={18} style={{ color: "var(--color-success)" }} aria-hidden="true" />
            <span className="text-white font-medium" style={{ fontSize: "var(--text-base)" }}>
              Salvo com sucesso!
            </span>
          </div>
        ) : (
          <Button
            fullWidth
            size="lg"
            icon={<FolderPlus size={18} aria-hidden="true" />}
            onClick={handleOpenSaveModal}
            aria-label="Salvar conteúdo em uma pasta"
          >
            Salvar em pasta
          </Button>
        )}
      </div>

      <BottomNav />

      {/* Save modal */}
      {showSaveModal && (
        <div
          className="fixed inset-0 z-50 flex items-end"
          style={{ backgroundColor: "rgba(0,0,0,0.7)" }}
          role="dialog"
          aria-modal="true"
          aria-labelledby="save-modal-title"
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowSaveModal(false);
          }}
        >
          <div
            className="w-full rounded-t-3xl p-6 max-h-[80vh] overflow-y-auto animate-fade-in"
            style={{ backgroundColor: "var(--color-surface)" }}
          >
            <h2
              id="save-modal-title"
              className="font-bold text-white mb-4"
              style={{ fontSize: "var(--text-xl)" }}
            >
              Salvar em pasta
            </h2>

            {/* No folder option */}
            <button
              onClick={() => handleSave(undefined)}
              disabled={savingTo !== null}
              className="w-full flex items-center gap-3 p-3 rounded-xl mb-3 transition-colors hover:bg-surface-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-codecam"
              style={{ border: "1px dashed var(--color-border)" }}
            >
              <FolderPlus size={20} style={{ color: "var(--color-text-muted)" }} aria-hidden="true" />
              <span className="text-white" style={{ fontSize: "var(--text-base)" }}>
                Sem pasta (geral)
              </span>
            </button>

            {loadingFolders ? (
              <p
                className="text-center py-4"
                style={{ color: "var(--color-text-muted)", fontSize: "var(--text-sm)" }}
              >
                Carregando pastas...
              </p>
            ) : (
              <div className="flex flex-col gap-2 mb-4">
                {folders.map((folder) => (
                  <button
                    key={folder.id}
                    onClick={() => handleSave(folder.id)}
                    disabled={savingTo !== null}
                    className="w-full flex items-center gap-3 p-3 rounded-xl transition-colors hover:bg-surface-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-codecam"
                    style={{ backgroundColor: "var(--color-surface-2)" }}
                    aria-label={`Salvar em ${folder.name}`}
                  >
                    <div
                      className="w-4 h-4 rounded-full flex-shrink-0"
                      style={{ backgroundColor: folder.color }}
                      aria-hidden="true"
                    />
                    <span className="text-white" style={{ fontSize: "var(--text-base)" }}>
                      {folder.name}
                    </span>
                    {savingTo === folder.id && (
                      <span
                        className="ml-auto w-4 h-4 border-2 border-codecam border-t-transparent rounded-full animate-spin"
                        aria-hidden="true"
                      />
                    )}
                  </button>
                ))}
              </div>
            )}

            {/* Create new folder inline */}
            <div className="flex gap-2 pt-3" style={{ borderTop: "1px solid var(--color-border)" }}>
              <input
                type="text"
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                placeholder="Nova pasta..."
                aria-label="Nome da nova pasta"
                className="flex-1 px-3 py-2 rounded-xl text-white placeholder:text-text-muted border focus:outline-none focus-visible:ring-2 focus-visible:ring-codecam"
                style={{
                  backgroundColor: "var(--color-surface-2)",
                  borderColor: "var(--color-border)",
                  fontSize: "var(--text-sm)",
                }}
              />
              <Button
                size="sm"
                onClick={handleCreateAndSave}
                loading={creatingFolder}
                disabled={!newFolderName.trim()}
                aria-label="Criar pasta e salvar"
              >
                Criar
              </Button>
            </div>

            <Button
              variant="ghost"
              fullWidth
              className="mt-3"
              onClick={() => setShowSaveModal(false)}
            >
              Cancelar
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
