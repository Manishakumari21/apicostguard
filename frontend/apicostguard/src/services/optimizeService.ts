import type { Optimization, RequestLog } from "../types/domain";
import { getRequestHistory } from "./requestService";
import { aggregateLogs, averageLatency } from "./series";

export async function getOptimizations(): Promise<Optimization[]> {
  const logs = await getRequestHistory(1000);
  if (logs.length === 0) return sampleOptimizations();

  const { byModel, byProvider } = aggregateLogs(logs);
  const totalCost = logs.reduce((s, l) => s + l.cost, 0);
  const optimizations: Optimization[] = [];
  let id = 0;

  const add = (opt: Omit<Optimization, "demo" | "id">) =>
    optimizations.push({ ...opt, demo: false, id: `opt-${id++}` });

  for (const [key, agg] of Array.from(byModel.entries()).sort((a, b) => b[1].cost - a[1].cost)) {
    if (agg.cost > 0 && totalCost > 0 && agg.cost / totalCost >= 0.35 && agg.cost >= 5) {
      const slash = key.indexOf("/");
      const model = slash >= 0 ? key.slice(slash + 1) : key;
      add({
        type: "expensive-model",
        title: `${model} drives ${Math.round((agg.cost / totalCost) * 100)}% of spend`,
        description:
          "Consider moving frequent calls to a smaller or cached model variant while keeping the expensive model for complex requests only.",
        potentialSavings: estimatePortion(agg.cost * 0.3),
        model,
      });
    }
  }

  const globalLatency = totalLatency(logs);
  for (const [provider, agg] of byProvider.entries()) {
    const avg = averageLatency(agg);
    if (agg.requests >= 10 && avg > globalLatency * 2 && avg > 6000) {
      add({
        type: "high-latency",
        title: `${provider} latency is ${Math.round(avg)}ms`,
        description:
          `Average latency is more than 2x the gateway baseline on ${agg.requests} requests. Batch or stream calls to reduce wall time.`,
        potentialSavings: 0,
        provider,
      });
    }
  }

  for (const [key, agg] of Array.from(byModel.entries()).sort((a, b) => b[1].tokens - a[1].tokens)) {
    if (agg.tokens >= 1_000_000 && agg.requests >= 10) {
      const slash = key.indexOf("/");
      const model = slash >= 0 ? key.slice(slash + 1) : key;
      add({
        type: "high-token-usage",
        title: `${model} consumed ${fmtTokens(agg.tokens)} tokens`,
        description:
          "Large context usage is expensive. Enable prompt caching and reduce context trimming to lower input token cost.",
        potentialSavings: estimatePortion(agg.cost * 0.15),
        model,
      });
    }
  }

  const tiny = logs.filter((l) => l.totalTokens > 0 && l.totalTokens < 512);
  if (tiny.length >= 50) {
    add({
      type: "batching",
      title: `${tiny.length} high-frequency small calls`,
      description:
        "Many tiny requests. Aggregating them into batch requests reduces per-call overhead and token waste.",
      potentialSavings: estimatePortion(totalCost * 0.05),
    });
  }

  return optimizations.length > 0 ? optimizations : sampleOptimizations();
}

function totalLatency(logs: RequestLog[]): number {
  const n = logs.length;
  if (n === 0) return 0;
  return logs.reduce((s, l) => s + l.latencyMs, 0) / n;
}

function estimatePortion(base: number): number {
  return parseFloat(Math.max(0, base).toFixed(2));
}

function fmtTokens(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  return `${Math.round(n / 1_000)}k`;
}

function sampleOptimizations(): Optimization[] {
  return [
    {
      id: "demo-expensive",
      type: "expensive-model",
      title: "Sample — dominant model swap",
      description:
        "With live request data this card would flag a model consuming over 35% of total spend and estimate savings from moving to a smaller variant.",
      potentialSavings: 0,
      demo: true,
    },
    {
      id: "demo-batching",
      type: "batching",
      title: "Sample — batch small requests",
      description:
        "High volumes of tiny calls would be aggregated here to reduce per-request overhead.",
      potentialSavings: 0,
      demo: true,
    },
    {
      id: "demo-latency",
      type: "high-latency",
      title: "Sample — latency outlier",
      description:
        "A provider exceeding 2x the gateway latency baseline would be reported here.",
      potentialSavings: 0,
      demo: true,
    },
  ];
}