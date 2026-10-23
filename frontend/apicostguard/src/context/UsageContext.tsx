import { createContext, useContext, useReducer, type Dispatch, type ReactNode } from "react";
import type { UsageAction, UsageEvent, UsageState } from "../types/usage";

const initialState: UsageState = {
  eventsById: {},
  eventIds: [],
  totalCost: 0,
  dailyCost: 0,
  monthlyCost: 0,
  totalTokens: 0,
  activeProvider: null,
  activeModel: null,
};

function isToday(iso: string): boolean {
  return iso.slice(0, 10) === new Date().toISOString().slice(0, 10);
}

function isThisMonth(iso: string): boolean {
  return iso.slice(0, 7) === new Date().toISOString().slice(0, 7);
}

function buildState(events: UsageEvent[]): UsageState {
  let totalCost = 0;
  let dailyCost = 0;
  let monthlyCost = 0;
  let totalTokens = 0;
  const eventsById: Record<string, UsageEvent> = {};
  const eventIds: string[] = [];
  let activeProvider: string | null = null;
  let activeModel: string | null = null;

  for (const e of events) {
    eventsById[e.id] = e;
    eventIds.push(e.id);
    totalCost += e.cost;
    totalTokens += e.inputTokens + e.outputTokens;
    if (isToday(e.timestamp)) dailyCost += e.cost;
    if (isThisMonth(e.timestamp)) monthlyCost += e.cost;
    activeProvider = e.provider;
    activeModel = e.model;
  }

  return {
    eventsById,
    eventIds,
    totalCost,
    dailyCost,
    monthlyCost,
    totalTokens,
    activeProvider,
    activeModel,
  };
}

function reducer(state: UsageState, action: UsageAction): UsageState {
  switch (action.type) {
    case "ADD_EVENT": {
      const events = state.eventIds.map((id) => state.eventsById[id]);
      events.push(action.payload);
      return buildState(events);
    }
    case "SET_EVENTS":
      return buildState(action.payload);
    case "REMOVE_EVENT": {
      const events = state.eventIds
        .map((id) => state.eventsById[id])
        .filter((e) => e.id !== action.payload);
      return buildState(events);
    }
    case "RESET":
      return initialState;
    default:
      return state;
  }
}

const UsageContext = createContext<UsageState | null>(null);
const UsageDispatchContext = createContext<Dispatch<UsageAction> | null>(null);

export function UsageProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);
  return (
    <UsageContext.Provider value={state}>
      <UsageDispatchContext.Provider value={dispatch}>
        {children}
      </UsageDispatchContext.Provider>
    </UsageContext.Provider>
  );
}

export function useUsage(): UsageState {
  const ctx = useContext(UsageContext);
  if (!ctx) throw new Error("useUsage must be used within a UsageProvider");
  return ctx;
}

export function useUsageDispatch(): Dispatch<UsageAction> {
  const ctx = useContext(UsageDispatchContext);
  if (!ctx) throw new Error("useUsageDispatch must be used within a UsageProvider");
  return ctx;
}
