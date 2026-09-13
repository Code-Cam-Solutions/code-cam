import { useState, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import {
  BookOpen,
  Check,
  ChevronDown,
  ChevronRight,
  FileText,
  Folder,
  FolderPlus,
  Layers,
  ListChecks,
  Play,
  ScanLine,
  Sparkles,
} from "lucide-react";
import { Link } from "react-router-dom";
import { createFolder, getFolders, saveContent } from "@/api";
import type { Folder as FolderData } from "@/api";
import { useRouteState } from "@/shared/lib/navigation";
import { Badge, Button, Card, Dialog, EmptyState, Input, SkeletonList, cn } from "@/design-system";
import { Navbar } from "@/shared/components/Navbar";
import { BottomNav } from "@/shared/components/BottomNav";
import { TTSButton } from "@/shared/components/TTSButton";
import { MarkedItem, ReadableProse } from "@/shared/components/ReadingAid";
import { ToastContainer, useToast } from "@/shared/components/Toast";

/**
 * Cor da pasta criada aqui de improviso.
 *
 * É o único hex do arquivo e não pinta nada da interface: vai para o campo
 * `color` da pasta no banco. É o mesmo primeiro valor da paleta oferecida na
 * tela de pastas, para que uma pasta criada por atalho não destoe das outras.
 */
const DEFAULT_FOLDER_COLOR = "#6C5CE7";

/** Cabeçalho de seção: selo do ícone, título e uma ação opcional à direita. */
function SectionHeading({
  icon: Icon,
  id,
  title,
  action,
  solidIcon = false,
}: {
  icon: typeof BookOpen;
  id: string;
  title: string;
  action?: ReactNode;
  /** Sobre um card já tingido de acento, o selo precisa ser sólido para existir. */
  solidIcon?: boolean;
}) {
  return (
    <div className="mb-3 flex items-center justify-between gap-3">
      <div className="flex min-w-0 items-center gap-2.5">
        <span
          className={cn(
            "grid size-8 shrink-0 place-items-center rounded-lg",
            solidIcon ? "bg-accent text-accent-contrast" : "bg-accent-subtle text-accent",
          )}
          aria-hidden="true"
        >
          <Icon size={17} />
        </span>
        <h2 id={id} className="truncate text-base font-semibold text-text">
          {title}
        </h2>
      </div>
      {action}
    </div>
  );
}

/** Bloco recolhível com o texto cru do OCR — conferência, não leitura. */
function RawTextSection({ text }: { text: string }) {
  const [open, setOpen] = useState(false);
  const regionId = "raw-text";

  return (
    <Card padding="none" className="overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-controls={regionId}
        className={cn(
          "flex min-h-[3.25rem] w-full items-center justify-between gap-3 px-4 py-3",
          "transition-colors duration-150 hover:bg-surface-sunken",
        )}
      >
        <span className="flex items-center gap-2.5">
          <span
            className="grid size-8 shrink-0 place-items-center rounded-lg bg-surface-sunken text-text-subtle"
            aria-hidden="true"
          >
            <FileText size={17} />
          </span>
          <span className="text-base font-semibold text-text">Texto extraído</span>
        </span>

        <ChevronDown
          size={18}
          className={cn(
            "shrink-0 text-text-subtle transition-transform duration-200 ease-enter",
            open && "rotate-180",
          )}
          aria-hidden="true"
        />
      </button>

      {open && (
        <div id={regionId} className="animate-rise-in border-t border-border px-4 pt-3 pb-4">
          <div className="mb-2 flex justify-end">
            <TTSButton text={text} label="texto extraído" />
          </div>
          <p className="text-sm leading-relaxed whitespace-pre-wrap text-text-muted">{text}</p>
        </div>
      )}
    </Card>
  );
}

export function ResultPage() {
  const navigate = useNavigate();
  const { result, thumbnail, formats } = useRouteState<"/result">();
  const { toasts, addToast, removeToast } = useToast();

  const [showSaveModal, setShowSaveModal] = useState(false);
  const [folders, setFolders] = useState<FolderData[]>([]);
  const [loadingFolders, setLoadingFolders] = useState(false);
  const [savingTo, setSavingTo] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [savedFolderId, setSavedFolderId] = useState<string | null>(null);
  const [newFolderName, setNewFolderName] = useState("");
  const [creatingFolder, setCreatingFolder] = useState(false);

  if (!result) {
    return (
      <div className="flex min-h-dvh flex-col bg-bg">
        <Navbar title="Resultado" showBack backTo="/camera" />
        <main id="main-content" className="flex flex-1 items-center justify-center px-4">
          <EmptyState
            className="animate-rise-in"
            icon={<ScanLine size={26} />}
            title="Nenhum resultado encontrado."
            description="Fotografe um material de estudo para que a IA o transforme em resumo, tópicos e flashcards."
            action={
              <Button icon={<ScanLine size={18} />} onClick={() => void navigate("/camera")}>
                Escanear material
              </Button>
            }
          />
        </main>
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
    if (!result) return;

    setSavingTo(folderId || "none");
    try {
      await saveContent({
        title: result.title,
        summary: result.summary,
        topics: result.topics,
        flashcards: result.flashcards,
        rawText: result.rawText,
        // A foto que originou o material. Sem isto, a pasta guardava um resumo
        // órfão — e era justamente a imagem que dizia de que aula se tratava.
        imageUrl: thumbnail ?? undefined,
        folderId,
      });
      setSaved(true);
      setSavedFolderId(folderId ?? null);
      setShowSaveModal(false);
      // Sem toast aqui: a barra fixa abaixo já confirma o salvamento, e no
      // lugar do botão que sumiu. Os dois juntos anunciavam o mesmo fato duas
      // vezes, em cantos opostos da tela.
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
      const folder = await createFolder(newFolderName.trim(), DEFAULT_FOLDER_COLOR);
      await handleSave(folder.id);
      setNewFolderName("");
    } catch {
      addToast("error", "Erro ao criar pasta.");
    } finally {
      setCreatingFolder(false);
    }
  }

  const busy = savingTo !== null;
  const flashcardCount = result.flashcards.length;

  return (
    <div className="flex min-h-dvh flex-col bg-bg">
      <Navbar title="Resultado" showBack backTo="/camera" />
      <ToastContainer toasts={toasts} onClose={removeToast} />

      <main id="main-content" className="relative mx-auto w-full max-w-2xl flex-1 px-4 pt-6 pb-40">
        {/* Halo de acento atrás do título. É o momento de recompensa da tela:
            a foto virou conteúdo. Decorativo e feito do próprio token, então
            acompanha o tema. */}
        <div
          className="pointer-events-none absolute -top-16 left-1/2 size-64 -translate-x-1/2 rounded-full bg-accent-subtle blur-3xl"
          aria-hidden="true"
        />

        <header className="relative mb-8 animate-rise-in">
          <Badge tone="accent" icon={<Sparkles size={13} />}>
            Análise concluída
          </Badge>

          <div className="mt-3 flex items-start justify-between gap-3">
            <h1 id="result-title" className="min-w-0 flex-1 text-3xl font-bold text-text">
              {result.title}
            </h1>
            <TTSButton text={result.title} label="título" />
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-2">
            {result.topics.length > 0 && (
              <Badge icon={<ListChecks size={13} />}>
                {result.topics.length} {result.topics.length === 1 ? "tópico" : "tópicos"}
              </Badge>
            )}
            {flashcardCount > 0 && (
              <Badge icon={<Layers size={13} />}>
                {flashcardCount} {flashcardCount === 1 ? "flashcard" : "flashcards"}
              </Badge>
            )}
          </div>
        </header>

        <div className="flex flex-col gap-4">
          {/* Resumo — o que a pessoa veio ler, então é o único card elevado. */}
          <Card
            padding="lg"
            elevation="raised"
            className="animate-rise-in"
            aria-labelledby="summary-heading"
          >
            <SectionHeading
              icon={BookOpen}
              id="summary-heading"
              title="Resumo"
              action={<TTSButton text={result.summary} label="resumo" />}
            />
            <ReadableProse text={result.summary} />
          </Card>

          {/* Tópicos */}
          {result.topics.length > 0 && (
            <Card padding="lg" aria-labelledby="topics-heading">
              <SectionHeading icon={ListChecks} id="topics-heading" title="Tópicos principais" />
              <ul className="flex flex-wrap gap-2" aria-label="Lista de tópicos">
                {result.topics.map((topic, i) => (
                  <li key={i} className="flex items-center gap-1">
                    {/* O marcador fica à esquerda do selo, fora da linha do
                        texto — ponto de retorno para o olho, sem interromper
                        a leitura da frase. */}
                    <MarkedItem kind="topic">
                      <Badge tone="accent" className="max-w-full whitespace-normal">
                        {topic}
                      </Badge>
                    </MarkedItem>
                    <TTSButton text={topic} label={`tópico ${i + 1}`} />
                  </li>
                ))}
              </ul>
            </Card>
          )}

          {/* Flashcards */}
          <Card
            padding="lg"
            className="border-accent/25 bg-accent-subtle"
            aria-labelledby="flashcards-heading"
          >
            <SectionHeading
              icon={Layers}
              id="flashcards-heading"
              title="Flashcards"
              solidIcon
              action={
                <Badge tone="accent" className="border-accent bg-accent text-accent-contrast">
                  {flashcardCount}
                </Badge>
              }
            />
            <p className="mb-4 text-sm text-text">
              Pratique com os flashcards gerados automaticamente.
            </p>
            <Button
              fullWidth
              size="lg"
              icon={<Play size={18} />}
              onClick={() =>
                void navigate("/flashcards", {
                  // O resultado inteiro vai junto para que a tela de estudo
                  // saiba voltar para cá — com o resumo, os tópicos e o botão
                  // de salvar ainda disponíveis.
                  state: {
                    draftCards: result.flashcards,
                    title: result.title,
                    result,
                    formats,
                    thumbnail,
                  },
                })
              }
              aria-label={`Iniciar sessão com ${flashcardCount} flashcards`}
            >
              Iniciar flashcards
            </Button>
          </Card>

          <RawTextSection text={result.rawText} />
        </div>
      </main>

      {/* Ação fixa, encaixada exatamente sobre a barra de navegação — o cálculo
          soma a altura dela com a faixa de gestos do aparelho. */}
      <div
        className={cn(
          "fixed inset-x-0 bottom-[calc(3.5rem_+_env(safe-area-inset-bottom))]",
          // Sem borda própria: esta barra encosta na navegação inferior, que
          // já tem a sua. As duas juntas desenhavam duas linhas paralelas a
          // poucos pixels uma da outra. O desfoque sozinho separa o conteúdo
          // que rola por baixo.
          "bg-bg/90 px-4 py-3 backdrop-blur-md",
        )}
        style={{ zIndex: "var(--ds-z-nav)" }}
      >
        <div className="mx-auto w-full max-w-2xl">
          {saved ? (
            /*
             * Confirmação única, e com saída.
             * Antes eram duas: esta barra e um toast, anunciando o mesmo fato
             * em cantos opostos da tela. Ficou só ela — e agora leva à pasta,
             * porque "salvei, e daí?" é a pergunta seguinte de quem acabou de
             * guardar algo.
             */
            <div
              className={cn(
                "flex min-h-[3.25rem] animate-scale-in items-center gap-3",
                "rounded-xl border border-success/30 bg-success-subtle px-4 py-2",
              )}
              role="status"
            >
              <Check size={18} className="shrink-0 text-success" aria-hidden="true" />
              <span className="min-w-0 flex-1 font-semibold text-success">Salvo com sucesso!</span>

              {savedFolderId !== null && (
                <Link
                  to={`/folders/${savedFolderId}`}
                  className={cn(
                    "inline-flex min-h-[2.25rem] shrink-0 items-center gap-1.5 rounded-lg px-3",
                    "text-sm font-semibold text-success underline underline-offset-2",
                    "transition-colors duration-150 hover:bg-success/10",
                  )}
                >
                  Ver na pasta
                  <ChevronRight size={16} aria-hidden="true" />
                </Link>
              )}
            </div>
          ) : (
            <Button
              fullWidth
              size="lg"
              icon={<FolderPlus size={18} />}
              onClick={() => void handleOpenSaveModal()}
            >
              Salvar em pasta
            </Button>
          )}
        </div>
      </div>

      <BottomNav />

      <Dialog
        open={showSaveModal}
        onClose={() => setShowSaveModal(false)}
        title="Salvar em pasta"
        description="Escolha onde guardar este material — ou salve sem pasta e organize depois."
      >
        <div className="flex flex-col gap-5">
          {/*
            A opção "Sem pasta (geral)" saiu daqui.
            Ela prometia "fica na lista de conteúdos", e essa lista não existe
            na interface: a listagem de materiais só é consultada por pasta.
            Salvar sem escolher uma equivalia a arquivar o material onde ele
            nunca mais seria encontrado — cinco dos seis materiais deste banco
            estavam nesse estado. Escolher a pasta agora é parte de salvar, e o
            que já ficou solto aparece em "Sem pasta", na lista de pastas.
          */}

          {loadingFolders ? (
            <SkeletonList count={2} label="Carregando pastas" />
          ) : folders.length === 0 ? (
            <EmptyState
              className="py-4"
              title="Nenhuma pasta ainda"
              description="Crie uma abaixo para começar a organizar."
            />
          ) : (
            <ul className="flex flex-col gap-2" aria-label="Pastas disponíveis">
              {folders.map((folder) => (
                <li key={folder.id}>
                  <button
                    type="button"
                    onClick={() => void handleSave(folder.id)}
                    disabled={busy}
                    aria-label={`Salvar em ${folder.name}`}
                    className={cn(
                      "flex min-h-[3.25rem] w-full items-center gap-3 rounded-xl bg-surface-sunken px-3",
                      "text-left transition-colors duration-150 hover:brightness-95",
                      "disabled:cursor-not-allowed disabled:opacity-55",
                    )}
                  >
                    {/* A cor da pasta vem do banco e não tem contraste
                        garantido: ela só tinge o traço deste ícone decorativo,
                        nunca um texto. O nome ao lado carrega o significado. */}
                    <span
                      className="grid size-9 shrink-0 place-items-center rounded-lg border border-border bg-surface"
                      aria-hidden="true"
                    >
                      <Folder size={18} style={{ color: folder.color }} />
                    </span>

                    <span className="min-w-0 flex-1 truncate font-medium text-text">
                      {folder.name}
                    </span>

                    {savingTo === folder.id && (
                      <span
                        className="size-4 shrink-0 animate-spin rounded-full border-2 border-current border-t-transparent text-accent"
                        aria-hidden="true"
                      />
                    )}
                  </button>
                </li>
              ))}
            </ul>
          )}

          <div className="border-t border-border pt-5">
            {/* Sem `autoFocus`: quem coloca e devolve o foco é o `Dialog`. */}
            <Input
              label="Criar uma pasta nova"
              value={newFolderName}
              onChange={(event) => setNewFolderName(event.target.value)}
              placeholder="Ex.: Biologia, Prova final…"
              className="bg-surface-sunken"
              onKeyDown={(event) => {
                if (event.key === "Enter") void handleCreateAndSave();
              }}
            />

            <Button
              fullWidth
              className="mt-3"
              icon={<FolderPlus size={18} />}
              onClick={() => void handleCreateAndSave()}
              loading={creatingFolder}
              loadingLabel="Criando…"
              disabled={!newFolderName.trim()}
            >
              Criar pasta e salvar
            </Button>
          </div>

          <Button variant="ghost" fullWidth onClick={() => setShowSaveModal(false)}>
            Cancelar
          </Button>
        </div>
      </Dialog>
    </div>
  );
}
