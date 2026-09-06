/**
 * Miniatura da foto capturada, para guardar junto do material salvo.
 *
 * A foto original vai para a IA e é descartada; a miniatura é o que fica no
 * banco e reaparece quando o estudante abre o material semanas depois. Sem ela
 * a pasta guarda um resumo órfão, sem a lousa que o originou.
 *
 * Por que não guardar a foto original:
 *
 * - Um JPEG de 1920×1080 a 92% pesa ~500 KB, e vira ~670 KB em base64. Vinte
 *   materiais salvos são 13 MB no banco e na resposta da API.
 * - O corpo JSON do Nest tem teto de 100 KB por padrão. A foto inteira seria
 *   recusada com 413 antes de chegar ao banco.
 *
 * A 800px de largura o texto de uma lousa continua reconhecível para quem quer
 * lembrar de que aula se trata — que é a função da miniatura. Reler o conteúdo
 * é papel do texto extraído, não da imagem.
 */

/** Maior dimensão da miniatura, em pixels. */
const MAX_EDGE = 800;

/**
 * Qualidade do JPEG. Mais baixa que a da foto enviada à IA de propósito: aqui
 * o artefato não custa leitura, custa só nitidez de lembrança.
 */
const QUALITY = 0.7;

/** Teto do que o backend aceita, com folga. Acima disso, desiste da miniatura. */
const MAX_DATA_URL_CHARS = 400_000;

/**
 * Reduz a imagem preservando a proporção. Imagem menor que o limite não é
 * ampliada: esticar não acrescenta informação e só engorda o resultado.
 */
function scaledSize(width: number, height: number) {
  const longest = Math.max(width, height);
  const scale = longest > MAX_EDGE ? MAX_EDGE / longest : 1;
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  };
}

/**
 * Devolve a miniatura como data URL, ou `null` quando não dá para gerar.
 *
 * Falhar aqui nunca impede o material de ser salvo — perder a miniatura é
 * aceitável, perder o resumo não é. Por isso o retorno é opcional e todo erro
 * vira `null` em vez de exceção.
 */
export function createThumbnail(
  source: CanvasImageSource,
  sourceWidth: number,
  sourceHeight: number,
): string | null {
  if (sourceWidth <= 0 || sourceHeight <= 0) return null;

  try {
    const { width, height } = scaledSize(sourceWidth, sourceHeight);

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext("2d");
    if (!ctx) return null;

    // A redução do navegador é bilinear e borra texto fino. `imageSmoothing`
    // em qualidade alta usa uma reamostragem melhor, e é grátis aqui.
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(source, 0, 0, width, height);

    const dataUrl = canvas.toDataURL("image/jpeg", QUALITY);
    return dataUrl.length <= MAX_DATA_URL_CHARS ? dataUrl : null;
  } catch {
    // Canvas contaminado por imagem de outra origem, memória insuficiente:
    // em qualquer caso, seguir sem miniatura.
    return null;
  }
}

export { MAX_EDGE as THUMBNAIL_MAX_EDGE, MAX_DATA_URL_CHARS as THUMBNAIL_MAX_CHARS };
