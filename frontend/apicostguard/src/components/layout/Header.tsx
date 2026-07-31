import { useMemo } from "react";
import { useUsage } from "../../context/UsageContext";
import { useSettings } from "../../context/SettingsContext";

export default function Header() {
  const { totalCost, dailyCost, totalTokens, activeProvider, activeModel } = useUsage();
  const { budget } = useSettings();

  const budgetPercent = useMemo(
    () => Math.min((dailyCost / budget.dailyLimit) * 100, 100).toFixed(1),
    [dailyCost, budget.dailyLimit]
  );

  const tokenDisplay = useMemo(() => {
    if (totalTokens >= 1_000_000) return `${(totalTokens / 1_000_000).toFixed(1)}M`;
    if (totalTokens >= 1_000) return `${(totalTokens / 1_000).toFixed(1)}K`;
    return totalTokens.toString();
  }, [totalTokens]);

  return (
    <header className="flex items-center justify-between px-6 py-3 border-b border-gray-800 bg-gray-900/50 backdrop-blur">
      <div className="flex items-center gap-6">
        <StatusDot active={!!activeProvider} />
        <div>
          <p className="text-xs text-gray-500">Active Provider</p>
          <p className="text-sm font-medium text-gray-200">
            {activeProvider ?? "None"} {activeModel && `· ${activeModel}`}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-8">
        <Stat label="Total Cost" value={`$${totalCost.toFixed(4)}`} />
        <Stat label="Today" value={`$${dailyCost.toFixed(4)}`} />
        <Stat label="Tokens" value={tokenDisplay} />
        <BudgetBadge percent={Number(budgetPercent)} />
      </div>
    </header>
  );
}

function StatusDot({ active }: { active: boolean }) {
  return (
    <span
      className={`block w-2.5 h-2.5 rounded-full ${
        active ? "bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.5)]" : "bg-gray-600"
      }`}
    />
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="text-right">
      <p className="text-xs text-gray-500">{label}</p>
      <p className="text-sm font-semibold text-gray-100 tabular-nums">{value}</p>
    </div>
  );
}

function BudgetBadge({ percent }: { percent: number }) {
  const color =
    percent >= 100
      ? "text-red-400 bg-red-500/10 border-red-500/30"
      : percent >= 90
        ? "text-amber-400 bg-amber-500/10 border-amber-500/30"
        : percent >= 80
          ? "text-orange-400 bg-orange-500/10 border-orange-500/30"
          : "text-emerald-400 bg-emerald-500/10 border-emerald-500/30";

  return (
    <div className={`px-3 py-1 rounded-full text-xs font-semibold border ${color}`}>
      {percent}%
    </div>
  );
}
