import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Badge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import { Icon } from "../components/ui/Icon";
import { MetricTile } from "../components/ui/MetricTile";
import { PageHeader } from "../components/ui/PageHeader";
import { Panel, PanelHeader } from "../components/ui/Panel";
import { ProviderGlyph } from "../components/ui/ProviderGlyph";
import { SegmentedControl } from "../components/ui/SegmentedControl";
import { EmptyState, ErrorState, SkeletonPanel } from "../components/ui/States";
import { aggregateByProvider, averageLatency, costShare, errorRate, totalOf } from "../lib/aggregate";
import { filterLogsSince } from "../lib/date";
import { formatLatency, formatMoney, formatNumber, formatRate, formatRelative, formatTokens } from "../lib/format";
import { providerMeta } from "../lib/providers";
import { useApiQuery } from "../lib/useApiQuery";
import { fetchProviders, fetchUsageLogs } from "../services/api";
import type { ApiProviderInfo, UsageLog } from "../services/types";

type ProviderFilter = "all" | "cloud" | "local";
type Range = 7 | 30 | 90;

interface ProvidersData {
  providers: ApiProviderInfo[];
  logs: UsageLog[];
}

export default function ProvidersPage() {
  const [range, setRange] = useState<Range>(30);
  const [filter, setFilter] = useState<ProviderFilter>("all");
  const [search, setSearch] = useState("");
  const query = useApiQuery<ProvidersData>(async (signal) => {
    const [providers, logs] = await Promise.all([fetchProviders(signal), fetchUsageLogs(1000, signal)]);
    return { providers, logs };
  }, []);

  const model = useMemo(() => {
    if (!query.data) return null;
    const logs = filterLogsSince(query.data.logs, range);
    const aggregates = aggregateByProvider(logs);
    const total = totalOf(logs);
    const providerCost = aggregates.reduce((sum, item) => sum + item.cost, 0);
    const active = aggregates.filter((item) => item.requests > 0).length;
    return { logs, aggregates, total, providerCost, active };
  }, [query.data, range]);

  const providers = useMemo(() => {
    const list = query.data?.providers ?? [];
    const source = [...list];
    const term = search.trim().toLowerCase();
    return source.filter((provider) => {
      const meta = providerMeta(provider.id);
      if (filter !== "all" && meta.kind !== filter) return false;
      if (term && !`${provider.name} ${provider.id} ${provider.default_model}`.toLowerCase().includes(term)) return false;
      return true;
    });
  }, [query.data, filter, search]);

  return (
    <>
      <PageHeader
        index="04"
        label="Providers"
        title={
          <>
            The catalogue behind <span className="accent">every routed call.</span>
          </>
        }
        description="Adapter capabilities, reference rates and the traffic recorded for each provider. “Active” means observed traffic — not a fabricated connection check."
        actions={
          <>
            <Link className="btn" to="/api-keys">
              <Icon name="key" /> Manage keys
            </Link>
            <Link className="btn btn--primary" to="/models">
              <Icon name="cube" /> Inspect models
            </Link>
          </>
        }
      />

      {model ? (
        <>
          <div className="metric-grid provider-metrics">
            <MetricTile
              icon="plug"
              label="Gateway adapters"
              value={formatNumber(query.data?.providers.length ?? 0)}
              meta={`${providers.filter((provider) => providerMeta(provider.id).kind === "cloud").length} cloud · ${providers.filter((provider) => providerMeta(provider.id).kind === "local").length} local`}
              accent="#a08fff"
            />
            <MetricTile
              icon="activity"
              label="Providers with traffic"
              value={formatNumber(model.active)}
              meta={`in the last ${range} days`}
              accent="#5fe1cd"
            />
            <MetricTile
              icon="wallet"
              label="Recorded spend"
              value={formatMoney(model.providerCost)}
              meta={`${formatNumber(model.total.requests)} requests · ${formatRangeLabel(range)}`}
              accent="#f2c777"
            />
            <MetricTile
              icon="chart"
              label="Avg. latency"
              value={model.total.requests > 0 ? `${Math.round(model.total.avgLatency)}` : "—"}
              unit={model.total.requests > 0 ? "ms" : undefined}
              meta={`${formatTokens(model.total.tokens)} tokens observed`}
              accent="#78a2ff"
            />
          </div>

          <Panel className="provider-toolbar-panel" flat>
            <div className="provider-toolbar">
              <div className="row wrap">
                <SegmentedControl<Range>
                  value={range}
                  onChange={setRange}
                  options={[
                    { value: 7, label: "7D" },
                    { value: 30, label: "30D" },
                    { value: 90, label: "90D" },
                  ]}
                  ariaLabel="Provider usage range"
                />
                <SegmentedControl<ProviderFilter>
                  value={filter}
                  onChange={setFilter}
                  options={[
                    { value: "all", label: "All" },
                    { value: "cloud", label: "Cloud" },
                    { value: "local", label: "Local" },
                  ]}
                  ariaLabel="Provider kind filter"
                />
                <div className="search-field">
                  <Icon name="search" />
                  <input
                    className="input"
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Find a provider…"
                    aria-label="Search providers"
                  />
                </div>
              </div>
              <span className="mono faint provider-toolbar-note">
                History capped at latest 1,000 logs
              </span>
            </div>
          </Panel>

          {query.error ? <ErrorState message={query.error} onRetry={query.reload} title="Provider catalogue unavailable" /> : null}

          {providers.length === 0 ? (
            <Panel>
              <EmptyState
                icon="plug"
                title="No providers match"
                copy="Try a different filter or clear the search."
                actions={<Button size="sm" onClick={() => { setSearch(""); setFilter("all"); }}>Clear filters</Button>}
              />
            </Panel>
          ) : (
            <div className="provider-card-grid">
              {providers.map((provider, index) => {
                const meta = providerMeta(provider.id);
                const agg = model.aggregates.find((item) => item.key === provider.id || item.key === provider.name);
                const latency = agg ? averageLatency(agg) : 0;
                const providerErrorRate = agg ? errorRate(agg) : 0;
                const share = agg ? costShare(agg.cost, model.providerCost) : 0;
                return (
                  <Panel
                    key={provider.id}
                    className={`provider-card${agg ? " has-traffic" : ""}`}
                    style={{ animationDelay: `${Math.min(index, 8) * 35}ms` }}
                  >
                    <div className="provider-card-top">
                      <div className="provider-card-identity">
                        <ProviderGlyph provider={provider.id} size="lg" />
                        <div>
                          <div className="provider-card-name">{provider.name}</div>
                          <div className="provider-card-model mono">{provider.default_model}</div>
                        </div>
                      </div>
                      <Badge tone={agg ? "success" : "neutral"}>{agg ? "Traffic" : "Idle"}</Badge>
                    </div>

                    <div className="provider-card-rates">
                      <div>
                        <span>Input / 1K</span>
                        <strong className="mono">{formatRate(provider.input_rate_per_1k)}</strong>
                      </div>
                      <div>
                        <span>Output / 1K</span>
                        <strong className="mono">{formatRate(provider.output_rate_per_1k)}</strong>
                      </div>
                      <div>
                        <span>Adapter</span>
                        <strong>{meta.kind === "local" ? "Local" : "Cloud"}</strong>
                      </div>
                      <div>
                        <span>Usage count</span>
                        <strong>{provider.supports_usage_count ? "Reported" : "Estimated"}</strong>
                      </div>
                    </div>

                    {agg ? (
                      <>
                        <div className="provider-card-stats">
                          <div>
                            <span>Requests</span>
                            <strong>{formatNumber(agg.requests)}</strong>
                          </div>
                          <div>
                            <span>Tokens</span>
                            <strong>{formatTokens(agg.tokens)}</strong>
                          </div>
                          <div>
                            <span>Spend</span>
                            <strong>{formatMoney(agg.cost)}</strong>
                          </div>
                          <div>
                            <span>Latency</span>
                            <strong>{formatLatency(latency)}</strong>
                          </div>
                          <div>
                            <span>Errors</span>
                            <strong className={providerErrorRate > 0 ? "text-danger" : undefined}>{providerErrorRate > 0 ? `${providerErrorRate.toFixed(1)}%` : "0%"}</strong>
                          </div>
                          <div>
                            <span>Last seen</span>
                            <strong>{agg.lastSeen ? formatRelative(new Date(agg.lastSeen).toISOString()) : "—"}</strong>
                          </div>
                        </div>
                        <div className="provider-share">
                          <div className="spread">
                            <span className="faint">Share of recorded spend</span>
                            <strong className="mono">{share.toFixed(1)}%</strong>
                          </div>
                          <div className="progress progress--thin">
                            <span style={{ width: `${Math.max(share, 1)}%`, background: meta.accent }} />
                          </div>
                        </div>
                      </>
                    ) : (
                      <div className="provider-card-empty">
                        <Icon name="activity" />
                        <span>No recorded traffic in the last {range} days. Rates shown are reference rates from the adapter.</span>
                      </div>
                    )}

                    <div className="provider-card-footer">
                      <span className="mono faint">{agg && agg.lastSeen ? `seen ${formatRelative(new Date(agg.lastSeen).toISOString())}` : "no telemetry"}</span>
                      <div className="row">
                        <Link className="btn btn--sm btn--ghost" to="/api-keys">
                          <Icon name="key" /> Key
                        </Link>
                        <Link className="btn btn--sm btn--ghost" to="/models">
                          Models <Icon name="arrow-right" />
                        </Link>
                      </div>
                    </div>
                  </Panel>
                );
              })}
            </div>
          )}

          <div className="provider-bottom-grid">
            <Panel>
              <PanelHeader
                kicker="Attribution"
                title="Spend by provider"
                subtitle={`Recorded cost over the last ${range} days.`}
                actions={<Link className="panel-link" to="/usage">Cost detail <Icon name="arrow-up-right" /></Link>}
              />
              <div className="panel-body">
                {model.aggregates.length === 0 ? (
                  <EmptyState icon="chart" title="No provider spend" copy="Traffic has not been recorded in this range." />
                ) : (
                  <div className="rank-list">
                    {model.aggregates.map((entry) => {
                      const meta = providerMeta(entry.provider);
                      return (
                        <div className="rank-row" key={entry.key}>
                          <ProviderGlyph provider={entry.provider} size="sm" />
                          <div className="rank-main">
                            <div className="rank-head">
                              <span>{meta.name}</span>
                              <strong className="mono">{formatMoney(entry.cost)}</strong>
                            </div>
                            <div className="progress progress--thin">
                              <span style={{ width: `${Math.max(costShare(entry.cost, model.providerCost), 2)}%`, background: meta.accent }} />
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
              <PanelHeader kicker="Reliability" title="Adapter health signals" subtitle="Derived from recorded outcomes, not synthetic pings." />
              <div className="panel-body">
                {model.aggregates.length === 0 ? (
                  <EmptyState icon="shield" title="No outcomes to analyse" copy="Error rates appear after requests are logged." />
                ) : (
                  <div className="health-signal-list">
                    {model.aggregates.map((entry) => {
                      const rate = errorRate(entry);
                      const tone = rate >= 50 ? "danger" : rate >= 10 ? "warning" : "success";
                      return (
                        <div className="health-signal" key={entry.key}>
                          <ProviderGlyph provider={entry.provider} size="xs" />
                          <span className="health-signal-name">{providerMeta(entry.provider).name}</span>
                          <span className="health-signal-track">
                            <span style={{ width: `${Math.max(rate, 1)}%` }} className={`health-fill health-fill--${tone}`} />
                          </span>
                          <Badge tone={tone}>{rate.toFixed(1)}% err</Badge>
                        </div>
                      );
                    })}
                  </div>
                )}
                <div className="health-footnote">
                  <Icon name="info" size={12} />
                  Error rate = non-success logs ÷ all logs in the selected range.
                </div>
              </div>
            </Panel>
          </div>
        </>
      ) : query.loading ? (
        <div className="grid-2">
          <SkeletonPanel lines={4} />
          <SkeletonPanel lines={4} />
        </div>
      ) : (
        <ErrorState message={query.error ?? "Provider data is unavailable."} onRetry={query.reload} />
      )}
    </>
  );
}

function formatRangeLabel(range: Range): string {
  return `last ${range} days`;
}
