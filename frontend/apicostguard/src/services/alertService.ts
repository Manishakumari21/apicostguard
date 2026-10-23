import type { ApiNotification } from "../types/api";
import type { AlertItem } from "../types/domain";
import { REMAINING_THRESHOLDS } from "../utils/constants";
import { getBudgets } from "./budgetService";
import { getDashboardSource } from "./dashboardService";
import { gatewayRequest, getGatewayStatus } from "./gatewayService";
import { getProviderOverviews } from "./providerService";

export async function getAlerts(): Promise<AlertItem[]> {
  const [gateway, dashSource, providers, budgetDetail, notifications] = await Promise.all([
    getGatewayStatus(),
    getDashboardSource(),
    getProviderOverviews(),
    getBudgets(),
    listNotifications(),
  ]);

  const alerts: AlertItem[] = [];
  const budget = budgetDetail.current;

  if (!gateway.running) {
    alerts.push({
      id: "gateway-down",
      kind: "gateway",
      severity: "critical",
      title: "Gateway not running",
      message: `No response from ${gateway.endpointHost}:${gateway.endpointPort}. Check that the backend service is up.`,
      timestamp: new Date().toISOString(),
    });
  }

  if (budget.monthlyLimit > 0) {
    const remaining = budget.remainingPercent;
    if (remaining <= REMAINING_THRESHOLDS.critical) {
      alerts.push({
        id: "budget-critical",
        kind: "budget",
        severity: "critical",
        title: `Monthly budget critical — ${remaining.toFixed(0)}% left`,
        message: `${formatMoney(budget.currentSpend)} of ${formatMoney(budget.monthlyLimit)} used for ${budget.month}. Consider throttling.`,
        timestamp: new Date().toISOString(),
      });
    } else if (remaining <= REMAINING_THRESHOLDS.warning) {
      alerts.push({
        id: "budget-warning",
        kind: "budget",
        severity: "warning",
        title: `Monthly budget low — ${remaining.toFixed(0)}% left`,
        message: `${formatMoney(budget.currentSpend)} of ${formatMoney(budget.monthlyLimit)} used for ${budget.month}. Plan ahead.`,
        timestamp: new Date().toISOString(),
      });
    }
  }

  if (budget.dailyLimit > 0 && budget.todaySpend >= budget.dailyLimit) {
    alerts.push({
      id: "daily-limit",
      kind: "cost",
      severity: "critical",
      title: "Daily budget exceeded",
      message: `Today's spend ${formatMoney(budget.todaySpend)} passed the ${formatMoney(budget.dailyLimit)} daily limit.`,
      timestamp: new Date().toISOString(),
    });
  }

  const latencySignals = dashSource.analytics.providers.filter((p) => p.requests > 0 && p.avg_latency_ms > 8000);
  for (const p of latencySignals) {
    alerts.push({
      id: `latency-${p.provider}`,
      kind: "latency",
      severity: "warning",
      title: `High latency on ${p.provider}`,
      message: `Average latency is ${Math.round(p.avg_latency_ms)}ms across ${p.requests} requests.`,
      timestamp: new Date().toISOString(),
    });
  }

  for (const prov of providers) {
    if (prov.active === false && prov.requests > 0) continue;
    if (prov.errorRate >= 25) {
      alerts.push({
        id: `provider-errors-${prov.id}`,
        kind: "provider",
        severity: prov.errorRate >= 50 ? "critical" : "warning",
        title: `${prov.name} error rate ${Math.round(prov.errorRate)}%`,
        message: `${prov.errorRate >= 50 ? "Provider may be failing" : "Elevated failures"} across ${prov.requests} requests.`,
        timestamp: new Date().toISOString(),
      });
    }
  }

  for (const n of notifications) {
    alerts.push({
      id: `record-${n.id}`,
      kind: "system",
      severity: mapLevel(n.level),
      title: n.title,
      message: n.body,
      timestamp: n.sent_at,
    });
  }

  return alerts.sort((a, b) => {
    const rank: Record<string, number> = { critical: 0, warning: 1, info: 2 };
    const sev = rank[a.severity] - rank[b.severity];
    if (sev !== 0) return sev;
    return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
  });
}

async function listNotifications(): Promise<ApiNotification[]> {
  try {
    return await gatewayRequest<ApiNotification[]>("GET", "/api/notifications?limit=50");
  } catch {
    return [];
  }
}

function mapLevel(level: ApiNotification["level"]): AlertItem["severity"] {
  return level;
}

function formatMoney(n: number): string {
  return n.toLocaleString([], {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
}