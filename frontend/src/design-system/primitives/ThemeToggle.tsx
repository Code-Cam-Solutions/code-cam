import { Monitor, Moon, Sun } from "lucide-react";
import { useAccessibility, type ThemePreference } from "../../context/AccessibilityContext";
import { cn } from "../utils/cn";

const OPTIONS: { value: ThemePreference; label: string; Icon: typeof Sun }[] = [
  { value: "light", label: "Claro", Icon: Sun },
  { value: "dark", label: "Escuro", Icon: Moon },
  { value: "system", label: "Sistema", Icon: Monitor },
];

/**
 * Seletor de tema em três estados.
 *
 * "Sistema" é uma opção de primeira classe, e não o resultado implícito de
 * nunca ter escolhido: quem deixa o aparelho trocar de tema ao anoitecer quer
 * que o app acompanhe, e precisa conseguir voltar a esse comportamento depois
 * de ter escolhido um tema fixo.
 *
 * Implementado como `radiogroup` porque é uma escolha entre alternativas
 * mutuamente exclusivas — as setas do teclado navegam entre elas.
 */
export function ThemeToggle({ className }: { className?: string }) {
  const { settings, setTheme } = useAccessibility();

  return (
    <div
      role="radiogroup"
      aria-label="Tema da interface"
      className={cn(
        "inline-flex gap-0.5 rounded-lg border border-border bg-surface-sunken p-0.5",
        className,
      )}
    >
      {OPTIONS.map(({ value, label, Icon }) => {
        const selected = settings.theme === value;

        return (
          <button
            key={value}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => setTheme(value)}
            className={cn(
              "grid size-9 place-items-center rounded-md transition-colors duration-150",
              selected
                ? "bg-surface-raised text-accent shadow-sm"
                : "text-text-subtle hover:text-text",
            )}
            title={label}
          >
            <Icon size={16} aria-hidden="true" />
            <span className="sr-only">{label}</span>
          </button>
        );
      })}
    </div>
  );
}
