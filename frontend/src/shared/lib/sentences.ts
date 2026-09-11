/**
 * Quebra um texto corrido em frases.
 *
 * Serve ao apoio de leitura: um parágrafo de seis linhas é uma parede para
 * quem tem dislexia, e a dificuldade maior não é decodificar a palavra — é
 * reencontrar o lugar depois de desviar o olho. Uma frase por bloco dá um
 * ponto de retorno a cada ideia.
 *
 * A divisão é deliberadamente conservadora. Errar para menos deixa duas frases
 * juntas, o que é apenas o comportamento de hoje; errar para mais corta uma
 * frase no meio de "Dr." ou de "1.500", o que é pior que não dividir.
 */

/**
 * Corta depois de `.`, `!` ou `?` quando vem espaço e uma letra maiúscula ou um
 * algarismo. Exigir a maiúscula é o que protege abreviação e número decimal:
 * em "1.500 mil" o que segue o ponto é minúsculo ou dígito colado, sem espaço.
 */
const FIM_DE_FRASE = /(?<=[.!?])\s+(?=[A-ZÀ-ÜÁÉÍÓÚÂÊÔÃÕÇ0-9])/u;

/**
 * Abaixo disto, o pedaço é fragmento e não ideia — junta-se ao bloco anterior.
 *
 * O valor é baixo de propósito. Começou em 25 e o teste mostrou o problema:
 * "A clorofila capta a luz." tem 24 caracteres e é uma frase inteira, que ia
 * sendo colada na anterior. O que este limiar precisa pegar é "Sim." e "É
 * isso.", não frase curta legítima.
 */
const MINIMO_DE_CARACTERES = 12;

export function splitSentences(text: string): string[] {
  const limpo = text.trim();
  if (limpo === '') return [];

  const partes = limpo
    .split(FIM_DE_FRASE)
    .map((parte) => parte.trim())
    .filter((parte) => parte.length > 0);

  // Junta ao anterior o pedaço curto demais para valer um bloco próprio.
  const blocos: string[] = [];
  for (const parte of partes) {
    const anterior = blocos[blocos.length - 1];
    if (anterior !== undefined && parte.length < MINIMO_DE_CARACTERES) {
      blocos[blocos.length - 1] = `${anterior} ${parte}`;
    } else {
      blocos.push(parte);
    }
  }

  return blocos;
}
