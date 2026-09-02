-- CodeCam v2 — reestrutura o modelo para suportar repetição espaçada,
-- estatísticas de estudo e busca full-text.
--
-- ATENÇÃO: esta migração é escrita à mão de propósito.
--
-- O `prisma migrate` geraria DROP TABLE + CREATE TABLE para a mudança de
-- nomenclatura (User -> users), o que apagaria todos os usuários e pastas já
-- cadastrados. Aqui as tabelas são RENOMEADAS e os dados preservados.

-- ─── Enum de avaliação ──────────────────────────────────────────────────────

CREATE TYPE "review_rating" AS ENUM ('AGAIN', 'HARD', 'GOOD', 'EASY');

-- ─── Renomeia as tabelas existentes, preservando os dados ───────────────────

ALTER TABLE "User" RENAME TO "users";
ALTER TABLE "Folder" RENAME TO "folders";
ALTER TABLE "Content" RENAME TO "contents";

-- Constraints e índices mantêm o nome antigo após o RENAME da tabela.
-- Alinhá-los com o padrão do Prisma evita que a próxima migração tente
-- recriá-los do zero.
ALTER TABLE "users" RENAME CONSTRAINT "User_pkey" TO "users_pkey";
ALTER INDEX "User_name_key" RENAME TO "users_name_key";

ALTER TABLE "folders" RENAME CONSTRAINT "Folder_pkey" TO "folders_pkey";
ALTER TABLE "folders" RENAME CONSTRAINT "Folder_userId_fkey" TO "folders_userId_fkey";
DROP INDEX "Folder_userId_idx";

ALTER TABLE "contents" RENAME CONSTRAINT "Content_pkey" TO "contents_pkey";
ALTER TABLE "contents" RENAME CONSTRAINT "Content_userId_fkey" TO "contents_userId_fkey";
ALTER TABLE "contents" RENAME CONSTRAINT "Content_folderId_fkey" TO "contents_folderId_fkey";
DROP INDEX "Content_userId_idx";
ALTER INDEX "Content_folderId_idx" RENAME TO "contents_folderId_idx";

-- ─── contents.topics: jsonb -> text[] ───────────────────────────────────────
-- Um array nativo pode ser indexado e filtrado; um jsonb exige varredura.
--
-- A conversão é feita por troca de coluna, e não por ALTER COLUMN ... TYPE:
-- o Postgres proíbe subquery na cláusula USING, e desmontar um array jsonb
-- exige exatamente isso. Em um UPDATE a subquery é permitida.

ALTER TABLE "contents" ADD COLUMN "topics_text" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];

UPDATE "contents"
SET "topics_text" = COALESCE(
  (
    SELECT ARRAY_AGG(element ORDER BY ord)
    FROM jsonb_array_elements_text("topics") WITH ORDINALITY AS t(element, ord)
  ),
  ARRAY[]::TEXT[]
)
WHERE jsonb_typeof("topics") = 'array';

ALTER TABLE "contents" DROP COLUMN "topics";
ALTER TABLE "contents" RENAME COLUMN "topics_text" TO "topics";

-- ─── Novas tabelas ──────────────────────────────────────────────────────────

CREATE TABLE "flashcards" (
    "id" TEXT NOT NULL,
    "question" TEXT NOT NULL,
    "answer" TEXT NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,
    "contentId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "easeFactor" DOUBLE PRECISION NOT NULL DEFAULT 2.5,
    "intervalDays" INTEGER NOT NULL DEFAULT 0,
    "repetitions" INTEGER NOT NULL DEFAULT 0,
    "lapses" INTEGER NOT NULL DEFAULT 0,
    "dueAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastReviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "flashcards_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "study_sessions" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endedAt" TIMESTAMP(3),

    CONSTRAINT "study_sessions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "flashcard_reviews" (
    "id" TEXT NOT NULL,
    "flashcardId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "sessionId" TEXT,
    "rating" "review_rating" NOT NULL,
    "intervalDays" INTEGER NOT NULL,
    "easeFactor" DOUBLE PRECISION NOT NULL,
    "reviewedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "flashcard_reviews_pkey" PRIMARY KEY ("id")
);

-- ─── Migra os flashcards que viviam dentro de contents.flashcards ───────────
-- `WITH ORDINALITY` preserva a ordem em que a IA gerou os cartões.

INSERT INTO "flashcards" (
    "id", "question", "answer", "position", "contentId", "userId", "updatedAt"
)
SELECT
    gen_random_uuid()::TEXT,
    COALESCE(card ->> 'question', ''),
    COALESCE(card ->> 'answer', ''),
    (ord - 1)::INTEGER,
    c."id",
    c."userId",
    CURRENT_TIMESTAMP
FROM "contents" c
CROSS JOIN LATERAL jsonb_array_elements(
    CASE
      WHEN jsonb_typeof(c."flashcards") = 'array' THEN c."flashcards"
      ELSE '[]'::jsonb
    END
) WITH ORDINALITY AS t(card, ord)
WHERE COALESCE(card ->> 'question', '') <> '';

ALTER TABLE "contents" DROP COLUMN "flashcards";

-- ─── Busca full-text ────────────────────────────────────────────────────────

-- A configuração 'portuguese' faz stemming, mas não remove acentos: sem isto,
-- quem digitasse "fotossintese" não encontraria "Fotossíntese" — que é como a
-- maioria das pessoas digita no celular.
CREATE EXTENSION IF NOT EXISTS unaccent;

-- `unaccent(text)` é STABLE e por isso não pode ser usada em coluna gerada.
-- A forma de dois argumentos, com o dicionário explícito, é IMMUTABLE; este
-- wrapper apenas a expõe com aridade 1.
CREATE OR REPLACE FUNCTION immutable_unaccent(text)
RETURNS text
LANGUAGE sql
IMMUTABLE STRICT PARALLEL SAFE
AS $func$ SELECT public.unaccent('public.unaccent', $1) $func$;

-- Coluna gerada e mantida pelo próprio Postgres: não há como ficar defasada em
-- relação ao conteúdo, ao contrário de um índice atualizado pela aplicação.
--
-- Os pesos definem a relevância: um termo no título (A) ranqueia acima do
-- mesmo termo no resumo (B), que ranqueia acima do texto bruto (C).
ALTER TABLE "contents"
  ADD COLUMN "searchVector" tsvector
  GENERATED ALWAYS AS (
    setweight(to_tsvector('portuguese', immutable_unaccent(COALESCE("title", ''))), 'A') ||
    setweight(to_tsvector('portuguese', immutable_unaccent(COALESCE("summary", ''))), 'B') ||
    setweight(to_tsvector('portuguese', immutable_unaccent(COALESCE("rawText", ''))), 'C')
  ) STORED;

CREATE INDEX "contents_searchVector_idx" ON "contents" USING GIN ("searchVector");

-- ─── Índices ────────────────────────────────────────────────────────────────

CREATE INDEX "folders_userId_createdAt_idx" ON "folders"("userId", "createdAt");
CREATE INDEX "contents_userId_createdAt_idx" ON "contents"("userId", "createdAt" DESC);

CREATE INDEX "flashcards_contentId_position_idx" ON "flashcards"("contentId", "position");
-- Sustenta a fila de revisão: "cartões deste usuário vencidos até agora".
CREATE INDEX "flashcards_userId_dueAt_idx" ON "flashcards"("userId", "dueAt");

CREATE INDEX "flashcard_reviews_userId_reviewedAt_idx" ON "flashcard_reviews"("userId", "reviewedAt" DESC);
CREATE INDEX "flashcard_reviews_flashcardId_reviewedAt_idx" ON "flashcard_reviews"("flashcardId", "reviewedAt" DESC);
CREATE INDEX "flashcard_reviews_sessionId_idx" ON "flashcard_reviews"("sessionId");

CREATE INDEX "study_sessions_userId_startedAt_idx" ON "study_sessions"("userId", "startedAt" DESC);

-- ─── Chaves estrangeiras ────────────────────────────────────────────────────

ALTER TABLE "flashcards"
  ADD CONSTRAINT "flashcards_contentId_fkey"
  FOREIGN KEY ("contentId") REFERENCES "contents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "flashcards"
  ADD CONSTRAINT "flashcards_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "study_sessions"
  ADD CONSTRAINT "study_sessions_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "flashcard_reviews"
  ADD CONSTRAINT "flashcard_reviews_flashcardId_fkey"
  FOREIGN KEY ("flashcardId") REFERENCES "flashcards"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "flashcard_reviews"
  ADD CONSTRAINT "flashcard_reviews_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "flashcard_reviews"
  ADD CONSTRAINT "flashcard_reviews_sessionId_fkey"
  FOREIGN KEY ("sessionId") REFERENCES "study_sessions"("id") ON DELETE SET NULL ON UPDATE CASCADE;
