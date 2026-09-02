import type { ReactNode } from "react";
import { cn } from "../utils/cn";

export interface StatTileProps {
  label: string;
  value: string | number;
  /** Unidade ou complemento em corpo menor ao lado do número. */
  unit?: string;
  icon?: ReactNode;
  hint?: string;
  tone?: "neutral" | "accent" | "success" | "warning";
  className?: string;
}

const TONES = {
  neutral: { value: "text-text", icon: "text-text-subtle bg-surface-sunken" },
  accent: { value: "text-text", icon: "text-accent bg-accent-subtle" },
  success: { value: "text-text", icon: "text-success bg-success-subtle" },
  warning: { value: "text-text", icon: "text-warning bg-warning-subtle" },
} as const;

/**
 * Número em destaque com seu rótulo.
 *
 * O valor usa `tabular-nums`: sem isso, um contador que muda de 9 para 10
 * reposiciona os dígitos e a linha inteira "dança" a cada atualização.
 */
export function StatTile({
  label,
  value,
  unit,
  icon,
  hint,
  tone = "neutral",
  className,
}: StatTileProps) {
  const tones = TONES[tone];

  return (
    <div
      className={cn(
        "rounded-xl border border-border bg-surface p-4",
        "flex flex-col gap-2",
        className,
      )}
    >
      {icon !== undefined && (
        <span
          className={cn("grid size-9 place-items-center rounded-lg", tones.icon)}
          aria-hidden="true"
        >
          {icon}
        </span>
      )}

      <div>
        <p className="flex items-baseline gap-1">
          <span className={cn("text-2xl font-bold tabular-nums", tones.value)}>{value}</span>
          {unit !== undefined && <span className="text-sm text-text-muted">{unit}</span>}
        </p>
        <p className="mt-0.5 text-sm text-text-muted">{label}</p>
        {hint !== undefined && <p className="mt-1 text-xs text-text-subtle">{hint}</p>}
      </div>
    </div>
  );
}
