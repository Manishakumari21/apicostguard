import { useEffect } from "react";
import type { RequestLog } from "../../types/domain";
import { formatClock, formatDate } from "../../utils/date";
import { formatCost, formatDuration, formatTokens } from "../../utils/format";
import { getProviderColor, getProviderIcon } from "../../utils/helpers";

interface RequestDetailProps {
  log: RequestLog;
  onClose: () => void;
}

function Field({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-4 py-2 border-b border-line/40 last:border-0">
      <span className="text-xs text-muted">{label}</span>
      <span className={`text-xs text-ink text-right ${mono ? "font-mono" : ""} tabular-nums`}>
        {value}
      </span>
    </div>
  );
}

export default function RequestDetail({ log, onClose }: RequestDetailProps) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  const statusTone =
    log.status === "success"
      ? "text-success bg-success/10 border-success/25"
      : log.status === "blocked"
        ? "text-warning bg-warning/10 border-warning/25"
        : "text-danger bg-danger/10 border-danger/25";

  return (
    <div className="fixed inset-0 z-40">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <aside className="absolute right-0 top-0 bottom-0 w-[380px] max-w-[85vw] bg-canvas border-l border-line flex flex-col animate-in slide-in-from-right-8 duration-200">
        <div className="flex items-center justify-between px-5 py-4 border-b border-line">
          <div className="flex items-center gap-3">
            <span
              className="w-9 h-9 flex items-center justify-center text-lg rounded-lg border border-line/60"
              style={{ backgroundColor: `${getProviderColor(log.provider)}1a` }}
            >
              {getProviderIcon(log.provider)}
            </span>
            <div>
              <h3 className="text-sm font-semibold text-ink leading-tight">{log.model}</h3>
              <p className="text-[11px] text-muted">
                {log.provider} · {formatDate(log.createdAt)} {formatClock(log.createdAt)}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-muted hover:bg-line/50 hover:text-ink transition-colors cursor-pointer"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <div className="px-5 py-4">
          <span className={`px-2.5 py-1 rounded-full text-[11px] font-semibold border ${statusTone}`}>
            {log.status}
          </span>
        </div>

        <div className="flex-1 overflow-y-auto px-5 pb-6">
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div className="rounded-lg border border-line/60 bg-card p-3">
              <p className="text-[10px] uppercase tracking-wider text-muted">Cost</p>
              <p className="text-lg font-bold text-ink tabular-nums">{formatCost(log.cost)}</p>
            </div>
            <div className="rounded-lg border border-line/60 bg-card p-3">
              <p className="text-[10px] uppercase tracking-wider text-muted">Latency</p>
              <p className="text-lg font-bold text-ink tabular-nums">{formatDuration(log.latencyMs)}</p>
            </div>
          </div>

          <p className="text-[10px] uppercase tracking-wider text-muted mb-1">Tokens</p>
          <div className="rounded-lg border border-line/60 bg-card overflow-hidden mb-4">
            <Field label="Input" value={log.inputTokens.toLocaleString()} mono />
            <Field label="Output" value={log.outputTokens.toLocaleString()} mono />
            <Field label="Total" value={formatTokens(log.totalTokens)} mono />
          </div>

          <div className="rounded-lg border border-line/60 bg-card overflow-hidden">
            <Field label="Project ID" value={log.projectId ?? "—"} mono />
            <Field label="Request ID" value={log.id.slice(0, 18)} mono />
            <Field label="Provider" value={log.provider} />
            <Field label="Status" value={log.status} />
          </div>
        </div>
      </aside>
    </div>
  );
}