import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, Eye, Layers, ListChecks, Sparkles, User } from "lucide-react";
import { useAuth } from "@/shared/context/AuthContext";
import { login } from "@/api";
import { Button, Card, Input, cn } from "@/design-system";

/**
 * O que o app entrega, dito antes de pedir qualquer coisa.
 *
 * A tela anterior pedia o nome sem nunca explicar o que aconteceria depois — e
 * quem chega por QR Code, na sala de aula, não viu página nenhuma antes desta.
 * Três palavras resolvem o que um parágrafo não resolveria.
 */
const CAPABILITIES = [
  { icon: Sparkles, label: "Resumos" },
  { icon: ListChecks, label: "Tópicos" },
  { icon: Layers, label: "Flashcards" },
  { icon: Eye, label: "Acessibilidade" },
] as const;

/** Anéis concêntricos da marca, expandindo como um autofoco. Decorativos. */
function LensMark() {
  return (
    <div className="relative mb-6 grid size-24 place-items-center" aria-hidden="true">
      {/* Dois anéis defasados: um só pulsando parece um erro de renderização,
          dois em sequência leem como foco. */}
      {[0, 1700].map((delay) => (
        <span
          key={delay}
          className="absolute size-20 animate-focus-ring rounded-full border-2 border-accent"
          style={{ animationDelay: `${delay}ms` }}
        />
      ))}

      <span className="absolute size-24 rounded-full bg-accent/10 blur-2xl" />

      <img src="/logo-codecam.svg" alt="" className="relative size-20" />
    </div>
  );
}

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
      {/*
        Profundidade em três camadas, todas derivadas do token de acento — nada
        aqui é cor fixa, então claro, escuro e alto contraste reagem sozinhos.
        A malha de linhas evoca o enquadramento da câmera sem desenhar um ícone
        de câmera, que seria literal demais para um fundo.
      */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
        <div className="absolute -top-40 left-1/2 size-[26rem] -translate-x-1/2 rounded-full bg-accent/12 blur-3xl" />
        <div className="absolute -bottom-32 -left-24 size-72 rounded-full bg-accent/8 blur-3xl" />
        <div
          className="absolute inset-0 opacity-[0.035]"
          style={{
            backgroundImage:
              "linear-gradient(var(--ds-text) 1px, transparent 1px), linear-gradient(90deg, var(--ds-text) 1px, transparent 1px)",
            backgroundSize: "44px 44px",
            // Esmaece a malha nas bordas para que ela não termine em um corte
            // reto, que denunciaria a textura como um retângulo colado.
            maskImage: "radial-gradient(ellipse at 50% 30%, black 20%, transparent 72%)",
          }}
        />
      </div>

      <main
        id="main-content"
        className="relative flex flex-1 flex-col items-center justify-center px-6 py-10"
      >
        <div className="flex w-full max-w-sm animate-rise-in flex-col items-center">
          <LensMark />

          <h1 className="text-4xl font-bold tracking-tight text-text">
            Code<span className="text-accent">Cam</span>
          </h1>
          <p className="mt-2 text-center text-base text-text-muted">
            Fotografe a lousa. Estude o essencial.
          </p>

          {/* Selos do que o app faz. Ícone e texto juntos: o ícone sozinho não
              informaria quem não conhece a convenção. */}
          <ul className="mt-6 flex w-full max-w-[32rem] flex-wrap items-center justify-center gap-2 px-1">
            {CAPABILITIES.map(({ icon: Icon, label }) => (
              <li
                key={label}
                className={cn(
                  "flex items-center justify-center gap-1.5 rounded-full border border-border",
                  "bg-surface/70 px-3 py-1.5 text-xs font-medium text-text-muted backdrop-blur-sm",
                  "sm:shrink-0",
                )}
              >
                <Icon size={14} className="text-accent" aria-hidden="true" />
                {label}
              </li>
            ))}
          </ul>

          <Card elevation="floating" padding="lg" className="mt-8 w-full">
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

          {/*
            Antes isto era um segundo cartão, do mesmo peso visual do
            formulário — duas caixas empilhadas disputando a mesma atenção em
            uma tela com um único campo. Como texto solto, informa sem competir.
          */}
          <p className="flex items-start gap-2 px-2 text-center text-sm text-text-subtle" style={{ marginTop: "10px" }}>
            
            <span>
              Sem senha e sem cadastro. Seu nome basta e tudo pode ser lido em voz alta.
            </span>
          </p>
        </div>
      </main>
    </div>
  );
}
