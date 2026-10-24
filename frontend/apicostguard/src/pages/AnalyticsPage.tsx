import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Badge } from "../components/ui/Badge";
import { AreaChart, BarChart, Donut } from "../components/ui/Charts";
import { Icon } from "../components/ui/Icon";
import { MetricTile } from "../components/ui/MetricTile";
import { PageHeader } from "../components/ui/PageHeader";
import { Panel, PanelHeader } from "../components/ui/Panel";
import { ProviderGlyph } from "../components/ui/ProviderGlyph";
import { SegmentedControl } from "../components/ui/SegmentedControl";
import { EmptyState, ErrorState, SkeletonPanel } from "../components/ui/States";
import { costShare, statusCounts, totalOf } from "../lib/aggregate";
import { buildDailySeries, filterLogsSince } from "../lib/date";
import {
  formatLatency,
  formatMoney,
  formatNumber,
  formatPercent,
  formatTokens,
} from "../lib/format";
import { providerMeta } from "../lib/providers";
import { useApiQuery } from "../lib/useApiQuery";
import { fetchAnalytics, fetchDashboard, fetchUsageLogs } from "../services/api";
import type { ApiAnalytics, ApiDashboard, UsageLog } from "../services/types";

type Range = 7 | 30 | 90;

interface AnalyticsData {
  analytics: ApiAnalytics;
  dashboard: ApiDashboard;
  logs: UsageLog[];
}

export default function AnalyticsPage() {
  const [range, setRange] = useState<Range>(30);
  const query = useApiQuery<AnalyticsData>(async (signal) => {
    const [analytics, dashboard, logs] = await Promise.all([
      fetchAnalytics(signal),
      fetchDashboard(signal),
      fetchUsageLogs(1000, signal),
    ]);
    return { analytics, dashboard, logs };
  }, []);

  const model = useMemo(() => {
    if (!query.data) return null;
    const logs = filterLogsSince(query.data.logs, range);
    const totals = totalOf(logs);
    const series = buildDailySeries(logs, range);
    const counts = statusCounts(logs);
    const providers = [...query.data.analytics.providers].sort((a, b) => b.total_cost - a.total_cost);
    const providerCost = providers.reduce((sum, item) => sum + item.total_cost, 0);
    const projects = query.data.analytics.projects;
    const projectTotal = projects.reduce((sum, item) => sum + item.total_cost, 0);
    const peak = series.reduce((best, point) => (point.requests > best.requests ? point : best), series[0]);
    const segments = providers.slice(0, 4).map((item) => ({
      label: providerMeta(item.provider).name,
      value: item.total_cost,
      color: providerMeta(item.provider).accent,
    }));
    const other = providers.slice(4).reduce((sum, item) => sum + item.total_cost, 0);
    if (other > 0) segments.push({ label: "Other", value: other, color: "#4b4961" });
    return {
      logs,
      totals,
      series,
      counts,
      providers,
      providerCost,
      projects,
      projectTotal,
      peak,
      segments,
    };
  }, [query.data, range]);

  const header = (
    <PageHeader
      index="08"
      label="Analytics"
      title={
        <>
          Patterns in the noise. <span className="accent">Evidence in the ledger.</span>
        </>
      }
      description="Volume, latency and reliability derived from recorded gateway telemetry. Period summaries come from the backend; range charts use the latest 1,000 request logs."
      actions={
        <>
          <Link className="btn" to="/logs">
            <Icon name="list" /> Request logs
          </Link>
          <Link className="btn btn--primary" to="/usage">
            <Icon name="wallet" /> Cost detail
          </Link>
        </>
      }
    />
  );

  if (query.loading && !query.data) {
    return (
      <>
        {header}
        <div className="grid-2">
          <SkeletonPanel lines={4} />
          <SkeletonPanel lines={4} />
        </div>
      </>
    );
  }

  if (query.error && !query.data) {
    return (
      <>
        {header}
        <ErrorState
          message={query.error}
          detail={query.rawError instanceof Error ? query.rawError.message : undefined}
          onRetry={query.reload}
          title="Analytics telemetry unavailable"
        />
      </>
    );
  }

  if (!query.data || !model) return null;

  const { analytics } = query.data;
  const hasRangeTraffic = model.totals.requests > 0;
  const statusTotal = Math.max(1, model.totals.requests);
  const successShare = (model.counts.success / statusTotal) * 100;
  const errorShare = (model.counts.error / statusTotal) * 100;
  const blockedShare = (model.counts.blocked / statusTotal) * 100;

  return (
    <>
      {header}

      {query.error ? (
        <div style={{ marginBottom: 18 }}>
          <ErrorState message={query.error} onRetry={query.reload} title="Refresh failed — showing the last snapshot" />
        </div>
      ) : null}

      <div className="metric-grid">
        <MetricTile
          icon="activity"
          label={`Requests · ${range} days`}
          value={formatNumber(model.totals.requests)}
          meta={`${formatNumber(model.totals.requests / range)} per day on average`}
          accent="#a08fff"
        />
        <MetricTile
          icon="chart"
          label="Average latency"
          value={hasRangeTraffic ? `${Math.round(model.totals.avgLatency)}` : "—"}
          unit={hasRangeTraffic ? "ms" : undefined}
          meta={hasRangeTraffic ? "across recorded requests" : "no requests recorded"}
          accent="#78a2ff"
        />
        <MetricTile
          icon="shield"
          label="Reliability"
          value={hasRangeTraffic ? formatPercent(model.totals.successRate, { digits: 1 }) : "—"}
          meta={`${formatNumber(model.counts.error)} errors · ${formatNumber(model.counts.blocked)} blocked`}
          accent="#7ceab5"
        />
        <MetricTile
          icon="wallet"
          label="Recorded cost"
          value={formatMoney(model.totals.cost)}
          meta={`${formatTokens(model.totals.tokens)} tokens in range`}
          accent="#f2c777"
        />
      </div>

      <div className="analytics-hero-grid">
        <Panel className="analytics-hero" feature glow>
          <div className="analytics-hero-head">
            <div>
              <div className="eyebrow">
                <span className="dot" aria-hidden="true" /> Trajectory · {range} days
              </div>
              <div className="spend-hero-value" style={{ fontSize: "clamp(28px, 3.6vw, 42px)" }}>
                {formatMoney(model.totals.cost)}
                <span className="spend-hero-of">recorded spend</span>
              </div>
            </div>
            <SegmentedControl<Range>
              value={range}
              onChange={setRange}
              ariaLabel="Analytics range"
              options={[
                { value: 7, label: "7D" },
                { value: 30, label: "30D" },
                { value: 90, label: "90D" },
              ]}
            />
          </div>
          <AreaChart
            data={model.series.map((point) => ({
              label: point.label,
              value: point.cost,
              detail: `${formatNumber(point.requests)} requests · ${formatTokens(point.tokens)} tokens`,
            }))}
            height={230}
            ariaLabel={`Recorded cost over the last ${range} days`}
            emptyHint="No cost recorded in this range"
          />
          <div className="analytics-hero-stats">
            <div>
              <span>Peak volume day</span>
              <strong>{model.peak?.label ?? "—"} · {formatNumber(model.peak?.requests ?? 0)} req</strong>
            </div>
            <div>
              <span>Active providers</span>
              <strong>{formatNumber(new Set(model.logs.map((log) => log.provider)).size)}</strong>
            </div>
            <div>
              <span>Tokens observed</span>
              <strong>{formatTokens(model.totals.tokens)}</strong>
            </div>
          </div>
        </Panel>

        <Panel>
          <PanelHeader
            kicker="Backend summaries"
            title="Period comparison"
            subtitle="Authoritative totals from the analytics service, not a client-side estimate."
          />
          <div className="panel-body">
            <div className="period-grid">
              <PeriodCard label="Today" summary={analytics.daily} />
              <PeriodCard label="This week" summary={analytics.weekly} />
              <PeriodCard label="This month" summary={analytics.monthly} />
            </div>
            <div className="usage-scope-note">
              <Icon name="info" size={12} />
              <span>
                Provider and project statistics below use the backend's fixed 7-day window. The range selector only
                changes the request-derived charts and metrics.
              </span>
            </div>
          </div>
        </Panel>
      </div>

      <div className="analytics-split-grid">
        <Panel>
          <PanelHeader
            kicker="Volume"
            title="Requests per day"
            subtitle="Bars use request history in the selected range. Gaps remain visible as empty days."
            actions={<Badge tone="violet">{formatNumber(model.totals.requests)} recorded</Badge>}
          />
          <div className="panel-body">
            {hasRangeTraffic ? (
              <BarChart
                data={model.series.map((point) => ({
                  label: point.label,
                  value: point.requests,
                  detail: `${formatNumber(point.errors)} non-success`,
                }))}
                height={200}
                accent="#78a2ff"
                ariaLabel={`Request volume over the last ${range} days`}
                emptyHint="No requests recorded in this range"
              />
            ) : (
              <EmptyState
                icon="activity"
                title="No request volume in range"
                copy="Once the gateway records requests, daily volume appears here. Nothing is simulated."
                actions={<Link className="btn btn--sm" to="/gateway">Connection guide</Link>}
              />
            )}
          </div>
        </Panel>

        <Panel>
          <PanelHeader
            kicker="Reliability"
            title="Outcome split"
            subtitle="Success, error and blocked outcomes across the selected range."
          />
          <div className="panel-body">
            {hasRangeTraffic ? (
              <div className="status-split">
                <div className="status-split-bar" role="img" aria-label={`${formatNumber(model.counts.success)} success, ${formatNumber(model.counts.error)} error, ${formatNumber(model.counts.blocked)} blocked`}>
                  <span style={{ flexGrow: Math.max(successShare, 0.5), background: "#6ee7b7" }} />
                  <span style={{ flexGrow: Math.max(errorShare, 0.5), background: "#ff849c" }} />
                  <span style={{ flexGrow: Math.max(blockedShare, 0.5), background: "#f2c777" }} />
                </div>
                <div className="status-split-legend">
                  <StatusSplitRow color="#6ee7b7" label="Success" count={model.counts.success} total={statusTotal} />
                  <StatusSplitRow color="#ff849c" label="Error" count={model.counts.error} total={statusTotal} />
                  <StatusSplitRow color="#f2c777" label="Blocked by budget" count={model.counts.blocked} total={statusTotal} />
                </div>
                <div className="usage-scope-note">
                  <Icon name="shield" size={12} />
                  <span>
                    A blocked request is refused before an upstream call. It may still appear in the ledger with zero or
                    estimated cost, depending on when the budget gate stopped it.
                  </span>
                </div>
              </div>
            ) : (
              <EmptyState icon="shield" title="No outcomes to split" copy="Reliability appears after requests are recorded." />
            )}
          </div>
        </Panel>
      </div>

      <div className="analytics-bottom-grid">
        <Panel>
          <PanelHeader
            kicker="Attribution · 7 days"
            title="Provider performance"
            subtitle="Backend provider statistics for the last seven days."
            actions={<Link className="panel-link" to="/providers">Catalogue <Icon name="arrow-up-right" /></Link>}
          />
          {model.providers.length === 0 ? (
            <EmptyState
              icon="plug"
              title="No provider statistics"
              copy="Provider performance appears once the backend has recorded requests in the last week."
            />
          ) : (
            <div className="table-shell">
              <table className="data-table analytics-table">
                <caption className="sr-only">Provider performance over the last seven days</caption>
                <thead>
                  <tr>
                    <th scope="col">Provider</th>
                    <th scope="col" className="cell-right">Requests</th>
                    <th scope="col" className="cell-right">Latency</th>
                    <th scope="col" className="cell-right">Cost</th>
                    <th scope="col">Share</th>
                  </tr>
                </thead>
                <tbody>
                  {model.providers.map((entry) => {
                    const meta = providerMeta(entry.provider);
                    const share = costShare(entry.total_cost, model.providerCost);
                    return (
                      <tr key={entry.provider}>
                        <td>
                          <span className="provider-identity">
                            <ProviderGlyph provider={entry.provider} size="xs" />
                            <span className="provider-identity-copy">
                              <span className="provider-identity-name">{meta.name}</span>
                              <span className="provider-identity-model mono">{entry.provider}</span>
                            </span>
                          </span>
                        </td>
                        <td className="cell-right cell-mono">{formatNumber(entry.requests)}</td>
                        <td className="cell-right cell-mono">{formatLatency(entry.avg_latency_ms)}</td>
                        <td className="cell-right cell-mono cell-strong">{formatMoney(entry.total_cost)}</td>
                        <td>
                          <div className="provider-table-bar">
                            <span style={{ width: `${Math.max(share, 2)}%`, background: meta.accent }} />
                            <span className="mono">{share.toFixed(1)}%</span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
          <div className="table-footer">
            <span>Window fixed by the backend analytics endpoint</span>
            <span>{formatMoney(model.providerCost)} attributed</span>
          </div>
        </Panel>

        <Panel>
          <PanelHeader
            kicker="Attribution · 7 days"
            title="Project signals"
            subtitle="Requests grouped by the x-project-id header, when one is sent."
            actions={<Link className="panel-link" to="/usage">Cost view <Icon name="arrow-up-right" /></Link>}
          />
          <div className="panel-body">
            {model.projects.length === 0 ? (
              <EmptyState
                icon="layers"
                title="No project attribution"
                copy="Send an x-project-id header with gateway requests to group usage. Unattributed traffic is not invented into a project."
              />
            ) : (
              <div className="signal-list">
                {model.projects.slice(0, 8).map((project) => {
                  const share = costShare(project.total_cost, model.projectTotal);
                  return (
                    <div className="signal-row" key={project.project_id ?? "unattributed"}>
                      <span
                        className="signal-dot"
                        style={{ background: share > 50 ? "#f2c777" : share > 20 ? "#a08fff" : "#78a2ff" }}
                      />
                      <div className="signal-copy">
                        <span>{project.project_id ?? "Unattributed"}</span>
                        <small>{formatNumber(project.requests)} requests · {formatPercent(share, { digits: 1 })} of project cost</small>
                      </div>
                      <strong>{formatMoney(project.total_cost)}</strong>
                    </div>
                  );
                })}
              </div>
            )}
            <div className="usage-scope-note">
              <Icon name="layers" size={12} />
              <span>Project statistics are strongest when every caller sends a stable project identifier.</span>
            </div>
          </div>
        </Panel>
      </div>

      <div className="grid-2" style={{ marginTop: 18 }}>
        <Panel>
          <PanelHeader
            kicker="Composition"
            title="Cost by provider"
            subtitle="Backend provider totals for the last seven days."
          />
          <div className="panel-body">
            {model.segments.length === 0 ? (
              <EmptyState icon="chart" title="No cost to compose" copy="Provider cost shares appear after recorded traffic." />
            ) : (
              <>
                <div className="usage-donut-row">
                  <Donut
                    segments={model.segments}
                    size={168}
                    thickness={11}
                    ariaLabel="Cost share by provider"
                    center={
                      <div className="donut-center-copy">
                        <strong>{formatMoney(model.providerCost, { compact: true })}</strong>
                        <span>7-day cost</span>
                      </div>
                    }
                  />
                </div>
                <div className="usage-provider-legend">
                  {model.segments.map((segment) => (
                    <div className="legend-row" key={segment.label}>
                      <span className="legend-dot" style={{ background: segment.color }} />
                      <span>{segment.label}</span>
                      <strong>{formatMoney(segment.value)}</strong>
                      <small className="mono">
                        {model.providerCost > 0 ? formatPercent((segment.value / model.providerCost) * 100, { digits: 0 }) : "0%"}
                      </small>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </Panel>

        <Panel>
          <PanelHeader
            kicker="Latency"
            title="Provider response times"
            subtitle="Average latency reported by the backend per provider."
          />
          <div className="panel-body">
            {model.providers.length === 0 ? (
              <EmptyState icon="clock" title="No latency samples" copy="Average latency appears after the gateway records upstream responses." />
            ) : (
              <div className="rank-list">
                {[...model.providers]
                  .sort((a, b) => b.avg_latency_ms - a.avg_latency_ms)
                  .map((entry) => {
                    const slowest = Math.max(...model.providers.map((item) => item.avg_latency_ms), 1);
                    return (
                      <div className="rank-row" key={entry.provider}>
                        <ProviderGlyph provider={entry.provider} size="sm" />
                        <div className="rank-main">
                          <div className="rank-head">
                            <span>{providerMeta(entry.provider).name}</span>
                            <strong className="mono">{formatLatency(entry.avg_latency_ms)}</strong>
                          </div>
                          <div className="progress progress--thin">
                            <span
                              style={{
                                width: `${Math.max((entry.avg_latency_ms / slowest) * 100, 2)}%`,
                                background: providerMeta(entry.provider).accent,
                              }}
                            />
                          </div>
                        </div>
                        <span className="rank-meta mono">{formatNumber(entry.requests)} req</span>
                      </div>
                    );
                  })}
              </div>
            )}
            <div className="health-footnote">
              <Icon name="info" size={12} />
              Latency is averaged from recorded outcomes. It does not include client-side network time.
            </div>
          </div>
        </Panel>
      </div>

      <Panel style={{ marginTop: 18 }}>
        <PanelHeader
          kicker="Method"
          title="How these numbers are produced"
          subtitle="Every figure on this page traces to a backend endpoint or a recorded request."
        />
        <div className="panel-body">
          <div className="routing-notes">
            <div className="routing-note">
              <Icon name="check" />
              <span><strong>Period cards</strong> come from <code>/api/analytics</code> daily, weekly and monthly summaries.</span>
            </div>
            <div className="routing-note">
              <Icon name="check" />
              <span><strong>Range charts</strong> are computed from up to 1,000 rows returned by <code>/api/history</code>.</span>
            </div>
            <div className="routing-note">
              <Icon name="check" />
              <span><strong>Provider and project attribution</strong> use the backend's fixed seven-day statistics window.</span>
            </div>
            <div className="routing-note">
              <Icon name="info" />
              <span><strong>No synthetic data</strong> is generated when the ledger is empty. Empty states are shown instead.</span>
            </div>
          </div>
        </div>
      </Panel>
    </>
  );
}

function PeriodCard({
  label,
  summary,
}: {
  label: string;
  summary: { total_cost: number; total_requests: number; avg_latency_ms: number; success_rate: number };
}) {
  return (
    <div className="period-card">
      <div className="period-card-head">
        <span>{label}</span>
        <strong>{formatMoney(summary.total_cost)}</strong>
      </div>
      <div className="period-card-metrics">
        <div><span>Requests</span><strong>{formatNumber(summary.total_requests)}</strong></div>
        <div><span>Latency</span><strong>{summary.total_requests > 0 ? formatLatency(summary.avg_latency_ms) : "—"}</strong></div>
        <div><span>Success</span><strong>{summary.total_requests > 0 ? formatPercent(summary.success_rate) : "—"}</strong></div>
      </div>
    </div>
  );
}

function StatusSplitRow({
  color,
  label,
  count,
  total,
}: {
  color: string;
  label: string;
  count: number;
  total: number;
}) {
  return (
    <div className="status-split-row">
      <span className="legend-dot" style={{ background: color }} />
      <span>{label}</span>
      <strong>{formatNumber(count)}</strong>
      <small className="mono">{formatPercent((count / total) * 100, { digits: 1 })}</small>
    </div>
  );
}
