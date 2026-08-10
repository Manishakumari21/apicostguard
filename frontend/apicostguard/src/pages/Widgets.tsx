import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useSettingsData, useToggleMonitoring } from "../hooks/useSettings";
import { useUsageData } from "../hooks/useMonitor";
import { getServers, getDailySummary, type DailySummary, type ServerStatus } from "../services/monitor";
import { sendTestNotification } from "../services/notification";
import { useNotify } from "../hooks/useNotifications";
import { getApiKeys } from "../services/apiKeys";
import type { ApiKey } from "../types/apiKey";
import { getBudgetBgClass, getProviderColor, getProviderIcon } from "../utils/helpers";
import { PROVIDERS } from "../utils/constants";
import Toggle from "../components/common/Toggle";
import Button from "../components/common/Button";

export default function Widgets() {
  const settings = useSettingsData();
  const usage = useUsageData();
  const toggleMonitoring = useToggleMonitoring();
  const [servers, setServers] = useState<ServerStatus[]>([]);
  const [summary, setSummary] = useState<DailySummary | null>(null);
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [sent, setSent] = useState(false);
  const notify = useNotify();

  useEffect(() => {
    let stopped = false;
    async function load() {
      const [s, d] = await Promise.all([getServers(), getDailySummary()]);
      if (!stopped) {
        setServers(s);
        setSummary(d);
        setKeys(getApiKeys());
      }
    }
    load();
    const timer = setInterval(load, 5000);
    return () => {
      stopped = true;
      clearInterval(timer);
    };
  }, []);

  async function test() {
    await sendTestNotification();
    notify(
      "Test notification",
      "Monitoring is working — this is how budget and provider alerts will appear.",
      "system"
    );
    setSent(true);
    setTimeout(() => setSent(false), 2500);
  }

  const dailyPercent =
    settings.budget.dailyLimit > 0
      ? (usage.dailyCost / settings.budget.dailyLimit) * 100
      : 0;
  const monthlyPercent =
    settings.budget.monthlyLimit > 0
      ? (usage.monthlyCost / settings.budget.monthlyLimit) * 100
      : 0;

  const providers = useMemo(() => {
    const cloud = keys.map((k) => {
      const cfg = PROVIDERS.find((p) => p.id === k.provider);
      const name = cfg?.name ?? k.provider;
      return {
        id: k.provider,
        name,
        color: cfg?.color ?? "#A8B3C5",
        icon: cfg?.icon ?? "🔌",
        active: true,
        meta: "key stored",
      };
    });
    const local = servers
      .filter((s) => !cloud.some((c) => c.name.toLowerCase() === s.name.toLowerCase()))
      .map((s) => ({
        id: s.id,
        name: s.name,
        color: getProviderColor(s.name),
        icon: getProviderIcon(s.name),
        active: s.connected,
        meta: s.connected
          ? `${s.runningModels.length} running`
          : "offline",
      }));
    return [...cloud, ...local].sort(
      (a, b) => Number(b.active) - Number(a.active)
    );
  }, [servers, keys]);

  const activeCount = providers.filter((p) => p.active).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-ink">Widgets</h1>
          <p className="text-sm text-muted mt-0.5">
            Monitoring controls, server health and live budget status.
          </p>
        </div>
        <span className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium bg-success/10 text-success border border-success/30">
          <span className="w-2 h-2 rounded-full bg-success animate-pulse" />
          Live
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <WidgetCard icon="🛰️" title="Monitoring" accent="#9ccfd8">
          <Toggle
            checked={settings.monitoringEnabled}
            onChange={toggleMonitoring}
            label="Track local models"
          />
          <div className="flex items-center justify-between mt-3 pt-3 border-t border-line/50">
            <span className="text-xs text-faint">
              {settings.monitoringEnabled
                ? "Scanning Ollama + LM Studio"
                : "Monitoring paused"}
            </span>
            <span
              className={`px-2 py-0.5 text-[10px] rounded-full font-medium ${
                settings.monitoringEnabled
                  ? "bg-success/10 text-success border border-success/30"
                  : "bg-line/40 text-faint border border-line"
              }`}
            >
              {settings.monitoringEnabled ? "Active" : "Paused"}
            </span>
          </div>
        </WidgetCard>

        <WidgetCard icon="🖥️" title="Connected Providers" accent="#c4a7e7">
          {providers.length === 0 ? (
            <p className="text-sm text-faint text-center py-4">
              No providers yet — add API keys or start a local model
            </p>
          ) : (
            <div className="space-y-2.5">
              {providers.map((p) => (
                <div
                  key={p.id}
                  className="flex items-center gap-2.5 rounded-xl bg-canvas/50 border border-line/50 px-3 py-2"
                >
                  <span
                    className="w-7 h-7 rounded-lg flex items-center justify-center text-sm shrink-0"
                    style={{ backgroundColor: `${p.color}15`, border: `1px solid ${p.color}25` }}
                  >
                    {p.icon}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-ink truncate">{p.name}</p>
                    <p className="text-[10px] text-faint truncate">{p.meta}</p>
                  </div>
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded-full shrink-0 ${
                      p.active
                        ? "bg-success/10 text-success border border-success/30"
                        : "bg-line/40 text-faint border border-line"
                    }`}
                  >
                    {p.active ? "Active" : "Offline"}
                  </span>
                </div>
              ))}
            </div>
          )}
        </WidgetCard>

        <WidgetCard icon="🔔" title="Notifications" accent="#ebbcba">
          <div className="flex items-center gap-3">
            <Button size="sm" variant="secondary" onClick={test}>
              Send test notification
            </Button>
            {sent && (
              <span className="text-xs text-success animate-pulse">Sent!</span>
            )}
          </div>
          <div className="mt-3 pt-3 border-t border-line/50">
            <p className="text-xs text-faint">
              Budget alerts at {settings.notifications.thresholds.join(", ")}%
              of your limits
            </p>
          </div>
        </WidgetCard>
      </div>

      <div className="card p-5">
        <div className="flex items-center gap-3 mb-4">
          <span className="w-8 h-8 rounded-lg bg-warning/15 border border-warning/30 flex items-center justify-center text-sm">
            💰
          </span>
          <div>
            <h3 className="text-sm font-semibold text-ink">Budget</h3>
            <p className="text-xs text-muted">
              Live spend · {activeCount} of {providers.length} providers active
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <BudgetBar
            label="Daily"
            used={usage.dailyCost}
            limit={settings.budget.dailyLimit}
            percent={dailyPercent}
            thresholds={settings.notifications.thresholds}
          />
          <BudgetBar
            label="Monthly"
            used={usage.monthlyCost}
            limit={settings.budget.monthlyLimit}
            percent={monthlyPercent}
            thresholds={settings.notifications.thresholds}
          />
        </div>

        {summary && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5 pt-5 border-t border-line/50">
            <SummaryStat label="Tokens today" value={summary.todayTokens.toLocaleString()} />
            <SummaryStat label="Requests today" value={summary.todayRequests.toLocaleString()} />
            <SummaryStat label="Tokens this month" value={summary.monthTokens.toLocaleString()} />
            <SummaryStat label="Requests this month" value={summary.monthRequests.toLocaleString()} />
          </div>
        )}
      </div>
    </div>
  );
}

function WidgetCard({
  icon,
  title,
  accent,
  children,
}: {
  icon: string;
  title: string;
  accent: string;
  children: ReactNode;
}) {
  return (
    <div className="card p-5">
      <div className="flex items-center gap-3 mb-4">
        <span
          className="w-9 h-9 rounded-xl flex items-center justify-center text-base shrink-0"
          style={{ backgroundColor: `${accent}18`, border: `1px solid ${accent}30` }}
        >
          {icon}
        </span>
        <h3 className="text-sm font-semibold text-ink">{title}</h3>
      </div>
      {children}
    </div>
  );
}

function SummaryStat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[10px] text-muted uppercase tracking-wider">{label}</p>
      <p className="text-lg font-bold text-ink tabular-nums">{value}</p>
    </div>
  );
}

function BudgetBar({
  label,
  used,
  limit,
  percent,
  thresholds,
}: {
  label: string;
  used: number;
  limit: number;
  percent: number;
  thresholds: number[];
}) {
  const pct = Math.min(percent, 100);
  const threshold = thresholds[0] ?? 80;
  const fillClass = getBudgetBgClass(percent, threshold);

  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-xs font-medium text-muted">{label}</span>
        <span className="text-xs font-semibold text-ink tabular-nums">
          ${used.toFixed(4)}{" "}
          <span className="text-faint font-normal">/ ${limit.toFixed(2)}</span>
        </span>
      </div>
      <div className="relative">
        <div className="progress-bar">
          <div className={`progress-fill ${fillClass}`} style={{ width: `${pct}%` }} />
        </div>
        {thresholds.map((t) => (
          <span
            key={t}
            className="absolute top-0 -translate-x-1/2 h-full w-px bg-ink/30"
            style={{ left: `${Math.min(t, 100)}%` }}
            title={`${t}% threshold`}
          />
        ))}
      </div>
      <div className="flex justify-between mt-1">
        <span className="text-[10px] text-faint">0%</span>
        <span className="text-[10px] text-faint">
          {thresholds.join("% · ")}% thresholds
        </span>
        <span className="text-[10px] font-semibold text-ink tabular-nums">
          {percent.toFixed(1)}%
        </span>
      </div>
    </div>
  );
}
