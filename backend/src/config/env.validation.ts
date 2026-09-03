import { Logger } from '@nestjs/common';

/**
 * Variáveis de ambiente do backend, já validadas.
 *
 * O tipo é a razão de este arquivo existir: em vez de `process.env.X` espalhado
 * pelo código — sempre `string | undefined`, sempre exigindo um fallback
 * inventado no ponto de uso — a configuração é conferida uma vez, no boot, e
 * dali em diante é um objeto com campos garantidos.
 */
export interface Env {
  DATABASE_URL: string;
  JWT_SECRET: string;
  /** Ausente em desenvolvimento: sem ela o scan devolve dados de demonstração. */
  GEMINI_API_KEY?: string;
  /** Modelo usado na análise das fotos. Configurável para sobreviver a aposentadorias. */
  GEMINI_MODEL: string;
  PORT: number;
  /** Origens autorizadas a chamar a API, já separadas por vírgula. */
  FRONTEND_URL: string[];
}

/**
 * Comprimento mínimo do segredo do JWT. 32 bytes é o tamanho do bloco do
 * HMAC-SHA256 — um segredo menor não acrescenta entropia à assinatura.
 */
const MIN_SECRET_LENGTH = 32;

/**
 * Modelo padrão da análise de imagem.
 *
 * Fica em variável de ambiente porque o Google aposenta modelos sem aviso no
 * código: o `gemini-1.5-flash` que estava fixo aqui passou a responder 404
 * ("is not found for API version v1beta") e derrubou toda captura de foto, com
 * o app dizendo ao usuário para "tentar novamente" — conselho que nunca ia
 * funcionar. Com a variável, trocar de modelo é editar o .env e reiniciar, sem
 * esperar por um deploy.
 */
const DEFAULT_GEMINI_MODEL = 'gemini-3.5-flash';

class EnvError extends Error {
  constructor(problems: string[]) {
    super(
      [
        'Configuração inválida. O processo não vai subir com estes problemas:',
        ...problems.map((problem) => `  • ${problem}`),
        '',
        'Confira o backend/.env (há um modelo em backend/.env.example).',
      ].join('\n'),
    );
    this.name = 'EnvError';
  }
}

/**
 * Lê uma variável como texto.
 *
 * `String(valor)` não serve: `process.env` é tipado como `unknown` aqui, e um
 * valor não textual viraria a string `"[object Object]"` — que passaria pelas
 * checagens de "está preenchido" e só quebraria muito depois, em runtime.
 */
function readString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

export function validateEnv(raw: Record<string, unknown>): Env {
  const problems: string[] = [];

  const databaseUrl = readString(raw.DATABASE_URL);
  if (!databaseUrl) {
    problems.push('DATABASE_URL não definida.');
  } else if (!databaseUrl.startsWith('postgres')) {
    problems.push('DATABASE_URL precisa ser uma URL PostgreSQL.');
  }

  /*
   * Antes existia um fallback: `process.env.JWT_SECRET || 'codecam-secret'`.
   * Em produção, com a variável esquecida, o servidor subia alegremente
   * assinando tokens com um segredo que está no código-fonte — qualquer pessoa
   * com acesso ao repositório poderia forjar a sessão de qualquer usuário.
   * Falhar no boot é a única resposta correta.
   */
  const jwtSecret = readString(raw.JWT_SECRET);
  if (!jwtSecret) {
    problems.push('JWT_SECRET não definida.');
  } else if (jwtSecret.length < MIN_SECRET_LENGTH) {
    problems.push(`JWT_SECRET precisa ter ao menos ${MIN_SECRET_LENGTH} caracteres.`);
  }

  const port = Number(raw.PORT ?? 3000);
  if (!Number.isInteger(port) || port <= 0 || port > 65535) {
    problems.push('PORT precisa ser um número de porta válido.');
  }

  if (problems.length > 0) {
    throw new EnvError(problems);
  }

  const geminiApiKey = readString(raw.GEMINI_API_KEY);
  if (!geminiApiKey) {
    new Logger('Config').warn(
      'GEMINI_API_KEY ausente — o scan vai devolver conteúdo de demonstração.',
    );
  }

  return {
    DATABASE_URL: databaseUrl,
    JWT_SECRET: jwtSecret,
    GEMINI_API_KEY: geminiApiKey || undefined,
    GEMINI_MODEL: readString(raw.GEMINI_MODEL) || DEFAULT_GEMINI_MODEL,
    PORT: port,
    FRONTEND_URL: (readString(raw.FRONTEND_URL) || 'http://localhost:5173')
      .split(',')
      .map((origin) => origin.trim())
      .filter(Boolean),
  };
}
