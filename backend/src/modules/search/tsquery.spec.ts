import { toPrefixTsQuery } from './tsquery';

describe('toPrefixTsQuery', () => {
  it('casa prefixo em cada termo', () => {
    // Quem digita "fotos" espera ver "Fotossíntese" antes de terminar a
    // palavra — é o que separa uma busca viva de uma que parece quebrada.
    expect(toPrefixTsQuery('fotos')).toBe('fotos:*');
  });

  it('exige todos os termos, não qualquer um', () => {
    expect(toPrefixTsQuery('fotossintese plantas')).toBe('fotossintese:* & plantas:*');
  });

  it('preserva acento e ç para o unaccent do Postgres resolver', () => {
    // Remover aqui faria a busca por "ção" chegar ao banco como "o".
    expect(toPrefixTsQuery('fotossíntese ação')).toBe('fotossíntese:* & ação:*');
  });

  /*
   * O texto vai para dentro de uma tsquery, cuja sintaxe tem operadores
   * próprios. Um `!` solto derruba a consulta com erro de sintaxe; uma
   * expressão montada de propósito poderia forçar uma varredura cara.
   */
  it('neutraliza os operadores da tsquery', () => {
    expect(toPrefixTsQuery('planta & !animal')).toBe('planta:* & animal:*');
    expect(toPrefixTsQuery("'; DROP TABLE contents; --")).toBe('DROP:* & TABLE:* & contents:*');
    expect(toPrefixTsQuery('a <-> b')).toBeNull();
  });

  it('descarta termo de uma letra, que casaria com quase tudo', () => {
    expect(toPrefixTsQuery('a fotossintese')).toBe('fotossintese:*');
  });

  it('devolve nulo quando não sobra termo algum', () => {
    expect(toPrefixTsQuery('')).toBeNull();
    expect(toPrefixTsQuery('   ')).toBeNull();
    expect(toPrefixTsQuery('!!! ???')).toBeNull();
  });

  it('limita a quantidade de termos', () => {
    const query = toPrefixTsQuery('um dois tres quatro cinco seis sete oito nove dez');

    expect(query?.split(' & ')).toHaveLength(8);
  });
});
