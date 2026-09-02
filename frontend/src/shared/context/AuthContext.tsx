import { createContext, useContext, useState, type ReactNode } from "react";

interface AuthUser {
  userId: string;
  name: string;
  token: string;
}

interface AuthContextType {
  user: AuthUser | null;
  login: (user: AuthUser) => void;
  logout: () => void;
  isAuthenticated: boolean;
}

const AUTH_KEY = "codecam-auth";

const AuthContext = createContext<AuthContextType | null>(null);

function loadAuth(): AuthUser | null {
  try {
    const stored = localStorage.getItem(AUTH_KEY);
    if (!stored) return null;

    const parsed = JSON.parse(stored) as Partial<AuthUser>;
    // Uma sessão sem token é inutilizável: tratar como não autenticado em vez
    // de deixar o app achar que está logado e falhar em toda requisição.
    if (!parsed.token || !parsed.userId || !parsed.name) return null;

    return { userId: parsed.userId, name: parsed.name, token: parsed.token };
  } catch {
    // JSON corrompido no storage: começar deslogado.
    return null;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(loadAuth);

  function login(userData: AuthUser) {
    localStorage.setItem(AUTH_KEY, JSON.stringify(userData));
    setUser(userData);
  }

  function logout() {
    localStorage.removeItem(AUTH_KEY);
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, login, logout, isAuthenticated: !!user }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
