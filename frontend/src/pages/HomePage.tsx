import { Link } from "react-router-dom";
import { Camera, ChevronRight, Folder, Sparkles } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { Navbar } from "../components/Navbar";
import { BottomNav } from "../components/BottomNav";
import { TTSButton } from "../components/TTSButton";
import { Badge, Card, cn } from "../design-system";

const SHORTCUTS = [
  {
    to: "/folders",
    icon: Folder,
    title: "Minhas pastas",
    description: "Conteúdos salvos",
    ariaLabel: "Ir para minhas pastas",
  },
  {
    to: "/settings",
    icon: Sparkles,
    title: "Acessibilidade",
    description: "Personalize sua experiência",
    ariaLabel: "Ir para configurações de acessibilidade",
  },
] as const;

const STEPS = [
  "Fotografe uma lousa, caderno ou livro",
  "A IA analisa e organiza o conteúdo",
  "Revise com resumos e flashcards acessíveis",
] as const;

/**
 * Rótulo discreto de seção.
 *
 * A hierarquia da tela é deliberadamente rasa: só a saudação e o cartão de
 * escanear disputam atenção. Os títulos das demais seções recuam para caixa
 * alta pequena para não competirem com o CTA.
 */
function SectionLabel({ id, children }: { id: string; children: string }) {
  return (
    <h2 id={id} className="mb-3 text-xs font-semibold tracking-wide text-text-subtle uppercase">
      {children}
    </h2>
  );
}

export function HomePage() {
  const { user } = useAuth();
  const greeting = user ? `Olá, ${user.name}!` : "Olá!";
  const welcomeText = `${greeting} Bem-vindo ao CodeCam. Fotografe um material de estudo e transforme-o em conteúdo organizado com ajuda da inteligência artificial.`;

  return (
    <div className="flex min-h-dvh flex-col bg-bg">
      <Navbar />

      <main id="main-content" className="mx-auto w-full max-w-2xl flex-1 px-4 pt-6 pb-28">
        {/* Saudação */}
        <section className="mb-8 animate-rise-in" aria-labelledby="welcome-heading">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h1 id="welcome-heading" className="text-3xl font-bold text-text">
                {greeting}
              </h1>
              <p className="mt-2 text-base text-text-muted">
                Fotografe um material de estudo e transforme-o em conteúdo organizado com IA.
              </p>
            </div>
            <TTSButton text={welcomeText} label="boas-vindas" />
          </div>
        </section>

        {/* CTA principal — o centro de gravidade da tela */}
        <section className="mb-10" aria-labelledby="scan-heading">
          <Link
            to="/camera"
            className="group block rounded-2xl opacity-0 animate-rise-in"
            style={{ animationDelay: "60ms" }}
          >
            <Card
              elevation="raised"
              padding="none"
              interactive
              className="relative overflow-hidden rounded-2xl border-accent/25 bg-accent-subtle"
            >
              {/* Halo difuso atrás do ícone: dá profundidade ao cartão sem
                  depender de sombra, que praticamente não aparece no tema
                  escuro. */}
              <span
                className="pointer-events-none absolute -top-20 -right-12 size-56 rounded-full bg-accent/15 blur-3xl"
                aria-hidden="true"
              />

              <div className="relative flex items-center gap-4 p-5 sm:gap-5 sm:p-6">
                <span
                  className={cn(
                    "grid size-16 shrink-0 place-items-center rounded-2xl sm:size-18",
                    "bg-accent text-accent-contrast shadow-accent",
                    "transition-transform duration-200 ease-spring group-hover:scale-105",
                  )}
                  aria-hidden="true"
                >
                  <Camera size={30} strokeWidth={1.9} />
                </span>

                <div className="min-w-0 flex-1">
                  <Badge tone="accent" className="mb-1.5">
                    Comece por aqui
                  </Badge>
                  <h2 id="scan-heading" className="text-xl font-bold text-text">
                    Escanear material
                  </h2>
                  <p className="mt-0.5 text-sm text-text-muted">Câmera ou galeria</p>
                </div>

                <ChevronRight
                  size={24}
                  className="shrink-0 text-accent transition-transform duration-200 ease-enter group-hover:translate-x-1"
                  aria-hidden="true"
                />
              </div>
            </Card>
          </Link>
        </section>

        {/* Atalhos */}
        <section
          className="mb-10 opacity-0 animate-rise-in"
          style={{ animationDelay: "120ms" }}
          aria-labelledby="features-heading"
        >
          <SectionLabel id="features-heading">Explorar</SectionLabel>

          <div className="grid grid-cols-2 gap-3">
            {SHORTCUTS.map(({ to, icon: Icon, title, description, ariaLabel }) => (
              <Link key={to} to={to} aria-label={ariaLabel} className="group block rounded-xl">
                <Card interactive padding="lg" className="h-full">
                  <span
                    className={cn(
                      "grid size-10 place-items-center rounded-lg bg-accent-subtle text-accent",
                      "transition-transform duration-200 ease-spring group-hover:scale-105",
                    )}
                    aria-hidden="true"
                  >
                    <Icon size={20} />
                  </span>
                  <p className="mt-3 text-sm font-semibold text-text">{title}</p>
                  <p className="mt-0.5 text-xs text-text-muted">{description}</p>
                </Card>
              </Link>
            ))}
          </div>
        </section>

        {/* Como funciona */}
        <section
          className="opacity-0 animate-rise-in"
          style={{ animationDelay: "180ms" }}
          aria-labelledby="howto-heading"
        >
          <SectionLabel id="howto-heading">Como funciona</SectionLabel>

          <Card padding="lg">
            <ol className="flex flex-col">
              {STEPS.map((text, index) => (
                <li key={text} className="flex gap-4">
                  {/* Coluna do marcador: o número e o fio que o liga ao passo
                      seguinte. O fio é omitido no último item para não sobrar
                      um traço solto abaixo dele. */}
                  <div className="flex flex-col items-center">
                    <span
                      className="grid size-8 shrink-0 place-items-center rounded-full bg-accent-subtle text-sm font-bold text-accent tabular-nums"
                      aria-hidden="true"
                    >
                      {index + 1}
                    </span>
                    {index < STEPS.length - 1 && (
                      <span className="w-px flex-1 bg-border" aria-hidden="true" />
                    )}
                  </div>

                  <p
                    className={cn(
                      // Alinha a primeira linha com o centro do círculo de 2rem.
                      "pt-1.5 text-sm text-text",
                      index < STEPS.length - 1 && "pb-5",
                    )}
                  >
                    {text}
                  </p>
                </li>
              ))}
            </ol>
          </Card>
        </section>
      </main>

      <BottomNav />
    </div>
  );
}
