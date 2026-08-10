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

export default function DataBridge() {
  const usageDispatch = useUsageDispatch();
  const settingsDispatch = useSettingsDispatch();
  const notifDispatch = useNotificationDispatch();
  const { refreshKey } = useUI();

  useEffect(() => {
    let stopped = false;

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
      } catch {
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

    async function loadUsage() {
      try {
        const events = await getUsage();
        if (!stopped) usageDispatch({ type: "SET_EVENTS", payload: events });
      } catch {
        /* keep defaults */
      }
    }

    async function loadProviders() {
      try {
        const tools = await getTools();
        const fromBackend = tools.filter((t) => t.connected).map((t) => t.name);
        const fromKeys = getApiKeys().map((k) => k.provider);
        if (!stopped) {
          settingsDispatch({
            type: "SET_CONNECTED_PROVIDERS",
            payload: Array.from(new Set([...fromBackend, ...fromKeys])),
          });
        }
      } catch {
        /* keep defaults */
      }
    }

    async function loadNotifications() {
      try {
        const items = await getNotifications();
        if (!stopped) notifDispatch({ type: "SET_NOTIFICATIONS", payload: items });
      } catch {
        /* keep defaults */
      }
    }

    loadSettings();
    loadUsage();
    loadProviders();
    loadNotifications();
    const timer = setInterval(() => {
      loadUsage();
      loadProviders();
      loadNotifications();
    }, 5000);

    return () => {
      stopped = true;
      clearInterval(timer);
    };
  }, [usageDispatch, settingsDispatch, notifDispatch, refreshKey]);

  return null;
}
