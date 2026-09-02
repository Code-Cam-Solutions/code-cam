import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { Button } from "./Button";

describe("Button", () => {
  it("renderiza o conteúdo e dispara o clique", async () => {
    const onClick = vi.fn();
    render(<Button onClick={onClick}>Entrar</Button>);

    await userEvent.click(screen.getByRole("button", { name: "Entrar" }));

    expect(onClick).toHaveBeenCalledOnce();
  });

  it("bloqueia o clique enquanto carrega", async () => {
    const onClick = vi.fn();
    render(
      <Button loading onClick={onClick}>
        Entrar
      </Button>,
    );

    const button = screen.getByRole("button");
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute("aria-busy", "true");

    await userEvent.click(button);
    expect(onClick).not.toHaveBeenCalled();
  });

  it("substitui o rótulo por um estado de carregamento anunciável", () => {
    render(<Button loading>Entrar</Button>);

    expect(screen.getByRole("button")).toHaveAccessibleName("Carregando…");
    expect(screen.queryByText("Entrar")).not.toBeInTheDocument();
  });

  it("aceita um rótulo de carregamento específico da ação", () => {
    render(
      <Button loading loadingLabel="Analisando a imagem…">
        Escanear
      </Button>,
    );

    expect(screen.getByRole("button")).toHaveAccessibleName("Analisando a imagem…");
  });

  it("esconde ícones decorativos de leitores de tela", () => {
    render(
      <Button icon={<svg data-testid="icone" />} iconAfter={<svg data-testid="depois" />}>
        Escanear
      </Button>,
    );

    expect(screen.getByTestId("icone").parentElement).toHaveAttribute("aria-hidden", "true");
    expect(screen.getByTestId("depois").parentElement).toHaveAttribute("aria-hidden", "true");
    // O nome acessível vem só do texto: os ícones não poluem o anúncio.
    expect(screen.getByRole("button")).toHaveAccessibleName("Escanear");
  });

  it("anuncia o estado desabilitado para leitores de tela", () => {
    render(<Button disabled>Salvar</Button>);

    const button = screen.getByRole("button");
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute("aria-disabled", "true");
  });

  it("deixa a classe de quem usa vencer a padrão do componente", () => {
    // O tailwind-merge precisa resolver o conflito; sem ele o resultado
    // dependeria da ordem das regras no CSS, não da intenção no JSX.
    render(<Button className="rounded-full">Entrar</Button>);

    const { className } = screen.getByRole("button");
    expect(className).toContain("rounded-full");
    expect(className).not.toContain("rounded-lg");
  });

  it("mantém o alvo de toque em pelo menos 44px no tamanho padrão", () => {
    render(<Button>Entrar</Button>);

    // WCAG 2.2 (2.5.8). A altura vai em rem para acompanhar o ajuste de
    // tamanho de fonte da acessibilidade.
    expect(screen.getByRole("button").className).toContain("min-h-[2.75rem]");
  });
});
