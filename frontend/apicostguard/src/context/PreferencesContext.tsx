import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

export type Density = "comfortable" | "compact";

export interface Preferences {
  ambient: boolean;
  density: Density;
  highContrast: boolean;
  reduceMotion: boolean;
}

interface PreferencesContextValue {
  preferences: Preferences;
  setPreference: <K extends keyof Preferences>(key: K, value: Preferences[K]) => void;
  resetPreferences: () => void;
}

const STORAGE_KEY = "apicostguard.interface.v1";

const DEFAULTS: Preferences = {
  ambient: true,
  density: "comfortable",
  highContrast: false,
  reduceMotion: false,
};

const PreferencesContext = createContext<PreferencesContextValue | null>(null);

function loadPreferences(): Preferences {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULTS;
    const parsed = JSON.parse(raw) as Partial<Preferences>;
    return {
      ambient: typeof parsed.ambient === "boolean" ? parsed.ambient : DEFAULTS.ambient,
      density: parsed.density === "compact" ? "compact" : "comfortable",
      highContrast: Boolean(parsed.highContrast),
      reduceMotion: Boolean(parsed.reduceMotion),
    };
  } catch {
    return DEFAULTS;
  }
}

export function PreferencesProvider({ children }: { children: ReactNode }) {
  const [preferences, setPreferences] = useState<Preferences>(loadPreferences);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(preferences));
    } catch {
      // A blocked storage API should not break the UI.
    }
    const root = document.documentElement;
    root.dataset.ambient = preferences.ambient ? "on" : "off";
    root.dataset.density = preferences.density;
    root.dataset.contrast = preferences.highContrast ? "high" : "normal";
  }, [preferences]);

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const apply = () => {
      document.documentElement.dataset.reduceMotion = String(preferences.reduceMotion || media.matches);
    };
    apply();
    media.addEventListener("change", apply);
    return () => media.removeEventListener("change", apply);
  }, [preferences.reduceMotion]);

  const setPreference = useCallback(<K extends keyof Preferences>(key: K, value: Preferences[K]) => {
    setPreferences((current) => ({ ...current, [key]: value }));
  }, []);

  const resetPreferences = useCallback(() => setPreferences(DEFAULTS), []);

  const value = useMemo(
    () => ({ preferences, setPreference, resetPreferences }),
    [preferences, setPreference, resetPreferences]
  );

  return <PreferencesContext.Provider value={value}>{children}</PreferencesContext.Provider>;
}

export function usePreferences(): PreferencesContextValue {
  const context = useContext(PreferencesContext);
  if (!context) throw new Error("usePreferences must be used inside PreferencesProvider");
  return context;
}
