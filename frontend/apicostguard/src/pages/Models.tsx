import { useMemo, useState } from "react";
import { getModelOverviews, filterModels } from "../services/modelService";
import { useGatewayQuery } from "../hooks/useGatewayQuery";
import PageHeader from "../components/ui/PageHeader";
import Panel from "../components/ui/Panel";
import FilterBar from "../components/ui/FilterBar";
import DataState from "../components/ui/DataState";
import { formatCost, formatDuration, formatTokens, formatPercent } from "../utils/format";

type SortKey = "cost" | "requests" | "tokens" | "latencyMs" | "errorRate";

export default function Models() {
  const [query, setQuery] = useState("");
  const [provider, setProvider] = useState("all");
  const [sortKey, setSortKey] = useState<SortKey>("cost");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  const { data, error, loading, refetch } = useGatewayQuery(
    () => getModelOverviews(),
    ["models"],
    15000
  );

  const models = data ?? [];
  const providers = useMemo(
    () => Array.from(new Set(models.map((m) => m.provider))).sort(),
    [models]
  );

  const filtered = useMemo(
    () => filterModels(models, query, provider, { key: sortKey, dir: sortDir }),
    [models, query, provider, sortKey, sortDir]
  );

  const maxCost = useMemo(() => Math.max(...models.map((m) => m.cost), 1), [models]);

  const toggleSort = (key: SortKey) => {
    if (key === sortKey) setSortDir((d) => (d === "desc" ? "asc" : "desc"));
    else {
      setSortKey(key);
      setSortDir("desc");
    }
  };

  const headers: { key: SortKey; label: string }[] = [
    { key: "cost", label: "Cost" },
    { key: "requests", label: "Requests" },
    { key: "tokens", label: "Tokens" },
    { key: "latencyMs", label: "Latency" },
    { key: "errorRate", label: "Error rate" },
  ];

  return (
    <div>
      <PageHeader
        title="Models"
        description="Per-model usage across providers, sorted and filterable."
      />

      <div className="space-y-3">
        <FilterBar
          search={{ value: query, onChange: setQuery, placeholder: "Search models…" }}
          filters={[
            {
              key: "provider",
              label: "Provider",
              value: provider,
              onChange: (_k, v) => setProvider(v),
              options: [
                { value: "all", label: "All" },
                ...providers.map((p) => ({ value: p, label: p })),
              ],
            },
          ]}
          onReset={() => {
            setQuery("");
            setProvider("all");
          }}
          resultCount={filtered.length}
        />

        <Panel pad={false}>
          <DataState
            loading={loading}
            error={error}
            hasData={models.length > 0}
            onRetry={refetch}
            emptyTitle="No models seen yet"
            emptyDescription="Model usage appears here as soon as the gateway routes requests."
          >
            <div className="overflow-auto max-h-[calc(100vh-280px)] p-0">
              <table className="w-full text-left text-sm">
                <thead className="sticky top-0 z-10 bg-card">
                  <tr className="text-[10px] uppercase tracking-wider text-muted">
                    <th className="font-semibold px-4 py-2.5">Model</th>
                    <th className="font-semibold px-4 py-2.5">Provider</th>
                    {headers.map((h) => (
                      <th key={h.key} className="px-4 py-2.5">
                        <button
                          onClick={() => toggleSort(h.key)}
                          className={`cursor-pointer inline-flex items-center gap-1 font-semibold hover:text-ink transition-colors ${
                            sortKey === h.key ? "text-accent" : ""
                          }`}
                        >
                          {h.label}
                          <span className="text-[9px]">
                            {sortKey === h.key ? (sortDir === "desc" ? "↓" : "↑") : "↕"}
                          </span>
                        </button>
                      </th>
                    ))}
                    <th className="font-semibold px-4 py-2.5 text-right">Share</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((m) => {
                    const sharePct = (m.cost / maxCost) * 100;
                    return (
                      <tr key={m.name} className="border-t border-line/50 hover:bg-line/15 transition-colors">
                        <td className="px-4 py-2.5 font-mono text-xs text-ink">{m.name}</td>
                        <td className="px-4 py-2.5 text-muted">{m.provider}</td>
                        <td className="px-4 py-2.5 font-semibold tabular-nums">{formatCost(m.cost)}</td>
                        <td className="px-4 py-2.5 text-muted tabular-nums">{m.requests.toLocaleString()}</td>
                        <td className="px-4 py-2.5 text-muted tabular-nums">{formatTokens(m.tokens)}</td>
                        <td className="px-4 py-2.5 text-muted tabular-nums">{formatDuration(m.latencyMs)}</td>
                        <td className={`px-4 py-2.5 tabular-nums ${m.errorRate > 10 ? "text-danger" : "text-muted"}`}>
                          {m.errorRate.toFixed(1)}%
                        </td>
                        <td className="px-4 py-2.5 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <div className="w-16 h-1.5 rounded-full bg-line/50 overflow-hidden">
                              <div
                                className="h-full rounded-full bg-accent/80 transition-all"
                                style={{ width: `${Math.min(sharePct, 100)}%` }}
                              />
                            </div>
                            <span className="text-[10px] text-faint tabular-nums w-9 text-right">
                              {formatPercent(m.cost, maxCost)}
                            </span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </DataState>
        </Panel>
      </div>
    </div>
  );
}