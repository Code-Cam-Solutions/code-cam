import { cn } from "../utils/cn";

export interface RingProps {
  /** Valor de 0 a 100. */
  value: number;
  label: string;
  /** Texto no centro. Sem ele, o próprio percentual é exibido. */
  caption?: string;
  size?: number;
  tone?: "accent" | "success" | "warning";
  className?: string;
}

const TONES = {
  accent: "text-accent",
  success: "text-success",
  warning: "text-warning",
} as const;

/**
 * Anel de progresso para um único número em destaque.
 *
 * O anel não é decoração: um percentual sozinho não diz o quanto falta, e a
 * volta incompleta mostra a distância até o fim sem precisar de segunda linha
 * de texto. Vale para um valor só — para comparar séries, barra.
 *
 * O traço parte das 12 horas (`-rotate-90`) porque é de onde o olho espera que
 * um medidor comece.
 */
export function Ring({ value, label, caption, size = 96, tone = "accent", className }: RingProps) {
  const clamped = Math.min(100, Math.max(0, value));

  // Geometria em unidades de viewBox, não em pixels: o SVG escala junto com
  // `size` sem recalcular espessura nem raio.
  const radius = 42;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - clamped / 100);

  return (
    <div className={cn("relative shrink-0", className)} style={{ width: size, height: size }}>
      <svg viewBox="0 0 100 100" className="size-full -rotate-90" aria-hidden="true">
        {/* Trilho. Usa a cor de borda e não a superfície rebaixada: sobre um
            cartão escuro, `surface-sunken` é quase a mesma cor do cartão e o
            anel perde a referência do que seria 100%. */}
        <circle
          cx="50"
          cy="50"
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth="9"
          className="text-border-strong opacity-35"
        />
        <circle
          cx="50"
          cy="50"
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth="9"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className={cn(TONES[tone], "transition-[stroke-dashoffset] duration-700 ease-enter")}
        />
      </svg>

      {/* O número vive fora do SVG: texto em HTML acompanha o ajuste de
          tamanho de fonte da acessibilidade, texto em SVG não. */}
      <div className="absolute inset-0 grid place-items-center text-center">
        <div>
          <p className="text-xl font-bold tracking-tight text-text tabular-nums">{clamped}%</p>
          {caption !== undefined && <p className="text-2xs text-text-subtle">{caption}</p>}
        </div>
      </div>

      <span className="sr-only">
        {label}: {clamped}%
      </span>
    </div>
  );
}
