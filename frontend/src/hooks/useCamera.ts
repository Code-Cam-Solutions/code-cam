import { useRef, useState, useCallback } from "react";

export type CameraState =
  | "idle"
  | "requesting"
  | "active"
  | "captured"
  | "error";

export interface CameraError {
  type: "permission" | "not-found" | "not-supported" | "unknown";
  message: string;
}

export function useCamera() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [state, setState] = useState<CameraState>("idle");
  const [error, setCameraError] = useState<CameraError | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [capturedBlob, setCapturedBlob] = useState<Blob | null>(null);

  const startCamera = useCallback(async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraError({
        type: "not-supported",
        message:
          "Seu navegador não suporta acesso à câmera. Tente usar Chrome ou Safari atualizados.",
      });
      setState("error");
      return;
    }

    setState("requesting");
    setCameraError(null);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: "environment" },
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
        audio: false,
      });

      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }

      setState("active");
    } catch (err) {
      let cameraError: CameraError;

      if (err instanceof DOMException) {
        if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError") {
          cameraError = {
            type: "permission",
            message:
              "Acesso à câmera negado. Toque no ícone de câmera na barra de endereços e permita o acesso.",
          };
        } else if (
          err.name === "NotFoundError" ||
          err.name === "DevicesNotFoundError"
        ) {
          cameraError = {
            type: "not-found",
            message:
              "Nenhuma câmera encontrada. Verifique se seu dispositivo possui câmera.",
          };
        } else {
          cameraError = {
            type: "unknown",
            message: `Erro ao acessar câmera: ${err.message}`,
          };
        }
      } else {
        cameraError = {
          type: "unknown",
          message: "Erro desconhecido ao acessar câmera.",
        };
      }

      setCameraError(cameraError);
      setState("error");
    }
  }, []);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setState("idle");
  }, []);

  const capturePhoto = useCallback((): Blob | null => {
    if (!videoRef.current) return null;

    const canvas = document.createElement("canvas");
    const video = videoRef.current;
    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;

    const ctx = canvas.getContext("2d");
    if (!ctx) return null;

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
    setCapturedImage(dataUrl);
    setState("captured");

    // Convert to blob
    const base64Data = dataUrl.split(",")[1];
    const binaryStr = atob(base64Data);
    const bytes = new Uint8Array(binaryStr.length);
    for (let i = 0; i < binaryStr.length; i++) {
      bytes[i] = binaryStr.charCodeAt(i);
    }
    const blob = new Blob([bytes], { type: "image/jpeg" });
    setCapturedBlob(blob);
    stopCamera();
    return blob;
  }, [stopCamera]);

  const loadFromGallery = useCallback((file: File): Blob => {
    const url = URL.createObjectURL(file);
    setCapturedImage(url);
    setCapturedBlob(file);
    setState("captured");
    stopCamera();
    return file;
  }, [stopCamera]);

  const reset = useCallback(() => {
    setCapturedImage(null);
    setCapturedBlob(null);
    setCameraError(null);
    setState("idle");
  }, []);

  return {
    videoRef,
    state,
    error,
    capturedImage,
    capturedBlob,
    startCamera,
    stopCamera,
    capturePhoto,
    loadFromGallery,
    reset,
  };
}
