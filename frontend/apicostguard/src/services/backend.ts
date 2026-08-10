import { API_BASE_URL } from "../utils/constants";

const REQUEST_TIMEOUT_MS = 5000;
const UNAVAILABLE_RETRY_MS = 5000;

let backendUnavailableUntil = 0;

export class BackendError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "BackendError";
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  if (Date.now() < backendUnavailableUntil) {
    throw new BackendError(`backend offline: ${path}`);
  }
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  let resp: Response;
  try {
    resp = await fetch(`${API_BASE_URL}${path}`, {
      ...init,
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
        ...(init?.headers ?? {}),
      },
    });
  } catch {
    backendUnavailableUntil = Date.now() + UNAVAILABLE_RETRY_MS;
    throw new BackendError(`backend unreachable: ${path}`);
  } finally {
    clearTimeout(timer);
  }
  if (!resp.ok) {
    throw new BackendError(`backend ${resp.status} for ${path}`);
  }
  if (resp.status === 204) {
    return undefined as T;
  }
  return (await resp.json()) as T;
}

export const backendGet = <T>(path: string): Promise<T> => request<T>(path);

export const backendPost = <T>(path: string, body?: unknown): Promise<T> =>
  request<T>(path, {
    method: "POST",
    body: body === undefined ? undefined : JSON.stringify(body),
  });

export const backendDelete = <T>(path: string): Promise<T> =>
  request<T>(path, { method: "DELETE" });

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
