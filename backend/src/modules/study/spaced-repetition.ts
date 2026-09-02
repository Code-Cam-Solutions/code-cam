import { ReviewRating } from '@prisma/client';

/**
 * SM-2, o algoritmo de repetição espaçada do SuperMemo, na variante que o Anki
 * popularizou.
 *
 * A ideia por trás dele: o esquecimento é exponencial, então a revisão deve
 * acontecer no instante em que a memória está prestes a falhar — nem antes
 * (desperdício de tempo), nem depois (o conteúdo já se perdeu). O intervalo até
 * a próxima revisão cresce a cada acerto, multiplicado por um "fator de
 * facilidade" que o próprio desempenho do estudante ajusta.
 *
 * Esta é uma função pura de propósito. O algoritmo é a única parte do estudo
 * que tem uma resposta certa e verificável; separá-lo do banco permite testar
 * cada transição sem subir nada.
 */

/** Estado de um cartão antes da revisão. */
export interface CardState {
  easeFactor: number;
  intervalDays: number;
  repetitions: number;
  lapses: number;
}

/** Estado resultante, pronto para ser gravado. */
export interface ReviewOutcome extends CardState {
  dueAt: Date;
  lastReviewedAt: Date;
}

/**
 * Piso do fator de facilidade. Abaixo de 1.3 os intervalos praticamente param
 * de crescer e o cartão entra em um laço de revisões diárias — é o valor que o
 * SuperMemo fixou justamente para evitar isso.
 */
const MIN_EASE = 1.3;

/** Fator inicial de um cartão nunca estudado. */
export const INITIAL_EASE = 2.5;

/** Primeiros dois intervalos, fixos: o crescimento só começa na terceira vez. */
const FIRST_INTERVAL = 1;
const SECOND_INTERVAL = 6;

/** Multiplicador aplicado quando o acerto foi difícil. */
const HARD_MULTIPLIER = 1.2;

/** Bônus para o acerto sem esforço — o cartão pode esperar mais. */
const EASY_BONUS = 1.3;

/** Teto de 10 anos. Um intervalo maior que isso não significa mais nada. */
const MAX_INTERVAL_DAYS = 3650;

/**
 * Depois de um erro o cartão volta na mesma sessão, mas não no cartão seguinte:
 * responder de novo em dez segundos testa a memória de trabalho, não a de longo
 * prazo.
 */
const RELEARN_MINUTES = 10;

/** Qualidade da resposta na escala do SM-2 (0–5) para as notas que o app oferece. */
const QUALITY: Record<ReviewRating, number> = {
  [ReviewRating.AGAIN]: 2,
  [ReviewRating.HARD]: 3,
  [ReviewRating.GOOD]: 4,
  [ReviewRating.EASY]: 5,
};

function addDays(from: Date, days: number): Date {
  return new Date(from.getTime() + days * 24 * 60 * 60 * 1000);
}

function addMinutes(from: Date, minutes: number): Date {
  return new Date(from.getTime() + minutes * 60 * 1000);
}

function clampEase(ease: number): number {
  return Math.max(MIN_EASE, Number(ease.toFixed(2)));
}

/**
 * Fórmula original do SM-2 para o novo fator de facilidade.
 * Uma resposta perfeita (q=5) aumenta o fator; q=3 o mantém quase estável;
 * abaixo disso ele cai.
 */
function nextEase(current: number, quality: number): number {
  const delta = 0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02);
  return clampEase(current + delta);
}

function nextInterval(state: CardState, rating: ReviewRating, ease: number): number {
  const repetition = state.repetitions + 1;

  if (repetition === 1) {
    // O acerto fácil de primeira já pula o intervalo de um dia: o cartão
    // claramente não precisava ser revisto amanhã.
    return rating === ReviewRating.EASY ? SECOND_INTERVAL : FIRST_INTERVAL;
  }

  if (repetition === 2) {
    return rating === ReviewRating.HARD ? SECOND_INTERVAL / 2 : SECOND_INTERVAL;
  }

  const base =
    rating === ReviewRating.HARD ? state.intervalDays * HARD_MULTIPLIER : state.intervalDays * ease;

  const bonus = rating === ReviewRating.EASY ? EASY_BONUS : 1;

  return Math.min(MAX_INTERVAL_DAYS, Math.max(1, Math.round(base * bonus)));
}

/**
 * Calcula o estado do cartão após uma avaliação.
 *
 * `now` é injetado em vez de lido de `Date.now()` para que o resultado seja
 * determinístico — sem isso, testar o agendamento exigiria congelar o relógio
 * do processo inteiro.
 */
export function applyReview(
  state: CardState,
  rating: ReviewRating,
  now: Date = new Date(),
): ReviewOutcome {
  if (rating === ReviewRating.AGAIN) {
    return {
      // Errar reinicia a escada de intervalos: o cartão volta a ser tratado
      // como recém-aprendido, porque na prática é o que ele é.
      repetitions: 0,
      intervalDays: 0,
      lapses: state.lapses + 1,
      easeFactor: nextEase(state.easeFactor, QUALITY[ReviewRating.AGAIN]),
      dueAt: addMinutes(now, RELEARN_MINUTES),
      lastReviewedAt: now,
    };
  }

  const easeFactor = nextEase(state.easeFactor, QUALITY[rating]);
  const intervalDays = Math.max(1, Math.round(nextInterval(state, rating, easeFactor)));

  return {
    repetitions: state.repetitions + 1,
    intervalDays,
    lapses: state.lapses,
    easeFactor,
    dueAt: addDays(now, intervalDays),
    lastReviewedAt: now,
  };
}

/**
 * Intervalo a partir do qual um cartão conta como aprendido.
 *
 * Três semanas é o limiar que o Anki usa para "cartão maduro", e não é
 * arbitrário: é a faixa em que a curva de esquecimento já se achatou o
 * suficiente para a lembrança ser considerada estável.
 */
export const MATURE_INTERVAL_DAYS = 21;
