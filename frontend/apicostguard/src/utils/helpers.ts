import type { UsageEvent } from "../types/usage";

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

export function getBudgetColor(percent: number): string {
  if (percent >= 100) return "#EF4444";
  if (percent >= 90) return "#F59E0B";
  if (percent >= 80) return "#F97316";
  return "#22C55E";
}

export function getBudgetBgClass(percent: number): string {
  if (percent >= 100) return "bg-red-500";
  if (percent >= 90) return "bg-amber-500";
  if (percent >= 80) return "bg-orange-500";
  return "bg-emerald-500";
}

export function getProviderColor(name: string): string {
  const colors: Record<string, string> = {
    ChatGPT: "#22C55E",
    Gemini: "#8B5CF6",
    Claude: "#F97316",
    Cursor: "#06B6D4",
    "Claude Code": "#F59E0B",
    OpenCode: "#F43E5C",
    "VS Code": "#3B82F6",
    Ollama: "#14B8A6",
    "LM Studio": "#EC4899",
    LiteLLM: "#6366F1",
  };
  return colors[name] ?? "#94A3B8";
}
