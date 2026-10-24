import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Badge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import { Dialog } from "../components/ui/Dialog";
import { Icon } from "../components/ui/Icon";
import { PageHeader } from "../components/ui/PageHeader";
import { Panel, PanelHeader } from "../components/ui/Panel";
import { SegmentedControl } from "../components/ui/SegmentedControl";
import { Switch } from "../components/ui/Switch";
import { Callout, ErrorState, SkeletonPanel } from "../components/ui/States";
import { usePreferences, type Density } from "../context/PreferencesContext";
import { useSystemStatus } from "../context/SystemStatusContext";
import { useToast } from "../context/ToastContext";
import { requestGlobalRefresh } from "../lib/useApiQuery";
import { formatNumber, formatRelative, formatUptime } from "../lib/format";
import { useApiQuery } from "../lib/useApiQuery";
import { API_BASE_URL, HAS_API_TOKEN, isTauriRuntime } from "../services/client";
import { clearRequestHistory, fetchSettings, updateBackendSettings } from "../services/api";
import type { ApiSettings } from "../services/types";

const LOG_LEVELS = ["trace", "debug", "info", "warn", "error"];

export default function SettingsPage() {
  const query = useApiQuery<ApiSettings>((signal) => fetchSettings(signal), []);
  const { notify } = useToast();
  const { status, checking, refreshStatus } = useSystemStatus();
  const { preferences, setPreference, resetPreferences } = usePreferences();

  const [logLevel, setLogLevel] = useState("info");
  const [channelSize, setChannelSize] = useState("1024");
  const [maxEvents, setMaxEvents] = useState("10000");
  const [monthly, setMonthly] = useState("100");
  const [daily, setDaily] = useState("10");
  const [weekly, setWeekly] = useState("40");
  const [threshold, setThreshold] = useState("80");
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [saveResult, setSaveResult] = useState<string | null>(null);
  const [confirmClear, setConfirmClear] = useState(false);
  const [clearing, setClearing] = useState(false);

  useEffect(() => {
    if (!query.data) return;
    setLogLevel(query.data.log_level);
    setChannelSize(String(query.data.channel_size));
    setMaxEvents(String(query.data.max_events));
    setMonthly(String(query.data.monthly_limit_usd));
    setDaily(String(query.data.daily_limit_usd));
    setWeekly(String(query.data.weekly_limit_usd));
    setThreshold(String(query.data.alert_threshold_percent));
  }, [query.data]);

  const save = async () => {
    setFormError(null);
    setSaveResult(null);
    const channelValue = Number(channelSize);
    const eventsValue = Number(maxEvents);
    const monthlyValue = Number(monthly);
    const dailyValue = Number(daily);
    const weeklyValue = Number(weekly);
    const thresholdValue = Number(threshold);

    if (!Number.isInteger(channelValue) || channelValue < 16) {
      setFormError("Channel size must be a whole number of at least 16.");
      return;
    }
    if (!Number.isInteger(eventsValue) || eventsValue < 100) {
      setFormError("Max events must be a whole number of at least 100.");
      return;
    }
    if (![monthlyValue, dailyValue, weeklyValue].every((value) => Number.isFinite(value) && value >= 0)) {
      setFormError("Budget defaults must be numbers at or above 0.");
      return;
    }
    if (!Number.isFinite(thresholdValue) || thresholdValue < 1 || thresholdValue > 100) {
      setFormError("Alert threshold must be between 1 and 100.");
      return;
    }

    setSaving(true);
    try {
      await updateBackendSettings({
        log_level: logLevel,
        channel_size: Math.round(channelValue),
        max_events: Math.round(eventsValue),
        monthly_limit_usd: monthlyValue,
        daily_limit_usd: dailyValue,
        weekly_limit_usd: weeklyValue,
        alert_threshold_percent: Math.round(thresholdValue),
      });
      setSaveResult("Runtime settings saved. Budget defaults now apply to the global guardrail used by the gateway.");
      notify({
        tone: "success",
        title: "Runtime settings saved",
        message: "The backend accepted the configuration update.",
      });
      query.reload();
      requestGlobalRefresh();
    } catch (error) {
      const message = error instanceof Error ? error.message : "The backend rejected the settings update.";
      setFormError(message);
      notify({ tone: "error", title: "Settings not saved", message });
    } finally {
      setSaving(false);
    }
  };

  const resetForm = () => {
    if (!query.data) return;
    setLogLevel(query.data.log_level);
    setChannelSize(String(query.data.channel_size));
    setMaxEvents(String(query.data.max_events));
    setMonthly(String(query.data.monthly_limit_usd));
    setDaily(String(query.data.daily_limit_usd));
    setWeekly(String(query.data.weekly_limit_usd));
    setThreshold(String(query.data.alert_threshold_percent));
    setFormError(null);
    setSaveResult(null);
  };

  const clearHistory = async () => {
    setClearing(true);
    try {
      const result = await clearRequestHistory();
      setConfirmClear(false);
      notify({
        tone: "success",
        title: "Request history cleared",
        message: `${formatNumber(result.deleted)} ${result.deleted === 1 ? "record" : "records"} deleted from the backend.`,
      });
      requestGlobalRefresh();
    } catch (error) {
      notify({
        tone: "error",
        title: "Could not clear history",
        message: error instanceof Error ? error.message : "The backend rejected the delete request.",
      });
    } finally {
      setClearing(false);
    }
  };

  const online = status?.online ?? false;
  const desktop = isTauriRuntime();

  return (
    <>
      <PageHeader
        index="11"
        label="Settings"
        title={
          <>
            Runtime, interface, <span className="accent">and the honest fine print.</span>
          </>
        }
        description="Configure the backend runtime, tune this browser's interface, and manage local telemetry. Secrets remain write-only and are never rendered here."
        actions={
          <>
            <Link className="btn" to="/gateway">
              <Icon name="route" /> Gateway
            </Link>
            <Link className="btn btn--primary" to="/budgets">
              <Icon name="gauge" /> Budgets
            </Link>
          </>
        }
      />

      <div className="settings-layout">
        <div className="settings-main">
          <Panel>
            <div className="settings-section">
              <div className="settings-section-head">
                <div className="settings-section-copy">
                  <div className="settings-section-title">Backend runtime</div>
                  <p className="settings-section-sub">
                    Values below are persisted by the backend through <code>POST /api/settings</code>. Budget defaults
                    here are the same source used by the global guardrail.
                  </p>
                </div>
                <Badge tone={online ? "success" : "danger"}>{online ? "Connected" : "Offline"}</Badge>
              </div>

              {query.loading && !query.data ? (
                <SkeletonPanel lines={4} />
              ) : query.error && !query.data ? (
                <ErrorState message={query.error} onRetry={query.reload} title="Runtime settings unavailable" />
              ) : (
                <div className="settings-form">
                  <div className="settings-field-grid">
                    <div className="field">
                      <label className="field-label" htmlFor="settings-log-level">
                        <span>Log level</span>
                        <span className="optional">backend</span>
                      </label>
                      <select
                        id="settings-log-level"
                        className="select"
                        value={logLevel}
                        onChange={(event) => setLogLevel(event.target.value)}
                      >
                        {LOG_LEVELS.map((level) => (
                          <option key={level} value={level}>{level}</option>
                        ))}
                      </select>
                      <p className="field-hint">Controls verbosity of the backend event stream.</p>
                    </div>
                    <div className="field">
                      <label className="field-label" htmlFor="settings-channel-size"><span>Channel size</span></label>
                      <input
                        id="settings-channel-size"
                        className="input"
                        type="number"
                        min={16}
                        step={1}
                        value={channelSize}
                        onChange={(event) => setChannelSize(event.target.value)}
                      />
                      <p className="field-hint">Capacity of the internal telemetry channel.</p>
                    </div>
                    <div className="field">
                      <label className="field-label" htmlFor="settings-max-events"><span>Max events</span></label>
                      <input
                        id="settings-max-events"
                        className="input"
                        type="number"
                        min={100}
                        step={1}
                        value={maxEvents}
                        onChange={(event) => setMaxEvents(event.target.value)}
                      />
                      <p className="field-hint">Upper bound for retained in-memory events.</p>
                    </div>
                    <div className="field">
                      <label className="field-label" htmlFor="settings-threshold">
                        <span>Alert threshold</span>
                        <span className="optional">1–100%</span>
                      </label>
                      <div className="input-row">
                        <input
                          id="settings-threshold"
                          className="input"
                          type="number"
                          min={1}
                          max={100}
                          value={threshold}
                          onChange={(event) => setThreshold(event.target.value)}
                        />
                        <span className="input-affix">%</span>
                      </div>
                      <p className="field-hint">Used for warning states across the dashboard.</p>
                    </div>
                  </div>

                  <div className="section-label">Global budget defaults</div>
                  <div className="settings-field-grid">
                    <BudgetField id="settings-monthly" label="Monthly limit" value={monthly} onChange={setMonthly} />
                    <BudgetField id="settings-daily" label="Daily limit" value={daily} onChange={setDaily} />
                    <BudgetField id="settings-weekly" label="Weekly limit" value={weekly} onChange={setWeekly} />
                    <div className="field">
                      <span className="field-label"><span>Why these are shared</span></span>
                      <p className="field-hint" style={{ marginTop: 4 }}>
                        The backend reads global budget limits from the same settings store. Editing them here is
                        equivalent to editing the global guardrail on the Budgets page.
                      </p>
                    </div>
                  </div>

                  {formError ? (
                    <div className="key-result key-result--error" role="alert">
                      <Icon name="alert" />
                      <span>{formError}</span>
                    </div>
                  ) : null}
                  {saveResult ? (
                    <div className="settings-save-result" role="status">
                      <Icon name="check" />
                      <span>{saveResult}</span>
                    </div>
                  ) : null}

                  <div className="settings-actions">
                    <Button variant="primary" icon="check" onClick={() => void save()} loading={saving}>
                      Save runtime settings
                    </Button>
                    <Button variant="ghost" icon="refresh" onClick={resetForm}>
                      Reset form
                    </Button>
                    <span className="field-hint">
                      Writes are confirmed by the backend before success is shown.
                    </span>
                  </div>
                </div>
              )}
            </div>
          </Panel>

          <Panel>
            <div className="settings-section">
              <div className="settings-section-head">
                <div className="settings-section-copy">
                  <div className="settings-section-title">Interface preferences</div>
                  <p className="settings-section-sub">
                    Stored only in this browser under <code>apicostguard.interface.v1</code>. They never change backend
                    behaviour.
                  </p>
                </div>
                <Button size="sm" variant="ghost" icon="refresh" onClick={resetPreferences}>
                  Reset
                </Button>
              </div>

              <div className="preference-list">
                <Switch
                  label="Ambient background"
                  description="Animated aurora and grid layers behind the control plane."
                  checked={preferences.ambient}
                  onChange={(value) => setPreference("ambient", value)}
                />
                <Switch
                  label="High contrast text"
                  description="Raises text and hairline contrast for bright rooms."
                  checked={preferences.highContrast}
                  onChange={(value) => setPreference("highContrast", value)}
                />
                <Switch
                  label="Reduce motion"
                  description="Disables non-essential transitions. Your OS preference is always respected in addition to this."
                  checked={preferences.reduceMotion}
                  onChange={(value) => setPreference("reduceMotion", value)}
                />
              </div>

              <div className="density-row">
                <div className="preference-copy">
                  <span className="preference-label">Density</span>
                  <span className="preference-description">Compact tightens panel radii for smaller screens.</span>
                </div>
                <SegmentedControl<Density>
                  value={preferences.density}
                  onChange={(value) => setPreference("density", value)}
                  ariaLabel="Interface density"
                  options={[
                    { value: "comfortable", label: "Comfortable" },
                    { value: "compact", label: "Compact" },
                  ]}
                />
              </div>
            </div>
          </Panel>

          <Panel>
            <div className="settings-section">
              <div className="settings-section-head">
                <div className="settings-section-copy">
                  <div className="settings-section-title">Data & privacy</div>
                  <p className="settings-section-sub">
                    Telemetry is stored locally by the backend. Prompt messages and provider responses are not persisted
                    by the history endpoint.
                  </p>
                </div>
                <Badge tone="cyan">Local-first</Badge>
              </div>

              <div className="connection-facts">
                <div className="connection-fact"><span>Stored per request</span><strong>provider, model, tokens, latency, cost, status, project</strong></div>
                <div className="connection-fact"><span>Not stored</span><strong>prompt messages, completions, api keys</strong></div>
                <div className="connection-fact"><span>History read cap</span><strong>1,000 most recent rows</strong></div>
                <div className="connection-fact"><span>Key storage</span><strong>OS keyring via backend</strong></div>
              </div>

              <div className="settings-divider" />

              <div className="settings-danger-zone">
                <div className="settings-danger-title">
                  <Icon name="alert" /> Delete all request history
                </div>
                <p className="settings-danger-copy">
                  Permanently removes stored usage logs. Budget settings, provider keys and runtime configuration are
                  unaffected. Aggregated views will drop to zero for historical periods.
                </p>
                <div>
                  <Button size="sm" variant="danger" icon="trash" onClick={() => setConfirmClear(true)}>
                    Clear request history
                  </Button>
                </div>
              </div>
            </div>
          </Panel>
        </div>

        <div className="settings-side">
          <Panel>
            <PanelHeader
              kicker="Connection"
              title="Gateway endpoint"
              subtitle="Health and build information from the live backend."
              actions={
                <Button size="sm" variant="ghost" icon="refresh" onClick={() => void refreshStatus()} loading={checking}>
                  Check
                </Button>
              }
            />
            <div className="panel-body">
              <div className="settings-identity">
                <span className="settings-identity-mark">
                  <Icon name="server" />
                </span>
                <div className="settings-identity-copy">
                  <strong>{online ? "Management API reachable" : "Management API unreachable"}</strong>
                  <span>{status?.endpoint ?? API_BASE_URL}</span>
                </div>
                <Badge tone={online ? "success" : "danger"}>{online ? "Online" : "Offline"}</Badge>
              </div>

              <div className="connection-facts" style={{ marginTop: 12 }}>
                <div className="connection-fact"><span>Environment</span><strong>{status?.environment ?? "unknown"}</strong></div>
                <div className="connection-fact"><span>Version</span><strong>{status?.version ? `v${status.version}` : "—"}</strong></div>
                <div className="connection-fact"><span>Uptime</span><strong>{formatUptime(status?.uptimeSeconds ?? null)}</strong></div>
                <div className="connection-fact"><span>Health latency</span><strong>{status?.latencyMs !== null && status?.latencyMs !== undefined ? `${status.latencyMs} ms` : "—"}</strong></div>
                <div className="connection-fact"><span>Last checked</span><strong>{status ? formatRelative(status.checkedAt) : "never"}</strong></div>
                <div className="connection-fact"><span>Auth mode</span><strong>{HAS_API_TOKEN ? "Bearer token" : "Local, no token"}</strong></div>
                <div className="connection-fact"><span>Runtime</span><strong>{desktop ? "Tauri desktop" : "Browser"}</strong></div>
              </div>

              {status?.error ? (
                <div className="key-result key-result--error" style={{ marginTop: 11 }} role="status">
                  <Icon name="alert" />
                  <span>{status.error}</span>
                </div>
              ) : null}
            </div>
          </Panel>

          <Panel>
            <PanelHeader
              kicker="Security"
              title="Boundaries"
              subtitle="What this interface can and cannot do."
            />
            <div className="panel-body">
              <div className="routing-notes">
                <div className="routing-note">
                  <Icon name="lock" />
                  <span>Provider keys are write-only: save, validate or delete. They are never read back into the page.</span>
                </div>
                <div className="routing-note">
                  <Icon name="shield" />
                  <span>Changing settings requires the backend to accept the write. The UI does not fake a successful save.</span>
                </div>
                <div className="routing-note">
                  <Icon name="info" />
                  <span>
                    {HAS_API_TOKEN
                      ? "A bearer token is compiled into this client bundle. Use it only on trusted single-user deployments."
                      : "No bearer token is configured. This is intended for local single-user use."}
                  </span>
                </div>
                <div className="routing-note">
                  <Icon name="alert" />
                  <span>Clearing history is irreversible. The backend returns the exact deleted count after completion.</span>
                </div>
              </div>
            </div>
          </Panel>

          <Panel>
            <PanelHeader kicker="About" title="APICostGuard" subtitle="Local-first spend control for AI gateways." />
            <div className="panel-body">
              <dl className="kv-list">
                <div className="kv-row"><dt>Build</dt><dd className="mono">{status?.version ? `v${status.version}` : "unknown"}</dd></div>
                <div className="kv-row"><dt>Product</dt><dd>Spend control plane</dd></div>
                <div className="kv-row"><dt>Storage</dt><dd>Local backend database</dd></div>
                <div className="kv-row"><dt>Sections</dt><dd>11</dd></div>
              </dl>
              <div className="divider" />
              <div className="routing-notes">
                <div className="routing-note">
                  <Icon name="info" />
                  <span>Every dashboard metric is derived from the backend or recorded request logs.</span>
                </div>
              </div>
            </div>
          </Panel>
        </div>
      </div>

      <Panel style={{ marginTop: 18 }}>
        <PanelHeader
          kicker="Honest limits"
          title="What settings cannot change"
          subtitle="Runtime configuration is not a policy editor for absent backend features."
        />
        <div className="panel-body">
          <div className="form-grid">
            <div className="routing-note">
              <Icon name="lock" />
              <span><strong>No routing changes.</strong> Model prefixes and fallback behaviour are compiled into the backend.</span>
            </div>
            <div className="routing-note">
              <Icon name="lock" />
              <span><strong>No secret disclosure.</strong> There is no endpoint to list stored provider keys or show their last use.</span>
            </div>
            <div className="routing-note">
              <Icon name="info" />
              <span><strong>No remote sync.</strong> Preferences are browser-local; telemetry is backend-local.</span>
            </div>
            <div className="routing-note">
              <Icon name="alert" />
              <span><strong>No undo for deletion.</strong> Clearing logs cannot be reversed from this interface.</span>
            </div>
          </div>
        </div>
      </Panel>

      <Dialog
        open={confirmClear}
        onClose={() => setConfirmClear(false)}
        title="Clear request history?"
        subtitle="This permanently deletes every usage log stored by the backend."
        footer={
          <>
            <Button variant="ghost" onClick={() => setConfirmClear(false)}>Cancel</Button>
            <Button variant="danger" icon="trash" onClick={() => void clearHistory()} loading={clearing}>
              Delete all logs
            </Button>
          </>
        }
      >
        <Callout tone="danger" title="This cannot be undone">
          Dashboard, analytics, usage and budget history will drop to zero for past periods. Provider keys, runtime
          settings and budget rows are not deleted.
        </Callout>
      </Dialog>

      {query.error && query.data ? (
        <div style={{ marginTop: 18 }}>
          <ErrorState message={query.error} onRetry={query.reload} title="Could not refresh settings — showing last values" />
        </div>
      ) : null}
    </>
  );
}

function BudgetField({
  id,
  label,
  value,
  onChange,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="field">
      <label className="field-label" htmlFor={id}><span>{label}</span><span className="optional">USD</span></label>
      <div className="input-row">
        <span className="input-affix">$</span>
        <input
          id={id}
          className="input"
          type="number"
          min={0}
          step="0.01"
          value={value}
          onChange={(event) => onChange(event.target.value)}
        />
      </div>
    </div>
  );
}
