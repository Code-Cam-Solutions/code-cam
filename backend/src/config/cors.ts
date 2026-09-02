import type { CorsOptions } from '@nestjs/common/interfaces/external/cors-options.interface';

/**
 * Quem pode chamar esta API.
 *
 * A regra de produção é a lista de `FRONTEND_URL`, e ponto. `origin: true`, que
 * reflete qualquer origem, somado a `credentials: true`, equivale a liberar a
 * API para qualquer site que o usuário visite enquanto estiver logado.
 *
 * Em desenvolvimento existe uma segunda regra, e ela não é conveniência: o
 * CodeCam é aberto por QR Code, no celular do estudante, apontando para o IP da
 * máquina na rede local. Nesse cenário a origem é `http://192.168.0.7:5173`, e
 * não `http://localhost:5173` — testar do celular é o caso normal deste
 * projeto, não a exceção. Aceitar a rede local em desenvolvimento é o que
 * permite testar do jeito que o app vai ser usado.
 *
 * A abertura é deliberadamente estreita: só endereços de rede privada
 * (RFC 1918), só sem produção. Um site na internet pública não tem endereço
 * nessas faixas e continua bloqueado.
 */

/** Faixas privadas da RFC 1918, mais o laço local e o `.local` do mDNS. */
const PRIVATE_HOST = new RegExp(
  [
    '^localhost$',
    '^127\\.\\d{1,3}\\.\\d{1,3}\\.\\d{1,3}$',
    '^10\\.\\d{1,3}\\.\\d{1,3}\\.\\d{1,3}$',
    // 172.16.0.0 – 172.31.255.255
    '^172\\.(1[6-9]|2\\d|3[01])\\.\\d{1,3}\\.\\d{1,3}$',
    '^192\\.168\\.\\d{1,3}\\.\\d{1,3}$',
    '^[a-z0-9-]+\\.local$',
  ].join('|'),
  'i',
);

function isPrivateOrigin(origin: string): boolean {
  try {
    const { hostname, protocol } = new URL(origin);
    // https em rede local existe (túnel, certificado próprio), então os dois
    // esquemas passam; o que decide é o endereço.
    if (protocol !== 'http:' && protocol !== 'https:') return false;
    return PRIVATE_HOST.test(hostname);
  } catch {
    // Origem que nem é URL válida não vem de navegador nenhum.
    return false;
  }
}

export function buildCorsOptions(allowed: string[], isProduction: boolean): CorsOptions {
  return {
    origin(origin, callback) {
      // Requisição sem `Origin` — curl, health check do orquestrador, o próprio
      // navegador em navegação de mesma origem. Não há nada a proteger aqui:
      // CORS existe para requisições entre origens.
      if (!origin) {
        callback(null, true);
        return;
      }

      if (allowed.includes(origin) || (!isProduction && isPrivateOrigin(origin))) {
        callback(null, true);
        return;
      }

      // Recusar sem lançar: um erro aqui viraria 500 no log a cada varredura
      // automática. O navegador já bloqueia a resposta sem o cabeçalho.
      callback(null, false);
    },
    methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
  };
}

export { isPrivateOrigin };
