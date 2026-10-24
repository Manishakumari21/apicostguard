import type { SeriesPoint, UsageLog } from "../services/types";

const DAY_MS = 86_400_000;

export function toDate(iso: string): Date | null {
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function dayKey(iso: string): string {
  const date = toDate(iso);
  if (!date) return "";
  return date.toISOString().slice(0, 10);
}

export function todayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

export function monthKey(date = new Date()): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

export function startOfMonthKey(date = new Date()): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-01`;
}

export function isoWeekStart(date = new Date()): string {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const day = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() - (day - 1));
  return d.toISOString();
}

export function dateKeyToLabel(key: string): string {
  const date = new Date(`${key}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) return key;
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric", timeZone: "UTC" });
}

export function shortDayLabel(key: string): string {
  const date = new Date(`${key}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) return key;
  return date.toLocaleDateString(undefined, { weekday: "short", timeZone: "UTC" });
}

export function buildDailySeries(logs: UsageLog[], days: number): SeriesPoint[] {
  const safeDays = Math.max(1, Math.min(180, Math.floor(days)));
  const buckets = new Map<string, SeriesPoint>();
  const order: string[] = [];
  const now = new Date();

  for (let offset = safeDays - 1; offset >= 0; offset--) {
    const date = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - offset));
    const key = date.toISOString().slice(0, 10);
    order.push(key);
    buckets.set(key, {
      key,
      label: dateKeyToLabel(key),
      cost: 0,
      tokens: 0,
      requests: 0,
      errors: 0,
    });
  }

  for (const log of logs) {
    const key = log.createdAt.slice(0, 10);
    const bucket = buckets.get(key);
    if (!bucket) continue;
    bucket.cost += log.cost;
    bucket.tokens += log.totalTokens;
    bucket.requests += 1;
    if (log.status !== "success") bucket.errors += 1;
  }

  return order.map((key) => buckets.get(key)!);
}

export function filterLogsSince(logs: UsageLog[], days: number): UsageLog[] {
  const cutoff = Date.now() - Math.max(1, days) * DAY_MS;
  return logs.filter((log) => {
    const time = new Date(log.createdAt).getTime();
    return Number.isFinite(time) && time >= cutoff;
  });
}

export function filterLogsForMonth(logs: UsageLog[], month = monthKey()): UsageLog[] {
  return logs.filter((log) => log.createdAt.slice(0, 7) === month);
}

export function rangeStartIso(days: number): string {
  return new Date(Date.now() - days * DAY_MS).toISOString();
}

export function formatRange(days: number): string {
  return `Last ${days} days`;
}

export function minutesUntil(dateIso: string): number {
  const target = new Date(dateIso).getTime();
  if (!Number.isFinite(target)) return 0;
  return Math.max(0, Math.round((target - Date.now()) / 60_000));
}

export function monthLabel(month: string): string {
  const [year, m] = month.split("-").map(Number);
  if (!year || !m) return month;
  return new Date(Date.UTC(year, m - 1, 1)).toLocaleDateString(undefined, {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}
