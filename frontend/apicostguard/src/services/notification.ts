import type { Notification } from "../types/notification";
import { backendGet, backendPost, type BackendNotification } from "./backend";
import { tauriInvoke } from "./tauri";

function toNotification(n: Notification): Notification {
  return {
    ...n,
    timestamp:
      typeof n.timestamp === "number"
        ? new Date(n.timestamp).toISOString()
        : n.timestamp,
  };
}

function backendToNotification(n: BackendNotification): Notification {
  const type =
    n.level === "warning" || n.level === "critical" ? "warning" : "system";
  return {
    id: n.id,
    type,
    title: n.title,
    message: n.body,
    timestamp: n.sent_at,
    read: n.read,
    provider: n.tool_id || undefined,
  };
}

export async function getNotifications(): Promise<Notification[]> {
  try {
    const items = await backendGet<BackendNotification[]>("/api/notifications?limit=50");
    return items.map(backendToNotification);
  } catch {
    try {
      const items = await tauriInvoke<Notification[]>("get_notifications");
      return items.map(toNotification);
    } catch {
      return [];
    }
  }
}

export async function sendTestNotification(): Promise<void> {
  try {
    await backendPost("/api/notifications/send", {
      title: "API CostGuard",
      message: "Test notification from API CostGuard",
      level: "info",
    });
    return;
  } catch {
    try {
      await tauriInvoke("send_test_notification");
    } catch {
      return;
    }
  }
}
