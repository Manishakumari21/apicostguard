import type { ApiAnalytics, ApiBudget, ApiDashboard, ApiSettings } from "../types/api";
import type {
  BudgetView,
  DashboardData,
  ProviderUsage,
  RequestLog,
} from "../types/domain";
import { gatewayRequest } from "./gatewayService";
import { getRequestHistory } from "./requestService";
import { buildDailySeries } from "./series";

export interface DashboardSource {
  analytics: ApiAnalytics;
  dashboard: ApiDashboard;
  budget: ApiBudget;
  settings: ApiSettings;
  logs: RequestLog[];
}

export async function getDashboardSource(): Promise<DashboardSource> {
  const [analytics, dashboard, budget, settings, logs] = await Promise.all([
    gatewayRequest<ApiAnalytics>("GET", "/api/analytics"),
    gatewayRequest<ApiDashboard>("GET", "/api/dashboard"),
    gatewayRequest<ApiBudget>("GET", "/api/budget"),
    gatewayRequest<ApiSettings>("GET", "/api/settings"),
    getRequestHistory(1000),
  ]);
  return { analytics, dashboard, budget, settings, logs };
}

export function toDashboardData(
  source: DashboardSource,
  seriesDays = 30
): DashboardData {
  const { analytics, dashboard, budget, settings, logs } = source;

  const blocked = logs.filter((l) => l.status === "blocked").length;
  const recent = logs.slice(0, 14);
  const series = buildDailySeries(logs, seriesDays);

  const providerMap = new Map<string, { cost: number; requests: number; tokens: number }>();
  for (const log of logs) {
    const p = providerMap.get(log.provider) ?? { cost: 0, requests: 0, tokens: 0 };
    p.cost += log.cost;
    p.requests += 1;
    p.tokens += log.totalTokens;
    providerMap.set(log.provider, p);
  }
  const providers: ProviderUsage[] = Array.from(providerMap.entries())
    .map(([name, p]) => ({ name, cost: p.cost, requests: p.requests, tokens: p.tokens }))
    .sort((a, b) => b.cost - a.cost);

  const monthly = analytics.monthly;
  const today = logs
    .filter((l) => l.createdAt.slice(0, 10) === new Date().toISOString().slice(0, 10))
    .reduce((sum, l) => sum + l.cost, 0);

  const monthlyCost = dashboard.monthly_cost;
  const monthlyLimit = budget.monthly_limit;
  const remaining = monthlyLimit > 0 ? Math.max(0, monthlyLimit - monthlyCost) : 0;
  const remainingPercent = monthlyLimit > 0 ? Math.min((remaining / monthlyLimit) * 100, 100) : 100;
  const dailyAvg = monthlyCost / Math.max(1, new Date().getDate());
  const runoutDays = dailyAvg > 0 ? Math.floor(remaining / dailyAvg) : null;
  const runoutDate =
    runoutDays === null
      ? null
      : (() => {
          const d = new Date();
          d.setDate(d.getDate() + runoutDays);
          return d.toISOString().slice(0, 10);
        })();

  const budgetView: BudgetView = {
    monthlyLimit,
    dailyLimit: budget.daily_limit,
    weeklyLimit: budget.weekly_limit,
    currentSpend: monthlyCost,
    weekSpend: budget.week_spend,
    todaySpend: today,
    usedPercent: dashboard.budget_used_percent,
    remaining,
    remainingPercent,
    month: budget.month,
    weekStart: budget.week_start,
    threshold: settings.alert_threshold_percent,
    scope: { kind: "global" },
    projectedRunoutDate: runoutDate,
  };

  return {
    todayCost: dashboard.daily_cost,
    todayRequests: analytics.daily.total_requests,
    monthCost: monthlyCost,
    totalCost: dashboard.total_cost_usd,
    totalRequests: dashboard.total_requests,
    avgLatency: monthly.total_requests > 0 ? monthly.avg_latency_ms : null,
    successRate: monthly.total_requests > 0 ? monthly.success_rate : null,
    blocked,
    activeProviders: dashboard.active_providers,
    budget: budgetView,
    providers,
    series,
    recent,
  };
}