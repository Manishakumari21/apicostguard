import { useSettings as useContextSettings, useSettingsDispatch } from "../context/SettingsContext";
import { useCallback } from "react";
import type { BudgetSettings, NotificationSettings, Theme } from "../types/settings";

export function useSettingsData() {
  return useContextSettings();
}

export function useUpdateBudget() {
  const dispatch = useSettingsDispatch();
  return useCallback(
    (patch: Partial<BudgetSettings>) => dispatch({ type: "SET_BUDGET", payload: patch }),
    [dispatch]
  );
}

export function useUpdateNotifications() {
  const dispatch = useSettingsDispatch();
  return useCallback(
    (patch: Partial<NotificationSettings>) => dispatch({ type: "SET_NOTIFICATIONS", payload: patch }),
    [dispatch]
  );
}

export function useSetTheme() {
  const dispatch = useSettingsDispatch();
  return useCallback(
    (theme: Theme) => dispatch({ type: "SET_THEME", payload: theme }),
    [dispatch]
  );
}

export function useToggleWidget() {
  const dispatch = useSettingsDispatch();
  return useCallback(() => dispatch({ type: "TOGGLE_WIDGET" }), [dispatch]);
}

export function useToggleProvider() {
  const dispatch = useSettingsDispatch();
  return useCallback(
    (name: string) => dispatch({ type: "TOGGLE_PROVIDER", payload: name }),
    [dispatch]
  );
}
