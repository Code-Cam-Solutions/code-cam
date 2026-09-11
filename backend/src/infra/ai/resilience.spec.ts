import { attemptBudget, backoffDelay, buildCandidates, isModelUnavailable, isOverloaded, isTimeout, isTransient } from './resilience';

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
  const ALTERNATIVAS = ['modelo-b', 'modelo-c'];

  /*
   * Sobrecarga é por modelo, não por fornecedor: medindo a mesma foto no mesmo
   * minuto, uns modelos responderam 503 e outros em segundos. Por isso a saída
   * para "high demand" é trocar de modelo, e não insistir no mesmo.
   */
  it('tenta o modelo configurado antes das alternativas', () => {
    expect(buildCandidates('modelo-a', ALTERNATIVAS)[0]).toBe('modelo-a');
  });

  it('não repete o modelo configurado quando ele já é uma alternativa', () => {
    const candidatos = buildCandidates('modelo-b', ALTERNATIVAS);
    const ocorrencias = candidatos.filter((m) => m === 'modelo-b');

    // Repetir custaria o dobro do tempo em um modelo lotado antes do próximo.
    expect(ocorrencias).toHaveLength(1);
  });

  it('sempre oferece mais de um modelo', () => {
    expect(buildCandidates('modelo-a', ALTERNATIVAS).length).toBeGreaterThan(1);
  });
});

describe('attemptBudget', () => {
  /*
   * O caso que motivou a função: uma chamada travada consumia os 45s inteiros,
   * e os dois modelos seguintes — que podiam estar livres — nunca eram
   * tentados. O log registrava "tentativa 1" e "orçamento esgotado" no mesmo
   * segundo.
   */
  it('reparte o tempo restante entre os modelos que faltam', () => {
    expect(attemptBudget(300_000, 3)).toBe(100_000);
    expect(attemptBudget(180_000, 2)).toBe(90_000);
  });

  it('não deixa uma tentativa abaixo do mínimo útil', () => {
    // Cortar uma chamada que ia responder não economiza nada: a foto continua
    // sem análise e a pessoa paga a espera duas vezes.
    expect(attemptBudget(2_000, 3)).toBe(45_000);
  });

  it('não deixa uma tentativa monopolizar o orçamento', () => {
    expect(attemptBudget(600_000, 1)).toBe(120_000);
  });

  it('trata o último modelo sem dividir por zero', () => {
    expect(attemptBudget(60_000, 0)).toBe(60_000);
  });
});

describe('isTimeout', () => {
  /*
   * Separado das demais falhas passageiras por medição: o kimi-k3 estourou 45s,
   * foi tentado de novo e estourou outros 22s antes de a vez passar ao modelo
   * seguinte. Insistir num modelo que não respondeu no prazo é gastar a espera
   * do usuário sem chance de sucesso.
   */
  it('reconhece o estouro do próprio relógio', () => {
    expect(isTimeout('timeout: o modelo não respondeu em 45000ms')).toBe(true);
    expect(isTimeout('connect ETIMEDOUT 10.0.0.1:443')).toBe(true);
  });

  it('não confunde com sobrecarga nem com modelo inexistente', () => {
    expect(isTimeout('503 This model is currently experiencing high demand')).toBe(false);
    expect(isTimeout('HTTP 404: Not Found')).toBe(false);
  });

  it('continua sendo uma falha passageira', () => {
    // O laço de tentativas só continua para falha passageira; se o timeout
    // saísse dessa categoria, ele passaria a ser lançado na hora.
    expect(isTransient('timeout: o modelo não respondeu em 45000ms')).toBe(true);
  });
});
