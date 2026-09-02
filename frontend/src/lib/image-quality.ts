/**
 * Medida de nitidez de um quadro capturado.
 *
 * Existe para responder a uma pergunta que o usuário não consegue fazer no
 * celular: "essa foto saiu tremida?". Numa tela de 6 polegadas uma lousa
 * desfocada parece aceitável, mas a IA erra a leitura — e o erro só aparece
 * depois de vinte segundos de processamento. Medir aqui custa milissegundos.
 *
 * O método é a variância do laplaciano: a segunda derivada de uma imagem
 * responde forte nas bordas, e imagem borrada quase não tem borda. Muita
 * variância → contornos definidos; pouca → desfoque.
 *
 * O resultado é heurístico e nunca bloqueia o envio: no máximo avisa.
 */

/**
 * Largura da amostra. Reduzir antes de medir não é só economia: em resolução
 * cheia o ruído do sensor vira "borda" e infla a variância justamente nas
 * fotos ruins, que costumam ser as mais ruidosas.
 */
const SAMPLE_WIDTH = 320;

/**
 * Abaixo disto a imagem é tratada como tremida. Calibrado sobre a amostra de
 * 320px — mudar `SAMPLE_WIDTH` invalida este número.
 */
export const BLUR_THRESHOLD = 55;

/** Coeficientes de luminância da ITU-R BT.601, os mesmos que o JPEG usa. */
function luminance(r: number, g: number, b: number): number {
  return 0.299 * r + 0.587 * g + 0.114 * b;
}

/**
 * Reduz o quadro a uma matriz de luminância. A cor não informa nada sobre
 * foco, e trabalhar em um canal só corta o custo em três.
 */
function toGrayscale(source: CanvasImageSource, sourceWidth: number, sourceHeight: number) {
  const scale = Math.min(1, SAMPLE_WIDTH / sourceWidth);
  const width = Math.max(3, Math.round(sourceWidth * scale));
  const height = Math.max(3, Math.round(sourceHeight * scale));

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;

  // `willReadFrequently` evita que o navegador mantenha a superfície na GPU,
  // de onde cada `getImageData` teria de trazê-la de volta.
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return null;

  ctx.drawImage(source, 0, 0, width, height);

  const { data } = ctx.getImageData(0, 0, width, height);
  const gray = new Float32Array(width * height);
  for (let i = 0, p = 0; i < data.length; i += 4, p++) {
    gray[p] = luminance(data[i] ?? 0, data[i + 1] ?? 0, data[i + 2] ?? 0);
  }

  return { gray, width, height };
}

/**
 * Nitidez do quadro, em variância do laplaciano. Quanto maior, mais definido.
 * Devolve `null` quando não é possível medir (canvas indisponível, quadro sem
 * dimensão) — e nesse caso o chamador simplesmente não avisa nada.
 */
export function measureSharpness(
  source: CanvasImageSource,
  sourceWidth: number,
  sourceHeight: number,
): number | null {
  if (sourceWidth <= 0 || sourceHeight <= 0) return null;

  const sample = toGrayscale(source, sourceWidth, sourceHeight);
  if (!sample) return null;

  const { gray, width, height } = sample;

  // Kernel laplaciano 4-vizinhos. A borda de um pixel é ignorada porque lá o
  // kernel não cabe inteiro.
  let sum = 0;
  let sumOfSquares = 0;
  let count = 0;

  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const i = y * width + x;
      const value =
        4 * (gray[i] ?? 0) -
        (gray[i - 1] ?? 0) -
        (gray[i + 1] ?? 0) -
        (gray[i - width] ?? 0) -
        (gray[i + width] ?? 0);

      sum += value;
      sumOfSquares += value * value;
      count++;
    }
  }

  if (count === 0) return null;

  const mean = sum / count;
  return sumOfSquares / count - mean * mean;
}

/** `true` quando a nitidez medida ficou abaixo do limiar de desfoque. */
export function isBlurry(sharpness: number | null): boolean {
  return sharpness !== null && sharpness < BLUR_THRESHOLD;
}
