import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useGatewayQuery } from "../hooks/useGatewayQuery";
import { getDashboardSource, toDashboardData } from "../services/dashboardService";
import type { RequestLog } from "../types/domain";
import { formatCost, formatDuration } from "../utils/format";
import { getProviderConfig } from "../utils/helpers";
import { REMAINING_THRESHOLDS } from "../utils/constants";
import PageHeader from "../components/ui/PageHeader";
import MetricCard from "../components/ui/MetricCard";
import Panel from "../components/ui/Panel";
import BudgetProgress from "../components/ui/BudgetProgress";
import DataState from "../components/ui/DataState";
import RequestTable from "../components/ui/RequestTable";
import RequestDetail from "../components/ui/RequestDetail";
import CapacityGauge from "../components/ui/CapacityGauge";
import LineChart, { type ChartPoint } from "../components/charts/LineChart";
import DonutChart, { type DonutDatum } from "../components/charts/DonutChart";
import { Stagger, StaggerItem } from "../components/motion/reveal";

type RangeKey = "7D" | "30D" | "90D";
const RANGES: RangeKey[] = ["7D", "30D", "90D"];
const RANGE_DAYS: Record<RangeKey, number> = { "7D": 7, "30D": 30, "90D": 90 };

export default function Dashboard() {
  const navigate = useNavigate();
  const [range, setRange] = useState<RangeKey>("30D");
  const [detailLog, setDetailLog] = useState<RequestLog | null>(null);

  const { data: source, error, loading, refetch } = useGatewayQuery(
    () => getDashboardSource(),
    ["dashboard"],
    30000
  );

  const dash = useMemo(
    () => (source ? toDashboardData(source, RANGE_DAYS[range]) : null),
    [source, range]
  );

  const chartPoints: ChartPoint[] = useMemo(
    () => (dash ? dash.series.map((p) => ({ label: p.label, value: p.cost })) : []),
    [dash]
  );

  const donutData: DonutDatum[] = useMemo(
    () =>
      dash
        ? dash.providers.map((p) => ({
            label: p.name,
            value: p.cost,
            color: getProviderConfig(p.name).color,
          }))
        : [],
    [dash]
  );

  const weekFooter = useMemo(() => {
    if (!dash) return "";
    const resetDate = new Date(new Date(dash.budget.weekStart).getTime() + 7 * 86400000);
    const resetLabel = resetDate.toLocaleDateString(undefined, { month: "short", day: "numeric" });
    return `${formatCost(dash.budget.weekSpend)} / ${formatCost(dash.budget.weeklyLimit)} this week · resets ${resetLabel}`;
  }, [dash]);

  return (
    <div>
      <PageHeader
        title="Overview"
        description="Real-time gateway health, spend, and usage overview."
      />

      <DataState loading={loading} error={error} hasData={!!dash} onRetry={refetch}>
        {dash && (
          <div className="space-y-4">
            <Stagger className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <StaggerItem>
                <MetricCard label="Today's Cost" value={formatCost(dash.todayCost)} icon="💰" sub={`${dash.todayRequests} requests`} />
              </StaggerItem>
              <StaggerItem>
                <MetricCard label="Monthly Cost" value={formatCost(dash.monthCost)} icon="📅" sub={dash.budget.month} color="var(--info)" />
              </StaggerItem>
              <StaggerItem>
                <MetricCard label="Requests" value={dash.totalRequests.toLocaleString()} icon="📊" sub={`${dash.activeProviders.length} providers active`} color="var(--success)" />
              </StaggerItem>
              <StaggerItem>
                <MetricCard label="Avg Latency" value={dash.avgLatency ? formatDuration(dash.avgLatency) : "—"} icon="⏱️" sub={dash.successRate !== null ? `${(dash.successRate * 100).toFixed(1)}% success` : undefined} color="var(--warning)" />
              </StaggerItem>
            </Stagger>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <div className="col-span-1 flex flex-col gap-4">
                <CapacityGauge
                  title="You · Global budget"
                  remainingPercent={dash.budget.remainingPercent}
                  spent={dash.budget.currentSpend}
                  limit={dash.budget.monthlyLimit}
                  runoutLabel={dash.budget.projectedRunoutDate ?? undefined}
                  footer={weekFooter}
                />
                {dash.budget.dailyLimit > 0 && (
                  <Panel title="Daily spend">
                    <BudgetProgress
                      used={dash.budget.todaySpend}
                      limit={dash.budget.dailyLimit}
                      threshold={dash.budget.threshold}
                      size="sm"
                    />
                    <p className="text-[11px] text-faint mt-3">
                      {dash.budget.remainingPercent <= REMAINING_THRESHOLDS.critical
                        ? "Remaining is critical — consider throttling."
                        : dash.budget.remainingPercent <= REMAINING_THRESHOLDS.warning
                          ? "Remaining is low — plan ahead."
                          : "On track."}
                    </p>
                  </Panel>
                )}
              </div>

              <Panel
                title="Cost Over Time"
                actions={
                  <div className="flex rounded-lg border border-line/60 overflow-hidden">
                    {RANGES.map((r) => (
                      <button
                        key={r}
                        onClick={() => setRange(r)}
                        className={`px-2.5 py-1 text-[10px] font-semibold cursor-pointer transition-colors ${
                          range === r ? "bg-accent/15 text-accent" : "text-muted hover:bg-line/30"
                        }`}
                      >
                        {r}
                      </button>
                    ))}
                  </div>
                }
                className="col-span-1 min-w-0 lg:col-span-2"
              >
                <LineChart data={chartPoints} height={160} />
              </Panel>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <Panel title="Provider Usage" className="col-span-1">
                {donutData.length > 0 ? (
                  <DonutChart data={donutData} size={140} thickness={18} />
                ) : (
                  <p className="text-sm text-muted py-8 text-center">No provider data yet.</p>
                )}
              </Panel>

              <Panel
                title="Recent Requests"
                className="col-span-1 min-w-0 lg:col-span-2"
                actions={
                  <button
                    onClick={() => navigate("/requests")}
                    className="text-xs text-accent hover:text-accent/80 cursor-pointer transition-colors"
                  >
                    View all →
                  </button>
                }
              >
                <RequestTable logs={dash.recent} onSelect={setDetailLog} maxHeight="max-h-[320px]" />
              </Panel>
            </div>
          </div>
        )}
      </DataState>

      {detailLog && <RequestDetail log={detailLog} onClose={() => setDetailLog(null)} />}
    </div>
  );
}