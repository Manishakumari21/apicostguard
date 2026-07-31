export const STORAGE_KEY = "apicostguard_settings";

export const BUDGET_DEFAULTS = {
  dailyLimit: 10.0,
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

export const PROVIDERS = [
  { name: "ChatGPT", type: "browser" as const, icon: "🤖", color: "emerald" },
  { name: "Gemini", type: "browser" as const, icon: "✨", color: "violet" },
  { name: "Claude", type: "browser" as const, icon: "🧠", color: "orange" },
  { name: "Cursor", type: "desktop" as const, icon: "📝", color: "cyan" },
  { name: "Claude Code", type: "desktop" as const, icon: "💻", color: "amber" },
  { name: "OpenCode", type: "desktop" as const, icon: "⚡", color: "rose" },
  { name: "VS Code", type: "desktop" as const, icon: "🔷", color: "blue" },
  { name: "Ollama", type: "local" as const, icon: "🦙", color: "teal" },
  { name: "LM Studio", type: "local" as const, icon: "🏠", color: "pink" },
  { name: "LiteLLM", type: "litellm" as const, icon: "🔗", color: "indigo" },
] as const;

export const MAX_EVENTS = 1000;

export const API_BASE_URL = "http://localhost:8080";
