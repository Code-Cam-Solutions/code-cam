import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach, vi } from "vitest";

/**
 * Storage em memória compatível com a especificação Web Storage.
 *
 * Por que isto existe: o Node 26 passou a declarar `localStorage` em `globalThis`
 * (Web Storage experimental), mas ele resolve para `undefined` sem a flag
 * `--localstorage-file`. O Vitest só copia uma chave do jsdom para o global do
 * teste quando ela ainda NÃO existe no global do Node — então a implementação
 * funcional do jsdom é descartada e sobra a do Node, inerte.
 *
 * Uma implementação própria também deixa os testes determinísticos: sem estado
 * compartilhado com o processo e sem vazamento entre arquivos de teste.
 */
class MemoryStorage implements Storage {
  #entries = new Map<string, string>();

  get length(): number {
    return this.#entries.size;
  }

  key(index: number): string | null {
    return [...this.#entries.keys()][index] ?? null;
  }

  getItem(key: string): string | null {
    return this.#entries.get(String(key)) ?? null;
  }

  setItem(key: string, value: string): void {
    this.#entries.set(String(key), String(value));
  }

  removeItem(key: string): void {
    this.#entries.delete(String(key));
  }

  clear(): void {
    this.#entries.clear();
  }
}

for (const name of ["localStorage", "sessionStorage"] as const) {
  Object.defineProperty(globalThis, name, {
    value: new MemoryStorage(),
    writable: true,
    configurable: true,
  });
}

afterEach(() => {
  cleanup();
  localStorage.clear();
  sessionStorage.clear();
  vi.restoreAllMocks();
});

/**
 * jsdom não implementa `matchMedia`. O design system consulta essa API para
 * descobrir o tema preferido do sistema e `prefers-reduced-motion`, então o stub
 * precisa existir antes de qualquer componente montar.
 */
Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: (query: string): MediaQueryList => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }),
});

/** Usado por componentes que revelam conteúdo ao entrar na viewport. */
globalThis.IntersectionObserver = class implements IntersectionObserver {
  readonly root = null;
  readonly rootMargin = "";
  readonly thresholds: ReadonlyArray<number> = [];
  observe = vi.fn();
  unobserve = vi.fn();
  disconnect = vi.fn();
  takeRecords = vi.fn(() => []);
};

/** A Web Speech API (leitura em voz alta) não existe no jsdom. */
Object.defineProperty(window, "speechSynthesis", {
  writable: true,
  value: {
    speak: vi.fn(),
    cancel: vi.fn(),
    pause: vi.fn(),
    resume: vi.fn(),
    getVoices: vi.fn(() => []),
    speaking: false,
    paused: false,
    pending: false,
  },
});
