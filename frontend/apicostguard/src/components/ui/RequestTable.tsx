import { useMemo, useState } from "react";
import type { RequestLog } from "../../types/domain";
import { formatClock } from "../../utils/date";
import { formatCost, formatDuration, formatTokens } from "../../utils/format";
import { getProviderIcon } from "../../utils/helpers";

type SortKey = "createdAt" | "tokens" | "latencyMs" | "cost";

const COLUMNS: { key: SortKey | "provider" | "model" | "status"; label: string; sortable?: boolean }[] = [
  { key: "createdAt", label: "Time", sortable: true },
  { key: "provider", label: "Provider" },
  { key: "model", label: "Model" },
  { key: "tokens", label: "Tokens", sortable: true },
  { key: "latencyMs", label: "Latency", sortable: true },
  { key: "cost", label: "Cost", sortable: true },
  { key: "status", label: "Status" },
];

const STATUS_STYLE: Record<string, string> = {
  success: "text-success bg-success/10 border-success/25",
  error: "text-danger bg-danger/10 border-danger/25",
  blocked: "text-warning bg-warning/10 border-warning/25",
};

interface RequestTableProps {
  logs: RequestLog[];
  onSelect?: (log: RequestLog) => void;
  maxHeight?: string;
}

export default function RequestTable({ logs, onSelect, maxHeight = "max-h-[560px]" }: RequestTableProps) {
  const [sort, setSort] = useState<{ key: SortKey; dir: "asc" | "desc" }>({
    key: "createdAt",
    dir: "desc",
  });

  const sorted = useMemo(() => {
    const list = [...logs];
    list.sort((a, b) => {
      const dir = sort.dir === "asc" ? 1 : -1;
      if (sort.key === "tokens") return (a.totalTokens - b.totalTokens) * dir;
      if (sort.key === "latencyMs") return (a.latencyMs - b.latencyMs) * dir;
      if (sort.key === "cost") return (a.cost - b.cost) * dir;
      return (new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()) * dir;
    });
    return list;
  }, [logs, sort]);

  const toggleSort = (key: SortKey) =>
    setSort((prev) =>
      prev.key === key
        ? { key, dir: prev.dir === "asc" ? "desc" : "asc" }
        : { key, dir: "desc" }
    );

  if (sorted.length === 0) {
    return (
      <div className="text-sm text-muted py-10 text-center">
        No requests found for the current filters.
      </div>
    );
  }

  return (
    <div className={`overflow-auto ${maxHeight} -mx-4 px-4`}>
      <table className="w-full text-left text-sm whitespace-nowrap">
        <thead className="sticky top-0 z-10">
          <tr className="text-[10px] uppercase tracking-wider text-muted">
            {COLUMNS.map((col) => (
              <th key={col.key} className="font-semibold px-3 py-2 bg-card first:pl-4 last:pr-4">
                {col.sortable ? (
                  <button
                    onClick={() => toggleSort(col.key as SortKey)}
                    className={`cursor-pointer inline-flex items-center gap-1 hover:text-ink transition-colors ${
                      sort.key === col.key ? "text-accent" : ""
                    }`}
                  >
                    {col.label}
                    <span className="text-[9px]">
                      {sort.key === col.key ? (sort.dir === "desc" ? "↓" : "↑") : "↕"}
                    </span>
                  </button>
                ) : (
                  col.label
                )}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sorted.map((log) => (
            <tr
              key={log.id}
              onClick={() => onSelect?.(log)}
              className={`border-t border-line/50 transition-colors ${
                onSelect ? "cursor-pointer hover:bg-line/20" : ""
              }`}
            >
              <td className="px-3 py-2 text-muted tabular-nums">{formatClock(log.createdAt)}</td>
              <td className="px-3 py-2 text-ink">{log.provider}</td>
              <td className="px-3 py-2 text-ink">
                <span className="font-mono text-xs">{getProviderIcon(log.provider)} </span>
                {log.model}
              </td>
              <td className="px-3 py-2 text-muted tabular-nums">{formatTokens(log.totalTokens)}</td>
              <td className="px-3 py-2 text-muted tabular-nums">{formatDuration(log.latencyMs)}</td>
              <td className="px-3 py-2 font-semibold tabular-nums">{formatCost(log.cost)}</td>
              <td className="px-3 py-2">
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                    STATUS_STYLE[log.status] ?? STATUS_STYLE.error
                  }`}
                >
                  {log.status}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}