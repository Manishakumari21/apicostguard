import type { RequestLog, SeriesPoint } from "../types/domain";

function dayKey(iso: string): string {
  return iso.slice(0, 10);
}

function labelFor(key: string): string {
  const d = new Date(`${key}T00:00:00`);
  return d.toLocaleDateString([], { month: "short", day: "numeric" });
}

export function buildDailySeries(logs: RequestLog[], days: number): SeriesPoint[] {
  const buckets = new Map<string, SeriesPoint>();
  const order: string[] = [];
  const now = new Date();

  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
      d.getDate()
    ).padStart(2, "0")}`;
    const label = labelFor(key);
    order.push(label);
    buckets.set(label, { label, cost: 0, tokens: 0, requests: 0 });
  }

  for (const log of logs) {
    const key = dayKey(log.createdAt);
    const label = labelFor(key);
    const bucket = buckets.get(label);
    if (!bucket) continue;
    bucket.cost += log.cost;
    bucket.tokens += log.totalTokens;
    bucket.requests += 1;
  }

  return order.map((label) => buckets.get(label)!);
}

export interface Aggregate {
  requests: number;
  tokens: number;
  cost: number;
  latencyMs: number;
  errorRate: number;
  lastSeen: number | null;
}

export function emptyAggregate(): Aggregate {
  return {
    requests: 0,
    tokens: 0,
    cost: 0,
    latencyMs: 0,
    errorRate: 0,
    lastSeen: null,
  };
}

export function aggregateLogs(logs: RequestLog[]): {
  byProvider: Map<string, Aggregate>;
  byModel: Map<string, Aggregate>;
  byProject: Map<string, Aggregate>;
} {
  const byProvider = new Map<string, Aggregate>();
  const byModel = new Map<string, Aggregate>();
  const byProject = new Map<string, Aggregate>();

  for (const log of logs) {
    accumulate(byProvider, log.provider, log);
    accumulate(byModel, `${log.provider}/${log.model}`, log);
    const project = log.projectId ?? "unattributed";
    accumulate(byProject, project, log);
  }

  return { byProvider, byModel, byProject };
}

function accumulate(map: Map<string, Aggregate>, key: string, log: RequestLog): void {
  const agg = map.get(key) ?? emptyAggregate();
  agg.requests += 1;
  agg.tokens += log.totalTokens;
  agg.cost += log.cost;
  agg.latencyMs += log.latencyMs;
  if (log.status !== "success") agg.errorRate += 1;
  const ts = new Date(log.createdAt).getTime();
  agg.lastSeen = agg.lastSeen === null ? ts : Math.max(agg.lastSeen, ts);
  map.set(key, agg);
}

export function averageLatency(agg: Aggregate): number {
  return agg.requests > 0 ? agg.latencyMs / agg.requests : 0;
}