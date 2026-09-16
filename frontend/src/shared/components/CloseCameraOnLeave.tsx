import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { encerrarCamera } from "@/features/capture/lib/camera-stream";

/** Telas que compõem a captura. Dentro delas o stream é reaproveitado. */
const FLUXO_DE_CAPTURA = "/camera";

/**
 * Encerra a câmera ao sair do fluxo de captura.
 *
 * O stream sobrevive às trocas de tela dentro de `/camera` de propósito: é o
 * que evita um pedido de permissão por foto no iPhone, e está explicado em
 * `camera-stream.ts`. Mas sobreviver indefinidamente seria pior que o
 * problema original — enquanto o stream existe, o indicador de câmera do
 * aparelho fica aceso, e ninguém espera isso ao voltar para a tela inicial.
 *
 * O módulo já tem um tempo de carência como rede de segurança. Este componente
 * é o caso comum: sair da captura encerra na hora, sem esperar o relógio.
 *
 * Fica no nível do app, como o `StopSpeechOnNavigate`, porque o gatilho é a
 * navegação — e assim vale para qualquer tela que venha depois.
 */
export function CloseCameraOnLeave() {
  const { pathname } = useLocation();

  useEffect(() => {
    if (!pathname.startsWith(FLUXO_DE_CAPTURA)) encerrarCamera();
  }, [pathname]);

  return null;
}
