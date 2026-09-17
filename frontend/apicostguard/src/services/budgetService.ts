import type { ApiBudget, ApiBudgetRecord, ApiProjectSummary, ApiSettings } from "../types/api";
import type { BudgetView } from "../types/domain";
import { gatewayRequest } from "./gatewayService";
import { getRequestHistory } from "./requestService";

export interface BudgetDetail {
  current: BudgetView;
  records: ApiBudgetRecord[];
}

export interface SaveBudgetInput {
  monthly_limit_usd: number;
  daily_limit_usd?: number;
  alert_threshold_percent?: number;
  weekly_limit_usd?: number;
  name?: string;
  scope?: { kind: string; id?: string };
}

function runoutDate(remaining: number, weekSpend: number): string | null {
  if (remaining <= 0) return new Date().toISOString().slice(0, 10);
  const dailyAvg = weekSpend / 7;
  if (dailyAvg <= 0) return null;
  const daysLeft = remaining / dailyAvg;
  const d = new Date();
  d.setDate(d.getDate() + Math.floor(daysLeft));
  return d.toISOString().slice(0, 10);
}

export function budgetViewFromApi(
  budget: ApiBudget,
  settings: ApiSettings,
  todaySpend: number
): BudgetView {
  const usedPercent =
    budget.monthly_limit > 0
      ? Math.min((budget.current_spend / budget.monthly_limit) * 100, 100)
      : 0;

  return {
    monthlyLimit: budget.monthly_limit,
    dailyLimit: budget.daily_limit,
    weeklyLimit: budget.weekly_limit,
    currentSpend: budget.current_spend,
    weekSpend: budget.week_spend,
    todaySpend,
    usedPercent,
    remaining: budget.remaining,
    remainingPercent: budget.remaining_percent,
    month: budget.month,
    weekStart: budget.week_start,
    threshold: settings.alert_threshold_percent,
    scope: { kind: "global" },
    projectedRunoutDate: runoutDate(budget.remaining, budget.week_spend),
  };
}

export async function getBudgets(): Promise<BudgetDetail> {
  const [budget, records, settings, logs] = await Promise.all([
    gatewayRequest<ApiBudget>("GET", "/api/budget"),
    gatewayRequest<ApiBudgetRecord[]>("GET", "/api/budgets"),
    gatewayRequest<ApiSettings>("GET", "/api/settings"),
    getRequestHistory(1000),
  ]);

  const today = new Date().toISOString().slice(0, 10);
  const todaySpend = logs
    .filter((l) => l.createdAt.slice(0, 10) === today)
    .reduce((s, l) => s + l.cost, 0);

  const current = budgetViewFromApi(budget, settings, todaySpend);

  return { current, records };
}

export async function saveBudget(input: SaveBudgetInput): Promise<ApiBudget> {
  return gatewayRequest<ApiBudget>("POST", "/api/budgets", input);
}

export async function deleteBudget(id: string): Promise<void> {
  await gatewayRequest("DELETE", `/api/budgets/${encodeURIComponent(id)}`);
}

export async function getProjects(): Promise<ApiProjectSummary[]> {
  return gatewayRequest<ApiProjectSummary[]>("GET", "/api/projects?days=7");
}