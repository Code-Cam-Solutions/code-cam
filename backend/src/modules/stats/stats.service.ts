import { Injectable } from '@nestjs/common';
import { ReviewRating } from '@prisma/client';
import { PrismaService } from '@infra/prisma/prisma.service';
import { MATURE_INTERVAL_DAYS } from '@modules/study/spaced-repetition';

/** Janela do gráfico de atividade. Duas semanas cabem na tela do celular. */
const ACTIVITY_DAYS = 14;

/** Janela usada para a taxa de acerto. Curta demais oscila; longa demais congela. */
const ACCURACY_DAYS = 30;

const DEFAULT_TIMEZONE = 'America/Sao_Paulo';

/** Um dia do gráfico de atividade. */
export interface ActivityDay {
  /** Data local do estudante, em ISO (`2026-09-02`). */
  date: string;
  reviews: number;
}

interface DayRow {
  day: string;
  reviews: number;
}

@Injectable()
export class StatsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Painel do início.
   *
   * Tudo aqui é medido, nada é estimado. A tela anterior mostrava números
   * fixos escritos no código — o que é pior do que não mostrar nada, porque
   * ensina o usuário a não confiar no que o app diz.
   */
  async getOverview(userId: string, timezone = DEFAULT_TIMEZONE) {
    const now = new Date();

    const [contents, folders, flashcards, dueNow, mastered, activity, accuracy, lastReviewAt] =
      await Promise.all([
        this.prisma.content.count({ where: { userId } }),
        this.prisma.folder.count({ where: { userId } }),
        this.prisma.flashcard.count({ where: { userId } }),
        this.prisma.flashcard.count({ where: { userId, dueAt: { lte: now } } }),
        this.prisma.flashcard.count({
          where: { userId, intervalDays: { gte: MATURE_INTERVAL_DAYS } },
        }),
        this.activityByDay(userId, timezone, ACTIVITY_DAYS),
        this.accuracyRate(userId, ACCURACY_DAYS),
        this.prisma.flashcardReview.findFirst({
          where: { userId },
          orderBy: { reviewedAt: 'desc' },
          select: { reviewedAt: true },
        }),
      ]);

    const today = activity.at(-1);

    return {
      contents,
      folders,
      flashcards,
      /** Cartões que já venceram e estão esperando revisão. */
      dueNow,
      mastered,
      /** Percentual de cartões que passaram do limiar de memória estável. */
      masteryRate: percent(mastered, flashcards),
      reviewedToday: today?.reviews ?? 0,
      /** Dias seguidos com pelo menos uma revisão. */
      streakDays: currentStreak(activity),
      accuracy,
      activity,
      lastReviewAt: lastReviewAt?.reviewedAt ?? null,
    };
  }

  /**
   * Revisões por dia, no fuso do estudante.
   *
   * SQL cru porque agrupar por data exige converter o instante para o fuso
   * local antes de truncar — `groupBy` do Prisma agrupa pelo valor da coluna,
   * que é um timestamp, e devolveria um grupo por milissegundo.
   */
  private async activityByDay(
    userId: string,
    timezone: string,
    days: number,
  ): Promise<ActivityDay[]> {
    const since = new Date();
    since.setDate(since.getDate() - (days - 1));
    since.setHours(0, 0, 0, 0);

    const rows = await this.prisma.$queryRaw<DayRow[]>`
      SELECT to_char(("reviewedAt" AT TIME ZONE ${timezone})::date, 'YYYY-MM-DD') AS day,
             COUNT(*)::int AS reviews
      FROM flashcard_reviews
      WHERE "userId" = ${userId}
        AND "reviewedAt" >= ${since}
      GROUP BY day
      ORDER BY day
    `;

    // A série chega com buracos: dias sem estudo simplesmente não têm linha.
    // O gráfico precisa dos zeros para que a distância entre as barras
    // represente tempo, e não apenas a ordem das sessões.
    const byDay = new Map(rows.map((row) => [row.day, row.reviews]));

    return Array.from({ length: days }, (_, index) => {
      const date = new Date(since);
      date.setDate(since.getDate() + index);
      const key = localDate(date, timezone);
      return { date: key, reviews: byDay.get(key) ?? 0 };
    });
  }

  /** Proporção de revisões em que o cartão foi lembrado, na janela informada. */
  private async accuracyRate(userId: string, days: number): Promise<number> {
    const since = new Date();
    since.setDate(since.getDate() - days);

    const grouped = await this.prisma.flashcardReview.groupBy({
      by: ['rating'],
      where: { userId, reviewedAt: { gte: since } },
      _count: { _all: true },
    });

    const total = grouped.reduce((sum, row) => sum + row._count._all, 0);
    const missed = grouped.find((row) => row.rating === ReviewRating.AGAIN)?._count._all ?? 0;

    return percent(total - missed, total);
  }
}

/** Percentual inteiro, com divisão por zero devolvendo 0 em vez de NaN. */
function percent(part: number, whole: number): number {
  return whole === 0 ? 0 : Math.round((part / whole) * 100);
}

/** Data local em ISO, no fuso informado. */
function localDate(date: Date, timezone: string): string {
  // `en-CA` porque seu formato de data curta já é `YYYY-MM-DD`, o que evita
  // remontar a string a partir das partes.
  return new Intl.DateTimeFormat('en-CA', { timeZone: timezone }).format(date);
}

/**
 * Dias consecutivos de estudo, contando de trás para frente.
 *
 * A sequência não quebra quando o dia de hoje ainda está vazio: às 9h da manhã
 * ninguém "perdeu" a sequência de ontem — ela só quebra quando um dia inteiro
 * passa sem revisão.
 */
function currentStreak(activity: ActivityDay[]): number {
  let streak = 0;

  for (let index = activity.length - 1; index >= 0; index--) {
    const day = activity[index];
    if (!day) break;

    if (day.reviews > 0) {
      streak++;
      continue;
    }

    // O último dia da série é hoje: um hoje ainda sem estudo é tolerado uma vez.
    if (index === activity.length - 1) continue;

    break;
  }

  return streak;
}

export { currentStreak };
