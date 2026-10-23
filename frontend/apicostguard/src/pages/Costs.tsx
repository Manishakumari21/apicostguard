import { useMemo } from "react";
import { getCostSource, toCostBreakdown } from "../services/costService";
import { useGatewayQuery } from "../hooks/useGatewayQuery";
import { formatCost } from "../utils/format";
import PageHeader from "../components/ui/PageHeader";
import Panel from "../components/ui/Panel";
import MetricCard from "../components/ui/MetricCard";
import DataState from "../components/ui/DataState";
import BarChart from "../components/charts/BarChart";
import DonutChart, { type DonutDatum } from "../components/charts/DonutChart";

export default function Costs() {
  const { data: source, error, loading, refetch } = useGatewayQuery(
    () => getCostSource(),
    ["costs"],
    15000
  );

  const costs = useMemo(() => (source ? toCostBreakdown(source) : null), [source]);

  return (
    <div>
      <PageHeader
        title="Costs"
        description="Spend totals, trends, and projected monthly cost."
      />

      <DataState loading={loading} error={error} hasData={!!costs} onRetry={refetch}>
        {costs && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <MetricCard label="Total Cost" value={formatCost(costs.totalCost)} icon="💵" />
              <MetricCard label="Daily Avg (7d)" value={formatCost(costs.dailyAvg)} icon="📆" color="var(--info)" />
              <MetricCard label="Projected Monthly" value={formatCost(costs.projectedMonthly)} icon="🔮" color="var(--warning)" />
              <MetricCard label="Potential Savings" value={formatCost(costs.potentialSavings)} icon="⚡" color="var(--success)" sub={costs.potentialSavings > 0 ? "derived estimate — see Optimize" : undefined} />
            </div>

            <Panel title="Cost Trend (30 days)">
              <BarChart
                data={costs.series.map((p) => ({ label: p.label, value: p.cost }))}
                height={160}
                formatValue={(v) => formatCost(v)}
              />
            </Panel>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <Panel title="Spend by Provider">
                <BreakdownDonut data={costs.byProvider.map((c) => ({ label: c.label, value: c.value, color: c.color }))} />
              </Panel>
              <Panel title="Spend by Model" className="col-span-1 lg:col-span-2">
                <CategoryBars
                  data={costs.byModel.map((c) => ({ label: c.label, value: c.value, color: c.color }))}
                  formatValue={(v) => formatCost(v)}
                />
              </Panel>
            </div>

            <Panel title="Spend by Project">
              <CategoryBars
                data={costs.byProject.map((c) => ({ label: c.label, value: c.value, color: c.color }))}
                formatValue={(v) => formatCost(v)}
              />
            </Panel>

            {source && source.analytics.monthly.total_cost > 0 && (
              <p className="text-[11px] text-faint mt-2">
                Projection assumes the last 7 days continue at the same rate. Savings are heuristic estimates, not guarantees.
              </p>
            )}
          </div>
        )}
      </DataState>
    </div>
  );
}

function BreakdownDonut({ data }: { data: DonutDatum[] }) {
  if (data.length === 0) {
    return <p className="text-sm text-muted py-8 text-center">No data yet.</p>;
  }
  return <DonutChart data={data} size={150} thickness={20} centerLabel="spend" />;
}

function CategoryBars({ data, formatValue }: { data: { label: string; value: number; color: string }[]; formatValue: (v: number) => string }) {
  if (data.length === 0) {
    return <p className="text-sm text-muted py-8 text-center">No data yet.</p>;
  }
  return <BarChart data={data} height={150} formatValue={formatValue} />;
}