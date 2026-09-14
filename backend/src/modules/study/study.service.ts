import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '@infra/prisma/prisma.service';
import { applyReview } from './spaced-repetition';
import { RecordReviewDto } from './dto/record-review.dto';
import { StudyQueueDto } from './dto/study-queue.dto';

const DEFAULT_QUEUE_LIMIT = 20;

/** Campos do cartão que o app precisa para montar a tela de estudo. */
const CARD_FOR_STUDY = {
  id: true,
  question: true,
  answer: true,
  dueAt: true,
  intervalDays: true,
  repetitions: true,
  lapses: true,
  easeFactor: true,
  content: { select: { id: true, title: true, folderId: true } },
} satisfies Prisma.FlashcardSelect;

@Injectable()
export class StudyService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Cartões vencidos, do mais atrasado para o menos.
   *
   * A ordem importa: quem está atrasado há mais tempo é quem está mais perto de
   * ser esquecido de vez. A consulta usa o índice `(userId, dueAt)`, motivo pelo
   * qual `userId` é desnormalizado na tabela de cartões.
   */
  async getQueue(userId: string, query: StudyQueueDto = {}) {
    return this.prisma.flashcard.findMany({
      where: {
        userId,
        dueAt: { lte: new Date() },
        ...(query.folderId ? { content: { folderId: query.folderId } } : {}),
      },
      orderBy: { dueAt: 'asc' },
      take: query.limit ?? DEFAULT_QUEUE_LIMIT,
      select: CARD_FOR_STUDY,
    });
  }

  /** Todos os cartões de um conteúdo, na ordem original, vencidos ou não. */
  async getContentCards(userId: string, contentId: string) {
    const content = await this.prisma.content.findUnique({
      where: { id: contentId },
      select: { userId: true },
    });

    if (!content) throw new NotFoundException('Conteúdo não encontrado.');
    if (content.userId !== userId) throw new ForbiddenException('Acesso negado.');

    return this.prisma.flashcard.findMany({
      where: { contentId },
      orderBy: { position: 'asc' },
      select: CARD_FOR_STUDY,
    });
  }

  async startSession(userId: string) {
    return this.prisma.studySession.create({
      data: { userId },
      select: { id: true, startedAt: true },
    });
  }

  /**
   * Fecha a sessão e devolve o placar.
   *
   * O resumo é derivado dos eventos de revisão, não de contadores mantidos
   * durante a sessão: contador que a aplicação incrementa sai de sincronia na
   * primeira requisição perdida.
   */
  async finishSession(userId: string, sessionId: string) {
    const session = await this.prisma.studySession.findUnique({
      where: { id: sessionId },
      select: { userId: true, endedAt: true },
    });

    if (!session) throw new NotFoundException('Sessão não encontrada.');
    if (session.userId !== userId) throw new ForbiddenException('Acesso negado.');

    // Fechar de novo uma sessão já encerrada não é erro: a rede pode ter
    // perdido a resposta e o app repetido a chamada.
    if (!session.endedAt) {
      await this.prisma.studySession.update({
        where: { id: sessionId },
        data: { endedAt: new Date() },
      });
    }

    const byRating = await this.prisma.flashcardReview.groupBy({
      by: ['rating'],
      where: { sessionId },
      _count: { _all: true },
    });

    const counts = Object.fromEntries(byRating.map((row) => [row.rating, row._count._all]));
    const again = counts.AGAIN ?? 0;
    const hard = counts.HARD ?? 0;
    const good = counts.GOOD ?? 0;
    const easy = counts.EASY ?? 0;
    const total = again + hard + good + easy;

    return {
      sessionId,
      total,
      again,
      hard,
      good,
      easy,
      /** 'Quase' não conta como acerto para a sessão: a memória ainda não foi consolidada. */
      accuracy: total === 0 ? 0 : Math.round(((good + easy) / total) * 100),
    };
  }

  /**
   * Grava uma revisão e reagenda o cartão.
   *
   * As duas escritas vão na mesma transação porque juntas formam um fato só:
   * um cartão reagendado sem o evento correspondente faria as estatísticas
   * mentirem, e um evento sem reagendamento traria o cartão de volta amanhã.
   */
  async recordReview(userId: string, dto: RecordReviewDto) {
    const card = await this.prisma.flashcard.findUnique({
      where: { id: dto.flashcardId },
      select: {
        userId: true,
        easeFactor: true,
        intervalDays: true,
        repetitions: true,
        lapses: true,
      },
    });

    if (!card) throw new NotFoundException('Cartão não encontrado.');
    if (card.userId !== userId) throw new ForbiddenException('Acesso negado.');

    if (dto.sessionId) {
      const session = await this.prisma.studySession.findUnique({
        where: { id: dto.sessionId },
        select: { userId: true },
      });
      if (!session || session.userId !== userId) {
        throw new ForbiddenException('Sessão inválida.');
      }
    }

    const outcome = applyReview(card, dto.rating);

    const [updated] = await this.prisma.$transaction([
      this.prisma.flashcard.update({
        where: { id: dto.flashcardId },
        data: {
          easeFactor: outcome.easeFactor,
          intervalDays: outcome.intervalDays,
          repetitions: outcome.repetitions,
          lapses: outcome.lapses,
          dueAt: outcome.dueAt,
          lastReviewedAt: outcome.lastReviewedAt,
        },
        select: CARD_FOR_STUDY,
      }),
      this.prisma.flashcardReview.create({
        data: {
          flashcardId: dto.flashcardId,
          userId,
          sessionId: dto.sessionId ?? null,
          rating: dto.rating,
          intervalDays: outcome.intervalDays,
          easeFactor: outcome.easeFactor,
        },
      }),
    ]);

    return updated;
  }
}
