import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, Camera, ImagePlus, Lightbulb, Trash2, TriangleAlert, X } from "lucide-react";
import { useRouteState } from "@/shared/lib/navigation";
import type { CapturedPhoto } from "@/features/capture/hooks/useCamera";
import { MAX_PHOTOS_PER_SCAN } from "@/features/capture/lib/limits";
import { Badge, Button, Card, cn } from "@/design-system";
import { Navbar } from "@/shared/components/Navbar";
import { BottomNav } from "@/shared/components/BottomNav";

/**
 * Conferência das fotos antes de gastar a análise.
 *
 * Passo próprio, e não um estado da câmera, por dois motivos: aqui a imagem é o
 * conteúdo (cabe inteira, sem recorte, ao contrário do visor) e este é o único
 * ponto do fluxo em que dá para avisar sobre uma foto tremida antes de o
 * usuário esperar a IA processar algo ilegível.
 *
 * Aceita mais de uma foto porque um material nem sempre cabe em uma: lousa
 * larga, página dupla, caderno com continuação. Todas descrevem o mesmo
 * conteúdo e viram um resumo só.
 */
export function ReviewCapturePage() {
  const navigate = useNavigate();
  const { photos: received } = useRouteState<"/camera/review">();
  const [photos, setPhotos] = useState<CapturedPhoto[]>(received ?? []);

  // Entrada direta pela URL, ou recarregamento: os blobs vivem só em memória, e
  // sem eles não há o que revisar.
  useEffect(() => {
    if (photos.length === 0) void navigate("/camera", { replace: true });
  }, [photos.length, navigate]);

  if (photos.length === 0) return null;

  const blurry = photos.filter((photo) => photo.blurry).length;
  const canAddMore = photos.length < MAX_PHOTOS_PER_SCAN;

  function handleConfirm() {
    // A escolha do formato vem depois da foto, e não antes: só olhando a
    // imagem o estudante sabe se ali cabe um resumo, uma lista de tópicos ou
    // cartões de pergunta e resposta.
    void navigate("/camera/formats", { state: { photos } });
  }

  /** Volta à câmera levando o que já foi capturado, para somar mais uma. */
  function handleAddMore() {
    void navigate("/camera", { state: { photos } });
  }

  function handleDiscardAll() {
    photos.forEach((photo) => URL.revokeObjectURL(photo.url));
    void navigate("/camera", { replace: true });
  }

  function handleRemove(index: number) {
    const removed = photos[index];
    if (removed) URL.revokeObjectURL(removed.url);
    setPhotos((current) => current.filter((_, i) => i !== index));
  }

  return (
    <div className="flex min-h-dvh flex-col bg-bg">
      <Navbar title="Revisar" showBack backTo="/camera" />

      <main
        id="main-content"
        className="mx-auto w-full max-w-2xl flex-1 px-4 pt-4 pb-[calc(8rem+env(safe-area-inset-bottom))]"
      >
        <h1 className="sr-only">Revisar as fotos antes da análise</h1>

        {photos.length > 1 && (
          <p className="mb-3 flex items-center gap-2 text-sm text-text-muted">
            <Badge tone="accent">{photos.length} fotos</Badge>
            {/* Dizer isso evita a dúvida mais provável de quem fotografou em
                partes: "vai sair um resumo por foto?". */}
            Viram um material só
          </p>
        )}

        <ul className="flex flex-col gap-3">
          {photos.map((photo, index) => (
            <li key={photo.url} className="relative animate-scale-in">
              {/* `object-contain` sobre fundo preto: a foto aparece inteira,
                  como será enviada. Cortar aqui esconderia justamente a borda
                  que o usuário precisa conferir. */}
              <div className="overflow-hidden rounded-2xl border border-border bg-black">
                <img
                  src={photo.url}
                  alt={
                    photos.length > 1
                      ? `Foto ${index + 1} de ${photos.length}, aguardando confirmação`
                      : "Foto capturada, aguardando confirmação para análise"
                  }
                  className={cn(
                    "w-full object-contain",
                    photos.length > 1 ? "max-h-[34dvh]" : "max-h-[52dvh]",
                  )}
                />
              </div>

              {photos.length > 1 && (
                <>
                  <span
                    className="absolute top-3 left-3 rounded-full bg-black/60 px-2.5 py-1 text-xs font-semibold text-white backdrop-blur-sm"
                    aria-hidden="true"
                  >
                    {index + 1}
                  </span>

                  {/* Sempre visível: em celular não existe hover, e um botão
                      que some é um botão que não existe. */}
                  <button
                    type="button"
                    onClick={() => handleRemove(index)}
                    aria-label={`Remover a foto ${index + 1}`}
                    className={cn(
                      "absolute top-2 right-2 grid size-10 place-items-center rounded-full",
                      "border border-white/15 bg-black/55 text-white backdrop-blur-md",
                      "transition-transform duration-150 ease-enter active:scale-90",
                    )}
                  >
                    <X size={18} aria-hidden="true" />
                  </button>
                </>
              )}

              {photo.blurry && (
                <div className="mt-2" role="alert">
                  <Card padding="sm" className="border-warning/40 bg-warning-subtle">
                    <p className="flex items-start gap-2 text-sm font-semibold text-warning">
                      <TriangleAlert size={17} className="mt-0.5 shrink-0" aria-hidden="true" />
                      {photos.length > 1
                        ? `A foto ${index + 1} parece tremida.`
                        : "Imagem possivelmente tremida — o resultado pode sair impreciso."}
                    </p>
                  </Card>
                </div>
              )}
            </li>
          ))}
        </ul>

        {blurry > 0 ? (
          <p className="mt-3 flex items-start gap-2 text-sm text-text-muted">
            <Lightbulb size={16} className="mt-0.5 shrink-0" aria-hidden="true" />
            Apoie os cotovelos, segure o celular com as duas mãos e toque na tela para focar antes
            de capturar.
          </p>
        ) : (
          <p className="mt-4 text-center text-sm text-text-muted">
            O texto está legível? Se estiver, envie para a análise.
          </p>
        )}

        {canAddMore && (
          <Button
            variant="secondary"
            size="md"
            onClick={handleAddMore}
            icon={<ImagePlus size={18} />}
            fullWidth
            className="mt-4"
          >
            {photos.length === 1 ? "Adicionar outra foto" : "Adicionar mais uma foto"}
          </Button>
        )}
      </main>

      {/* As ações ficam fixas acima da navegação: em foto alta a página rola, e
          um botão de confirmação que sai da tela vira um beco sem saída. */}
      <div
        className={cn(
          "fixed inset-x-0 bottom-[calc(3.5rem+env(safe-area-inset-bottom))]",
          // Sem borda própria: esta barra encosta na navegação inferior, que
          // já tem a sua. As duas juntas desenhavam duas linhas paralelas.
          "bg-bg/90 px-4 py-3 backdrop-blur-md",
        )}
        style={{ zIndex: "var(--ds-z-sticky)" }}
      >
        <div className="mx-auto flex w-full max-w-2xl flex-col gap-2">
          {blurry === photos.length ? (
            <>
              <Button
                variant="primary"
                size="lg"
                onClick={handleDiscardAll}
                icon={<Camera size={19} />}
                fullWidth
              >
                Recapturar
              </Button>
              <Button variant="ghost" size="md" onClick={handleConfirm} fullWidth>
                Usar mesmo assim
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
                onClick={handleDiscardAll}
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
