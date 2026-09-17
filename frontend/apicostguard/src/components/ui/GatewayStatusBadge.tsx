import type { GatewayStatus } from "../../types/domain";
import { GATEWAY_DEFAULT_HOST, GATEWAY_DEFAULT_PORT } from "../../utils/constants";
import StatusIndicator from "./StatusIndicator";

interface GatewayStatusBadgeProps {
  gateway?: GatewayStatus | null;
}

export default function GatewayStatusBadge({ gateway }: GatewayStatusBadgeProps) {
  const running = gateway?.running ?? false;

  return (
    <div
      className={`flex items-center justify-between gap-2 px-3 py-2 rounded-xl border transition-colors duration-200 ${
        running
          ? "bg-success/8 border-success/25"
          : "bg-warning/8 border-warning/25"
      }`}
    >
      <StatusIndicator
        tone={running ? "healthy" : "warning"}
        label={running ? "Gateway Running" : "Gateway Stopped"}
        pulse={running}
      />
      <span className="text-[10px] tabular-nums shrink-0 font-mono text-muted">
        {GATEWAY_DEFAULT_HOST}:{gateway?.endpointPort ?? GATEWAY_DEFAULT_PORT}
      </span>
    </div>
  );
}