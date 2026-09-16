import { describe, expect, it } from "vitest";
import { pickVoice } from "./voice";

/** Constrói só o que `pickVoice` lê, sem depender da API do navegador. */
function voz(name: string, lang: string, localService = false): SpeechSynthesisVoice {
  return { name, lang, localService } as SpeechSynthesisVoice;
}

describe("pickVoice", () => {
  /*
   * O caso que motivou o arquivo: a lista do macOS traz Joana (pt-PT) antes de
   * Luciana (pt-BR), e a busca antiga por `startsWith("pt")` pegava a primeira.
   * O app lia resumo em português do Brasil com sotaque de Portugal.
   */
  it("prefere pt-BR mesmo quando pt-PT aparece primeiro", () => {
    const escolhida = pickVoice([voz("Joana", "pt-PT", true), voz("Luciana", "pt-BR", true)]);

    expect(escolhida?.name).toBe("Luciana");
  });

  it("prefere a voz instalada no aparelho entre duas pt-BR", () => {
    const escolhida = pickVoice([voz("Remota", "pt-BR"), voz("Local", "pt-BR", true)]);

    // A instalada não depende de rede e responde na hora.
    expect(escolhida?.name).toBe("Local");
  });

  it("aceita pt-BR remota antes de qualquer pt-PT instalada", () => {
    // O sotaque certo importa mais que a latência.
    const escolhida = pickVoice([voz("Joana", "pt-PT", true), voz("Francisca", "pt-BR")]);

    expect(escolhida?.name).toBe("Francisca");
  });

  it("cai para português de Portugal quando não há brasileiro", () => {
    // Ainda é melhor que uma voz inglesa lendo português.
    const escolhida = pickVoice([voz("Daniel", "en-GB", true), voz("Joana", "pt-PT", true)]);

    expect(escolhida?.name).toBe("Joana");
  });

  it("reconhece variações de escrita do código de idioma", () => {
    expect(pickVoice([voz("A", "pt_BR")])?.name).toBe("A");
    expect(pickVoice([voz("B", "PT-br")])?.name).toBe("B");
  });

  it("devolve null quando não há voz em português", () => {
    // Sem voz escolhida, o navegador usa a padrão — melhor que forçar inglês.
    expect(pickVoice([voz("Alex", "en-US", true)])).toBeNull();
  });

  it("devolve null para lista vazia", () => {
    expect(pickVoice([])).toBeNull();
  });
});
