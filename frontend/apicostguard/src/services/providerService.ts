import type { ApiAnalytics, ApiProviderList } from "../types/api";
import type { ProviderOverview, RequestLog } from "../types/domain";
import { getProviderConfig } from "../utils/helpers";
import { gatewayRequest } from "./gatewayService";
import { getRequestHistory } from "./requestService";
import { aggregateLogs, averageLatency } from "./series";

const LOCAL_PROVIDER_IDS = new Set(["ollama", "lmstudio"]);

export interface ProviderSource {
  info: ApiProviderList["providers"];
  analytics: ApiAnalytics;
  logs: RequestLog[];
}

export async function getProviderSource(): Promise<ProviderSource> {
  const [info, analytics, logs] = await Promise.all([
    gatewayRequest<ApiProviderList>("GET", "/api/providers"),
    gatewayRequest<ApiAnalytics>("GET", "/api/analytics"),
    getRequestHistory(1000),
  ]);
  return { info: info.providers, analytics, logs };
}

export function toProviderOverviews(source: ProviderSource): ProviderOverview[] {
  const { byProvider } = aggregateLogs(source.logs);

  const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const recentlySeen = (lastSeen: number | null) =>
    lastSeen !== null && lastSeen >= sevenDaysAgo;

  return source.info.map((info) => {
    const agg = byProvider.get(info.id) ?? byProvider.get(info.name);
    const local = LOCAL_PROVIDER_IDS.has(info.id);
    const config = getProviderConfig(info.id);
    const provider = byProvider.get(info.id);
    const errorCount = provider?.errorRate ?? 0;

    return {
      id: info.id,
      name: info.name,
      color: config.color,
      kind: local ? "local" : "cloud",
      connected: local ? recentlySeen(agg?.lastSeen ?? null) : true,
      active: (agg?.requests ?? 0) > 0,
      requests: agg?.requests ?? 0,
      tokens: agg?.tokens ?? 0,
      cost: agg?.cost ?? 0,
      latencyMs: agg ? averageLatency(agg) : 0,
      errorRate:
        (agg?.requests ?? 0) > 0 ? Math.min((errorCount / (agg?.requests ?? 1)) * 100, 100) : 0,
      defaultModel: info.default_model,
    };
  });
}

export async function getProviderOverviews(): Promise<ProviderOverview[]> {
  return toProviderOverviews(await getProviderSource());
}