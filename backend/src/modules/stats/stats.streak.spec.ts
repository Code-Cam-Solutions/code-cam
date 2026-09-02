import { currentStreak } from './stats.service';

function series(...counts: number[]) {
  return counts.map((reviews, index) => ({
    date: `2026-09-${String(index + 1).padStart(2, '0')}`,
    reviews,
  }));
}

describe('currentStreak', () => {
  it('conta os dias seguidos com revisão até hoje', () => {
    expect(currentStreak(series(1, 0, 1, 1, 1))).toBe(3);
  });

  /*
   * Às nove da manhã ninguém "perdeu" a sequência de ontem. Quebrar a contagem
   * ao primeiro zero puniria o usuário por abrir o app antes de estudar — e a
   * sequência é justamente o que deveria trazê-lo de volta.
   */
  it('tolera o dia de hoje ainda sem estudo', () => {
    expect(currentStreak(series(1, 1, 1, 0))).toBe(3);
  });

  it('quebra quando um dia inteiro passa em branco', () => {
    expect(currentStreak(series(1, 1, 0, 1, 0))).toBe(1);
  });

  it('devolve zero para quem nunca estudou', () => {
    expect(currentStreak(series(0, 0, 0))).toBe(0);
  });

  it('devolve zero para uma série vazia', () => {
    expect(currentStreak([])).toBe(0);
  });
});
