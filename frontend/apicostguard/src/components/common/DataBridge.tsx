import { useEffect } from "react";
import { useUsageDispatch } from "../../context/UsageContext";
import { useSettingsDispatch } from "../../context/SettingsContext";
import { useNotificationDispatch } from "../../context/NotificationContext";
import { useUI } from "../../context/UIContext";
import { getUsage, getTools } from "../../services/monitor";
import { getSettings } from "../../services/settings";
import { getNotifications } from "../../services/notification";
import { getApiKeys } from "../../services/apiKeys";
import { loadExtraSettings, loadOnboarded } from "../../utils/storage";

const DEFAULT_POLL_MS = 10_000;
const MIN_POLL_MS = 5_000;

export default function DataBridge() {
  const usageDispatch = useUsageDispatch();
  const settingsDispatch = useSettingsDispatch();
  const notifDispatch = useNotificationDispatch();
  const { refreshKey } = useUI();

  useEffect(() => {
    let stopped = false;
    let timer: number | undefined;
    let failures = 0;

    async function loadSettings() {
      try {
        const s = await getSettings();
        const extra = loadExtraSettings();
        if (stopped) return;
        settingsDispatch({
          type: "HYDRATE",
          payload: {
            budget: s.budget,
            notifications: s.notifications,
            theme: s.theme,
            widgetsEnabled: s.widgetsEnabled,
            monitoringEnabled: s.monitoringEnabled,
            pollIntervalSecs: s.pollIntervalSecs,
            weeklyLimit: extra.weeklyLimit,
            desktopWidget: extra.desktopWidget,
            startupOnBoot: extra.startupOnBoot,
            autoUpdate: extra.autoUpdate,
            onboarded: loadOnboarded(),
          },
        });
      } catch (err) {
        if (import.meta.env.DEV) console.error("[databridge] settings failed", err);
        const extra = loadExtraSettings();
        if (!stopped) {
          settingsDispatch({
            type: "HYDRATE",
            payload: {
              weeklyLimit: extra.weeklyLimit,
              desktopWidget: extra.desktopWidget,
              startupOnBoot: extra.startupOnBoot,
              autoUpdate: extra.autoUpdate,
              onboarded: loadOnboarded(),
            },
          });
        }
      }
    }

    async function pollOnce() {
      if (stopped || document.hidden) return;
      try {
        const [events, tools, items] = await Promise.all([
          getUsage(),
          getTools().catch(() => []),
          getNotifications().catch(() => []),
        ]);
        if (stopped) return;
        failures = 0;
        usageDispatch({ type: "SET_EVENTS", payload: events });
        const fromBackend = tools.filter((t) => t.connected).map((t) => t.name);
        const fromKeys = getApiKeys().map((k) => k.provider);
        settingsDispatch({
          type: "SET_CONNECTED_PROVIDERS",
          payload: Array.from(new Set([...fromBackend, ...fromKeys])),
        });
        notifDispatch({ type: "SET_NOTIFICATIONS", payload: items });
      } catch (err) {
        failures += 1;
        if (import.meta.env.DEV) console.error("[databridge] poll failed", err);
      }
    }

    async function boot() {
      await loadSettings();
      await pollOnce();
      const schedule = () => {
        if (stopped) return;
        // Back off on repeated failures; never poll faster than MIN_POLL_MS.
        const base = Math.max(DEFAULT_POLL_MS, MIN_POLL_MS);
        const delay = Math.min(60_000, base * 2 ** Math.min(failures, 3));
        timer = window.setTimeout(() => {
          void pollOnce().finally(schedule);
        }, delay);
      };
      schedule();
    }

    const onVisible = () => {
      if (!document.hidden) void pollOnce();
    };
    document.addEventListener("visibilitychange", onVisible);
    void boot();

    return () => {
      stopped = true;
      if (timer) window.clearTimeout(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [usageDispatch, settingsDispatch, notifDispatch, refreshKey]);

  return null;
}
