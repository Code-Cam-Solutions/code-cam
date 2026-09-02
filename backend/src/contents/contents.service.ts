import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateContentDto } from './dto/create-content.dto';

@Injectable()
export class ContentsService {
  constructor(private prisma: PrismaService) {}

  async create(userId: string, dto: CreateContentDto) {
    // Validate folderId belongs to user if provided
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
        flashcards: dto.flashcards,
        rawText: dto.rawText,
        imageUrl: dto.imageUrl,
        folderId: dto.folderId || null,
        userId,
      },
    });
  }

  async findAll(userId: string, folderId?: string) {
    return this.prisma.content.findMany({
      where: {
        userId,
        ...(folderId ? { folderId } : {}),
      },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        title: true,
        summary: true,
        topics: true,
        flashcards: true,
        rawText: true,
        imageUrl: true,
        folderId: true,
        createdAt: true,
      },
    });
  }

  async findOne(userId: string, id: string) {
    const content = await this.prisma.content.findUnique({
      where: { id },
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
    await this.prisma.content.delete({ where: { id } });
  }
}
