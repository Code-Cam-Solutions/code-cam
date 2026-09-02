import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ImageIcon, RefreshCcw, Send, AlertTriangle } from "lucide-react";
import { useCamera } from "../hooks/useCamera";
import { useRouteState } from "../types/navigation";
import { Navbar } from "../components/Navbar";
import { Button } from "../components/Button";

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

  // Error passed back from ProcessingPage on failure
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
    // Navigate to ProcessingPage passing the blob via state
    void navigate("/processing", { state: { imageBlob: capturedBlob } });
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: "#000" }}>
      <div style={{ backgroundColor: "var(--color-background)" }}>
        <Navbar title="Câmera" showBack />
      </div>

      <main className="flex-1 flex flex-col" id="main-content">
        {/* Camera / Preview area */}
        <div className="flex-1 relative bg-black flex items-center justify-center overflow-hidden">
          {/* Video feed */}
          {(state === "active" || state === "requesting") && (
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              aria-label="Visualização da câmera"
              className="w-full h-full object-cover"
              style={{ maxHeight: "calc(100vh - 200px)" }}
            />
          )}

          {/* Captured image */}
          {state === "captured" && capturedImage && (
            <img
              src={capturedImage}
              alt="Imagem capturada para análise"
              className="w-full h-full object-contain animate-fade-in"
              style={{ maxHeight: "calc(100vh - 200px)" }}
            />
          )}

          {/* Loading state */}
          {state === "requesting" && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/60">
              <div className="text-center">
                <div className="w-10 h-10 border-2 border-codecam border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                <p className="text-white" style={{ fontSize: "var(--text-sm)" }}>
                  Iniciando câmera...
                </p>
              </div>
            </div>
          )}

          {/* Error state */}
          {state === "error" && error && (
            <div className="absolute inset-0 flex items-center justify-center p-6" role="alert">
              <div
                className="p-6 rounded-2xl text-center max-w-xs"
                style={{ backgroundColor: "var(--color-surface)" }}
              >
                <AlertTriangle
                  size={40}
                  className="mx-auto mb-3"
                  style={{ color: "var(--color-error)" }}
                  aria-hidden="true"
                />
                <p
                  className="text-white font-semibold mb-2"
                  style={{ fontSize: "var(--text-base)" }}
                >
                  Câmera indisponível
                </p>
                <p
                  style={{
                    color: "var(--color-text-muted)",
                    fontSize: "var(--text-sm)",
                    lineHeight: "1.6",
                  }}
                >
                  {error.message}
                </p>
                <p
                  className="mt-3"
                  style={{ color: "var(--color-text-muted)", fontSize: "var(--text-sm)" }}
                >
                  Você pode usar a galeria para selecionar uma imagem.
                </p>
              </div>
            </div>
          )}

          {/* Viewfinder overlay */}
          {state === "active" && (
            <div className="absolute inset-0 pointer-events-none">
              <div
                className="absolute inset-8 border-2 border-white/20 rounded-2xl"
                aria-hidden="true"
              />
            </div>
          )}
        </div>

        {/* Controls */}
        <div
          className="px-4 py-6 flex flex-col gap-4"
          style={{ backgroundColor: "var(--color-background)" }}
        >
          {sendError && (
            <p
              role="alert"
              className="text-center px-4 py-2 rounded-xl"
              style={{
                color: "var(--color-error)",
                backgroundColor: "var(--color-error)" + "20",
                fontSize: "var(--text-sm)",
              }}
            >
              {sendError}
            </p>
          )}

          {state === "captured" ? (
            <div className="flex gap-3">
              <Button
                variant="secondary"
                size="lg"
                onClick={reset}
                icon={<RefreshCcw size={18} aria-hidden="true" />}
                aria-label="Tirar nova foto"
                className="flex-1"
              >
                Refazer
              </Button>
              <Button
                variant="primary"
                size="lg"
                onClick={handleSend}
                icon={<Send size={18} aria-hidden="true" />}
                aria-label="Enviar imagem para análise com IA"
                className="flex-1"
              >
                Analisar
              </Button>
            </div>
          ) : (
            <div className="flex items-center justify-center gap-6">
              {/* Gallery button */}
              <button
                onClick={() => fileInputRef.current?.click()}
                aria-label="Selecionar imagem da galeria"
                className="flex flex-col items-center gap-1 p-3 rounded-xl transition-colors hover:bg-surface-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-codecam"
                style={{ color: "var(--color-text-muted)" }}
              >
                <ImageIcon size={24} aria-hidden="true" />
                <span style={{ fontSize: "var(--text-xs)" }}>Galeria</span>
              </button>

              {/* Shutter button */}
              <button
                onClick={handleCapture}
                disabled={state !== "active"}
                aria-label="Capturar foto"
                className="w-18 h-18 rounded-full border-4 border-white flex items-center justify-center transition-all active:scale-95 disabled:opacity-40 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white"
                style={{
                  width: "72px",
                  height: "72px",
                  backgroundColor: "white",
                }}
              >
                <div
                  className="w-14 h-14 rounded-full"
                  style={{
                    width: "56px",
                    height: "56px",
                    backgroundColor: state === "active" ? "white" : "var(--color-text-muted)",
                  }}
                  aria-hidden="true"
                />
              </button>

              {/* Spacer */}
              <div className="w-16" aria-hidden="true" />
            </div>
          )}
        </div>
      </main>

      {/* Hidden file input */}
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
