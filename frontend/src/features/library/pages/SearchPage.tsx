import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { FileText, Layers, Search, SearchX, X } from "lucide-react";
import { searchContents, type SearchHit } from "@/api";
import { Card, EmptyState, Input, Skeleton } from "@/design-system";
import { Navbar } from "@/shared/components/Navbar";
import { BottomNav } from "@/shared/components/BottomNav";
import { useAsync } from "@/shared/hooks/useAsync";
import { HighlightedExcerpt } from "../components/HighlightedExcerpt";

/**
 * Espera entre a última tecla e a busca.
 *
 * 250 ms é curto o bastante para a lista parecer acompanhar a digitação e longo
 * o bastante para uma palavra de oito letras custar uma consulta, não oito.
 */
const DEBOUNCE_MS = 250;

/** Abaixo disto a busca por prefixo casaria com quase tudo. */
const MIN_QUERY_LENGTH = 2;

export function SearchPage() {
  const [term, setTerm] = useState("");
  const [debounced, setDebounced] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const id = window.setTimeout(() => setDebounced(term.trim()), DEBOUNCE_MS);
    return () => window.clearTimeout(id);
  }, [term]);

  const ready = debounced.length >= MIN_QUERY_LENGTH;

  const { data, status, error } = useAsync<SearchHit[]>(
    useCallback(
      () => (ready ? searchContents(debounced) : Promise.resolve([])),
      [ready, debounced],
    ),
    [debounced, ready],
  );

  const results = data ?? [];

  return (
    <div className="flex min-h-dvh flex-col bg-bg">
      <Navbar title="Buscar" showBack backTo="/" />

      <main id="main-content" className="mx-auto w-full max-w-2xl flex-1 px-4 pt-4 pb-28">
        <div className="relative">
          <Input
            ref={inputRef}
            label="Buscar nos seus materiais"
            hideLabel
            type="search"
            icon={<Search size={18} />}
            value={term}
            onChange={(event) => setTerm(event.target.value)}
            placeholder="Fotossíntese, Bhaskara, Revolução…"
            autoFocus
            // Espaço à direita para o botão de limpar, que flutua sobre o campo.
            className="pr-11"
          />
          {term !== "" && (
            <button
              type="button"
              onClick={() => {
                setTerm("");
                inputRef.current?.focus();
              }}
              aria-label="Limpar busca"
              className="absolute right-2 bottom-[0.375rem] grid size-9 place-items-center rounded-full text-text-subtle transition-colors duration-150 hover:bg-surface-sunken hover:text-text"
            >
              <X size={17} aria-hidden="true" />
            </button>
          )}
        </div>

        {/* A contagem é anunciada, e não só exibida: sem isso, quem usa leitor
            de tela digita e não recebe retorno nenhum da busca. */}
        <p className="sr-only" role="status" aria-live="polite">
          {!ready
            ? ""
            : status === "loading"
              ? "Buscando…"
              : `${results.length} ${results.length === 1 ? "resultado encontrado" : "resultados encontrados"}`}
        </p>

        <div className="mt-5">
          {!ready && (
            <EmptyState
              icon={<Search size={26} />}
              title="Busque em tudo que você já escaneou"
              description="A busca procura no título, no resumo e no texto extraído das fotos. Acentos e plurais não atrapalham."
            />
          )}

          {ready && status === "loading" && (
            <div className="flex flex-col gap-3">
              <Skeleton className="h-24 rounded-xl" />
              <Skeleton className="h-24 rounded-xl" />
              <Skeleton className="h-24 rounded-xl" />
            </div>
          )}

          {ready && status === "error" && (
            <EmptyState
              icon={<SearchX size={26} />}
              title="A busca falhou"
              description={error ?? undefined}
            />
          )}

          {ready && status === "success" && results.length === 0 && (
            <EmptyState
              icon={<SearchX size={26} />}
              title={`Nada encontrado para "${debounced}"`}
              description="Tente outra palavra do conteúdo, ou parte dela — a busca completa o resto."
            />
          )}

          {results.length > 0 && (
            <ul className="flex flex-col gap-3">
              {results.map((hit, index) => (
                <li
                  key={hit.id}
                  className="opacity-0 animate-rise-in"
                  style={{ animationDelay: `${Math.min(index, 6) * 40}ms` }}
                >
                  <Link to={`/content/${hit.id}`} className="group block rounded-xl">
                    <Card interactive padding="md">
                      <div className="flex items-start gap-3">
                        <span
                          className="mt-0.5 grid size-9 shrink-0 place-items-center rounded-lg bg-surface-sunken text-text-muted"
                          aria-hidden="true"
                        >
                          <FileText size={18} />
                        </span>

                        <div className="min-w-0 flex-1">
                          <h2 className="truncate text-base font-semibold text-text">
                            {hit.title}
                          </h2>

                          <HighlightedExcerpt excerpt={hit.excerpt} className="mt-1 line-clamp-2" />

                          <div className="mt-2 flex flex-wrap items-center gap-2">
                            {hit.folderName !== null && (
                              <span className="inline-flex items-center gap-1.5 rounded-full bg-surface-sunken px-2 py-0.5 text-2xs font-medium text-text-muted">
                                {/* A cor da pasta vem do banco, então mora no
                                    style — não há classe de Tailwind para um
                                    valor arbitrário definido pelo usuário. */}
                                <span
                                  className="size-2 rounded-full"
                                  style={{ backgroundColor: hit.folderColor ?? undefined }}
                                  aria-hidden="true"
                                />
                                {hit.folderName}
                              </span>
                            )}

                            {hit.flashcardCount > 0 && (
                              <span className="inline-flex items-center gap-1 text-2xs text-text-subtle">
                                <Layers size={12} aria-hidden="true" />
                                {hit.flashcardCount}{" "}
                                {hit.flashcardCount === 1 ? "cartão" : "cartões"}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </Card>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </main>

      <BottomNav />
    </div>
  );
}
