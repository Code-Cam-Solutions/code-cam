import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AlertTriangle, Images, RefreshCcw, RotateCcw, SwitchCamera, X, Zap } from "lucide-react";
import { useCamera, type CapturedPhoto } from "@/features/capture/hooks/useCamera";
import { MAX_PHOTOS_PER_SCAN } from "@/features/capture/lib/limits";
import { useRouteState } from "@/shared/lib/navigation";
import { useAccessibility } from "@/shared/context/AccessibilityContext";
import { Button, Card, cn } from "@/design-system";
import { BottomNav } from "@/shared/components/BottomNav";

/** Cantos de enquadramento. Guia visual, sem função de recorte. */
const FRAME_CORNERS = [
  "top-0 left-0 rounded-tl-2xl border-t-2 border-l-2",
  "top-0 right-0 rounded-tr-2xl border-t-2 border-r-2",
  "bottom-0 left-0 rounded-bl-2xl border-b-2 border-l-2",
  "bottom-0 right-0 rounded-br-2xl border-b-2 border-r-2",
];

/** Botão circular sobre o visor: vidro escuro para não sumir na cena filmada. */
const OVERLAY_BUTTON = cn(
  "grid size-12 place-items-center rounded-full",
  "bg-black/45 text-white backdrop-blur-md",
  "border border-white/15",
  "transition-transform duration-150 ease-enter active:scale-90",
  "hover:bg-black/65",
);

export function CameraPage() {
  const navigate = useNavigate();
  const { scanError, photos: existing } = useRouteState<"/camera">();
  const { speak, stopSpeaking } = useAccessibility();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const {
    videoRef,
    status,
    error,
    canSwitchCamera,
    torchSupported,
    torchOn,
    toggleTorch,
    switchCamera,
    retry,
    capturePhoto,
    loadFromFile,
  } = useCamera();

  // Erro devolvido pela tela de processamento quando a análise falha.
  const [pageError, setPageError] = useState(scanError ?? "");
  const [capturing, setCapturing] = useState(false);
  const [flashing, setFlashing] = useState(false);

  /*
   * Narra o estado da câmera para quem não enxerga o visor.
   *
   * Isto já esteve atrás de um botão de "leitura guiada", só nesta tela. Era
   * uma segunda chave para a mesma coisa: `speak` não fala nada quando a
   * leitura em voz alta está desligada em Ajustes, então quem queria ouvir
   * precisava ligar nos dois lugares — e quem só ligava aqui não entendia por
   * que continuava mudo. Agora a narração segue o ajuste do app, como no resto
   * das telas.
   */
  useEffect(() => {
    if (status === "active") {
      speak("Câmera pronta. Enquadre o material e toque no botão de capturar.");
    }
    if (status === "error" && error) {
      speak(error.message);
    }
  }, [status, error, speak]);

  useEffect(() => stopSpeaking, [stopSpeaking]);

  /**
   * Soma a foto nova às que já existem e volta para a conferência.
   *
   * As anteriores chegam pelo estado da rota porque "adicionar outra foto"
   * traz a pessoa de volta a esta tela — sem carregá-las, cada nova captura
   * apagaria as anteriores.
   */
  function goToReview(photo: CapturedPhoto) {
    void navigate("/camera/review", { state: { photos: [...(existing ?? []), photo] } });
  }

  async function handleCapture() {
    if (status !== "active" || capturing) return;

    setCapturing(true);
    setFlashing(true);
    window.setTimeout(() => setFlashing(false), 320);

    try {
      const photo = await capturePhoto();
      if (!photo) {
        setPageError("A câmera ainda não estava pronta. Tente capturar novamente.");
        speak("A câmera ainda não estava pronta.");
        return;
      }
      speak(
        photo.blurry
          ? "Foto capturada, mas parece tremida. Revise antes de enviar."
          : "Foto capturada. Revise antes de enviar.",
      );
      goToReview(photo);
    } finally {
      setCapturing(false);
    }
  }

  async function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    // Limpar o valor permite escolher o mesmo arquivo duas vezes seguidas.
    event.target.value = "";
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setPageError("Selecione uma imagem (JPG, PNG ou WEBP).");
      return;
    }

    setPageError("");
    goToReview(await loadFromFile(file));
  }

  const shutterEnabled = status === "active" && !capturing;

  return (
    <div className="flex min-h-dvh flex-col bg-bg">
      {/* Cabeçalho próprio em vez da Navbar: nesta tela o visor é o conteúdo, e
          os controles precisam flutuar sobre ele. */}
      <header className="flex h-14 shrink-0 items-center justify-between gap-2 px-2 pt-[env(safe-area-inset-top)]">
        <button
          type="button"
          onClick={() => void navigate("/")}
          aria-label="Fechar a câmera e voltar ao início"
          className="grid size-11 place-items-center rounded-full text-text-muted transition-colors duration-150 hover:bg-surface-sunken hover:text-text"
        >
          <X size={22} aria-hidden="true" />
        </button>

        <h1 className="text-lg font-bold text-accent">
          {existing && existing.length > 0
            ? `Foto ${existing.length + 1} de ${MAX_PHOTOS_PER_SCAN}`
            : "CodeCam"}
        </h1>

        {/* Espaçador do tamanho do botão de fechar: com `justify-between` e só
            dois filhos, o título encostaria na borda direita. */}
        <div className="size-11 shrink-0" aria-hidden="true" />
      </header>

      <main id="main-content" className="flex min-h-0 flex-1 flex-col">
        {/* O preto do visor é literal de propósito: não é superfície de
            interface, é a moldura de um vídeo. Clarear conforme o tema
            falsearia a leitura da cena. */}
        <div className="relative mx-4 mt-1 min-h-0 flex-1 overflow-hidden rounded-2xl border border-border bg-black">
          {/* Sempre montado. Renderizá-lo condicionalmente era o que abria a
              janela para o visor preto: o stream chegava antes do elemento. */}
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            aria-label="Visualização da câmera"
            className={cn(
              "absolute inset-0 size-full object-cover transition-opacity duration-300",
              status === "active" ? "opacity-100" : "opacity-0",
            )}
          />

          {status === "requesting" && (
            <div className="absolute inset-0 grid place-items-center p-6" role="status">
              <Card
                elevation="floating"
                padding="md"
                className="flex animate-scale-in items-center gap-3"
              >
                <span
                  className="size-5 shrink-0 animate-spin rounded-full border-2 border-accent border-t-transparent"
                  aria-hidden="true"
                />
                <p className="text-sm font-medium text-text">Iniciando câmera…</p>
              </Card>
            </div>
          )}

          {status === "error" && error && (
            <div className="absolute inset-0 grid place-items-center p-4" role="alert">
              <Card
                elevation="floating"
                padding="lg"
                className="max-w-xs animate-scale-in text-center"
              >
                <span
                  className="mx-auto grid size-12 place-items-center rounded-full bg-danger-subtle text-danger"
                  aria-hidden="true"
                >
                  <AlertTriangle size={24} />
                </span>
                <h2 className="mt-3 text-base font-semibold text-text">{error.message}</h2>
                {error.hint !== undefined && (
                  <p className="mt-1.5 text-sm text-text-muted">{error.hint}</p>
                )}
                <div className="mt-4 flex flex-col gap-2">
                  {/* Permissão negada não se resolve pedindo de novo pelo mesmo
                      botão em todo navegador, mas tentar é barato e resolve o
                      caso comum de ter negado por engano. */}
                  <Button
                    variant="primary"
                    size="md"
                    onClick={retry}
                    icon={<RefreshCcw size={17} />}
                    fullWidth
                  >
                    Tentar novamente
                  </Button>
                  <Button
                    variant="secondary"
                    size="md"
                    onClick={() => fileInputRef.current?.click()}
                    icon={<Images size={17} />}
                    fullWidth
                  >
                    Escolher da galeria
                  </Button>
                </div>
              </Card>
            </div>
          )}

          {status === "active" && (
            <>
              <div
                className="pointer-events-none absolute inset-6 animate-fade-in"
                aria-hidden="true"
              >
                {FRAME_CORNERS.map((corner) => (
                  <span key={corner} className={`absolute size-10 border-white/70 ${corner}`} />
                ))}
              </div>

              {/* O visor inteiro dispara a captura. Um alvo do tamanho da tela
                  é o que torna a foto possível para quem tem pouca precisão
                  motora ou não enxerga o botão. */}
              <button
                type="button"
                onClick={() => void handleCapture()}
                aria-label="Capturar foto tocando no visor"
                className="absolute inset-0 size-full cursor-pointer"
              />

              <p className="pointer-events-none absolute inset-x-4 bottom-4 text-center text-xs font-medium text-white/85 drop-shadow-[0_1px_3px_rgba(0,0,0,0.9)]">
                Toque na tela ou no botão para capturar
              </p>
            </>
          )}

          {torchSupported && status === "active" && (
            <button
              type="button"
              onClick={() => void toggleTorch()}
              aria-pressed={torchOn}
              aria-label="Lanterna"
              className={cn(OVERLAY_BUTTON, "absolute top-3 right-3", torchOn && "bg-accent/90")}
            >
              <Zap size={20} aria-hidden="true" fill={torchOn ? "currentColor" : "none"} />
            </button>
          )}

          {flashing && (
            <span
              className="pointer-events-none absolute inset-0 animate-shutter-flash bg-white"
              aria-hidden="true"
            />
          )}
        </div>

        <div className="flex flex-col gap-4 px-4 pt-4 pb-[calc(6rem+env(safe-area-inset-bottom))]">
          {pageError && (
            <p
              role="alert"
              className="flex animate-rise-in items-start gap-2 rounded-xl border border-danger/30 bg-danger-subtle px-4 py-3 text-sm text-danger"
            >
              {/* O ícone acompanha a cor para que o erro não dependa só dela. */}
              <AlertTriangle size={18} className="mt-0.5 shrink-0" aria-hidden="true" />
              {pageError}
            </p>
          )}

          {/* Três colunas para que o obturador fique no centro da tela,
              independentemente da largura dos botões laterais. */}
          <div className="grid grid-cols-3 items-center">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              aria-label="Escolher imagem da galeria"
              className="flex min-h-[3rem] flex-col items-center gap-1 justify-self-center rounded-xl px-3 py-2 text-text-muted transition-colors duration-150 hover:bg-surface-sunken hover:text-text"
            >
              <Images size={24} aria-hidden="true" />
              <span className="text-2xs font-medium">Galeria</span>
            </button>

            <button
              type="button"
              onClick={() => void handleCapture()}
              disabled={!shutterEnabled}
              aria-label="Capturar foto"
              className={cn(
                "group grid size-[4.75rem] place-items-center justify-self-center rounded-full",
                "border-[3px] border-border-strong bg-surface",
                "transition-transform duration-150 ease-enter active:scale-95",
                "disabled:cursor-not-allowed disabled:opacity-40 disabled:active:scale-100",
              )}
            >
              <span
                className={cn(
                  "size-[3.5rem] rounded-full bg-accent shadow-accent",
                  "transition-transform duration-150 ease-enter",
                  "group-hover:scale-105 group-active:scale-90 group-disabled:scale-100",
                )}
                aria-hidden="true"
              />
            </button>

            {canSwitchCamera ? (
              <button
                type="button"
                onClick={switchCamera}
                aria-label="Alternar entre câmera frontal e traseira"
                className="flex min-h-[3rem] flex-col items-center gap-1 justify-self-center rounded-xl px-3 py-2 text-text-muted transition-colors duration-150 hover:bg-surface-sunken hover:text-text"
              >
                <SwitchCamera size={24} aria-hidden="true" />
                <span className="text-2xs font-medium">Virar</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={retry}
                aria-label="Reiniciar a câmera"
                className="flex min-h-[3rem] flex-col items-center gap-1 justify-self-center rounded-xl px-3 py-2 text-text-muted transition-colors duration-150 hover:bg-surface-sunken hover:text-text"
              >
                <RotateCcw size={24} aria-hidden="true" />
                <span className="text-2xs font-medium">Reiniciar</span>
              </button>
            )}
          </div>
        </div>
      </main>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={(event) => void handleFileChange(event)}
        aria-hidden="true"
        className="sr-only"
        tabIndex={-1}
      />

      <BottomNav />
    </div>
  );
}
