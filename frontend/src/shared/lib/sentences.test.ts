import { describe, expect, it } from "vitest";
import { splitSentences } from "./sentences";

describe("splitSentences", () => {
  it("separa frases comuns", () => {
    const texto =
      "A fotossíntese é um processo das plantas. Ela produz glicose e oxigênio. A clorofila capta a luz.";

    expect(splitSentences(texto)).toEqual([
      "A fotossíntese é um processo das plantas.",
      "Ela produz glicose e oxigênio.",
      "A clorofila capta a luz.",
    ]);
  });

  /*
   * O caso que define o formato da expressão regular. Cortar dentro de um
   * número decimal deixaria "A planta absorve 1." e "500 litros por dia",
   * dois fragmentos sem sentido — pior do que não dividir nada.
   */
  it("não corta dentro de número decimal", () => {
    const texto = "A planta absorve 1.500 litros por dia. Isso alimenta o processo.";

    expect(splitSentences(texto)).toEqual([
      "A planta absorve 1.500 litros por dia.",
      "Isso alimenta o processo.",
    ]);
  });

  it("mantém junto o fragmento curto demais para virar bloco", () => {
    // "Sim." sozinho não é uma ideia; é um pedaço da anterior.
    const blocos = splitSentences("A planta precisa de luz para viver. Sim.");

    expect(blocos).toHaveLength(1);
    expect(blocos[0]).toBe("A planta precisa de luz para viver. Sim.");
  });

  it("devolve o texto inteiro quando não há o que dividir", () => {
    const texto = "Um resumo curto sem pontuação final";
    expect(splitSentences(texto)).toEqual([texto]);
  });

  it("devolve lista vazia para texto vazio", () => {
    expect(splitSentences("   ")).toEqual([]);
  });

  it("preserva pergunta e exclamação como fim de frase", () => {
    expect(splitSentences("O que é fotossíntese? É como a planta se alimenta.")).toEqual([
      "O que é fotossíntese?",
      "É como a planta se alimenta.",
    ]);
  });
});
