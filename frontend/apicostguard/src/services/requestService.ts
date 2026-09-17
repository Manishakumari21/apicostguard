import type { ApiUsageLog } from "../types/api";
import type { RequestLog, RequestStatus } from "../types/domain";
import { gatewayRequest } from "./gatewayService";

const HISTORY_LIMIT = 1000;

function toRequestLog(log: ApiUsageLog): RequestLog {
  return {
    id: log.id,
    provider: log.provider,
    model: log.model,
    inputTokens: log.input_tokens,
    outputTokens: log.output_tokens,
    totalTokens: (log.input_tokens + log.output_tokens) || 0,
    latencyMs: log.latency_ms,
    cost: log.cost,
    status: normalizeStatus(log.status),
    projectId: log.project_id,
    createdAt: log.created_at,
  };
}

function normalizeStatus(status: string): RequestStatus {
  if (status === "success" || status === "error" || status === "blocked") {
    return status;
  }
  return status === "ok" ? "success" : "error";
}

export async function getRequestHistory(limit = HISTORY_LIMIT): Promise<RequestLog[]> {
  const logs = await gatewayRequest<ApiUsageLog[]>(
    "GET",
    `/api/history?limit=${limit}`
  );
  return logs.map(toRequestLog);
}

export async function clearRequestHistory(): Promise<void> {
  await gatewayRequest<{ deleted: number }>("DELETE", "/api/history");
}