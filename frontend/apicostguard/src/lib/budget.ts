import type { ApiBudget, ApiSettings } from "../services/types";
import type { BudgetSnapshot } from "../services/types";

export function toBudgetSnapshot(
  budget: ApiBudget,
  settings: Pick<ApiSettings, "alert_threshold_percent"> | null,
  todaySpend: number
): BudgetSnapshot {
  const usedPercent =
    budget.monthly_limit > 0 ? Math.min(100, (budget.current_spend / budget.monthly_limit) * 100) : 0;

  return {
    monthlyLimit: budget.monthly_limit,
    dailyLimit: budget.daily_limit,
    weeklyLimit: budget.weekly_limit,
    currentSpend: budget.current_spend,
    weekSpend: budget.week_spend,
    todaySpend,
    remaining: budget.remaining,
    remainingPercent: budget.remaining_percent,
    month: budget.month,
    weekStart: budget.week_start,
    usedPercent,
    threshold: settings?.alert_threshold_percent ?? 80,
  };
}

export function projectionFromPace(spend: number, dayOfMonth: number, daysInMonth: number): number {
  if (dayOfMonth <= 0) return 0;
  return (spend / dayOfMonth) * daysInMonth;
}

export function runwayDays(remaining: number, weeklySpend: number): number | null {
  const dailyPace = weeklySpend / 7;
  if (remaining <= 0) return 0;
  if (dailyPace <= 0) return null;
  return Math.floor(remaining / dailyPace);
}

export function spendState(usedPercent: number, threshold: number): "calm" | "watch" | "critical" {
  if (usedPercent >= 100) return "critical";
  if (usedPercent >= threshold) return "watch";
  return "calm";
}

export function daysInCurrentMonth(): number {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
}

export function dayOfCurrentMonth(): number {
  return new Date().getDate();
}
