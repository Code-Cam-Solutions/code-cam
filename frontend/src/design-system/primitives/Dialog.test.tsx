import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { Dialog } from "./Dialog";

/** Cenário realista: um botão abre a modal, que contém campos e ações. */
function Harness({ onClose }: { onClose?: () => void } = {}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button type="button" onClick={() => setOpen(true)}>
        Abrir
      </button>
      <Dialog
        open={open}
        onClose={() => {
          setOpen(false);
          onClose?.();
        }}
        title="Salvar em pasta"
        description="Escolha onde guardar este material."
      >
        <input aria-label="Nome da pasta" />
        <button type="button">Confirmar</button>
      </Dialog>
    </>
  );
}

describe("Dialog", () => {
  it("não renderiza nada enquanto fechado", () => {
    render(<Harness />);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("expõe título e descrição como nome e descrição acessíveis", async () => {
    render(<Harness />);
    await userEvent.click(screen.getByRole("button", { name: "Abrir" }));

    const dialog = screen.getByRole("dialog");
    expect(dialog).toHaveAccessibleName("Salvar em pasta");
    expect(dialog).toHaveAccessibleDescription("Escolha onde guardar este material.");
    expect(dialog).toHaveAttribute("aria-modal", "true");
  });

  it("move o foco para dentro ao abrir", async () => {
    render(<Harness />);
    await userEvent.click(screen.getByRole("button", { name: "Abrir" }));

    // Sem isto o teclado continuaria na página de trás, e quem não usa mouse
    // não teria como alcançar a modal.
    expect(screen.getByRole("dialog")).toContainElement(
      document.activeElement as HTMLElement | null,
    );
  });

  it("devolve o foco a quem a abriu ao fechar", async () => {
    render(<Harness />);
    const trigger = screen.getByRole("button", { name: "Abrir" });

    await userEvent.click(trigger);
    await userEvent.keyboard("{Escape}");

    expect(trigger).toHaveFocus();
  });

  it("fecha com Escape", async () => {
    const onClose = vi.fn();
    render(<Harness onClose={onClose} />);

    await userEvent.click(screen.getByRole("button", { name: "Abrir" }));
    await userEvent.keyboard("{Escape}");

    expect(onClose).toHaveBeenCalledOnce();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("prende o Tab dentro do diálogo", async () => {
    render(<Harness />);
    await userEvent.click(screen.getByRole("button", { name: "Abrir" }));

    const dialog = screen.getByRole("dialog");

    // Percorre mais elementos do que a modal contém: sem a armadilha, o foco
    // teria escapado para o botão "Abrir" atrás dela.
    for (let i = 0; i < 8; i += 1) {
      await userEvent.tab();
      expect(dialog).toContainElement(document.activeElement as HTMLElement | null);
    }
  });

  it("circula para trás com Shift+Tab", async () => {
    render(<Harness />);
    await userEvent.click(screen.getByRole("button", { name: "Abrir" }));

    const dialog = screen.getByRole("dialog");

    for (let i = 0; i < 5; i += 1) {
      await userEvent.tab({ shift: true });
      expect(dialog).toContainElement(document.activeElement as HTMLElement | null);
    }
  });

  it("trava a rolagem do fundo enquanto aberto e a restaura ao fechar", async () => {
    render(<Harness />);

    await userEvent.click(screen.getByRole("button", { name: "Abrir" }));
    expect(document.body.style.overflow).toBe("hidden");

    await userEvent.keyboard("{Escape}");
    expect(document.body.style.overflow).not.toBe("hidden");
  });

  it("fecha ao acionar o fundo", async () => {
    const onClose = vi.fn();
    render(<Harness onClose={onClose} />);
    await userEvent.click(screen.getByRole("button", { name: "Abrir" }));

    const backdrop = screen.getByRole("dialog").parentElement?.firstElementChild;
    expect(backdrop).toHaveAttribute("aria-hidden", "true");

    await userEvent.click(backdrop as Element);
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("prioriza o campo marcado com data-autofocus", async () => {
    function ComCampoPrincipal() {
      const [open, setOpen] = useState(false);
      return (
        <>
          <button type="button" onClick={() => setOpen(true)}>
            Abrir
          </button>
          <Dialog open={open} onClose={() => setOpen(false)} title="Nova pasta">
            <input aria-label="Nome da pasta" data-autofocus />
          </Dialog>
        </>
      );
    }
    render(<ComCampoPrincipal />);

    await userEvent.click(screen.getByRole("button", { name: "Abrir" }));

    // Sem isto o foco cairia no botão de fechar, que é o primeiro no DOM —
    // toda modal abriria apontando para a saída.
    expect(screen.getByRole("textbox", { name: "Nome da pasta" })).toHaveFocus();
  });

  it("permite esconder o botão de fechar quando a ação deve ser deliberada", () => {
    function Forced() {
      return (
        <Dialog open onClose={() => undefined} title="Confirme" hideCloseButton>
          <button type="button">Entendi</button>
        </Dialog>
      );
    }
    render(<Forced />);

    expect(screen.queryByRole("button", { name: "Fechar" })).not.toBeInTheDocument();
  });
});
