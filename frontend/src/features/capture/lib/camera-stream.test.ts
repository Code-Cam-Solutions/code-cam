import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  __reiniciarParaTeste,
  encerrarCamera,
  liberarCamera,
  obterCamera,
} from "@/features/capture/lib/camera-stream";

/** Trilha de vídeo falsa que registra se foi parada, como a real faria. */
function criarTrilha() {
  return {
    kind: "video",
    readyState: "live" as "live" | "ended",
    stop: vi.fn(function (this: { readyState: string }) {
      this.readyState = "ended";
    }),
  };
}

/** O primeiro vídeo do stream. Evita `[trilha] = ...`, que o TS vê como opcional. */
function trilhaDe(stream: MediaStream) {
  const [trilha] = stream.getVideoTracks();
  if (!trilha) throw new Error("stream de teste sem trilha de vídeo");
  return trilha;
}

function criarStream() {
  const trilha = criarTrilha();
  return {
    trilha,
    stream: {
      getTracks: () => [trilha],
      getVideoTracks: () => [trilha],
    } as unknown as MediaStream,
  };
}

let getUserMedia: ReturnType<typeof vi.fn>;

beforeEach(() => {
  vi.useFakeTimers();
  getUserMedia = vi.fn(() => Promise.resolve(criarStream().stream));
  Object.defineProperty(navigator, "mediaDevices", {
    value: { getUserMedia },
    configurable: true,
    writable: true,
  });
});

afterEach(() => {
  __reiniciarParaTeste();
  vi.useRealTimers();
});

describe("dono do stream da câmera", () => {
  it("reaproveita o stream aberto em vez de pedir a câmera de novo", async () => {
    const primeiro = await obterCamera("environment");
    const segundo = await obterCamera("environment");

    expect(segundo).toBe(primeiro);
    expect(getUserMedia).toHaveBeenCalledTimes(1);
  });

  /*
   * O caso que originou o módulo: `/camera` → `/camera/review` → `/camera`.
   * Cada volta remontava o componente, e a versão anterior parava as trilhas
   * na saída — o que no Safari do iPhone custa um prompt de permissão por
   * foto, porque parar a última trilha encerra a sessão de captura.
   */
  it("sobrevive à ida e volta entre as telas de captura, sem pedir permissão outra vez", async () => {
    const original = await obterCamera("environment");

    liberarCamera(); // o CameraPage desmontou ao ir para "revisar"
    vi.advanceTimersByTime(5_000); // o usuário olhou a foto
    const devolvido = await obterCamera("environment"); // e voltou para tirar outra

    expect(devolvido).toBe(original);
    expect(getUserMedia).toHaveBeenCalledTimes(1);
  });

  it("encerra o stream quando a carência passa sem ninguém pedi-lo de volta", async () => {
    const stream = await obterCamera("environment");
    const trilha = trilhaDe(stream);

    liberarCamera();
    expect(trilha.readyState).toBe("live"); // ainda em carência

    vi.advanceTimersByTime(30_000);
    expect(trilha.readyState).toBe("ended");
  });

  it("abre um stream novo depois de a carência ter encerrado o anterior", async () => {
    await obterCamera("environment");
    liberarCamera();
    vi.advanceTimersByTime(30_000);

    await obterCamera("environment");
    expect(getUserMedia).toHaveBeenCalledTimes(2);
  });

  /*
   * Dois streams simultâneos prendem a câmera em vários aparelhos: o anterior
   * precisa morrer antes de o novo nascer.
   */
  it("troca de câmera encerra a anterior antes de abrir a nova", async () => {
    const traseira = await obterCamera("environment");
    const trilhaTraseira = trilhaDe(traseira);

    const frontal = await obterCamera("user");

    expect(trilhaTraseira.readyState).toBe("ended");
    expect(frontal).not.toBe(traseira);
    expect(getUserMedia).toHaveBeenCalledTimes(2);
  });

  it("não reaproveita um stream cujas trilhas já morreram", async () => {
    const stream = await obterCamera("environment");
    stream.getVideoTracks().forEach((trilha) => trilha.stop());

    const novo = await obterCamera("environment");

    expect(novo).not.toBe(stream);
    expect(getUserMedia).toHaveBeenCalledTimes(2);
  });

  it("encerrar cancela a carência pendente, sem parar o stream seguinte", async () => {
    await obterCamera("environment");
    liberarCamera();
    encerrarCamera();

    const novo = await obterCamera("environment");
    const trilha = trilhaDe(novo);

    vi.advanceTimersByTime(30_000);
    expect(trilha.readyState).toBe("live");
  });
});
