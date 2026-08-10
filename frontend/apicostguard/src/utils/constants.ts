export const STORAGE_KEY = "apicostguard_settings";
export const ONBOARDED_KEY = "apicostguard_onboarded";
export const EXTRA_SETTINGS_KEY = "apicostguard_extra_settings";
export const API_KEYS_KEY = "apicostguard_api_keys";
export const THEME_KEY = "apicostguard_theme";

export const BUDGET_DEFAULTS = {
  dailyLimit: 10.0,
  weeklyLimit: 40.0,
  monthlyLimit: 200.0,
  currency: "USD",
};

export const NOTIFICATION_DEFAULTS = {
  thresholds: [80, 90, 100],
  enabled: true,
  sound: true,
};

export const THEME_OPTIONS = ["dark", "light", "system"] as const;
export type Theme = (typeof THEME_OPTIONS)[number];

export interface ProviderConfig {
  id: string;
  name: string;
  icon: string;
  color: string;
  kind: "cloud" | "local" | "desktop" | "litellm";
}

export const PROVIDERS: ProviderConfig[] = [
  { id: "openai", name: "OpenAI", icon: "🤖", color: "#10A37F", kind: "cloud" },
  { id: "anthropic", name: "Anthropic", icon: "🧠", color: "#8B5CF6", kind: "cloud" },
  { id: "gemini", name: "Gemini", icon: "✨", color: "#4285F4", kind: "cloud" },
  { id: "groq", name: "Groq", icon: "🌌", color: "#F97316", kind: "cloud" },
  { id: "openrouter", name: "OpenRouter", icon: "🔀", color: "#6366F1", kind: "cloud" },
  { id: "ollama", name: "Ollama", icon: "🦙", color: "#94A3B8", kind: "local" },
  { id: "lmstudio", name: "LM Studio", icon: "🏠", color: "#EC4899", kind: "local" },
  { id: "cursor", name: "Cursor", icon: "📝", color: "#06B6D4", kind: "desktop" },
  { id: "claude-code", name: "Claude Code", icon: "💻", color: "#F59E0B", kind: "desktop" },
  { id: "opencode", name: "OpenCode", icon: "⚡", color: "#F43E5C", kind: "desktop" },
  { id: "vscode", name: "VS Code", icon: "🔷", color: "#3B82F6", kind: "desktop" },
  { id: "litellm", name: "LiteLLM", icon: "🔗", color: "#6366F1", kind: "litellm" },
] as const;

export const CLOUD_PROVIDERS = PROVIDERS.filter((p) => p.kind === "cloud");

export const MAX_EVENTS = 1000;

export const API_BASE_URL = "http://localhost:8080";

export const LIVE_FEED_MAX = 6;
