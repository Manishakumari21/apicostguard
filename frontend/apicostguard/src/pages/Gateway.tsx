import { useMemo } from "react";
import { useGatewayQuery } from "../hooks/useGatewayQuery";
import { getRequestHistory } from "../services/requestService";
import { formatDuration } from "../utils/format";
import { gatewayHttp } from "../utils/constants";
import PageHeader from "../components/ui/PageHeader";
import Panel from "../components/ui/Panel";
import MetricCard from "../components/ui/MetricCard";
import StatusIndicator from "../components/ui/StatusIndicator";
import DataState from "../components/ui/DataState";
import RequestTable from "../components/ui/RequestTable";
import { useGatewayStatus } from "../hooks/useGatewayStatus";

export default function Gateway() {
  const { data: gw, refetch: gwRefetch } = useGatewayStatus(5000);
  const { data: logs, error, loading, refetch } = useGatewayQuery(
    () => getRequestHistory(250),
    ["gateway-history"],
    5000
  );

  const stats = useMemo(() => {
    const success = logs?.filter((l) => l.status === "success").length ?? 0;
    const blocked = logs?.filter((l) => l.status === "blocked").length ?? 0;
    const errors = logs?.filter((l) => l.status === "error").length ?? 0;
    const latencies = logs ?? [];
    const avgLatency =
      latencies.length > 0
        ? latencies.reduce((s, l) => s + l.latencyMs, 0) / latencies.length
        : 0;
    return { total: logs?.length ?? 0, success, blocked, errors, avgLatency };
  }, [logs]);

  const running = gw?.running ?? false;
  const uptime = gw?.uptimeSeconds ?? null;

  return (
    <div>
      <PageHeader
        title="Gateway"
        description="Local AI API gateway health and live request throughput."
      />

      <Panel title="Connection" className="mb-4">
        <div className="flex flex-wrap items-center gap-3">
          <StatusIndicator
            tone={running ? "healthy" : "critical"}
            label={running ? "Gateway Running" : "Gateway Stopped"}
            pulse={running}
          />
          <span className="text-xs text-muted font-mono">
            {gatewayHttp(gw?.endpointHost, gw?.endpointPort)}
          </span>
          {running && gw?.version && (
            <span className="text-xs text-faint font-mono">v{gw.version}</span>
          )}
          {running && uptime !== null && (
            <span className="text-xs text-faint">up {Math.floor(uptime / 60)}m {uptime % 60}s</span>
          )}
          <span className="text-[11px] text-faint">
            {gw?.managed ? "managed by APICostGuard" : "external process"} · {gw?.environment}
          </span>
          <button
            onClick={() => { refetch(); gwRefetch(); }}
            className="ml-auto text-xs text-accent hover:text-accent/80 cursor-pointer transition-colors"
          >
            ⟳ Refresh
          </button>
        </div>
        {!running && (
          <p className="text-xs text-warning mt-3 leading-relaxed">
            The gateway health endpoint is not responding. Start the backend service
            (or launch the app from the terminal) so APICostGuard can read live data.
          </p>
        )}
      </Panel>

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 mb-4">
        <MetricCard label="Requests (sampled)" value={stats.total.toLocaleString()} icon="🔄" color="var(--success)" />
        <MetricCard label="Succeeded" value={stats.success.toLocaleString()} icon="✅" color="var(--success)" />
        <MetricCard label="Blocked" value={stats.blocked.toLocaleString()} icon="🚫" color="var(--warning)" />
        <MetricCard label="Errors" value={stats.errors.toLocaleString()} icon="❌" color="var(--danger)" />
        <MetricCard label="Avg Latency" value={formatDuration(stats.avgLatency)} icon="⏱️" color="var(--info)" />
      </div>

      <Panel
        title="Live Request Stream"
        subtitle="Updated every 5 seconds from sampled history"
      >
        <DataState loading={loading} error={error} hasData={(logs?.length ?? 0) > 0} onRetry={refetch}>
          <RequestTable logs={(logs ?? []).slice(0, 40)} maxHeight="max-h-[420px]" />
        </DataState>
      </Panel>
    </div>
  );
}