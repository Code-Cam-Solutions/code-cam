/**
 * Promove o banco de produção: aplica as migrações e leva os dados locais.
 *
 * Existe porque a troca de local para produção tem três passos que precisam
 * acontecer na ordem certa e que, feitos à mão, erram em silêncio: aplicar as
 * migrações, copiar os dados respeitando as chaves estrangeiras, e conferir se
 * o que chegou é o que saiu.
 *
 * A cópia é feita em uma transação só. Se qualquer etapa falhar, produção volta
 * ao estado anterior — o meio-termo (usuários lá, conteúdos não) seria pior que
 * não ter copiado nada.
 *
 * Uso:
 *   node prisma/promote-to-production.mjs --check        só diagnostica
 *   node prisma/promote-to-production.mjs --migrate      aplica as migrações
 *   node prisma/promote-to-production.mjs --copy-data    migrações + dados
 *
 * O endereço de produção sai de DATABASE_URL_PRODUCTION (no .env ou no
 * ambiente). Nada aqui apaga o banco local: a promoção é uma cópia.
 */
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import net from "node:net";

const here = dirname(fileURLToPath(import.meta.url));
const backendRoot = join(here, "..");

/** Ordem de inserção: cada tabela depende só das anteriores. */
const TABLES = [
  "users",
  "folders",
  "contents",
  "flashcards",
  "study_sessions",
  "flashcard_reviews",
];

// ─── Configuração ───────────────────────────────────────────────────────────

function readEnvFile() {
  try {
    const raw = readFileSync(join(backendRoot, ".env"), "utf8");
    const env = {};
    for (const line of raw.split("\n")) {
      // Aceita a linha comentada de produção: enquanto o serviço está fora do
      // ar ela fica desativada no .env, e ainda assim é o endereço correto.
      const match = /^\s*#?\s*([A-Z_]+)\s*=\s*(.*)$/.exec(line);
      if (match) env[match[1]] ??= match[2].trim().replace(/^["']|["']$/g, "");
    }
    return env;
  } catch {
    return {};
  }
}

const fileEnv = readEnvFile();
const PRODUCTION_URL = process.env.DATABASE_URL_PRODUCTION || fileEnv.DATABASE_URL_PRODUCTION;
const LOCAL_URL = process.env.DATABASE_URL || fileEnv.DATABASE_URL;

/** Esconde a senha antes de qualquer coisa ir para a tela ou para um log. */
function safe(url) {
  return String(url).replace(/(:\/\/[^:]+:)[^@]+@/, "$1<senha>@");
}

// ─── Diagnóstico ────────────────────────────────────────────────────────────

/**
 * Distingue as três falhas que se parecem no cliente e pedem ações opostas:
 * DNS que não resolve, TCP que não abre, e — a que derrubou este projeto — TCP
 * que abre mas nunca responde ao handshake, sinal de proxy no ar com o banco
 * parado atrás dele.
 */
function probe(url, timeoutMs = 12_000) {
  const { hostname, port } = new URL(url);
  const target = { host: hostname, port: Number(port) || 5432 };

  return new Promise((resolve) => {
    const socket = net.connect(target);
    let tcpOpen = false;

    const done = (verdict, detail) => {
      socket.destroy();
      resolve({ verdict, detail, ...target });
    };

    const timer = setTimeout(() => {
      done(
        tcpOpen ? "proxy-sem-banco" : "sem-resposta",
        tcpOpen
          ? "O TCP abriu, mas o Postgres não respondeu ao handshake. O proxy está no ar e o banco atrás dele, não."
          : "Nada respondeu dentro do tempo limite.",
      );
    }, timeoutMs);
    timer.unref?.();

    socket.on("connect", () => {
      tcpOpen = true;
      // SSLRequest do protocolo Postgres: 8 bytes. Um banco vivo responde
      // 'S' ou 'N' na hora, mesmo sem credencial nenhuma.
      const request = Buffer.alloc(8);
      request.writeInt32BE(8, 0);
      request.writeInt32BE(80877103, 4);
      socket.write(request);
    });

    socket.on("data", (chunk) => {
      clearTimeout(timer);
      const reply = String.fromCharCode(chunk[0]);
      done(
        reply === "S" || reply === "N" ? "vivo" : "resposta-estranha",
        `O servidor respondeu ${JSON.stringify(reply)} ao handshake.`,
      );
    });

    socket.on("error", (err) => {
      clearTimeout(timer);
      done(err.code === "ENOTFOUND" ? "dns" : "recusado", err.message);
    });
  });
}

// ─── Passos ─────────────────────────────────────────────────────────────────

function runMigrations(url) {
  console.log("\n▸ Aplicando migrações em produção…");
  execFileSync("npx", ["prisma", "migrate", "deploy"], {
    cwd: backendRoot,
    env: { ...process.env, DATABASE_URL: url },
    stdio: "inherit",
  });
}

async function copyData(fromUrl, toUrl) {
  const { PrismaClient } = await import("@prisma/client");
  const source = new PrismaClient({ datasources: { db: { url: fromUrl } } });
  const target = new PrismaClient({ datasources: { db: { url: toUrl } } });

  try {
    console.log("\n▸ Lendo o banco local…");
    const rows = {};
    for (const table of TABLES) {
      rows[table] = await source.$queryRawUnsafe(`SELECT * FROM ${table}`);
      console.log(`  ${table}: ${rows[table].length}`);
    }

    const total = Object.values(rows).reduce((sum, list) => sum + list.length, 0);
    if (total === 0) {
      console.log("\nNada a copiar: o banco local está vazio.");
      return;
    }

    console.log("\n▸ Escrevendo em produção (transação única)…");
    await target.$transaction(async (tx) => {
      for (const table of TABLES) {
        for (const row of rows[table]) {
          const columns = Object.keys(row);
          const placeholders = columns.map((_, i) => `$${i + 1}`).join(", ");
          const names = columns.map((c) => `"${c}"`).join(", ");
          // ON CONFLICT DO NOTHING torna a promoção repetível: rodar duas vezes
          // não duplica nem explode em chave primária.
          await tx.$executeRawUnsafe(
            `INSERT INTO ${table} (${names}) VALUES (${placeholders}) ON CONFLICT DO NOTHING`,
            ...columns.map((c) => row[c]),
          );
        }
      }
    });

    console.log("\n▸ Conferindo o que chegou…");
    let divergiu = false;
    for (const table of TABLES) {
      const [{ count }] = await target.$queryRawUnsafe(`SELECT count(*)::int FROM ${table}`);
      const esperado = rows[table].length;
      const ok = count >= esperado;
      if (!ok) divergiu = true;
      console.log(`  ${ok ? "✓" : "✗"} ${table}: ${count} em produção (local tem ${esperado})`);
    }

    if (divergiu) {
      throw new Error("Produção ficou com menos linhas que o local. Nada foi assumido como pronto.");
    }
  } finally {
    await source.$disconnect();
    await target.$disconnect();
  }
}

// ─── Execução ───────────────────────────────────────────────────────────────

async function main() {
  const mode = process.argv[2] ?? "--check";

  if (!PRODUCTION_URL) {
    console.error("DATABASE_URL_PRODUCTION não encontrada (nem no .env, nem no ambiente).");
    process.exit(1);
  }

  console.log(`Produção: ${safe(PRODUCTION_URL)}`);
  console.log(`Local:    ${safe(LOCAL_URL ?? "(não definida)")}`);

  console.log("\n▸ Testando o banco de produção…");
  const result = await probe(PRODUCTION_URL);

  if (result.verdict !== "vivo") {
    console.error(`\n✗ Produção indisponível (${result.verdict})`);
    console.error(`  ${result.detail}`);
    if (result.verdict === "proxy-sem-banco") {
      console.error(
        [
          "",
          "  Isto não se resolve daqui: é o serviço do Postgres que não está de pé.",
          "  No painel do Railway, no serviço do banco:",
          "    1. Confira se está Running (não Sleeping/Crashed/Removed).",
          "    2. Se estiver parado, dê Restart ou Redeploy.",
          "    3. Confira o plano — trial expirado suspende o serviço.",
          "    4. Copie a connection string de novo: o host e a porta do proxy",
          "       mudam quando o serviço é recriado.",
        ].join("\n"),
      );
    }
    process.exit(1);
  }

  console.log(`✓ Produção respondeu ao handshake (${result.host}:${result.port})`);

  if (mode === "--check") {
    console.log("\nSó diagnóstico. Para aplicar as migrações: --migrate");
    return;
  }

  runMigrations(PRODUCTION_URL);

  if (mode === "--copy-data") {
    if (!LOCAL_URL) {
      console.error("DATABASE_URL local não definida: não há de onde copiar.");
      process.exit(1);
    }
    await copyData(LOCAL_URL, PRODUCTION_URL);
  }

  console.log(
    [
      "",
      "✓ Produção pronta.",
      "",
      "Para o app passar a usá-la, no backend/.env:",
      "  DATABASE_URL=<a string de produção>",
      "",
      "Mantenha a linha do banco local comentada por perto até confirmar que",
      "tudo funciona apontando para produção.",
    ].join("\n"),
  );
}

main().catch((err) => {
  console.error(`\n✗ ${err.message}`);
  process.exit(1);
});
