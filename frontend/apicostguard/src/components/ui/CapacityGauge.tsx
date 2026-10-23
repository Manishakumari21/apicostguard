import { formatCost } from "../../utils/format";
import { palette } from "../../utils/palette";

interface Props {
  title: string;
  remainingPercent: number;
  spent: number;
  limit: number;
  footer?: string;
  runoutLabel?: string | null;
  onClick?: () => void;
}

export default function CapacityGauge({
  title,
  remainingPercent,
  spent,
  limit,
  footer,
  runoutLabel,
  onClick,
}: Props) {
  const pct = Math.max(0, Math.min(100, remainingPercent));
  const usedPct = 100 - pct;
  const tone =
    pct <= 10 ? palette.danger : pct <= 20 ? palette.warning : palette.success;
  const statusLabel =
    pct <= 10 ? "Nearly spent" : pct <= 20 ? "Low" : "On track";

  return (
    <div
      className={`card p-4 flex flex-col gap-3 ${onClick ? "cursor-pointer hover:border-info/40 transition-colors" : ""}`}
      onClick={onClick}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-semibold text-ink truncate">{title}</span>
        <span
          className="px-2 py-0.5 text-[10px] font-medium rounded-full"
          style={{
            color: tone,
            backgroundColor: `${tone}18`,
            border: `1px solid ${tone}30`,
          }}
        >
          {statusLabel}
        </span>
      </div>

      <div className="flex items-end gap-3">
        <span className="text-3xl font-bold tabular-nums leading-none" style={{ color: tone }}>
          {pct.toFixed(0)}%
        </span>
        <span className="text-[10px] text-muted leading-none pb-0.5">left</span>
      </div>

      <div className="w-full h-1.5 rounded-full bg-line/50 overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${usedPct}%`, backgroundColor: tone }}
        />
      </div>

      <div className="flex items-center justify-between text-[10px] text-muted gap-2">
        <span className="tabular-nums">
          {formatCost(spent)} / {formatCost(limit)}
        </span>
        {runoutLabel && <span className="text-danger whitespace-nowrap">runs out {runoutLabel}</span>}
      </div>

      {footer && <div className="text-[10px] text-muted">{footer}</div>}
    </div>
  );
}