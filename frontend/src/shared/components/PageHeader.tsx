import type { ReactNode } from "react";
import { cn } from "@/design-system";

interface PageHeaderProps {
  /** O `h1` da página. Único: a barra superior não é cabeçalho. */
  title: string;
  description?: string;
  /** Selo de identidade à esquerda do título — cor da pasta, ícone do tipo. */
  badge?: ReactNode;
  /** Ação principal da tela, alinhada ao topo do título. */
  action?: ReactNode;
  className?: string;
}

/**
 * Cabeçalho de página.
 *
 * Cada tela desenhava o seu, e o resultado era um app que parecia montado por
 * pessoas diferentes: títulos em três tamanhos, subtítulos ora acima ora
 * abaixo, espaçamentos que variavam de 4 a 28px sem motivo. Concentrar o
 * padrão aqui torna a diferença entre telas uma decisão, não um acidente.
 */
export function PageHeader({ title, description, badge, action, className }: PageHeaderProps) {
  return (
    <header className={cn("mb-6 animate-rise-in", className)}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          {badge}
          <div className="min-w-0">
            <h1 className="text-3xl font-bold tracking-tight text-balance text-text">{title}</h1>
            {description !== undefined && (
              <p className="mt-1.5 text-sm text-text-muted">{description}</p>
            )}
          </div>
        </div>

        {action !== undefined && <div className="shrink-0">{action}</div>}
      </div>
    </header>
  );
}
