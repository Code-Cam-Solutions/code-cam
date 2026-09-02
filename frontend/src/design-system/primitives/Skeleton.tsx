import type { HTMLAttributes } from "react";
import { cn } from "../utils/cn";

export interface SkeletonProps extends HTMLAttributes<HTMLDivElement> {
  /** Formato do bloco: texto usa altura de linha, bloco preenche o espaço. */
  shape?: "text" | "block" | "circle";
}

/**
 * Espaço reservado durante o carregamento.
 *
 * Sempre `aria-hidden`: o esqueleto é ruído para quem usa leitor de tela. O
 * anúncio de "carregando" cabe ao contêiner com `aria-busy`, uma vez só, em vez
 * de repetido por cada retângulo cinza.
 */
export function Skeleton({ shape = "block", className, ...rest }: SkeletonProps) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        "animate-pulse bg-surface-sunken",
        shape === "text" && "h-[1em] rounded-sm",
        shape === "block" && "rounded-lg",
        shape === "circle" && "rounded-full",
        className,
      )}
      {...rest}
    />
  );
}

/** Esqueleto de um card de conteúdo, no formato da lista real. */
export function SkeletonCard() {
  return (
    <div className="rounded-xl border border-border bg-surface p-4">
      <Skeleton shape="text" className="mb-3 w-2/3" />
      <Skeleton shape="text" className="mb-2 w-full" />
      <Skeleton shape="text" className="mb-4 w-4/5" />
      <div className="flex gap-2">
        <Skeleton className="h-6 w-16 rounded-full" />
        <Skeleton className="h-6 w-20 rounded-full" />
      </div>
    </div>
  );
}

export function SkeletonList({ count = 3, label = "Carregando conteúdos" }) {
  return (
    <div className="flex flex-col gap-3" role="status" aria-busy="true" aria-live="polite">
      <span className="sr-only">{label}</span>
      {Array.from({ length: count }, (_, index) => (
        <SkeletonCard key={index} />
      ))}
    </div>
  );
}
