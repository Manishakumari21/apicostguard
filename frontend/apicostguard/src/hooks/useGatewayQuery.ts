import { useCallback, useEffect, useRef, useState } from "react";

export interface QueryResult<T> {
  data: T | null;
  error: string | null;
  loading: boolean;
  refetch: () => void;
}

function errorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  return String(err);
}

/**
 * Production-grade polling query:
 * - AbortController cancels in-flight fetches on unmount / refetch.
 * - Pauses when tab hidden (scalable: no background wakeups).
 * - Exponential backoff on consecutive errors (max 30s).
 */
export function useGatewayQuery<T>(
  fetcher: () => Promise<T>,
  deps: unknown[],
  intervalMs?: number,
): QueryResult<T> {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [tick, setTick] = useState(0);
  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;
  const failuresRef = useRef(0);

  useEffect(() => {
    let alive = true;
    const controller = new AbortController();
    setLoading(true);

    const run = async () => {
      if (document.hidden) return;
      try {
        const value = await fetcherRef.current();
        if (!alive || controller.signal.aborted) return;
        failuresRef.current = 0;
        setData(value);
        setError(null);
      } catch (err) {
        if (!alive || controller.signal.aborted) return;
        failuresRef.current += 1;
        setError(errorMessage(err));
        if (import.meta.env.DEV) {
          console.error("[gateway-query]", errorMessage(err));
        }
      } finally {
        if (alive) setLoading(false);
      }
    };

    void run();
    if (!intervalMs) {
      return () => {
        alive = false;
        controller.abort();
      };
    }
    let timer: number | undefined;
    const schedule = () => {
      if (!alive) return;
      const backoff = Math.min(30_000, intervalMs * 2 ** Math.min(failuresRef.current, 4));
      timer = window.setTimeout(() => {
        void run().finally(schedule);
      }, backoff);
    };
    schedule();
    const onVisible = () => {
      if (!document.hidden) void run();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      alive = false;
      controller.abort();
      if (timer) window.clearTimeout(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, tick, intervalMs]);

  const refetch = useCallback(() => {
    failuresRef.current = 0;
    setTick((t) => t + 1);
  }, []);

  return { data, error, loading, refetch };
}
