import { backendGet } from "./backend";

export interface PeriodSummary {
  totalCost: number;
  totalRequests: number;
  avgLatencyMs: number;
  successRate: number;
}

export interface ProviderStat {
  provider: string;
  requests: number;
  totalCost: number;
  avgLatencyMs: number;
}

export interface ProjectStat {
  projectId: string | null;
  requests: number;
  totalCost: number;
}

export interface AnalyticsData {
  dailyCost: number;
  monthlyCost: number;
  daily: PeriodSummary;
  weekly: PeriodSummary;
  monthly: PeriodSummary;
  providers: ProviderStat[];
  projects: ProjectStat[];
}

interface RawPeriodSummary {
  total_cost: number;
  total_requests: number;
  avg_latency_ms: number;
  success_rate: number;
}

interface RawAnalytics {
  daily_cost: number;
  monthly_cost: number;
  daily: RawPeriodSummary;
  weekly: RawPeriodSummary;
  monthly: RawPeriodSummary;
  providers: {
    provider: string;
    requests: number;
    total_cost: number;
    avg_latency_ms: number;
  }[];
  projects: {
    project_id: string | null;
    requests: number;
    total_cost: number;
  }[];
}

function toPeriod(r: RawPeriodSummary): PeriodSummary {
  return {
    totalCost: r.total_cost,
    totalRequests: r.total_requests,
    avgLatencyMs: r.avg_latency_ms,
    successRate: r.success_rate,
  };
}

export async function getAnalytics(): Promise<AnalyticsData | null> {
  try {
    const raw = await backendGet<RawAnalytics>("/api/analytics");
    return {
      dailyCost: raw.daily_cost,
      monthlyCost: raw.monthly_cost,
      daily: toPeriod(raw.daily),
      weekly: toPeriod(raw.weekly),
      monthly: toPeriod(raw.monthly),
      providers: raw.providers.map((p) => ({
        provider: p.provider,
        requests: p.requests,
        totalCost: p.total_cost,
        avgLatencyMs: p.avg_latency_ms,
      })),
      projects: raw.projects.map((p) => ({
        projectId: p.project_id,
        requests: p.requests,
        totalCost: p.total_cost,
      })),
    };
  } catch {
    return null;
  }
}
