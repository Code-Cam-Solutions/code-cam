import { useEffect, useState } from "react";
import { CloudOff } from "lucide-react";

/**
 * Aviso de que o aparelho está sem rede.
 *
 * Com o service worker ativo, uma tela sem internet continua carregando do
 * cache — e é justamente por isso que o aviso é necessário: sem ele, o
 * estudante veria dados antigos sem saber que são antigos, e concluiria que o
 * app está com defeito quando o material novo não aparecesse.
 *
 * `navigator.onLine` só sabe se existe interface de rede, não se ela chega a
 * algum lugar. Serve para o caso comum (modo avião, Wi-Fi caindo) e é o que
 * existe sem sondar a rede por conta própria.
 */
export function OfflineBanner() {
  const [offline, setOffline] = useState(
    () => typeof navigator !== "undefined" && !navigator.onLine,
  );

  useEffect(() => {
    const goOffline = () => setOffline(true);
    const goOnline = () => setOffline(false);

    window.addEventListener("offline", goOffline);
    window.addEventListener("online", goOnline);

    return () => {
      window.removeEventListener("offline", goOffline);
      window.removeEventListener("online", goOnline);
    };
  }, []);

  if (!offline) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed inset-x-0 top-0 flex items-center justify-center gap-2 bg-warning-subtle px-4 py-2 text-xs font-medium text-warning"
      style={{ zIndex: "var(--ds-z-toast)" }}
    >
      <CloudOff size={15} aria-hidden="true" />
      Sem conexão — você está vendo o conteúdo já baixado.
    </div>
  );
}
