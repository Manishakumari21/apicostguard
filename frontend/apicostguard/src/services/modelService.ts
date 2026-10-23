import type { ModelOverview } from "../types/domain";
import { getRequestHistory } from "./requestService";
import { aggregateLogs, averageLatency } from "./series";

export async function getModelOverviews(): Promise<ModelOverview[]> {
  const logs = await getRequestHistory(1000);
  const { byModel } = aggregateLogs(logs);

  const models: ModelOverview[] = Array.from(byModel.entries()).map(([key, agg]) => {
    const slash = key.indexOf("/");
    const provider = slash >= 0 ? key.slice(0, slash) : "unknown";
    const name = slash >= 0 ? key.slice(slash + 1) : key;
    return {
      name,
      provider,
      requests: agg.requests,
      tokens: agg.tokens,
      cost: agg.cost,
      latencyMs: averageLatency(agg),
      errorRate: agg.requests > 0 ? Math.min((agg.errorRate / agg.requests) * 100, 100) : 0,
    };
  });

  return models.sort((a, b) => b.cost - a.cost);
}

export function filterModels(
  models: ModelOverview[],
  query: string,
  provider: string,
  sort: { key: "cost" | "requests" | "tokens" | "latencyMs" | "errorRate"; dir: "asc" | "desc" }
): ModelOverview[] {
  const q = query.trim().toLowerCase();
  return models
    .filter(
      (m) =>
        (provider === "all" || m.provider === provider) &&
        (!q || m.name.toLowerCase().includes(q) || m.provider.toLowerCase().includes(q))
    )
    .sort((a, b) => {
      const av = a[sort.key];
      const bv = b[sort.key];
      const diff = av - bv;
      return sort.dir === "asc" ? diff : -diff;
    });
}