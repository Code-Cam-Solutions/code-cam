import { buildScanPrompt } from './scan.prompt';

describe('buildScanPrompt', () => {
  it('pede apenas os formatos solicitados', () => {
    const prompt = buildScanPrompt(['summary']);

    // Gerar oito flashcards que ninguém pediu custa tokens, custa segundos de
    // espera e dilui a atenção do modelo no que foi de fato solicitado.
    expect(prompt).toContain('"summary"');
    expect(prompt).not.toContain('"flashcards"');
    expect(prompt).not.toContain('"topics"');
  });

  it('inclui os três formatos quando todos são pedidos', () => {
    const prompt = buildScanPrompt(['summary', 'topics', 'flashcards']);

    expect(prompt).toContain('"summary"');
    expect(prompt).toContain('"topics"');
    expect(prompt).toContain('"flashcards"');
  });

  it('sempre pede título e transcrição, que não são formatos escolhíveis', () => {
    const prompt = buildScanPrompt(['topics']);

    expect(prompt).toContain('"title"');
    expect(prompt).toContain('"rawText"');
  });

  it('cai no resumo quando a lista chega vazia', () => {
    expect(buildScanPrompt([])).toContain('"summary"');
  });
});

describe('buildScanPrompt com várias fotos', () => {
  /*
   * Dizer que as imagens são o mesmo material é o que decide o resultado. Sem
   * essa instrução o modelo descreve cada foto em separado, e sai um resumo
   * colado de dois pedaços em vez de um texto contínuo — o contrário do que a
   * pessoa pediu ao fotografar a lousa em partes.
   */
  it('avisa que as imagens são partes do mesmo conteúdo', () => {
    const prompt = buildScanPrompt(['summary', 'topics'], 3);

    expect(prompt).toContain('3 imagens');
    expect(prompt).toContain('MESMO material');
  });

  it('pede um resultado único, não um por imagem', () => {
    const prompt = buildScanPrompt(['summary', 'topics', 'flashcards'], 2);

    expect(prompt).toContain('conteúdo único');
    expect(prompt).toContain('Não descreva as imagens separadamente');
  });

  it('não menciona várias imagens quando só há uma', () => {
    const prompt = buildScanPrompt(['summary'], 1);

    expect(prompt).not.toContain('MESMO material');
    expect(prompt).toContain('esta imagem');
  });

  it('trata a ausência de contagem como uma imagem só', () => {
    // O parâmetro é opcional para não quebrar quem chama com um argumento.
    expect(buildScanPrompt(['summary'])).toBe(buildScanPrompt(['summary'], 1));
  });
});
