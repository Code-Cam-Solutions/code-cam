import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { login } from "../services/api";
import { Button } from "../components/Button";
import { BookOpen } from "lucide-react";

export function LoginPage() {
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const { login: authLogin } = useAuth();
  const navigate = useNavigate();

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      setError("Digite seu nome ou apelido para continuar.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const data = await login(trimmed);
      authLogin(data);
      navigate("/");
    } catch {
      setError("Não foi possível entrar. Verifique sua conexão e tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-6 py-12"
      style={{ backgroundColor: "var(--color-background)" }}
    >
      <div className="w-full max-w-sm animate-fade-in">
        {/* Logo */}
        <div className="flex flex-col items-center mb-10">
          <div
            className="w-20 h-20 rounded-full flex items-center justify-center mb-4"
            style={{ backgroundColor: "var(--color-codecam)" }}
          >
            <img
              src="/logo-codecam.svg"
              alt=""
              aria-hidden="true"
              className="w-12 h-12"
            />
          </div>
          <h1
            className="font-bold text-white mb-1"
            style={{ fontSize: "var(--text-3xl)", color: "var(--color-codecam)" }}
          >
            CodeCam
          </h1>
          <p style={{ color: "var(--color-text-muted)", fontSize: "var(--text-base)" }}>
            Escanei, aprenda, evolua.
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} noValidate>
          <div className="mb-5">
            <label
              htmlFor="name"
              className="block font-medium text-white mb-2"
              style={{ fontSize: "var(--text-base)" }}
            >
              Como posso te chamar?
            </label>
            <input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Seu nome ou apelido"
              autoComplete="name"
              autoFocus
              aria-required="true"
              aria-invalid={!!error}
              aria-describedby={error ? "name-error" : undefined}
              className="w-full px-4 py-3 rounded-xl text-white placeholder:text-text-muted border transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-codecam"
              style={{
                backgroundColor: "var(--color-surface)",
                borderColor: error ? "var(--color-error)" : "var(--color-border)",
                fontSize: "var(--text-base)",
                minHeight: "48px",
              }}
            />
            {error && (
              <p
                id="name-error"
                role="alert"
                className="mt-2"
                style={{ color: "var(--color-error)", fontSize: "var(--text-sm)" }}
              >
                {error}
              </p>
            )}
          </div>

          <Button
            type="submit"
            loading={loading}
            fullWidth
            size="lg"
            aria-label="Entrar no CodeCam"
          >
            Entrar
          </Button>
        </form>

        {/* Info */}
        <div
          className="flex items-start gap-3 mt-8 p-4 rounded-xl"
          style={{ backgroundColor: "var(--color-surface)" }}
        >
          <BookOpen
            size={18}
            aria-hidden="true"
            style={{ color: "var(--color-codecam)", flexShrink: 0, marginTop: "2px" }}
          />
          <p style={{ color: "var(--color-text-muted)", fontSize: "var(--text-sm)" }}>
            Não é necessário senha. Basta digitar seu nome para começar a estudar com acessibilidade.
          </p>
        </div>
      </div>
    </div>
  );
}
