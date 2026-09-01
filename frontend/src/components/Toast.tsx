import { useEffect, useState } from "react";
import { CheckCircle, XCircle, AlertCircle, X } from "lucide-react";

export type ToastType = "success" | "error" | "info";

export interface ToastMessage {
  id: string;
  type: ToastType;
  message: string;
}

interface ToastItemProps {
  toast: ToastMessage;
  onClose: (id: string) => void;
}

function ToastItem({ toast, onClose }: ToastItemProps) {
  useEffect(() => {
    const timer = setTimeout(() => onClose(toast.id), 4000);
    return () => clearTimeout(timer);
  }, [toast.id, onClose]);

  const icons = {
    success: <CheckCircle size={18} className="text-success" aria-hidden="true" />,
    error: <XCircle size={18} className="text-error" aria-hidden="true" />,
    info: <AlertCircle size={18} className="text-codecam" aria-hidden="true" />,
  };

  const colors = {
    success: "border-success/30 bg-success/10",
    error: "border-error/30 bg-error/10",
    info: "border-codecam/30 bg-codecam/10",
  };

  return (
    <div
      role="alert"
      aria-live="assertive"
      aria-atomic="true"
      className={`flex items-center gap-3 px-4 py-3 rounded-xl border ${colors[toast.type]} animate-fade-in`}
    >
      {icons[toast.type]}
      <span className="flex-1 text-white" style={{ fontSize: "var(--text-sm)" }}>
        {toast.message}
      </span>
      <button
        onClick={() => onClose(toast.id)}
        aria-label="Fechar notificação"
        className="text-text-muted hover:text-white transition-colors"
      >
        <X size={16} aria-hidden="true" />
      </button>
    </div>
  );
}

interface ToastContainerProps {
  toasts: ToastMessage[];
  onClose: (id: string) => void;
}

export function ToastContainer({ toasts, onClose }: ToastContainerProps) {
  return (
    <div
      className="fixed top-16 left-4 right-4 z-50 flex flex-col gap-2"
      aria-label="Notificações"
    >
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onClose={onClose} />
      ))}
    </div>
  );
}

// ─── Hook ──────────────────────────────────────────────────────────────────
export function useToast() {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  function addToast(type: ToastType, message: string) {
    const id = `${Date.now()}-${Math.random()}`;
    setToasts((prev) => [...prev, { id, type, message }]);
  }

  function removeToast(id: string) {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }

  return { toasts, addToast, removeToast };
}
