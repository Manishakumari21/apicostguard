import { useCallback, useMemo } from "react";
import { useNotifications, useNotificationDispatch } from "../context/NotificationContext";
import type { Notification } from "../types/notification";

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
