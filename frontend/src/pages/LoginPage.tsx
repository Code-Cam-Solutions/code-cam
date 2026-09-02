import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, BookOpen, User } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { login } from "../services/api";
import { Button, Card, Input } from "../design-system";

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
      await navigate("/");
    } catch {
      setError("Não foi possível entrar. Verifique sua conexão e tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative flex min-h-dvh flex-col overflow-hidden bg-bg">
      {/* Halo de acento atrás da marca. Puramente decorativo: acompanha o tema
          porque é o próprio token de acento esmaecido, não uma cor fixa. */}
      <div
        className="pointer-events-none absolute -top-32 left-1/2 size-80 -translate-x-1/2 rounded-full bg-accent-subtle blur-3xl"
        aria-hidden="true"
      />

      <main
        id="main-content"
        className="relative flex flex-1 flex-col items-center justify-center px-6 py-12"
      >
        <div className="w-full max-w-sm animate-rise-in">
          <div className="mb-9 flex flex-col items-center text-center">
            {/* Sem disco de fundo: a marca já é um círculo, e envolvê-la em
                outro só criava um segundo contorno concorrendo com o dela. */}
            <img src="/logo-codecam.svg" alt="" aria-hidden="true" className="mb-5 size-20" />

            <h1 className="text-3xl font-bold text-accent">CodeCam</h1>
            <p className="mt-2 text-base text-text-muted">Escaneie, aprenda, evolua.</p>
          </div>

          <Card elevation="raised" padding="lg">
            <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-5">
              <Input
                label="Como posso te chamar?"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Seu nome ou apelido"
                autoComplete="name"
                autoFocus
                aria-required="true"
                icon={<User size={18} />}
                // O campo vazio é validado no envio, então `error` só existe
                // depois de uma tentativa — string vazia não é erro.
                error={error === "" ? undefined : error}
              />

              <Button
                type="submit"
                loading={loading}
                loadingLabel="Entrando…"
                fullWidth
                size="lg"
                iconAfter={<ArrowRight size={20} />}
                aria-label="Entrar no CodeCam"
              >
                Entrar
              </Button>
            </form>
          </Card>

          <Card padding="lg" className="mt-4 flex items-start gap-3">
            <span
              className="grid size-9 shrink-0 place-items-center rounded-lg bg-accent-subtle text-accent"
              aria-hidden="true"
            >
              <BookOpen size={18} />
            </span>
            <p className="text-sm leading-relaxed text-text-muted">
              Não é necessário senha. Basta digitar seu nome para começar a estudar com
              acessibilidade.
            </p>
          </Card>
        </div>
      </main>
    </div>
  );
}
