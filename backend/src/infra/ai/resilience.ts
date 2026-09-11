/**
 * Política de tentativa compartilhada pelos fornecedores de visão.
 *
 * Vive fora dos clientes porque o problema não é de fornecedor nenhum: é da
 * natureza da chamada. Um modelo hospedado pode estar lotado, lento ou fora do
 * ar, e as três coisas pedem respostas diferentes — insistir, trocar de modelo
 * ou desistir. Duplicar essa lógica em cada cliente garantiria que uma correção
 * fosse aplicada em um e esquecida no outro.
 */

/**
 * Tentativas por modelo antes de passar ao próximo.
 *
 * Duas, e não mais: falha passageira que não é sobrecarga (rede oscilando)
 * costuma passar na segunda; sobrecarga não passa por insistência, e para ela
 * a saída é o próximo modelo da lista.
 */
export const ATTEMPTS_PER_MODEL = 2;

/** Espera base entre tentativas no mesmo modelo. Dobra a cada uma, com ruído. */
const RETRY_BASE_MS = 700;

/**
 * Teto de tempo para a análise inteira, somando modelos e tentativas.
 *
 * Cinco minutos, e não os 90s de antes, porque a escolha aqui é entre esperar e
 * não receber nada. Com o tier gratuito da NVIDIA a análise oscilava entre 18s
 * e mais de 45s, e o teto anterior transformava a oscilação em "A análise
 * demorou mais que o esperado" com frequência — descartando trabalho que estava
 * a caminho. Esperar mais é irritante; refazer a foto e torcer é pior.
 *
 * O teto continua existindo porque a alternativa é uma tela de carregamento
 * eterna: em algum momento é preciso dizer que não vai dar.
 */
export const TOTAL_BUDGET_MS = 300_000;

/**
 * Teto de uma única chamada.
 *
 * Sem isto, a lista de modelos alternativos seria decorativa. Uma chamada que
 * trava não devolve erro: fica pendurada até o orçamento inteiro acabar, e aí
 * não sobra tempo para tentar o próximo. Já aconteceu — o log registrava
 * "tentativa 1" e "orçamento esgotado" no mesmo segundo, com dois modelos
 * livres que nunca chegaram a ser chamados.
 */
/*
 * Calibrado sobre a latência real do tier gratuito da NVIDIA, que varia muito:
 * a mesma foto, no mesmo dia, foi analisada em 18,3s e depois em 37,7s — e em
 * dias de fila, bem mais que isso.
 *
 * Os valores são generosos de propósito. Cortar uma chamada que ia responder
 * não economiza nada: a foto continua sem análise, e a pessoa tenta de novo,
 * pagando a espera duas vezes. Dar tempo a cada tentativa custa segundos;
 * cortá-la cedo custa a análise inteira.
 */
const MIN_ATTEMPT_MS = 45_000;
const MAX_ATTEMPT_MS = 120_000;

/** Reparte o tempo que sobra entre os modelos que ainda não foram tentados. */
export function attemptBudget(remainingMs: number, remainingModels: number): number {
  const share = remainingMs / Math.max(1, remainingModels);
  return Math.round(Math.min(MAX_ATTEMPT_MS, Math.max(MIN_ATTEMPT_MS, share)));
}

/**
 * Corre a chamada contra um relógio.
 *
 * A promessa perdedora segue viva em segundo plano — nem todo SDK expõe
 * cancelamento. O que se ganha é o direito de seguir em frente sem esperá-la,
 * que é o ponto.
 */
export function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`timeout: o modelo não respondeu em ${ms}ms`));
    }, ms);

    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (err: unknown) => {
        clearTimeout(timer);
        reject(err instanceof Error ? err : new Error(String(err)));
      },
    );
  });
}

/** Espera exponencial com ruído, para duas tentativas não baterem no mesmo instante. */
export function backoffDelay(attempt: number, random: () => number = Math.random): number {
  const exponential = RETRY_BASE_MS * 2 ** (attempt - 1);
  return Math.round(exponential * (0.75 + random() * 0.5));
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Monta a ordem de tentativa: o modelo configurado primeiro, as alternativas
 * depois. O `Set` evita tentar duas vezes o mesmo quando o configurado já está
 * entre as alternativas — o que gastaria o dobro do tempo em um modelo lotado
 * antes de passar ao próximo.
 */
export function buildCandidates(configured: string, fallbacks: readonly string[]): string[] {
  return [...new Set([configured, ...fallbacks])];
}

/** Reconhece a falha de "esse modelo não existe (mais) para você". */
export function isModelUnavailable(message: string): boolean {
  return (
    message.includes('404') ||
    message.includes('NOT_FOUND') ||
    message.includes('Not Found') ||
    message.includes('is not found') ||
    message.includes('no longer available') ||
    message.includes('not supported for generateContent')
  );
}

/** Sobrecarga do fornecedor: passageira, e resolvida trocando de modelo. */
export function isOverloaded(message: string): boolean {
  return (
    message.includes('503') ||
    message.includes('high demand') ||
    message.includes('overloaded') ||
    message.includes('Service Unavailable') ||
    message.includes('UNAVAILABLE')
  );
}

/**
 * Estouro do nosso próprio relógio.
 *
 * Merece tratamento à parte de outras falhas passageiras: um modelo que não
 * respondeu em 45s dificilmente responderá rápido na tentativa seguinte, e
 * insistir nele custou 22 segundos de espera em uma medição real, sem nenhuma
 * chance de sucesso. Diante de um timeout, a saída é o próximo modelo.
 */
export function isTimeout(message: string): boolean {
  return message.includes('timeout') || message.includes('ETIMEDOUT');
}

/** Falha que pode passar sozinha na tentativa seguinte. */
export function isTransient(message: string): boolean {
  return (
    isOverloaded(message) ||
    message.includes('429') ||
    message.includes('timeout') ||
    message.includes('ETIMEDOUT') ||
    message.includes('ECONNRESET') ||
    message.includes('fetch failed')
  );
}
