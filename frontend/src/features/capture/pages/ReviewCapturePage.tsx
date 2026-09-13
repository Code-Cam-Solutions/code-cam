import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, Camera, Lightbulb, Trash2, TriangleAlert } from "lucide-react";
import { useRouteState } from "@/shared/lib/navigation";
import { Button, Card, cn } from "@/design-system";
import { Navbar } from "@/shared/components/Navbar";
import { BottomNav } from "@/shared/components/BottomNav";

/**
 * Conferência da foto antes de gastar a análise.
 *
 * Passo próprio, e não um estado da câmera, por dois motivos: aqui a imagem é o
 * conteúdo (cabe inteira, sem recorte, ao contrário do visor) e este é o único
 * ponto do fluxo em que dá para avisar sobre uma foto tremida antes de o
 * usuário esperar a IA processar algo ilegível.
 */
export function ReviewCapturePage() {
  const navigate = useNavigate();
  const { photo } = useRouteState<"/camera/review">();

  // Entrada direta pela URL, ou recarregamento: o blob vive só em memória, e
  // sem ele não há o que revisar.
  useEffect(() => {
    if (!photo) void navigate("/camera", { replace: true });
  }, [photo, navigate]);

  if (!photo) return null;

  function handleConfirm() {
    if (!photo) return;
    // A escolha do formato vem depois da foto, e não antes: só olhando a
    // imagem o estudante sabe se ali cabe um resumo, uma lista de tópicos ou
    // cartões de pergunta e resposta.
    void navigate("/camera/formats", { state: { photo } });
  }

  function handleRetake() {
    void navigate("/camera", { replace: true });
  }

  return (
    <div className="flex min-h-dvh flex-col bg-bg">
      <Navbar title="Revisar imagem" showBack backTo="/camera" />

      <main
        id="main-content"
        className="mx-auto w-full max-w-2xl flex-1 px-4 pt-4 pb-[calc(7rem+env(safe-area-inset-bottom))]"
      >
        {/* A foto é o conteúdo desta tela e ocupa o topo. O título existe para
            quem não a vê: anuncia onde a pessoa está sem roubar o espaço que a
            imagem precisa para ser conferida. */}
        <h1 className="sr-only">Revisar imagem</h1>

        {/* `object-contain` sobre fundo preto: a foto aparece inteira, como
            será enviada. Cortar aqui esconderia justamente a borda que o
            usuário precisa conferir. */}
        <div className="animate-scale-in overflow-hidden rounded-2xl border border-border bg-black">
          <img
            src={photo.url}
            alt="Foto capturada, aguardando confirmação para análise"
            className="max-h-[52dvh] w-full object-contain"
          />
        </div>

        {photo.blurry ? (
          <div className="mt-4 animate-rise-in" role="alert">
            <Card
              padding="md"
              className="border-warning/40 bg-warning-subtle"
              // O aviso é uma sugestão, não um bloqueio: o usuário continua
              // livre para enviar. Só quem tirou a foto sabe se ela serve.
            >
              <p className="flex items-start gap-2 text-sm font-semibold text-warning">
                <TriangleAlert size={18} className="mt-0.5 shrink-0" aria-hidden="true" />
                Imagem possivelmente tremida — o resultado pode sair impreciso.
              </p>
              <p className="mt-2 flex items-start gap-2 text-sm text-text-muted">
                <Lightbulb size={16} className="mt-0.5 shrink-0" aria-hidden="true" />
                Apoie os cotovelos, segure o celular com as duas mãos e toque na tela para focar
                antes de capturar.
              </p>
            </Card>
          </div>
        ) : (
          <p className="mt-4 text-center text-sm text-text-muted">
            O texto está legível? Se estiver, envie para a análise.
          </p>
        )}
      </main>

      {/* As ações ficam fixas acima da navegação: em foto alta a página rola, e
          um botão de confirmação que sai da tela vira um beco sem saída. */}
      <div
        className={cn(
          "fixed inset-x-0 bottom-[calc(3.5rem+env(safe-area-inset-bottom))]",
          // Sem borda própria: esta barra encosta na navegação inferior, que
          // já tem a sua. As duas juntas desenhavam duas linhas paralelas a
          // poucos pixels uma da outra. O desfoque sozinho separa o conteúdo
          // que rola por baixo.
          "bg-bg/90 px-4 py-3 backdrop-blur-md",
        )}
        style={{ zIndex: "var(--ds-z-sticky)" }}
      >
        <div className="mx-auto flex w-full max-w-2xl flex-col gap-2">
          {photo.blurry ? (
            <>
              <Button
                variant="primary"
                size="lg"
                onClick={handleRetake}
                icon={<Camera size={19} />}
                fullWidth
              >
                Recapturar imagem
              </Button>
              <Button variant="ghost" size="md" onClick={handleConfirm} fullWidth>
                Usar esta foto mesmo assim
              </Button>
            </>
          ) : (
            <>
              <Button
                variant="primary"
                size="lg"
                onClick={handleConfirm}
                iconAfter={<ArrowRight size={19} />}
                fullWidth
              >
                Confirmar e processar
              </Button>
              <Button
                variant="ghost"
                size="md"
                onClick={handleRetake}
                icon={<Trash2 size={17} />}
                fullWidth
              >
                Descartar
              </Button>
            </>
          )}
        </div>
      </div>

      <BottomNav />
    </div>
  );
}
