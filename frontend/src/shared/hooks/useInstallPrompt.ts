import { useCallback, useEffect, useState } from "react";

/**
 * Evento não padronizado que o Chrome dispara quando o app é instalável.
 * Não existe no `lib.dom`, então o formato é declarado aqui.
 */
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

/**
 * Instalação do app na tela de início.
 *
 * O navegador decide quando o app pode ser instalado e avisa uma única vez,
 * por um evento que precisa ser capturado no instante em que dispara — depois
 * disso ele não volta. Guardá-lo aqui é o que permite oferecer a instalação em
 * um botão nosso, num momento que faça sentido, em vez de depender do banner
 * do navegador.
 *
 * No iOS o evento não existe: lá a instalação é manual, pelo menu Compartilhar.
 * `canInstall` fica falso e a interface explica o caminho em vez de mostrar um
 * botão que não faria nada.
 */
export function useInstallPrompt() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    function capture(event: Event) {
      // Sem o `preventDefault` o navegador mostra o próprio convite, e ficariam
      // dois pedidos de instalação na tela ao mesmo tempo.
      event.preventDefault();
      setDeferred(event as BeforeInstallPromptEvent);
    }

    function markInstalled() {
      setInstalled(true);
      setDeferred(null);
    }

    window.addEventListener("beforeinstallprompt", capture);
    window.addEventListener("appinstalled", markInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", capture);
      window.removeEventListener("appinstalled", markInstalled);
    };
  }, []);

  const promptInstall = useCallback(async () => {
    if (!deferred) return false;

    await deferred.prompt();
    const { outcome } = await deferred.userChoice;

    // O evento é de uso único: depois de exibido, não pode ser reaproveitado.
    setDeferred(null);
    return outcome === "accepted";
  }, [deferred]);

  /** `true` quando o app já está rodando fora do navegador. */
  const isStandalone =
    typeof window !== "undefined" &&
    (window.matchMedia("(display-mode: standalone)").matches ||
      // O Safari do iOS não implementa `display-mode` e expõe esta propriedade.
      (navigator as Navigator & { standalone?: boolean }).standalone === true);

  return {
    canInstall: deferred !== null,
    installed: installed || isStandalone,
    promptInstall,
  };
}
