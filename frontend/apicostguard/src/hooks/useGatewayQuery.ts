import { useEffect, useState } from "react";

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

export function useGatewayQuery<T>(
  fetcher: () => Promise<T>,
  deps: unknown[],
  intervalMs?: number
): QueryResult<T> {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    let alive = true;
    setLoading(true);

    const run = async () => {
      try {
        const value = await fetcher();
        if (!alive) return;
        setData(value);
        setError(null);
      } catch (err) {
        if (!alive) return;
        setError(errorMessage(err));
      } finally {
        if (alive) setLoading(false);
      }
    };

    void run();
    if (intervalMs) {
      const timer = window.setInterval(() => void run(), intervalMs);
      return () => {
        alive = false;
        window.clearInterval(timer);
      };
    }
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, tick]);

  return { data, error, loading, refetch: () => setTick((t) => t + 1) };
}