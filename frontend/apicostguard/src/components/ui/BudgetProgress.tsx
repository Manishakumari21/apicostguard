import { formatCost } from "../../utils/format";

interface BudgetProgressProps {
  used: number;
  limit: number;
  threshold?: number;
  size?: "sm" | "lg";
  showLabel?: boolean;
}

const TONES = {
  safe: "bg-success",
  warning: "bg-warning",
  critical: "bg-danger",
};

function toneFor(percent: number, threshold: number): keyof typeof TONES {
  if (percent >= 100) return "critical";
  if (percent >= threshold) return "warning";
  return "safe";
}

export default function BudgetProgress({
  used,
  limit,
  threshold = 80,
  size = "sm",
  showLabel = true,
}: BudgetProgressProps) {
  const percent = limit > 0 ? Math.min((used / limit) * 100, 100) : 0;
  const tone = toneFor(percent, threshold);
  const barHeight = size === "lg" ? "h-2.5" : "h-1.5";

  return (
    <div>
      <div className={`w-full rounded-full bg-line/50 overflow-hidden ${barHeight}`}>
        <div
          className={`h-full rounded-full transition-[width] duration-300 ease-out ${TONES[tone]}`}
          style={{ width: `${Math.max(percent, used > 0 ? 2 : 0)}%` }}
        />
      </div>
      {showLabel && (
        <div className="flex items-center justify-between mt-1.5 text-[11px]">
          <span className="text-muted tabular-nums">
            {formatCost(used)} of {formatCost(limit)}
          </span>
          <span
            className={`font-semibold tabular-nums ${
              tone === "safe"
                ? "text-success"
                : tone === "warning"
                  ? "text-warning"
                  : "text-danger"
            }`}
          >
            {percent.toFixed(1)}%
          </span>
        </div>
      )}
    </div>
  );
}