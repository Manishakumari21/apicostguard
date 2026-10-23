import type { ApiAnalytics, ApiDashboard } from "../types/api";
import type { CostBreakdown, RequestLog } from "../types/domain";
import { getProviderColor } from "../utils/helpers";
import { DAYS_PER_MONTH } from "../utils/constants";
import { gatewayRequest } from "./gatewayService";
import { getRequestHistory } from "./requestService";
import { buildDailySeries } from "./series";

export interface CostSource {
  analytics: ApiAnalytics;
  dashboard: ApiDashboard;
  logs: RequestLog[];
}

export async function getCostSource(): Promise<CostSource> {
  const [analytics, dashboard, logs] = await Promise.all([
    gatewayRequest<ApiAnalytics>("GET", "/api/analytics"),
    gatewayRequest<ApiDashboard>("GET", "/api/dashboard"),
    getRequestHistory(1000),
  ]);
  return { analytics, dashboard, logs };
}

export function toCostBreakdown(source: CostSource): CostBreakdown {
  const { analytics, dashboard, logs } = source;

  const weekCost = analytics.weekly.total_cost || 0;
  const monthCost = dashboard.monthly_cost;
  const totalCost = dashboard.total_cost_usd;
  const dailyAvg = weekCost / 7;
  const projectedMonthly = dailyAvg * DAYS_PER_MONTH;

  const byProvider = new Map<string, number>();
  const byModel = new Map<string, number>();
  const byProject = new Map<string, number>();
  for (const log of logs) {
    byProvider.set(log.provider, (byProvider.get(log.provider) ?? 0) + log.cost);
    byModel.set(`${log.provider}/${log.model}`, (byModel.get(`${log.provider}/${log.model}`) ?? 0) + log.cost);
    byProject.set(log.projectId ?? "unattributed", (byProject.get(log.projectId ?? "unattributed") ?? 0) + log.cost);
  }

  const potentialSavings = estimateSavings(logs);

  return {
    totalCost,
    monthCost,
    dailyAvg,
    projectedMonthly,
    potentialSavings,
    series: buildDailySeries(logs, 30).map((p) => ({ label: p.label, cost: p.cost })),
    byProvider: toCategories(byProvider),
    byModel: toCategories(byModel),
    byProject: toCategories(byProject),
  };
}

function toCategories(map: Map<string, number>) {
  return Array.from(map.entries())
    .map(([label, value]) => ({
      label,
      value,
      color: label.includes("/") ? getProviderColor(label.split("/")[0]) : getProviderColor(label),
    }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 8);
}

function estimateSavings(logs: RequestLog[]): number {
  if (logs.length === 0) return 0;
  const total = logs.reduce((s, l) => s + l.cost, 0);
  const totalTokens = logs.reduce((s, l) => s + l.totalTokens, 0);
  if (total <= 0) return 0;
  const estimate = total * 0.12;
  return totalTokens === 0 ? 0 : Math.max(0, parseFloat(estimate.toFixed(2)));
}