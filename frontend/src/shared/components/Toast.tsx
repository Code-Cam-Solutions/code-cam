import { AlertCircle, CheckCircle, X, XCircle } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { cn } from "@/design-system";

export type ToastType = "success" | "error" | "info";

export interface ToastMessage {
  id: string;
  type: ToastType;
  message: string;
}

const TONES = {
  success: {
    Icon: CheckCircle,
    box: "border-success/30 bg-success-subtle",
    icon: "text-success",
  },
  error: { Icon: XCircle, box: "border-danger/30 bg-danger-subtle", icon: "text-danger" },
  info: { Icon: AlertCircle, box: "border-accent/30 bg-accent-subtle", icon: "text-accent" },
} as const;

/** Quanto tempo cada aviso permanece na tela antes de sumir sozinho. */
const DISMISS_AFTER_MS = 5000;

function ToastItem({ toast, onClose }: { toast: ToastMessage; onClose: (id: string) => void }) {
  const { Icon, box, icon } = TONES[toast.type];

  useEffect(() => {
    const timer = setTimeout(() => onClose(toast.id), DISMISS_AFTER_MS);
    return () => clearTimeout(timer);
  }, [toast.id, onClose]);

  return (
    <div
      role="alert"
      aria-atomic="true"
      className={cn(
        "flex animate-rise-in items-start gap-3 rounded-xl border px-4 py-3 shadow-lg",
        box,
      )}
    >
      <Icon size={18} className={cn("mt-0.5 shrink-0", icon)} aria-hidden="true" />
      <span className="flex-1 text-sm text-text">{toast.message}</span>
      <button
        type="button"
        onClick={() => onClose(toast.id)}
        aria-label="Fechar aviso"
        className="-my-1 -mr-1 grid size-8 shrink-0 place-items-center rounded-md text-text-muted transition-colors hover:text-text"
      >
        <X size={16} aria-hidden="true" />
      </button>
    </div>
  );
}

export function ToastContainer({
  toasts,
  onClose,
}: {
  toasts: ToastMessage[];
  onClose: (id: string) => void;
}) {
  return (
    // `aria-live` fica no contêiner, que existe desde o início: um live region
    // criado junto com a mensagem costuma não ser anunciado.
    <div
      aria-live="polite"
      aria-relevant="additions"
      className="pointer-events-none fixed inset-x-4 top-16 flex flex-col gap-2"
      style={{ zIndex: "var(--ds-z-toast)" }}
    >
      {toasts.map((toast) => (
        <div key={toast.id} className="pointer-events-auto">
          <ToastItem toast={toast} onClose={onClose} />
        </div>
      ))}
    </div>
  );
}

export function useToast() {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  // Estas funções entram em arrays de dependência de `useEffect`/`useCallback`
  // nas páginas. Sem memoização elas mudam de identidade a cada render e
  // disparam refetch em loop — por isso `useCallback` aqui não é otimização,
  // é correção.
  const addToast = useCallback((type: ToastType, message: string) => {
    const id = `${Date.now()}-${Math.random()}`;
    setToasts((prev) => [...prev, { id, type, message }]);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  return { toasts, addToast, removeToast };
}
