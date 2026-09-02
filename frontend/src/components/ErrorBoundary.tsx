import { AlertTriangle, RefreshCw } from "lucide-react";
import { Component, type ErrorInfo, type ReactNode } from "react";
import { Button, Card } from "../design-system";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  override state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  override componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("[ErrorBoundary]", error, info.componentStack);
  }

  private readonly handleReset = () => {
    // Recarregar pela URL, em vez de apenas limpar o estado, garante que a
    // árvore volte do zero: um erro de render costuma deixar contexto
    // inconsistente que sobreviveria a um simples setState.
    window.location.href = "/";
  };

  override render() {
    if (!this.state.hasError) return this.props.children;
    if (this.props.fallback) return this.props.fallback;

    return (
      <div
        role="alert"
        aria-live="assertive"
        className="flex min-h-dvh flex-col items-center justify-center bg-bg px-6 py-12 text-center"
      >
        <span
          className="mb-6 grid size-20 place-items-center rounded-full bg-danger-subtle text-danger"
          aria-hidden="true"
        >
          <AlertTriangle size={34} />
        </span>

        <h1 className="mb-2 text-2xl font-bold text-text">Algo deu errado</h1>

        <p className="max-w-xs text-base leading-relaxed text-text-muted">
          Ocorreu um erro inesperado. Voltar ao início costuma resolver.
        </p>

        {this.state.error && (
          <Card padding="sm" className="mt-5 max-w-xs border-danger/30 bg-danger-subtle text-left">
            {/* A mensagem técnica fica visível de propósito: sem ela, relatar o
                problema vira adivinhação para quem usa e para quem dá suporte. */}
            <p className="font-mono text-xs break-words text-danger">{this.state.error.message}</p>
          </Card>
        )}

        <Button
          size="lg"
          className="mt-8"
          icon={<RefreshCw size={18} />}
          onClick={this.handleReset}
        >
          Voltar ao início
        </Button>
      </div>
    );
  }
}
