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
    /*
     * Margem de um dia a mais do que a janela pedida. O corte exato de cada dia
     * é feito depois, casando as chaves; aqui só é preciso não deixar de fora
     * nenhuma revisão que possa pertencer ao primeiro dia local, cujo início em
     * UTC cai antes ou depois conforme o fuso.
     */
    const since = new Date(Date.now() - (days + 1) * 24 * 60 * 60 * 1000);

    /*
     * A dupla conversão de fuso não é redundância.
     *
     * A coluna é `timestamp without time zone` e guarda UTC. Sobre um valor sem
     * fuso, `AT TIME ZONE 'America/Sao_Paulo'` *interpreta* o horário como se já
     * fosse de São Paulo, em vez de convertê-lo para lá — o contrário do que se
     * quer. O primeiro `AT TIME ZONE 'UTC'` diz de onde o valor vem; o segundo
     * leva para onde o estudante está.
     *
     * Sem isso, toda revisão feita entre 21h e meia-noite caía no dia seguinte,
     * porque em UTC a data já havia virado. Quebrava a sequência, o gráfico e o
     * "revisados hoje" justamente no horário em que mais se estuda — e não
     * aparecia em teste nenhum feito durante o dia.
     */
    const rows = await this.prisma.$queryRaw<DayRow[]>`
      SELECT to_char(
               ("reviewedAt" AT TIME ZONE 'UTC' AT TIME ZONE ${timezone})::date,
               'YYYY-MM-DD'
             ) AS day,
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

    return lastDays(days, timezone).map((key) => ({
      date: key,
      reviews: byDay.get(key) ?? 0,
    }));
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
    const missed =
      (grouped.find((row) => row.rating === ReviewRating.AGAIN)?._count._all ?? 0) +
      (grouped.find((row) => row.rating === ReviewRating.HARD)?._count._all ?? 0);

    return percent(total - missed, total);
  }
}

/** Percentual inteiro, com divisão por zero devolvendo 0 em vez de NaN. */
function percent(part: number, whole: number): number {
  return whole === 0 ? 0 : Math.round((part / whole) * 100);
}

/**
 * Os últimos `days` dias do calendário do estudante, terminando em hoje.
 *
 * A versão anterior somava dias a um instante e convertia cada um para o fuso
 * local. Parece a mesma coisa e não é: o instante era meia-noite UTC, que em
 * São Paulo é 21h do dia anterior — então toda a série saía deslocada um dia
 * para trás, e o dia de hoje simplesmente não existia no gráfico. Como
 * `reviewedToday` é o último item da série, ele passava a dizer quantos cartões
 * foram revisados *ontem*, e a sequência era contada sobre uma janela que já
 * começava desatualizada.
 *
 * O defeito valia das 0h às 21h, e desaparecia à noite — quando a data em UTC
 * alcança a de São Paulo. Foi assim que ele passou pelo teste que consertou o
 * agrupamento: o teste rodou às 21h.
 *
 * A conta agora é feita sobre a data do calendário, não sobre instantes. Os
 * dias entram em UTC apenas como veículo de aritmética de calendário, onde não
 * existe horário de verão para atrapalhar.
 */
function lastDays(days: number, timezone: string): string[] {
  const [year, month, day] = localDate(new Date(), timezone).split('-').map(Number);

  return Array.from({ length: days }, (_, index) => {
    const date = new Date(Date.UTC(year, month - 1, day - (days - 1 - index)));
    return date.toISOString().slice(0, 10);
  });
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

export { currentStreak, lastDays };
