export interface UsageEvent {
  id: string;
  provider: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
  cost: number;
  timestamp: string;
  duration?: number;
}

export interface UsageState {
  eventsById: Record<string, UsageEvent>;
  eventIds: string[];
  totalCost: number;
  dailyCost: number;
  monthlyCost: number;
  totalTokens: number;
  activeProvider: string | null;
  activeModel: string | null;
}

export type UsageAction =
  | { type: "ADD_EVENT"; payload: UsageEvent }
  | { type: "SET_EVENTS"; payload: UsageEvent[] }
  | { type: "REMOVE_EVENT"; payload: string }
  | { type: "RESET" };
