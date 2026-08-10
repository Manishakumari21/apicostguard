import type { UsageEvent } from "../types/usage";
import { PROVIDERS, type ProviderConfig } from "./constants";

export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function createUsageEvent(
  provider: string,
  model: string,
  inputTokens: number,
  outputTokens: number,
  cost: number
): UsageEvent {
  return {
    id: generateId(),
    provider,
    model,
    inputTokens,
    outputTokens,
    cost,
    timestamp: new Date().toISOString(),
  };
}

export type BudgetStatus = "safe" | "warning" | "critical";

export function getBudgetStatus(percent: number, threshold = 80): BudgetStatus {
  if (percent >= 100) return "critical";
  if (percent >= threshold) return "warning";
  return "safe";
}

export function getStatusHex(status: BudgetStatus): string {
  switch (status) {
    case "critical":
      return "#EF4444";
    case "warning":
      return "#FACC15";
    default:
      return "#22C55E";
  }
}

export function getStatusLabel(status: BudgetStatus): string {
  switch (status) {
    case "critical":
      return "Critical";
    case "warning":
      return "Warning";
    default:
      return "Safe";
  }
}

export function getBudgetColor(percent: number, threshold = 80): string {
  return getStatusHex(getBudgetStatus(percent, threshold));
}

export function getBudgetBgClass(percent: number, threshold = 80): string {
  const status = getBudgetStatus(percent, threshold);
  if (status === "critical") return "bg-danger";
  if (status === "warning") return "bg-warning";
  return "bg-success";
}

const LEGACY_COLORS: Record<string, string> = {
  ChatGPT: "#10A37F",
  Gemini: "#4285F4",
  Claude: "#8B5CF6",
  Cursor: "#06B6D4",
  "Claude Code": "#F59E0B",
  OpenCode: "#F43E5C",
  "VS Code": "#3B82F6",
  Ollama: "#94A3B8",
  "LM Studio": "#EC4899",
  LiteLLM: "#6366F1",
};

export function getProviderConfig(name: string): ProviderConfig {
  const lower = name.toLowerCase();
  const byId = PROVIDERS.find((p) => p.id.toLowerCase() === lower);
  if (byId) return byId;
  const byName = PROVIDERS.find((p) => p.name.toLowerCase() === lower);
  if (byName) return byName;
  const legacyColor = LEGACY_COLORS[name] ?? LEGACY_COLORS[capitalize(lower)];
  if (legacyColor)
    return { id: lower.replace(/\s+/g, "-"), name, icon: "🔌", color: legacyColor, kind: "cloud" };
  return { id: lower.replace(/\s+/g, "-"), name, icon: "🔌", color: "#A8B3C5", kind: "cloud" };
}

function capitalize(s: string): string {
  if (!s) return s;
  return s.replace(/\b\w/g, (c) => c.toUpperCase());
}

export function getProviderColor(name: string): string {
  return getProviderConfig(name).color;
}

export function getProviderIcon(name: string): string {
  return getProviderConfig(name).icon;
}
