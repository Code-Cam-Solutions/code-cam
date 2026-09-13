import { Link } from "react-router-dom";
import {
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
import { Button, Card, Skeleton, cn } from "@/design-system";
import { ActivityChart } from "../components/ActivityChart";

function greetingFor(date: Date): string {
  const hour = date.getHours();
  if (hour < 5) return "Boa madrugada";
  if (hour < 12) return "Bom dia";
  if (hour < 18) return "Boa tarde";
  return "Boa noite";
}

/** Data por extenso, curta: "sábado, 13 de setembro". */
function todayLabel(date: Date): string {
  return date.toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" });
}

/**
 * Cartão de destaque do dia.
 *
 * É o único elemento da tela pintado com o gradiente da marca, e isso é a
 * regra que faz a hierarquia funcionar: dois cartões com o mesmo tratamento se
 * anulam, e era o que acontecia quando revisar e escanear disputavam o mesmo
 * peso visual. Aqui só um deles ganha o destaque, e é o que a situação pede.
 */
function HeroAction({
  to,
  icon,
  eyebrow,
  headline,
  detail,
}: {
  to: string;
  icon: React.ReactNode;
  eyebrow: string;
  headline: string;
  detail: string;
}) {
  return (
    <Link to={to} className="group block rounded-2xl">
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
            {icon}
          </span>

          <div className="min-w-0 flex-1">
            <span className="inline-flex rounded-full border border-accent-contrast/25 bg-accent-contrast/10 px-2.5 py-0.5 text-2xs font-semibold tracking-wide uppercase">
              {eyebrow}
            </span>
            <p className="mt-1.5 text-2xl font-bold tracking-tight text-balance tabular-nums">
              {headline}
            </p>
            <p className="mt-0.5 text-sm opacity-85">{detail}</p>
          </div>

          <ChevronRight
            size={24}
            className="shrink-0 transition-transform duration-200 ease-enter group-hover:translate-x-1"
            aria-hidden="true"
          />
        </div>
      </Card>
    </Link>
  );
}

/** Ação de apoio: mesma largura do herói, peso visual bem menor. */
function SupportAction({
  to,
  icon,
  title,
  detail,
}: {
  to: string;
  icon: React.ReactNode;
  title: string;
  detail: string;
}) {
  return (
    <Link to={to} className="group block rounded-xl">
      <Card interactive padding="none" className="bg-surface-gradient">
        <div className="flex items-center gap-3.5 p-4">
          <span
            className="grid size-11 shrink-0 place-items-center rounded-xl bg-accent-subtle text-accent transition-transform duration-200 ease-spring group-hover:scale-105"
            aria-hidden="true"
          >
            {icon}
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-base font-semibold text-text">{title}</p>
            <p className="mt-0.5 text-sm text-text-muted">{detail}</p>
          </div>
          <ChevronRight
            size={18}
            className="shrink-0 text-text-subtle transition-transform duration-200 ease-enter group-hover:translate-x-0.5"
            aria-hidden="true"
          />
        </div>
      </Card>
    </Link>
  );
}

/** Uma métrica do painel. Número grande, rótulo pequeno, nada de moldura. */
function Metric({
  value,
  unit,
  label,
  icon,
  tone,
}: {
  value: string | number;
  unit?: string;
  label: string;
  icon: React.ReactNode;
  tone: "accent" | "success" | "warning" | "neutral";
}) {
  const iconTone = {
    accent: "text-accent",
    success: "text-success",
    warning: "text-warning",
    neutral: "text-text-subtle",
  }[tone];

  return (
    <div className="min-w-0 flex-1 px-1 text-center">
      <span className={cn("mx-auto mb-1 block w-fit", iconTone)} aria-hidden="true">
        {icon}
      </span>
      <p className="flex items-baseline justify-center gap-0.5">
        {/* `tabular-nums`: sem isso um contador que vai de 9 para 10
            reposiciona os dígitos e a linha inteira dança. */}
        <span className="text-2xl font-bold tracking-tight text-text tabular-nums">{value}</span>
        {unit !== undefined && <span className="text-xs text-text-muted">{unit}</span>}
      </p>
      <p className="mt-0.5 text-2xs leading-tight text-text-subtle">{label}</p>
    </div>
  );
}

export function HomePage() {
  const { user } = useAuth();
  const { data: stats, status, error, reload } = useAsync<StatsOverview>(getStatsOverview);

  const now = new Date();
  const greeting = `${greetingFor(now)}${user ? `, ${user.name}` : ""}`;
  const due = stats?.dueNow ?? 0;

  const spoken = stats
    ? `${greeting}. Você tem ${due} cartões para revisar, ${stats.streakDays} dias seguidos de estudo e ${stats.masteryRate} por cento de domínio.`
    : greeting;

  return (
    <div className="flex min-h-dvh flex-col bg-bg">
      <Navbar />

      {/* `overflow-x-clip` contém o halo, que sangra para fora da largura de
          propósito. `clip` em vez de `hidden` para não criar contexto de
          rolagem e quebrar o `sticky` da barra. */}
      <main
        id="main-content"
        className="relative mx-auto w-full max-w-2xl flex-1 overflow-x-clip px-4 pt-4 pb-28"
      >
        <span className="brand-glow -top-28 -right-20 size-80" aria-hidden="true" />

        {/*
          Cabeçalho enxuto.
          A saudação ocupava duas linhas grandes para dizer muito pouco. Agora a
          data leva o contexto e o nome fica numa linha só — o espaço que sobra
          vai para a ação, que é o que a pessoa veio fazer.
        */}
        <header className="relative mb-5 flex animate-rise-in items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-2xs font-semibold tracking-wide text-text-subtle uppercase">
              {todayLabel(now)}
            </p>
            <h1 className="mt-1 text-2xl font-bold tracking-tight text-text">{greeting}</h1>
          </div>
          <TTSButton text={spoken} label="resumo do dia" />
        </header>

        {/*
          O destaque muda com a situação.
          Com cartões vencendo, revisar é o que rende — o material já
          fotografado só vira memória se for revisto na hora certa. Sem nada
          vencido, escanear passa a ser o destaque, em vez de um segundo cartão
          disputando atenção com um botão que não leva a lugar nenhum.
        */}
        <section
          className="relative opacity-0 animate-rise-in"
          style={{ animationDelay: "60ms" }}
          aria-label="Ação principal"
        >
          {due > 0 ? (
            <HeroAction
              to="/flashcards"
              icon={<RefreshCcw size={26} strokeWidth={1.9} />}
              eyebrow="Revisão do dia"
              headline={`${due} ${due === 1 ? "cartão" : "cartões"}`}
              detail="No ponto certo de serem lembrados"
            />
          ) : (
            <HeroAction
              to="/camera"
              icon={<Camera size={26} strokeWidth={1.9} />}
              eyebrow="Comece por aqui"
              headline="Escanear material"
              detail="Fotografe a lousa e receba resumo, tópicos e flashcards"
            />
          )}
        </section>

        <section
          className="relative mt-3 flex flex-col gap-3 opacity-0 animate-rise-in"
          style={{ animationDelay: "100ms" }}
          aria-label="Atalhos"
        >
          {due > 0 && (
            <SupportAction
              to="/camera"
              icon={<Camera size={21} strokeWidth={1.9} />}
              title="Escanear material"
              detail="Foto vira resumo, tópicos e flashcards"
            />
          )}

          <div className="grid grid-cols-2 gap-3">
            <Link to="/folders" className="group block rounded-xl">
              <Card interactive padding="md" className="bg-surface-gradient h-full">
                <span
                  className="grid size-10 place-items-center rounded-xl bg-surface-sunken text-text-muted transition-transform duration-200 ease-spring group-hover:scale-105"
                  aria-hidden="true"
                >
                  <FolderOpen size={19} strokeWidth={1.9} />
                </span>
                <p className="mt-2.5 text-sm font-semibold text-text">Minhas pastas</p>
                <p className="mt-0.5 text-xs text-text-muted">
                  {stats
                    ? `${stats.contents} ${stats.contents === 1 ? "material" : "materiais"}`
                    : "Conteúdos salvos"}
                </p>
              </Card>
            </Link>

            <Link to="/search" className="group block rounded-xl">
              <Card interactive padding="md" className="bg-surface-gradient h-full">
                <span
                  className="grid size-10 place-items-center rounded-xl bg-surface-sunken text-text-muted transition-transform duration-200 ease-spring group-hover:scale-105"
                  aria-hidden="true"
                >
                  <Search size={19} strokeWidth={1.9} />
                </span>
                <p className="mt-2.5 text-sm font-semibold text-text">Buscar</p>
                <p className="mt-0.5 text-xs text-text-muted">Em todo o conteúdo</p>
              </Card>
            </Link>
          </div>
        </section>

        {/*
          Progresso em um painel só.
          Eram quatro caixas empilhadas — anel, dois cartões de número e o
          gráfico —, cada uma com sua borda e seu respiro. Quatro molduras para
          quatro números da mesma história é o que fazia a tela parecer uma
          lista de widgets em vez de um painel. Agora é um cartão: métricas em
          faixa no topo, gráfico embaixo, um filete separando os dois.
        */}
        <section
          className="mt-6 opacity-0 animate-rise-in"
          style={{ animationDelay: "140ms" }}
          aria-labelledby="progress-heading"
        >
          <h2
            id="progress-heading"
            className="mb-3 flex items-center gap-2 text-xs font-semibold tracking-wide text-text-subtle uppercase"
          >
            <span className="h-3.5 w-0.5 rounded-full bg-accent" aria-hidden="true" />
            Seu progresso
          </h2>

          {status === "loading" && !stats && <Skeleton className="h-64 rounded-xl" />}

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
            <Card padding="none" className="bg-surface-gradient overflow-hidden">
              <div className="flex items-stretch gap-1 px-3 py-4">
                <Metric
                  icon={<Sparkles size={17} />}
                  tone="accent"
                  value={`${stats.masteryRate}%`}
                  label="Domínio"
                />
                {/* Filetes verticais em vez de bordas: separam sem encaixotar. */}
                <span className="w-px shrink-0 self-stretch bg-border" aria-hidden="true" />
                <Metric
                  icon={<Flame size={17} />}
                  tone={stats.streakDays > 0 ? "warning" : "neutral"}
                  value={stats.streakDays}
                  unit={stats.streakDays === 1 ? "dia" : "dias"}
                  label="Sequência"
                />
                <span className="w-px shrink-0 self-stretch bg-border" aria-hidden="true" />
                <Metric
                  icon={<Target size={17} />}
                  tone="success"
                  value={`${stats.accuracy}%`}
                  label="Acerto (30d)"
                />
              </div>

              {/*
                Sem anel aqui.
                Ele mostrava o mesmo percentual que a faixa logo acima — o
                número aparecia duas vezes, a poucos pixels de distância, e o
                segundo não acrescentava nada. Ficou a linha que traz informação
                nova: a contagem absoluta e o critério. Um percentual sem
                definição não é medida, é enfeite — e este demora semanas para
                sair do zero, o que sem explicação parece defeito.
              */}
              <div className="border-t border-border px-4 py-3.5">
                <p className="text-sm text-text">
                  <span className="font-semibold tabular-nums">{stats.mastered}</span> de{" "}
                  <span className="tabular-nums">{stats.flashcards}</span>{" "}
                  {stats.flashcards === 1 ? "cartão memorizado" : "cartões memorizados"}
                </p>
                <p className="mt-1 text-xs leading-snug text-text-subtle">
                  Um cartão conta como memorizado quando o intervalo de revisão passa de três
                  semanas.
                </p>
              </div>

              <div className="border-t border-border px-4 py-4">
                <ActivityChart days={stats.activity} />
              </div>
            </Card>
          )}
        </section>
      </main>

      <BottomNav />
    </div>
  );
}
