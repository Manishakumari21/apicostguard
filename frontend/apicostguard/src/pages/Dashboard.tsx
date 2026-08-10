import { useMemo } from "react";
import { useUsage } from "../context/UsageContext";
import { useSettings } from "../context/SettingsContext";
import { useUI } from "../context/UIContext";
import { useNotifications } from "../context/NotificationContext";
import { useCostByProvider, useDailySeries, useProviderAggregates } from "../hooks/useMonitor";
import { formatCost, formatTokens } from "../utils/formatter";
import { formatTimeAgo } from "../utils/date";
import { getProviderColor, getProviderIcon } from "../utils/helpers";
import type { UsageEvent } from "../types/usage";
import LineChart from "../components/charts/LineChart";
import DonutChart from "../components/charts/DonutChart";

export default function Dashboard() {
  const usage = useUsage();
  const { budget } = useSettings();
  const { searchQuery } = useUI();
  const { items: notifications } = useNotifications();
  const daily = useDailySeries(8);
  const costByProvider = useCostByProvider();
  const providerAggs = useProviderAggregates();

  const recentEvents = useMemo(
    () => usage.eventIds.slice(-14).map((id) => usage.eventsById[id]).reverse(),
    [usage.eventIds, usage.eventsById]
  );

  const filteredEvents = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return recentEvents;
    return recentEvents.filter(
      (e) => e.provider.toLowerCase().includes(q) || e.model.toLowerCase().includes(q)
    );
  }, [recentEvents, searchQuery]);

  const trendData = useMemo(
    () => daily.map((d) => ({ label: d.label, value: d.cost })),
    [daily]
  );

  const donutData = useMemo(
    () =>
      costByProvider
        .filter((p) => p.cost > 0)
        .map((p) => ({ label: p.name, value: p.cost, color: p.color })),
    [costByProvider]
  );

  const activeProviders = useMemo(
    () => costByProvider.filter((p) => p.cost > 0 || p.name === usage.activeProvider),
    [costByProvider, usage.activeProvider]
  );

  const todayCost = daily[daily.length - 1]?.cost ?? 0;
  const yesterdayCost = daily[daily.length - 2]?.cost ?? 0;
  const todayRequests = daily[daily.length - 1]?.requests ?? 0;
  const totalCost = usage.totalCost;

  const delta = useMemo(() => {
    if (yesterdayCost <= 0) return null;
    return ((todayCost - yesterdayCost) / yesterdayCost) * 100;
  }, [todayCost, yesterdayCost]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-ink">Dashboard</h1>
          <p className="text-sm text-muted mt-0.5">
            Live overview of AI usage and costs across providers.
          </p>
        </div>
        <span className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium bg-success/10 text-success border border-success/30">
          <span className="w-2 h-2 rounded-full bg-success animate-pulse" />
          Live
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          label="Today's Cost"
          value={formatCost(todayCost, budget.currency)}
          delta={delta}
          accent="#9ccfd8"
        />
        <KpiCard
          label="Total Requests"
          value={todayRequests.toLocaleString()}
          sub="today"
          accent="#c4a7e7"
        />
        <KpiCard
          label="Tokens Used"
          value={formatTokens(usage.totalTokens)}
          sub={`${usage.eventIds.length} all-time requests`}
          accent="#ebbcba"
        />
        <ActiveProvidersCard providers={activeProviders.map((p) => p.name)} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="card p-5 lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-semibold text-ink">Cost Trend</h3>
              <p className="text-xs text-muted">Estimated spend · last {daily.length} days</p>
            </div>
            <span className="text-sm font-bold text-ink tabular-nums">
              {formatCost(totalCost, budget.currency)}{" "}
              <span className="text-xs font-medium text-faint">all time</span>
            </span>
          </div>
          {trendData.some((p) => p.value > 0) ? (
            <LineChart data={trendData} height={200} />
          ) : (
            <EmptyChart label="No cost data yet — requests will appear here live" />
          )}
        </div>

        <div className="card p-5">
          <h3 className="text-sm font-semibold text-ink mb-4">Provider Usage</h3>
          {donutData.length > 0 ? (
            <DonutChart data={donutData} size={150} thickness={18} centerLabel="$" />
          ) : (
            <EmptyChart label="No provider data yet" />
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="card p-5 lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-semibold text-ink">Live Activity</h3>
              <p className="text-xs text-muted">Every API request in real time</p>
            </div>
            {searchQuery && (
              <span className="text-xs text-accent">filtered: “{searchQuery}”</span>
            )}
          </div>
          {filteredEvents.length === 0 ? (
            <EmptyChart
              label={searchQuery ? "No matching requests" : "No activity yet"}
            />
          ) : (
            <div className="space-y-2">
              {filteredEvents.slice(0, 10).map((event) => (
                <FeedRow key={event.id} event={event} />
              ))}
            </div>
          )}
        </div>

        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-ink">Notifications</h3>
            <span className="text-xs text-muted">{notifications.length}</span>
          </div>
          {notifications.length === 0 ? (
            <EmptyChart label="No notifications yet" />
          ) : (
            <div className="space-y-2">
              {notifications.slice(0, 6).map((n) => (
                <div
                  key={n.id}
                  className={`flex items-start gap-3 px-3 py-2.5 rounded-lg ${
                    n.read ? "bg-canvas/40" : "bg-accent/5 border border-accent/20"
                  }`}
                >
                  <span className="text-base">{notificationIcon(n.type)}</span>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-ink truncate">{n.title}</p>
                    <p className="text-xs text-muted truncate">{n.message}</p>
                    <p className="text-[10px] text-faint mt-0.5">
                      {formatTimeAgo(n.timestamp)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {providerAggs.length > 0 && (
        <div className="card p-5">
          <h3 className="text-sm font-semibold text-ink mb-3">Providers</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
            {providerAggs.slice(0, 6).map((p) => {
              const color = getProviderColor(p.name);
              return (
                <div key={p.name} className="flex items-center gap-3 rounded-xl bg-canvas/50 border border-line/50 px-3 py-2.5">
                  <span
                    className="w-8 h-8 rounded-lg flex items-center justify-center text-sm shrink-0"
                    style={{ backgroundColor: `${color}15`, border: `1px solid ${color}25` }}
                  >
                    {getProviderIcon(p.name)}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-ink truncate">{p.name}</p>
                    <p className="text-xs text-muted">
                      {p.requests} req · {formatTokens(p.tokens)} tok
                    </p>
                  </div>
                  <span className="text-sm font-semibold text-success tabular-nums">
                    {formatCost(p.cost, budget.currency)}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function KpiCard({
  label,
  value,
  sub,
  delta,
  accent,
}: {
  label: string;
  value: string;
  sub?: string;
  delta?: number | null;
  accent: string;
}) {
  const up = (delta ?? 0) >= 0;
  return (
    <div className="card p-5">
      <p className="text-xs text-muted mb-1">{label}</p>
      <p className="text-2xl font-bold text-ink tabular-nums" style={{ color: accent }}>
        {value}
      </p>
      <div className="flex items-center gap-2 mt-1">
        {delta !== undefined && delta !== null && (
          <span
            className={`text-[11px] font-medium px-1.5 py-0.5 rounded-md ${
              up
                ? "text-danger bg-danger/10"
                : "text-success bg-success/10"
            }`}
          >
            {up ? "↑" : "↓"} {Math.abs(delta).toFixed(1)}%
          </span>
        )}
        <span className="text-[11px] text-faint">{sub ?? "vs yesterday"}</span>
      </div>
    </div>
  );
}

function ActiveProvidersCard({ providers }: { providers: string[] }) {
  const shown = providers.slice(0, 3);
  const rest = providers.length - shown.length;
  return (
    <div className="card p-5">
      <p className="text-xs text-muted mb-1">Active Providers</p>
      <div className="flex items-center gap-1.5 flex-wrap mt-1.5">
        {shown.length === 0 ? (
          <span className="text-sm text-faint">None</span>
        ) : (
          shown.map((name) => (
            <span
              key={name}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium text-ink bg-canvas/50 border border-line/60"
            >
              <span
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: getProviderColor(name) }}
              />
              {name}
            </span>
          ))
        )}
        {rest > 0 && (
          <span className="text-xs text-muted px-1.5 py-1">+{rest} more</span>
        )}
      </div>
      <p className="text-[11px] text-faint mt-2">Detected from recent traffic</p>
    </div>
  );
}

function FeedRow({ event }: { event: UsageEvent }) {
  const color = getProviderColor(event.provider);
  return (
    <div className="feed-item flex items-center gap-3 px-3 py-2.5 rounded-lg bg-canvas/50 hover:bg-line/20 transition-colors">
      <span className="text-[11px] text-faint tabular-nums shrink-0 w-12 text-right">
        {new Date(event.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
      </span>
      <span
        className="w-8 h-8 rounded-lg flex items-center justify-center text-sm shrink-0"
        style={{ backgroundColor: `${color}15`, border: `1px solid ${color}25` }}
      >
        {getProviderIcon(event.provider)}
      </span>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-ink truncate">
          {event.provider} · {event.model}
        </p>
        <p className="text-xs text-muted">
          {formatTokens(event.inputTokens + event.outputTokens)} tokens ·{" "}
          {formatTimeAgo(event.timestamp)}
        </p>
      </div>
      <span className="text-sm font-semibold text-success tabular-nums shrink-0">
        +{formatCost(event.cost)}
      </span>
    </div>
  );
}

function notificationIcon(type: string): string {
  switch (type) {
    case "budget":
      return "🎯";
    case "provider":
      return "🔌";
    case "warning":
      return "⚠️";
    default:
      return "🔔";
  }
}

function EmptyChart({ label }: { label: string }) {
  return (
    <div className="flex items-center justify-center py-10 text-sm text-faint">
      {label}
    </div>
  );
}
