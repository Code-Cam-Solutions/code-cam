import { Link, useNavigate } from "react-router-dom";
import { Settings, LogOut } from "lucide-react";
import { useAuth } from "../context/AuthContext";

interface NavbarProps {
  title?: string;
  showBack?: boolean;
  backTo?: string;
}

export function Navbar({ title, showBack = false, backTo }: NavbarProps) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate("/login");
  }

  function handleBack() {
    if (backTo) {
      navigate(backTo);
    } else {
      navigate(-1);
    }
  }

  return (
    <header
      className="sticky top-0 z-40 flex items-center justify-between px-4 h-14"
      style={{
        backgroundColor: "var(--color-background)",
        borderBottom: "1px solid var(--color-border)",
      }}
      role="banner"
    >
      <div className="flex items-center gap-2">
        {showBack ? (
          <button
            onClick={handleBack}
            aria-label="Voltar"
            className="flex items-center justify-center w-10 h-10 rounded-full hover:bg-surface-2 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-codecam"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="m15 18-6-6 6-6" />
            </svg>
          </button>
        ) : (
          <Link
            to="/"
            className="flex items-center gap-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-codecam rounded-lg"
            aria-label="CodeCam - Página inicial"
          >
            <img
              src="/logo-codecam.svg"
              alt=""
              aria-hidden="true"
              className="w-6 h-6"
            />
            <span
              className="font-bold text-lg"
              style={{ color: "var(--color-codecam)" }}
            >
              CodeCam
            </span>
          </Link>
        )}
        {title && (
          <h1
            className="text-white font-semibold ml-1"
            style={{ fontSize: "var(--text-lg)" }}
          >
            {title}
          </h1>
        )}
      </div>

      <nav className="flex items-center gap-1" aria-label="Navegação principal">
        <Link
          to="/settings"
          aria-label="Configurações de acessibilidade"
          className="flex items-center justify-center w-10 h-10 rounded-full hover:bg-surface-2 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-codecam"
          style={{ color: "var(--color-text-muted)" }}
        >
          <Settings size={20} aria-hidden="true" />
        </Link>
        {user && (
          <button
            onClick={handleLogout}
            aria-label="Sair da conta"
            className="flex items-center justify-center w-10 h-10 rounded-full hover:bg-surface-2 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-codecam"
            style={{ color: "var(--color-text-muted)" }}
          >
            <LogOut size={20} aria-hidden="true" />
          </button>
        )}
      </nav>
    </header>
  );
}
