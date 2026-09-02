import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AlertTriangle, ImageIcon, RefreshCcw, Send } from "lucide-react";
import { useCamera } from "../hooks/useCamera";
import { useRouteState } from "../types/navigation";
import { Button, Card, EmptyState } from "../design-system";
import { Navbar } from "../components/Navbar";

/** Cantos de enquadramento. Guia visual, sem função de recorte. */
const FRAME_CORNERS = [
  "top-0 left-0 rounded-tl-xl border-t-2 border-l-2",
  "top-0 right-0 rounded-tr-xl border-t-2 border-r-2",
  "bottom-0 left-0 rounded-bl-xl border-b-2 border-l-2",
  "bottom-0 right-0 rounded-br-xl border-b-2 border-r-2",
];

export function CameraPage() {
  const navigate = useNavigate();
  const { scanError } = useRouteState<"/camera">();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const {
    videoRef,
    state,
    error,
    capturedImage,
    capturedBlob,
    startCamera,
    capturePhoto,
    loadFromGallery,
    reset,
  } = useCamera();

  // Erro devolvido pela ProcessingPage quando a análise falha.
  const [sendError, setSendError] = useState<string>(scanError ?? "");

  useEffect(() => {
    void startCamera();
  }, [startCamera]);

  function handleCapture() {
    capturePhoto();
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setSendError("Por favor, selecione uma imagem válida (JPG, PNG, etc).");
      return;
    }
    setSendError("");
    loadFromGallery(file);
  }

  function handleSend() {
    if (!capturedBlob) return;
    setSendError("");
    void navigate("/processing", { state: { imageBlob: capturedBlob } });
  }

  return (
    <div className="flex min-h-dvh flex-col bg-bg">
      <Navbar title="Câmera" showBack />

      <main id="main-content" className="flex min-h-0 flex-1 flex-col">
        {/* Visor. O preto é literal de propósito: aqui não há superfície de
            interface, e sim a moldura de um vídeo — clarear o fundo conforme o
            tema mudaria a leitura da imagem capturada. */}
        <div className="relative mx-4 mt-4 min-h-0 flex-1 overflow-hidden rounded-2xl border border-border bg-black">
          {(state === "active" || state === "requesting") && (
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              aria-label="Visualização da câmera"
              className="absolute inset-0 size-full object-cover"
            />
          )}

          {state === "captured" && capturedImage && (
            <img
              src={capturedImage}
              alt="Imagem capturada para análise"
              className="absolute inset-0 size-full animate-fade-in object-contain"
            />
          )}

          {state === "requesting" && (
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

          {state === "error" && error && (
            <div className="absolute inset-0 grid place-items-center p-4" role="alert">
              <Card
                elevation="floating"
                padding="none"
                className="max-w-xs animate-scale-in overflow-hidden"
              >
                <EmptyState
                  icon={<AlertTriangle size={26} className="text-danger" />}
                  title="Câmera indisponível"
                  description={error.message}
                  // A saída daqui é o botão de galeria já presente nos
                  // controles, então a `action` só aponta para ele.
                  action={
                    <p className="text-sm text-text-subtle">
                      Você pode usar a galeria para selecionar uma imagem.
                    </p>
                  }
                  className="px-5 py-8"
                />
              </Card>
            </div>
          )}

          {state === "active" && (
            <div
              className="pointer-events-none absolute inset-6 animate-fade-in"
              aria-hidden="true"
            >
              {FRAME_CORNERS.map((corner) => (
                <span key={corner} className={`absolute size-9 border-border-strong ${corner}`} />
              ))}
            </div>
          )}
        </div>

        <div className="flex flex-col gap-4 px-4 pt-5 pb-[calc(1.5rem+env(safe-area-inset-bottom))]">
          {sendError && (
            <p
              role="alert"
              className="flex animate-rise-in items-start gap-2 rounded-xl border border-danger/30 bg-danger-subtle px-4 py-3 text-sm text-danger"
            >
              {/* O ícone acompanha a cor para que o erro não dependa só dela. */}
              <AlertTriangle size={18} className="mt-0.5 shrink-0" aria-hidden="true" />
              {sendError}
            </p>
          )}

          {state === "captured" ? (
            <div className="flex animate-rise-in gap-3">
              <Button
                variant="secondary"
                size="lg"
                onClick={reset}
                icon={<RefreshCcw size={18} />}
                aria-label="Tirar nova foto"
                className="flex-1"
              >
                Refazer
              </Button>
              <Button
                variant="primary"
                size="lg"
                onClick={handleSend}
                icon={<Send size={18} />}
                aria-label="Enviar imagem para análise com IA"
                className="flex-1"
              >
                Analisar
              </Button>
            </div>
          ) : (
            <>
              <p className="min-h-[1.5rem] text-center text-xs text-text-subtle">
                {state === "active" ? "Enquadre o conteúdo e toque para capturar" : ""}
              </p>

              {/* Três colunas para que o obturador fique centrado na tela,
                  independentemente da largura do botão de galeria. */}
              <div className="grid grid-cols-3 items-center">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  aria-label="Selecionar imagem da galeria"
                  className="flex min-h-[2.75rem] flex-col items-center gap-1 justify-self-center rounded-xl px-3 py-2 text-text-muted transition-colors duration-150 hover:bg-surface-sunken hover:text-text"
                >
                  <ImageIcon size={22} aria-hidden="true" />
                  <span className="text-xs font-medium">Galeria</span>
                </button>

                <button
                  type="button"
                  onClick={handleCapture}
                  disabled={state !== "active"}
                  aria-label="Capturar foto"
                  className="group grid size-[4.5rem] place-items-center justify-self-center rounded-full border-[3px] border-border-strong bg-surface transition-transform duration-150 ease-enter active:scale-95 disabled:cursor-not-allowed disabled:opacity-40 disabled:active:scale-100"
                >
                  <span
                    className="size-14 rounded-full bg-accent transition-transform duration-150 ease-enter group-hover:scale-105 group-active:scale-90 group-disabled:scale-100"
                    aria-hidden="true"
                  />
                </button>

                <div aria-hidden="true" />
              </div>
            </>
          )}
        </div>
      </main>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        aria-hidden="true"
        className="sr-only"
        tabIndex={-1}
      />
    </div>
  );
}
