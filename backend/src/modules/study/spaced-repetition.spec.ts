import { ReviewRating } from '@prisma/client';
import { applyReview, INITIAL_EASE, type CardState } from './spaced-repetition';

const NOW = new Date('2026-09-02T12:00:00.000Z');

function newCard(overrides: Partial<CardState> = {}): CardState {
  return {
    easeFactor: INITIAL_EASE,
    intervalDays: 0,
    repetitions: 0,
    lapses: 0,
    ...overrides,
  };
}

/** Dias inteiros entre `NOW` e a data devolvida. */
function daysUntil(date: Date): number {
  return Math.round((date.getTime() - NOW.getTime()) / (24 * 60 * 60 * 1000));
}

describe('applyReview', () => {
  describe('escada de intervalos', () => {
    it('agenda o primeiro acerto para o dia seguinte', () => {
      const result = applyReview(newCard(), ReviewRating.GOOD, NOW);

      expect(result.repetitions).toBe(1);
      expect(result.intervalDays).toBe(1);
      expect(daysUntil(result.dueAt)).toBe(1);
    });

    it('pula o intervalo de um dia quando o primeiro acerto foi fácil', () => {
      // O cartão claramente não precisava ser revisto amanhã.
      const result = applyReview(newCard(), ReviewRating.EASY, NOW);

      expect(result.intervalDays).toBe(6);
    });

    it('leva o segundo acerto para seis dias', () => {
      const result = applyReview(
        newCard({ repetitions: 1, intervalDays: 1 }),
        ReviewRating.GOOD,
        NOW,
      );

      expect(result.intervalDays).toBe(6);
    });

    it('multiplica pelo fator de facilidade a partir do terceiro acerto', () => {
      const result = applyReview(
        newCard({ repetitions: 2, intervalDays: 6, easeFactor: 2.5 }),
        ReviewRating.GOOD,
        NOW,
      );

      // 6 dias × fator ≈ 15 dias.
      expect(result.intervalDays).toBe(15);
      expect(daysUntil(result.dueAt)).toBe(15);
    });

    it('não deixa o intervalo passar de dez anos', () => {
      const result = applyReview(
        newCard({ repetitions: 20, intervalDays: 3000, easeFactor: 2.8 }),
        ReviewRating.EASY,
        NOW,
      );

      expect(result.intervalDays).toBeLessThanOrEqual(3650);
    });
  });

  describe('fator de facilidade', () => {
    it('cresce com o acerto sem esforço', () => {
      const result = applyReview(newCard(), ReviewRating.EASY, NOW);

      expect(result.easeFactor).toBeGreaterThan(INITIAL_EASE);
    });

    it('cai com o acerto difícil', () => {
      const result = applyReview(newCard(), ReviewRating.HARD, NOW);

      expect(result.easeFactor).toBeLessThan(INITIAL_EASE);
    });

    it('nunca desce abaixo de 1.3', () => {
      // Abaixo desse piso os intervalos param de crescer e o cartão entra num
      // laço de revisões diárias que nunca termina.
      let state = newCard({ easeFactor: 1.3 });

      for (let i = 0; i < 10; i++) {
        const result = applyReview(state, ReviewRating.AGAIN, NOW);
        state = result;
      }

      expect(state.easeFactor).toBe(1.3);
    });
  });

  describe('erro', () => {
    it('reinicia a escada e conta a recaída', () => {
      const result = applyReview(
        newCard({ repetitions: 5, intervalDays: 40, lapses: 1 }),
        ReviewRating.AGAIN,
        NOW,
      );

      expect(result.repetitions).toBe(0);
      expect(result.intervalDays).toBe(0);
      expect(result.lapses).toBe(2);
    });

    it('devolve o cartão à mesma sessão, mas não ao próximo cartão', () => {
      const result = applyReview(newCard(), ReviewRating.AGAIN, NOW);

      // Responder de novo em dez segundos testaria a memória de trabalho, não a
      // de longo prazo — que é o que o algoritmo está medindo.
      const minutes = (result.dueAt.getTime() - NOW.getTime()) / 60000;
      expect(minutes).toBe(10);
    });
  });

  it('registra o instante da revisão', () => {
    expect(applyReview(newCard(), ReviewRating.GOOD, NOW).lastReviewedAt).toEqual(NOW);
  });

  it('é determinístico: o mesmo estado e a mesma nota dão o mesmo resultado', () => {
    const state = newCard({ repetitions: 3, intervalDays: 10 });

    expect(applyReview(state, ReviewRating.GOOD, NOW)).toEqual(
      applyReview(state, ReviewRating.GOOD, NOW),
    );
  });
});

/*
 * Estes dois travam a distinção que o PR #2 quase apagou ao fazer o botão
 * "Quase" enviar AGAIN. Contar "quase" como erro na estatística é decisão de
 * produto e está em `accuracy`; colapsar as duas notas no agendamento é outra
 * coisa, e destrói informação que o algoritmo usa.
 */
describe('HARD é diferente de AGAIN no agendamento', () => {
  it('preserva o progresso do cartão, enquanto AGAIN o reinicia', () => {
    const maduro = newCard({ repetitions: 4, intervalDays: 30 });

    const quase = applyReview(maduro, ReviewRating.HARD, NOW);
    const errou = applyReview(maduro, ReviewRating.AGAIN, NOW);

    expect(quase.repetitions).toBeGreaterThan(errou.repetitions);
    expect(quase.intervalDays).toBeGreaterThan(errou.intervalDays);
  });

  it('devolve o cartão mais tarde que um erro, e mais cedo que um acerto pleno', () => {
    const maduro = newCard({ repetitions: 4, intervalDays: 30 });

    const errou = applyReview(maduro, ReviewRating.AGAIN, NOW).intervalDays;
    const quase = applyReview(maduro, ReviewRating.HARD, NOW).intervalDays;
    const acertou = applyReview(maduro, ReviewRating.GOOD, NOW).intervalDays;

    expect(errou).toBeLessThan(quase);
    expect(quase).toBeLessThan(acertou);
  });
});
