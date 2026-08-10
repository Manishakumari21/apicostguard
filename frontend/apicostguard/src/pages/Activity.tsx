import { useEffect, useMemo, useState } from "react";
import { useRecentEvents } from "../hooks/useMonitor";
import {
  useCostByProvider,
  useProviderAggregates,
  useTopModels,
} from "../hooks/useMonitor";
import { useSettings } from "../context/SettingsContext";
import { getAnalytics, type AnalyticsData } from "../services/analytics";
import { formatCost, formatTokens } from "../utils/formatter";
import { formatTimeAgo } from "../utils/date";
import { getProviderColor } from "../utils/helpers";
import LineChart from "../components/charts/LineChart";
import BarChart from "../components/charts/BarChart";
import DonutChart from "../components/charts/DonutChart";

type Period = "today" | "week" | "month";

export default function Activity() {
  const events = useRecentEvents(200);
  const costByProvider = useCostByProvider();
  const topModels = useTopModels(6);
  const providerAggs = useProviderAggregates();
  const { budget } = useSettings();
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [period, setPeriod] = useState<Period>("week");

  useEffect(() => {
    let mounted = true;
    getAnalytics().then((data) => {
      if (mounted) setAnalytics(data);
    });
    return () => {
      mounted = false;
    };
  }, []);

  const buckets = useMemo(() => buildBuckets(events, period), [events, period]);

  const costTrend = useMemo(
    () => buckets.map((b) => ({ label: b.label, value: b.cost })),
    [buckets]
  );

  const tokenTrend = useMemo(
    () => buckets.map((b) => ({ label: b.label, value: b.tokens })),
    [buckets]
  );

  const avgCostPerRequest = useMemo(
    () =>
      buckets.map((b) => ({
        label: b.label,
        value: b.requests > 0 ? b.cost / b.requests : 0,
      })),
    [buckets]
  );

  const peakHours = useMemo(() => {
    const hours = Array.from({ length: 24 }, (_, h) => ({
      label: `${String(h).padStart(2, "0")}h`,
      value: 0,
    }));
    events.forEach((e) => {
      hours[new Date(e.timestamp).getHours()].value += 1;
    });
    return hours;
  }, [events]);

  const modelBars = useMemo(
    () => topModels.map((m) => ({ label: m.name, value: m.cost })),
    [topModels]
  );

  const donutData = useMemo(
    () =>
      costByProvider
        .filter((p) => p.cost > 0)
        .map((p) => ({ label: p.name, value: p.cost, color: p.color })),
    [costByProvider]
  );

  const successRate = analytics?.monthly.successRate ?? null;
  const avgLatency = analytics?.monthly.avgLatencyMs ?? null;
  const todayCost =
    analytics?.dailyCost ?? buckets[buckets.length - 1]?.cost ?? 0;
  const weekCost = buckets.reduce((s, b) => s + b.cost, 0);
  const monthCost = analytics?.monthlyCost ?? 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-ink">Analytics</h1>
          <p className="text-sm text-muted mt-0.5">
            Cost, tokens and latency trends across providers and models.
          </p>
        </div>
        <PeriodSwitch value={period} onChange={setPeriod} />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        <StatCard
          label="Today"
          value={formatCost(todayCost, budget.currency)}
          accent="#9ccfd8"
        />
        <StatCard
          label="This Week"
          value={formatCost(weekCost, budget.currency)}
          accent="#c4a7e7"
        />
        <StatCard
          label="This Month"
          value={formatCost(monthCost, budget.currency)}
          accent="#ebbcba"
        />
        <StatCard
          label="Success Rate"
          value={successRate === null ? "—" : `${successRate.toFixed(0)}%`}
          accent="#9ccfd8"
        />
        <StatCard
          label="Avg Latency"
          value={avgLatency === null ? "—" : `${avgLatency.toFixed(0)}ms`}
          accent="#f6c177"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <ChartCard title={`Cost by ${periodLabel(period)}`} className="lg:col-span-2">
          {costTrend.some((p) => p.value > 0) ? (
            <LineChart data={costTrend} height={220} />
          ) : (
            <EmptyChart label="No cost data yet" />
          )}
        </ChartCard>

        <ChartCard title="Cost by Provider">
          {donutData.length > 0 ? (
            <DonutChart
              data={donutData}
              size={150}
              thickness={18}
              centerLabel="$"
            />
          ) : (
            <EmptyChart label="No provider data yet" />
          )}
        </ChartCard>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ChartCard title={`Token Usage · ${periodLabel(period).toLowerCase()}`}>
          {tokenTrend.some((p) => p.value > 0) ? (
            <LineChart data={tokenTrend} height={200} />
          ) : (
            <EmptyChart label="No token data yet" />
          )}
        </ChartCard>

        <ChartCard title="Average Cost per Request">
          {avgCostPerRequest.some((p) => p.value > 0) ? (
            <BarChart data={avgCostPerRequest} height={200} formatValue={(v) => formatCost(v, budget.currency)} />
          ) : (
            <EmptyChart label="No request data yet" />
          )}
        </ChartCard>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ChartCard title="Peak Usage Hours">
          {peakHours.some((p) => p.value > 0) ? (
            <BarChart data={peakHours} height={200} />
          ) : (
            <EmptyChart label="No request data yet" />
          )}
        </ChartCard>

        <ChartCard title="Top Models by Cost">
          {modelBars.length > 0 && modelBars.some((m) => m.value > 0) ? (
            <BarChart
              data={modelBars.map((m) => ({
                ...m,
                color: getProviderColor(m.label.split(" · ")[0]),
              }))}
              height={200}
            />
          ) : (
            <EmptyChart label="No model data yet" />
          )}
        </ChartCard>
      </div>

      <ProviderTable aggregates={providerAggs} currency={budget.currency} />

      <div className="card p-5">
        <h3 className="text-sm font-semibold text-muted mb-3">Recent Requests</h3>
        {events.length === 0 ? (
          <p className="text-sm text-faint text-center py-6">No activity yet</p>
        ) : (
          <div className="space-y-2">
            {events.slice(-20).reverse().map((event) => (
              <div
                key={event.id}
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-canvas/50"
              >
                <div
                  className="w-2 h-2 rounded-full shrink-0"
                  style={{ backgroundColor: getProviderColor(event.provider) }}
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-ink truncate">
                    {event.provider} · {event.model}
                  </p>
                  <p className="text-xs text-muted">
                    {formatTokens(event.inputTokens + event.outputTokens)} tokens
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-sm font-semibold text-success">
                    {formatCost(event.cost, budget.currency)}
                  </p>
                  <p className="text-xs text-muted/60">{formatTimeAgo(event.timestamp)}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function buildBuckets(events: ReturnType<typeof useRecentEvents>, period: Period) {
  const now = new Date();
  let start: Date;
  let key: (d: Date) => string;
  let label: (d: Date) => string;
  const stepMs: number =
    period === "today" ? 3600000 : 86400000;

  if (period === "today") {
    start = new Date(now);
    start.setHours(0, 0, 0, 0);
    key = (d) => String(d.getHours());
    label = (d) => `${String(d.getHours()).padStart(2, "0")}h`;
  } else if (period === "week") {
    start = new Date(now);
    start.setDate(start.getDate() - 6);
    start.setHours(0, 0, 0, 0);
    key = (d) => d.toDateString();
    label = (d) => d.toLocaleDateString([], { weekday: "short" });
  } else {
    start = new Date(now);
    start.setDate(start.getDate() - 29);
    start.setHours(0, 0, 0, 0);
    key = (d) => d.toDateString();
    label = (d) => d.toLocaleDateString([], { month: "short", day: "numeric" });
  }

  const map = new Map<string, { label: string; cost: number; requests: number; tokens: number }>();
  const order: string[] = [];
  for (let d = new Date(start); d.getTime() <= now.getTime(); d = new Date(d.getTime() + stepMs)) {
    const k = key(d);
    order.push(k);
    map.set(k, { label: label(d), cost: 0, requests: 0, tokens: 0 });
  }

  events.forEach((e) => {
    const t = new Date(e.timestamp);
    if (t.getTime() < start.getTime()) return;
    const b = map.get(key(t));
    if (!b) return;
    b.cost += e.cost;
    b.requests += 1;
    b.tokens += e.inputTokens + e.outputTokens;
  });

  return order.map((k) => map.get(k)!);
}

function periodLabel(period: Period): string {
  switch (period) {
    case "today":
      return "Today";
    case "week":
      return "This Week";
    case "month":
      return "This Month";
  }
}

function PeriodSwitch({
  value,
  onChange,
}: {
  value: Period;
  onChange: (p: Period) => void;
}) {
  const options: { value: Period; label: string }[] = [
    { value: "today", label: "Today" },
    { value: "week", label: "Week" },
    { value: "month", label: "Month" },
  ];
  return (
    <div className="flex items-center gap-1 p-1 rounded-xl bg-line/40 border border-line/60">
      {options.map((o) => (
        <button
          key={o.value}
          onClick={() => onChange(o.value)}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
            value === o.value
              ? "bg-accent text-white shadow-sm"
              : "text-muted hover:text-ink"
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

function StatCard({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent: string;
}) {
  return (
    <div className="card p-4">
      <p className="text-xs text-muted mb-1">{label}</p>
      <p className="text-xl font-bold text-ink tabular-nums" style={{ color: accent }}>
        {value}
      </p>
    </div>
  );
}

function ChartCard({
  title,
  children,
  className = "",
}: {
  title: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`card p-5 ${className}`}>
      <h3 className="text-sm font-semibold text-muted mb-4">{title}</h3>
      {children}
    </div>
  );
}

function EmptyChart({ label }: { label: string }) {
  return (
    <div className="flex items-center justify-center py-10 text-sm text-faint">
      {label}
    </div>
  );
}

function ProviderTable({
  aggregates,
  currency,
}: {
  aggregates: ReturnType<typeof useProviderAggregates>;
  currency: string;
}) {
  if (aggregates.length === 0) return null;
  return (
    <div className="card p-5 overflow-x-auto">
      <h3 className="text-sm font-semibold text-muted mb-4">Provider Breakdown</h3>
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-xs text-faint uppercase tracking-wider">
            <th className="pb-2 pr-4">Provider</th>
            <th className="pb-2 pr-4 text-right">Requests</th>
            <th className="pb-2 pr-4 text-right">Tokens</th>
            <th className="pb-2 pr-4 text-right">Cost</th>
            <th className="pb-2 text-right">Models</th>
          </tr>
        </thead>
        <tbody>
          {aggregates.map((p) => (
            <tr key={p.name} className="border-t border-line/50">
              <td className="py-2.5 pr-4 font-medium text-ink">
                <span className="inline-flex items-center gap-2">
                  <span
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: getProviderColor(p.name) }}
                  />
                  {p.name}
                </span>
              </td>
              <td className="py-2.5 pr-4 text-right text-muted tabular-nums">
                {p.requests}
              </td>
              <td className="py-2.5 pr-4 text-right text-muted tabular-nums">
                {formatTokens(p.tokens)}
              </td>
              <td className="py-2.5 pr-4 text-right text-success font-semibold tabular-nums">
                {formatCost(p.cost, currency)}
              </td>
              <td className="py-2.5 text-right text-faint">{p.models.length}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
