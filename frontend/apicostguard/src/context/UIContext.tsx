import { createContext, useCallback, useContext, useState, type ReactNode } from "react";

export interface UIState {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  refreshKey: number;
  triggerRefresh: () => void;
}

const UIContext = createContext<UIState | null>(null);

export function UIProvider({ children }: { children: ReactNode }) {
  const [searchQuery, setSearchQuery] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);

  const triggerRefresh = useCallback(() => {
    setRefreshKey((k) => k + 1);
  }, []);

  return (
    <UIContext.Provider value={{ searchQuery, setSearchQuery, refreshKey, triggerRefresh }}>
      {children}
    </UIContext.Provider>
  );
}

export function useUI(): UIState {
  const ctx = useContext(UIContext);
  if (!ctx) throw new Error("useUI must be used within a UIProvider");
  return ctx;
}
