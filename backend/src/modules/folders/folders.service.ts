import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '@infra/prisma/prisma.service';
import { CreateFolderDto } from './dto/create-folder.dto';
import { UpdateFolderDto } from './dto/update-folder.dto';

@Injectable()
export class FoldersService {
  constructor(private prisma: PrismaService) {}

  async create(userId: string, dto: CreateFolderDto) {
    return this.prisma.folder.create({
      data: {
        name: dto.name,
        color: dto.color || '#6C5CE7',
        userId,
      },
      include: {
        _count: { select: { contents: true } },
      },
    });
  }

  async findAll(userId: string) {
    return this.prisma.folder.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: {
        _count: { select: { contents: true } },
      },
    });
  }

  async findOne(userId: string, id: string) {
    const folder = await this.prisma.folder.findUnique({
      where: { id },
      include: {
        _count: { select: { contents: true } },
      },
    });

    if (!folder) {
      throw new NotFoundException('Pasta não encontrada.');
    }

    if (folder.userId !== userId) {
      throw new ForbiddenException('Acesso negado.');
    }

    return folder;
  }

  async update(userId: string, id: string, dto: UpdateFolderDto) {
    await this.findOne(userId, id);

    return this.prisma.folder.update({
      where: { id },
      data: {
        ...(dto.name && { name: dto.name }),
        ...(dto.color && { color: dto.color }),
      },
      include: {
        _count: { select: { contents: true } },
      },
    });
  }

  async remove(userId: string, id: string) {
    await this.findOne(userId, id);

    await this.prisma.folder.delete({ where: { id } });
  }
}
