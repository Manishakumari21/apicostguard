import { useSettingsDispatch } from "../context/SettingsContext";
import { useCallback } from "react";
import type { Theme } from "../types/settings";

export function useSetTheme() {
  const dispatch = useSettingsDispatch();
  return useCallback(
    (theme: Theme) => dispatch({ type: "SET_THEME", payload: theme }),
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