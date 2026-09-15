/**
 * Cliente HTTP do CodeCam.
 *
 * Uma única porta de saída para a rede. Tudo o que é verdade para toda
 * requisição — a base da URL, a credencial, como um erro do backend vira uma
 * mensagem em português — mora aqui, e não espalhado por cada chamada.
 */

/**
 * Onde a API está.
 *
 * `VITE_API_URL` manda quando existe — é assim que o build da Vercel aponta
 * para o backend publicado. Sem ela, o endereço é deduzido de onde a própria
 * página está sendo servida, e não fixado em `localhost`.
 *
 * A diferença importa porque o CodeCam é aberto por QR Code, no celular:
 * a página vem de `http://192.168.0.7:5173` e, com `localhost` no código, o
 * celular tentaria falar com ele mesmo. O login falhava com "verifique sua
 * conexão" em todo aparelho que não fosse a máquina de desenvolvimento.
 */
function resolveBaseUrl(): string {
  const configured = import.meta.env.VITE_API_URL;
  if (configured) return configured.replace(/\/$/, "");

  /*
   * Sem variável, a API é a própria origem sob `/api`, que o servidor de
   * desenvolvimento encaminha para o backend.
   *
   * Antes daqui saía `http://<host>:3000`, deduzido da página. Funcionava
   * enquanto o app era servido em http — mas a câmera exige https, e de uma
   * página https uma chamada para http é bloqueada como conteúdo misto. Manter
   * tudo na mesma origem resolve os dois, e ainda tira o CORS do caminho.
   */
  return "/api";
}

const BASE_URL = resolveBaseUrl();

export const AUTH_STORAGE_KEY = "codecam-auth";

/** Erro de uma chamada à API, com o status para quem precisar diferenciar. */
export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "ApiError";
  }

  /** Sessão expirada ou inválida: o app precisa mandar de volta para a entrada. */
  get isUnauthorized(): boolean {
    return this.status === 401;
  }
}

function authHeaders(): Record<string, string> {
  try {
    const stored = localStorage.getItem(AUTH_STORAGE_KEY);
    if (!stored) return {};
    const { token } = JSON.parse(stored) as { token?: string };
    return token ? { Authorization: `Bearer ${token}` } : {};
  } catch {
    // Sessão corrompida no storage: seguir sem credencial e deixar o backend
    // responder 401, que é o caminho que o app já sabe tratar.
    return {};
  }
}

/**
 * Extrai a mensagem do backend.
 *
 * O Nest devolve `message` como texto ou como lista, quando são vários erros de
 * validação. Corpo vazio ou não-JSON cai no texto genérico por status.
 */
async function toApiError(response: Response): Promise<ApiError> {
  const fallback =
    response.status >= 500
      ? "O servidor não respondeu como esperado. Tente novamente em instantes."
      : `Não foi possível concluir a operação (erro ${response.status}).`;

  try {
    const body = (await response.json()) as { message?: string | string[] };
    const message = Array.isArray(body.message) ? body.message.join(". ") : body.message;
    return new ApiError(message || fallback, response.status);
  } catch {
    return new ApiError(fallback, response.status);
  }
}

interface RequestOptions extends Omit<RequestInit, "body"> {
  /** Serializado como JSON. Para envio de arquivo, use `formData`. */
  json?: unknown;
  formData?: FormData;
  /** Pares que viram query string; `undefined` e `""` são omitidos. */
  query?: Record<string, string | number | undefined>;
}

function buildUrl(path: string, query?: RequestOptions["query"]): string {
  if (!query) return `${BASE_URL}${path}`;

  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value === undefined || value === "") continue;
    params.set(key, String(value));
  }

  const search = params.toString();
  return search ? `${BASE_URL}${path}?${search}` : `${BASE_URL}${path}`;
}

export async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { json, formData, query, headers, ...rest } = options;

  // `Content-Type` é deliberadamente omitido no envio de FormData: o navegador
  // precisa gerá-lo com o `boundary` do multipart, e defini-lo à mão quebra o
  // upload de um jeito difícil de diagnosticar.
  const response = await fetch(buildUrl(path, query), {
    ...rest,
    headers: {
      ...authHeaders(),
      ...(json !== undefined ? { "Content-Type": "application/json" } : {}),
      ...(headers as Record<string, string>),
    },
    body: formData ?? (json !== undefined ? JSON.stringify(json) : undefined),
  }).catch(() => {
    // `fetch` só rejeita quando a requisição nem sai: sem rede, servidor fora
    // do ar, CORS. Distinguir isso de um erro HTTP importa, porque a saída para
    // o usuário é outra — aqui não adianta tentar de novo agora.
    throw new ApiError("Sem conexão com o servidor. Verifique sua internet.", 0);
  });

  if (!response.ok) {
    throw await toApiError(response);
  }

  // 204 e afins não têm corpo; chamar `json()` neles estoura.
  if (response.status === 204 || response.headers.get("content-length") === "0") {
    return undefined as T;
  }

  return (await response.json()) as T;
}
