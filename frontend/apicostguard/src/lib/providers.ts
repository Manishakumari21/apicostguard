export interface ProviderMeta {
  id: string;
  name: string;
  initials: string;
  accent: string;
  soft: string;
  kind: "cloud" | "local";
  locale?: string;
}

const META: ProviderMeta[] = [
  {
    id: "openai",
    name: "OpenAI",
    initials: "OA",
    accent: "#7ceab5",
    soft: "rgba(124, 234, 181, 0.1)",
    kind: "cloud",
  },
  {
    id: "anthropic",
    name: "Anthropic",
    initials: "AN",
    accent: "#f2c777",
    soft: "rgba(242, 199, 119, 0.1)",
    kind: "cloud",
  },
  {
    id: "gemini",
    name: "Gemini",
    initials: "GE",
    accent: "#78a2ff",
    soft: "rgba(120, 162, 255, 0.1)",
    kind: "cloud",
  },
  {
    id: "groq",
    name: "Groq",
    initials: "GQ",
    accent: "#ff849c",
    soft: "rgba(255, 132, 156, 0.1)",
    kind: "cloud",
  },
  {
    id: "openrouter",
    name: "OpenRouter",
    initials: "OR",
    accent: "#a08fff",
    soft: "rgba(160, 143, 255, 0.1)",
    kind: "cloud",
  },
  {
    id: "ollama",
    name: "Ollama",
    initials: "OL",
    accent: "#cbc8dd",
    soft: "rgba(203, 200, 221, 0.09)",
    kind: "local",
    locale: "On this machine",
  },
  {
    id: "lmstudio",
    name: "LM Studio",
    initials: "LM",
    accent: "#ffb0d0",
    soft: "rgba(255, 176, 208, 0.09)",
    kind: "local",
    locale: "On this machine",
  },
];

const ALIASES: Record<string, string> = {
  chatgpt: "openai",
  claude: "anthropic",
  google: "gemini",
  "lm-studio": "lmstudio",
};

const BY_ID = new Map(META.map((item) => [item.id, item]));

export function providerMeta(idOrName: string): ProviderMeta {
  const normalized = idOrName.trim().toLowerCase();
  const direct = BY_ID.get(normalized) ?? BY_ID.get(ALIASES[normalized] ?? "");
  if (direct) return direct;

  const byName = META.find((item) => item.name.toLowerCase() === normalized);
  if (byName) return byName;

  const initials = idOrName
    .split(/[\s_-]+/)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return {
    id: normalized.replace(/\s+/g, "-"),
    name: idOrName,
    initials: initials || "??",
    accent: "#a08fff",
    soft: "rgba(160, 143, 255, 0.1)",
    kind: "cloud",
  };
}

export function providerKind(provider: string): "cloud" | "local" {
  return providerMeta(provider).kind;
}

export function isLocalProvider(provider: string): boolean {
  return providerKind(provider) === "local";
}

export const MODEL_ROUTES = [
  {
    family: "gemini*",
    provider: "gemini",
    examples: "gemini-2.5-flash",
    note: "Any model id beginning with “gemini”.",
  },
  {
    family: "gpt* · o1* · o3* · o4*",
    provider: "openai",
    examples: "gpt-4o",
    note: "OpenAI chat and reasoning model prefixes.",
  },
  {
    family: "claude*",
    provider: "anthropic",
    examples: "claude-3-5-sonnet",
    note: "Anthropic Claude model family.",
  },
  {
    family: "llama-3.3-70b-versatile · llama-3.1-8b-instant",
    provider: "groq",
    examples: "llama-3.3-70b-versatile",
    note: "Only these exact Groq-hosted ids are auto-detected.",
  },
  {
    family: "llama* (other)",
    provider: "ollama",
    examples: "llama3",
    note: "Other llama-prefixed ids resolve to the local Ollama adapter.",
  },
] as const;

export function routeProviderForModel(model: string): string | null {
  if (model.startsWith("gemini")) return "gemini";
  if (model.startsWith("gpt") || model.startsWith("o1") || model.startsWith("o3") || model.startsWith("o4")) {
    return "openai";
  }
  if (model.startsWith("claude")) return "anthropic";
  if (model === "llama-3.3-70b-versatile" || model === "llama-3.1-8b-instant") return "groq";
  if (model.startsWith("llama")) return "ollama";
  return null;
}
