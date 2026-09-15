import { describe, expect, it } from "vitest";
import { splitLeadingEmoji, withoutLeadingEmoji } from "./emoji";

describe("splitLeadingEmoji", () => {
  it("separa o emoji de abertura do texto", () => {
    expect(splitLeadingEmoji("🌱 A clorofila capta a luz solar")).toEqual({
      emoji: "🌱",
      text: "A clorofila capta a luz solar",
    });
  });

  it("devolve o texto intacto quando não há emoji", () => {
    // Material salvo antes deste recurso cai aqui, e continua exibido igual.
    expect(splitLeadingEmoji("A clorofila capta a luz solar")).toEqual({
      emoji: null,
      text: "A clorofila capta a luz solar",
    });
  });

  /*
   * Emoji não é um caractere só. Cortar pelo primeiro ponto de código deixaria
   * metade da sequência no texto — o tom de pele viraria um quadrado solto, e a
   * cientista 👩‍🔬 viraria "👩" seguido de um caractere invisível.
   */
  it("mantém inteiro o emoji com tom de pele", () => {
    const { emoji, text } = splitLeadingEmoji("👩🏽‍🔬 Método científico");

    expect(emoji).toBe("👩🏽‍🔬");
    expect(text).toBe("Método científico");
  });

  it("mantém inteira a sequência unida por ZWJ", () => {
    expect(splitLeadingEmoji("👨‍👩‍👧 Família").emoji).toBe("👨‍👩‍👧");
  });

  it("mantém o seletor de variação junto do símbolo", () => {
    expect(splitLeadingEmoji("⚗️ Reações químicas").emoji).toBe("⚗️");
  });

  it("não separa emoji que aparece no meio da frase", () => {
    // Só o de abertura é decoração; um no meio faz parte do que foi escrito.
    const valor = "A planta 🌱 cresce";
    expect(splitLeadingEmoji(valor)).toEqual({ emoji: null, text: valor });
  });

  it("exige espaço depois do emoji", () => {
    // Sem espaço, o emoji provavelmente faz parte da palavra ou é uma unidade.
    expect(splitLeadingEmoji("🌱Clorofila").emoji).toBeNull();
  });

  it("lida com texto vazio", () => {
    expect(splitLeadingEmoji("")).toEqual({ emoji: null, text: "" });
  });
});

describe("withoutLeadingEmoji", () => {
  it("devolve só a parte falada", () => {
    // É esta string que vai para a leitura em voz alta: sem ela, o leitor de
    // tela anunciaria o nome do emoji no meio do conteúdo.
    expect(withoutLeadingEmoji("📐 Teorema de Pitágoras")).toBe("Teorema de Pitágoras");
  });
});
