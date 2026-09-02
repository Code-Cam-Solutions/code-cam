import { ChevronLeft, LogOut, Settings } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { cn } from "../design-system";

interface NavbarProps {
  title?: string;
  showBack?: boolean;
  backTo?: string;
}

/** Botão circular de 44px, o alvo de toque mínimo confortável em celular. */
const ICON_BUTTON = cn(
  "grid size-11 place-items-center rounded-full text-text-muted",
  "transition-colors duration-150 hover:bg-surface-sunken hover:text-text",
);

export function Navbar({ title, showBack = false, backTo }: NavbarProps) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    void navigate("/login");
  }

  function handleBack() {
    // As sobrecargas de `navigate` para destino e para delta são distintas, e
    // uma união `string | -1` não satisfaz nenhuma das duas.
    if (backTo !== undefined) {
      void navigate(backTo);
    } else {
      void navigate(-1);
    }
  }

  return (
    <header
      role="banner"
      className={cn(
        "sticky top-0 flex h-14 items-center justify-between gap-2 px-2",
        "border-b border-border bg-bg/85 backdrop-blur-md",
        // A barra encosta no topo da tela; em aparelhos com notch o conteúdo
        // precisa descer para não ficar sob o recorte.
        "pt-[env(safe-area-inset-top)]",
      )}
      style={{ zIndex: "var(--ds-z-nav)" }}
    >
      <div className="flex min-w-0 items-center gap-1">
        {showBack ? (
          <button type="button" onClick={handleBack} aria-label="Voltar" className={ICON_BUTTON}>
            <ChevronLeft size={22} aria-hidden="true" />
          </button>
        ) : (
          <Link
            to="/"
            aria-label="CodeCam — início"
            className="ml-2 flex items-center gap-2 rounded-lg"
          >
            <img src="/logo-codecam.svg" alt="" aria-hidden="true" className="size-6" />
            <span className="text-lg font-bold text-accent">CodeCam</span>
          </Link>
        )}

        {title !== undefined && (
          <h1
            className={cn("truncate text-lg font-semibold text-text", showBack ? "ml-0" : "ml-2")}
          >
            {title}
          </h1>
        )}
      </div>

      <nav className="flex shrink-0 items-center gap-0.5" aria-label="Ações da conta">
        <Link to="/settings" aria-label="Aparência e acessibilidade" className={ICON_BUTTON}>
          <Settings size={20} aria-hidden="true" />
        </Link>

        {user && (
          <button
            type="button"
            onClick={handleLogout}
            aria-label="Sair da conta"
            className={ICON_BUTTON}
          >
            <LogOut size={20} aria-hidden="true" />
          </button>
        )}
      </nav>
    </header>
  );
}
