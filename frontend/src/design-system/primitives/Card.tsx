import { forwardRef, type HTMLAttributes } from "react";
import { cn } from "../utils/cn";

export type CardElevation = "flat" | "raised" | "floating";

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  elevation?: CardElevation;
  /** Realce visual e sombra de acento ao passar o ponteiro. */
  interactive?: boolean;
  padding?: "none" | "sm" | "md" | "lg";
}

const ELEVATIONS: Record<CardElevation, string> = {
  // No tema escuro as sombras quase não aparecem; a hierarquia vem da
  // superfície ir clareando. No claro, o inverso. Os tokens de sombra já
  // carregam essa diferença, então aqui basta escolher o par.
  flat: "bg-surface border border-border",
  raised: "bg-surface-raised border border-border shadow-sm",
  floating: "bg-surface-raised border border-border shadow-lg",
};

const PADDINGS = {
  none: "",
  sm: "p-3",
  md: "p-4",
  lg: "p-5",
} as const;

export const Card = forwardRef<HTMLDivElement, CardProps>(function Card(
  { elevation = "flat", interactive = false, padding = "md", className, ...rest },
  ref,
) {
  return (
    <div
      ref={ref}
      className={cn(
        "rounded-xl",
        ELEVATIONS[elevation],
        PADDINGS[padding],
        interactive && [
          "transition-[border-color,box-shadow,transform] duration-200 ease-enter",
          "hover:border-border-strong hover:shadow-md",
          "active:scale-[0.995]",
        ],
        className,
      )}
      {...rest}
    />
  );
});

export function CardHeader({ className, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("mb-3 flex items-start justify-between gap-3", className)} {...rest} />;
}

export function CardTitle({ className, children, ...rest }: HTMLAttributes<HTMLHeadingElement>) {
  // `children` é explícito em vez de espalhado junto com o resto: um título sem
  // conteúdo é invisível para leitor de tela, e o lint só consegue detectar
  // isso quando enxerga o filho na marcação.
  return (
    <h2 className={cn("text-lg font-semibold text-text", className)} {...rest}>
      {children}
    </h2>
  );
}

export function CardDescription({ className, ...rest }: HTMLAttributes<HTMLParagraphElement>) {
  return <p className={cn("text-sm text-text-muted", className)} {...rest} />;
}
