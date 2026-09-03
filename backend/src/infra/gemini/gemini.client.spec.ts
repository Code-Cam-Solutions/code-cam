import {
  backoffDelay,
  buildCandidates,
  isModelUnavailable,
  isOverloaded,
  isTransient,
} from './gemini.client';

/*
 * O caso que originou este arquivo: `gemini-1.5-flash` estava fixo no código e
 * foi aposentado pelo Google. Toda foto tirada passou a falhar com "Não foi
 * possível analisar a imagem. Tente novamente." — e nenhuma tentativa ia
 * resolver, porque o modelo tinha deixado de existir. Reconhecer esta família
 * de erro é o que separa "espere e tente de novo" de "avise quem opera".
 */
describe('isModelUnavailable', () => {
  it.each([
    // 404 seco: modelo que nunca existiu para esta chave.
    'models/gemini-1.5-flash is not found for API version v1beta, or is not supported for generateContent.',
    // Descontinuado, com redação diferente e mais gentil.
    'This model models/gemini-2.5-flash is no longer available to new users. Please update your code.',
    '[GoogleGenerativeAI Error]: Error fetching from https://...: [404 ] Not Found',
    'NOT_FOUND',
  ])('reconhece modelo indisponível: %s', (message) => {
    expect(isModelUnavailable(message)).toBe(true);
  });

  it.each([
    'Resource has been exhausted (e.g. check quota).',
    'request timeout',
    'ETIMEDOUT',
    'API key not valid. Please pass a valid API key.',
    'Internal error encountered.',
  ])('não confunde com outra falha: %s', (message) => {
    expect(isModelUnavailable(message)).toBe(false);
  });
});

describe('isTransient', () => {
  /*
   * A falha que aparece na prática. Sem retentativa ela chega ao usuário logo
   * depois de ele enquadrar a lousa e esperar a análise.
   */
  it.each([
    '[GoogleGenerativeAI Error]: [503 ] This model is currently experiencing high demand.',
    'The model is overloaded. Please try again later.',
    'UNAVAILABLE',
    '429 Too Many Requests',
    'request timeout',
    'ETIMEDOUT',
    'ECONNRESET',
    'fetch failed',
  ])('repete: %s', (message) => {
    expect(isTransient(message)).toBe(true);
  });

  it.each([
    // Insistir aqui só triplicaria a espera antes do mesmo erro.
    'models/gemini-1.5-flash is not found for API version v1beta',
    'API key not valid. Please pass a valid API key.',
    'The image is too large.',
  ])('não repete: %s', (message) => {
    expect(isTransient(message)).toBe(false);
  });

  it('trata sobrecarga como caso próprio, separado de cota', () => {
    expect(isOverloaded('[503 ] high demand')).toBe(true);
    expect(isOverloaded('429 quota exceeded')).toBe(false);
  });
});

describe('backoffDelay', () => {
  it('dobra a espera a cada tentativa', () => {
    // Ruído fixo no meio da faixa isola o crescimento exponencial.
    const meio = () => 0.5;
    expect(backoffDelay(1, meio)).toBe(700);
    expect(backoffDelay(2, meio)).toBe(1400);
    expect(backoffDelay(3, meio)).toBe(2800);
  });

  /*
   * O ruído não é enfeite: sem ele, várias capturas que falharam juntas
   * voltariam no mesmo instante e sustentariam a sobrecarga que as derrubou.
   */
  it('espalha as tentativas em ±25% da espera base', () => {
    expect(backoffDelay(1, () => 0)).toBe(525);
    expect(backoffDelay(1, () => 1)).toBe(875);
  });
});

describe('buildCandidates', () => {
  /*
   * Sobrecarga no Gemini é por modelo: medindo a mesma foto no mesmo minuto,
   * uns responderam 503 e outros em 3,5s. Por isso a saída para "high demand"
   * é trocar de modelo, e não insistir no mesmo.
   */
  it('tenta o modelo configurado antes das alternativas', () => {
    expect(buildCandidates('gemini-3.5-flash-lite')[0]).toBe('gemini-3.5-flash-lite');
  });

  it('não repete o modelo configurado quando ele já é uma alternativa', () => {
    const candidatos = buildCandidates('gemini-3.6-flash');
    const ocorrencias = candidatos.filter((m) => m === 'gemini-3.6-flash');

    // Repetir custaria o dobro do tempo em um modelo lotado antes do próximo.
    expect(ocorrencias).toHaveLength(1);
  });

  it('sempre oferece mais de um modelo', () => {
    expect(buildCandidates('gemini-3.5-flash').length).toBeGreaterThan(1);
  });
});
