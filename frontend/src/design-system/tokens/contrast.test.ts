import { describe, expect, it } from "vitest";
import { CONTRAST_PAIRS, contrast, palette, type ThemeName } from "./palette";

/**
 * A paleta é o único lugar do app onde uma cor é definida. Se um par cair
 * abaixo do limiar da WCAG, toda a interface fica menos legível de uma vez —
 * então a checagem roda na suíte de testes, e não como script opcional.
 */

/** No alto contraste o alvo de texto sobe de AA (4.5:1) para AAA (7:1). */
const AAA_MULTIPLIER = 7 / 4.5;

function requiredRatio(min: number, highContrast: boolean): number {
  return highContrast ? min * AAA_MULTIPLIER : min;
}

describe("paleta do design system", () => {
  describe.each<[string, ThemeName, boolean]>([
    ["claro", "light", false],
    ["escuro", "dark", false],
    ["claro + alto contraste", "lightHc", true],
    ["escuro + alto contraste", "darkHc", true],
  ])("tema %s", (_name, theme, highContrast) => {
    const colors = palette[theme];

    it.each(CONTRAST_PAIRS.map((pair) => [pair.label, pair] as const))(
      "%s atende ao limiar",
      (_label, pair) => {
        const ratio = contrast(colors[pair.fg], colors[pair.bg]);
        expect(ratio).toBeGreaterThanOrEqual(requiredRatio(pair.min, highContrast));
      },
    );
  });

  it("mantém o acento distinguível do fundo em todos os temas", () => {
    // O acento carrega ações primárias e o estado ativo da navegação; abaixo de
    // 3:1 ele deixa de ser percebido como destaque.
    for (const [name, colors] of Object.entries(palette)) {
      expect(contrast(colors.accent, colors.bg), `tema ${name}`).toBeGreaterThanOrEqual(3);
    }
  });

  it("calcula contraste conforme a definição da WCAG", () => {
    // Os dois extremos da escala servem de âncora para o cálculo.
    expect(contrast("#000000", "#FFFFFF")).toBeCloseTo(21, 1);
    expect(contrast("#FFFFFF", "#FFFFFF")).toBeCloseTo(1, 5);
  });
});
