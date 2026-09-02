import { Link } from "react-router-dom";
import {
  BookOpen,
  Camera,
  ChevronRight,
  Flame,
  FolderOpen,
  RefreshCcw,
  Search,
  Sparkles,
  Target,
} from "lucide-react";
import { getStatsOverview, type StatsOverview } from "@/api";
import { useAuth } from "@/shared/context/AuthContext";
import { useAsync } from "@/shared/hooks/useAsync";
import { Navbar } from "@/shared/components/Navbar";
import { BottomNav } from "@/shared/components/BottomNav";
import { TTSButton } from "@/shared/components/TTSButton";
import { Button, Card, Ring, Skeleton, cn } from "@/design-system";
import { ActivityChart } from "../components/ActivityChart";

/**
 * Rótulo discreto de seção.
 *
 * Recua para caixa alta pequena para não competir com o CTA, e ganha um filete
 * de acento à esquerda — que é o que separa "título de seção" de "legenda
 * solta" quando o texto é pequeno e cinza.
 */
function SectionLabel({ id, children }: { id: string; children: string }) {
  return (
    <h2
      id={id}
      className="mb-3 flex items-center gap-2 text-xs font-semibold tracking-wide text-text-subtle uppercase"
    >
      <span className="h-3.5 w-0.5 rounded-full bg-accent" aria-hidden="true" />
      {children}
    </h2>
  );
}

function greetingFor(date: Date): string {
  const hour = date.getHours();
  if (hour < 5) return "Boa madrugada";
  if (hour < 12) return "Bom dia";
  if (hour < 18) return "Boa tarde";
  return "Boa noite";
}

export function HomePage() {
  const { user } = useAuth();
  const { data: stats, status, error, reload } = useAsync<StatsOverview>(getStatsOverview);

  const greeting = `${greetingFor(new Date())}${user ? `, ${user.name}` : ""}!`;

  return (
    <div className="flex min-h-dvh flex-col bg-bg">
      <Navbar />

      <main id="main-content" className="relative mx-auto w-full max-w-2xl flex-1 px-4 pt-5 pb-28">
        {/* Brilho de marca. Puramente decorativo: dá profundidade ao topo da
            tela sem depender de sombra, que praticamente não aparece no tema
            escuro. Some no alto contraste. */}
        <span className="brand-glow -top-24 -right-16 size-72" aria-hidden="true" />

        <section className="relative animate-rise-in" aria-labelledby="welcome-heading">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h1 id="welcome-heading" className="text-3xl font-bold tracking-tight text-text">
                {greeting}
              </h1>
              <p className="mt-1.5 text-base text-text-muted">
                {stats && stats.dueNow > 0
                  ? `Você tem ${stats.dueNow} ${stats.dueNow === 1 ? "cartão esperando" : "cartões esperando"} revisão.`
                  : "Fotografe um material e transforme em conteúdo de estudo."}
              </p>
            </div>

            <TTSButton
              text={`${greeting} ${stats ? `Você tem ${stats.dueNow} cartões para revisar e uma sequência de ${stats.streakDays} dias de estudo.` : ""}`}
              label="resumo do dia"
            />
          </div>
        </section>

        {/* Revisão pendente vem antes da captura quando existe: o material já
            fotografado só rende se for revisto na hora certa, e essa hora é
            agora. Sem cartão vencido, o cartão some em vez de virar um botão
            que não leva a nada. */}
        {stats && stats.dueNow > 0 && (
          <section
            className="relative mt-6 opacity-0 animate-rise-in"
            style={{ animationDelay: "60ms" }}
          >
            <Link to="/flashcards" className="group block rounded-2xl">
              {/* Único elemento da tela pintado com o gradiente da marca. É o
                  que o torna inconfundível como a ação do momento — usar o
                  mesmo tratamento em dois cartões anularia os dois. */}
              <Card
                elevation="raised"
                padding="none"
                interactive
                className="bg-accent-gradient relative overflow-hidden rounded-2xl border-transparent shadow-glow"
              >
                <span
                  className="pointer-events-none absolute -top-16 -right-10 size-48 rounded-full bg-white/15 blur-3xl"
                  aria-hidden="true"
                />

                <div className="relative flex items-center gap-4 p-5 text-accent-contrast">
                  <span
                    className="grid size-14 shrink-0 place-items-center rounded-2xl border border-accent-contrast/20 bg-accent-contrast/12"
                    aria-hidden="true"
                  >
                    <RefreshCcw size={26} strokeWidth={1.9} />
                  </span>

                  <div className="min-w-0 flex-1">
                    <span className="inline-flex rounded-full border border-accent-contrast/25 bg-accent-contrast/10 px-2.5 py-0.5 text-2xs font-semibold tracking-wide uppercase">
                      Revisão do dia
                    </span>
                    <p className="mt-1.5 text-2xl font-bold tracking-tight tabular-nums">
                      {stats.dueNow} {stats.dueNow === 1 ? "cartão" : "cartões"}
                    </p>
                    <p className="mt-0.5 text-sm opacity-85">No ponto certo de serem lembrados</p>
                  </div>

                  <ChevronRight
                    size={24}
                    className="shrink-0 transition-transform duration-200 ease-enter group-hover:translate-x-1"
                    aria-hidden="true"
                  />
                </div>
              </Card>
            </Link>
          </section>
        )}

        <section
          className="relative mt-4 opacity-0 animate-rise-in"
          style={{ animationDelay: "100ms" }}
          aria-labelledby="scan-heading"
        >
          <h2 id="scan-heading" className="sr-only">
            Escanear material
          </h2>

          <div className="grid grid-cols-2 gap-3">
            <Link to="/camera" className="group block rounded-xl">
              <Card interactive padding="lg" className="h-full border-accent/25 bg-accent-subtle">
                <span
                  className="grid size-11 place-items-center rounded-xl bg-accent text-accent-contrast shadow-accent transition-transform duration-200 ease-spring group-hover:scale-105"
                  aria-hidden="true"
                >
                  <Camera size={22} strokeWidth={1.9} />
                </span>
                <p className="mt-3 text-base font-semibold text-text">Escanear</p>
                <p className="mt-0.5 text-xs text-text-muted">Câmera ou galeria</p>
              </Card>
            </Link>

            <Link to="/folders" className="group block rounded-xl">
              <Card interactive padding="lg" className="bg-surface-gradient h-full">
                <span
                  className="grid size-11 place-items-center rounded-xl bg-surface-sunken text-text-muted transition-transform duration-200 ease-spring group-hover:scale-105"
                  aria-hidden="true"
                >
                  <FolderOpen size={22} strokeWidth={1.9} />
                </span>
                <p className="mt-3 text-base font-semibold text-text">Minhas pastas</p>
                <p className="mt-0.5 text-xs text-text-muted">
                  {stats
                    ? `${stats.contents} ${stats.contents === 1 ? "material" : "materiais"}`
                    : "Conteúdos salvos"}
                </p>
              </Card>
            </Link>
          </div>
        </section>

        <section
          className="mt-8 opacity-0 animate-rise-in"
          style={{ animationDelay: "140ms" }}
          aria-labelledby="progress-heading"
        >
          <SectionLabel id="progress-heading">Seu progresso</SectionLabel>

          {status === "loading" && !stats && (
            <div className="flex flex-col gap-3">
              <Skeleton className="h-32 rounded-xl" />
              <Skeleton className="h-40 rounded-xl" />
            </div>
          )}

          {status === "error" && (
            <Card padding="lg" className="text-center">
              <p className="text-sm text-text-muted">{error}</p>
              <Button
                variant="secondary"
                size="sm"
                onClick={reload}
                icon={<RefreshCcw size={15} />}
                className="mx-auto mt-3"
              >
                Tentar novamente
              </Button>
            </Card>
          )}

          {stats && (
            <div className="flex flex-col gap-3">
              <Card padding="lg" className="bg-surface-gradient flex items-center gap-5">
                <Ring
                  value={stats.masteryRate}
                  label="Domínio do conteúdo"
                  caption="domínio"
                  size={92}
                  tone={stats.masteryRate >= 60 ? "success" : "accent"}
                />

                <div className="min-w-0 flex-1">
                  <p className="text-sm text-text">
                    <span className="font-semibold tabular-nums">{stats.mastered}</span> de{" "}
                    <span className="tabular-nums">{stats.flashcards}</span>{" "}
                    {stats.flashcards === 1 ? "cartão memorizado" : "cartões memorizados"}
                  </p>
                  {/* "Memorizado" tem um critério, e ele é dito: um número sem
                      definição não é medida, é enfeite. */}
                  <p className="mt-1 text-xs text-text-subtle">
                    Contam os cartões cujo intervalo de revisão já passou de três semanas.
                  </p>
                </div>
              </Card>

              <div className="grid grid-cols-2 gap-3">
                <StatCard
                  icon={<Flame size={19} />}
                  tone={stats.streakDays > 0 ? "warning" : "neutral"}
                  value={stats.streakDays}
                  unit={stats.streakDays === 1 ? "dia" : "dias"}
                  label="Sequência de estudo"
                />
                <StatCard
                  icon={<Target size={19} />}
                  tone="success"
                  value={`${stats.accuracy}%`}
                  label="Acerto nos últimos 30 dias"
                />
              </div>

              <Card padding="lg" className="bg-surface-gradient">
                <ActivityChart days={stats.activity} />
              </Card>
            </div>
          )}
        </section>

        <section
          className="mt-8 opacity-0 animate-rise-in"
          style={{ animationDelay: "180ms" }}
          aria-labelledby="shortcuts-heading"
        >
          <SectionLabel id="shortcuts-heading">Atalhos</SectionLabel>

          <div className="flex flex-col gap-2">
            <ShortcutRow
              to="/search"
              icon={<Search size={19} />}
              title="Buscar nos materiais"
              description="Procure por qualquer palavra do conteúdo"
            />
            <ShortcutRow
              to="/settings"
              icon={<Sparkles size={19} />}
              title="Acessibilidade"
              description="Fonte, contraste, leitura em voz alta"
            />
            <ShortcutRow
              to="/flashcards"
              icon={<BookOpen size={19} />}
              title="Estudar agora"
              description="Sessão de revisão com repetição espaçada"
            />
          </div>
        </section>
      </main>

      <BottomNav />
    </div>
  );
}

function StatCard({
  icon,
  value,
  unit,
  label,
  tone,
}: {
  icon: React.ReactNode;
  value: string | number;
  unit?: string;
  label: string;
  tone: "neutral" | "accent" | "success" | "warning";
}) {
  const iconTone = {
    neutral: "bg-surface-sunken text-text-subtle",
    accent: "bg-accent-subtle text-accent",
    success: "bg-success-subtle text-success",
    warning: "bg-warning-subtle text-warning",
  }[tone];

  return (
    // Ícone à esquerda do número, e não acima: empilhado, o rótulo de duas
    // palavras quebrava em duas linhas e os dois cartões ficavam com alturas
    // diferentes lado a lado.
    <Card padding="md" className="bg-surface-gradient flex items-center gap-3">
      <span
        className={cn("grid size-10 shrink-0 place-items-center rounded-lg", iconTone)}
        aria-hidden="true"
      >
        {icon}
      </span>
      <div className="min-w-0">
        <p className="flex items-baseline gap-1">
          {/* `tabular-nums`: sem isso um contador que vai de 9 para 10
              reposiciona os dígitos e a linha inteira dança. */}
          <span className="text-2xl font-bold tracking-tight text-text tabular-nums">{value}</span>
          {unit !== undefined && <span className="text-sm text-text-muted">{unit}</span>}
        </p>
        <p className="text-xs leading-snug text-text-muted">{label}</p>
      </div>
    </Card>
  );
}

function ShortcutRow({
  to,
  icon,
  title,
  description,
}: {
  to: string;
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <Link to={to} className="group block rounded-xl">
      <Card interactive padding="md" className="flex items-center gap-3.5">
        <span
          className="grid size-10 shrink-0 place-items-center rounded-lg bg-surface-sunken text-text-muted transition-colors duration-200 group-hover:bg-accent-subtle group-hover:text-accent"
          aria-hidden="true"
        >
          {icon}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-semibold text-text">{title}</span>
          <span className="mt-0.5 block text-xs text-text-muted">{description}</span>
        </span>
        <ChevronRight
          size={19}
          className="shrink-0 text-text-subtle transition-transform duration-200 ease-enter group-hover:translate-x-0.5"
          aria-hidden="true"
        />
      </Card>
    </Link>
  );
}
