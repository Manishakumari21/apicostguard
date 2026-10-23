import type { AlertItem } from "../../types/domain";
import { formatTimeAgo } from "../../utils/date";

const SEVERITY = {
  critical: { icon: "🔴", chip: "text-danger bg-danger/10 border-danger/30", dot: "bg-danger" },
  warning: { icon: "🟡", chip: "text-warning bg-warning/10 border-warning/30", dot: "bg-warning" },
  info: { icon: "🔵", chip: "text-iris bg-iris/10 border-iris/30", dot: "bg-iris" },
} as const;

interface AlertCardProps {
  alert: AlertItem;
  onMarkRead?: (id: string) => void;
}

export default function AlertCard({ alert, onMarkRead }: AlertCardProps) {
  const sev = SEVERITY[alert.severity];
  return (
    <div className="flex items-start gap-3 p-3 rounded-xl border border-line/60 bg-card/70">
      <span className="text-base leading-none mt-0.5">{sev.icon}</span>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-semibold text-ink">{alert.title}</span>
          <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${sev.chip}`}>
            {alert.severity}
          </span>
          <span className="text-[11px] uppercase tracking-wider text-faint">{alert.kind}</span>
        </div>
        <p className="text-xs text-muted mt-1 leading-relaxed">{alert.message}</p>
        <div className="flex items-center justify-between mt-2">
          <span className="text-[11px] text-faint tabular-nums">
            {formatTimeAgo(alert.timestamp)}
          </span>
          {onMarkRead && (
            <button
              onClick={() => onMarkRead(alert.id)}
              className="text-[11px] text-muted hover:text-ink transition-colors cursor-pointer"
            >
              Dismiss
            </button>
          )}
        </div>
      </div>
    </div>
  );
}