import type { BudgetSettings, NotificationSettings, Theme } from "../types/settings";
import { BUDGET_DEFAULTS, NOTIFICATION_DEFAULTS } from "../utils/constants";
import { backendGet, backendPost, type BackendSettings } from "./backend";
import { tauriInvoke } from "./tauri";

export interface SettingsPayload {
  budget: BudgetSettings;
  notifications: NotificationSettings;
  theme: Theme;
  widgetsEnabled: boolean;
  monitoringEnabled: boolean;
  pollIntervalSecs: number;
}

function defaults(): SettingsPayload {
  return {
    budget: { ...BUDGET_DEFAULTS },
    notifications: { ...NOTIFICATION_DEFAULTS },
    theme: "dark",
    widgetsEnabled: true,
    monitoringEnabled: true,
    pollIntervalSecs: 5,
  };
}

function toPayload(s: BackendSettings): SettingsPayload {
  return {
    budget: {
      ...BUDGET_DEFAULTS,
      monthlyLimit: s.monthly_limit_usd,
      dailyLimit: s.daily_limit_usd ?? BUDGET_DEFAULTS.dailyLimit,
    },
    notifications: {
      ...NOTIFICATION_DEFAULTS,
      thresholds: [s.alert_threshold_percent, ...NOTIFICATION_DEFAULTS.thresholds.slice(1)],
    },
    theme: "dark",
    widgetsEnabled: true,
    monitoringEnabled: true,
    pollIntervalSecs: 5,
  };
}

export async function getSettings(): Promise<SettingsPayload> {
  try {
    return toPayload(await backendGet<BackendSettings>("/api/settings"));
  } catch {
    try {
      return await tauriInvoke<SettingsPayload>("get_settings");
    } catch {
      return defaults();
    }
  }
}

export async function updateSettings(settings: SettingsPayload): Promise<SettingsPayload> {
  try {
    await backendPost<BackendSettings>("/api/settings", {
      monthly_limit_usd: settings.budget.monthlyLimit,
      daily_limit_usd: settings.budget.dailyLimit,
      alert_threshold_percent: settings.notifications.thresholds[0] ?? 80,
    });
    return settings;
  } catch {
    try {
      return await tauriInvoke<SettingsPayload>("update_settings", { settings });
    } catch {
      return settings;
    }
  }
}
