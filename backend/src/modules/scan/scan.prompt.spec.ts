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
