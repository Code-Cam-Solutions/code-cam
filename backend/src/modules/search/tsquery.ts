/**
 * Tradução do que o usuário digita para uma `tsquery` do Postgres.
 *
 * Por que não `plainto_tsquery` ou `websearch_to_tsquery`, que já fazem isso:
 * nenhuma das duas casa prefixo. Quem digita "fotos" na barra de busca espera
 * ver "Fotossíntese" antes de terminar a palavra — sem prefixo, a busca só
 * responde quando o termo está completo, e uma busca que não responde enquanto
 * se digita parece quebrada.
 *
 * Construir a expressão à mão exige sanitizar: o texto vai para dentro de uma
 * `tsquery`, cuja sintaxe tem operadores próprios (`&`, `|`, `!`, `<->`,
 * parênteses). Um `!` solto derrubaria a consulta com erro de sintaxe, e uma
 * expressão maliciosa poderia forçar uma varredura cara. Por isso a lista é de
 * permissão, não de bloqueio: sobrevivem letras, números e espaço, e nada mais.
 */

/** Acima disso a consulta vira ruído, e cada termo custa uma varredura no índice. */
const MAX_TERMS = 8;

/** Termo de uma letra casa com quase tudo e não ajuda a encontrar nada. */
const MIN_TERM_LENGTH = 2;

export function toPrefixTsQuery(input: string): string | null {
  const terms = input
    // `\p{L}` e `\p{N}` com a flag `u` preservam acentos e ç, que a coluna
    // indexada remove depois via `immutable_unaccent` — remover aqui faria a
    // busca por "ção" virar "o" antes de chegar ao Postgres.
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .split(/\s+/)
    .map((term) => term.trim())
    .filter((term) => term.length >= MIN_TERM_LENGTH)
    .slice(0, MAX_TERMS);

  if (terms.length === 0) return null;

  // `&` entre os termos: a busca por "fotossíntese plantas" quer os dois, não
  // qualquer um dos dois. `:*` casa prefixo em cada um.
  return terms.map((term) => `${term}:*`).join(' & ');
}
