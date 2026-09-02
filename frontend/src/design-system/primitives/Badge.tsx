import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "../utils/cn";

export type BadgeTone = "neutral" | "accent" | "success" | "warning" | "danger";

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: BadgeTone;
  icon?: ReactNode;
}

const TONES: Record<BadgeTone, string> = {
  neutral: "bg-surface-sunken text-text-muted border-border",
  accent: "bg-accent-subtle text-accent border-accent/25",
  success: "bg-success-subtle text-success border-success/25",
  warning: "bg-warning-subtle text-warning border-warning/25",
  danger: "bg-danger-subtle text-danger border-danger/25",
};

/**
 * Rótulo curto de estado ou categoria.
 *
 * A cor nunca é o único portador do significado — o texto dentro do selo diz a
 * mesma coisa. WCAG 1.4.1.
 */
export function Badge({ tone = "neutral", icon, className, children, ...rest }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5",
        "text-xs font-medium whitespace-nowrap",
        TONES[tone],
        className,
      )}
      {...rest}
    >
      {icon !== undefined && (
        <span className="shrink-0" aria-hidden="true">
          {icon}
        </span>
      )}
      {children}
    </span>
  );
}
