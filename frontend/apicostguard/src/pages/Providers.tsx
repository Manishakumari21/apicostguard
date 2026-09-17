import { useMemo } from "react";
import { getProviderOverviews } from "../services/providerService";
import { useGatewayQuery } from "../hooks/useGatewayQuery";
import type { ProviderOverview } from "../types/domain";
import { formatCost, formatDuration, formatTokens } from "../utils/format";
import { getProviderIcon } from "../utils/helpers";
import PageHeader from "../components/ui/PageHeader";
import Panel from "../components/ui/Panel";
import DataState from "../components/ui/DataState";
import StatusIndicator from "../components/ui/StatusIndicator";

export default function Providers() {
  const { data, error, loading, refetch } = useGatewayQuery(
    () => getProviderOverviews(),
    ["providers"],
    15000
  );

  const providers = data ?? [];
  const totalCost = useMemo(
    () => providers.reduce((s, p) => s + p.cost, 0),
    [providers]
  );

  return (
    <div>
      <PageHeader
        title="Providers"
        description="Supported model providers and their real gateway usage."
      />

      <DataState
        loading={loading}
        error={error}
        hasData={providers.length > 0}
        onRetry={refetch}
        emptyTitle="No providers available"
        emptyDescription="Connect providers in Settings to see their usage here."
      >
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {providers.map((p) => (
            <ProviderCard key={p.id} provider={p} share={p.cost / Math.max(totalCost, 0.0001)} />
          ))}
        </div>
      </DataState>
    </div>
  );
}

function ProviderCard({ provider, share }: { provider: ProviderOverview; share: number }) {
  return (
    <Panel title={provider.name} subtitle={provider.defaultModel} className="h-full">
      <div className="flex items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-3">
          <span
            className="w-9 h-9 flex items-center justify-center text-lg rounded-lg border border-line/60"
            style={{ backgroundColor: `${provider.color}1a` }}
          >
            {getProviderIcon(provider.id)}
          </span>
          <StatusIndicator
            tone={provider.connected ? (provider.errorRate > 10 ? "warning" : "healthy") : "offline"}
            label={provider.connected ? (provider.active ? "Active" : "Idle") : "Disconnected"}
            pulse={provider.connected && provider.active}
          />
          {provider.kind === "local" && (
            <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-iris/10 text-iris border border-iris/25">
              local
            </span>
          )}
        </div>
        <span className="text-xs text-faint font-mono">{provider.id}</span>
      </div>

      <div className="grid grid-cols-3 gap-2 mb-3">
        <Stat label="Requests" value={provider.requests.toLocaleString()} />
        <Stat label="Tokens" value={formatTokens(provider.tokens)} />
        <Stat label="Cost" value={formatCost(provider.cost)} tone />
      </div>

      <div className="flex items-center justify-between text-[11px] text-muted">
        <span>Latency {formatDuration(provider.latencyMs)}</span>
        <span className={provider.errorRate > 10 ? "text-danger" : "text-faint"}>
          {provider.errorRate.toFixed(1)}% errors
        </span>
        <span className="text-faint">{Math.round(share * 100)}% of spend</span>
      </div>

      <div className="mt-2 h-1 rounded-full bg-line/50 overflow-hidden">
        <div className="h-full rounded-full" style={{ width: `${Math.max(share * 100, provider.requests > 0 ? 4 : 0)}%`, backgroundColor: provider.color }} />
      </div>
    </Panel>
  );
}

function Stat({ label, value, tone }: { label: string; value: string; tone?: boolean }) {
  return (
    <div className="rounded-lg border border-line/50 bg-canvas/40 p-2">
      <p className="text-[10px] text-muted">{label}</p>
      <p className={`text-sm font-semibold tabular-nums ${tone ? "text-accent" : "text-ink"}`}>{value}</p>
    </div>
  );
}