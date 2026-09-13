import type { ActivityDay } from "@/api";
import { cn } from "@/design-system";

interface ActivityChartProps {
  days: ActivityDay[];
  className?: string;
}

/** Iniciais dos dias da semana, na ordem que `Date.getDay()` devolve. */
const WEEKDAY_INITIALS = ["D", "S", "T", "Q", "Q", "S", "S"];

/** Altura mínima da barra de um dia sem estudo, para o traço ainda existir. */
const EMPTY_BAR_HEIGHT = 3;

function parseLocalDate(iso: string): Date {
  // `new Date("2026-09-02")` é interpretado como UTC e, a oeste de Greenwich,
  // volta um dia — o gráfico mostraria o dia da semana errado.
  const [year, month, day] = iso.split("-").map(Number);
  return new Date(year ?? 2000, (month ?? 1) - 1, day ?? 1);
}

function formatDay(iso: string): string {
  return parseLocalDate(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "long" });
}

/**
 * Revisões por dia nas últimas duas semanas.
 *
 * Uma série só, então uma cor só e nenhuma legenda: o título já diz o que as
 * barras são. Os dias sem estudo aparecem como traço, e não como ausência —
 * é o que faz a distância entre as barras representar tempo, e não apenas a
 * ordem das sessões.
 *
 * Não há rótulo em cima de cada barra: número em todo ponto vira ruído. Só o
 * dia de maior esforço e o de hoje são nomeados, e o resto é lido pela altura.
 */
export function ActivityChart({ days, className }: ActivityChartProps) {
  const peak = Math.max(...days.map((day) => day.reviews), 1);
  const total = days.reduce((sum, day) => sum + day.reviews, 0);
  const todayIndex = days.length - 1;

  return (
    <figure className={cn("m-0", className)}>
      <figcaption className="mb-3 flex items-baseline justify-between gap-2">
        <span className="text-sm font-semibold text-text">Últimas duas semanas</span>
        <span className="text-xs text-text-subtle tabular-nums">
          {total} {total === 1 ? "revisão" : "revisões"}
        </span>
      </figcaption>

      {/* `aria-hidden` porque a tabela abaixo diz o mesmo em texto: para quem
          usa leitor de tela, 14 retângulos sem rótulo não são informação. */}
      <div className="flex h-24 items-end gap-1" aria-hidden="true">
        {days.map((day, index) => {
          const isToday = index === todayIndex;
          const height = day.reviews === 0 ? EMPTY_BAR_HEIGHT : (day.reviews / peak) * 100;

          return (
            <div key={day.date} className="flex h-full flex-1 flex-col justify-end">
              <div
                title={`${formatDay(day.date)}: ${day.reviews} ${day.reviews === 1 ? "revisão" : "revisões"}`}
                style={{ height: `${height}%` }}
                className={cn(
                  // Cantos arredondados só no topo: a base fica ancorada na
                  // linha de zero, que é de onde a altura deve ser lida.
                  "w-full rounded-t transition-[height] duration-500 ease-enter",
                  day.reviews === 0 ? "bg-border" : isToday ? "bg-accent" : "bg-accent/55",
                )}
              />
            </div>
          );
        })}
      </div>

      <div className="mt-1.5 flex gap-1" aria-hidden="true">
        {days.map((day, index) => (
          <span
            key={day.date}
            className={cn(
              "flex-1 text-center text-2xs tabular-nums",
              index === todayIndex ? "font-semibold text-text" : "text-text-subtle",
            )}
          >
            {WEEKDAY_INITIALS[parseLocalDate(day.date).getDay()]}
          </span>
        ))}
      </div>

      {/* Alternativa textual. Cumpre a WCAG 1.1.1 sem duplicar nada na tela. */}
      {/*
        O `sr-only` vai no invólucro, não na tabela.
        `display: table` usa dimensionamento intrínseco e ignora o `width: 1px`
        da classe: a tabela continuava ocupando 276px de altura invisível, e a
        tela inicial rolava esse tanto além do conteúdo. Numa `div` a regra
        pega, e a tabela lá dentro mantém a semântica que o leitor de tela usa.
      */}
      <div className="sr-only">
        <table>
          <caption>Revisões por dia nas últimas duas semanas</caption>
          <thead>
            <tr>
              <th scope="col">Dia</th>
              <th scope="col">Revisões</th>
            </tr>
          </thead>
          <tbody>
            {days.map((day) => (
              <tr key={day.date}>
                <th scope="row">{formatDay(day.date)}</th>
                <td>{day.reviews}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </figure>
  );
}
