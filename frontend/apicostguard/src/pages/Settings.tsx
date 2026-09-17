import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useSettings, useSettingsDispatch } from "../context/SettingsContext";
import { useSetTheme } from "../hooks/useSettings";
import { useAppInfo } from "../hooks/useAppInfo";
import { APP_NAME, APP_TAGLINE, GITHUB_ISSUES_URL, GITHUB_REPO_PATH, GITHUB_REPO_URL } from "../config/app";
import { CLOUD_PROVIDERS, THEME_CHOICES, gatewayHttp } from "../utils/constants";
import { getGatewayStatus } from "../services/gatewayService";
import { openExternal } from "../services/external";
import type { GatewayStatus } from "../types/domain";
import PageHeader from "../components/ui/PageHeader";
import Panel from "../components/ui/Panel";
import StatusIndicator from "../components/ui/StatusIndicator";
import Toggle from "../components/common/Toggle";
import Button from "../components/common/Button";
import Brand from "../components/common/Brand";
import UpdateCheck from "../components/ui/UpdateCheck";
import DownloadSection from "../components/ui/DownloadSection";
import { ExternalLinkIcon, GitHubIcon } from "../components/ui/Icons";
import { useGatewayQuery } from "../hooks/useGatewayQuery";
import { getBudgets } from "../services/budgetService";
import { formatCost } from "../utils/format";

type Tab = "general" | "gateway" | "providers" | "budgets" | "notifications" | "security" | "appearance" | "about";

const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: "general", label: "General", icon: "🪄" },
  { id: "gateway", label: "Gateway", icon: "🌐" },
  { id: "providers", label: "Providers", icon: "🔌" },
  { id: "budgets", label: "Budgets", icon: "🎯" },
  { id: "notifications", label: "Notifications", icon: "🔔" },
  { id: "security", label: "Security", icon: "🔒" },
  { id: "appearance", label: "Appearance", icon: "🎨" },
  { id: "about", label: "About", icon: "ℹ️" },
];

export default function Settings() {
  const location = useLocation();
  const requestedTab = (location.state as { tab?: Tab } | null)?.tab ?? "general";
  const [tab, setTab] = useState<Tab>(requestedTab);

  return (
    <div>
      <PageHeader title="Settings" description="Application, gateway, and privacy configuration." />

      <div className="flex flex-col lg:flex-row gap-4">
        <nav className="lg:w-48 shrink-0 flex lg:flex-col gap-1 overflow-x-auto">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-all cursor-pointer whitespace-nowrap ${
                tab === t.id
                  ? "bg-accent/12 text-accent font-medium border border-accent/25"
                  : "text-muted hover:bg-line/20 hover:text-ink border border-transparent"
              }`}
            >
              <span>{t.icon}</span>
              {t.label}
            </button>
          ))}
        </nav>

        <div className="flex-1 min-w-0 space-y-4">
          {tab === "general" && <GeneralTab />}
          {tab === "gateway" && <GatewayTab />}
          {tab === "providers" && <ProvidersTab />}
          {tab === "budgets" && <BudgetsTab />}
          {tab === "notifications" && <NotificationsTab />}
          {tab === "security" && <SecurityTab />}
          {tab === "appearance" && <AppearanceTab />}
          {tab === "about" && <AboutTab />}
        </div>
      </div>
    </div>
  );
}

function GeneralTab() {
  const settings = useSettings();
  const dispatch = useSettingsDispatch();
  return (
    <Panel title="General">
      <SettingRow
        title="Usage monitoring"
        description="Track tool usage through the gateway when available."
        control={
          <Toggle
            checked={settings.monitoringEnabled}
            onChange={() => dispatch({ type: "TOGGLE_MONITORING" })}
          />
        }
      />
      <SettingRow
        title="Widgets"
        description="Enable dashboard widgets on the home screens."
        control={
          <Toggle
            checked={settings.widgetsEnabled}
            onChange={() => dispatch({ type: "TOGGLE_WIDGET" })}
          />
        }
      />
      <SettingRow
        title="Desktop widget"
        description="Show the live cost widget on the desktop (where supported)."
        control={
          <Toggle
            checked={settings.desktopWidget}
            onChange={() => dispatch({ type: "TOGGLE_DESKTOP_WIDGET" })}
          />
        }
      />
      <SettingRow
        title="Start on boot"
        description="Launch APICostGuard when you sign in to your machine."
        control={
          <Toggle
            checked={settings.startupOnBoot}
            onChange={() => dispatch({ type: "TOGGLE_STARTUP_ON_BOOT" })}
          />
        }
      />
      <SettingRow
        title="Polling interval"
        description="How often the UI refreshes live metrics."
        control={
          <select
            defaultValue={settings.pollIntervalSecs}
            className="px-2 py-1.5 rounded-lg bg-canvas/60 border border-line/60 text-sm text-ink focus:outline-none"
          >
            <option value={3}>3 s</option>
            <option value={5}>5 s</option>
            <option value={10}>10 s</option>
            <option value={30}>30 s</option>
          </select>
        }
      />
    </Panel>
  );
}

function GatewayTab() {
  const navigate = useNavigate();
  const { data } = useGatewayQuery(() => getGatewayStatus(), ["gw-status-settings"]);
  const gw = data as GatewayStatus | null;
  const rows: [string, string][] = [
    ["Endpoint", gatewayHttp(gw?.endpointHost, gw?.endpointPort)],
    ["Environment", gw?.environment ?? "—"],
    ["Version", gw?.version ? `v${gw.version}` : "—"],
    ["Uptime", gw?.uptimeSeconds != null ? `${Math.floor(gw.uptimeSeconds / 60)}m ${gw.uptimeSeconds % 60}s` : "—"],
    ["Managed", gw?.managed ? "by APICostGuard" : "external process"],
  ];
  return (
    <Panel title="Gateway" actions={<Button size="sm" variant="secondary" onClick={() => navigate("/gateway")}>Open gateway</Button>}>
      <div className="mb-3">
        <StatusIndicator
          tone={gw?.running ? "healthy" : "critical"}
          label={gw?.running ? "Gateway running" : "Gateway stopped"}
          pulse={gw?.running}
        />
      </div>
      <div className="rounded-lg border border-line/60 bg-card overflow-hidden">
        {rows.map(([k, v]) => (
          <div key={k} className="flex items-center justify-between gap-4 px-3 py-2 border-b border-line/40 last:border-0">
            <span className="text-xs text-muted">{k}</span>
            <span className="text-xs text-ink font-mono tabular-nums">{v}</span>
          </div>
        ))}
      </div>
    </Panel>
  );
}

function ProvidersTab() {
  const settings = useSettings();
  const dispatch = useSettingsDispatch();
  return (
    <Panel title="Supported providers">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
        {CLOUD_PROVIDERS.map((p) => {
          const enabled = settings.connectedProviders.includes(p.name);
          return (
            <div
              key={p.id}
              className="flex items-center justify-between gap-3 px-3 py-2 rounded-lg border border-line/60 bg-card"
            >
              <div className="flex items-center gap-2 min-w-0">
                <span>{p.icon}</span>
                <span className="text-sm text-ink truncate">{p.name}</span>
              </div>
              <Toggle
                checked={enabled}
                onChange={() => dispatch({ type: "TOGGLE_PROVIDER", payload: p.name })}
              />
            </div>
          );
        })}
      </div>
      <p className="text-[11px] text-faint mt-3">
        Provider keys are stored locally and never displayed in plain text. See Security.
      </p>
    </Panel>
  );
}

function BudgetsTab() {
  const navigate = useNavigate();
  const { data } = useGatewayQuery(() => getBudgets(), ["budgets-settings"]);
  const current = data?.current;
  return (
    <Panel
      title="Budgets"
      actions={<Button size="sm" variant="secondary" onClick={() => navigate("/budgets")}>Manage budgets</Button>}
    >
      {current ? (
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-lg border border-line/60 bg-card p-3">
            <p className="text-[10px] uppercase tracking-wider text-muted">Monthly limit</p>
            <p className="text-lg font-bold text-ink tabular-nums">{formatCost(current.monthlyLimit)}</p>
          </div>
          <div className="rounded-lg border border-line/60 bg-card p-3">
            <p className="text-[10px] uppercase tracking-wider text-muted">Spent this month</p>
            <p className="text-lg font-bold text-ink tabular-nums">{formatCost(current.currentSpend)}</p>
          </div>
          <div className="rounded-lg border border-line/60 bg-card p-3">
            <p className="text-[10px] uppercase tracking-wider text-muted">Daily limit</p>
            <p className="text-lg font-bold text-ink tabular-nums">{formatCost(current.dailyLimit)}</p>
          </div>
          <div className="rounded-lg border border-line/60 bg-card p-3">
            <p className="text-[10px] uppercase tracking-wider text-muted">Alert threshold</p>
            <p className="text-lg font-bold text-ink tabular-nums">{current.threshold}%</p>
          </div>
        </div>
      ) : (
        <p className="text-sm text-muted py-6 text-center">Loading budget…</p>
      )}
    </Panel>
  );
}

function NotificationsTab() {
  const settings = useSettings();
  const dispatch = useSettingsDispatch();
  return (
    <Panel title="Notifications">
      <SettingRow
        title="Enable notifications"
        description="Show desktop alerts when thresholds are crossed."
        control={
          <Toggle
            checked={settings.notifications.enabled}
            onChange={() => dispatch({ type: "SET_NOTIFICATIONS", payload: { enabled: !settings.notifications.enabled } })}
          />
        }
      />
      <SettingRow
        title="Play sound"
        description="Play an alert sound for critical notifications."
        control={
          <Toggle
            checked={settings.notifications.sound}
            onChange={() => dispatch({ type: "SET_NOTIFICATIONS", payload: { sound: !settings.notifications.sound } })}
          />
        }
      />
      <p className="text-[11px] text-faint mt-3">
        Thresholds are configured on the Budgets page (warning / critical / block levels).
      </p>
    </Panel>
  );
}

function SecurityTab() {
  const navigate = useNavigate();
  return (
    <Panel title="Security">
      <SettingRow
        title="API keys"
        description="Manage provider API keys. Keys are stored locally and masked in the UI."
        control={
          <Button size="sm" variant="secondary" onClick={() => navigate("/api-keys")}>
            Manage keys
          </Button>
        }
      />
      <SettingRow
        title="Gateway exposure"
        description="The gateway binds to localhost only; it is not exposed to the network."
        control={<StatusIndicator tone="healthy" label="Local only" />}
      />
      <SettingRow
        title="Request logging"
        description="Request history is stored in the local SQLite database only."
        control={<StatusIndicator tone="info" label="Local" />}
      />
    </Panel>
  );
}

function AppearanceTab() {
  const settings = useSettings();
  const setTheme = useSetTheme();
  const dispatch = useSettingsDispatch();
  return (
    <Panel title="Appearance">
      <div className="grid grid-cols-3 gap-2 mb-4">
        {THEME_CHOICES.map((t) => (
          <button
            key={t.value}
            onClick={() => setTheme(t.value)}
            className={`px-3 py-2.5 rounded-lg border text-sm transition-all cursor-pointer ${
              settings.theme === t.value
                ? "bg-accent/12 text-accent border-accent/30 font-medium"
                : "border-line/60 text-muted hover:bg-line/20 hover:text-ink"
            }`}
          >
            {t.icon} {t.label}
          </button>
        ))}
      </div>
      <SettingRow
        title="Desktop widget"
        description="Show the floating cost widget on supported desktops."
        control={
          <Toggle
            checked={settings.desktopWidget}
            onChange={() => dispatch({ type: "TOGGLE_DESKTOP_WIDGET" })}
          />
        }
      />
    </Panel>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between px-3 py-2 border-b border-line/40 last:border-0">
      <span className="text-xs text-muted">{label}</span>
      <span className="text-xs font-medium text-ink">{value}</span>
    </div>
  );
}

function AboutTab() {
  const { data: appInfo } = useAppInfo();

  return (
      <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Brand size="lg" />
      </div>
      <Panel title="About APICostGuard">
        <div className="mb-4">
          <p className="text-sm font-semibold text-ink">{APP_NAME}</p>
          <p className="text-xs text-muted">{APP_TAGLINE}</p>
        </div>

        <div className="rounded-lg border border-line/60 bg-card overflow-hidden">
          <InfoRow label="Version" value={appInfo?.version ? `v${appInfo.version}` : "…"} />
          <InfoRow label="Platform" value={appInfo?.platform ?? "…"} />
          <InfoRow label="Architecture" value={appInfo?.arch ?? "…"} />
          <InfoRow label="Frontend" value="React 19 + TypeScript" />
          <InfoRow label="Shell" value="Tauri 2 (Rust)" />
          <InfoRow label="Database" value="SQLite" />
          <InfoRow label="Privacy" value="100% local" />
        </div>
      </Panel>

      <Panel title="Links">
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" size="sm" onClick={() => void openExternal(GITHUB_REPO_URL)}>
            <GitHubIcon /> GitHub <ExternalLinkIcon className="w-3 h-3 opacity-60" />
          </Button>
          <Button variant="secondary" size="sm" onClick={() => void openExternal(GITHUB_ISSUES_URL)}>
            Report an issue <ExternalLinkIcon className="w-3 h-3 opacity-60" />
          </Button>
        </div>
        <p className="text-[11px] text-faint mt-2">
          GitHub path: {GITHUB_REPO_PATH}
        </p>
      </Panel>

      <Panel title="Download APICostGuard" subtitle="Run your AI API governance gateway locally.">
        <DownloadSection />
      </Panel>

      <Panel title="Check for updates">
        <UpdateCheck />
      </Panel>
    </div>
  );
}

function SettingRow({
  title,
  description,
  control,
}: {
  title: string;
  description?: string;
  control: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-4 py-3 border-b border-line/40 last:border-0">
      <div className="min-w-0">
        <p className="text-sm text-ink">{title}</p>
        {description && <p className="text-[11px] text-muted mt-0.5">{description}</p>}
      </div>
      <div className="shrink-0">{control}</div>
    </div>
  );
}