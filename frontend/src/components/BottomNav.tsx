import { Folder, House, Settings } from "lucide-react";
import { NavLink } from "react-router-dom";
import { cn } from "../design-system";

const ITEMS = [
  { label: "Início", icon: House, to: "/" },
  { label: "Pastas", icon: Folder, to: "/folders" },
  { label: "Ajustes", icon: Settings, to: "/settings" },
];

export function BottomNav() {
  return (
    <nav
      aria-label="Navegação principal"
      className={cn(
        "fixed inset-x-0 bottom-0 flex items-stretch justify-around",
        "border-t border-border bg-bg/90 backdrop-blur-md",
        // Reserva a faixa da barra de gestos do iOS para que os botões não
        // fiquem embaixo dela.
        "pb-[env(safe-area-inset-bottom)]",
      )}
      style={{ zIndex: "var(--ds-z-nav)" }}
    >
      {ITEMS.map(({ label, icon: Icon, to }) => (
        <NavLink
          key={to}
          to={to}
          end={to === "/"}
          className={({ isActive }) =>
            cn(
              "relative flex min-h-[3.5rem] flex-1 flex-col items-center justify-center gap-1",
              "transition-colors duration-150",
              isActive ? "text-accent" : "text-text-subtle hover:text-text",
            )
          }
        >
          {({ isActive }) => (
            <>
              {/* Marcador da aba ativa: a cor sozinha não basta para quem não
                  a distingue, então a posição também sinaliza. WCAG 1.4.1. */}
              <span
                className={cn(
                  "absolute top-0 h-0.5 w-8 rounded-full transition-opacity duration-200",
                  isActive ? "bg-accent opacity-100" : "opacity-0",
                )}
                aria-hidden="true"
              />
              <Icon size={22} strokeWidth={isActive ? 2.2 : 1.8} aria-hidden="true" />
              <span className="text-2xs font-medium">{label}</span>
            </>
          )}
        </NavLink>
      ))}
    </nav>
  );
}
