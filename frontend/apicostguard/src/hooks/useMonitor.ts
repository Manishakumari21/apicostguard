import { useCallback, useMemo } from "react";
import { useUsage as useContextUsage, useUsageDispatch } from "../context/UsageContext";
import { getProviderColor } from "../utils/helpers";
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

export function useAllEvents(): UsageEvent[] {
  const { eventsById, eventIds } = useContextUsage();
  return useMemo(
    () => eventIds.map((id) => eventsById[id]),
    [eventsById, eventIds]
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
      .map(([name, cost]) => ({
        name,
        cost: +cost.toFixed(6),
        color: getProviderColor(name),
      }))
      .sort((a, b) => b.cost - a.cost);
  }, [eventsById, eventIds]);
}

export interface ProviderAggregate {
  name: string;
  cost: number;
  tokens: number;
  requests: number;
  todayCost: number;
  monthCost: number;
  models: string[];
}

export function useProviderAggregates(): ProviderAggregate[] {
  const events = useAllEvents();
  return useMemo(() => {
    const map: Record<string, ProviderAggregate> = {};
    const now = new Date();
    const today = now.toISOString().slice(0, 10);
    const month = now.toISOString().slice(0, 7);
    for (const e of events) {
      const agg = (map[e.provider] ??= {
        name: e.provider,
        cost: 0,
        tokens: 0,
        requests: 0,
        todayCost: 0,
        monthCost: 0,
        models: [],
      });
      agg.cost += e.cost;
      agg.tokens += e.inputTokens + e.outputTokens;
      agg.requests += 1;
      if (e.timestamp.slice(0, 10) === today) agg.todayCost += e.cost;
      if (e.timestamp.slice(0, 7) === month) agg.monthCost += e.cost;
      if (!agg.models.includes(e.model)) agg.models.push(e.model);
    }
    return Object.values(map).sort((a, b) => b.cost - a.cost);
  }, [events]);
}

function keyToLabel(key: string): string {
  const d = new Date(key);
  return d.toLocaleDateString([], { month: "short", day: "numeric" });
}

export function useDailySeries(days = 7) {
  const events = useAllEvents();
  return useMemo(() => {
    const buckets: { label: string; cost: number; tokens: number; requests: number }[] = [];
    const now = new Date();
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      buckets.push({
        label: keyToLabel(d.toISOString().slice(0, 10)),
        cost: 0,
        tokens: 0,
        requests: 0,
      });
    }
    for (const e of events) {
      const idx = Math.floor((now.getTime() - new Date(e.timestamp).getTime()) / (24 * 60 * 60 * 1000));
      if (idx >= 0 && idx < days) {
        const b = buckets[days - 1 - idx];
        b.cost += e.cost;
        b.tokens += e.inputTokens + e.outputTokens;
        b.requests += 1;
      }
    }
    return buckets;
  }, [events, days]);
}

export function useHourlySeries(hours = 24) {
  const events = useAllEvents();
  return useMemo(() => {
    const buckets: { label: string; value: number }[] = [];
    const now = new Date();
    for (let i = hours - 1; i >= 0; i--) {
      const d = new Date(now.getTime() - i * 60 * 60 * 1000);
      buckets.push({
        label: d.toLocaleTimeString([], { hour: "2-digit" }),
        value: 0,
      });
    }
    for (const e of events) {
      const hoursAgo = (now.getTime() - new Date(e.timestamp).getTime()) / (60 * 60 * 1000);
      const idx = Math.floor(hoursAgo);
      if (idx >= 0 && idx < hours) buckets[hours - 1 - idx].value += e.cost;
    }
    return buckets;
  }, [events, hours]);
}

export function useTopModels(count = 5) {
  const events = useAllEvents();
  return useMemo(() => {
    const map: Record<string, number> = {};
    for (const e of events) {
      const key = `${e.provider} · ${e.model}`;
      map[key] = (map[key] ?? 0) + e.cost;
    }
    return Object.entries(map)
      .map(([name, cost]) => ({ name, cost }))
      .sort((a, b) => b.cost - a.cost)
      .slice(0, count);
  }, [events, count]);
}

export function useRunningRequests(windowMs = 5 * 60 * 1000) {
  const events = useAllEvents();
  return useMemo(() => {
    const cutoff = Date.now() - windowMs;
    return events.filter((e) => new Date(e.timestamp).getTime() >= cutoff).length;
  }, [events, windowMs]);
}

export function useActiveModels() {
  const events = useRecentEvents(50);
  return useMemo(() => {
    const set = new Set<string>();
    for (const e of events) set.add(`${e.provider}/${e.model}`);
    return set.size;
  }, [events]);
}
