import { PROVIDERS, type ProviderConfig } from "./constants";
import { palette } from "./palette";

export function generateId(): string {
  return crypto.randomUUID();
}

const LEGACY_ALIASES: Record<string, string> = {
  chatgpt: "openai",
  claude: "anthropic",
};

export function getProviderConfig(name: string): ProviderConfig {
  const lower = name.toLowerCase();
  const byId = PROVIDERS.find((p) => p.id.toLowerCase() === lower);
  if (byId) return byId;
  const byName = PROVIDERS.find((p) => p.name.toLowerCase() === lower);
  if (byName) return byName;
  const aliasId = LEGACY_ALIASES[lower];
  if (aliasId) {
    const byAlias = PROVIDERS.find((p) => p.id === aliasId);
    if (byAlias) return byAlias;
  }
  return { id: lower.replace(/\s+/g, "-"), name, icon: "🔌", color: palette.slate, kind: "cloud" };
}

export function getProviderColor(name: string): string {
  return getProviderConfig(name).color;
}

export function getProviderIcon(name: string): string {
  return getProviderConfig(name).icon;
}
