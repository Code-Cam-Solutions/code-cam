import { Link } from "react-router-dom";
import { Camera, ChevronRight, Flame, FolderOpen, RefreshCcw, Search, Target } from "lucide-react";
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

          {/*
            Fotografar é a razão de o app existir, e era um quadrado de metade
            da largura dividindo a linha com "Minhas pastas" — dois cartões do
            mesmo tamanho, nenhum principal. Aqui ele ocupa a largura inteira,
            com os anéis da lente que a tela de entrada apresenta. Pastas e
            busca recuam para a linha de baixo, que é onde ações secundárias
            pertencem.
          */}
          <Link to="/camera" className="group block rounded-2xl">
            <Card
              interactive
              padding="none"
              className="relative overflow-hidden rounded-2xl border-accent/30 bg-accent-subtle"
            >
              <span
                className="pointer-events-none absolute -top-20 -right-14 size-56 rounded-full bg-accent/20 blur-3xl"
                aria-hidden="true"
              />

              <div className="relative flex items-center gap-4 p-5">
                <span
                  className="relative grid size-16 shrink-0 place-items-center"
                  aria-hidden="true"
                >
                  {/* Os mesmos anéis da tela de entrada, agora em repouso: aqui
                      eles marcam a identidade sem chamar atenção para si. */}
                  <span className="absolute size-16 rounded-full border border-accent/30" />
                  <span className="absolute size-[3.25rem] rounded-full border border-accent/50" />
                  <span className="grid size-11 place-items-center rounded-full bg-accent text-accent-contrast shadow-accent transition-transform duration-200 ease-spring group-hover:scale-105">
                    <Camera size={22} strokeWidth={1.9} />
                  </span>
                </span>

                <div className="min-w-0 flex-1">
                  <p className="text-xl font-bold tracking-tight text-text">Escanear material</p>
                  <p className="mt-0.5 text-sm text-text-muted">
                    Fotografe a lousa e receba resumo, tópicos e flashcards
                  </p>
                </div>

                <ChevronRight
                  size={22}
                  className="shrink-0 text-accent transition-transform duration-200 ease-enter group-hover:translate-x-1"
                  aria-hidden="true"
                />
              </div>
            </Card>
          </Link>

          <div className="mt-3 grid grid-cols-2 gap-3">
            <Link to="/folders" className="group block rounded-xl">
              <Card interactive padding="lg" className="bg-surface-gradient h-full">
                <span
                  className="grid size-10 place-items-center rounded-xl bg-surface-sunken text-text-muted transition-transform duration-200 ease-spring group-hover:scale-105"
                  aria-hidden="true"
                >
                  <FolderOpen size={20} strokeWidth={1.9} />
                </span>
                <p className="mt-3 text-sm font-semibold text-text">Minhas pastas</p>
                <p className="mt-0.5 text-xs text-text-muted">
                  {stats
                    ? `${stats.contents} ${stats.contents === 1 ? "material" : "materiais"}`
                    : "Conteúdos salvos"}
                </p>
              </Card>
            </Link>

            <Link to="/search" className="group block rounded-xl">
              <Card interactive padding="lg" className="bg-surface-gradient h-full">
                <span
                  className="grid size-10 place-items-center rounded-xl bg-surface-sunken text-text-muted transition-transform duration-200 ease-spring group-hover:scale-105"
                  aria-hidden="true"
                >
                  <Search size={20} strokeWidth={1.9} />
                </span>
                <p className="mt-3 text-sm font-semibold text-text">Buscar</p>
                <p className="mt-0.5 text-xs text-text-muted">Em todo o conteúdo</p>
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

        {/*
          A seção "Atalhos" saiu inteira: os três itens eram terceiros caminhos
          para destinos que já tinham dois. "Estudar agora" repetia o cartão de
          revisão do topo; "Acessibilidade" repetia a aba Ajustes da barra de
          baixo; "Buscar" subiu para junto de Pastas, onde tem companhia lógica
          em vez de uma lista só sua. Uma tela inicial que termina em três links
          para onde a pessoa já podia ir só adia o fim da rolagem.
        */}
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
