import { forwardRef, useId, type InputHTMLAttributes, type ReactNode } from "react";
import { cn } from "../utils/cn";

export interface InputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "id"> {
  label: string;
  /** Esconde o rótulo visualmente, mantendo-o para leitores de tela. */
  hideLabel?: boolean;
  hint?: string;
  error?: string;
  icon?: ReactNode;
}

/**
 * Campo de texto com rótulo obrigatório.
 *
 * O rótulo é uma prop exigida, e não opcional, de propósito: um `placeholder`
 * não é rótulo — ele some assim que a pessoa começa a digitar, deixando quem
 * usa leitor de tela ou tem dificuldade de memória sem referência do que
 * aquele campo pede.
 */
export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { label, hideLabel = false, hint, error, icon, className, required, ...rest },
  ref,
) {
  const id = useId();
  const hintId = `${id}-hint`;
  const errorId = `${id}-error`;

  const describedBy =
    [error ? errorId : null, hint ? hintId : null].filter(Boolean).join(" ") || undefined;

  return (
    <div className="w-full">
      <label
        htmlFor={id}
        className={cn("mb-1.5 block text-sm font-medium text-text", hideLabel && "sr-only")}
      >
        {label}
        {required === true && (
          <span className="ml-0.5 text-danger" aria-hidden="true">
            *
          </span>
        )}
      </label>

      <div className="relative">
        {icon !== undefined && (
          <span
            className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-text-subtle"
            aria-hidden="true"
          >
            {icon}
          </span>
        )}

        <input
          ref={ref}
          id={id}
          required={required}
          aria-invalid={error !== undefined || undefined}
          aria-describedby={describedBy}
          className={cn(
            "min-h-[3rem] w-full rounded-lg px-3.5 py-2.5",
            /*
             * `text-base` é obrigatório, não estético: o Safari do iPhone dá
             * zoom automático em campo com fonte menor que 16px, e a tela salta
             * quando o teclado abre.
             */
            "bg-surface text-base text-text placeholder:text-xs placeholder:text-text-subtle",
            "border transition-colors duration-150",
            error !== undefined
              ? "border-danger"
              : "border-border-strong hover:border-text-subtle focus:border-accent",
            icon !== undefined && "pl-10",
            className,
          )}
          {...rest}
        />
      </div>

      {hint !== undefined && error === undefined && (
        <p id={hintId} className="mt-1.5 text-xs text-text-muted">
          {hint}
        </p>
      )}

      {error !== undefined && (
        <p id={errorId} role="alert" className="mt-1.5 text-sm text-danger">
          {error}
        </p>
      )}
    </div>
  );
});
