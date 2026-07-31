import { useCallback, useMemo } from "react";
import { useUsage as useContextUsage, useUsageDispatch } from "../context/UsageContext";
import type { UsageEvent } from "../types/usage";

export function useUsageData() {
  return useContextUsage();
}

export function useAddEvent() {
  const dispatch = useUsageDispatch();
  return useCallback(
    (event: UsageEvent) => dispatch({ type: "ADD_EVENT", payload: event }),
    [dispatch]
  );
}

export function useRecentEvents(count = 20) {
  const { eventsById, eventIds } = useContextUsage();
  return useMemo(
    () => eventIds.slice(-count).map((id) => eventsById[id]),
    [eventsById, eventIds, count]
  );
}

export function useProviderStats(provider: string) {
  const { eventsById, eventIds } = useContextUsage();
  return useMemo(() => {
    let cost = 0;
    let tokens = 0;
    let count = 0;
    for (const id of eventIds) {
      const e = eventsById[id];
      if (e.provider === provider) {
        cost += e.cost;
        tokens += e.inputTokens + e.outputTokens;
        count++;
      }
    }
    return { cost: +cost.toFixed(6), tokens, count };
  }, [eventsById, eventIds, provider]);
}

export function useCostByProvider() {
  const { eventsById, eventIds } = useContextUsage();
  return useMemo(() => {
    const map: Record<string, number> = {};
    for (const id of eventIds) {
      const e = eventsById[id];
      map[e.provider] = (map[e.provider] ?? 0) + e.cost;
    }
    return Object.entries(map)
      .map(([name, cost]) => ({ name, cost: +cost.toFixed(6) }))
      .sort((a, b) => b.cost - a.cost);
  }, [eventsById, eventIds]);
}
