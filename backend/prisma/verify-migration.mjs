/**
 * Ensaio da migração v2 em um banco descartável.
 *
 * A migração `restructure_for_spaced_repetition` é escrita à mão porque a
 * gerada pelo Prisma apagaria as tabelas existentes. Escrita à mão, ela precisa
 * ser provada antes de tocar o banco real.
 *
 * O ensaio recria o schema antigo, popula com dados representativos — incluindo
 * conteúdos com flashcards em jsonb, que o banco de produção ainda não tem e
 * portanto não exercitariam o backfill — aplica a migração e confere o
 * resultado.
 *
 * Uso: node prisma/verify-migration.mjs
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import pg from "../node_modules/.prisma/client/index.js";

const { PrismaClient } = pg;
const here = dirname(fileURLToPath(import.meta.url));

const TEST_DB = "codecam_migration_test";
const MIGRATIONS = [
  "20260901223103_init",
  "20260902000000_restructure_for_spaced_repetition",
];

/** Divide um arquivo .sql em statements, descartando comentários. */
function splitStatements(sql) {
  return sql
    .split("\n")
    .filter((line) => !line.trimStart().startsWith("--"))
    .join("\n")
    .split(";")
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

function testDatabaseUrl() {
  const url = new URL(process.env.DATABASE_URL);
  url.pathname = `/${TEST_DB}`;
  return url.toString();
}

const checks = [];
function check(label, actual, expected) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  checks.push(ok);
  const icon = ok ? "  ✓" : "  ✗";
  const detail = ok ? "" : `  (esperado ${JSON.stringify(expected)}, veio ${JSON.stringify(actual)})`;
  console.log(`${icon} ${label}${detail}`);
}

const admin = new PrismaClient();

try {
  console.log(`Recriando banco de ensaio "${TEST_DB}"...`);
  await admin.$executeRawUnsafe(`DROP DATABASE IF EXISTS ${TEST_DB}`);
  await admin.$executeRawUnsafe(`CREATE DATABASE ${TEST_DB}`);
  await admin.$disconnect();

  const db = new PrismaClient({ datasources: { db: { url: testDatabaseUrl() } } });

  // ─── 1. Schema antigo ────────────────────────────────────────────────────
  console.log("\nAplicando o schema anterior à v2...");
  for (const stmt of splitStatements(
    readFileSync(join(here, "migrations", MIGRATIONS[0], "migration.sql"), "utf8"),
  )) {
    await db.$executeRawUnsafe(stmt);
  }

  // ─── 2. Dados representativos ────────────────────────────────────────────
  console.log("Populando com dados que exercitam o backfill...");
  await db.$executeRawUnsafe(`
    INSERT INTO "User" ("id","name","createdAt","updatedAt") VALUES
      ('u1','Rafael',NOW(),NOW()),
      ('u2','Lívia',NOW(),NOW())`);

  await db.$executeRawUnsafe(`
    INSERT INTO "Folder" ("id","name","color","userId","createdAt","updatedAt") VALUES
      ('f1','Biologia','#00B894','u1',NOW(),NOW())`);

  // Conteúdo normal, com dois flashcards e dois tópicos.
  await db.$executeRawUnsafe(`
    INSERT INTO "Content"
      ("id","title","summary","topics","flashcards","rawText","folderId","userId","createdAt","updatedAt")
    VALUES (
      'c1',
      'Fotossíntese',
      'Processo pelo qual plantas convertem luz em energia química.',
      '["clorofila","cloroplasto"]'::jsonb,
      '[{"question":"O que é clorofila?","answer":"Pigmento verde que capta luz."},
        {"question":"Onde ocorre?","answer":"No cloroplasto."}]'::jsonb,
      'Texto bruto sobre fotossíntese e clorofila.',
      'f1','u1',NOW(),NOW())`);

  // Casos degenerados: flashcards vazio e tópicos com formato inesperado.
  await db.$executeRawUnsafe(`
    INSERT INTO "Content"
      ("id","title","summary","topics","flashcards","rawText","folderId","userId","createdAt","updatedAt")
    VALUES (
      'c2','Revolução Francesa','Queda do Antigo Regime.',
      '[]'::jsonb, '[]'::jsonb, 'Bastilha 1789.', NULL,'u2',NOW(),NOW()),
    (
      'c3','Conteúdo corrompido','Resumo.',
      '{"nao":"e um array"}'::jsonb, '"nem isto"'::jsonb, 'Texto.', NULL,'u2',NOW(),NOW())`);

  // ─── 3. A migração sob teste ─────────────────────────────────────────────
  console.log("Aplicando a migração v2...\n");
  for (const stmt of splitStatements(
    readFileSync(join(here, "migrations", MIGRATIONS[1], "migration.sql"), "utf8"),
  )) {
    await db.$executeRawUnsafe(stmt);
  }

  // ─── 4. Verificações ─────────────────────────────────────────────────────
  console.log("Verificando o resultado:\n");

  const count = async (sql) => Number((await db.$queryRawUnsafe(sql))[0].n);

  check("usuários preservados", await count(`SELECT COUNT(*) n FROM users`), 2);
  check("pastas preservadas", await count(`SELECT COUNT(*) n FROM folders`), 1);
  check("conteúdos preservados", await count(`SELECT COUNT(*) n FROM contents`), 3);

  check(
    "flashcards extraídos para tabela própria",
    await count(`SELECT COUNT(*) n FROM flashcards`),
    2,
  );

  const cards = await db.$queryRawUnsafe(
    `SELECT question, answer, position, "userId" FROM flashcards ORDER BY position`,
  );
  check("ordem original preservada", cards[0].position, 0);
  check("pergunta migrada íntegra", cards[0].question, "O que é clorofila?");
  check("resposta migrada íntegra", cards[1].answer, "No cloroplasto.");
  check("dono desnormalizado corretamente", cards[0].userId, "u1");

  const topics = await db.$queryRawUnsafe(
    `SELECT id, topics FROM contents ORDER BY id`,
  );
  check("topics viraram text[]", topics[0].topics, ["clorofila", "cloroplasto"]);
  check("topics vazio continua vazio", topics[1].topics, []);
  check("topics em formato inesperado vira array vazio", topics[2].topics, []);

  check(
    "estado SM-2 inicializado",
    await count(
      `SELECT COUNT(*) n FROM flashcards WHERE "easeFactor" = 2.5 AND "repetitions" = 0`,
    ),
    2,
  );

  // Busca full-text: "clorofila" deve achar o conteúdo de biologia.
  const hits = await db.$queryRawUnsafe(`
    SELECT id, ts_rank("searchVector", plainto_tsquery('portuguese','clorofila')) AS rank
    FROM contents
    WHERE "searchVector" @@ plainto_tsquery('portuguese','clorofila')
    ORDER BY rank DESC`);
  check("busca full-text encontra o termo", hits.length, 1);
  check("busca retorna o conteúdo certo", hits[0]?.id, "c1");

  // Sem acento deve achar com acento: é como as pessoas digitam no celular.
  const noAccent = await db.$queryRawUnsafe(`
    SELECT COUNT(*) n FROM contents
    WHERE "searchVector" @@ plainto_tsquery('portuguese', immutable_unaccent('fotossintese'))`);
  check("busca sem acento encontra termo acentuado", Number(noAccent[0].n), 1);

  // O stemming português deve casar plural com singular.
  const stemmed = await db.$queryRawUnsafe(`
    SELECT COUNT(*) n FROM contents
    WHERE "searchVector" @@ plainto_tsquery('portuguese', immutable_unaccent('plantas'))`);
  check("stemming casa flexões da mesma palavra", Number(stemmed[0].n), 1);

  // A coluna é gerada: atualizar o título deve reindexar sozinho.
  await db.$executeRawUnsafe(`UPDATE contents SET title = 'Mitocôndria' WHERE id = 'c2'`);
  const afterUpdate = await db.$queryRawUnsafe(`
    SELECT COUNT(*) n FROM contents
    WHERE "searchVector" @@ plainto_tsquery('portuguese', immutable_unaccent('mitocondria'))`);
  check("índice se atualiza sozinho", Number(afterUpdate[0].n), 1);

  // Cascata: apagar o conteúdo deve levar seus flashcards junto.
  await db.$executeRawUnsafe(`DELETE FROM contents WHERE id = 'c1'`);
  check(
    "flashcards seguem o conteúdo na exclusão",
    await count(`SELECT COUNT(*) n FROM flashcards`),
    0,
  );

  await db.$disconnect();

  const failed = checks.filter((ok) => !ok).length;
  console.log(
    failed === 0
      ? `\nTodas as ${checks.length} verificações passaram.`
      : `\n${failed} de ${checks.length} verificações FALHARAM.`,
  );

  const cleanup = new PrismaClient();
  await cleanup.$executeRawUnsafe(`DROP DATABASE IF EXISTS ${TEST_DB}`);
  await cleanup.$disconnect();
  console.log(`Banco de ensaio "${TEST_DB}" removido.`);

  process.exit(failed === 0 ? 0 : 1);
} catch (error) {
  console.error("\nEnsaio interrompido:", error.message);
  const cleanup = new PrismaClient();
  await cleanup.$executeRawUnsafe(`DROP DATABASE IF EXISTS ${TEST_DB}`).catch(() => {});
  await cleanup.$disconnect();
  process.exit(1);
}
