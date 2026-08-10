import { useUsage } from "../../context/UsageContext";
import { formatCost, formatTokens } from "../../utils/formatter";

export default function Navbar() {
  const { totalCost, dailyCost, totalTokens, activeProvider } = useUsage();

  return (
    <nav className="flex items-center justify-between px-6 py-2.5 bg-surface/60 backdrop-blur border-b border-line/30">
      <div className="flex items-center gap-6">
        <NavStat icon="💰" label="Total" value={formatCost(totalCost)} color="#22d3ee" />
        <NavStat icon="📅" label="Today" value={formatCost(dailyCost)} color="#3b82f6" />
        <NavStat icon="🔤" label="Tokens" value={formatTokens(totalTokens)} color="#8b5cf6" />
      </div>
      <div className="flex items-center gap-2">
        <span className="w-2 h-2 rounded-full bg-success" />
        <span className="text-xs text-muted">
          {activeProvider ?? "No provider"}
        </span>
      </div>
    </nav>
  );
}

function NavStat({ icon, label, value, color }: { icon: string; label: string; value: string; color: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs">{icon}</span>
      <div>
        <p className="text-[10px] text-muted/60 leading-none">{label}</p>
        <p className="text-xs font-semibold tabular-nums" style={{ color }}>{value}</p>
      </div>
    </div>
  );
}
