import { tauriInvoke } from "./tauri";
import { backendDelete, backendGet, backendPost } from "./backend";
import type { ApiHealth, ApiVersion } from "../types/api";
import type { GatewayStatus } from "../types/domain";
import { GATEWAY_DEFAULT_HOST, GATEWAY_DEFAULT_PORT } from "../utils/constants";

export async function getGatewayStatus(): Promise<GatewayStatus> {
  try {
    return await tauriInvoke<GatewayStatus>("gateway_status");
  } catch {
    return httpFallbackStatus();
  }
}

async function httpFallbackStatus(): Promise<GatewayStatus> {
  const base: GatewayStatus = {
    running: false,
    version: "",
    endpointHost: GATEWAY_DEFAULT_HOST,
    endpointPort: GATEWAY_DEFAULT_PORT,
    uptimeSeconds: null,
    environment: "unknown",
    managed: false,
    error: null,
  };
  try {
    const health = await backendGet<ApiHealth>("/health");
    let version = "";
    try {
      version = (await backendGet<ApiVersion>("/version")).version;
    } catch {
    }
    return {
      ...base,
      running: health.status === "ok",
      version,
      uptimeSeconds: health.uptime_seconds,
      environment: health.environment,
      error: health.status === "ok" ? null : `health=${health.status}`,
    };
  } catch (err) {
    return { ...base, error: err instanceof Error ? err.message : String(err) };
  }
}

export async function gatewayRequest<T>(
  method: "GET" | "POST" | "DELETE",
  path: string,
  body?: unknown
): Promise<T> {
  try {
    return await tauriInvoke<T>("gateway_request", {
      method,
      path,
      body: body ?? null,
    });
  } catch {
    if (method === "GET") return backendGet<T>(path);
    if (method === "DELETE") return backendDelete<T>(path);
    return backendPost<T>(path, body);
  }
}