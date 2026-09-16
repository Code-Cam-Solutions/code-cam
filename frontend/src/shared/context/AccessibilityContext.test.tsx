import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { act } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AccessibilityProvider, useAccessibility } from "./AccessibilityContext";

const STORAGE_KEY = "codecam-accessibility";

/** Controla o que `prefers-color-scheme: dark` responde e permite emitir mudanças. */
function mockSystemTheme(prefersDark: boolean) {
  const listeners = new Set<(event: MediaQueryListEvent) => void>();

  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: (query: string) => ({
      matches: query.includes("dark") ? prefersDark : false,
      media: query,
      onchange: null,
      addEventListener: (_: string, listener: (event: MediaQueryListEvent) => void) =>
        listeners.add(listener),
      removeEventListener: (_: string, listener: (event: MediaQueryListEvent) => void) =>
        listeners.delete(listener),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }),
  });

  return {
    /** Simula o sistema trocando de tema, como acontece ao anoitecer. */
    emit(matches: boolean) {
      act(() => {
        for (const listener of listeners) {
          listener({ matches } as MediaQueryListEvent);
        }
      });
    },
  };
}

function Probe() {
  const { settings, resolvedTheme, setTheme, toggleHighContrast, setFontSize } = useAccessibility();

  return (
    <>
      <output data-testid="resolved">{resolvedTheme}</output>
      <output data-testid="preference">{settings.theme}</output>
      <button onClick={() => setTheme("light")}>claro</button>
      <button onClick={() => setTheme("dark")}>escuro</button>
      <button onClick={() => setTheme("system")}>sistema</button>
      <button onClick={toggleHighContrast}>contraste</button>
      <button onClick={() => setFontSize("xl")}>fonte grande</button>
    </>
  );
}

function renderProbe() {
  return render(
    <AccessibilityProvider>
      <Probe />
    </AccessibilityProvider>,
  );
}

describe("AccessibilityProvider", () => {
  beforeEach(() => {
    document.documentElement.removeAttribute("data-theme");
    document.documentElement.removeAttribute("data-contrast");
    document.documentElement.removeAttribute("data-dyslexic");
    document.documentElement.style.removeProperty("--ds-bg");

    // O index.html traz esta meta; em jsdom ela precisa ser montada à mão.
    document.getElementById("meta-theme-color")?.remove();
    const meta = document.createElement("meta");
    meta.id = "meta-theme-color";
    meta.setAttribute("name", "theme-color");
    meta.setAttribute("content", "#0e0e13");
    document.head.appendChild(meta);

    mockSystemTheme(false);
  });

  it("segue a preferência do sistema quando o tema é 'system'", () => {
    mockSystemTheme(true);
    renderProbe();

    expect(screen.getByTestId("resolved")).toHaveTextContent("dark");
    expect(document.documentElement.dataset.theme).toBe("dark");
  });

  it("acompanha o sistema trocando de tema sem recarregar", () => {
    const system = mockSystemTheme(false);
    renderProbe();
    expect(screen.getByTestId("resolved")).toHaveTextContent("light");

    system.emit(true);

    expect(screen.getByTestId("resolved")).toHaveTextContent("dark");
    expect(document.documentElement.dataset.theme).toBe("dark");
  });

  it("ignora o sistema depois de uma escolha explícita", async () => {
    const system = mockSystemTheme(false);
    renderProbe();

    await userEvent.click(screen.getByRole("button", { name: "escuro" }));
    expect(screen.getByTestId("resolved")).toHaveTextContent("dark");

    // O sistema muda para claro, mas a escolha do usuário prevalece.
    system.emit(false);
    expect(screen.getByTestId("resolved")).toHaveTextContent("dark");
  });

  it("permite voltar a seguir o sistema", async () => {
    mockSystemTheme(true);
    renderProbe();

    await userEvent.click(screen.getByRole("button", { name: "claro" }));
    expect(screen.getByTestId("resolved")).toHaveTextContent("light");

    await userEvent.click(screen.getByRole("button", { name: "sistema" }));
    expect(screen.getByTestId("resolved")).toHaveTextContent("dark");
  });

  it("escreve as preferências como atributos de <html>", async () => {
    renderProbe();

    await userEvent.click(screen.getByRole("button", { name: "contraste" }));
    await userEvent.click(screen.getByRole("button", { name: "fonte grande" }));

    // O CSS lê destes atributos; nenhum componente decide cor por conta própria.
    expect(document.documentElement.dataset.contrast).toBe("high");
    expect(document.documentElement.dataset.fontSize).toBe("xl");
  });

  it("remove o atributo ao desligar o alto contraste", async () => {
    renderProbe();
    const toggle = screen.getByRole("button", { name: "contraste" });

    await userEvent.click(toggle);
    expect(document.documentElement.dataset.contrast).toBe("high");

    await userEvent.click(toggle);
    expect(document.documentElement.dataset.contrast).toBeUndefined();
  });

  it("persiste as preferências entre sessões", async () => {
    renderProbe();
    await userEvent.click(screen.getByRole("button", { name: "escuro" }));

    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "{}") as {
      theme?: string;
    };
    expect(saved.theme).toBe("dark");
  });

  it("restaura preferências salvas ao montar", () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ theme: "dark", fontSize: "lg" }));
    renderProbe();

    expect(screen.getByTestId("preference")).toHaveTextContent("dark");
    expect(document.documentElement.dataset.fontSize).toBe("lg");
  });

  it("sobrevive a preferências corrompidas no storage", () => {
    localStorage.setItem(STORAGE_KEY, "{isto não é json");
    renderProbe();

    // Cair no padrão é preferível a derrubar o app por causa de storage sujo.
    expect(screen.getByTestId("preference")).toHaveTextContent("system");
  });

  it("preenche opções ausentes com o padrão", () => {
    // Uma preferência salva por uma versão antiga do app não conhece campos novos.
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ theme: "dark" }));
    renderProbe();

    expect(document.documentElement.dataset.fontSize).toBe("md");
  });
  /*
   * Em um app instalado na tela de início não há barra de endereços: a faixa
   * do topo é esta cor. Ela saía de duas metas presas a `prefers-color-scheme`,
   * ou seja, do aparelho — então pedir tema claro num celular no escuro deixava
   * uma faixa preta sobre uma tela clara, e a troca parecia não ter valido.
   */
  it("pinta a barra do sistema com a cor do tema escolhido, não a do aparelho", async () => {
    mockSystemTheme(true); // aparelho no escuro
    document.documentElement.style.setProperty("--ds-bg", "#f7f7fa");

    renderProbe();
    await userEvent.click(screen.getByRole("button", { name: "claro" }));

    expect(document.getElementById("meta-theme-color")).toHaveAttribute("content", "#f7f7fa");
  });

  it("acompanha o alto contraste, que também troca o fundo", async () => {
    document.documentElement.style.setProperty("--ds-bg", "#ffffff");

    renderProbe();
    await userEvent.click(screen.getByRole("button", { name: "contraste" }));

    expect(document.getElementById("meta-theme-color")).toHaveAttribute("content", "#ffffff");
  });

  it("mantém a cor anterior quando o token ainda não foi resolvido", () => {
    // Acontece antes de a folha de estilo ser analisada: sobrescrever com
    // vazio deixaria a barra transparente, pior que a cor de partida.
    renderProbe();

    expect(document.getElementById("meta-theme-color")).toHaveAttribute("content", "#0e0e13");
  });
});
