import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Badge, RequestStatusBadge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import { Sparkline } from "../components/ui/Charts";
import { Dialog } from "../components/ui/Dialog";
import { Icon } from "../components/ui/Icon";
import { MetricTile } from "../components/ui/MetricTile";
import { PageHeader } from "../components/ui/PageHeader";
import { Panel } from "../components/ui/Panel";
import { ProviderGlyph, ProviderIdentity } from "../components/ui/ProviderGlyph";
import { SegmentedControl } from "../components/ui/SegmentedControl";
import { EmptyState, ErrorState, SkeletonPanel } from "../components/ui/States";
import {
  aggregateByModel,
  averageLatency,
  costShare,
  errorRate,
  totalOf,
} from "../lib/aggregate";
import { buildDailySeries, filterLogsSince } from "../lib/date";
import {
  formatLatency,
  formatMoney,
  formatNumber,
  formatPercent,
  formatRate,
  formatRelative,
  formatTokens,
} from "../lib/format";
import { providerMeta } from "../lib/providers";
import { useApiQuery } from "../lib/useApiQuery";
import { fetchProviders, fetchUsageLogs } from "../services/api";
import type { ApiProviderInfo, UsageLog } from "../services/types";

type Range = 7 | 30 | 90;
type SortKey = "cost" | "requests" | "tokens" | "latency" | "errors";

interface ModelRow {
  key: string;
  provider: string;
  name: string;
  requests: number;
  tokens: number;
  cost: number;
  latency: number;
  errorRate: number;
  lastSeen: number | null;
}

interface ModelsData {
  logs: UsageLog[];
  providers: ApiProviderInfo[];
}

export default function ModelsPage() {
  const [range, setRange] = useState<Range>(30);
  const [providerFilter, setProviderFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<{ key: SortKey; dir: "asc" | "desc" }>({ key: "cost", dir: "desc" });
  const [selected, setSelected] = useState<ModelRow | null>(null);
  const query = useApiQuery<ModelsData>(async (signal) => {
    const [logs, providers] = await Promise.all([fetchUsageLogs(1000, signal), fetchProviders(signal)]);
    return { logs, providers };
  }, []);

  const model = useMemo(() => {
    if (!query.data) return null;
    const logs = filterLogsSince(query.data.logs, range);
    const total = totalOf(logs);
    const aggregates = aggregateByModel(logs);
    const rows: ModelRow[] = aggregates.map((entry) => ({
      key: entry.key,
      provider: entry.provider,
      name: entry.name,
      requests: entry.requests,
      tokens: entry.tokens,
      cost: entry.cost,
      latency: averageLatency(entry),
      errorRate: errorRate(entry),
      lastSeen: entry.lastSeen,
    }));

    const filtered = rows.filter((row) => {
      if (providerFilter !== "all" && row.provider !== providerFilter) return false;
      const term = search.trim().toLowerCase();
      return !term || `${row.provider} ${row.name}`.toLowerCase().includes(term);
    });

    const sorted = [...filtered].sort((a, b) => {
      const aValue = sort.key === "latency" ? a.latency : sort.key === "errors" ? a.errorRate : a[sort.key];
      const bValue = sort.key === "latency" ? b.latency : sort.key === "errors" ? b.errorRate : b[sort.key];
      return sort.dir === "asc" ? aValue - bValue : bValue - aValue;
    });

    const providerIds = [...new Set(rows.map((row) => row.provider))];
    return { logs, total, rows, filtered: sorted, providerIds };
  }, [query.data, range, providerFilter, search, sort]);

  const toggleSort = (key: SortKey) => {
    setSort((current) => ({ key, dir: current.key === key && current.dir === "desc" ? "asc" : "desc" }));
  };

  const ariaSort = (key: SortKey) => (sort.key === key ? (sort.dir === "asc" ? "ascending" : "descending") : "none");

  return (
    <>
      <PageHeader
        index="05"
        label="Models"
        title={
          <>
            Every model, <span className="accent">measured on evidence.</span>
          </>
        }
        description="A model leaderboard assembled from recorded requests. The gateway has no separate model registry, so this view never invents models that have not appeared in telemetry."
        actions={
          <>
            <Link className="btn" to="/providers">
              <Icon name="plug" /> Providers
            </Link>
            <Link className="btn btn--primary" to="/logs">
              <Icon name="list" /> Request logs
            </Link>
          </>
        }
      />

      {model ? (
        <>
          <div className="metric-grid">
            <MetricTile icon="cube" label="Models observed" value={formatNumber(model.rows.length)} meta={`${model.providerIds.length} providers in range`} accent="#a08fff" />
            <MetricTile icon="activity" label="Requests" value={formatNumber(model.total.requests)} meta={`last ${range} days`} accent="#5fe1cd" />
            <MetricTile icon="wallet" label="Recorded cost" value={formatMoney(model.total.cost)} meta={`${formatTokens(model.total.tokens)} tokens`} accent="#f2c777" />
            <MetricTile
              icon="chart"
              label="Avg. latency"
              value={model.total.requests > 0 ? `${Math.round(model.total.avgLatency)}` : "—"}
              unit={model.total.requests > 0 ? "ms" : undefined}
              meta={model.total.requests > 0 ? `${formatPercent(model.total.successRate)} success` : "no requests in range"}
              accent="#78a2ff"
            />
          </div>

          <Panel className="model-toolbar-panel" flat>
            <div className="model-toolbar">
              <SegmentedControl<Range>
                value={range}
                onChange={setRange}
                options={[
                  { value: 7, label: "7D" },
                  { value: 30, label: "30D" },
                  { value: 90, label: "90D" },
                ]}
                ariaLabel="Model usage range"
              />
              <select
                className="select model-provider-select"
                value={providerFilter}
                onChange={(event) => setProviderFilter(event.target.value)}
                aria-label="Filter by provider"
              >
                <option value="all">All providers</option>
                {model.providerIds.map((provider) => (
                  <option key={provider} value={provider}>{providerMeta(provider).name}</option>
                ))}
              </select>
              <div className="search-field">
                <Icon name="search" />
                <input
                  className="input"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search models…"
                  aria-label="Search models"
                />
              </div>
              <span className="spacer" />
              <span className="faint mono model-count">{model.filtered.length} models</span>
            </div>
          </Panel>

          {query.error ? <ErrorState message={query.error} onRetry={query.reload} title="Model telemetry unavailable" /> : null}

          {model.rows.length === 0 ? (
            <Panel>
              <EmptyState
                icon="cube"
                title="No model usage recorded yet"
                copy="The gateway does not maintain a model registry. Until a request is routed, this page stays honest and empty."
                actions={
                  <>
                    <Link className="btn btn--sm" to="/gateway">Send a first request</Link>
                    <Link className="btn btn--sm btn--ghost" to="/api-keys">Add provider key</Link>
                  </>
                }
              />
              <div className="default-model-block">
                <div className="section-label">Default models configured on the gateway adapters</div>
                <div className="default-model-grid">
                  {query.data?.providers.map((provider) => (
                    <div className="default-model-card" key={provider.id}>
                      <div className="row">
                        <ProviderGlyph provider={provider.id} size="sm" />
                        <div>
                          <div className="default-model-name mono">{provider.default_model}</div>
                          <div className="default-model-provider">{provider.name}</div>
                        </div>
                      </div>
                      <div className="default-model-rate mono">
                        {formatRate(provider.input_rate_per_1k)} in · {formatRate(provider.output_rate_per_1k)} out / 1K
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </Panel>
          ) : model.filtered.length === 0 ? (
            <Panel>
              <EmptyState
                icon="search"
                title="No models match this filter"
                copy="Clear the search or switch the provider filter."
                actions={<Button size="sm" onClick={() => { setSearch(""); setProviderFilter("all"); }}>Reset filters</Button>}
              />
            </Panel>
          ) : (
            <Panel className="models-table-panel">
              <div className="table-shell">
                <table className="data-table models-table">
                  <caption className="sr-only">Models observed in the selected range</caption>
                  <thead>
                    <tr>
                      <th scope="col">Model</th>
                      <th scope="col" aria-sort={ariaSort("requests")}>
                        <button type="button" className="table-sort" onClick={() => toggleSort("requests")}>Requests <Icon name="sort" /></button>
                      </th>
                      <th scope="col" aria-sort={ariaSort("tokens")}>
                        <button type="button" className="table-sort" onClick={() => toggleSort("tokens")}>Tokens <Icon name="sort" /></button>
                      </th>
                      <th scope="col" aria-sort={ariaSort("cost")}>
                        <button type="button" className="table-sort" onClick={() => toggleSort("cost")}>Cost <Icon name="sort" /></button>
                      </th>
                      <th scope="col">Cost share</th>
                      <th scope="col" aria-sort={ariaSort("latency")}>
                        <button type="button" className="table-sort" onClick={() => toggleSort("latency")}>Latency <Icon name="sort" /></button>
                      </th>
                      <th scope="col" aria-sort={ariaSort("errors")}>
                        <button type="button" className="table-sort" onClick={() => toggleSort("errors")}>Errors <Icon name="sort" /></button>
                      </th>
                      <th scope="col">7D pulse</th>
                      <th scope="col" className="cell-actions"><span className="sr-only">Inspect</span></th>
                    </tr>
                  </thead>
                  <tbody>
                    {model.filtered.map((row) => {
                      const share = costShare(row.cost, model.total.cost);
                      const meta = providerMeta(row.provider);
                      const spark = buildDailySeries(
                        model.logs.filter((log) => log.provider === row.provider && log.model === row.name),
                        7
                      ).map((point) => point.cost);
                      return (
                        <tr key={row.key}>
                          <td>
                            <ProviderIdentity provider={row.provider} model={row.name} size="xs" />
                          </td>
                          <td className="cell-mono">{formatNumber(row.requests)}</td>
                          <td className="cell-mono">{formatTokens(row.tokens)}</td>
                          <td className="cell-mono cell-strong">{formatMoney(row.cost)}</td>
                          <td>
                            <span className="table-share">
                              <span className="table-share-track">
                                <span style={{ width: `${Math.max(share, 1.5)}%`, background: meta.accent }} />
                              </span>
                              <span className="mono">{share.toFixed(1)}%</span>
                            </span>
                          </td>
                          <td className="cell-mono">{formatLatency(row.latency)}</td>
                          <td>
                            {row.errorRate > 0 ? <Badge tone={row.errorRate >= 25 ? "danger" : "warning"}>{row.errorRate.toFixed(1)}%</Badge> : <span className="faint mono">0%</span>}
                          </td>
                          <td><Sparkline values={spark} accent={meta.accent} width={76} height={26} /></td>
                          <td className="cell-actions">
                            <button type="button" className="icon-button" onClick={() => setSelected(row)} aria-label={`Inspect ${row.name}`}>
                              <Icon name="chevron-right" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <div className="table-footer">
                <span>Derived from the latest {formatNumber(model.logs.length)} logs in the selected range</span>
                <span>{formatMoney(model.filtered.reduce((sum, row) => sum + row.cost, 0))} shown</span>
              </div>
            </Panel>
          )}

          <Dialog
            open={Boolean(selected)}
            onClose={() => setSelected(null)}
            variant="drawer"
            title={selected ? selected.name : "Model"}
            subtitle={selected ? `${providerMeta(selected.provider).name} · ${selected.provider}` : undefined}
          >
            {selected ? <ModelDetail row={selected} logs={model.logs} totalCost={model.total.cost} /> : null}
          </Dialog>
        </>
      ) : query.loading ? (
        <SkeletonPanel lines={5} />
      ) : (
        <ErrorState message={query.error ?? "Model telemetry is unavailable."} onRetry={query.reload} />
      )}
    </>
  );
}

function ModelDetail({ row, logs, totalCost }: { row: ModelRow; logs: UsageLog[]; totalCost: number }) {
  const recent = logs.filter((log) => log.provider === row.provider && log.model === row.name).slice(0, 8);
  const meta = providerMeta(row.provider);
  return (
    <>
      <div className="drawer-section">
        <div className="model-detail-hero">
          <ProviderGlyph provider={row.provider} size="lg" />
          <div>
            <div className="model-detail-name">{row.name}</div>
            <div className="model-detail-provider">{meta.name}</div>
          </div>
          <Badge tone="violet">{costShare(row.cost, totalCost).toFixed(1)}% of spend</Badge>
        </div>
        <dl className="kv-list" style={{ marginTop: 18 }}>
          <div className="kv-row"><dt>Requests</dt><dd className="mono">{formatNumber(row.requests)}</dd></div>
          <div className="kv-row"><dt>Tokens</dt><dd className="mono">{formatTokens(row.tokens)}</dd></div>
          <div className="kv-row"><dt>Recorded cost</dt><dd className="mono">{formatMoney(row.cost)}</dd></div>
          <div className="kv-row"><dt>Average latency</dt><dd className="mono">{formatLatency(row.latency)}</dd></div>
          <div className="kv-row"><dt>Error rate</dt><dd className="mono">{row.errorRate.toFixed(1)}%</dd></div>
          <div className="kv-row"><dt>Last seen</dt><dd>{row.lastSeen ? formatRelative(new Date(row.lastSeen).toISOString()) : "—"}</dd></div>
        </dl>
      </div>
      <div className="drawer-section">
        <div className="drawer-section-title">Recent requests for this model</div>
        {recent.length === 0 ? (
          <p className="muted">No recent request records.</p>
        ) : (
          <div className="mini-log-list">
            {recent.map((log) => (
              <div className="mini-log-row" key={log.id}>
                <RequestStatusBadge status={log.status} />
                <span className="mono">{formatNumber(log.totalTokens)} tok</span>
                <span className="mono">{formatMoney(log.cost)}</span>
                <span className="faint">{formatRelative(log.createdAt)}</span>
              </div>
            ))}
          </div>
        )}
      </div>
      <div className="drawer-section">
        <Link className="btn btn--block" to="/logs">Open request logs <Icon name="arrow-right" /></Link>
      </div>
    </>
  );
}
