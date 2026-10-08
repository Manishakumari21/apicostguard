import { API_BASE_URL } from "../utils/constants";

const REQUEST_TIMEOUT_MS = 8000;
const UNAVAILABLE_RETRY_MS = 5000;

let backendUnavailableUntil = 0;

export class BackendError extends Error {
  status?: number;
  body?: string;
  constructor(message: string, opts?: { status?: number; body?: string }) {
    super(message);
    this.name = "BackendError";
    this.status = opts?.status;
    this.body = opts?.body;
  }
}

function authHeaders(): Record<string, string> {
  // Optional bearer for company/network deployments.
  // Set VITE_API_TOKEN to match APICOSTGUARD_GATEWAY_TOKEN on the backend.
  const token = import.meta.env.VITE_API_TOKEN as string | undefined;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function request<T>(path: string, init?: RequestInit, retryGet = true): Promise<T> {
  if (Date.now() < backendUnavailableUntil) {
    throw new BackendError(`backend offline: ${path}`);
  }
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  const isGet = !init?.method || init.method === "GET";
  const headers: Record<string, string> = {
    ...authHeaders(),
    ...(init?.headers as Record<string, string> | undefined),
  };
  // Only send JSON content-type when there is a body (avoids CORS preflight on GET/DELETE).
  if (init?.body !== undefined) {
    headers["Content-Type"] = headers["Content-Type"] ?? "application/json";
  }

  const doFetch = async (): Promise<Response> =>
    fetch(`${API_BASE_URL}${path}`, { ...init, signal: controller.signal, headers });

  let resp: Response;
  try {
    resp = await doFetch();
  } catch (err) {
    // One lightweight retry for idempotent GETs (scalable on flaky LAN).
    if (retryGet && isGet) {
      await new Promise((r) => setTimeout(r, 400));
      try {
        resp = await doFetch();
      } catch {
        backendUnavailableUntil = Date.now() + UNAVAILABLE_RETRY_MS;
        throw new BackendError(`backend unreachable: ${path}`);
      }
    } else {
      backendUnavailableUntil = Date.now() + UNAVAILABLE_RETRY_MS;
      throw new BackendError(
        err instanceof Error && err.name === "AbortError"
          ? `backend timeout: ${path}`
          : `backend unreachable: ${path}`,
      );
    }
  } finally {
    clearTimeout(timer);
  }
  if (!resp.ok) {
    let excerpt = "";
    try {
      excerpt = (await resp.text()).slice(0, 500);
    } catch {
      excerpt = "";
    }
    // 5xx trips the circuit-breaker briefly; 4xx does not.
    if (resp.status >= 500) {
      backendUnavailableUntil = Date.now() + UNAVAILABLE_RETRY_MS;
    }
    throw new BackendError(`backend ${resp.status} for ${path}`, {
      status: resp.status,
      body: excerpt,
    });
  }
  if (resp.status === 204) {
    return undefined as T;
  }
  return (await resp.json()) as T;
}

export const backendGet = <T>(path: string): Promise<T> => request<T>(path);

export const backendPost = <T>(path: string, body?: unknown): Promise<T> =>
  request<T>(
    path,
    {
      method: "POST",
      body: body === undefined ? undefined : JSON.stringify(body),
    },
    false,
  );

export const backendDelete = <T>(path: string): Promise<T> =>
  request<T>(path, { method: "DELETE" }, false);

export interface BackendSettings {
  log_level: string;
  channel_size: number;
  max_events: number;
  monthly_limit_usd: number;
  daily_limit_usd: number;
  alert_threshold_percent: number;
}

export interface BackendUsageLog {
  id: string;
  provider: string;
  model: string;
  input_tokens: number;
  output_tokens: number;
  latency_ms: number;
  cost: number;
  status: string;
  project_id: string | null;
  created_at: string;
}

export interface BackendProjectSummary {
  id: string;
  name: string;
  tool_id: string;
  requests: number;
  total_cost: number;
  input_tokens: number;
  output_tokens: number;
  avg_latency_ms: number;
  first_seen: string;
  last_seen: string;
}

export interface BackendProviderInfo {
  id: string;
  name: string;
  default_model: string;
  input_rate_per_1k: number;
  output_rate_per_1k: number;
  supports_usage_count: boolean;
}

export interface BackendDailySummary {
  today_cost: number;
  today_tokens: number;
  today_requests: number;
  month_cost: number;
  month_tokens: number;
  month_requests: number;
}

export interface BackendNotification {
  id: string;
  tool_id: string;
  title: string;
  body: string;
  level: "info" | "warning" | "critical";
  sent_at: string;
  read: boolean;
}

export interface BackendValidation {
  provider: string;
  valid: boolean;
}
