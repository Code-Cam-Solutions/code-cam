import { parseScanResponse, ScanParseError } from './scan.parser';

const COMPLETE = JSON.stringify({
  title: 'Fotossíntese',
  summary: 'Processo pelo qual as plantas produzem seu próprio alimento.',
  topics: ['Clorofila', 'Luz solar'],
  flashcards: [{ question: 'O que é fotossíntese?', answer: 'A produção de glicose com luz.' }],
  rawText: '6 CO2 + 6 H2O -> C6H12O6 + 6 O2',
});

describe('parseScanResponse', () => {
  it('interpreta uma resposta bem formada', () => {
    const result = parseScanResponse(COMPLETE);

    expect(result.title).toBe('Fotossíntese');
    expect(result.topics).toEqual(['Clorofila', 'Luz solar']);
    expect(result.flashcards).toHaveLength(1);
  });

  it('remove as cercas de markdown que o modelo insiste em acrescentar', () => {
    expect(parseScanResponse('```json\n' + COMPLETE + '\n```').title).toBe('Fotossíntese');
    expect(parseScanResponse('```\n' + COMPLETE + '\n```').title).toBe('Fotossíntese');
  });

  /*
   * `String(valor)` transformaria um objeto em "[object Object]" — que seria
   * salvo e exibido como o título do material do usuário.
   */
  it('não deixa um objeto virar "[object Object]" em campo de texto', () => {
    const result = parseScanResponse(JSON.stringify({ title: { nested: true }, summary: 'ok' }));

    expect(result.title).toBe('Material sem título');
    expect(result.summary).toBe('ok');
  });

  it('descarta cartão sem pergunta ou sem resposta', () => {
    const result = parseScanResponse(
      JSON.stringify({
        title: 'T',
        flashcards: [
          { question: 'Vale?', answer: 'Vale.' },
          { question: 'Sem resposta' },
          { answer: 'Sem pergunta' },
          null,
          'texto solto',
        ],
      }),
    );

    // Um cartão pela metade não é estudável: apareceria em branco no meio da
    // sessão, sem que o usuário soubesse o que aconteceu.
    expect(result.flashcards).toEqual([{ question: 'Vale?', answer: 'Vale.' }]);
  });

  it('tolera campos ausentes devolvendo listas vazias', () => {
    const result = parseScanResponse(JSON.stringify({ title: 'Só título' }));

    expect(result.topics).toEqual([]);
    expect(result.flashcards).toEqual([]);
    expect(result.rawText).toBe('');
  });

  it('sinaliza resposta que não é JSON, preservando o texto para o log', () => {
    expect(() => parseScanResponse('Desculpe, não consegui ler a imagem.')).toThrow(ScanParseError);
  });
});
