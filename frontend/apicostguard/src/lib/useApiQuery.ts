import { useCallback, useEffect, useRef, useState } from "react";
import { ApiError, describeError } from "../services/client";

export interface ApiQueryResult<T> {
  data: T | null;
  error: string | null;
  rawError: unknown;
  loading: boolean;
  refreshing: boolean;
  lastUpdated: Date | null;
  reload: () => void;
}

export const REFRESH_EVENT = "apicostguard:refresh";

export function requestGlobalRefresh(): void {
  window.dispatchEvent(new Event(REFRESH_EVENT));
}

export function useApiQuery<T>(
  loader: (signal: AbortSignal) => Promise<T>,
  deps: unknown[] = []
): ApiQueryResult<T> {
  const loaderRef = useRef(loader);
  loaderRef.current = loader;

  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [rawError, setRawError] = useState<unknown>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [tick, setTick] = useState(0);
  const hasData = useRef(false);

  const reload = useCallback(() => setTick((value) => value + 1), []);

  useEffect(() => {
    const controller = new AbortController();
    let active = true;

    if (!hasData.current) setLoading(true);
    setRefreshing(hasData.current);
    setError(null);
    setRawError(null);

    loaderRef
      .current(controller.signal)
      .then((value) => {
        if (!active) return;
        hasData.current = true;
        setData(value);
        setLastUpdated(new Date());
        setError(null);
        setRawError(null);
      })
      .catch((reason: unknown) => {
        if (!active) return;
        if (reason instanceof ApiError && reason.kind === "aborted") return;
        setError(describeError(reason));
        setRawError(reason);
      })
      .finally(() => {
        if (!active) return;
        setLoading(false);
        setRefreshing(false);
      });

    return () => {
      active = false;
      controller.abort();
    };
    // The caller owns the dependency list; loader is read through a ref.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tick, ...deps]);

  useEffect(() => {
    const handler = () => reload();
    window.addEventListener(REFRESH_EVENT, handler);
    return () => window.removeEventListener(REFRESH_EVENT, handler);
  }, [reload]);

  return { data, error, rawError, loading, refreshing, lastUpdated, reload };
}
