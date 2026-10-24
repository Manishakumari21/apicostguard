import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { AreaChart, Donut, ProgressRing } from "../components/ui/Charts";
import { Badge, RequestStatusBadge } from "../components/ui/Badge";
import { Icon } from "../components/ui/Icon";
import { MetricTile } from "../components/ui/MetricTile";
import { PageHeader } from "../components/ui/PageHeader";
import { Panel, PanelHeader } from "../components/ui/Panel";
import { ProviderGlyph } from "../components/ui/ProviderGlyph";
import { SegmentedControl } from "../components/ui/SegmentedControl";
import { EmptyState, ErrorState, SkeletonPanel } from "../components/ui/States";
import { useSystemStatus } from "../context/SystemStatusContext";
import {
  aggregateByProvider,
  costShare,
  totalOf,
} from "../lib/aggregate";
import {
  daysInCurrentMonth,
  dayOfCurrentMonth,
  projectionFromPace,
  runwayDays,
  spendState,
  toBudgetSnapshot,
} from "../lib/budget";
import { buildDailySeries } from "../lib/date";
import { formatMoney, formatNumber, formatPercent, formatRelative, formatTokens } from "../lib/format";
import { providerMeta } from "../lib/providers";
import { useApiQuery } from "../lib/useApiQuery";
import {
  fetchAnalytics,
  fetchBudget,
  fetchBudgetRecords,
  fetchDailySummary,
  fetchDashboard,
  fetchSettings,
  fetchUsageLogs,
} from "../services/api";
import type { ApiAnalytics, ApiBudget, ApiBudgetRecord, ApiDailySummary, ApiDashboard, ApiSettings, UsageLog } from "../services/types";

interface OverviewData {
  dashboard: ApiDashboard;
  analytics: ApiAnalytics;
  budget: ApiBudget;
  records: ApiBudgetRecord[];
  settings: ApiSettings;
  daily: ApiDailySummary;
  logs: UsageLog[];
}

export default function OverviewPage() {
  const { status } = useSystemStatus();
  const [pulseDays, setPulseDays] = useState<number>(14);
  const query = useApiQuery<OverviewData>(async (signal) => {
    const [dashboard, analytics, budget, records, settings, daily, logs] = await Promise.all([
      fetchDashboard(signal),
      fetchAnalytics(signal),
      fetchBudget(signal),
      fetchBudgetRecords(signal),
      fetchSettings(signal),
      fetchDailySummary(signal),
      fetchUsageLogs(1000, signal),
    ]);
    return { dashboard, analytics, budget, records, settings, daily, logs };
  }, []);

  const data = query.data;
  const model = useMemo(() => {
    if (!data) return null;
    const budget = toBudgetSnapshot(data.budget, data.settings, data.daily.today_cost);
    const series = buildDailySeries(data.logs, pulseDays);
    const providers = aggregateByProvider(data.logs);
    const recent = [...data.logs].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 7);
    const recentTotals = totalOf(data.logs);
    const totalDays = daysInCurrentMonth();
    const day = dayOfCurrentMonth();
    const projection = projectionFromPace(budget.currentSpend, day, totalDays);
    const runway = runwayDays(budget.remaining, budget.weekSpend);
    const state = spendState(budget.usedPercent, budget.threshold);
    const todaySeries = series.slice(-7);
    const providerSegments = providers.slice(0, 4).map((entry) => ({
      label: providerMeta(entry.provider).name,
      value: entry.cost,
      color: providerMeta(entry.provider).accent,
    }));
    const otherCost = providers.slice(4).reduce((sum, entry) => sum + entry.cost, 0);
    if (otherCost > 0) providerSegments.push({ label: "Other", value: otherCost, color: "#4b4961" });
    const providerTotal = providers.reduce((sum, entry) => sum + entry.cost, 0);
    return { budget, series, providers, recent, recentTotals, projection, runway, state, todaySeries, providerSegments, providerTotal };
  }, [data, pulseDays]);

  const header = (
    <PageHeader
      index="01"
      label="Overview"
      title={
        <>
          Spend intelligence, <span className="accent">without the noise.</span>
        </>
      }
      description="A live command view of gateway traffic, monthly guardrails and the providers behind every request."
      actions={
        <>
          <Link className="btn" to="/gateway">
            <Icon name="route" /> Gateway
          </Link>
          <Link className="btn btn--primary" to="/api-keys">
            <Icon name="key" /> Connect provider
          </Link>
        </>
      }
    />
  );

  if (query.loading && !data) {
    return (
      <>
        {header}
        <div className="overview-loading">
          <SkeletonPanel lines={2} />
          <SkeletonPanel lines={3} />
        </div>
      </>
    );
  }

  if (query.error && !data) {
    return (
      <>
        {header}
        <ErrorState
          title="Telemetry is offline"
          message={query.error}
          detail={query.rawError instanceof Error ? query.rawError.message : undefined}
          onRetry={query.reload}
        >
          <Link className="btn btn--sm" to="/settings">
            Connection settings
          </Link>
        </ErrorState>
      </>
    );
  }

  if (!data || !model) return null;

  const { budget, series, providers, recent, recentTotals, projection, runway, state, todaySeries, providerSegments, providerTotal } = model;
  const stateTone = state === "calm" ? "success" : state === "watch" ? "warning" : "danger";
  const ringColor = state === "critical" ? "#ff849c" : state === "watch" ? "#f2c777" : "#a08fff";
  const monthCost = data.dashboard.monthly_cost;
  const budgetLimit = budget.monthlyLimit;
  const hasBudget = budgetLimit > 0;
  const scopedCount = data.records.filter((record) => record.scope !== "global").length;
  const chartsReady = data.dashboard.total_requests > 0;

  return (
    <>
      {header}

      {query.error ? (
        <div className="overview-refresh-error">
          <ErrorState message={query.error} onRetry={query.reload} title="Refresh failed — showing the last snapshot" />
        </div>
      ) : null}

      <div className="overview-hero-grid">
        <Panel feature glow className="spend-hero">
          <div className="spend-hero-top">
            <div>
              <div className="eyebrow">
                <span className="dot" aria-hidden="true" /> Spend this cycle · {data.budget.month}
              </div>
              <div className="spend-hero-value">
                {formatMoney(monthCost)}
                <span className="spend-hero-of">of {hasBudget ? formatMoney(budgetLimit) : "no limit"}</span>
              </div>
              <div className="spend-hero-sub">
                <Badge tone={stateTone}>
                  {state === "calm" ? "Within guardrail" : state === "watch" ? "Near threshold" : "Limit reached"}
                </Badge>
                <span>{hasBudget ? `${formatPercent(budget.usedPercent)} of the monthly limit` : "Set a monthly guardrail to track pace"}</span>
              </div>
            </div>
            <div className="spend-hero-live">
              <span className={`live-signal${status?.online ? " is-on" : ""}`} aria-hidden="true" />
              <span>{status?.online ? "Gateway live" : "Gateway offline"}</span>
            </div>
          </div>

          <div className="spend-hero-chart">
            <AreaChart
              data={buildDailySeries(data.logs, 14).map((point) => ({
                label: point.label,
                value: point.cost,
                detail: `${formatNumber(point.requests)} requests`,
              }))}
              height={190}
              ariaLabel="Daily spend over the last 14 days"
              emptyHint="No spend recorded in the last 14 days"
            />
          </div>

          <div className="spend-hero-metrics">
            <div>
              <span>Today</span>
              <strong>{formatMoney(data.daily.today_cost)}</strong>
              <small>{formatNumber(data.daily.today_requests)} requests</small>
            </div>
            <div>
              <span>Projected month</span>
              <strong>{formatMoney(projection)}</strong>
              <small>at the current daily pace</small>
            </div>
            <div>
              <span>Remaining</span>
              <strong>{hasBudget ? formatMoney(budget.remaining) : "—"}</strong>
              <small>{runway === null ? "no burn-down estimate" : runway === 0 ? "limit exhausted" : `~${runway} days of runway`}</small>
            </div>
          </div>
        </Panel>

        <Panel className="budget-orbit" glow>
          <PanelHeader
            kicker="Guardrail"
            title="Budget orbit"
            actions={<Link className="panel-link" to="/budgets">Manage <Icon name="arrow-up-right" /></Link>}
          />
          <div className="budget-orbit-body">
            <ProgressRing percent={hasBudget ? budget.usedPercent : 0} accent={ringColor} label="Monthly budget used">
              <span className="ring-percent">{hasBudget ? `${Math.round(budget.usedPercent)}` : "—"}<small>{hasBudget ? "%" : ""}</small></span>
              <span className="ring-caption">used</span>
            </ProgressRing>
            <div className="budget-orbit-copy">
              <div className="orbit-remaining">{hasBudget ? formatMoney(budget.remaining) : "No limit"}</div>
              <div className="orbit-label">left this month</div>
              <div className="orbit-meters">
                <BudgetMeter label="Daily" value={data.daily.today_cost} limit={budget.dailyLimit} />
                <BudgetMeter label="Weekly" value={budget.weekSpend} limit={budget.weeklyLimit} />
              </div>
            </div>
          </div>
          <div className="budget-orbit-footer">
            <span><Icon name="layers" size={12} /> {scopedCount} scoped {scopedCount === 1 ? "budget" : "budgets"}</span>
            <span>Alert at {budget.threshold}%</span>
          </div>
        </Panel>
      </div>

      <div className="metric-grid">
        <MetricTile
          icon="wallet"
          label="Spend today"
          value={formatMoney(data.daily.today_cost)}
          meta={`${formatNumber(data.daily.today_requests)} requests recorded`}
          visual={<SparkBlock values={todaySeries.map((point) => point.cost)} />}
          accent="#a08fff"
        />
        <MetricTile
          icon="cpu"
          label="Tokens today"
          value={formatTokens(data.daily.today_tokens)}
          meta={`${formatTokens(data.daily.month_tokens)} this month`}
          visual={<SparkBlock values={todaySeries.map((point) => point.tokens)} accent="#5fe1cd" />}
          accent="#5fe1cd"
        />
        <MetricTile
          icon="activity"
          label="Avg. latency"
          value={data.analytics.monthly.total_requests > 0 ? `${Math.round(data.analytics.monthly.avg_latency_ms)}` : "—"}
          unit={data.analytics.monthly.total_requests > 0 ? "ms" : undefined}
          meta={`${formatNumber(data.analytics.monthly.total_requests)} requests · 30 days`}
          visual={<SparkBlock values={todaySeries.map((point) => point.requests)} accent="#78a2ff" />}
          accent="#78a2ff"
        />
        <MetricTile
          icon="shield"
          label="Reliability"
          value={data.analytics.monthly.total_requests > 0 ? formatPercent(data.analytics.monthly.success_rate, { digits: 1 }) : "—"}
          meta={recentTotals.errors > 0 ? `${formatNumber(recentTotals.errors)} non-success in latest logs` : "No failures in latest logs"}
          visual={<SparkBlock values={todaySeries.map((point) => point.requests - point.errors)} accent="#7ceab5" />}
          accent="#7ceab5"
        />
      </div>

      <div className="overview-mid-grid">
        <Panel className="pulse-panel">
          <PanelHeader
            kicker="Cost signal"
            title="Spend pulse"
            subtitle="Cost across the most recent recorded days. Bars and hover read directly from request history."
            actions={
              <SegmentedControl
                ariaLabel="Spend pulse range"
                value={pulseDays}
                onChange={setPulseDays}
                options={[
                  { value: 7, label: "7D" },
                  { value: 14, label: "14D" },
                  { value: 30, label: "30D" },
                ]}
              />
            }
          />
          <div className="panel-body">
            <div className="pulse-summary">
              <div>
                <span className="pulse-total">{formatMoney(series.reduce((sum, point) => sum + point.cost, 0))}</span>
                <span className="pulse-caption">recorded in the last {pulseDays} days</span>
              </div>
              <div className="pulse-average">
                <span>{formatMoney(series.reduce((sum, point) => sum + point.cost, 0) / pulseDays)}</span>
                <small>avg / day</small>
              </div>
            </div>
            {chartsReady ? (
              <AreaChart
                data={series.map((point) => ({
                  label: point.label,
                  value: point.cost,
                  detail: `${formatNumber(point.requests)} requests · ${formatTokens(point.tokens)} tokens`,
                }))}
                height={214}
                ariaLabel={`Spend over the last ${pulseDays} days`}
              />
            ) : (
              <EmptyState
                icon="chart"
                title="No spend recorded yet"
                copy="Once a request flows through the gateway, its estimated or reported cost appears here."
                actions={<Link className="btn btn--sm" to="/gateway">Open gateway</Link>}
              />
            )}
          </div>
        </Panel>

        <Panel className="provider-orbit-panel">
          <PanelHeader
            kicker="Distribution"
            title="Provider constellation"
            subtitle="Share of recorded cost by provider."
            actions={<Link className="panel-link" to="/providers">All <Icon name="arrow-up-right" /></Link>}
          />
          <div className="panel-body">
            {providers.length === 0 ? (
              <EmptyState
                icon="plug"
                title="No provider traffic"
                copy="Provider spend appears as soon as the gateway records a request."
                actions={<Link className="btn btn--sm" to="/providers">Browse providers</Link>}
              />
            ) : (
              <>
                <div className="provider-orbit-top">
                  <Donut
                    segments={providerSegments}
                    size={142}
                    thickness={9}
                    ariaLabel="Cost share by provider"
                    center={
                      <div className="donut-center-copy">
                        <strong>{formatMoney(providerTotal, { compact: true })}</strong>
                        <span>total cost</span>
                      </div>
                    }
                  />
                  <div className="donut-legend">
                    {providerSegments.map((segment) => (
                      <div className="legend-row" key={segment.label}>
                        <span className="legend-dot" style={{ background: segment.color }} />
                        <span>{segment.label}</span>
                        <strong>{providerTotal > 0 ? formatPercent((segment.value / providerTotal) * 100, { digits: 0 }) : "0%"}</strong>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="provider-bars">
                  {providers.slice(0, 4).map((entry) => {
                    const meta = providerMeta(entry.provider);
                    return (
                      <Link to="/providers" key={entry.key} className="provider-bar-row">
                        <ProviderGlyph provider={entry.provider} size="sm" />
                        <span className="provider-bar-copy">
                          <span className="provider-bar-head">
                            <span>{meta.name}</span>
                            <strong>{formatMoney(entry.cost)}</strong>
                          </span>
                          <span className="progress progress--thin">
                            <span style={{ width: `${Math.max(2, costShare(entry.cost, providerTotal))}%`, background: meta.accent }} />
                          </span>
                        </span>
                        <span className="provider-bar-count mono">{formatNumber(entry.requests)}</span>
                      </Link>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        </Panel>
      </div>

      <div className="overview-lower-grid">
        <Panel>
          <PanelHeader
            kicker="Live feed"
            title="Recent requests"
            subtitle="Latest gateway telemetry, newest first."
            actions={<Link className="panel-link" to="/logs">All logs <Icon name="arrow-up-right" /></Link>}
          />
          {recent.length === 0 ? (
            <EmptyState
              icon="list"
              title="No requests recorded"
              copy="The feed stays empty until a tool sends a request through APICostGuard."
              actions={<Link className="btn btn--sm" to="/gateway">View connection guide</Link>}
            />
          ) : (
            <div className="table-shell">
              <table className="data-table">
                <caption className="sr-only">Latest gateway requests</caption>
                <thead>
                  <tr>
                    <th scope="col">Provider / model</th>
                    <th scope="col">Status</th>
                    <th scope="col">Latency</th>
                    <th scope="col" className="cell-right">Cost</th>
                    <th scope="col" className="cell-right">When</th>
                  </tr>
                </thead>
                <tbody>
                  {recent.map((log) => (
                    <tr key={log.id}>
                      <td>
                        <span className="provider-identity">
                          <ProviderGlyph provider={log.provider} size="xs" />
                          <span className="provider-identity-copy">
                            <span className="provider-identity-name">{providerMeta(log.provider).name}</span>
                            <span className="provider-identity-model mono">{log.model}</span>
                          </span>
                        </span>
                      </td>
                      <td><RequestStatusBadge status={log.status} /></td>
                      <td className="cell-mono">{log.latencyMs ? `${Math.round(log.latencyMs)} ms` : "—"}</td>
                      <td className="cell-right cell-mono">{formatMoney(log.cost)}</td>
                      <td className="cell-right cell-mono faint">{formatRelative(log.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Panel>

        <Panel className="guardrails-panel">
          <PanelHeader
            kicker="Limits"
            title="Guardrails"
            subtitle="Spend against the limits currently enforced by the backend."
            actions={<Link className="panel-link" to="/budgets">Edit <Icon name="arrow-up-right" /></Link>}
          />
          <div className="panel-body guardrail-stack">
            {!hasBudget ? (
              <EmptyState
                icon="gauge"
                title="No monthly guardrail"
                copy="Set a monthly limit so the gateway can stop requests before they exceed your budget."
                actions={<Link className="btn btn--sm btn--primary" to="/budgets">Set a budget</Link>}
              />
            ) : (
              <>
                <div className="guardrail-head">
                  <span>Monthly</span>
                  <strong>{formatMoney(budget.currentSpend)} <span className="faint">/ {formatMoney(budgetLimit)}</span></strong>
                </div>
                <div className={`progress${state === "watch" ? " progress--warning" : state === "critical" ? " progress--danger" : ""}`}>
                  <span style={{ width: `${Math.min(100, budget.usedPercent)}%` }} />
                </div>
                <div className="guardrail-legend">
                  <span>{formatPercent(budget.usedPercent)} used</span>
                  <span>{formatMoney(budget.remaining)} available</span>
                </div>
                <BudgetMeter label="Today" value={data.daily.today_cost} limit={budget.dailyLimit} />
                <BudgetMeter label="This week" value={budget.weekSpend} limit={budget.weeklyLimit} />
                <div className="guardrail-note">
                  <Icon name="shield" size={13} />
                  <span>
                    Gateway refuses new requests once the daily or monthly limit is met. Alert threshold {budget.threshold}%.
                  </span>
                </div>
              </>
            )}
            <div className="quick-links">
              <Link to="/api-keys"><Icon name="key" /> Keys</Link>
              <Link to="/routing"><Icon name="shuffle" /> Routing</Link>
              <Link to="/analytics"><Icon name="chart" /> Analytics</Link>
            </div>
          </div>
        </Panel>
      </div>
    </>
  );
}

function BudgetMeter({ label, value, limit }: { label: string; value: number; limit: number }) {
  const percent = limit > 0 ? Math.min(100, (value / limit) * 100) : 0;
  const tone = percent >= 100 ? " progress--danger" : percent >= 80 ? " progress--warning" : "";
  return (
    <div className="budget-meter-row">
      <div className="budget-meter-labels">
        <span>{label}</span>
        <span className="mono">{limit > 0 ? `${formatMoney(value)} / ${formatMoney(limit)}` : `${formatMoney(value)} / no limit`}</span>
      </div>
      <div className={`progress progress--thin${tone}`}>
        <span style={{ width: `${limit > 0 ? Math.max(percent, value > 0 ? 2 : 0) : 0}%` }} />
      </div>
    </div>
  );
}

function SparkBlock({ values, accent = "#a08fff" }: { values: number[]; accent?: string }) {
  const total = values.reduce((sum, value) => sum + value, 0);
  return (
    <span className="spark-block" aria-hidden="true">
      <span className="spark-block-bars">
        {values.map((value, index) => (
          <span
            key={index}
            style={{
              height: `${total > 0 ? Math.max(8, (value / Math.max(...values, 0.000001)) * 100) : 8}%`,
              background: total > 0 ? accent : "rgba(255,255,255,0.08)",
            }}
          />
        ))}
      </span>
    </span>
  );
}
