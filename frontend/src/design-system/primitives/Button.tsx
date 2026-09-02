import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from "react";
import { cn } from "../utils/cn";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger" | "subtle";
export type ButtonSize = "sm" | "md" | "lg";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
  loading?: boolean;
  /** Ícone antes do rótulo. Sempre decorativo — o rótulo carrega o significado. */
  icon?: ReactNode;
  iconAfter?: ReactNode;
  /**
   * Texto anunciado durante o carregamento. O padrão serve para a maioria dos
   * casos, mas uma ação demorada merece dizer o que está acontecendo.
   */
  loadingLabel?: string;
}

const VARIANTS: Record<ButtonVariant, string> = {
  primary: cn(
    "bg-accent text-accent-contrast shadow-accent",
    "hover:bg-accent-hover",
    "active:brightness-95",
  ),
  secondary: cn(
    "bg-surface-raised text-text border border-border",
    "hover:border-border-strong hover:bg-surface-sunken",
  ),
  subtle: cn("bg-accent-subtle text-accent", "hover:brightness-95"),
  ghost: cn("bg-transparent text-text-muted", "hover:bg-surface-sunken hover:text-text"),
  danger: cn(
    "bg-danger-subtle text-danger border border-danger/30",
    "hover:border-danger/60 hover:brightness-95",
  ),
};

/**
 * Alturas mínimas em rem para acompanhar o ajuste de tamanho de fonte da
 * acessibilidade: com `min-h` em px, aumentar a fonte estouraria o botão.
 */
const SIZES: Record<ButtonSize, string> = {
  sm: "min-h-[2.25rem] px-3 py-1.5 text-sm gap-1.5 rounded-md",
  md: "min-h-[2.75rem] px-4 py-2.5 text-base gap-2 rounded-lg",
  lg: "min-h-[3.25rem] px-6 py-3 text-lg gap-2.5 rounded-xl",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    variant = "primary",
    size = "md",
    fullWidth = false,
    loading = false,
    icon,
    iconAfter,
    loadingLabel = "Carregando…",
    className,
    disabled,
    children,
    ...rest
  },
  ref,
) {
  const isDisabled = disabled === true || loading;

  return (
    <button
      ref={ref}
      // `aria-disabled` acompanha `disabled` para que leitores de tela que
      // ignoram o atributo nativo em elementos focáveis ainda anunciem o estado.
      disabled={isDisabled}
      aria-disabled={isDisabled}
      aria-busy={loading}
      className={cn(
        "inline-flex items-center justify-center font-semibold",
        "transition-[background-color,border-color,box-shadow,transform] duration-150 ease-enter",
        "active:scale-[0.98]",
        "disabled:cursor-not-allowed disabled:opacity-55 disabled:active:scale-100",
        // O anel de foco global já cobre o contorno; aqui só o raio precisa
        // acompanhar o tamanho do botão.
        "focus-visible:outline-2 focus-visible:outline-offset-2",
        VARIANTS[variant],
        SIZES[size],
        fullWidth && "w-full",
        className,
      )}
      {...rest}
    >
      {loading ? (
        <>
          <span
            className="inline-block size-4 shrink-0 animate-spin rounded-full border-2 border-current border-t-transparent"
            aria-hidden="true"
          />
          <span>{loadingLabel}</span>
        </>
      ) : (
        <>
          {icon !== undefined && (
            <span className="shrink-0" aria-hidden="true">
              {icon}
            </span>
          )}
          {children}
          {iconAfter !== undefined && (
            <span className="shrink-0" aria-hidden="true">
              {iconAfter}
            </span>
          )}
        </>
      )}
    </button>
  );
});
