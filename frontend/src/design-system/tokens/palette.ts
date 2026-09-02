/**
 * A paleta do design system, em dado puro.
 *
 * Espelha os valores de `tokens.css`. A duplicação é deliberada e restrita a
 * este par de arquivos: o CSS é o que o navegador consome, e esta cópia é o que
 * a suíte de testes consegue inspecionar. Alterar uma cor exige tocar os dois,
 * e o teste de contraste falha se a paleta sair dos limiares da WCAG.
 */

export interface ThemeColors {
  bg: string;
  surface: string;
  surfaceRaised: string;
  surfaceSunken: string;
  border: string;
  borderStrong: string;
  text: string;
  textMuted: string;
  textSubtle: string;
  accent: string;
  accentHover: string;
  accentContrast: string;
  accentSubtle: string;
  success: string;
  successSubtle: string;
  warning: string;
  warningSubtle: string;
  danger: string;
  dangerSubtle: string;
}

export type ThemeName = "light" | "dark" | "lightHc" | "darkHc";

export const palette: Record<ThemeName, ThemeColors> = {
  light: {
    bg: "#F7F7FA",
    surface: "#FFFFFF",
    surfaceRaised: "#FFFFFF",
    surfaceSunken: "#EFEFF4",
    border: "#E0E0E8",
    borderStrong: "#8C8C9C",
    text: "#15151B",
    textMuted: "#5A5A68",
    textSubtle: "#6B6B7D",
    accent: "#5B4BD6",
    accentHover: "#4A3BC4",
    accentContrast: "#FFFFFF",
    accentSubtle: "#EDEBFC",
    success: "#0F7A52",
    successSubtle: "#E3F5EE",
    warning: "#8A5A00",
    warningSubtle: "#FDF2DC",
    danger: "#C4283C",
    dangerSubtle: "#FCEAEC",
  },
  dark: {
    bg: "#0E0E13",
    surface: "#17171E",
    surfaceRaised: "#1E1E27",
    surfaceSunken: "#0A0A0E",
    border: "#282833",
    borderStrong: "#65657A",
    text: "#F4F4F7",
    textMuted: "#A6A6B4",
    textSubtle: "#8A8A99",
    accent: "#8A7BF5",
    accentHover: "#9C8FF7",
    accentContrast: "#0E0E13",
    accentSubtle: "#1D1B33",
    success: "#3DD68C",
    successSubtle: "#10281E",
    warning: "#F5B547",
    warningSubtle: "#2B2110",
    danger: "#FF6B7A",
    dangerSubtle: "#2E1418",
  },
  /** Alto contraste não é um tema novo: endurece o tema vigente até o nível AAA. */
  lightHc: {
    bg: "#FFFFFF",
    surface: "#FFFFFF",
    surfaceRaised: "#FFFFFF",
    surfaceSunken: "#F0F0F0",
    border: "#000000",
    borderStrong: "#000000",
    text: "#000000",
    textMuted: "#1A1A1A",
    textSubtle: "#333333",
    accent: "#0000CC",
    accentHover: "#0000AA",
    accentContrast: "#FFFFFF",
    accentSubtle: "#E6E6FF",
    success: "#00451F",
    successSubtle: "#E6F5ED",
    warning: "#664400",
    warningSubtle: "#FFF4E0",
    danger: "#990010",
    dangerSubtle: "#FFE6E6",
  },
  darkHc: {
    bg: "#000000",
    surface: "#000000",
    surfaceRaised: "#0D0D0D",
    surfaceSunken: "#000000",
    border: "#FFFFFF",
    borderStrong: "#FFFFFF",
    text: "#FFFFFF",
    textMuted: "#E8E8E8",
    textSubtle: "#D0D0D0",
    accent: "#FFE600",
    accentHover: "#FFF04D",
    accentContrast: "#000000",
    accentSubtle: "#332E00",
    success: "#4DFF9E",
    successSubtle: "#00260F",
    warning: "#FFD24D",
    warningSubtle: "#332600",
    danger: "#FF8A94",
    dangerSubtle: "#330A0E",
  },
};

// ─── Contraste (WCAG 2.2) ───────────────────────────────────────────────────

function channels(hex: string): [number, number, number] {
  const value = hex.replace("#", "");
  const [r, g, b] = [0, 2, 4].map((i) => Number.parseInt(value.slice(i, i + 2), 16) / 255);
  return [r ?? 0, g ?? 0, b ?? 0];
}

/** Luminância relativa, conforme a definição da WCAG. */
function luminance(hex: string): number {
  const [r, g, b] = channels(hex).map((channel) =>
    channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4,
  ) as [number, number, number];
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** Razão de contraste entre duas cores, de 1:1 a 21:1. */
export function contrast(a: string, b: string): number {
  const [high, low] = [luminance(a), luminance(b)].sort((x, y) => y - x) as [number, number];
  return (high + 0.05) / (low + 0.05);
}

/** Pares de cores que efetivamente aparecem juntos na interface. */
export const CONTRAST_PAIRS: {
  label: string;
  fg: keyof ThemeColors;
  bg: keyof ThemeColors;
  /** Limiar da WCAG: 4.5 para texto, 3 para componente de interface. */
  min: number;
}[] = [
  { label: "texto sobre o fundo da página", fg: "text", bg: "bg", min: 4.5 },
  { label: "texto sobre card", fg: "text", bg: "surface", min: 4.5 },
  { label: "texto sobre card elevado", fg: "text", bg: "surfaceRaised", min: 4.5 },
  { label: "texto secundário sobre o fundo", fg: "textMuted", bg: "bg", min: 4.5 },
  { label: "texto secundário sobre card", fg: "textMuted", bg: "surface", min: 4.5 },
  { label: "texto terciário sobre card", fg: "textSubtle", bg: "surface", min: 4.5 },
  { label: "rótulo do botão primário", fg: "accentContrast", bg: "accent", min: 4.5 },
  { label: "rótulo do botão primário em hover", fg: "accentContrast", bg: "accentHover", min: 4.5 },
  { label: "acento como texto sobre card", fg: "accent", bg: "surface", min: 4.5 },
  { label: "acento como texto sobre o fundo", fg: "accent", bg: "bg", min: 4.5 },
  { label: "texto sobre acento suave", fg: "accent", bg: "accentSubtle", min: 4.5 },
  { label: "borda de campo sobre card", fg: "borderStrong", bg: "surface", min: 3 },
  { label: "sucesso sobre seu fundo suave", fg: "success", bg: "successSubtle", min: 4.5 },
  { label: "alerta sobre seu fundo suave", fg: "warning", bg: "warningSubtle", min: 4.5 },
  { label: "erro sobre seu fundo suave", fg: "danger", bg: "dangerSubtle", min: 4.5 },
  { label: "erro como texto sobre card", fg: "danger", bg: "surface", min: 4.5 },

  // Cards tingidos — um destaque com texto corrido por cima, usado nos avisos,
  // nos selos e nos blocos de chamada para ação.
  { label: "texto sobre acento suave", fg: "text", bg: "accentSubtle", min: 4.5 },
  { label: "texto secundário sobre acento suave", fg: "textMuted", bg: "accentSubtle", min: 4.5 },
  { label: "texto sobre sucesso suave", fg: "text", bg: "successSubtle", min: 4.5 },
  { label: "texto secundário sobre sucesso suave", fg: "textMuted", bg: "successSubtle", min: 4.5 },
  { label: "texto sobre alerta suave", fg: "text", bg: "warningSubtle", min: 4.5 },
  { label: "texto secundário sobre alerta suave", fg: "textMuted", bg: "warningSubtle", min: 4.5 },
  { label: "texto sobre erro suave", fg: "text", bg: "dangerSubtle", min: 4.5 },
  { label: "texto secundário sobre erro suave", fg: "textMuted", bg: "dangerSubtle", min: 4.5 },
];
