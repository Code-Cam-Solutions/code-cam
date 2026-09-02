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

/**
 * `torch` (a lanterna) é uma extensão da Image Capture API que só o Chrome no
 * Android implementa, e por isso não existe no `lib.dom`. Declarar o campo aqui
 * mantém a checagem de tipo viva no hook da câmera — a alternativa seria um
 * `as unknown as MediaTrackConstraints` que desligaria a verificação do objeto
 * inteiro, e não só do campo desconhecido.
 */
interface MediaTrackCapabilities {
  torch?: boolean;
}

interface MediaTrackConstraintSet {
  torch?: ConstrainBoolean;
}
