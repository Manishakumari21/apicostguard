import { getOptimizations } from "../services/optimizeService";
import { useGatewayQuery } from "../hooks/useGatewayQuery";
import type { Optimization } from "../types/domain";
import { formatCost } from "../utils/format";
import PageHeader from "../components/ui/PageHeader";
import Panel from "../components/ui/Panel";
import DataState from "../components/ui/DataState";

const TYPE_META: Record<Optimization["type"], { icon: string }> = {
  "expensive-model": { icon: "💸" },
  "high-token-usage": { icon: "🧮" },
  "high-latency": { icon: "⏱️" },
  "lower-cost-provider": { icon: "🔀" },
  batching: { icon: "📦" },
};

export default function Optimize() {
  const { data, error, loading, refetch } = useGatewayQuery(
    () => getOptimizations(),
    ["optimize"],
    30000
  );

  const items = data ?? [];
  const totalSavings = items.filter((i) => !i.demo).reduce((s, i) => s + i.potentialSavings, 0);
  const demoVisible = items.some((i) => i.demo);

  return (
    <div>
      <PageHeader
        title="Optimize"
        description="Cost-saving opportunities derived from real request history."
      />

      <DataState loading={loading} error={error} hasData={items.length > 0} onRetry={refetch}>
        <div className="space-y-4">
          <div className="rounded-xl border border-success/25 bg-success/8 p-4 flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-semibold text-ink">Estimated monthly savings</p>
              <p className="text-[11px] text-muted mt-0.5">
                Sum of all flagged opportunities. Heuristic estimates, not billing guarantees.
              </p>
            </div>
            <p className="text-2xl font-bold text-success tabular-nums shrink-0">{formatCost(totalSavings)}</p>
          </div>

          {demoVisible && (
            <p className="text-[11px] text-warning/90 leading-relaxed">
              Some recommendations below are <strong>sample suggestions</strong> shown because the gateway has no
              request history yet. They are replaced by real analysis as data flows in.
            </p>
          )}

          {items.map((opt) => {
            const meta = TYPE_META[opt.type];
            return (
              <Panel
                key={opt.id}
                title={
                  <span className="flex items-center gap-2">
                    <span>{meta.icon}</span>
                    <span>{opt.title}</span>
                    {opt.model && (
                      <span className="font-mono text-[10px] text-faint font-normal">{opt.model}</span>
                    )}
                  </span>
                }
              >
                {opt.demo && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-warning/10 text-warning border border-warning/25 mb-2 inline-block">
                    SAMPLE
                  </span>
                )}
                <div className="flex items-start justify-between gap-4">
                  <p className="text-sm text-muted leading-relaxed">{opt.description}</p>
                  {opt.potentialSavings > 0 && (
                    <p className="text-sm font-bold text-success tabular-nums shrink-0">
                      {formatCost(opt.potentialSavings)}/mo
                    </p>
                  )}
                </div>
              </Panel>
            );
          })}
        </div>
      </DataState>
    </div>
  );
}