/// <reference types="vite/client" />

/**
 * Tipa as variáveis de ambiente do Vite. Sem isto, `import.meta.env.VITE_*`
 * resolve para `any` e some qualquer garantia de tipo na fronteira de config.
 */
interface ImportMetaEnv {
  readonly VITE_API_URL: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
