import { Link } from "react-router-dom";
import { Camera, Folder, Sparkles } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { Navbar } from "../components/Navbar";
import { BottomNav } from "../components/BottomNav";
import { TTSButton } from "../components/TTSButton";
import { Button } from "../components/Button";

export function HomePage() {
  const { user } = useAuth();
  const greeting = user ? `Olá, ${user.name}!` : "Olá!";
  const welcomeText = `${greeting} Bem-vindo ao CodeCam. Fotografe um material de estudo e transforme-o em conteúdo organizado com ajuda da inteligência artificial.`;

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ backgroundColor: "var(--color-background)" }}
    >
      <Navbar />

      <main
        className="flex-1 px-4 pt-6 pb-24 max-w-2xl mx-auto w-full"
        id="main-content"
      >
        {/* Welcome */}
        <section
          className="mb-8 p-5 rounded-2xl"
          style={{ backgroundColor: "var(--color-surface)" }}
          aria-labelledby="welcome-heading"
        >
          <div className="flex items-start justify-between gap-2 mb-3">
            <div>
              <h1
                id="welcome-heading"
                className="font-bold text-white mb-1"
                style={{ fontSize: "var(--text-2xl)" }}
              >
                {greeting}
              </h1>
              <p style={{ color: "var(--color-text-muted)", fontSize: "var(--text-sm)" }}>
                Pronto para estudar?
              </p>
            </div>
            <TTSButton text={welcomeText} label="boas-vindas" />
          </div>
          <p className="text-white" style={{ fontSize: "var(--text-base)", lineHeight: "1.6" }}>
            Fotografe um material de estudo e transforme-o em conteúdo organizado com IA.
          </p>
        </section>

        {/* Main CTA */}
        <section className="mb-8" aria-labelledby="scan-heading">
          <h2
            id="scan-heading"
            className="font-semibold text-white mb-3"
            style={{ fontSize: "var(--text-lg)" }}
          >
            Escanear material
          </h2>
          <Link to="/camera" className="block">
            <div
              className="relative flex flex-col items-center justify-center py-12 rounded-2xl border-2 border-dashed transition-all active:scale-98 hover:border-codecam group"
              style={{
                borderColor: "var(--color-codecam)",
                backgroundColor: "var(--color-codecam)10",
              }}
            >
              <div
                className="w-16 h-16 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform"
                style={{ backgroundColor: "var(--color-codecam)" }}
              >
                <Camera size={28} color="white" aria-hidden="true" />
              </div>
              <span
                className="font-semibold text-white"
                style={{ fontSize: "var(--text-lg)" }}
              >
                Escanear agora
              </span>
              <span
                className="mt-1"
                style={{ color: "var(--color-text-muted)", fontSize: "var(--text-sm)" }}
              >
                Câmera ou galeria
              </span>
            </div>
          </Link>
        </section>

        {/* Quick links */}
        <section aria-labelledby="features-heading">
          <h2
            id="features-heading"
            className="font-semibold text-white mb-3"
            style={{ fontSize: "var(--text-lg)" }}
          >
            Explorar
          </h2>
          <div className="grid grid-cols-2 gap-3">
            <Link
              to="/folders"
              className="flex flex-col gap-2 p-4 rounded-2xl transition-colors hover:bg-surface-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-codecam"
              style={{ backgroundColor: "var(--color-surface)" }}
              aria-label="Ir para minhas pastas"
            >
              <Folder size={24} style={{ color: "var(--color-codecam)" }} aria-hidden="true" />
              <span className="font-medium text-white" style={{ fontSize: "var(--text-sm)" }}>
                Minhas Pastas
              </span>
              <span style={{ color: "var(--color-text-muted)", fontSize: "var(--text-xs)" }}>
                Conteúdos salvos
              </span>
            </Link>

            <Link
              to="/settings"
              className="flex flex-col gap-2 p-4 rounded-2xl transition-colors hover:bg-surface-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-codecam"
              style={{ backgroundColor: "var(--color-surface)" }}
              aria-label="Ir para configurações de acessibilidade"
            >
              <Sparkles size={24} style={{ color: "var(--color-codecam)" }} aria-hidden="true" />
              <span className="font-medium text-white" style={{ fontSize: "var(--text-sm)" }}>
                Acessibilidade
              </span>
              <span style={{ color: "var(--color-text-muted)", fontSize: "var(--text-xs)" }}>
                Personalize sua experiência
              </span>
            </Link>
          </div>
        </section>

        {/* How it works */}
        <section className="mt-8" aria-labelledby="howto-heading">
          <h2
            id="howto-heading"
            className="font-semibold text-white mb-3"
            style={{ fontSize: "var(--text-lg)" }}
          >
            Como funciona
          </h2>
          <div className="flex flex-col gap-3">
            {[
              { step: "1", text: "Fotografe uma lousa, caderno ou livro" },
              { step: "2", text: "A IA analisa e organiza o conteúdo" },
              { step: "3", text: "Revise com resumos e flashcards acessíveis" },
            ].map(({ step, text }) => (
              <div
                key={step}
                className="flex items-center gap-3 p-3 rounded-xl"
                style={{ backgroundColor: "var(--color-surface)" }}
              >
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-white flex-shrink-0"
                  style={{
                    backgroundColor: "var(--color-codecam)",
                    fontSize: "var(--text-sm)",
                  }}
                  aria-hidden="true"
                >
                  {step}
                </div>
                <p className="text-white" style={{ fontSize: "var(--text-sm)" }}>
                  {text}
                </p>
              </div>
            ))}
          </div>
        </section>
      </main>

      <BottomNav />
    </div>
  );
}
