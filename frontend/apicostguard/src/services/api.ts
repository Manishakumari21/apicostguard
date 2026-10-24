import { API_BASE_URL, apiDelete, apiGet, apiPost, isTauriRuntime } from "./client";
import type {
  ApiAnalytics,
  ApiBudget,
  ApiBudgetRecord,
  ApiDailySummary,
  ApiDashboard,
  ApiDeleted,
  ApiHealth,
  ApiNotification,
  ApiProviderInfo,
  ApiProviderList,
  ApiProviderTest,
  ApiSettings,
  ApiUsageLog,
  ApiValidation,
  ApiVersion,
  GatewayStatus,
  UsageLog,
} from "./types";

/* -------------------------------------------------------------------------
   Public / management endpoints
   ------------------------------------------------------------------------- */

export const fetchHealth = (signal?: AbortSignal) => apiGet<ApiHealth>("/health", signal);
export const fetchVersion = (signal?: AbortSignal) => apiGet<ApiVersion>("/version", signal);

export const fetchDashboard = (signal?: AbortSignal) => apiGet<ApiDashboard>("/api/dashboard", signal);
export const fetchAnalytics = (signal?: AbortSignal) => apiGet<ApiAnalytics>("/api/analytics", signal);
export const fetchBudget = (signal?: AbortSignal) => apiGet<ApiBudget>("/api/budget", signal);
export const fetchDailySummary = (signal?: AbortSignal) =>
  apiGet<ApiDailySummary>("/api/usage/daily-summary", signal);
export const fetchBudgetRecords = (signal?: AbortSignal) =>
  apiGet<ApiBudgetRecord[]>("/api/budgets", signal);
export const fetchSettings = (signal?: AbortSignal) => apiGet<ApiSettings>("/api/settings", signal);
export const fetchRawHistory = (limit = 1000, signal?: AbortSignal) =>
  apiGet<ApiUsageLog[]>(`/api/history?limit=${Math.max(1, Math.min(1000, limit))}`, signal);
export const fetchProviders = async (signal?: AbortSignal): Promise<ApiProviderInfo[]> => {
  const response = await apiGet<ApiProviderList>("/api/providers", signal);
  return response.providers;
};
export const fetchNotifications = (signal?: AbortSignal) =>
  apiGet<ApiNotification[]>("/api/notifications?limit=50", signal);

export const fetchUsageLogs = async (limit = 1000, signal?: AbortSignal): Promise<UsageLog[]> => {
  const rows = await fetchRawHistory(limit, signal);
  return rows.map(toUsageLog);
};

export async function fetchGatewayStatus(signal?: AbortSignal): Promise<GatewayStatus> {
  const started = performance.now();
  try {
    const health = await fetchHealth(signal);
    const latencyMs = Math.round(performance.now() - started);
    let version = "";
    try {
      version = (await fetchVersion(signal)).version;
    } catch {
      version = "";
    }
    return {
      online: health.status === "ok",
      version,
      environment: health.environment,
      uptimeSeconds: health.uptime_seconds,
      endpoint: API_BASE_URL,
      latencyMs,
      error: health.status === "ok" ? null : `Health reported "${health.status}"`,
      checkedAt: new Date().toISOString(),
    };
  } catch (error) {
    if (signal?.aborted) throw error;
    return {
      online: false,
      version: "",
      environment: "unknown",
      uptimeSeconds: null,
      endpoint: API_BASE_URL,
      latencyMs: null,
      error: error instanceof Error ? error.message : "Health check failed",
      checkedAt: new Date().toISOString(),
    };
  }
}

/* -------------------------------------------------------------------------
   Mutations — every result is surfaced to the UI as a real outcome.
   ------------------------------------------------------------------------- */

export const clearRequestHistory = (signal?: AbortSignal) =>
  apiDelete<ApiDeleted>("/api/history", signal);

export const saveProviderKey = (provider: string, apiKey: string, signal?: AbortSignal) =>
  apiPost<{ provider: string; saved: boolean }>(
    `/api/providers/${encodeURIComponent(provider)}/key`,
    { api_key: apiKey },
    signal
  );

export const deleteProviderKey = (provider: string, signal?: AbortSignal) =>
  apiDelete<{ provider: string; deleted: boolean }>(
    `/api/providers/${encodeURIComponent(provider)}/key`,
    signal
  );

export const validateProviderKey = (provider: string, apiKey?: string, signal?: AbortSignal) =>
  apiPost<ApiValidation>(
    `/api/providers/${encodeURIComponent(provider)}/validate`,
    apiKey && apiKey.trim() ? { api_key: apiKey.trim() } : undefined,
    signal
  );

export const testProviderConnection = (provider: string, apiKey?: string, signal?: AbortSignal) =>
  apiPost<ApiProviderTest>(
    `/api/providers/${encodeURIComponent(provider)}/test`,
    apiKey && apiKey.trim() ? { api_key: apiKey.trim() } : undefined,
    signal
  );

export interface SaveBudgetInput {
  monthly_limit_usd: number;
  daily_limit_usd?: number;
  weekly_limit_usd?: number;
  alert_threshold_percent?: number;
  name?: string;
  scope?: { kind: string; id?: string | null };
}

export const saveBudget = (input: SaveBudgetInput, signal?: AbortSignal) =>
  apiPost<ApiBudget>("/api/budgets", input, signal);

export const deleteBudget = (id: string, signal?: AbortSignal) =>
  apiDelete<{ deleted: boolean }>(`/api/budgets/${encodeURIComponent(id)}`, signal);

export const updateBackendSettings = (input: Partial<ApiSettings>, signal?: AbortSignal) =>
  apiPost<ApiSettings>("/api/settings", input, signal);

export async function restartGateway(): Promise<void> {
  if (!isTauriRuntime()) {
    throw new Error("Gateway restart is only available in the desktop build.");
  }
  const { invoke } = await import("@tauri-apps/api/core");
  await invoke("gateway_restart");
}

/* -------------------------------------------------------------------------
   Normalizers
   ------------------------------------------------------------------------- */

export function toUsageLog(row: ApiUsageLog): UsageLog {
  return {
    id: row.id,
    provider: row.provider,
    model: row.model,
    inputTokens: row.input_tokens,
    outputTokens: row.output_tokens,
    totalTokens: Math.max(0, row.input_tokens) + Math.max(0, row.output_tokens),
    latencyMs: row.latency_ms,
    cost: Number.isFinite(row.cost) ? row.cost : 0,
    status: normalizeStatus(row.status),
    projectId: row.project_id,
    createdAt: row.created_at,
  };
}

function normalizeStatus(status: string): UsageLog["status"] {
  if (status === "success" || status === "error" || status === "blocked") return status;
  if (status === "ok") return "success";
  return "error";
}
