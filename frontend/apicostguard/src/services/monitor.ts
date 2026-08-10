import type { UsageEvent } from "../types/usage";
import { tauriInvoke } from "./tauri";
import { backendGet, type BackendDailySummary, type BackendProjectSummary, type BackendProviderInfo, type BackendUsageLog } from "./backend";
export interface ServerStatus {
  id: string;
  name: string;
  baseUrl: string;
  connected: boolean;
  runningModels: string[];
  error?: string;
  lastSeen?: number;
}

export interface ToolInfo {
  name: string;
  kind: string;
  connected: boolean;
  models: string[];
  totalCost: number;
  totalTokens: number;
  lastUsed?: number;
}

export interface DailySummary {
  todayCost: number;
  todayTokens: number;
  todayRequests: number;
  monthCost: number;
  monthTokens: number;
  monthRequests: number;
}

function toEvent(e: UsageEvent): UsageEvent {
  return {
    ...e,
    timestamp:
      typeof e.timestamp === "number"
        ? new Date(e.timestamp).toISOString()
        : e.timestamp,
  };
}

function logToEvent(log: BackendUsageLog): UsageEvent {
  return {
    id: log.id,
    provider: log.provider,
    model: log.model,
    inputTokens: log.input_tokens,
    outputTokens: log.output_tokens,
    cost: log.cost,
    timestamp: log.created_at,
    duration: log.latency_ms,
  };
}

function projectToTool(p: BackendProjectSummary): ToolInfo {
  return {
    name: p.name,
    kind: p.tool_id ? "desktop" : "cloud",
    connected: p.requests > 0,
    models: [],
    totalCost: p.total_cost,
    totalTokens: p.input_tokens + p.output_tokens,
    lastUsed: p.last_seen ? Date.parse(p.last_seen) : undefined,
  };
}

function providerToServer(p: BackendProviderInfo): ServerStatus {
  return {
    id: p.id,
    name: p.name,
    baseUrl: "",
    connected: false,
    runningModels: [p.default_model].filter(Boolean),
    lastSeen: undefined,
  };
}

export async function getUsage(): Promise<UsageEvent[]> {
  try {
    const logs = await backendGet<BackendUsageLog[]>("/api/history?limit=200");
    return logs.map(logToEvent);
  } catch {
    try {
      const events = await tauriInvoke<UsageEvent[]>("get_usage");
      return events.map(toEvent);
    } catch {
      return [];
    }
  }
}

const LOCAL_PROVIDER_IDS = new Set(["ollama", "lmstudio"]);

export async function getServers(): Promise<ServerStatus[]> {
  try {
    const { providers } = await backendGet<{ providers: BackendProviderInfo[] }>("/api/providers");
    return providers
      .filter((p) => LOCAL_PROVIDER_IDS.has(p.id))
      .map(providerToServer);
  } catch {
    try {
      return await tauriInvoke<ServerStatus[]>("get_servers");
    } catch {
      return [];
    }
  }
}

export async function getTools(): Promise<ToolInfo[]> {
  try {
    const projects = await backendGet<BackendProjectSummary[]>("/api/projects?days=7");
    return projects.map(projectToTool);
  } catch {
    try {
      return await tauriInvoke<ToolInfo[]>("get_tools");
    } catch {
      return [];
    }
  }
}

export async function getClosestToLimit(): Promise<ToolInfo | null> {
  try {
    return await tauriInvoke<ToolInfo | null>("get_closest_to_limit");
  } catch {
    return null;
  }
}

export async function getDailySummary(): Promise<DailySummary | null> {
  try {
    const data = await backendGet<BackendDailySummary>("/api/usage/daily-summary");
    return {
      todayCost: data.today_cost ?? 0,
      todayTokens: data.today_tokens ?? 0,
      todayRequests: data.today_requests ?? 0,
      monthCost: data.month_cost ?? 0,
      monthTokens: data.month_tokens ?? 0,
      monthRequests: data.month_requests ?? 0,
    };
  } catch {
    try {
      const t = await tauriInvoke<BackendDailySummary & Record<string, number>>("get_daily_summary");
      return {
        todayCost: t.today_cost ?? t.todayCost ?? 0,
        todayTokens: t.today_tokens ?? t.todayTokens ?? 0,
        todayRequests: t.today_requests ?? t.todayRequests ?? 0,
        monthCost: t.month_cost ?? t.monthCost ?? 0,
        monthTokens: t.month_tokens ?? t.monthTokens ?? 0,
        monthRequests: t.month_requests ?? t.monthRequests ?? 0,
      };
    } catch {
      return null;
    }
  }
}
