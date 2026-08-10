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

export function useUpdateWeeklyLimit() {
  const dispatch = useSettingsDispatch();
  return useCallback(
    (value: number) => dispatch({ type: "SET_WEEKLY_LIMIT", payload: value }),
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

export function useToggleMonitoring() {
  const dispatch = useSettingsDispatch();
  return useCallback(() => dispatch({ type: "TOGGLE_MONITORING" }), [dispatch]);
}

export function useToggleDesktopWidget() {
  const dispatch = useSettingsDispatch();
  return useCallback(() => dispatch({ type: "TOGGLE_DESKTOP_WIDGET" }), [dispatch]);
}

export function useToggleStartupOnBoot() {
  const dispatch = useSettingsDispatch();
  return useCallback(() => dispatch({ type: "TOGGLE_STARTUP_ON_BOOT" }), [dispatch]);
}

export function useToggleAutoUpdate() {
  const dispatch = useSettingsDispatch();
  return useCallback(() => dispatch({ type: "TOGGLE_AUTO_UPDATE" }), [dispatch]);
}

export function useToggleProvider() {
  const dispatch = useSettingsDispatch();
  return useCallback(
    (name: string) => dispatch({ type: "TOGGLE_PROVIDER", payload: name }),
    [dispatch]
  );
}

export function useAddConnectedProvider() {
  const dispatch = useSettingsDispatch();
  return useCallback(
    (name: string) => dispatch({ type: "ADD_CONNECTED_PROVIDER", payload: name }),
    [dispatch]
  );
}

export function useSetOnboarded() {
  const dispatch = useSettingsDispatch();
  return useCallback(
    (value: boolean) => dispatch({ type: "SET_ONBOARDED", payload: value }),
    [dispatch]
  );
}
