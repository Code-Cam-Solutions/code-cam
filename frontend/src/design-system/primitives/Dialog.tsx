import { useCallback, useEffect, useId, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { cn } from "../utils/cn";

export interface DialogProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: ReactNode;
  /** `sheet` sobe pelo rodapé (padrão em celular); `center` centraliza. */
  variant?: "sheet" | "center";
  /** Oculta o botão de fechar quando a ação precisa ser deliberada. */
  hideCloseButton?: boolean;
}

/** Elementos que podem receber foco, na ordem em que o navegador os visita. */
const FOCUSABLE = [
  "a[href]",
  "button:not([disabled])",
  "input:not([disabled]):not([type='hidden'])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  "[tabindex]:not([tabindex='-1'])",
].join(",");

/**
 * Diálogo modal acessível.
 *
 * Uma modal só é utilizável por teclado se cumprir quatro coisas, e é fácil
 * esquecer alguma ao escrever uma na mão a cada tela:
 *
 *   1. O foco entra no diálogo ao abrir
 *   2. Tab circula dentro dele, sem escapar para a página atrás
 *   3. Escape fecha
 *   4. O foco volta para o elemento que abriu
 *
 * A rolagem do fundo também é travada: sem isso, rolar dentro da modal arrasta
 * a página por baixo assim que o conteúdo chega ao fim.
 */
export function Dialog({
  open,
  onClose,
  title,
  description,
  children,
  variant = "sheet",
  hideCloseButton = false,
}: DialogProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const previouslyFocused = useRef<HTMLElement | null>(null);
  const id = useId();
  const titleId = `${id}-title`;
  const descriptionId = `${id}-description`;

  const focusableElements = useCallback((): HTMLElement[] => {
    const panel = panelRef.current;
    if (!panel) return [];
    return Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
      (element) => element.offsetParent !== null,
    );
  }, []);

  // Guarda quem tinha o foco e o devolve ao fechar.
  useEffect(() => {
    if (!open) return;

    previouslyFocused.current = document.activeElement as HTMLElement | null;

    // Na ordem do DOM o primeiro focável é o botão de fechar, o que faria toda
    // modal abrir com o foco na saída. Quem tem um campo principal marca-o com
    // `data-autofocus` e recebe o foco no lugar.
    const preferred = panelRef.current?.querySelector<HTMLElement>("[data-autofocus]");
    (preferred ?? focusableElements()[0] ?? panelRef.current)?.focus();

    return () => previouslyFocused.current?.focus();
  }, [open, focusableElements]);

  // Trava a rolagem do fundo, compensando a largura da barra para que a página
  // não dê um salto lateral ao abrir.
  useEffect(() => {
    if (!open) return;

    const { body, documentElement } = document;
    const scrollbarWidth = window.innerWidth - documentElement.clientWidth;
    const previousOverflow = body.style.overflow;
    const previousPadding = body.style.paddingRight;

    body.style.overflow = "hidden";
    if (scrollbarWidth > 0) body.style.paddingRight = `${scrollbarWidth}px`;

    return () => {
      body.style.overflow = previousOverflow;
      body.style.paddingRight = previousPadding;
    };
  }, [open]);

  // Escape fecha; Tab circula dentro do diálogo.
  useEffect(() => {
    if (!open) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
        return;
      }

      if (event.key !== "Tab") return;

      const elements = focusableElements();
      if (elements.length === 0) {
        event.preventDefault();
        return;
      }

      const first = elements[0];
      const last = elements[elements.length - 1];
      const active = document.activeElement;

      if (event.shiftKey && active === first) {
        event.preventDefault();
        last?.focus();
      } else if (!event.shiftKey && active === last) {
        event.preventDefault();
        first?.focus();
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose, focusableElements]);

  if (!open) return null;

  return createPortal(
    <div
      className={cn(
        "fixed inset-0 flex",
        variant === "sheet" ? "items-end" : "items-center justify-center p-4",
      )}
      style={{ zIndex: "var(--ds-z-modal)" }}
    >
      {/* Fundo apenas visual: quem usa teclado fecha com Escape, e anunciá-lo
          como interativo só poluiria a leitura. */}
      <div
        className="absolute inset-0 animate-fade-in"
        style={{ backgroundColor: "var(--ds-scrim)" }}
        aria-hidden="true"
        onMouseDown={onClose}
      />

      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description !== undefined ? descriptionId : undefined}
        tabIndex={-1}
        className={cn(
          "relative w-full bg-surface-raised shadow-lg outline-none",
          variant === "sheet"
            ? "max-h-[85dvh] animate-slide-up overflow-y-auto rounded-t-2xl"
            : "max-w-md animate-scale-in rounded-2xl",
          // Respeita a área segura em aparelhos com barra de gestos.
          variant === "sheet" && "pb-[env(safe-area-inset-bottom)]",
        )}
      >
        {variant === "sheet" && (
          <div className="flex justify-center pt-3 pb-1" aria-hidden="true">
            <div className="h-1 w-10 rounded-full bg-border-strong" />
          </div>
        )}

        <div className="flex items-start justify-between gap-3 px-5 pt-4">
          <div className="min-w-0">
            <h2 id={titleId} className="text-xl font-semibold text-text">
              {title}
            </h2>
            {description !== undefined && (
              <p id={descriptionId} className="mt-1 text-sm text-text-muted">
                {description}
              </p>
            )}
          </div>

          {!hideCloseButton && (
            <button
              type="button"
              onClick={onClose}
              aria-label="Fechar"
              className={cn(
                "-mt-1 -mr-1 grid size-11 shrink-0 place-items-center rounded-lg",
                "text-text-muted transition-colors hover:bg-surface-sunken hover:text-text",
              )}
            >
              <X size={20} aria-hidden="true" />
            </button>
          )}
        </div>

        <div className="px-5 pt-4 pb-5">{children}</div>
      </div>
    </div>,
    document.body,
  );
}
