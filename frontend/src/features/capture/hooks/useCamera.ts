import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { isBlurry, measureSharpness } from "@/features/capture/lib/image-quality";
import { createThumbnail } from "@/features/capture/lib/thumbnail";

export type CameraStatus = "requesting" | "active" | "error";
export type FacingMode = "environment" | "user";

export type CameraErrorType = "permission" | "not-found" | "not-supported" | "in-use" | "unknown";

export interface CameraError {
  type: CameraErrorType;
  message: string;
  /** O que o usuário pode fazer a respeito. Vazio quando não há saída óbvia. */
  hint?: string;
}

export interface CapturedPhoto {
  blob: Blob;
  /** Object URL para exibir a prévia. Quem consome é responsável por revogar. */
  url: string;
  width: number;
  height: number;
  /** Variância do laplaciano; `null` quando não foi possível medir. */
  sharpness: number | null;
  blurry: boolean;
  /**
   * Miniatura em data URL, guardada junto do material salvo. `null` quando não
   * foi possível gerar — o que nunca impede o material de ser salvo.
   *
   * Existe separada de `url` porque aquela é um object URL: vive só enquanto a
   * aba está aberta e não sobrevive a um recarregamento, quanto mais ao banco.
   */
  thumbnail: string | null;
}

const ERRORS: Record<CameraErrorType, Omit<CameraError, "type">> = {
  permission: {
    message: "O acesso à câmera foi negado.",
    hint: "Toque no ícone de câmera na barra de endereços do navegador e permita o acesso a este site.",
  },
  "not-found": {
    message: "Nenhuma câmera foi encontrada neste aparelho.",
    hint: "Você ainda pode escolher uma foto da galeria.",
  },
  "not-supported": {
    message: "Este navegador não permite abrir a câmera.",
    hint: "A câmera exige uma conexão segura (https). Tente pelo Chrome ou Safari atualizados.",
  },
  "in-use": {
    message: "A câmera está sendo usada por outro aplicativo.",
    hint: "Feche o outro aplicativo ou aba que está com a câmera aberta e tente de novo.",
  },
  unknown: {
    message: "Não foi possível abrir a câmera.",
    hint: "Tente novamente ou escolha uma foto da galeria.",
  },
};

/**
 * Traduz a exceção do `getUserMedia` para algo que o usuário consiga agir.
 * Os nomes vêm da especificação de Media Capture; os antigos (`*DeniedError`)
 * ainda aparecem em navegadores mais velhos.
 */
function toCameraError(err: unknown): CameraError {
  const name = err instanceof DOMException ? err.name : "";

  const type: CameraErrorType =
    name === "NotAllowedError" || name === "PermissionDeniedError"
      ? "permission"
      : name === "NotFoundError" || name === "DevicesNotFoundError"
        ? "not-found"
        : name === "NotReadableError" || name === "TrackStartError"
          ? "in-use"
          : "unknown";

  return { type, ...ERRORS[type] };
}

function canvasToBlob(canvas: HTMLCanvasElement, quality: number): Promise<Blob | null> {
  return new Promise((resolve) => {
    canvas.toBlob(resolve, "image/jpeg", quality);
  });
}

/**
 * Acesso à câmera do aparelho.
 *
 * Duas decisões explicam o formato deste hook, e as duas nasceram do mesmo
 * defeito: a prévia e a foto saíam pretas.
 *
 * 1. O stream mora em estado do React, não em uma ref, e um efeito o liga ao
 *    elemento de vídeo. Na versão anterior o `srcObject` era atribuído dentro
 *    do `await` do `getUserMedia`, sob um `if (videoRef.current)` — e o vídeo
 *    só era montado quando o estado virava "requesting". Quando o React ainda
 *    não tinha aplicado esse render, a ref estava nula, a atribuição era
 *    silenciosamente pulada e o visor ficava preto para sempre. Amarrar a
 *    ligação a um efeito remove a corrida: o efeito só roda depois do commit,
 *    quando o elemento existe de verdade.
 *
 * 2. `active` só é anunciado quando o vídeo tem quadro decodificado
 *    (`readyState >= HAVE_CURRENT_DATA` e dimensão conhecida). Desenhar um
 *    vídeo antes disso em um canvas não falha: pinta um retângulo preto. Era
 *    de onde vinha a foto preta.
 */
export function useCamera() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [status, setStatus] = useState<CameraStatus>("requesting");
  const [error, setError] = useState<CameraError | null>(null);
  const [facingMode, setFacingMode] = useState<FacingMode>("environment");
  const [deviceCount, setDeviceCount] = useState(0);
  const [torchOn, setTorchOn] = useState(false);
  /** Incrementado por `retry()` para forçar o efeito a pedir a câmera de novo. */
  const [attempt, setAttempt] = useState(0);

  // ─── Abertura do stream ──────────────────────────────────────────────────
  useEffect(() => {
    if (!navigator.mediaDevices?.getUserMedia) {
      setError({ type: "not-supported", ...ERRORS["not-supported"] });
      setStatus("error");
      return;
    }

    // O StrictMode monta, desmonta e remonta o componente em desenvolvimento.
    // Sem esta bandeira o stream da primeira montagem ficaria aberto para
    // sempre, prendendo a câmera e fazendo a segunda tentativa devolver quadros
    // pretos em alguns aparelhos.
    let cancelled = false;
    let opened: MediaStream | null = null;

    setStatus("requesting");
    setError(null);

    async function open() {
      try {
        // `ideal` e não `exact`: em notebook não existe câmera traseira, e
        // `exact` faria a chamada falhar em vez de cair na câmera disponível.
        const media = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: facingMode },
            width: { ideal: 1920 },
            height: { ideal: 1080 },
          },
          audio: false,
        });

        if (cancelled) {
          media.getTracks().forEach((track) => track.stop());
          return;
        }

        opened = media;
        setStream(media);

        // A lista de dispositivos só traz rótulos e entradas completas depois
        // de uma permissão concedida — por isso é consultada aqui, e não antes.
        try {
          const devices = await navigator.mediaDevices.enumerateDevices();
          if (!cancelled) {
            setDeviceCount(devices.filter((d) => d.kind === "videoinput").length);
          }
        } catch {
          // Enumeração indisponível: o botão de virar a câmera some, e só.
        }
      } catch (err) {
        if (cancelled) return;
        setError(toCameraError(err));
        setStatus("error");
      }
    }

    void open();

    return () => {
      cancelled = true;
      opened?.getTracks().forEach((track) => track.stop());
      setStream(null);
      setTorchOn(false);
    };
  }, [facingMode, attempt]);

  // ─── Ligação do stream ao elemento de vídeo ──────────────────────────────
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !stream) return;

    video.srcObject = stream;

    function markReady() {
      // `videoWidth` é o sinal honesto de que existe quadro: `readyState`
      // sozinho já valeu 2 com dimensão zero em Safari.
      if (video && video.videoWidth > 0 && video.videoHeight > 0) {
        setStatus("active");
      }
    }

    video.addEventListener("loadedmetadata", markReady);
    video.addEventListener("loadeddata", markReady);
    video.addEventListener("canplay", markReady);

    // `play()` rejeita quando o navegador bloqueia autoplay — raro num vídeo
    // mudo e `playsInline`, e inofensivo, porque o primeiro quadro já foi
    // decodificado de qualquer forma. O `Promise.resolve` cobre os navegadores
    // antigos em que `play()` não devolve promessa nenhuma.
    void Promise.resolve(video.play()).catch(() => undefined);

    // O stream pode já estar pronto quando o efeito roda (troca de câmera
    // reaproveitando o elemento), e aí nenhum evento novo dispara.
    markReady();

    return () => {
      video.removeEventListener("loadedmetadata", markReady);
      video.removeEventListener("loadeddata", markReady);
      video.removeEventListener("canplay", markReady);
      video.srcObject = null;
    };
  }, [stream]);

  // ─── Lanterna ────────────────────────────────────────────────────────────
  const torchSupported = useMemo(() => {
    const track = stream?.getVideoTracks()[0];
    if (!track?.getCapabilities) return false;
    return track.getCapabilities().torch === true;
  }, [stream]);

  const toggleTorch = useCallback(async () => {
    const track = stream?.getVideoTracks()[0];
    if (!track) return;

    const next = !torchOn;
    try {
      await track.applyConstraints({ advanced: [{ torch: next }] });
      setTorchOn(next);
    } catch {
      // Aparelho recusou a lanterna: o botão volta ao estado anterior sozinho.
    }
  }, [stream, torchOn]);

  // ─── Ações ───────────────────────────────────────────────────────────────
  const retry = useCallback(() => {
    setAttempt((value) => value + 1);
  }, []);

  const switchCamera = useCallback(() => {
    setFacingMode((current) => (current === "environment" ? "user" : "environment"));
  }, []);

  /**
   * Congela o quadro atual em um JPEG. Devolve `null` quando ainda não há
   * quadro — o que o botão de captura já evita, por ficar desabilitado fora
   * do estado `active`.
   */
  const capturePhoto = useCallback(async (): Promise<CapturedPhoto | null> => {
    const video = videoRef.current;
    if (!video || video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) return null;

    const width = video.videoWidth;
    const height = video.videoHeight;
    if (width === 0 || height === 0) return null;

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext("2d");
    if (!ctx) return null;

    ctx.drawImage(video, 0, 0, width, height);

    // 0.92 em vez dos 0.85 anteriores: o texto de lousa é fino e de baixo
    // contraste, e o artefato do JPEG come exatamente esse traço — que é o
    // único dado que a IA tem para ler.
    const blob = await canvasToBlob(canvas, 0.92);
    if (!blob) return null;

    const sharpness = measureSharpness(canvas, width, height);

    return {
      blob,
      url: URL.createObjectURL(blob),
      width,
      height,
      sharpness,
      blurry: isBlurry(sharpness),
      thumbnail: createThumbnail(canvas, width, height),
    };
  }, []);

  /** Mesma forma de resultado da captura, para uma imagem vinda da galeria. */
  const loadFromFile = useCallback(async (file: File): Promise<CapturedPhoto> => {
    const url = URL.createObjectURL(file);
    const image = new Image();

    const measured = await new Promise<{
      sharpness: number | null;
      thumbnail: string | null;
      w: number;
      h: number;
    }>((resolve) => {
      image.onload = () => {
        const { naturalWidth: w, naturalHeight: h } = image;
        resolve({
          sharpness: measureSharpness(image, w, h),
          thumbnail: createThumbnail(image, w, h),
          w,
          h,
        });
      };
      // Imagem que não decodifica segue adiante sem medição: o backend ainda
      // vai recusá-la com uma mensagem melhor do que qualquer palpite daqui.
      image.onerror = () => {
        resolve({ sharpness: null, thumbnail: null, w: 0, h: 0 });
      };
      image.src = url;
    });

    return {
      blob: file,
      url,
      width: measured.w,
      height: measured.h,
      sharpness: measured.sharpness,
      blurry: isBlurry(measured.sharpness),
      thumbnail: measured.thumbnail,
    };
  }, []);

  return {
    videoRef,
    status,
    error,
    facingMode,
    /** A troca de câmera só faz sentido quando existe mais de uma. */
    canSwitchCamera: deviceCount > 1,
    torchSupported,
    torchOn,
    toggleTorch,
    switchCamera,
    retry,
    capturePhoto,
    loadFromFile,
  };
}
