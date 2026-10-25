const REQUEST_TIMEOUT_MS = 9_000;

/**
 * `""` means "relative to this origin": the browser calls the serverless
 * proxy at `/api/*`, which is where the gateway token is injected.
 *
 * Web builds always resolve to `""` even if the env var went missing, so a
 * dropped variable can never fall back to talking to the backend directly.
 * Everything else keeps the historical default (the bundled Tauri sidecar).
 */
const DEFAULT_BASE_URL = import.meta.env.MODE === "web" ? "" : "http://localhost:8080";

export const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL ?? DEFAULT_BASE_URL).replace(/\/+$/, "");

/**
 * Whether this deployment is bearer-token protected.
 *
 * The browser holds no credential either way: when talking through the
 * same-origin proxy the token lives in the server-side environment and is
 * attached to the outbound request there. `VITE_API_TOKEN` is deliberately
 * never read -- any `VITE_*` value is compiled into the public bundle, and the
 * build fails if one is present.
 */
export const HAS_API_TOKEN = API_BASE_URL === "";

type ErrorKind = "unreachable" | "timeout" | "aborted" | "http" | "invalid";

export class ApiError extends Error {
  readonly kind: ErrorKind;
  readonly status?: number;
  readonly detail?: string;

  constructor(kind: ErrorKind, message: string, options?: { status?: number; detail?: string }) {
    super(message);
    this.name = "ApiError";
    this.kind = kind;
    this.status = options?.status;
    this.detail = options?.detail;
  }
}

export function describeError(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.kind === "unreachable") return "The backend is unreachable. Check that APICostGuard is running.";
    if (error.kind === "timeout") return "The backend did not respond in time.";
    if (error.kind === "aborted") return "Request cancelled.";
    if (error.status === 401 || error.status === 403) {
      return "Access denied. The backend requires a valid gateway token.";
    }
    if (error.status === 404) return "This endpoint is not available on the connected backend.";
    if (error.status && error.status >= 500) return `The backend returned HTTP ${error.status}.`;
    return error.message;
  }
  if (error instanceof Error) return error.message;
  return "Unexpected error.";
}

interface RequestOptions {
  method?: "GET" | "POST" | "DELETE";
  body?: unknown;
  signal?: AbortSignal;
}

async function attempt<T>(path: string, options: RequestOptions): Promise<T> {
  const controller = new AbortController();
  const abort = () => controller.abort();
  options.signal?.addEventListener("abort", abort, { once: true });

  const timer = window.setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  const method = options.method ?? "GET";
  // Deliberately no Authorization header. The gateway token is server-side
  // (see api/index.ts); putting it in a request header here would mean putting
  // it in the bundle first.
  const headers: Record<string, string> = {};
  if (options.body !== undefined) headers["Content-Type"] = "application/json";

  try {
    const response = await fetch(`${API_BASE_URL}${path}`, {
      method,
      headers,
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
      signal: controller.signal,
    });

    if (!response.ok) {
      let detail = "";
      try {
        detail = (await response.text()).slice(0, 320);
      } catch {
        detail = "";
      }
      throw new ApiError("http", `Backend returned HTTP ${response.status}`, {
        status: response.status,
        detail: detail || undefined,
      });
    }

    if (response.status === 204) return undefined as T;

    const text = await response.text();
    if (!text) return undefined as T;
    try {
      return JSON.parse(text) as T;
    } catch {
      throw new ApiError("invalid", "The backend returned an unexpected response.");
    }
  } catch (error) {
    if (options.signal?.aborted) {
      throw new ApiError("aborted", "Request cancelled.");
    }
    if (error instanceof ApiError) throw error;
    if (error instanceof DOMException && error.name === "AbortError") {
      throw new ApiError("timeout", `Backend timeout for ${path}`);
    }
    throw new ApiError("unreachable", `Backend unreachable for ${path}`);
  } finally {
    window.clearTimeout(timer);
    options.signal?.removeEventListener("abort", abort);
  }
}

export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  try {
    return await attempt<T>(path, options);
  } catch (error) {
    const shouldRetry =
      options.method === undefined || options.method === "GET"
        ? error instanceof ApiError && error.kind === "unreachable" && !options.signal?.aborted
        : false;

    if (!shouldRetry) throw error;
    await new Promise((resolve) => window.setTimeout(resolve, 350));
    return attempt<T>(path, options);
  }
}

export const apiGet = <T>(path: string, signal?: AbortSignal) =>
  apiRequest<T>(path, { method: "GET", signal });

export const apiPost = <T>(path: string, body?: unknown, signal?: AbortSignal) =>
  apiRequest<T>(path, { method: "POST", body, signal });

export const apiDelete = <T>(path: string, signal?: AbortSignal) =>
  apiRequest<T>(path, { method: "DELETE", signal });

export function isTauriRuntime(): boolean {
  return typeof window !== "undefined" && Boolean(window.__TAURI_INTERNALS__);
}
