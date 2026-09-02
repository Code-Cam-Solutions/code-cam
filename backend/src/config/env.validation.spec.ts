import { validateEnv } from './env.validation';

const VALID = {
  DATABASE_URL: 'postgresql://user@localhost:5432/codecam',
  JWT_SECRET: 'x'.repeat(32),
  PORT: '3000',
  FRONTEND_URL: 'http://localhost:5173',
};

describe('validateEnv', () => {
  it('aceita uma configuração completa e converte os tipos', () => {
    const env = validateEnv(VALID);

    expect(env.PORT).toBe(3000);
    expect(env.FRONTEND_URL).toEqual(['http://localhost:5173']);
    expect(env.GEMINI_API_KEY).toBeUndefined();
  });

  it('aceita várias origens separadas por vírgula', () => {
    const env = validateEnv({
      ...VALID,
      FRONTEND_URL: 'http://localhost:5173, https://codecam.vercel.app',
    });

    expect(env.FRONTEND_URL).toEqual(['http://localhost:5173', 'https://codecam.vercel.app']);
  });

  /*
   * O caso que motivou a validação: antes existia
   * `process.env.JWT_SECRET || 'codecam-secret'`. Com a variável esquecida em
   * produção, o servidor subia assinando tokens com um segredo que está no
   * código-fonte — qualquer um poderia forjar a sessão de qualquer usuário.
   */
  it('recusa subir sem JWT_SECRET', () => {
    expect(() => validateEnv({ ...VALID, JWT_SECRET: undefined })).toThrow(/JWT_SECRET/);
  });

  it('recusa um JWT_SECRET curto demais para o HMAC-SHA256', () => {
    expect(() => validateEnv({ ...VALID, JWT_SECRET: 'curto' })).toThrow(/ao menos 32/);
  });

  it('recusa DATABASE_URL ausente ou de outro banco', () => {
    expect(() => validateEnv({ ...VALID, DATABASE_URL: undefined })).toThrow(/DATABASE_URL/);
    expect(() => validateEnv({ ...VALID, DATABASE_URL: 'mysql://localhost/x' })).toThrow(
      /PostgreSQL/,
    );
  });

  it('recusa uma porta fora da faixa válida', () => {
    expect(() => validateEnv({ ...VALID, PORT: '70000' })).toThrow(/PORT/);
    expect(() => validateEnv({ ...VALID, PORT: 'abc' })).toThrow(/PORT/);
  });

  it('reúne todos os problemas em uma mensagem só', () => {
    // Descobrir um erro de configuração por vez, com um reinício entre cada um,
    // é o pior jeito possível de configurar um ambiente novo.
    expect(() => validateEnv({})).toThrow(/DATABASE_URL[\s\S]*JWT_SECRET/);
  });
});
