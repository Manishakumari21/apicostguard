import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Badge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import { AreaChart, Donut, Sparkline } from "../components/ui/Charts";
import { Icon } from "../components/ui/Icon";
import { MetricTile } from "../components/ui/MetricTile";
import { PageHeader } from "../components/ui/PageHeader";
import { Panel, PanelHeader } from "../components/ui/Panel";
import { ProviderGlyph } from "../components/ui/ProviderGlyph";
import { SegmentedControl } from "../components/ui/SegmentedControl";
import { EmptyState, ErrorState, SkeletonPanel } from "../components/ui/States";
import { useToast } from "../context/ToastContext";
import {
  aggregateByModel,
  aggregateByProvider,
  costPerThousandTokens,
  costShare,
  totalOf,
} from "../lib/aggregate";
import { buildDailySeries, dayKey, filterLogsSince, todayKey } from "../lib/date";
import { downloadCsv, logsToCsv } from "../lib/csv";
import {
  daysInCurrentMonth,
  dayOfCurrentMonth,
  projectionFromPace,
} from "../lib/budget";
import {
  formatMoney,
  formatNumber,
  formatPercent,
  formatTokens,
} from "../lib/format";
import { providerMeta } from "../lib/providers";
import { useApiQuery } from "../lib/useApiQuery";
import {
  fetchAnalytics,
  fetchBudget,
  fetchDashboard,
  fetchUsageLogs,
} from "../services/api";
import type { ApiAnalytics, ApiBudget, ApiDashboard, UsageLog } from "../services/types";

type Range = 7 | 30 | 90;

interface UsageData {
  dashboard: ApiDashboard;
  analytics: ApiAnalytics;
  budget: ApiBudget;
  logs: UsageLog[];
}

export default function UsagePage() {
  const [range, setRange] = useState<Range>(30);
  const { notify } = useToast();
  const query = useApiQuery<UsageData>(async (signal) => {
    const [dashboard, analytics, budget, logs] = await Promise.all([
      fetchDashboard(signal),
      fetchAnalytics(signal),
      fetchBudget(signal),
      fetchUsageLogs(1000, signal),
    ]);
    return { dashboard, analytics, budget, logs };
  }, []);

  const model = useMemo(() => {
    if (!query.data) return null;
    const logs = filterLogsSince(query.data.logs, range);
    const total = totalOf(logs);
    const byProvider = aggregateByProvider(logs);
    const byModel = aggregateByModel(logs);
    const series = buildDailySeries(logs, range);
    const providerTotal = byProvider.reduce((sum, item) => sum + item.cost, 0);
    const segments = byProvider.slice(0, 4).map((entry) => ({
      label: providerMeta(entry.provider).name,
      value: entry.cost,
      color: providerMeta(entry.provider).accent,
    }));
    const other = byProvider.slice(4).reduce((sum, entry) => sum + entry.cost, 0);
    if (other > 0) segments.push({ label: "Other", value: other, color: "#4b4961" });
    const peak = series.reduce((best, point) => (point.cost > best.cost ? point : best), series[0]);
    const perThousand = costPerThousandTokens(logs);
    const today = dayKey(new Date().toISOString());
    const todayLogs = logs.filter((log) => log.createdAt.slice(0, 10) === today);
    const todayTotal = totalOf(todayLogs);
    const budget = query.data.budget;
    const projection = projectionFromPace(budget.current_spend, dayOfCurrentMonth(), daysInCurrentMonth());
    return { logs, total, byProvider, byModel, series, providerTotal, segments, peak, perThousand, todayTotal, budget, projection };
  }, [query.data, range]);

  const exportCsv = () => {
    if (!model || model.logs.length === 0) return;
    downloadCsv(`apicostguard-usage-${range}d-${todayKey()}.csv`, logsToCsv(model.logs));
    notify({
      tone: "success",
      title: "CSV exported",
      message: `${formatNumber(model.logs.length)} request records from the last ${range} days.`,
    });
  };

  const header = (
    <PageHeader
      index="06"
      label="Usage & Costs"
      title={
        <>
          Follow the money <span className="accent">through every request.</span>
        </>
      }
      description="A transparent ledger of recorded spend. Range figures use the latest 1,000 request logs; daily and cycle totals come from the backend summaries."
      actions={
        <>
          <Button icon="download" onClick={exportCsv} disabled={!model || model.logs.length === 0}>
            Export CSV
          </Button>
          <Link className="btn btn--primary" to="/logs">
            <Icon name="list" /> Request logs
          </Link>
        </>
      }
    />
  );

  if (query.loading && !query.data) {
    return <>{header}<div className="grid-2"><SkeletonPanel lines={3} /><SkeletonPanel lines={3} /></div></>;
  }

  if (query.error && !query.data) {
    return <>{header}<ErrorState message={query.error} detail={query.rawError instanceof Error ? query.rawError.message : undefined} onRetry={query.reload} /></>;
  }

  if (!query.data || !model) return null;

  const budgetPercent = model.budget.monthly_limit > 0 ? Math.min(100, (model.budget.current_spend / model.budget.monthly_limit) * 100) : 0;

  return (
    <>
      {header}

      <div className="metric-grid">
        <MetricTile
          icon="wallet"
          label={`Spend · ${range} days`}
          value={formatMoney(model.total.cost)}
          meta={`${formatNumber(model.total.requests)} requests`}
          visual={<Sparkline values={model.series.map((point) => point.cost)} accent="#a08fff" width={84} height={28} />}
          accent="#a08fff"
        />
        <MetricTile
          icon="calendar"
          label="Daily average"
          value={formatMoney(model.total.cost / range)}
          meta={`across ${range} calendar days`}
          visual={<Sparkline values={model.series.map((point) => point.cost)} accent="#f2c777" width={84} height={28} />}
          accent="#f2c777"
        />
        <MetricTile
          icon="cpu"
          label="Tokens"
          value={formatTokens(model.total.tokens)}
          meta={`${formatTokenRate(model.total.tokens, model.total.requests)} per request`}
          visual={<Sparkline values={model.series.map((point) => point.tokens)} accent="#5fe1cd" width={84} height={28} />}
          accent="#5fe1cd"
        />
        <MetricTile
          icon="activity"
          label="Cost per request"
          value={model.total.requests > 0 ? formatMoney(model.total.cost / model.total.requests, { precise: true }) : "—"}
          meta={model.total.tokens > 0 ? `${formatMoney(model.perThousand, { precise: true })} per 1K tokens` : "no tokens in range"}
          accent="#78a2ff"
        />
      </div>

      <div className="usage-hero-grid">
        <Panel className="usage-chart-panel">
          <PanelHeader
            kicker="Trajectory"
            title="Cost over time"
            subtitle="Recorded cost per UTC day. Zero days remain visible so gaps are not hidden."
            actions={
              <SegmentedControl<Range>
                value={range}
                onChange={setRange}
                options={[
                  { value: 7, label: "7D" },
                  { value: 30, label: "30D" },
                  { value: 90, label: "90D" },
                ]}
                ariaLabel="Cost range"
              />
            }
          />
          <div className="panel-body">
            <div className="usage-chart-summary">
              <div>
                <span className="big-number">{formatMoney(model.total.cost)}</span>
                <span className="usage-chart-caption">total recorded cost</span>
              </div>
              <div className="usage-chart-peak">
                <span>Peak day</span>
                <strong>{formatMoney(model.peak?.cost ?? 0)}</strong>
                <small>{model.peak?.label ?? "—"}</small>
              </div>
            </div>
            <AreaChart
              data={model.series.map((point) => ({
                label: point.label,
                value: point.cost,
                detail: `${formatNumber(point.requests)} requests`,
              }))}
              height={230}
              ariaLabel={`Cost over the last ${range} days`}
              emptyHint="No spend recorded in this range"
            />
          </div>
        </Panel>

        <Panel className="usage-composition">
          <PanelHeader kicker="Composition" title="Spend by provider" subtitle="Share of recorded cost in the selected range." />
          <div className="panel-body">
            {model.byProvider.length === 0 ? (
              <EmptyState icon="chart" title="Nothing to split" copy="Provider shares appear after the first recorded request." />
            ) : (
              <>
                <div className="usage-donut-row">
                  <Donut
                    segments={model.segments}
                    size={168}
                    thickness={11}
                    ariaLabel="Spend share by provider"
                    center={
                      <div className="donut-center-copy">
                        <strong>{formatMoney(model.providerTotal, { compact: true })}</strong>
                        <span>recorded</span>
                      </div>
                    }
                  />
                </div>
                <div className="usage-provider-legend">
                  {model.segments.map((segment) => (
                    <div key={segment.label} className="legend-row">
                      <span className="legend-dot" style={{ background: segment.color }} />
                      <span>{segment.label}</span>
                      <strong>{formatMoney(segment.value)}</strong>
                      <small className="mono">{model.providerTotal > 0 ? formatPercent((segment.value / model.providerTotal) * 100, { digits: 0 }) : "0%"}</small>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </Panel>
      </div>

      <div className="usage-ledger-grid">
        <Panel>
          <PanelHeader
            kicker="Ledger"
            title="Daily record"
            subtitle="Every UTC day in the selected range, including days without requests."
            actions={<Button size="sm" variant="ghost" icon="download" onClick={exportCsv} disabled={model.logs.length === 0}>CSV</Button>}
          />
          <div className="table-shell ledger-scroll">
            <table className="data-table ledger-table">
              <caption className="sr-only">Daily cost ledger</caption>
              <thead>
                <tr>
                  <th scope="col">Day</th>
                  <th scope="col" className="cell-right">Requests</th>
                  <th scope="col" className="cell-right">Tokens</th>
                  <th scope="col" className="cell-right">Cost</th>
                  <th scope="col" className="cell-right">Avg / request</th>
                  <th scope="col" className="cell-right">Errors</th>
                </tr>
              </thead>
              <tbody>
                {[...model.series].reverse().map((point) => (
                  <tr key={point.key}>
                    <td className="cell-strong">{point.label}<span className="ledger-day mono">{point.key}</span></td>
                    <td className="cell-right cell-mono">{formatNumber(point.requests)}</td>
                    <td className="cell-right cell-mono">{formatTokens(point.tokens)}</td>
                    <td className="cell-right cell-mono cell-strong">{formatMoney(point.cost)}</td>
                    <td className="cell-right cell-mono">{point.requests > 0 ? formatMoney(point.cost / point.requests, { precise: true }) : "—"}</td>
                    <td className="cell-right">{point.errors > 0 ? <Badge tone="danger">{point.errors}</Badge> : <span className="faint mono">0</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>

        <div className="usage-side-stack">
          <Panel>
            <PanelHeader kicker="Current cycle" title="Pace to limit" />
            <div className="panel-body">
              <div className="spread" style={{ alignItems: "flex-end" }}>
                <div>
                  <div className="usage-side-value">{formatMoney(model.budget.current_spend)}</div>
                  <div className="usage-side-caption">spent this month</div>
                </div>
                <Badge tone={model.budget.monthly_limit === 0 ? "neutral" : model.projection > model.budget.monthly_limit ? "warning" : "success"}>
                  {model.budget.monthly_limit === 0 ? "No limit" : model.projection > model.budget.monthly_limit ? "Overshoot risk" : "On pace"}
                </Badge>
              </div>
              <div className="progress" style={{ marginTop: 14 }}>
                <span style={{ width: `${Math.max(budgetPercent, model.budget.current_spend > 0 ? 2 : 0)}%` }} />
              </div>
              <div className="usage-pace-meta">
                <span>{model.budget.monthly_limit > 0 ? `${formatPercent(budgetPercent)} of ${formatMoney(model.budget.monthly_limit)}` : "No monthly limit configured"}</span>
                <span className="mono">{formatMoney(model.budget.remaining)} left</span>
              </div>
              <div className="usage-projection">
                <span>Projected at current pace</span>
                <strong>{formatMoney(model.projection)}</strong>
              </div>
              <Link className="panel-link" to="/budgets">Adjust budgets <Icon name="arrow-right" /></Link>
            </div>
          </Panel>

          <Panel>
            <PanelHeader kicker="Today" title="Live cycle snapshot" />
            <div className="panel-body">
              <dl className="kv-list">
                <div className="kv-row"><dt>Spend</dt><dd className="mono">{formatMoney(model.todayTotal.cost)}</dd></div>
                <div className="kv-row"><dt>Requests</dt><dd className="mono">{formatNumber(model.todayTotal.requests)}</dd></div>
                <div className="kv-row"><dt>Tokens</dt><dd className="mono">{formatTokens(model.todayTotal.tokens)}</dd></div>
                <div className="kv-row"><dt>Success</dt><dd className="mono">{model.todayTotal.requests > 0 ? formatPercent(model.todayTotal.successRate) : "—"}</dd></div>
                <div className="kv-row"><dt>Peak day</dt><dd>{model.peak?.label ?? "—"}</dd></div>
              </dl>
              <div className="usage-scope-note">
                <Icon name="info" size={12} />
                <span>Range totals come from up to 1,000 recent logs. Cycle totals come from the backend budget snapshot.</span>
              </div>
            </div>
          </Panel>
        </div>
      </div>

      <div className="usage-bottom-grid">
        <Panel>
          <PanelHeader
            kicker="Attribution"
            title="Most expensive models"
            subtitle="Ranked by recorded cost in the selected range."
            actions={<Link className="panel-link" to="/models">All models <Icon name="arrow-up-right" /></Link>}
          />
          <div className="panel-body">
            {model.byModel.length === 0 ? (
              <EmptyState icon="cube" title="No model spend" copy="Model rankings appear after requests are recorded." />
            ) : (
              <div className="rank-list">
                {model.byModel.slice(0, 6).map((entry) => {
                  const meta = providerMeta(entry.provider);
                  return (
                    <div className="rank-row" key={entry.key}>
                      <ProviderGlyph provider={entry.provider} size="sm" />
                      <div className="rank-main">
                        <div className="rank-head">
                          <span>{entry.name}<small className="rank-provider">{meta.name}</small></span>
                          <strong className="mono">{formatMoney(entry.cost)}</strong>
                        </div>
                        <div className="progress progress--thin">
                          <span style={{ width: `${Math.max(costShare(entry.cost, model.total.cost), 2)}%`, background: meta.accent }} />
                        </div>
                      </div>
                      <span className="rank-meta mono">{formatNumber(entry.requests)} req</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </Panel>

        <Panel>
          <PanelHeader
            kicker="Projects"
            title="Project attribution"
            subtitle="Backend project statistics for the last 7 days."
            actions={<Badge tone="violet">7D window</Badge>}
          />
          <div className="panel-body">
            {query.data.analytics.projects.length === 0 ? (
              <EmptyState
                icon="layers"
                title="No attributed projects"
                copy="Send an x-project-id header through the gateway to group requests into a project."
              />
            ) : (
              <div className="project-list">
                {query.data.analytics.projects.slice(0, 8).map((project) => (
                  <div className="project-row" key={project.project_id ?? "unattributed"}>
                    <span className="project-icon"><Icon name="layers" /></span>
                    <div className="project-copy">
                      <span className="project-name">{project.project_id ?? "Unattributed"}</span>
                      <span className="project-requests">{formatNumber(project.requests)} requests</span>
                    </div>
                    <strong className="mono">{formatMoney(project.total_cost)}</strong>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Panel>
      </div>
    </>
  );
}

function formatTokenRate(tokens: number, requests: number): string {
  if (requests <= 0) return "—";
  return formatTokens(Math.round(tokens / requests));
}
