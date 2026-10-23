import { useGatewayQuery } from "./useGatewayQuery";
import { gatewayRequest } from "../services/gatewayService";
import type { ApiBudget } from "../types/api";

export interface CapacityPill {
  remainingPercent: number;
  tone: "success" | "warning" | "danger";
  running: boolean;
}

export function useCapacity(intervalMs = 15000): CapacityPill {
  const { data } = useGatewayQuery<ApiBudget>(
    () => gatewayRequest<ApiBudget>("GET", "/api/budget"),
    ["capacity"],
    intervalMs
  );
  const pct = data ? Math.max(0, Math.min(100, data.remaining_percent)) : 100;
  const tone: CapacityPill["tone"] =
    pct <= 10 ? "danger" : pct <= 20 ? "warning" : "success";
  return { remainingPercent: pct, tone, running: !!data };
}