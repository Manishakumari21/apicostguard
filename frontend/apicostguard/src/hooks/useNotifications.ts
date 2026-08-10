import { useCallback, useMemo } from "react";
import { useNotifications, useNotificationDispatch } from "../context/NotificationContext";
import { generateId } from "../utils/helpers";
import type { Notification, NotificationType } from "../types/notification";

export function useNotificationData() {
  return useNotifications();
}

export function useUnreadCount() {
  const { unreadCount } = useNotifications();
  return unreadCount;
}

export function useMarkAsRead() {
  const dispatch = useNotificationDispatch();
  return useCallback(
    (id: string) => dispatch({ type: "MARK_READ", payload: id }),
    [dispatch]
  );
}

export function useMarkAllRead() {
  const dispatch = useNotificationDispatch();
  return useCallback(() => dispatch({ type: "MARK_ALL_READ" }), [dispatch]);
}

export function useClearNotifications() {
  const dispatch = useNotificationDispatch();
  return useCallback(() => dispatch({ type: "CLEAR" }), [dispatch]);
}

export function useNotificationsByType(type: Notification["type"]) {
  const { items } = useNotifications();
  return useMemo(() => items.filter((n) => n.type === type), [items, type]);
}

export function useNotify() {
  const dispatch = useNotificationDispatch();
  return useCallback(
    (
      title: string,
      message: string,
      type: NotificationType = "system",
      provider?: string
    ) => {
      dispatch({
        type: "ADD_NOTIFICATION",
        payload: {
          id: generateId(),
          title,
          message,
          type,
          provider,
          timestamp: new Date().toISOString(),
          read: false,
        },
      });
    },
    [dispatch]
  );
}
