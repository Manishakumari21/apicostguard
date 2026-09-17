import type { GatewayStatus } from "../types/domain";
import { getGatewayStatus } from "../services/gatewayService";
import { useGatewayQuery } from "./useGatewayQuery";

export function useGatewayStatus(intervalMs = 10000) {
  const result = useGatewayQuery<GatewayStatus>(
    () => getGatewayStatus(),
    [intervalMs],
    intervalMs
  );
  return result;
}