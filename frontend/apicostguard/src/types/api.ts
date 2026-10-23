export interface ApiHealth {
  status: string;
  environment: string;
  uptime_seconds: number;
}

export interface ApiVersion {
  name: string;
  version: string;
}

export interface ApiDailySummary {
  today_cost: number;
  today_tokens: number;
  today_requests: number;
  month_cost: number;
  month_tokens: number;
  month_requests: number;
}

export interface ApiPeriodSummary {
  total_cost: number;
  total_requests: number;
  avg_latency_ms: number;
  success_rate: number;
}

export interface ApiProviderStat {
  provider: string;
  requests: number;
  total_cost: number;
  avg_latency_ms: number;
}

export interface ApiProjectStat {
  project_id: string | null;
  requests: number;
  total_cost: number;
}

export interface ApiAnalytics {
  daily_cost: number;
  monthly_cost: number;
  daily: ApiPeriodSummary;
  weekly: ApiPeriodSummary;
  monthly: ApiPeriodSummary;
  providers: ApiProviderStat[];
  projects: ApiProjectStat[];
}

export interface ApiDashboard {
  total_cost_usd: number;
  total_requests: number;
  active_providers: string[];
  cost_by_provider: Record<string, number>;
  daily_cost: number;
  monthly_cost: number;
  budget_used_percent: number;
}

export interface ApiUsageLog {
  id: string;
  provider: string;
  model: string;
  input_tokens: number;
  output_tokens: number;
  latency_ms: number;
  cost: number;
  status: string;
  project_id: string | null;
  created_at: string;
}

export interface ApiProviderInfo {
  id: string;
  name: string;
  default_model: string;
  input_rate_per_1k: number;
  output_rate_per_1k: number;
  supports_usage_count: boolean;
}

export interface ApiProviderList {
  providers: ApiProviderInfo[];
}

export interface ApiProjectSummary {
  id: string;
  name: string;
  tool_id: string;
  requests: number;
  total_cost: number;
  input_tokens: number;
  output_tokens: number;
  avg_latency_ms: number;
  first_seen: string;
  last_seen: string;
}

export interface ApiNotification {
  id: string;
  tool_id: string;
  title: string;
  body: string;
  level: "info" | "warning" | "critical";
  sent_at: string;
  read: boolean;
}

export interface ApiBudget {
  monthly_limit: number;
  daily_limit: number;
  weekly_limit: number;
  current_spend: number;
  week_spend: number;
  remaining: number;
  remaining_percent: number;
  month: string;
  week_start: string;
}

export interface ApiBudgetRecord {
  id: string;
  name: string;
  scope: string;
  scope_id?: string | null;
  monthly_limit_usd: number;
  alert_threshold_percent: number;
  current_spend_usd: number;
  month: string;
  created_at: string;
  updated_at: string;
}

export interface ApiSettings {
  log_level: string;
  channel_size: number;
  max_events: number;
  monthly_limit_usd: number;
  daily_limit_usd: number;
  weekly_limit_usd: number;
  alert_threshold_percent: number;
}