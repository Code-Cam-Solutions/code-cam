/**
 * Dono do stream da câmera, vivo entre montagens do `CameraPage`.
 *
 * Existe por causa de um incômodo concreto: no fluxo de várias fotos o
 * caminho é `/camera` → `/camera/review` → `/camera`, e cada volta remontava
 * o componente. A versão anterior parava todas as trilhas ao desmontar e
 * chamava `getUserMedia` de novo ao montar.
 *
 * No Safari do iPhone isso custa um prompt de permissão por foto. Parar a
 * última trilha encerra a sessão de captura, e o pedido seguinte volta a
 * perguntar — o "permitir" anterior valia para aquela sessão, não para o site.
 * Quem tira três fotos autoriza a câmera três vezes.
 *
 * Então o stream passa a viver aqui, fora do ciclo de vida do React, e é
 * reaproveitado enquanto continuar servindo. Ele é encerrado quando:
 *
 * - o usuário sai do fluxo de captura (quem decide isso é `useCameraShutdown`);
 * - a aba vai para segundo plano, para não deixar a câmera ligada às costas
 *   de ninguém;
 * - passa o tempo de carência sem ninguém pedi-lo de volta.
 *
 * A carência cobre a ida e volta entre as telas de captura. É curta de
 * propósito: enquanto o stream vive, o indicador de câmera do aparelho fica
 * aceso, e isso precisa ser medido em segundos, não em minutos.
 */

export type FacingMode = "environment" | "user";

const CARENCIA_MS = 30_000;

let atual: { stream: MediaStream; facingMode: FacingMode } | null = null;
let encerramentoAgendado: ReturnType<typeof setTimeout> | null = null;
let ouvintesLigados = false;

function temTrilhaViva(stream: MediaStream): boolean {
  return stream.getVideoTracks().some((trilha) => trilha.readyState === "live");
}

function cancelarEncerramento(): void {
  if (encerramentoAgendado === null) return;
  clearTimeout(encerramentoAgendado);
  encerramentoAgendado = null;
}

/** Encerra o stream agora. Seguro de chamar quando não há nenhum aberto. */
export function encerrarCamera(): void {
  cancelarEncerramento();
  atual?.stream.getTracks().forEach((trilha) => trilha.stop());
  atual = null;
}

/**
 * Sem isto, sair do navegador com a câmera em carência deixaria o indicador
 * aceso no aparelho. `pagehide` cobre o fechamento da aba, que em iOS nem
 * sempre dispara `visibilitychange`.
 */
function ligarOuvintesDeSaida(): void {
  if (ouvintesLigados || typeof document === "undefined") return;
  ouvintesLigados = true;

  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") encerrarCamera();
  });
  window.addEventListener("pagehide", encerrarCamera);
}

/**
 * Devolve um stream pronto para uso, reaproveitando o que já estiver aberto.
 *
 * Um stream só serve se ainda tiver trilha viva e for da câmera pedida: trocar
 * entre traseira e frontal exige abrir outro, e aí o anterior é encerrado antes
 * — dois streams simultâneos prendem a câmera em vários aparelhos.
 */
export async function obterCamera(facingMode: FacingMode): Promise<MediaStream> {
  cancelarEncerramento();
  ligarOuvintesDeSaida();

  if (atual && atual.facingMode === facingMode && temTrilhaViva(atual.stream)) {
    return atual.stream;
  }

  encerrarCamera();

  // `ideal` e não `exact`: em notebook não existe câmera traseira, e `exact`
  // faria a chamada falhar em vez de cair na câmera disponível.
  const stream = await navigator.mediaDevices.getUserMedia({
    video: {
      facingMode: { ideal: facingMode },
      width: { ideal: 1920 },
      height: { ideal: 1080 },
    },
    audio: false,
  });

  atual = { stream, facingMode };
  return stream;
}

/**
 * Anuncia que ninguém está usando o stream no momento, sem encerrá-lo.
 *
 * É o que o `CameraPage` chama ao desmontar. Se a próxima tela pedir a câmera
 * dentro da carência — que é o caso de voltar de "revisar" para tirar outra
 * foto — o mesmo stream é devolvido e nenhuma permissão é pedida de novo.
 */
export function liberarCamera(): void {
  if (!atual) return;
  cancelarEncerramento();
  encerramentoAgendado = setTimeout(encerrarCamera, CARENCIA_MS);
}

/** Exposto para os testes: o estado é de módulo e não se desfaz sozinho. */
export function __reiniciarParaTeste(): void {
  encerrarCamera();
  ouvintesLigados = false;
}
