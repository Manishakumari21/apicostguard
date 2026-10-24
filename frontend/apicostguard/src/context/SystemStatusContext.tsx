import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { fetchGatewayStatus } from "../services/api";
import type { GatewayStatus } from "../services/types";
import { REFRESH_EVENT } from "../lib/useApiQuery";

interface SystemStatusValue {
  status: GatewayStatus | null;
  checking: boolean;
  refreshStatus: () => Promise<void>;
}

const SystemStatusContext = createContext<SystemStatusValue | null>(null);

export function SystemStatusProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<GatewayStatus | null>(null);
  const [checking, setChecking] = useState(true);
  const inFlight = useRef(false);

  const refreshStatus = useCallback(async () => {
    if (inFlight.current) return;
    inFlight.current = true;
    setChecking(true);
    try {
      const next = await fetchGatewayStatus();
      setStatus(next);
    } catch {
      // Aborted checks are expected during teardown; keep the last known status.
    } finally {
      inFlight.current = false;
      setChecking(false);
    }
  }, []);

  useEffect(() => {
    void refreshStatus();
    const interval = window.setInterval(() => void refreshStatus(), 30_000);
    const onRefresh = () => void refreshStatus();
    window.addEventListener(REFRESH_EVENT, onRefresh);
    return () => {
      window.clearInterval(interval);
      window.removeEventListener(REFRESH_EVENT, onRefresh);
    };
  }, [refreshStatus]);

  const value = useMemo(() => ({ status, checking, refreshStatus }), [status, checking, refreshStatus]);

  return <SystemStatusContext.Provider value={value}>{children}</SystemStatusContext.Provider>;
}

export function useSystemStatus(): SystemStatusValue {
  const context = useContext(SystemStatusContext);
  if (!context) throw new Error("useSystemStatus must be used inside SystemStatusProvider");
  return context;
}
