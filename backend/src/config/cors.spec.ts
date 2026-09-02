import { buildCorsOptions, isPrivateOrigin } from './cors';

/** Executa o callback do `origin` e devolve se a origem foi aceita. */
function accepts(allowed: string[], isProduction: boolean, origin?: string): boolean {
  const options = buildCorsOptions(allowed, isProduction);
  let result = false;

  // O tipo do Nest permite `origin` como valor ou função; aqui é sempre função.
  const check = options.origin as (
    origin: string | undefined,
    callback: (err: Error | null, allow?: boolean) => void,
  ) => void;

  check(origin, (_err, allow) => {
    result = allow === true;
  });

  return result;
}

const ALLOWED = ['https://codecam.vercel.app'];

describe('isPrivateOrigin', () => {
  it.each([
    'http://localhost:5173',
    'http://127.0.0.1:3000',
    'http://10.0.0.4:5173',
    'http://172.16.73.178:5173',
    'http://172.31.255.255:5173',
    'http://192.168.0.7:5173',
    'https://macbook-do-rafa.local:5173',
  ])('reconhece %s como rede local', (origin) => {
    expect(isPrivateOrigin(origin)).toBe(true);
  });

  it.each([
    'https://exemplo.com',
    // 172.15 e 172.32 estão fora da faixa privada, apesar de parecerem.
    'http://172.15.0.1:5173',
    'http://172.32.0.1:5173',
    'http://8.8.8.8',
    'não é uma url',
  ])('não reconhece %s como rede local', (origin) => {
    expect(isPrivateOrigin(origin)).toBe(false);
  });
});

describe('buildCorsOptions', () => {
  it('aceita as origens configuradas em qualquer ambiente', () => {
    expect(accepts(ALLOWED, true, 'https://codecam.vercel.app')).toBe(true);
    expect(accepts(ALLOWED, false, 'https://codecam.vercel.app')).toBe(true);
  });

  /*
   * O caso que motivou este arquivo: o app é aberto por QR Code, no celular,
   * apontando para o IP da máquina na rede. A origem vira `http://172.16.x.x`
   * e não `localhost` — e o login falhava com "verifique sua conexão", porque a
   * resposta vinha sem o cabeçalho de CORS.
   */
  it('aceita a rede local fora de produção', () => {
    expect(accepts(ALLOWED, false, 'http://172.16.73.178:5173')).toBe(true);
    expect(accepts(ALLOWED, false, 'http://192.168.0.7:5173')).toBe(true);
  });

  it('recusa a rede local em produção', () => {
    expect(accepts(ALLOWED, true, 'http://192.168.0.7:5173')).toBe(false);
  });

  it('recusa um site da internet que não esteja na lista', () => {
    expect(accepts(ALLOWED, false, 'https://site-malicioso.com')).toBe(false);
    expect(accepts(ALLOWED, true, 'https://site-malicioso.com')).toBe(false);
  });

  it('deixa passar requisição sem origem', () => {
    // curl, health check do orquestrador, navegação de mesma origem: não há
    // requisição entre origens para proteger.
    expect(accepts(ALLOWED, true, undefined)).toBe(true);
  });
});
