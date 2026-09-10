/**
 * Contrato do fornecedor de visão.
 *
 * A análise da foto é a única parte do CodeCam que depende de um serviço
 * externo, e a que mais mudou de dono: o modelo fixo do Gemini foi aposentado
 * sem aviso e derrubou toda captura. Um contrato explícito é o que torna a
 * troca de fornecedor uma decisão de configuração em vez de uma refatoração.
 *
 * O módulo de scan conhece esta interface e nada mais. Ele não sabe se do outro
 * lado está o Google, a NVIDIA ou um mock de teste — e é por isso que trocar
 * não toca em regra de produto nenhuma.
 */

/** Imagem pronta para envio ao modelo. */
export interface ImagePart {
  base64: string;
  mimeType: string;
}

export interface VisionProvider {
  /** `false` quando falta chave; o scan então devolve conteúdo de demonstração. */
  readonly isConfigured: boolean;

  /** Nome do fornecedor, para log e diagnóstico. */
  readonly providerName: string;

  /**
   * Devolve o texto cru do modelo. Interpretá-lo é responsabilidade de quem
   * chama — a resposta é texto gerado, não contrato.
   */
  describeImage(prompt: string, image: ImagePart): Promise<string>;
}

/**
 * Token de injeção.
 *
 * Uma interface do TypeScript não existe em runtime, então o Nest não consegue
 * usá-la como chave de injeção. O símbolo é o que permite `@Inject(VISION_PROVIDER)`
 * resolver para a implementação escolhida no boot.
 */
export const VISION_PROVIDER = Symbol('VISION_PROVIDER');
