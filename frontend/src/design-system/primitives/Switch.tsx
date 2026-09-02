import { cn } from "../utils/cn";

export interface SwitchProps {
  checked: boolean;
  onChange: () => void;
  /** Descreve o que a chave controla — não o estado dela. */
  label: string;
  disabled?: boolean;
  className?: string;
}

/**
 * Chave liga/desliga.
 *
 * `role="switch"` já faz o leitor de tela anunciar "ativado"/"desativado" a
 * partir de `aria-checked`, então o rótulo descreve apenas o que a chave
 * controla. Repetir o estado no rótulo faria o anúncio sair duplicado.
 */
export function Switch({ checked, onChange, label, disabled = false, className }: SwitchProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={onChange}
      className={cn(
        "relative inline-flex h-7 w-12 shrink-0 items-center rounded-full border-2",
        "transition-colors duration-200 ease-enter",
        "disabled:cursor-not-allowed disabled:opacity-50",
        checked ? "border-accent bg-accent" : "border-border-strong bg-surface-sunken",
        className,
      )}
    >
      <span
        className={cn(
          "inline-block size-4 rounded-full transition-transform duration-200 ease-spring",
          checked
            ? "translate-x-[1.4rem] bg-accent-contrast"
            : "translate-x-[0.2rem] bg-text-subtle",
        )}
        aria-hidden="true"
      />
    </button>
  );
}
