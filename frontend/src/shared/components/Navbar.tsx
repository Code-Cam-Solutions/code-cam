import { ChevronLeft } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { cn } from "@/design-system";

interface NavbarProps {
  title?: string;
  showBack?: boolean;
  backTo?: string;
  /**
   * Voltar para um destino que precisa levar estado junto — o que uma rota em
   * texto não consegue expressar. Tem precedência sobre `backTo`.
   */
  onBack?: () => void;
}

/** Botão circular de 44px, o alvo de toque mínimo confortável em celular. */
const ICON_BUTTON = cn(
  "grid size-11 place-items-center rounded-full text-text-muted",
  "transition-colors duration-150 hover:bg-surface-sunken hover:text-text",
);

export function Navbar({ title, showBack = false, backTo, onBack }: NavbarProps) {
  const navigate = useNavigate();

  function handleBack() {
    // As sobrecargas de `navigate` para destino e para delta são distintas, e
    // uma união `string | -1` não satisfaz nenhuma das duas.
    if (onBack !== undefined) {
      onBack();
    } else if (backTo !== undefined) {
      void navigate(backTo);
    } else {
      void navigate(-1);
    }
  }

  return (
    <header
      role="banner"
      className={cn(
        "sticky top-0 flex h-14 items-center justify-between gap-2 px-2",
        "border-b border-border bg-bg/85 backdrop-blur-md",
        // A barra encosta no topo da tela; em aparelhos com notch o conteúdo
        // precisa descer para não ficar sob o recorte.
        "pt-[env(safe-area-inset-top)]",
      )}
      style={{ zIndex: "var(--ds-z-nav)" }}
    >
      <div className="flex min-w-0 items-center gap-1">
        {showBack && (
          <button type="button" onClick={handleBack} aria-label="Voltar" className={ICON_BUTTON}>
            <ChevronLeft size={22} aria-hidden="true" />
          </button>
        )}

        {/*
          Marca e título nunca aparecem juntos.
          Antes apareciam, e o resultado era "CodeCam Acessibilidade" lado a
          lado no topo — duas identidades no mesmo lugar, sem hierarquia entre
          elas. A marca vale onde a tela não tem nome próprio (o início); onde
          tem, o nome da tela é o que orienta.
        */}
        {title === undefined ? (
          <Link
            to="/"
            aria-label="CodeCam — início"
            className="ml-2 flex items-center gap-2 rounded-lg"
          >
            <img src="/logo-codecam.svg" alt="" aria-hidden="true" className="size-6" />
            <span className="text-lg font-bold text-accent">CodeCam</span>
          </Link>
        ) : (
          /*
            `p`, não `h1`.
            A barra é moldura: ela diz onde a pessoa está enquanto rola a
            página. O título da página é o `h1` do conteúdo. Como `h1`, esta
            linha criava um segundo título em seis telas — e quem usa leitor de
            tela ouvia "Acessibilidade" e logo depois "Aparência e
            acessibilidade", sem saber qual dos dois nomeia a página.
          */
          <p className={cn("truncate text-lg font-semibold text-text", !showBack && "ml-3")}>
            {title}
          </p>
        )}
      </div>

      {/*
        Esta barra não carrega mais ações de conta.
        Havia uma engrenagem aqui em cima e um "Ajustes" na barra de baixo, na
        mesma tela, levando ao mesmo lugar — dois caminhos para um destino,
        ocupando o canto onde o olho procura a ação da tela atual. E o sair era
        um ícone sem rótulo, a um toque de distância em todas as telas, sem
        confirmação: fácil de acertar sem querer, difícil de encontrar de
        propósito. Ambos foram para Ajustes, onde têm nome e espaço.
      */}
    </header>
  );
}
