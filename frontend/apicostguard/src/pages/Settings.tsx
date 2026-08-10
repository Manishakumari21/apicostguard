import { useEffect, useRef, useState } from "react";
import {
  useSettingsData,
  useUpdateBudget,
  useUpdateNotifications,
  useSetTheme,
  useToggleMonitoring,
  useToggleWidget,
  useToggleDesktopWidget,
  useToggleStartupOnBoot,
  useToggleAutoUpdate,
} from "../hooks/useSettings";
import { useUsage } from "../context/UsageContext";
import { sendTestNotification } from "../services/notification";
import { useNotify } from "../hooks/useNotifications";
import { updateSettings } from "../services/settings";
import type { Theme } from "../types/settings";
import Toggle from "../components/common/Toggle";
import Button from "../components/common/Button";

const CURRENCIES = ["USD", "EUR", "GBP", "INR", "JPY", "AUD", "CAD"];

export default function Settings() {
  const settings = useSettingsData();
  const usage = useUsage();
  const updateBudget = useUpdateBudget();
  const updateNotifications = useUpdateNotifications();
  const setTheme = useSetTheme();
  const toggleMonitoring = useToggleMonitoring();
  const toggleWidget = useToggleWidget();
  const toggleDesktopWidget = useToggleDesktopWidget();
  const toggleStartupOnBoot = useToggleStartupOnBoot();
  const toggleAutoUpdate = useToggleAutoUpdate();
  const [sent, setSent] = useState(false);
  const notify = useNotify();
  const firstRender = useRef(true);

  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    updateSettings({
      budget: settings.budget,
      notifications: settings.notifications,
      theme: settings.theme,
      widgetsEnabled: settings.widgetsEnabled,
      monitoringEnabled: settings.monitoringEnabled,
      pollIntervalSecs: settings.pollIntervalSecs,
    }).catch(() => {});
  }, [settings]);

  async function testNotification() {
    await sendTestNotification();
    notify(
      "Test notification",
      "Monitoring is working — budget and provider alerts will look like this.",
      "system"
    );
    setSent(true);
    setTimeout(() => setSent(false), 2500);
  }

  function exportLogs() {
    const events = Object.values(usage.eventsById);
    const blob = new Blob(
      [JSON.stringify({ exportedAt: new Date().toISOString(), events }, null, 2)],
      { type: "application/json" }
    );
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `apicostguard-logs-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <h1 className="text-2xl font-bold text-ink">Settings</h1>

      <div className="p-4 rounded-xl bg-card/80 border border-line/50">
        <h3 className="text-sm font-semibold text-muted mb-4">Monitoring</h3>
        <div className="space-y-4">
          <Toggle
            checked={settings.monitoringEnabled}
            onChange={toggleMonitoring}
            label="Monitor local models (Ollama / LM Studio)"
          />
          <div className="flex items-center gap-3">
            <Button size="sm" variant="secondary" onClick={testNotification}>
              Send test notification
            </Button>
            {sent && <span className="text-xs text-success">Notification sent</span>}
          </div>
        </div>
      </div>

      <div className="p-4 rounded-xl bg-card/80 border border-line/50">
        <h3 className="text-sm font-semibold text-muted mb-4">Budget</h3>
        <div className="space-y-4">
          <label className="block">
            <span className="text-sm text-muted">Currency</span>
            <select
              value={settings.budget.currency}
              onChange={(e) => updateBudget({ currency: e.target.value })}
              className="mt-1 w-full px-3 py-2 rounded-lg bg-canvas/50 border border-line/60 text-ink text-sm focus:outline-none focus:border-success/50"
            >
              {CURRENCIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="text-sm text-muted">Daily Limit ({settings.budget.currency})</span>
            <input
              type="number"
              min={0}
              step="0.01"
              value={settings.budget.dailyLimit}
              onChange={(e) => updateBudget({ dailyLimit: Number(e.target.value) })}
              className="mt-1 w-full px-3 py-2 rounded-lg bg-canvas/50 border border-line/60 text-ink text-sm focus:outline-none focus:border-success/50"
            />
          </label>
          <label className="block">
            <span className="text-sm text-muted">Monthly Limit ({settings.budget.currency})</span>
            <input
              type="number"
              min={0}
              step="0.01"
              value={settings.budget.monthlyLimit}
              onChange={(e) => updateBudget({ monthlyLimit: Number(e.target.value) })}
              className="mt-1 w-full px-3 py-2 rounded-lg bg-canvas/50 border border-line/60 text-ink text-sm focus:outline-none focus:border-success/50"
            />
          </label>
          <p className="text-xs text-faint">
            Limits are compared against estimated local-model usage. You get a
            desktop notification at each threshold (80%, 90%, 100%).
          </p>
        </div>
      </div>

      <div className="p-4 rounded-xl bg-card/80 border border-line/50">
        <h3 className="text-sm font-semibold text-muted mb-4">Notifications</h3>
        <div className="space-y-3">
          <Toggle
            checked={settings.notifications.enabled}
            onChange={(checked) => updateNotifications({ enabled: checked })}
            label="Enable notifications"
          />
          <Toggle
            checked={settings.notifications.sound}
            onChange={(checked) => updateNotifications({ sound: checked })}
            label="Play sound"
          />
        </div>
      </div>

      <div className="p-4 rounded-xl bg-card/80 border border-line/50">
        <h3 className="text-sm font-semibold text-muted mb-4">Appearance</h3>
        <div className="space-y-3">
          <p className="text-xs text-muted">Theme</p>
          <div className="flex gap-2">
            {(["dark", "light", "system"] as Theme[]).map((theme) => (
              <Button
                key={theme}
                variant={settings.theme === theme ? "primary" : "secondary"}
                size="sm"
                onClick={() => setTheme(theme)}
              >
                {theme}
              </Button>
            ))}
          </div>
        </div>
      </div>

      <div className="p-4 rounded-xl bg-card/80 border border-line/50">
        <h3 className="text-sm font-semibold text-muted mb-4">Startup & Widget</h3>
        <div className="space-y-3">
          <Toggle
            checked={settings.startupOnBoot}
            onChange={toggleStartupOnBoot}
            label="Launch on startup"
          />
          <Toggle
            checked={settings.widgetsEnabled}
            onChange={toggleWidget}
            label="Floating widget"
          />
          <Toggle
            checked={settings.desktopWidget}
            onChange={toggleDesktopWidget}
            label="Desktop widget"
          />
          <Toggle
            checked={settings.autoUpdate}
            onChange={toggleAutoUpdate}
            label="Auto-update"
          />
        </div>
      </div>

      <div className="p-4 rounded-xl bg-card/80 border border-line/50">
        <h3 className="text-sm font-semibold text-muted mb-4">Data</h3>
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm text-muted">Export usage logs</p>
            <p className="text-xs text-faint">
              {usage.eventIds.length} events · JSON file
            </p>
          </div>
          <Button size="sm" variant="secondary" onClick={exportLogs}>
            Export
          </Button>
        </div>
      </div>

      <div className="p-4 rounded-xl bg-card/80 border border-line/50">
        <h3 className="text-sm font-semibold text-muted mb-3">About</h3>
        <div className="space-y-1 text-sm">
          <p className="text-ink font-semibold">APICostGuard</p>
          <p className="text-muted">Track AI usage and costs across cloud and local models.</p>
          <p className="text-faint">Version 0.1.0 · Rosé Pine theme</p>
        </div>
      </div>
    </div>
  );
}
