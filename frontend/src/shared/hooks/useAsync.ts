import { useCallback, useEffect, useRef, useState } from "react";
import { ApiError } from "@/api";

export type AsyncStatus = "loading" | "success" | "error";

export interface AsyncState<T> {
  data: T | null;
  status: AsyncStatus;
  error: string | null;
  /** Refaz a chamada. Mantém o dado anterior na tela enquanto recarrega. */
  reload: () => void;
  /** Substitui o dado local sem ir à rede — para atualização otimista. */
  setData: (updater: (current: T | null) => T | null) => void;
}

/**
 * Carrega dado da API para dentro de um componente.
 *
 * Existe porque o trio `data`/`loading`/`error` se repetia em toda tela, e com
 * ele se repetiam os mesmos dois defeitos: gravar estado depois que o
 * componente já saiu da tela, e uma resposta lenta chegando depois de uma
 * rápida e sobrescrevendo o dado mais novo. As duas coisas são resolvidas aqui,
 * uma vez.
 */
export function useAsync<T>(fetcher: () => Promise<T>, deps: unknown[] = []): AsyncState<T> {
  const [data, setDataState] = useState<T | null>(null);
  const [status, setStatus] = useState<AsyncStatus>("loading");
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  // Identifica a chamada mais recente. Uma resposta que chega fora de ordem —
  // porque a rede entregou a anterior depois — é descartada em vez de
  // sobrescrever um dado mais novo.
  const latest = useRef(0);
  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;

  useEffect(() => {
    const generation = ++latest.current;
    let active = true;

    setStatus("loading");
    setError(null);

    fetcherRef
      .current()
      .then((result) => {
        if (!active || generation !== latest.current) return;
        setDataState(result);
        setStatus("success");
      })
      .catch((err: unknown) => {
        if (!active || generation !== latest.current) return;
        setError(
          err instanceof ApiError ? err.message : "Não foi possível carregar. Tente novamente.",
        );
        setStatus("error");
      });

    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attempt, ...deps]);

  const reload = useCallback(() => setAttempt((value) => value + 1), []);

  const setData = useCallback((updater: (current: T | null) => T | null) => {
    setDataState(updater);
  }, []);

  return { data, status, error, reload, setData };
}
