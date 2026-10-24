import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Badge, RequestStatusBadge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import { CopyButton } from "../components/ui/CopyButton";
import { Dialog } from "../components/ui/Dialog";
import { Icon } from "../components/ui/Icon";
import { MetricTile } from "../components/ui/MetricTile";
import { PageHeader } from "../components/ui/PageHeader";
import { Panel, PanelHeader } from "../components/ui/Panel";
import { ProviderIdentity } from "../components/ui/ProviderGlyph";
import { SegmentedControl } from "../components/ui/SegmentedControl";
import { Callout, EmptyState, ErrorState, SkeletonPanel } from "../components/ui/States";
import { useToast } from "../context/ToastContext";
import { statusCounts, totalOf } from "../lib/aggregate";
import { filterLogsSince } from "../lib/date";
import {
  formatDateTime,
  formatLatency,
  formatMoney,
  formatNumber,
  formatPercent,
  formatRelative,
  formatTokens,
  truncateMiddle,
} from "../lib/format";
import { providerMeta } from "../lib/providers";
import { useApiQuery } from "../lib/useApiQuery";
import { clearRequestHistory, fetchProviders, fetchUsageLogs } from "../services/api";
import type { ApiProviderInfo, RequestStatus, UsageLog } from "../services/types";

type Range = "all" | 7 | 30 | 90;
type StatusFilter = "all" | RequestStatus;
const PAGE_SIZE = 25;

interface LogsData {
  logs: UsageLog[];
  providers: ApiProviderInfo[];
}

export default function LogsPage() {
  const { notify } = useToast();
  const query = useApiQuery<LogsData>(async (signal) => {
    const [logs, providers] = await Promise.all([fetchUsageLogs(1000, signal), fetchProviders(signal)]);
    return { logs, providers };
  }, []);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<StatusFilter>("all");
  const [provider, setProvider] = useState("all");
  const [range, setRange] = useState<Range>("all");
  const [sort, setSort] = useState<"newest" | "oldest">("newest");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<UsageLog | null>(null);
  const [confirmClear, setConfirmClear] = useState(false);
  const [clearing, setClearing] = useState(false);

  const model = useMemo(() => {
    if (!query.data) return null;
    const ranged = range === "all" ? query.data.logs : filterLogsSince(query.data.logs, range);
    const term = search.trim().toLowerCase();
    const filtered = ranged.filter((log) => {
      if (status !== "all" && log.status !== status) return false;
      if (provider !== "all" && log.provider !== provider) return false;
      if (!term) return true;
      return `${log.id} ${log.provider} ${log.model} ${log.projectId ?? ""}`.toLowerCase().includes(term);
    });
    filtered.sort((a, b) => (sort === "newest" ? b.createdAt.localeCompare(a.createdAt) : a.createdAt.localeCompare(b.createdAt)));
    const totals = totalOf(filtered);
    const counts = statusCounts(filtered);
    const providerOptions = [...new Set([...(query.data.providers.map((item) => item.id)), ...ranged.map((log) => log.provider)])];
    return { ranged, filtered, totals, counts, providerOptions };
  }, [query.data, range, search, status, provider, sort]);

  const pageCount = model ? Math.max(1, Math.ceil(model.filtered.length / PAGE_SIZE)) : 1;
  const currentPage = Math.min(page, pageCount);
  const pageRows = model ? model.filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE) : [];

  useEffect(() => {
    setPage(1);
  }, [search, status, provider, range, sort]);

  const clearHistory = async () => {
    setClearing(true);
    try {
      const result = await clearRequestHistory();
      setConfirmClear(false);
      setSelected(null);
      query.reload();
      notify({
        tone: "success",
        title: "Request history cleared",
        message: `${formatNumber(result.deleted)} ${result.deleted === 1 ? "record" : "records"} deleted from the backend.`,
      });
    } catch (error) {
      notify({
        tone: "error",
        title: "Could not clear history",
        message: error instanceof Error ? error.message : "The backend rejected the delete request.",
      });
    } finally {
      setClearing(false);
    }
  };

  return (
    <>
      <PageHeader
        index="07"
        label="Request Logs"
        title={
          <>
            Every request, <span className="accent">accounted for.</span>
          </>
        }
        description="Inspect the raw telemetry recorded by the gateway: tokens, latency, cost, status and project attribution. No prompt content is stored."
        actions={
          <>
            <Link className="btn" to="/analytics">
              <Icon name="chart" /> Analytics
            </Link>
            <Button variant="danger" icon="trash" onClick={() => setConfirmClear(true)} disabled={!query.data?.logs.length}>
              Clear history
            </Button>
          </>
        }
      />

      {model ? (
        <div className="metric-grid">
          <MetricTile icon="list" label="Filtered records" value={formatNumber(model.filtered.length)} meta={`of ${formatNumber(query.data?.logs.length ?? 0)} loaded`} accent="#a08fff" />
          <MetricTile icon="wallet" label="Filtered spend" value={formatMoney(model.totals.cost)} meta={`${formatNumber(model.totals.requests)} requests`} accent="#f2c777" />
          <MetricTile icon="shield" label="Success rate" value={model.totals.requests > 0 ? formatPercent(model.totals.successRate) : "—"} meta={`${formatNumber(model.counts.error)} errors · ${formatNumber(model.counts.blocked)} blocked`} accent="#7ceab5" />
          <MetricTile icon="activity" label="Avg. latency" value={model.totals.requests > 0 ? `${Math.round(model.totals.avgLatency)}` : "—"} unit={model.totals.requests > 0 ? "ms" : undefined} meta={`${formatTokens(model.totals.tokens)} tokens`} accent="#78a2ff" />
        </div>
      ) : null}

      <Panel>
        <PanelHeader
          kicker="Telemetry"
          title="Gateway history"
          subtitle="Loaded from GET /api/history, newest first, capped at 1,000 records by the backend."
          actions={<Badge tone="violet">No prompt content retained</Badge>}
        />
        <div className="table-toolbar logs-toolbar">
          <div className="search-field logs-search">
            <Icon name="search" />
            <input
              className="input"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search provider, model, project or request id…"
              aria-label="Search request logs"
            />
          </div>
          <SegmentedControl<StatusFilter>
            value={status}
            onChange={setStatus}
            ariaLabel="Filter by status"
            options={[
              { value: "all", label: "All" },
              { value: "success", label: "Success" },
              { value: "error", label: "Error" },
              { value: "blocked", label: "Blocked" },
            ]}
          />
          <select className="select logs-select" value={provider} onChange={(event) => setProvider(event.target.value)} aria-label="Filter by provider">
            <option value="all">All providers</option>
            {model?.providerOptions.map((item) => (
              <option key={item} value={item}>{providerMeta(item).name}</option>
            ))}
          </select>
          <select className="select logs-select" value={String(range)} onChange={(event) => setRange(event.target.value === "all" ? "all" : (Number(event.target.value) as Range))} aria-label="Filter by time range">
            <option value="all">All time</option>
            <option value="7">Last 7 days</option>
            <option value="30">Last 30 days</option>
            <option value="90">Last 90 days</option>
          </select>
          <select className="select logs-select" value={sort} onChange={(event) => setSort(event.target.value as "newest" | "oldest")} aria-label="Sort request logs">
            <option value="newest">Newest first</option>
            <option value="oldest">Oldest first</option>
          </select>
          <Button
            size="sm"
            variant="ghost"
            icon="refresh"
            onClick={() => {
              setSearch("");
              setStatus("all");
              setProvider("all");
              setRange("all");
              setSort("newest");
            }}
          >
            Reset
          </Button>
        </div>

        {query.loading && !query.data ? <SkeletonPanel lines={6} /> : null}
        {query.error && !query.data ? <div className="panel-body"><ErrorState message={query.error} onRetry={query.reload} /></div> : null}

        {model && model.filtered.length === 0 ? (
          <EmptyState
            icon="list"
            title={query.data?.logs.length === 0 ? "No requests recorded yet" : "No requests match these filters"}
            copy={
              query.data?.logs.length === 0
                ? "The gateway writes a log after every proxied request, including failed ones. Send a request to populate this ledger."
                : "Try clearing the search, widening the date range, or switching the status filter."
            }
            actions={
              query.data?.logs.length === 0 ? (
                <Link className="btn btn--sm" to="/gateway">Connection guide</Link>
              ) : (
                <Button size="sm" onClick={() => { setSearch(""); setStatus("all"); setProvider("all"); setRange("all"); }}>
                  Clear filters
                </Button>
              )
            }
          />
        ) : null}

        {model && model.filtered.length > 0 ? (
          <>
            <div className="table-shell">
              <table className="data-table logs-table">
                <caption className="sr-only">Recorded gateway requests</caption>
                <thead>
                  <tr>
                    <th scope="col">Time</th>
                    <th scope="col">Status</th>
                    <th scope="col">Provider / model</th>
                    <th scope="col" className="cell-right">Tokens in / out</th>
                    <th scope="col" className="cell-right">Latency</th>
                    <th scope="col" className="cell-right">Cost</th>
                    <th scope="col">Project</th>
                    <th scope="col" className="cell-actions"><span className="sr-only">Inspect</span></th>
                  </tr>
                </thead>
                <tbody>
                  {pageRows.map((log) => (
                    <tr
                      key={log.id}
                      className="table-row--link"
                      onClick={() => setSelected(log)}
                    >
                      <td>
                        <span className="log-time">{formatDateTime(log.createdAt)}</span>
                        <span className="log-id mono">{truncateMiddle(log.id, 16)}</span>
                      </td>
                      <td><RequestStatusBadge status={log.status} /></td>
                      <td><ProviderIdentity provider={log.provider} model={log.model} size="xs" /></td>
                      <td className="cell-right cell-mono">{formatNumber(log.inputTokens)} / {formatNumber(log.outputTokens)}</td>
                      <td className="cell-right cell-mono">{formatLatency(log.latencyMs)}</td>
                      <td className="cell-right cell-mono cell-strong">{formatMoney(log.cost)}</td>
                      <td><span className="log-project">{log.projectId ?? <span className="faint">unattributed</span>}</span></td>
                      <td className="cell-actions">
                        <button
                          type="button"
                          className="icon-button"
                          aria-label={`Inspect request ${log.id}`}
                          onClick={(event) => {
                            event.stopPropagation();
                            setSelected(log);
                          }}
                        >
                          <Icon name="chevron-right" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="table-footer">
              <span>
                Showing {(currentPage - 1) * PAGE_SIZE + 1}–{Math.min(currentPage * PAGE_SIZE, model.filtered.length)} of {formatNumber(model.filtered.length)} records
              </span>
              <div className="pagination" aria-label="Log pagination">
                <button type="button" onClick={() => setPage((value) => Math.max(1, value - 1))} disabled={currentPage === 1} aria-label="Previous page">
                  <Icon name="chevron-left" size={12} />
                </button>
                {pageWindow(currentPage, pageCount).map((value) => (
                  <button key={value} type="button" className={value === currentPage ? "is-active" : undefined} onClick={() => setPage(value)} aria-current={value === currentPage ? "page" : undefined}>
                    {value}
                  </button>
                ))}
                <button type="button" onClick={() => setPage((value) => Math.min(pageCount, value + 1))} disabled={currentPage === pageCount} aria-label="Next page">
                  <Icon name="chevron-right" size={12} />
                </button>
              </div>
            </div>
          </>
        ) : null}
      </Panel>

      <Dialog
        open={Boolean(selected)}
        onClose={() => setSelected(null)}
        variant="drawer"
        title={selected ? `Request ${truncateMiddle(selected.id, 14)}` : "Request"}
        subtitle={selected ? `${providerMeta(selected.provider).name} · ${selected.model}` : undefined}
      >
        {selected ? <RequestDetail log={selected} /> : null}
      </Dialog>

      <Dialog
        open={confirmClear}
        onClose={() => setConfirmClear(false)}
        title="Clear request history?"
        subtitle="This permanently deletes every usage log stored by the backend."
        footer={
          <>
            <Button variant="ghost" onClick={() => setConfirmClear(false)}>Cancel</Button>
            <Button variant="danger" icon="trash" onClick={() => void clearHistory()} loading={clearing}>
              Delete all logs
            </Button>
          </>
        }
      >
        <Callout tone="danger" title="This cannot be undone">
          Aggregated dashboard, analytics and budget views will drop to zero for historical periods. Budget settings and
          provider keys are not affected.
        </Callout>
        <p className="muted" style={{ marginTop: 12, fontSize: 11 }}>
          The backend returns the exact number of deleted records, which will be shown after completion.
        </p>
      </Dialog>
    </>
  );
}

function RequestDetail({ log }: { log: UsageLog }) {
  return (
    <>
      <div className="drawer-section">
        <div className="request-detail-status">
          <RequestStatusBadge status={log.status} />
          <span className="mono faint">{formatRelative(log.createdAt)}</span>
        </div>
        <dl className="kv-list" style={{ marginTop: 16 }}>
          <div className="kv-row"><dt>Request id</dt><dd className="mono detail-id">{log.id}</dd></div>
          <div className="kv-row"><dt>Recorded at</dt><dd>{formatDateTime(log.createdAt)}</dd></div>
          <div className="kv-row"><dt>Provider</dt><dd>{providerMeta(log.provider).name} <span className="faint mono">({log.provider})</span></dd></div>
          <div className="kv-row"><dt>Model</dt><dd className="mono">{log.model}</dd></div>
          <div className="kv-row"><dt>Input tokens</dt><dd className="mono">{formatNumber(log.inputTokens)}</dd></div>
          <div className="kv-row"><dt>Output tokens</dt><dd className="mono">{formatNumber(log.outputTokens)}</dd></div>
          <div className="kv-row"><dt>Total tokens</dt><dd className="mono">{formatNumber(log.totalTokens)}</dd></div>
          <div className="kv-row"><dt>Latency</dt><dd className="mono">{formatLatency(log.latencyMs)}</dd></div>
          <div className="kv-row"><dt>Cost</dt><dd className="mono">{formatMoney(log.cost, { precise: true })}</dd></div>
          <div className="kv-row"><dt>Project</dt><dd>{log.projectId ?? "Unattributed"}</dd></div>
        </dl>
        <div className="drawer-copy-row">
          <CopyButton value={log.id} label="Copy request id" className="btn btn--sm" />
        </div>
      </div>
      <div className="drawer-section">
        <div className="drawer-section-title">What this record contains</div>
        <Callout tone="info">
          The backend stores metadata only. Prompt messages and provider responses are not persisted by this endpoint,
          so they cannot be reconstructed here.
        </Callout>
      </div>
      <div className="drawer-section">
        <div className="drawer-section-title">Adjacent actions</div>
        <div className="row wrap">
          <Link className="btn btn--sm" to="/providers">Provider</Link>
          <Link className="btn btn--sm" to="/models">Model analytics</Link>
          <Link className="btn btn--sm" to="/usage">Cost report</Link>
        </div>
      </div>
    </>
  );
}

function pageWindow(current: number, total: number): number[] {
  if (total <= 5) return Array.from({ length: total }, (_, index) => index + 1);
  const start = Math.max(1, Math.min(current - 2, total - 4));
  return Array.from({ length: 5 }, (_, index) => start + index);
}
