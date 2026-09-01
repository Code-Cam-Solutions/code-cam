import { NavLink } from "react-router-dom";
import { House, Folder, Settings } from "lucide-react";

const items = [
  { label: "Início", icon: House, to: "/" },
  { label: "Pastas", icon: Folder, to: "/folders" },
  { label: "Ajustes", icon: Settings, to: "/settings" },
];

export function BottomNav() {
  return (
    <nav
      aria-label="Navegação por abas"
      className="fixed bottom-0 left-0 right-0 z-40 h-16 flex items-center justify-around safe-area-pb"
      style={{
        backgroundColor: "var(--color-background)",
        borderTop: "1px solid var(--color-border)",
        paddingBottom: "env(safe-area-inset-bottom, 0px)",
      }}
    >
      {items.map(({ label, icon: Icon, to }) => (
        <NavLink
          key={label}
          to={to}
          end={to === "/"}
          aria-label={label}
          className={({ isActive }) =>
            `flex flex-col items-center justify-center gap-1 h-full w-1/3 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-codecam rounded-lg ${
              isActive
                ? "text-codecam"
                : "text-text-muted hover:text-white"
            }`
          }
        >
          <Icon size={22} aria-hidden="true" strokeWidth={1.8} />
          <span style={{ fontSize: "var(--text-xs)" }}>{label}</span>
        </NavLink>
      ))}
    </nav>
  );
}
