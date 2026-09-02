import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '@infra/prisma/prisma.service';
import { CreateContentDto } from './dto/create-content.dto';
import { ListContentsDto } from './dto/list-contents.dto';

/**
 * Flashcards deixaram de ser uma coluna Json e viraram tabela própria, mas o
 * contrato da API não muda: cada conteúdo continua sendo devolvido com seus
 * cartões embutidos e na ordem original.
 */
const CONTENT_WITH_FLASHCARDS = {
  flashcards: {
    orderBy: { position: 'asc' },
    select: { id: true, question: true, answer: true, dueAt: true },
  },
} as const;

@Injectable()
export class ContentsService {
  constructor(private prisma: PrismaService) {}

  async create(userId: string, dto: CreateContentDto) {
    if (dto.folderId) {
      const folder = await this.prisma.folder.findUnique({
        where: { id: dto.folderId },
      });
      if (!folder || folder.userId !== userId) {
        throw new ForbiddenException('Pasta inválida ou sem permissão.');
      }
    }

    return this.prisma.content.create({
      data: {
        title: dto.title,
        summary: dto.summary,
        topics: dto.topics,
        rawText: dto.rawText,
        imageUrl: dto.imageUrl,
        folderId: dto.folderId || null,
        userId,
        flashcards: {
          create: dto.flashcards.map((card, index) => ({
            question: card.question,
            answer: card.answer,
            // `position` preserva a ordem em que a IA gerou os cartões, que a
            // ordenação por id (uuid) perderia.
            position: index,
            // Desnormalizado para que a fila de revisão seja uma consulta
            // indexada por (userId, dueAt), sem join com contents.
            userId,
          })),
        },
      },
      include: CONTENT_WITH_FLASHCARDS,
    });
  }

  async findAll(userId: string, filters: ListContentsDto = {}) {
    return this.prisma.content.findMany({
      where: {
        userId,
        ...(filters.folderId ? { folderId: filters.folderId } : {}),
      },
      orderBy: { createdAt: 'desc' },
      include: CONTENT_WITH_FLASHCARDS,
    });
  }

  async findOne(userId: string, id: string) {
    const content = await this.prisma.content.findUnique({
      where: { id },
      include: CONTENT_WITH_FLASHCARDS,
    });

    if (!content) {
      throw new NotFoundException('Conteúdo não encontrado.');
    }

    if (content.userId !== userId) {
      throw new ForbiddenException('Acesso negado.');
    }

    return content;
  }

  async remove(userId: string, id: string) {
    await this.findOne(userId, id);
    // Os flashcards e suas revisões saem junto por ON DELETE CASCADE.
    await this.prisma.content.delete({ where: { id } });
  }
}
