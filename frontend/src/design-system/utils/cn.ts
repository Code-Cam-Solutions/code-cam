import { clsx, type ClassValue } from "clsx";
import { extendTailwindMerge } from "tailwind-merge";

/**
 * O tailwind-merge precisa conhecer as escalas customizadas para saber quais
 * classes conflitam entre si. Sem isto ele trataria `text-2xs` como cor de
 * texto e deixaria passar `text-2xs text-lg`, com o navegador decidindo pela
 * ordem no CSS em vez de pela ordem no JSX.
 */
const twMerge = extendTailwindMerge({
  extend: {
    classGroups: {
      "font-size": [
        {
          text: ["2xs", "xs", "sm", "base", "lg", "xl", "2xl", "3xl", "4xl"],
        },
      ],
      shadow: [{ shadow: ["sm", "md", "lg", "accent", "none"] }],
      rounded: [{ rounded: ["sm", "md", "lg", "xl", "2xl", "full", "none"] }],
    },
  },
});

/**
 * Junta classes condicionais e resolve conflitos do Tailwind, de modo que a
 * classe passada por quem usa o componente sempre vença a padrão.
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
