import { Fragment } from "react";
import { cn } from "@/design-system";

interface HighlightedExcerptProps {
  /** Trecho vindo do `ts_headline`, com os termos entre `<mark>` e `</mark>`. */
  excerpt: string;
  className?: string;
}

const OPEN = "<mark>";
const CLOSE = "</mark>";

/**
 * Mostra o trecho do material com os termos buscados em destaque.
 *
 * O destaque é reconstruído em React, e não injetado como HTML.
 * `dangerouslySetInnerHTML` seria a saída óbvia — o Postgres já devolve a
 * marcação pronta —, mas `ts_headline` não escapa o texto de origem: um
 * material contendo `<img onerror=...>` viraria HTML executável na tela de
 * quem buscasse. Aqui as marcas são tratadas como delimitadores de texto, e
 * tudo o que não é marca continua sendo texto.
 */
export function HighlightedExcerpt({ excerpt, className }: HighlightedExcerptProps) {
  const segments = excerpt.split(OPEN).flatMap((chunk, index) => {
    if (index === 0) return [{ text: chunk, highlighted: false }];

    const [marked = "", ...rest] = chunk.split(CLOSE);
    return [
      { text: marked, highlighted: true },
      { text: rest.join(CLOSE), highlighted: false },
    ];
  });

  return (
    <p className={cn("text-sm text-text-muted", className)}>
      {segments.map((segment, index) =>
        segment.text === "" ? null : segment.highlighted ? (
          // `mark` traz o realce semântico junto: leitores de tela anunciam o
          // trecho como destacado, o que a cor sozinha não faria.
          <mark key={index} className="rounded bg-accent-subtle px-0.5 font-semibold text-accent">
            {segment.text}
          </mark>
        ) : (
          <Fragment key={index}>{segment.text}</Fragment>
        ),
      )}
    </p>
  );
}
