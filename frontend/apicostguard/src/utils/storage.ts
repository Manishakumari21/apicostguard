import type { ApiKey } from "../types/apiKey";
import { API_KEYS_KEY, EXTRA_SETTINGS_KEY, ONBOARDED_KEY, THEME_KEY } from "./constants";
import type { Theme } from "../types/settings";

export interface ExtraSettings {
  weeklyLimit: number;
  desktopWidget: boolean;
  startupOnBoot: boolean;
  autoUpdate: boolean;
}

const EXTRA_DEFAULTS: ExtraSettings = {
  weeklyLimit: 40.0,
  desktopWidget: true,
  startupOnBoot: false,
  autoUpdate: false,
};

export function loadTheme(): Theme {
  const value = localStorage.getItem(THEME_KEY);
  if (value === "dark" || value === "light" || value === "system") return value;
  return "dark";
}

export function saveTheme(theme: Theme): void {
  localStorage.setItem(THEME_KEY, theme);
}

export function loadOnboarded(): boolean {
  return localStorage.getItem(ONBOARDED_KEY) === "1";
}

export function saveOnboarded(value: boolean): void {
  if (value) localStorage.setItem(ONBOARDED_KEY, "1");
  else localStorage.removeItem(ONBOARDED_KEY);
}

export function loadExtraSettings(): ExtraSettings {
  try {
    const raw = localStorage.getItem(EXTRA_SETTINGS_KEY);
    if (!raw) return { ...EXTRA_DEFAULTS };
    return { ...EXTRA_DEFAULTS, ...(JSON.parse(raw) as Partial<ExtraSettings>) };
  } catch {
    return { ...EXTRA_DEFAULTS };
  }
}

export function saveExtraSettings(settings: ExtraSettings): void {
  localStorage.setItem(EXTRA_SETTINGS_KEY, JSON.stringify(settings));
}

export function loadApiKeys(): ApiKey[] {
  try {
    const raw = localStorage.getItem(API_KEYS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    const items = Array.isArray(parsed) ? (parsed as Partial<ApiKey>[]) : [];
    return items
      .filter((k) => k && typeof k.provider === "string")
      .map((k) => ({
        id: k.id ?? "",
        provider: k.provider as string,
        createdAt: k.createdAt ?? new Date().toISOString(),
        lastUsed: k.lastUsed,
      }))
      .filter((k) => !("key" in k));
  } catch {
    return [];
  }
}

export function saveApiKeys(keys: ApiKey[]): void {
  const safe = keys.map(({ id, provider, createdAt, lastUsed }) => ({
    id,
    provider,
    createdAt,
    lastUsed,
  }));
  localStorage.setItem(API_KEYS_KEY, JSON.stringify(safe));
}
