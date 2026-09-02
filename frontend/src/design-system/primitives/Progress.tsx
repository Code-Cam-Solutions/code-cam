import { cn } from "../utils/cn";

export interface ProgressProps {
  value: number;
  max?: number;
  label: string;
  /** Mostra "3 de 12" ao lado do rótulo. */
  showValue?: boolean;
  tone?: "accent" | "success";
  className?: string;
}

/**
 * Barra de progresso determinada.
 *
 * `role="progressbar"` com os valores ARIA faz o leitor de tela anunciar o
 * avanço; sem eles a barra é apenas uma faixa colorida sem significado.
 */
export function Progress({
  value,
  max = 100,
  label,
  showValue = false,
  tone = "accent",
  className,
}: ProgressProps) {
  const safeMax = max > 0 ? max : 1;
  const clamped = Math.min(Math.max(value, 0), safeMax);
  const percentage = (clamped / safeMax) * 100;

  return (
    <div className={className}>
      {(showValue || label) && (
        <div className="mb-1.5 flex items-baseline justify-between gap-2">
          <span className="text-sm font-medium text-text">{label}</span>
          {showValue && (
            <span className="text-sm text-text-muted tabular-nums">
              {clamped} de {safeMax}
            </span>
          )}
        </div>
      )}

      <div
        role="progressbar"
        aria-valuenow={clamped}
        aria-valuemin={0}
        aria-valuemax={safeMax}
        aria-label={label}
        className="h-2 w-full overflow-hidden rounded-full bg-surface-sunken"
      >
        <div
          className={cn(
            "h-full rounded-full transition-[width] duration-300 ease-enter",
            tone === "accent" ? "bg-accent" : "bg-success",
          )}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}
