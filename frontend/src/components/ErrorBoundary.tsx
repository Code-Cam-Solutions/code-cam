import { Component, type ReactNode } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  override componentDidCatch(error: Error, info: { componentStack: string }) {
    console.error("[ErrorBoundary]", error, info.componentStack);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.href = "/";
  };

  override render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;

      return (
        <div
          className="min-h-screen flex flex-col items-center justify-center px-6 py-12 text-center"
          style={{ backgroundColor: "var(--color-background)" }}
          role="alert"
          aria-live="assertive"
        >
          <div
            className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6"
            style={{ backgroundColor: "var(--color-error)" + "20" }}
          >
            <AlertTriangle size={36} style={{ color: "var(--color-error)" }} aria-hidden="true" />
          </div>

          <h1 className="font-bold text-white mb-3" style={{ fontSize: "var(--text-2xl)" }}>
            Algo deu errado
          </h1>

          <p
            className="mb-2"
            style={{
              color: "var(--color-text-muted)",
              fontSize: "var(--text-base)",
              lineHeight: "1.6",
              maxWidth: "300px",
            }}
          >
            Ocorreu um erro inesperado. Tente voltar para o início.
          </p>

          {this.state.error && (
            <p
              className="mb-8 px-3 py-2 rounded-lg"
              style={{
                color: "var(--color-error)",
                backgroundColor: "var(--color-error)" + "15",
                fontSize: "var(--text-xs)",
                maxWidth: "300px",
                wordBreak: "break-word",
              }}
            >
              {this.state.error.message}
            </p>
          )}

          <button
            onClick={this.handleReset}
            className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-semibold text-white transition-all active:scale-95 focus-visible:outline-2 focus-visible:outline-offset-2"
            style={{
              backgroundColor: "var(--color-codecam)",
              fontSize: "var(--text-base)",
              minHeight: "48px",
            }}
            aria-label="Voltar para o início do aplicativo"
          >
            <RefreshCw size={18} aria-hidden="true" />
            Voltar ao início
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
