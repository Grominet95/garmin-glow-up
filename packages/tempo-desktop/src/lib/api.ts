const BASE_URL = "http://127.0.0.1:8765";
let _token = "";

export const setToken = (t: string) => {
  _token = t;
};

export class ApiError extends Error {
  constructor(
    public code: string,
    message: string,
    public retryAfterS?: number
  ) {
    super(message);
    this.name = "ApiError";
  }
}

async function parseError(res: Response): Promise<ApiError> {
  try {
    const body = await res.json();
    return new ApiError(body.code ?? "unknown", body.message ?? res.statusText, body.retryAfterS);
  } catch {
    return new ApiError("unknown", res.statusText);
  }
}

export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  let lastErr: unknown;
  const delays = [0, 250, 1000];
  for (const delay of delays) {
    if (delay > 0) await new Promise((r) => setTimeout(r, delay));
    try {
      const res = await fetch(`${BASE_URL}${path}`, {
        ...init,
        headers: {
          ...(init?.headers ?? {}),
          "X-Tempo-Token": _token,
        },
      });
      if (!res.ok) throw await parseError(res);
      return res.json() as Promise<T>;
    } catch (e) {
      if (e instanceof ApiError && e.code !== "db_locked") throw e;
      lastErr = e;
    }
  }
  throw lastErr;
}

export function sse(path: string, onMessage: (event: string, data: unknown) => void): () => void {
  const sep = path.includes("?") ? "&" : "?";
  const url = `${BASE_URL}${path}${sep}token=${encodeURIComponent(_token)}`;
  let es: EventSource | null = null;

  function connect() {
    es = new EventSource(url);
    es.onmessage = (e) => onMessage("message", JSON.parse(e.data));
    for (const evt of ["status", "error", "mfa_required"]) {
      es.addEventListener(evt, (e) => onMessage(evt, JSON.parse((e as MessageEvent).data)));
    }
    es.onerror = () => {
      es?.close();
      setTimeout(connect, 5000);
    };
  }
  connect();
  return () => es?.close();
}
