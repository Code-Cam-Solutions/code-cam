import { act, render, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { __reiniciarParaTeste } from "@/features/capture/lib/camera-stream";
import { useCamera } from "./useCamera";

/**
 * Estes testes existem por causa de um defeito concreto: a prévia e a foto
 * saíam pretas. As duas causas — o stream nunca chegar ao elemento de vídeo e o
 * canvas ser desenhado antes de existir quadro — são invisíveis em revisão de
 * código e caras de reproduzir na mão, porque dependem da ordem em que o React
 * aplica o render e de quando o navegador decodifica o primeiro quadro.
 */

interface FakeTrack {
  kind: string;
  readyState: "live" | "ended";
  stop: ReturnType<typeof vi.fn>;
  getCapabilities: () => MediaTrackCapabilities;
  applyConstraints: ReturnType<typeof vi.fn>;
}

function fakeStream(): { stream: MediaStream; track: FakeTrack } {
  const track: FakeTrack = {
    kind: "video",
    readyState: "live",
    stop: vi.fn(function (this: FakeTrack) {
      this.readyState = "ended";
    }),
    getCapabilities: () => ({}),
    applyConstraints: vi.fn(() => Promise.resolve()),
  };

  const stream = {
    getTracks: () => [track],
    getVideoTracks: () => [track],
  } as unknown as MediaStream;

  return { stream, track };
}

/** Deixa o elemento de vídeo declarar que já tem um quadro decodificado. */
function pretendFrameIsReady(video: HTMLVideoElement, width = 1280, height = 720) {
  Object.defineProperty(video, "videoWidth", { value: width, configurable: true });
  Object.defineProperty(video, "videoHeight", { value: height, configurable: true });
  Object.defineProperty(video, "readyState", {
    value: HTMLMediaElement.HAVE_CURRENT_DATA,
    configurable: true,
  });
}

/** Expõe o retorno do hook para a asserção sem envolvê-lo em um provider. */
type CameraApi = ReturnType<typeof useCamera>;

function Harness({ onRender }: { onRender: (api: CameraApi) => void }) {
  const camera = useCamera();
  onRender(camera);
  // `muted` reproduz o vídeo real da tela de captura — e é o que dispensa
  // a faixa de legendas que a regra de acessibilidade exigiria.
  return <video ref={camera.videoRef} muted data-testid="viewfinder" />;
}

let getUserMedia: ReturnType<typeof vi.fn>;

beforeEach(() => {
  getUserMedia = vi.fn(() => Promise.resolve(fakeStream().stream));

  Object.defineProperty(navigator, "mediaDevices", {
    configurable: true,
    writable: true,
    value: {
      getUserMedia,
      enumerateDevices: vi.fn(() =>
        Promise.resolve([{ kind: "videoinput" }, { kind: "videoinput" }]),
      ),
    },
  });

  // jsdom não reproduz mídia; sem isto cada montagem despeja um "not
  // implemented" no console do teste.
  vi.spyOn(HTMLMediaElement.prototype, "play").mockResolvedValue(undefined);
});

afterEach(() => {
  // O stream vive em módulo, fora do React: sem isto um teste entregaria a
  // câmera já aberta ao seguinte.
  __reiniciarParaTeste();
  vi.restoreAllMocks();
});

describe("useCamera", () => {
  it("liga o stream ao elemento de vídeo assim que ele é concedido", async () => {
    const { stream } = fakeStream();
    getUserMedia.mockResolvedValue(stream);

    const { getByTestId } = render(<Harness onRender={() => undefined} />);
    const video = getByTestId("viewfinder") as HTMLVideoElement;

    // O defeito original: o `srcObject` era atribuído dentro do `await`, sob um
    // `if` na ref, e ficava nulo quando o React ainda não tinha montado o vídeo.
    await waitFor(() => {
      expect(video.srcObject).toBe(stream);
    });
  });

  it("só se declara ativa quando o vídeo tem dimensão conhecida", async () => {
    let api!: CameraApi;
    const { getByTestId } = render(
      <Harness
        onRender={(camera) => {
          api = camera;
        }}
      />,
    );
    const video = getByTestId("viewfinder") as HTMLVideoElement;

    await waitFor(() => {
      expect(video.srcObject).not.toBeNull();
    });

    // Stream concedido, mas ainda sem quadro: anunciar "ativa" aqui liberaria o
    // obturador cedo demais, e a captura sairia preta.
    expect(api.status).toBe("requesting");

    pretendFrameIsReady(video);
    act(() => {
      video.dispatchEvent(new Event("loadeddata"));
    });

    await waitFor(() => {
      expect(api.status).toBe("active");
    });
  });

  it("recusa capturar enquanto não houver quadro decodificado", async () => {
    let api!: CameraApi;
    render(
      <Harness
        onRender={(camera) => {
          api = camera;
        }}
      />,
    );

    await waitFor(() => {
      expect(getUserMedia).toHaveBeenCalled();
    });

    // `readyState` 0 e `videoWidth` 0: desenhar isso num canvas não falha,
    // devolve um retângulo preto. O guard é o que impede a foto vazia.
    await expect(api.capturePhoto()).resolves.toBeNull();
  });

  /*
   * Este teste já afirmou o contrário: que desmontar parava as trilhas na
   * hora. Parava mesmo — e custava um pedido de permissão por foto no Safari
   * do iPhone, porque parar a última trilha encerra a sessão de captura e o
   * `getUserMedia` seguinte volta a perguntar. Como o fluxo de várias fotos é
   * `/camera` → `/camera/review` → `/camera`, o incômodo aparecia a cada volta.
   *
   * O stream agora vive em `camera-stream.ts` e é devolvido, não encerrado.
   * Quem garante que ele não fica ligado para sempre é aquele módulo, coberto
   * pelos próprios testes: carência, saída da aba e troca de câmera.
   */
  it("devolve a câmera ao desmontar sem encerrá-la, para a tela seguinte reaproveitar", async () => {
    const { stream, track } = fakeStream();
    getUserMedia.mockResolvedValue(stream);

    const { unmount } = render(<Harness onRender={() => undefined} />);
    await waitFor(() => {
      expect(getUserMedia).toHaveBeenCalled();
    });

    unmount();

    expect(track.stop).not.toHaveBeenCalled();

    // E remontar não pede a câmera de novo: é o mesmo stream de volta.
    render(<Harness onRender={() => undefined} />);
    await waitFor(() => {
      expect(getUserMedia).toHaveBeenCalledTimes(1);
    });
  });

  it("traduz a permissão negada em instrução acionável", async () => {
    getUserMedia.mockRejectedValue(new DOMException("denied", "NotAllowedError"));

    let api!: CameraApi;
    render(
      <Harness
        onRender={(camera) => {
          api = camera;
        }}
      />,
    );

    await waitFor(() => {
      expect(api.status).toBe("error");
    });

    expect(api.error?.type).toBe("permission");
    expect(api.error?.hint).toMatch(/barra de endereços/i);
  });

  it("reconhece o aparelho sem câmera sem tratá-lo como falha de permissão", async () => {
    getUserMedia.mockRejectedValue(new DOMException("none", "NotFoundError"));

    let api!: CameraApi;
    render(
      <Harness
        onRender={(camera) => {
          api = camera;
        }}
      />,
    );

    await waitFor(() => {
      expect(api.error?.type).toBe("not-found");
    });
    expect(api.error?.hint).toMatch(/galeria/i);
  });
});
