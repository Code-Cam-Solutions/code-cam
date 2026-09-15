/**
 * Separa o emoji que abre um texto do texto em si.
 *
 * A IA devolve tópicos e perguntas começando por um emoji quando ele ajuda a
 * reconhecer o assunto — "🌱 A clorofila capta a luz solar". Guardar assim, em
 * um campo só, é o que torna o recurso reversível: a interface mostra ou
 * esconde o emoji conforme a preferência de cada pessoa, sem precisar de coluna
 * nova no banco nem de gerar o conteúdo duas vezes.
 *
 * As três consequências disso, que eram as dúvidas da issue #3:
 *
 * - Desligar o modo dislexia remove os emojis da tela na hora, inclusive no
 *   material salvo antes — porque quem decide é quem desenha, não quem gravou.
 * - A leitura em voz alta nunca anuncia nome de emoji, porque o texto falado é
 *   sempre a parte sem ele. Sem isso, um leitor de tela leria "muda planta" ou
 *   "broto" no meio da frase.
 * - Material antigo, sem emoji, simplesmente não tem o que separar e continua
 *   exibido igual.
 */

/**
 * Emoji no início da string, seguido de espaço.
 *
 * `Extended_Pictographic` cobre o pictograma base; o grupo seguinte cobre as
 * partes que compõem um emoji só — tom de pele, seletor de variação e as
 * sequências unidas por ZWJ, como 👩‍🔬. Sem elas, a separação cortaria o
 * emoji ao meio e deixaria metade no texto.
 */
const LEADING_EMOJI =
  /^(\p{Extended_Pictographic}(?:\p{Emoji_Modifier}|️|‍\p{Extended_Pictographic})*)\s+/u;

export interface SplitText {
  /** O emoji de abertura, ou `null` quando o texto não começa com um. */
  emoji: string | null;
  /** O texto sem o emoji. É esta parte que vai para a leitura em voz alta. */
  text: string;
}

export function splitLeadingEmoji(value: string): SplitText {
  const match = LEADING_EMOJI.exec(value);
  if (!match?.[1]) return { emoji: null, text: value };

  return { emoji: match[1], text: value.slice(match[0].length) };
}

/**
 * O texto sem o emoji de abertura.
 *
 * Atalho para os pontos que só querem a parte falada ou pesquisável, onde o
 * emoji seria ruído.
 */
export function withoutLeadingEmoji(value: string): string {
  return splitLeadingEmoji(value).text;
}
