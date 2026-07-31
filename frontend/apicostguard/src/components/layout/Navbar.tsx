import { useUsage } from "../../context/UsageContext";
import { formatCost, formatTokens } from "../../utils/formatter";

export default function Navbar() {
  const { totalCost, dailyCost, totalTokens, activeProvider } = useUsage();

  return (
    <nav className="flex items-center justify-between px-6 py-2.5 bg-[#111827]/60 backdrop-blur border-b border-[#334155]/30">
      <div className="flex items-center gap-6">
        <NavStat icon="💰" label="Total" value={formatCost(totalCost)} color="#22C55E" />
        <NavStat icon="📅" label="Today" value={formatCost(dailyCost)} color="#06B6D4" />
        <NavStat icon="🔤" label="Tokens" value={formatTokens(totalTokens)} color="#8B5CF6" />
      </div>
      <div className="flex items-center gap-2">
        <span className="w-2 h-2 rounded-full bg-[#22C55E]" />
        <span className="text-xs text-[#94A3B8]">
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
        <p className="text-[10px] text-[#94A3B8]/60 leading-none">{label}</p>
        <p className="text-xs font-semibold tabular-nums" style={{ color }}>{value}</p>
      </div>
    </div>
  );
}
