export interface AppInfo {
  name: string;
  version: string;
  platform: string;
  arch: string;
}

export interface GatewayStatus {
  running: boolean;
  version: string;
  endpointHost: string;
  endpointPort: number;
  uptimeSeconds: number | null;
  environment: string;
  managed: boolean;
  error?: string | null;
}

export type RequestStatus = "success" | "error" | "blocked";

export interface RequestLog {
  id: string;
  provider: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  latencyMs: number;
  cost: number;
  status: RequestStatus;
  projectId: string | null;
  createdAt: string;
}

export interface SeriesPoint {
  label: string;
  cost: number;
  tokens: number;
  requests: number;
}

export interface ProviderUsage {
  name: string;
  cost: number;
  requests: number;
  tokens: number;
}

export type BudgetScopeKind = "global" | "provider" | "project";

export interface BudgetScope {
  kind: BudgetScopeKind;
  id?: string | null;
}

export interface BudgetView {
  monthlyLimit: number;
  dailyLimit: number;
  weeklyLimit: number;
  currentSpend: number;
  weekSpend: number;
  todaySpend: number;
  usedPercent: number;
  remaining: number;
  remainingPercent: number;
  month: string;
  weekStart: string;
  threshold: number;
  scope: BudgetScope;
  projectedRunoutDate: string | null;
}

export interface DashboardData {
  todayCost: number;
  todayRequests: number;
  monthCost: number;
  totalCost: number;
  totalRequests: number;
  avgLatency: number | null;
  successRate: number | null;
  blocked: number;
  activeProviders: string[];
  budget: BudgetView;
  providers: ProviderUsage[];
  series: SeriesPoint[];
  recent: RequestLog[];
}

export interface ProviderOverview {
  id: string;
  name: string;
  color: string;
  kind: "cloud" | "local";
  connected: boolean;
  active: boolean;
  requests: number;
  tokens: number;
  cost: number;
  latencyMs: number;
  errorRate: number;
  defaultModel: string;
}

export interface ModelOverview {
  name: string;
  provider: string;
  requests: number;
  tokens: number;
  cost: number;
  latencyMs: number;
  errorRate: number;
}

export interface CostSeriesPoint {
  label: string;
  cost: number;
}

export interface CostCategory {
  label: string;
  value: number;
  color: string;
}

export interface CostBreakdown {
  totalCost: number;
  monthCost: number;
  dailyAvg: number;
  projectedMonthly: number;
  potentialSavings: number;
  series: CostSeriesPoint[];
  byProvider: CostCategory[];
  byModel: CostCategory[];
  byProject: CostCategory[];
}

export type AlertSeverity = "info" | "warning" | "critical";
export type AlertKind =
  | "budget"
  | "cost"
  | "latency"
  | "provider"
  | "gateway"
  | "system";

export interface AlertItem {
  id: string;
  kind: AlertKind;
  severity: AlertSeverity;
  title: string;
  message: string;
  timestamp: string;
}

export type OptimizationType =
  | "expensive-model"
  | "high-token-usage"
  | "high-latency"
  | "lower-cost-provider"
  | "batching";

export interface Optimization {
  id: string;
  type: OptimizationType;
  title: string;
  description: string;
  potentialSavings: number;
  provider?: string;
  model?: string;
  demo: boolean;
}