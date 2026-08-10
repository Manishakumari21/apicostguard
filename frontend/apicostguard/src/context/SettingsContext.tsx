import { createContext, useContext, useEffect, useReducer, type Dispatch, type ReactNode } from "react";
import { BUDGET_DEFAULTS, NOTIFICATION_DEFAULTS } from "../utils/constants";
import {
  loadExtraSettings,
  loadOnboarded,
  loadTheme,
  saveExtraSettings,
  saveOnboarded,
  saveTheme,
} from "../utils/storage";
import type { BudgetSettings, NotificationSettings, Theme } from "../types/settings";

export interface SettingsState {
  budget: BudgetSettings;
  weeklyLimit: number;
  notifications: NotificationSettings;
  theme: Theme;
  widgetsEnabled: boolean;
  monitoringEnabled: boolean;
  desktopWidget: boolean;
  startupOnBoot: boolean;
  autoUpdate: boolean;
  pollIntervalSecs: number;
  connectedProviders: string[];
  onboarded: boolean;
}

export type SettingsAction =
  | { type: "HYDRATE"; payload: Partial<SettingsState> }
  | { type: "SET_BUDGET"; payload: Partial<BudgetSettings> }
  | { type: "SET_WEEKLY_LIMIT"; payload: number }
  | { type: "SET_NOTIFICATIONS"; payload: Partial<NotificationSettings> }
  | { type: "SET_THEME"; payload: Theme }
  | { type: "TOGGLE_WIDGET" }
  | { type: "TOGGLE_MONITORING" }
  | { type: "TOGGLE_DESKTOP_WIDGET" }
  | { type: "TOGGLE_STARTUP_ON_BOOT" }
  | { type: "TOGGLE_AUTO_UPDATE" }
  | { type: "TOGGLE_PROVIDER"; payload: string }
  | { type: "ADD_CONNECTED_PROVIDER"; payload: string }
  | { type: "SET_CONNECTED_PROVIDERS"; payload: string[] }
  | { type: "SET_ONBOARDED"; payload: boolean };

function initState(): SettingsState {
  const extra = loadExtraSettings();
  return {
    budget: { ...BUDGET_DEFAULTS },
    weeklyLimit: extra.weeklyLimit,
    notifications: { ...NOTIFICATION_DEFAULTS },
    theme: loadTheme(),
    widgetsEnabled: true,
    monitoringEnabled: true,
    desktopWidget: extra.desktopWidget,
    startupOnBoot: extra.startupOnBoot,
    autoUpdate: extra.autoUpdate,
    pollIntervalSecs: 5,
    connectedProviders: [],
    onboarded: loadOnboarded(),
  };
}

function reducer(state: SettingsState, action: SettingsAction): SettingsState {
  switch (action.type) {
    case "HYDRATE":
      return { ...state, ...action.payload };
    case "SET_BUDGET":
      return { ...state, budget: { ...state.budget, ...action.payload } };
    case "SET_WEEKLY_LIMIT":
      return { ...state, weeklyLimit: action.payload };
    case "SET_NOTIFICATIONS":
      return { ...state, notifications: { ...state.notifications, ...action.payload } };
    case "SET_THEME":
      return { ...state, theme: action.payload };
    case "TOGGLE_WIDGET":
      return { ...state, widgetsEnabled: !state.widgetsEnabled };
    case "TOGGLE_MONITORING":
      return { ...state, monitoringEnabled: !state.monitoringEnabled };
    case "TOGGLE_DESKTOP_WIDGET":
      return { ...state, desktopWidget: !state.desktopWidget };
    case "TOGGLE_STARTUP_ON_BOOT":
      return { ...state, startupOnBoot: !state.startupOnBoot };
    case "TOGGLE_AUTO_UPDATE":
      return { ...state, autoUpdate: !state.autoUpdate };
    case "TOGGLE_PROVIDER": {
      const connected = state.connectedProviders.includes(action.payload)
        ? state.connectedProviders.filter((p) => p !== action.payload)
        : [...state.connectedProviders, action.payload];
      return { ...state, connectedProviders: connected };
    }
    case "ADD_CONNECTED_PROVIDER":
      if (state.connectedProviders.includes(action.payload)) return state;
      return {
        ...state,
        connectedProviders: [...state.connectedProviders, action.payload],
      };
    case "SET_CONNECTED_PROVIDERS":
      return { ...state, connectedProviders: action.payload };
    case "SET_ONBOARDED":
      return { ...state, onboarded: action.payload };
    default:
      return state;
  }
}

const SettingsContext = createContext<SettingsState | null>(null);
const SettingsDispatchContext = createContext<Dispatch<SettingsAction> | null>(null);

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, undefined, initState);

  useEffect(() => {
    saveExtraSettings({
      weeklyLimit: state.weeklyLimit,
      desktopWidget: state.desktopWidget,
      startupOnBoot: state.startupOnBoot,
      autoUpdate: state.autoUpdate,
    });
  }, [state.weeklyLimit, state.desktopWidget, state.startupOnBoot, state.autoUpdate]);

  useEffect(() => {
    saveOnboarded(state.onboarded);
  }, [state.onboarded]);

  useEffect(() => {
    const root = document.documentElement;
    const prefersLight = window.matchMedia("(prefers-color-scheme: light)");
    const apply = () => {
      const resolved = state.theme === "system" ? (prefersLight.matches ? "light" : "dark") : state.theme;
      root.classList.toggle("theme-light", resolved === "light");
      root.classList.toggle("theme-dark", resolved !== "light");
    };
    apply();
    saveTheme(state.theme);
    if (state.theme === "system") {
      prefersLight.addEventListener("change", apply);
      return () => prefersLight.removeEventListener("change", apply);
    }
  }, [state.theme]);

  return (
    <SettingsContext.Provider value={state}>
      <SettingsDispatchContext.Provider value={dispatch}>
        {children}
      </SettingsDispatchContext.Provider>
    </SettingsContext.Provider>
  );
}

export function useSettings(): SettingsState {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error("useSettings must be used within a SettingsProvider");
  return ctx;
}

export function useSettingsDispatch(): Dispatch<SettingsAction> {
  const ctx = useContext(SettingsDispatchContext);
  if (!ctx) throw new Error("useSettingsDispatch must be used within a SettingsProvider");
  return ctx;
}
