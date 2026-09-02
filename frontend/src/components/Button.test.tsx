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
    expect(button).toHaveAttribute("aria-disabled", "true");

    await userEvent.click(button);
    expect(onClick).not.toHaveBeenCalled();
  });

  it("substitui o rótulo por um estado de carregamento anunciável", () => {
    render(<Button loading>Entrar</Button>);

    expect(screen.getByRole("button")).toHaveAccessibleName("Carregando...");
    expect(screen.queryByText("Entrar")).not.toBeInTheDocument();
  });

  it("mantém o alvo de toque em pelo menos 48px no tamanho padrão", () => {
    render(<Button>Entrar</Button>);

    // WCAG 2.2 (2.5.8) exige alvos de toque adequados — o app é mobile-first.
    expect(screen.getByRole("button").className).toContain("min-h-[48px]");
  });

  it("esconde o ícone decorativo de leitores de tela", () => {
    render(<Button icon={<svg data-testid="icone" />}>Escanear</Button>);

    expect(screen.getByTestId("icone").parentElement).toHaveAttribute("aria-hidden", "true");
    expect(screen.getByRole("button")).toHaveAccessibleName("Escanear");
  });
});
