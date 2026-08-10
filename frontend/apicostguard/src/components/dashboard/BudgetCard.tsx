interface BudgetCardProps {
  dailyUsed: number;
  dailyLimit: number;
  monthlyUsed: number;
  monthlyLimit: number;
}

export default function BudgetCard({
  dailyUsed,
  dailyLimit,
  monthlyUsed,
  monthlyLimit,
}: BudgetCardProps) {
  const dailyPercent = dailyLimit > 0 ? Math.min((dailyUsed / dailyLimit) * 100, 100) : 0;
  const monthlyPercent = monthlyLimit > 0 ? Math.min((monthlyUsed / monthlyLimit) * 100, 100) : 0;

  return (
    <div className="p-4 rounded-xl bg-card/80 border border-line/50">
      <h3 className="text-sm font-semibold text-muted mb-3">Budget</h3>
      <div className="space-y-4">
        <BudgetBar
          label="Daily"
          percent={dailyPercent}
          value={`$${dailyUsed.toFixed(2)} / $${dailyLimit.toFixed(2)}`}
        />
        <BudgetBar
          label="Monthly"
          percent={monthlyPercent}
          value={`$${monthlyUsed.toFixed(2)} / $${monthlyLimit.toFixed(2)}`}
        />
      </div>
    </div>
  );
}

function BudgetBar({
  label,
  percent,
  value,
}: {
  label: string;
  percent: number;
  value: string;
}) {
  const color =
    percent >= 100
      ? "bg-red-500"
      : percent >= 90
        ? "bg-amber-500"
        : percent >= 80
          ? "bg-orange-500"
          : "bg-emerald-500";

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs text-muted">{label}</span>
        <span className="text-xs font-medium text-ink tabular-nums">{value}</span>
      </div>
      <div className="progress-bar">
        <div className={`progress-fill ${color}`} style={{ width: `${percent}%` }} />
      </div>
    </div>
  );
}
