import { useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useUsage } from "../../context/UsageContext";
import { useSettings } from "../../context/SettingsContext";
import { useUI } from "../../context/UIContext";
import { useSetTheme } from "../../hooks/useSettings";
import { getCurrencySymbol } from "../../utils/format";
import type { Theme } from "../../types/settings";

const TITLES: Record<string, string> = {
  "/": "Dashboard",
  "/models": "Models",
  "/analytics": "Analytics",
  "/browser": "Browser Providers",
  "/desktop": "Desktop Apps",
  "/local-models": "Local Models",
  "/litellm": "LiteLLM",
  "/widgets": "Widgets",
  "/notifications": "Notifications",
  "/api-keys": "API Keys",
  "/settings": "Settings",
  "/about": "About",
};

const THEME_OPTIONS: { value: Theme; icon: string; label: string }[] = [
  { value: "dark", icon: "🌙", label: "Dark" },
  { value: "light", icon: "☀️", label: "Light" },
  { value: "system", icon: "🖥️", label: "System" },
];

export default function Header() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { totalCost, dailyCost, totalTokens, activeProvider, activeModel } = useUsage();
  const { budget, notifications, theme } = useSettings();
  const { searchQuery, setSearchQuery, triggerRefresh } = useUI();
  const setTheme = useSetTheme();
  const [refreshing, setRefreshing] = useState(false);

  const threshold = notifications.thresholds[0] ?? 80;

  const budgetPercent = useMemo(
    () => Math.min((dailyCost / budget.dailyLimit) * 100, 100),
    [dailyCost, budget.dailyLimit]
  );

  const tokenDisplay = useMemo(() => {
    if (totalTokens >= 1_000_000) return `${(totalTokens / 1_000_000).toFixed(1)}M`;
    if (totalTokens >= 1_000) return `${(totalTokens / 1_000).toFixed(1)}K`;
    return totalTokens.toString();
  }, [totalTokens]);

  const title = TITLES[pathname] ?? "APICostGuard";
  const symbol = getCurrencySymbol(budget.currency);

  function handleRefresh() {
    setRefreshing(true);
    triggerRefresh();
    setTimeout(() => setRefreshing(false), 600);
  }

  return (
    <header className="glass sticky top-0 z-30 px-5 py-3 flex items-center justify-between gap-4 border-b border-line/60">
      <div className="flex items-center gap-4 min-w-0">
        <div className="min-w-0">
          <h1 className="text-lg font-bold text-ink leading-tight truncate">{title}</h1>
          <p className="text-[11px] text-muted truncate">
            {activeProvider ? (
              <>
                <span className="text-accent font-medium">{activeProvider}</span>
                {activeModel && <> · {activeModel}</>}
              </>
            ) : (
              "No active provider"
            )}
          </p>
        </div>

        <div className="hidden md:flex items-center gap-2 px-3 py-2 rounded-xl bg-canvas/60 border border-line/60 w-64">
          <span className="text-sm text-faint">🔍</span>
          <input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search activity…"
            className="flex-1 bg-transparent text-sm text-ink placeholder:text-faint focus:outline-none"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="text-faint hover:text-ink text-xs cursor-pointer"
              aria-label="Clear search"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      <div className="flex items-center gap-3">
        <NavStat label="Total" value={`${symbol}${totalCost.toFixed(4)}`} />
        <NavStat label="Today" value={`${symbol}${dailyCost.toFixed(4)}`} />
        <NavStat label="Tokens" value={tokenDisplay} />
        <BudgetBadge percent={budgetPercent} threshold={threshold} />

        <button
          onClick={handleRefresh}
          title="Refresh data"
          aria-label="Refresh data"
          className={`p-2 rounded-xl bg-canvas/60 border border-line/60 text-muted hover:text-ink hover:border-iris/40 transition-all cursor-pointer ${
            refreshing ? "animate-spin" : ""
          }`}
        >
          ⟳
        </button>

        <div className="flex items-center gap-1 p-1 rounded-xl bg-canvas/60 border border-line/60">
          {THEME_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              title={opt.label}
              aria-label={`${opt.label} theme`}
              onClick={() => setTheme(opt.value)}
              className={`px-2 py-1 rounded-lg text-sm transition-all duration-150 cursor-pointer ${
                theme === opt.value
                  ? "bg-accent/15 text-accent border border-accent/30"
                  : "text-muted hover:text-ink border border-transparent"
              }`}
            >
              {opt.icon}
            </button>
          ))}
        </div>

        <button
          onClick={() => navigate("/settings")}
          title="Open settings"
          className="w-9 h-9 rounded-full bg-gradient-to-br from-iris to-foam flex items-center justify-center shadow-[0_0_14px_rgba(196,167,231,0.3)] hover:opacity-90 transition-opacity cursor-pointer shrink-0"
        >
          <span
            className="font-extrabold text-xs tracking-tight leading-none"
            style={{ color: "#ffffff", textShadow: "0 1px 3px rgba(31,29,46,0.6)" }}
          >
            AI
          </span>
        </button>
      </div>
    </header>
  );
}

function NavStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="text-right hidden xl:block">
      <p className="text-[10px] text-muted uppercase tracking-wider leading-none">{label}</p>
      <p className="text-sm font-semibold text-ink tabular-nums leading-tight">{value}</p>
    </div>
  );
}

function BudgetBadge({ percent, threshold }: { percent: number; threshold: number }) {
  const tone =
    percent >= 100
      ? "text-danger bg-danger/10 border-danger/30"
      : percent >= threshold
        ? "text-warning bg-warning/10 border-warning/30"
        : "text-success bg-success/10 border-success/30";

  return (
    <div className="flex items-center gap-2">
      <div className="w-14 h-1.5 rounded-full bg-line/60 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${
            percent >= 100
              ? "bg-danger"
              : percent >= threshold
                ? "bg-warning"
                : "bg-success"
          }`}
          style={{ width: `${percent}%` }}
        />
      </div>
      <span className={`px-2.5 py-1 rounded-full text-xs font-semibold border ${tone}`}>
        {percent.toFixed(1)}%
      </span>
    </div>
  );
}
