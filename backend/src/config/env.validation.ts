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
  /** Qual fornecedor de visão atende o scan. */
  AI_PROVIDER: 'nvidia' | 'gemini';
  /** Ausente em desenvolvimento: sem ela o scan devolve dados de demonstração. */
  NVIDIA_API_KEY?: string;
  /** Modelo da NVIDIA usado na análise. */
  NVIDIA_MODEL: string;
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

/*
 * Padrões da NVIDIA. O kimi-k3 foi escolhido por medição, não por catálogo:
 * com a mesma foto de lousa ele transcreveu o texto inteiro sem erro em 18s e
 * devolveu JSON válido, enquanto o llama-3.2-11b levou 39s e obedeceu mal à
 * instrução de quantidade de flashcards.
 */
const DEFAULT_NVIDIA_MODEL = 'moonshotai/kimi-k3';

/** Fornecedores aceitos em AI_PROVIDER. */
const PROVIDERS = ['nvidia', 'gemini'] as const;
type Provider = (typeof PROVIDERS)[number];

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

  const provider = (readString(raw.AI_PROVIDER) || 'nvidia') as Provider;
  if (!PROVIDERS.includes(provider)) {
    problems.push(`AI_PROVIDER inválido: "${provider}". Use ${PROVIDERS.join(' ou ')}.`);
  }

  // Um único ponto de saída: o boot mostra tudo que está errado de uma vez, em
  // vez de fazer quem configura descobrir um problema por reinício.
  if (problems.length > 0) {
    throw new EnvError(problems);
  }

  const geminiApiKey = readString(raw.GEMINI_API_KEY);
  const nvidiaApiKey = readString(raw.NVIDIA_API_KEY);

  /*
   * O aviso é sobre a chave do fornecedor em uso, não sobre as duas. Avisar da
   * chave do Gemini ausente enquanto a NVIDIA atende seria ruído que ensina a
   * ignorar o log.
   */
  const chaveEmUso = provider === 'nvidia' ? nvidiaApiKey : geminiApiKey;
  if (!chaveEmUso) {
    new Logger('Config').warn(
      `${provider.toUpperCase()}_API_KEY ausente — o scan vai devolver conteúdo de demonstração.`,
    );
  }

  return {
    DATABASE_URL: databaseUrl,
    JWT_SECRET: jwtSecret,
    GEMINI_API_KEY: geminiApiKey || undefined,
    GEMINI_MODEL: readString(raw.GEMINI_MODEL) || DEFAULT_GEMINI_MODEL,
    AI_PROVIDER: provider,
    NVIDIA_API_KEY: nvidiaApiKey || undefined,
    NVIDIA_MODEL: readString(raw.NVIDIA_MODEL) || DEFAULT_NVIDIA_MODEL,
    PORT: port,
    FRONTEND_URL: (readString(raw.FRONTEND_URL) || 'http://localhost:5173')
      .split(',')
      .map((origin) => origin.trim())
      .filter(Boolean),
  };
}
