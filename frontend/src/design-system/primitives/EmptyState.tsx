import type { ReactNode } from "react";
import { cn } from "../utils/cn";

export interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}

/**
 * Estado vazio.
 *
 * Um vazio nunca deve ser só a ausência de conteúdo: ele diz o que está
 * faltando e oferece o caminho para preencher. Uma lista em branco sem
 * explicação é indistinguível de um erro de carregamento.
 */
export function EmptyState({ icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div
      className={cn("flex flex-col items-center justify-center px-6 py-12 text-center", className)}
    >
      {icon !== undefined && (
        <span
          className="mb-4 grid size-14 place-items-center rounded-full bg-surface-sunken text-text-subtle"
          aria-hidden="true"
        >
          {icon}
        </span>
      )}

      <h2 className="text-lg font-semibold text-text">{title}</h2>

      {description !== undefined && (
        <p className="mt-1.5 max-w-xs text-sm text-text-muted">{description}</p>
      )}

      {action !== undefined && <div className="mt-5">{action}</div>}
    </div>
  );
}
