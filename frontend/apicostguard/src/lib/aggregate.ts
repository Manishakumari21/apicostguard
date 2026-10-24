import type { Aggregate, UsageLog } from "../services/types";

export interface RankedAggregate extends Aggregate {
  key: string;
  provider: string;
  name: string;
}

export function emptyAggregate(): Aggregate {
  return { requests: 0, tokens: 0, cost: 0, latencyMs: 0, errors: 0, lastSeen: null };
}

export function totalOf(logs: UsageLog[]): {
  requests: number;
  tokens: number;
  cost: number;
  avgLatency: number;
  successRate: number;
  errors: number;
} {
  let requests = 0;
  let tokens = 0;
  let cost = 0;
  let latency = 0;
  let errors = 0;

  for (const log of logs) {
    requests += 1;
    tokens += log.totalTokens;
    cost += log.cost;
    latency += Math.max(0, log.latencyMs);
    if (log.status !== "success") errors += 1;
  }

  return {
    requests,
    tokens,
    cost,
    avgLatency: requests > 0 ? latency / requests : 0,
    successRate: requests > 0 ? ((requests - errors) / requests) * 100 : 100,
    errors,
  };
}

export function aggregateByProvider(logs: UsageLog[]): RankedAggregate[] {
  return aggregateBy(logs, (log) => ({ key: log.provider, provider: log.provider, name: log.provider }));
}

export function aggregateByModel(logs: UsageLog[]): RankedAggregate[] {
  return aggregateBy(logs, (log) => ({
    key: `${log.provider}/${log.model}`,
    provider: log.provider,
    name: log.model,
  }));
}

export function aggregateByProject(logs: UsageLog[]): RankedAggregate[] {
  return aggregateBy(logs, (log) => ({
    key: log.projectId ?? "unattributed",
    provider: "project",
    name: log.projectId ?? "Unattributed",
  }));
}

export function aggregateBy<T extends string>(
  logs: UsageLog[],
  keyOf: (log: UsageLog) => { key: T; provider: string; name: string }
): RankedAggregate[] {
  const map = new Map<string, RankedAggregate>();

  for (const log of logs) {
    const identity = keyOf(log);
    const current =
      map.get(identity.key) ??
      ({
        ...identity,
        ...emptyAggregate(),
      } as RankedAggregate);

    current.requests += 1;
    current.tokens += log.totalTokens;
    current.cost += log.cost;
    current.latencyMs += Math.max(0, log.latencyMs);
    if (log.status !== "success") current.errors += 1;
    const seen = new Date(log.createdAt).getTime();
    if (Number.isFinite(seen)) current.lastSeen = Math.max(current.lastSeen ?? 0, seen);

    map.set(identity.key, current);
  }

  return [...map.values()].sort((a, b) => b.cost - a.cost);
}

export function averageLatency(aggregate: Aggregate): number {
  return aggregate.requests > 0 ? aggregate.latencyMs / aggregate.requests : 0;
}

export function errorRate(aggregate: Aggregate): number {
  return aggregate.requests > 0 ? (aggregate.errors / aggregate.requests) * 100 : 0;
}

export function costShare(value: number, total: number): number {
  return total > 0 ? Math.min(100, (value / total) * 100) : 0;
}

export function costPerThousandTokens(logs: UsageLog[]): number {
  const tokens = logs.reduce((sum, log) => sum + log.totalTokens, 0);
  const cost = logs.reduce((sum, log) => sum + log.cost, 0);
  return tokens > 0 ? (cost / tokens) * 1000 : 0;
}

export function statusCounts(logs: UsageLog[]): Record<UsageLog["status"], number> {
  return logs.reduce(
    (counts, log) => {
      counts[log.status] += 1;
      return counts;
    },
    { success: 0, error: 0, blocked: 0 } as Record<UsageLog["status"], number>
  );
}

export function averagePerDay(logs: UsageLog[], days: number): number {
  return days > 0 ? logs.reduce((sum, log) => sum + log.cost, 0) / days : 0;
}

export function uniqueCount(values: string[]): number {
  return new Set(values.filter(Boolean)).size;
}
