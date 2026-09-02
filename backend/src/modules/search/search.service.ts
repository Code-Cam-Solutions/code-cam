import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '@infra/prisma/prisma.service';
import { toPrefixTsQuery } from './tsquery';
import { SearchQueryDto } from './dto/search-query.dto';

const DEFAULT_LIMIT = 20;

export interface SearchHit {
  id: string;
  title: string;
  summary: string;
  folderId: string | null;
  folderName: string | null;
  folderColor: string | null;
  createdAt: Date;
  flashcardCount: number;
  /** Trecho do material com os termos marcados por `<mark>`. */
  excerpt: string;
  /** Relevância do Postgres. Serve para ordenar, não para exibir. */
  rank: number;
}

@Injectable()
export class SearchService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Busca full-text nos conteúdos do usuário.
   *
   * A consulta é SQL cru porque o Prisma não expõe `tsvector`, `ts_rank` nem
   * `ts_headline` — e sem eles a alternativa seria `contains` com `%termo%`,
   * que não usa índice, não ordena por relevância, não faz stemming (buscar
   * "plantas" não acharia "planta") e não ignora acento.
   */
  async search(userId: string, query: SearchQueryDto): Promise<SearchHit[]> {
    const tsquery = toPrefixTsQuery(query.q);

    // Só sinais de pontuação, ou uma letra solta: não há o que buscar, e
    // devolver tudo seria pior do que devolver nada.
    if (!tsquery) return [];

    const limit = query.limit ?? DEFAULT_LIMIT;

    return this.prisma.$queryRaw<SearchHit[]>`
      WITH q AS (
        SELECT to_tsquery('portuguese', immutable_unaccent(${tsquery})) AS query
      )
      SELECT
        c."id",
        c."title",
        c."summary",
        c."folderId",
        f."name"  AS "folderName",
        f."color" AS "folderColor",
        c."createdAt",
        (SELECT COUNT(*)::int FROM flashcards fc WHERE fc."contentId" = c."id")
          AS "flashcardCount",
        ts_headline(
          'portuguese',
          -- O resumo é o que o usuário reconhece; o texto bruto entra só
          -- quando o material não tem resumo.
          COALESCE(NULLIF(c."summary", ''), c."rawText"),
          q.query,
          'StartSel=<mark>, StopSel=</mark>, MaxWords=28, MinWords=12, MaxFragments=1'
        ) AS "excerpt",
        ts_rank(c."searchVector", q.query) AS "rank"
      FROM contents c
      CROSS JOIN q
      LEFT JOIN folders f ON f."id" = c."folderId"
      WHERE c."userId" = ${userId}
        AND c."searchVector" @@ q.query
        ${query.folderId ? Prisma.sql`AND c."folderId" = ${query.folderId}` : Prisma.empty}
      -- Empate no ranking desempata pelo mais recente: entre dois materiais
      -- igualmente relevantes, o que foi estudado por último é o provável alvo.
      ORDER BY "rank" DESC, c."createdAt" DESC
      LIMIT ${limit}
    `;
  }
}
