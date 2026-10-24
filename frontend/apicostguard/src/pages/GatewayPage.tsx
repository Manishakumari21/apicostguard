import { useState } from "react";
import { Link } from "react-router-dom";
import { Badge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import { CopyButton } from "../components/ui/CopyButton";
import { Icon } from "../components/ui/Icon";
import { PageHeader } from "../components/ui/PageHeader";
import { Panel, PanelHeader } from "../components/ui/Panel";
import { Callout } from "../components/ui/States";
import { SegmentedControl } from "../components/ui/SegmentedControl";
import { useSystemStatus } from "../context/SystemStatusContext";
import { useToast } from "../context/ToastContext";
import { formatRelative, formatUptime } from "../lib/format";
import { API_BASE_URL, HAS_API_TOKEN, isTauriRuntime } from "../services/client";
import { restartGateway } from "../services/api";

const CHAT_EXAMPLE = `curl -X POST ${API_BASE_URL}/v1/chat/completions \\
  -H "Content-Type: application/json" \\
  -d '{
    "model": "gpt-4o",
    "messages": [{ "role": "user", "content": "Hello" }]
  }'`;

const PROXY_EXAMPLE = `curl -X POST ${API_BASE_URL}/proxy \\
  -H "Content-Type: application/json" \\
  -d '{
    "provider": "openrouter",
    "model": "openrouter/auto",
    "messages": [{ "role": "user", "content": "Hello" }]
  }'`;

type OsId = "macos" | "windows" | "linux";

const RELEASES_URL = "https://github.com/Manishakumari21/apicostguard/releases";

const OS_GUIDES: Record<
  OsId,
  {
    label: string;
    installer: string;
    keychain: string;
    notifications: string;
    command: string;
  }
> = {
  macos: {
    label: "macOS",
    installer: ".dmg installer",
    keychain: "macOS Keychain",
    notifications: "System Settings → Notifications",
    command: `curl -X POST ${API_BASE_URL}/v1/chat/completions \\
  -H "Content-Type: application/json" \\
  -d '{
    "model": "gpt-4o",
    "messages": [{ "role": "user", "content": "Hello" }]
  }'`,
  },
  windows: {
    label: "Windows",
    installer: ".msi or .exe installer",
    keychain: "Windows Credential Manager",
    notifications: "Settings → System → Notifications",
    command: `Invoke-RestMethod -Method Post \`
  -Uri "${API_BASE_URL}/v1/chat/completions" \`
  -ContentType "application/json" \`
  -Body '{"model":"gpt-4o","messages":[{"role":"user","content":"Hello"}]}'`,
  },
  linux: {
    label: "Linux",
    installer: ".AppImage or .deb package",
    keychain: "libsecret keyring",
    notifications: "your desktop notification settings",
    command: `curl -X POST ${API_BASE_URL}/v1/chat/completions \\
  -H "Content-Type: application/json" \\
  -d '{
    "model": "gpt-4o",
    "messages": [{ "role": "user", "content": "Hello" }]
  }'`,
  },
};

function detectOs(): OsId {
  if (typeof navigator === "undefined") return "macos";
  const ua = navigator.userAgent.toLowerCase();
  if (ua.includes("mac")) return "macos";
  if (ua.includes("win")) return "windows";
  return "linux";
}

export default function GatewayPage() {
  const { status, checking, refreshStatus } = useSystemStatus();
  const { notify } = useToast();
  const [restarting, setRestarting] = useState(false);
  const [os, setOs] = useState<OsId>(() => detectOs());
  const desktop = isTauriRuntime();
  const guide = OS_GUIDES[os];

  const online = status?.online ?? false;

  const restart = async () => {
    setRestarting(true);
    try {
      await restartGateway();
      await refreshStatus();
      notify({
        tone: "success",
        title: "Gateway restarted",
        message: "The desktop sidecar accepted the restart command. Health has been re-checked.",
      });
    } catch (error) {
      notify({
        tone: "error",
        title: "Restart failed",
        message: error instanceof Error ? error.message : "The desktop sidecar did not accept the restart command.",
      });
    } finally {
      setRestarting(false);
    }
  };

  const endpoint = status?.endpoint ?? API_BASE_URL;
  const curlExample = HAS_API_TOKEN
    ? CHAT_EXAMPLE.replace(
        '-H "Content-Type: application/json"',
        '-H "Content-Type: application/json" \\\n  -H "Authorization: Bearer $APICOSTGUARD_GATEWAY_TOKEN"'
      )
    : CHAT_EXAMPLE;

  return (
    <>
      <PageHeader
        index="02"
        label="API Gateway"
        title={
          <>
            The route between <span className="accent">your tools and every token.</span>
          </>
        }
        description="One local endpoint records cost and latency, enforces budgets, and forwards requests to provider adapters."
        actions={
          <>
            <Button icon="refresh" onClick={() => void refreshStatus()} loading={checking}>
              Check health
            </Button>
            <Link className="btn btn--primary" to="/api-keys">
              <Icon name="key" /> Provider keys
            </Link>
          </>
        }
      />

      {!online ? (
        <div className="gateway-offline-banner">
          <Callout tone="danger" title="The background gateway is not responding">
            {status?.error ?? "Health check did not receive a response."} Start the backend and check the endpoint below.
            <div className="code-block" style={{ marginTop: 10 }}>
              <pre>cd backend && cargo run</pre>
              <CopyButton value="cd backend && cargo run" />
            </div>
          </Callout>
        </div>
      ) : null}

      <div className="gateway-hero-grid">
        <Panel feature glow className="gateway-hero">
          <div className="gateway-hero-top">
            <div>
              <div className="eyebrow">
                <span className="dot" aria-hidden="true" /> Gateway health
              </div>
              <div className="gateway-state">
                <span className={`gateway-state-dot${online ? " is-online" : ""}`} aria-hidden="true" />
                {online ? "Accepting requests" : "No heartbeat"}
              </div>
              <p className="gateway-state-copy">
                {online
                  ? "The management API and proxy are reachable. New requests will be metered against the active budget."
                  : "The management API is unreachable. Requests cannot be recorded until the backend is running."}
              </p>
            </div>
            <div className={`gateway-radar${online ? " is-online" : ""}`} aria-hidden="true">
              <span className="radar-ring radar-ring--1" />
              <span className="radar-ring radar-ring--2" />
              <span className="radar-ring radar-ring--3" />
              <span className="radar-sweep" />
              <span className="radar-core" />
            </div>
          </div>

          <div className="gateway-hero-stats">
            <div>
              <span className="gateway-stat-label">Endpoint</span>
              <span className="gateway-endpoint">
                <code>{endpoint}</code>
                <CopyButton value={endpoint} label="" className="copy-btn copy-btn--inline" />
              </span>
            </div>
            <div>
              <span className="gateway-stat-label">Version</span>
              <strong className="gateway-stat-value">{status?.version || "—"}</strong>
            </div>
            <div>
              <span className="gateway-stat-label">Uptime</span>
              <strong className="gateway-stat-value">{formatUptime(status?.uptimeSeconds ?? null)}</strong>
            </div>
            <div>
              <span className="gateway-stat-label">Health latency</span>
              <strong className="gateway-stat-value">{status?.latencyMs !== null && status?.latencyMs !== undefined ? `${status.latencyMs} ms` : "—"}</strong>
            </div>
          </div>

          <div className="gateway-hero-footer">
            <span>
              <Icon name="clock" size={12} /> Last checked {status ? formatRelative(status.checkedAt) : "never"}
            </span>
            <div className="row wrap">
              <Badge tone={online ? "success" : "danger"}>{online ? "Management API online" : "Management API offline"}</Badge>
              <Badge tone="violet">{HAS_API_TOKEN ? "Bearer token configured" : "Local mode"}</Badge>
            </div>
          </div>
        </Panel>

        <Panel className="gateway-side">
          <PanelHeader
            kicker="Control"
            title="Sidecar"
            subtitle="Desktop builds can restart the managed backend process. Browser builds are read-only here."
          />
          <div className="panel-body stack-12">
            <div className="sidecar-state">
              <span className={`status-orb${online ? " is-live" : " is-down"}`} aria-hidden="true" />
              <div>
                <div className="sidecar-title">{online ? "Responding" : "Unreachable"}</div>
                <div className="sidecar-meta">
                  {status?.environment ?? "unknown environment"} · {status?.uptimeSeconds ? formatUptime(status.uptimeSeconds) : "no uptime"}
                </div>
              </div>
            </div>
            <Button
              variant={desktop ? "secondary" : "ghost"}
              icon="refresh"
              onClick={() => void restart()}
              disabled={!desktop || restarting}
              loading={restarting}
              title={desktop ? "Restart the managed backend sidecar" : "Available in the Tauri desktop build only"}
            >
              Restart sidecar
            </Button>
            <p className="field-hint">
              {desktop
                ? "Restart asks the Tauri shell to relaunch its managed backend. Health is re-checked immediately."
                : "Gateway restart is disabled in the web build. Run the backend process directly or use the desktop app."}
            </p>
            <div className="divider" />
            <Link className="panel-link" to="/settings">
              Connection & security settings <Icon name="arrow-right" />
            </Link>
          </div>
        </Panel>
      </div>

      <Panel>
        <PanelHeader
          kicker="Request path"
          title="What happens to a request"
          subtitle="The gateway is intentionally thin: enforce, proxy, meter, respond."
        />
        <div className="request-path">
          <PathStep index="01" icon="terminal" title="Client" copy="OpenAI-style request reaches /v1/chat/completions." />
          <PathConnector />
          <PathStep index="02" icon="gauge" title="Budget gate" copy="Daily and monthly limits are checked before any upstream call." />
          <PathConnector />
          <PathStep index="03" icon="plug" title="Provider adapter" copy="Model id resolves to a provider; the saved key stays in the OS keyring." />
          <PathConnector />
          <PathStep index="04" icon="database" title="Meter & log" copy="Tokens, latency, cost and status are persisted for these views." />
        </div>
      </Panel>

      <Panel className="gateway-get-started">
        <PanelHeader
          kicker="Desktop setup"
          title="Get started on your OS"
          subtitle="Install the desktop app, seal a provider key, set a limit, then route your tools through the local gateway."
          actions={
            <SegmentedControl<OsId>
              ariaLabel="Choose your operating system"
              value={os}
              onChange={setOs}
              options={[
                { value: "macos", label: "macOS" },
                { value: "windows", label: "Windows" },
                { value: "linux", label: "Linux" },
              ]}
            />
          }
        />
        <div className="panel-body">
          <div className="os-start-grid">
            <div className="os-start-card">
              <div className="os-install-row">
                <span className="os-mark" aria-hidden="true">{guide.label.slice(0, 3).toUpperCase()}</span>
                <div className="os-install-copy">
                  <strong>APICostGuard for {guide.label}</strong>
                  <span>{guide.installer}{status?.version ? ` · version ${status.version}` : ""}</span>
                </div>
                <a className="btn btn--sm" href={RELEASES_URL} target="_blank" rel="noreferrer">
                  Download <Icon name="external" />
                </a>
              </div>
              <ol className="os-steps">
                <li>
                  <span className="os-step-index">01</span>
                  <span><strong>Install and launch.</strong> The bundled gateway starts with the app, so the dashboard and proxy come up together.</span>
                </li>
                <li>
                  <span className="os-step-index">02</span>
                  <span><strong>Seal a provider key.</strong> Save it from <Link to="/api-keys">API Keys</Link>; it is written to {guide.keychain} and never returned.</span>
                </li>
                <li>
                  <span className="os-step-index">03</span>
                  <span><strong>Set a guardrail.</strong> Choose a monthly limit and alert threshold in <Link to="/budgets">Budgets &amp; Limits</Link>. The pre-request gate enforces it before any upstream call.</span>
                </li>
                <li>
                  <span className="os-step-index">04</span>
                  <span><strong>Allow notifications.</strong> In the desktop build, budget alerts use system notifications — allow APICostGuard in {guide.notifications}.</span>
                </li>
              </ol>
            </div>

            <div className="os-start-card os-start-card--command">
              <div className="os-command-head">
                <div>
                  <span className="os-command-kicker">Send your first request · {guide.label}</span>
                  <strong>{os === "windows" ? "PowerShell" : "Terminal"}</strong>
                </div>
                <CopyButton value={guide.command} label="Copy command" />
              </div>
              <div className="code-block">
                <pre>{guide.command}</pre>
                <CopyButton value={guide.command} />
              </div>
              <p className="recipe-note">
                <Icon name="info" size={12} /> The model id selects the provider automatically. Use <code>/proxy</code> when you need to pin an adapter. Provider keys never pass through this browser.
              </p>
            </div>
          </div>
        </div>
      </Panel>

      <div className="gateway-recipes">
        <Panel>
          <PanelHeader
            kicker="Recipe 01"
            title="Auto-routed completion"
            subtitle="Provider is inferred from the model id."
            actions={<CopyButton value={curlExample} label="Copy" />}
          />
          <div className="panel-body">
            <div className="code-block">
              <pre>{curlExample}</pre>
              <CopyButton value={curlExample} />
            </div>
            <p className="recipe-note">
              <Icon name="info" size={12} /> Auto-routing is currently available for gemini, gpt/o-series, claude, Groq llama ids and local llama models.
            </p>
          </div>
        </Panel>

        <Panel>
          <PanelHeader
            kicker="Recipe 02"
            title="Explicit provider route"
            subtitle="Choose the adapter yourself via /proxy."
            actions={<CopyButton value={PROXY_EXAMPLE} label="Copy" />}
          />
          <div className="panel-body">
            <div className="code-block">
              <pre>{PROXY_EXAMPLE}</pre>
              <CopyButton value={PROXY_EXAMPLE} />
            </div>
            <p className="recipe-note">
              <Icon name="info" size={12} /> Supported providers: gemini, openai, anthropic, openrouter, groq, ollama, lmstudio.
            </p>
          </div>
        </Panel>
      </div>

      <div className="gateway-bottom-grid">
        <Panel>
          <PanelHeader kicker="Surface" title="Endpoints" />
          <div className="endpoint-list">
            {[
              ["POST", "/v1/chat/completions", "OpenAI-compatible proxy with model detection"],
              ["POST", "/v1/generate", "Alias with the same request contract"],
              ["POST", "/proxy", "Explicit provider + model routing"],
              ["GET", "/health", "Public liveness and uptime"],
              ["GET", "/version", "Build version information"],
              ["GET", "/api/history", "Recorded request telemetry"],
            ].map(([method, path, description]) => (
              <div className="endpoint-row" key={path}>
                <span className={`method method--${method.toLowerCase()}`}>{method}</span>
                <code>{path}</code>
                <span className="endpoint-description">{description}</span>
              </div>
            ))}
          </div>
        </Panel>

        <Panel>
          <PanelHeader kicker="Boundaries" title="Operational limits" />
          <div className="limits-list">
            <LimitRow label="Request body" value="1 MiB maximum" />
            <LimitRow label="Messages" value="1–100 per request" />
            <LimitRow label="Prompt content" value="100,000 characters" />
            <LimitRow label="Server timeout" value="35 seconds" />
            <LimitRow label="Key storage" value="OS keyring, never returned" />
            <LimitRow label="Cost source" value="Upstream usage or local estimate" />
          </div>
        </Panel>
      </div>
    </>
  );
}

function PathStep({
  index,
  icon,
  title,
  copy,
}: {
  index: string;
  icon: "terminal" | "gauge" | "plug" | "database";
  title: string;
  copy: string;
}) {
  return (
    <div className="path-step">
      <div className="path-step-icon"><Icon name={icon} /></div>
      <div className="path-step-index mono">{index}</div>
      <div className="path-step-title">{title}</div>
      <p className="path-step-copy">{copy}</p>
    </div>
  );
}

function PathConnector() {
  return (
    <div className="path-connector" aria-hidden="true">
      <span />
      <Icon name="chevron-right" size={12} />
    </div>
  );
}

function LimitRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="limit-row">
      <span>{label}</span>
      <strong className="mono">{value}</strong>
    </div>
  );
}
