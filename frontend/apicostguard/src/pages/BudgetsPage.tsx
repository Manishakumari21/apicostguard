import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Badge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import { Dialog } from "../components/ui/Dialog";
import { Icon } from "../components/ui/Icon";
import { PageHeader } from "../components/ui/PageHeader";
import { Panel, PanelHeader } from "../components/ui/Panel";
import { EmptyState, ErrorState, SkeletonPanel } from "../components/ui/States";
import { useToast } from "../context/ToastContext";
import {
  daysInCurrentMonth,
  dayOfCurrentMonth,
  projectionFromPace,
  spendState,
  toBudgetSnapshot,
} from "../lib/budget";
import { formatDate, formatMoney, formatNumber, formatPercent } from "../lib/format";
import { providerMeta } from "../lib/providers";
import { useApiQuery } from "../lib/useApiQuery";
import {
  deleteBudget,
  fetchAnalytics,
  fetchBudget,
  fetchBudgetRecords,
  fetchDailySummary,
  fetchProviders,
  fetchSettings,
  saveBudget,
} from "../services/api";
import type {
  ApiAnalytics,
  ApiBudget,
  ApiBudgetRecord,
  ApiDailySummary,
  ApiProviderInfo,
  ApiSettings,
} from "../services/types";

type ScopeKind = "provider" | "project";

interface BudgetData {
  budget: ApiBudget;
  records: ApiBudgetRecord[];
  settings: ApiSettings;
  daily: ApiDailySummary;
  analytics: ApiAnalytics;
  providers: ApiProviderInfo[];
}

const PRESETS = [25, 50, 100, 250, 500];

export default function BudgetsPage() {
  const { notify } = useToast();
  const query = useApiQuery<BudgetData>(async (signal) => {
    const [budget, records, settings, daily, analytics, providers] = await Promise.all([
      fetchBudget(signal),
      fetchBudgetRecords(signal),
      fetchSettings(signal),
      fetchDailySummary(signal),
      fetchAnalytics(signal),
      fetchProviders(signal),
    ]);
    return { budget, records, settings, daily, analytics, providers };
  }, []);

  const [monthly, setMonthly] = useState("");
  const [daily, setDaily] = useState("");
  const [weekly, setWeekly] = useState("");
  const [threshold, setThreshold] = useState("80");
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [saveResult, setSaveResult] = useState<string | null>(null);

  const [scopeName, setScopeName] = useState("");
  const [scopeKind, setScopeKind] = useState<ScopeKind>("provider");
  const [scopeId, setScopeId] = useState("");
  const [scopeLimit, setScopeLimit] = useState("");
  const [scopeThreshold, setScopeThreshold] = useState("80");
  const [scopeSaving, setScopeSaving] = useState(false);
  const [scopeError, setScopeError] = useState<string | null>(null);

  const [pendingDelete, setPendingDelete] = useState<ApiBudgetRecord | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!query.data) return;
    setMonthly(String(query.data.budget.monthly_limit || ""));
    setDaily(String(query.data.budget.daily_limit || ""));
    setWeekly(String(query.data.budget.weekly_limit || ""));
    setThreshold(String(query.data.settings.alert_threshold_percent || 80));
  }, [query.data]);

  const model = useMemo(() => {
    if (!query.data) return null;
    const budget = toBudgetSnapshot(query.data.budget, query.data.settings, query.data.daily.today_cost);
    const projection = projectionFromPace(budget.currentSpend, dayOfCurrentMonth(), daysInCurrentMonth());
    const state = spendState(budget.usedPercent, budget.threshold);
    const scoped = query.data.records.filter((record) => record.id !== "default");
    const globalRecord = query.data.records.find((record) => record.id === "default");
    return { budget, projection, state, scoped, globalRecord };
  }, [query.data]);

  const projectOptions = useMemo(
    () =>
      (query.data?.analytics.projects ?? [])
        .map((project) => project.project_id)
        .filter((value): value is string => Boolean(value)),
    [query.data]
  );

  const scopeOptions = scopeKind === "provider" ? (query.data?.providers ?? []).map((item) => item.id) : projectOptions;

  const saveGlobal = async () => {
    setFormError(null);
    setSaveResult(null);
    const monthlyValue = Number(monthly);
    const dailyValue = Number(daily);
    const weeklyValue = weekly.trim() === "" ? 0 : Number(weekly);
    const thresholdValue = Number(threshold);

    if (!Number.isFinite(monthlyValue) || monthlyValue < 0) {
      setFormError("Monthly limit must be a number at or above 0.");
      return;
    }
    if (!Number.isFinite(dailyValue) || dailyValue < 0) {
      setFormError("Daily limit must be a number at or above 0.");
      return;
    }
    if (!Number.isFinite(weeklyValue) || weeklyValue < 0) {
      setFormError("Weekly limit must be a number at or above 0.");
      return;
    }
    if (!Number.isFinite(thresholdValue) || thresholdValue < 1 || thresholdValue > 100) {
      setFormError("Alert threshold must be between 1 and 100.");
      return;
    }

    setSaving(true);
    try {
      await saveBudget({
        monthly_limit_usd: monthlyValue,
        daily_limit_usd: dailyValue,
        weekly_limit_usd: weeklyValue,
        alert_threshold_percent: Math.round(thresholdValue),
        name: "Global guardrail",
        scope: { kind: "global" },
      });
      setSaveResult("Global guardrail saved. The backend now uses these limits when enforcing requests.");
      notify({
        tone: "success",
        title: "Guardrail saved",
        message: "Monthly, daily and weekly limits were accepted by the backend.",
      });
      query.reload();
    } catch (error) {
      const message = error instanceof Error ? error.message : "The backend rejected the guardrail update.";
      setFormError(message);
      notify({ tone: "error", title: "Could not save guardrail", message });
    } finally {
      setSaving(false);
    }
  };

  const saveScoped = async () => {
    setScopeError(null);
    const limitValue = Number(scopeLimit);
    const thresholdValue = Number(scopeThreshold);
    const id = scopeId.trim();

    if (!id) {
      setScopeError(`Enter a ${scopeKind} identifier.`);
      return;
    }
    if (!Number.isFinite(limitValue) || limitValue <= 0) {
      setScopeError("Scoped monthly limit must be greater than 0.");
      return;
    }
    if (!Number.isFinite(thresholdValue) || thresholdValue < 1 || thresholdValue > 100) {
      setScopeError("Alert threshold must be between 1 and 100.");
      return;
    }

    setScopeSaving(true);
    try {
      await saveBudget({
        monthly_limit_usd: limitValue,
        alert_threshold_percent: Math.round(thresholdValue),
        name: scopeName.trim() || `${scopeKind}: ${id}`,
        scope: { kind: scopeKind, id },
      });
      setScopeLimit("");
      setScopeName("");
      setScopeError(null);
      notify({
        tone: "success",
        title: "Scoped budget saved",
        message: `${scopeKind === "provider" ? providerMeta(id).name : id} now has a monthly limit of ${formatMoney(limitValue)}.`,
      });
      query.reload();
    } catch (error) {
      const message = error instanceof Error ? error.message : "The backend rejected the scoped budget.";
      setScopeError(message);
      notify({ tone: "error", title: "Could not save scoped budget", message });
    } finally {
      setScopeSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!pendingDelete) return;
    setDeleting(true);
    try {
      const result = await deleteBudget(pendingDelete.id);
      if (!result.deleted) throw new Error("The backend did not confirm deletion.");
      notify({
        tone: "warning",
        title: "Scoped budget deleted",
        message: `${pendingDelete.name} is no longer stored as a budget record.`,
      });
      setPendingDelete(null);
      query.reload();
    } catch (error) {
      notify({
        tone: "error",
        title: "Could not delete budget",
        message: error instanceof Error ? error.message : "The backend rejected the request.",
      });
    } finally {
      setDeleting(false);
    }
  };

  const header = (
    <PageHeader
      index="09"
      label="Budgets & Limits"
      title={
        <>
          Guardrails that <span className="accent">stop spend before it starts.</span>
        </>
      }
      description="Global and scoped monthly limits stored by the backend. Global limits are enforced before every gateway request; scoped records attribute spend by provider or project."
      actions={
        <>
          <Link className="btn" to="/usage">
            <Icon name="chart" /> Cost detail
          </Link>
          <Link className="btn btn--primary" to="/settings">
            <Icon name="sliders" /> Runtime settings
          </Link>
        </>
      }
    />
  );

  if (query.loading && !query.data) {
    return (
      <>
        {header}
        <div className="grid-2">
          <SkeletonPanel lines={4} />
          <SkeletonPanel lines={4} />
        </div>
      </>
    );
  }

  if (query.error && !query.data) {
    return (
      <>
        {header}
        <ErrorState
          message={query.error}
          detail={query.rawError instanceof Error ? query.rawError.message : undefined}
          onRetry={query.reload}
          title="Budget data unavailable"
        />
      </>
    );
  }

  if (!query.data || !model) return null;

  const { budget } = model;
  const hasBudget = budget.monthlyLimit > 0;
  const stateTone = model.state === "calm" ? "success" : model.state === "watch" ? "warning" : "danger";
  const monthlyPercent = hasBudget ? Math.min(100, budget.usedPercent) : 0;
  const dailyPercent = budget.dailyLimit > 0 ? Math.min(100, (query.data.daily.today_cost / budget.dailyLimit) * 100) : 0;
  const weeklyPercent = budget.weeklyLimit > 0 ? Math.min(100, (budget.weekSpend / budget.weeklyLimit) * 100) : 0;

  return (
    <>
      {header}

      <div className="budgets-hero-grid">
        <Panel className="budget-hero-panel" feature glow>
          <div className="budget-hero-top">
            <div>
              <div className="eyebrow">
                <span className="dot" aria-hidden="true" /> Current cycle · {budget.month}
              </div>
              <div className="budget-hero-value">
                {formatMoney(budget.currentSpend)}
                <span>of {hasBudget ? formatMoney(budget.monthlyLimit) : "no monthly limit"}</span>
              </div>
              <div className="budget-hero-meta">
                <Badge tone={stateTone}>
                  {model.state === "calm" ? "Within guardrail" : model.state === "watch" ? "Alert threshold reached" : "Limit reached"}
                </Badge>
                <span>{hasBudget ? `${formatPercent(monthlyPercent)} used` : "Requests are not capped by a monthly limit"}</span>
                <span className="dot-sep" />
                <span>{formatMoney(budget.remaining)} remaining</span>
              </div>
            </div>
            <Link className="btn btn--sm" to="/logs">
              <Icon name="list" /> Inspect usage
            </Link>
          </div>

          <div>
            <div className="progress" style={{ height: 8 }}>
              <span
                style={{
                  width: `${Math.max(monthlyPercent, budget.currentSpend > 0 ? 1.5 : 0)}%`,
                  background:
                    model.state === "critical"
                      ? "linear-gradient(135deg, #ff9bb0 0%, #f26d8c 100%)"
                      : model.state === "watch"
                        ? "linear-gradient(135deg, #f7d794 0%, #e9a85d 100%)"
                        : undefined,
                }}
              />
            </div>
            <div className="usage-pace-meta">
              <span>Projected month-end at current pace</span>
              <span className="mono">{formatMoney(model.projection)}</span>
            </div>
          </div>

          <div className="budget-meter-grid">
            <BudgetMeter
              label="Monthly"
              spend={budget.currentSpend}
              limit={budget.monthlyLimit}
              percent={monthlyPercent}
              caption={hasBudget ? "hard stop before upstream calls" : "no hard stop configured"}
            />
            <BudgetMeter
              label="Today"
              spend={query.data.daily.today_cost}
              limit={budget.dailyLimit}
              percent={dailyPercent}
              caption={budget.dailyLimit > 0 ? "resets at UTC midnight" : "daily cap disabled"}
            />
            <BudgetMeter
              label="This week"
              spend={budget.weekSpend}
              limit={budget.weeklyLimit}
              percent={weeklyPercent}
              caption={budget.weeklyLimit > 0 ? `week starts ${formatDate(budget.weekStart)}` : "weekly cap disabled"}
            />
          </div>

          <div className="budget-gate-strip">
            <span className="budget-gate-icon" aria-hidden="true">
              <Icon name="shield" />
            </span>
            <div className="budget-gate-copy">
              <strong>Pre-request budget gate</strong>
              <span>Global limits are evaluated before upstream calls. Scoped records never change enforcement.</span>
            </div>
            <Link className="budget-gate-link" to="/settings">Runtime settings</Link>
          </div>
        </Panel>

        <Panel>
          <PanelHeader
            kicker="Global guardrail"
            title="Set the hard stop"
            subtitle="These values are written to runtime settings and used by the gateway budget gate."
          />
          <div className="budget-form-panel">
            <div className="budget-presets" aria-label="Monthly limit presets">
              {PRESETS.map((value) => (
                <button key={value} type="button" className="preset-chip" onClick={() => setMonthly(String(value))}>
                  ${value}
                </button>
              ))}
            </div>
            <div className="budget-form">
              <div className="settings-field-grid">
                <NumberField
                  id="budget-monthly"
                  label="Monthly limit"
                  value={monthly}
                  onChange={setMonthly}
                  hint="0 disables the monthly hard stop."
                  prefix="$"
                />
                <NumberField
                  id="budget-daily"
                  label="Daily limit"
                  value={daily}
                  onChange={setDaily}
                  hint="0 disables the daily guardrail."
                  prefix="$"
                />
                <NumberField
                  id="budget-weekly"
                  label="Weekly limit"
                  value={weekly}
                  onChange={setWeekly}
                  hint="Optional weekly ceiling."
                  prefix="$"
                />
                <div className="field">
                  <label className="field-label" htmlFor="budget-threshold">
                    <span>Alert threshold</span>
                    <span className="optional">1–100%</span>
                  </label>
                  <div className="input-row">
                    <input
                      id="budget-threshold"
                      className="input"
                      type="number"
                      min={1}
                      max={100}
                      value={threshold}
                      onChange={(event) => setThreshold(event.target.value)}
                    />
                    <span className="input-affix">%</span>
                  </div>
                  <p className="field-hint">Used for warning states and notifications.</p>
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

              <div className="budget-actions">
                <Button variant="primary" icon="shield" onClick={() => void saveGlobal()} loading={saving}>
                  Save guardrail
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => {
                    if (!query.data) return;
                    setMonthly(String(query.data.budget.monthly_limit || ""));
                    setDaily(String(query.data.budget.daily_limit || ""));
                    setWeekly(String(query.data.budget.weekly_limit || ""));
                    setThreshold(String(query.data.settings.alert_threshold_percent || 80));
                    setFormError(null);
                    setSaveResult(null);
                  }}
                >
                  Reset
                </Button>
              </div>
            </div>
          </div>
        </Panel>
      </div>

      {query.data.records.length === 0 ? (
        <Panel style={{ marginBottom: 18 }}>
          <EmptyState
            icon="gauge"
            title="No budget records stored"
            copy="The backend is using its default settings. Save a global guardrail above to create the first persisted record."
          />
        </Panel>
      ) : null}

      <div className="budgets-lower-grid">
        <Panel>
          <PanelHeader
            kicker="Records"
            title="Budget inventory"
            subtitle="Stored budget rows returned by the backend. Spend is recalculated for the current month."
            actions={<Badge tone="violet">{model.scoped.length} scoped</Badge>}
          />
          <div className="table-shell">
            <table className="data-table budget-table">
              <caption className="sr-only">Stored budget records</caption>
              <thead>
                <tr>
                  <th scope="col">Scope</th>
                  <th scope="col" className="cell-right">Monthly limit</th>
                  <th scope="col">Month spend</th>
                  <th scope="col" className="cell-right">Alert</th>
                  <th scope="col" className="cell-right">Updated</th>
                  <th scope="col" className="cell-actions"><span className="sr-only">Actions</span></th>
                </tr>
              </thead>
              <tbody>
                {query.data.records.map((record) => {
                  const isGlobal = record.id === "default";
                  const percent =
                    record.monthly_limit_usd > 0
                      ? Math.min(100, (record.current_spend_usd / record.monthly_limit_usd) * 100)
                      : 0;
                  return (
                    <tr key={record.id}>
                      <td>
                        <span className="budget-scope">
                          <span className="budget-scope-icon">
                            {isGlobal ? <Icon name="shield" /> : record.scope === "provider" ? <Icon name="plug" /> : <Icon name="layers" />}
                          </span>
                          <span className="budget-scope-copy">
                            <span>{record.name}</span>
                            <small>{isGlobal ? "global · default" : `${record.scope}${record.scope_id ? ` · ${record.scope_id}` : ""}`}</small>
                          </span>
                        </span>
                      </td>
                      <td className="cell-right cell-mono">{formatMoney(record.monthly_limit_usd)}</td>
                      <td>
                        <span className="budget-usage-cell">
                          <span className="progress progress--thin">
                            <span style={{ width: `${Math.max(percent, record.current_spend_usd > 0 ? 1.5 : 0)}%` }} />
                          </span>
                          <span className="mono">{formatMoney(record.current_spend_usd)} · {formatPercent(percent, { digits: 0 })}</span>
                        </span>
                      </td>
                      <td className="cell-right cell-mono">{record.alert_threshold_percent}%</td>
                      <td className="cell-right cell-mono faint">{formatDate(record.updated_at)}</td>
                      <td className="cell-actions">
                        {isGlobal ? (
                          <Badge tone="violet">Global</Badge>
                        ) : (
                          <button
                            type="button"
                            className="icon-button is-danger"
                            onClick={() => setPendingDelete(record)}
                            aria-label={`Delete ${record.name} budget`}
                            title="Delete scoped budget"
                          >
                            <Icon name="trash" />
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="table-footer">
            <span>{formatNumber(query.data.records.length)} records · {formatNumber(model.scoped.length)} deletable</span>
            <span>Global record cannot be deleted</span>
          </div>
        </Panel>

        <div className="usage-side-stack">
          <Panel>
            <PanelHeader
              kicker="Scoped limit"
              title="Add attribution budget"
              subtitle="Scoped budgets track provider or project spend. They do not replace the global hard stop."
            />
            <div className="budget-form-panel">
              <div className="budget-record-form">
                <div className="field">
                  <label className="field-label" htmlFor="scope-kind"><span>Scope type</span></label>
                  <select
                    id="scope-kind"
                    className="select"
                    value={scopeKind}
                    onChange={(event) => {
                      setScopeKind(event.target.value as ScopeKind);
                      setScopeId("");
                    }}
                  >
                    <option value="provider">Provider</option>
                    <option value="project">Project</option>
                  </select>
                </div>

                <div className="field">
                  <label className="field-label" htmlFor="scope-id">
                    <span>{scopeKind === "provider" ? "Provider" : "Project id"}</span>
                    <span className="optional">required</span>
                  </label>
                  {scopeOptions.length > 0 ? (
                    <select id="scope-id" className="select" value={scopeId} onChange={(event) => setScopeId(event.target.value)}>
                      <option value="">Choose {scopeKind === "provider" ? "a provider" : "a project"}…</option>
                      {scopeKind === "provider"
                        ? (query.data.providers ?? []).map((provider) => (
                            <option key={provider.id} value={provider.id}>{provider.name}</option>
                          ))
                        : projectOptions.map((project) => (
                            <option key={project} value={project}>{project}</option>
                          ))}
                    </select>
                  ) : (
                    <input
                      id="scope-id"
                      className="input"
                      value={scopeId}
                      onChange={(event) => setScopeId(event.target.value)}
                      placeholder={scopeKind === "provider" ? "e.g. openai" : "e.g. research-agent"}
                    />
                  )}
                  <p className="field-hint">
                    {scopeOptions.length === 0
                      ? "No identifiers recorded yet. Enter one manually; the backend will still persist the record."
                      : `Options come from ${scopeKind === "provider" ? "the provider catalogue" : "recorded project attribution"}.`}
                  </p>
                </div>

                <div className="settings-field-grid">
                  <NumberField
                    id="scope-limit"
                    label="Monthly limit"
                    value={scopeLimit}
                    onChange={setScopeLimit}
                    hint="Must be above 0."
                    prefix="$"
                  />
                  <div className="field">
                    <label className="field-label" htmlFor="scope-threshold"><span>Alert threshold</span></label>
                    <div className="input-row">
                      <input
                        id="scope-threshold"
                        className="input"
                        type="number"
                        min={1}
                        max={100}
                        value={scopeThreshold}
                        onChange={(event) => setScopeThreshold(event.target.value)}
                      />
                      <span className="input-affix">%</span>
                    </div>
                  </div>
                </div>

                <div className="field">
                  <label className="field-label" htmlFor="scope-name"><span>Label</span><span className="optional">optional</span></label>
                  <input
                    id="scope-name"
                    className="input"
                    value={scopeName}
                    onChange={(event) => setScopeName(event.target.value)}
                    placeholder="e.g. Research providers"
                  />
                </div>

                {scopeError ? (
                  <div className="key-result key-result--error" role="alert">
                    <Icon name="alert" />
                    <span>{scopeError}</span>
                  </div>
                ) : null}

                <Button variant="accent" icon="plus" onClick={() => void saveScoped()} loading={scopeSaving} block>
                  Add scoped budget
                </Button>

                <div className="budget-record-note">
                  <Icon name="info" />
                  <span>
                    Scoped budgets persist a monthly limit and threshold only. The backend does not apply daily or weekly
                    limits to provider/project scopes.
                  </span>
                </div>
              </div>
            </div>
          </Panel>

          <Panel>
            <PanelHeader kicker="Enforcement" title="What the gateway checks" />
            <div className="panel-body">
              <div className="routing-notes">
                <div className="routing-note">
                  <Icon name="shield" />
                  <span>Before an upstream call, the gateway compares monthly and daily spend against the global limits.</span>
                </div>
                <div className="routing-note">
                  <Icon name="alert" />
                  <span>When a limit is met, the request is refused and recorded as blocked. No provider charge should occur.</span>
                </div>
                <div className="routing-note">
                  <Icon name="info" />
                  <span>Changing a global guardrail also updates the runtime settings endpoint, so both views stay aligned.</span>
                </div>
              </div>
            </div>
          </Panel>
        </div>
      </div>

      <Panel style={{ marginTop: 18 }}>
        <PanelHeader
          kicker="Boundaries"
          title="Budget semantics worth knowing"
          subtitle="The UI does not mask these backend behaviours."
        />
        <div className="panel-body">
          <div className="budget-guardrail-note" style={{ marginBottom: 12 }}>
            <Icon name="alert" />
            <span>
              A scoped budget is a reporting and attribution record. Enforcement uses the <strong>global</strong> limits;
              scoped limits are not consulted by the pre-request budget gate.
            </span>
          </div>
          <div className="form-grid">
            <div className="routing-note">
              <Icon name="check" />
              <span><strong>Zero means disabled.</strong> A monthly or daily limit of 0 removes that hard stop.</span>
            </div>
            <div className="routing-note">
              <Icon name="check" />
              <span><strong>UTC boundaries.</strong> Daily and weekly windows reset in UTC, not the browser timezone.</span>
            </div>
            <div className="routing-note">
              <Icon name="check" />
              <span><strong>Cost is estimated when needed.</strong> The ledger uses upstream usage when available and local rates otherwise.</span>
            </div>
            <div className="routing-note">
              <Icon name="info" />
              <span><strong>No overdraft buffer.</strong> Spend already at or above the limit blocks the next request immediately.</span>
            </div>
          </div>
        </div>
      </Panel>

      <Dialog
        open={Boolean(pendingDelete)}
        onClose={() => setPendingDelete(null)}
        title="Delete scoped budget?"
        subtitle={pendingDelete ? `${pendingDelete.name} · ${pendingDelete.scope}${pendingDelete.scope_id ? `: ${pendingDelete.scope_id}` : ""}` : undefined}
        footer={
          <>
            <Button variant="ghost" onClick={() => setPendingDelete(null)}>Cancel</Button>
            <Button variant="danger" icon="trash" onClick={() => void confirmDelete()} loading={deleting}>
              Delete record
            </Button>
          </>
        }
      >
        <p className="muted" style={{ fontSize: 11.5, lineHeight: 1.6 }}>
          This removes the stored scoped budget row. Usage logs, global limits, provider keys and runtime settings are
          unaffected.
        </p>
      </Dialog>
    </>
  );
}

function BudgetMeter({
  label,
  spend,
  limit,
  percent,
  caption,
}: {
  label: string;
  spend: number;
  limit: number;
  percent: number;
  caption: string;
}) {
  return (
    <div className="budget-meter-card">
      <div className="budget-meter-card-head">
        <span>{label}</span>
        <strong>{formatMoney(spend)} / {limit > 0 ? formatMoney(limit) : "no limit"}</strong>
      </div>
      <div className={`progress progress--thin${percent >= 100 ? " progress--danger" : percent >= 80 ? " progress--warning" : ""}`}>
        <span style={{ width: `${Math.max(limit > 0 ? percent : 0, spend > 0 && limit > 0 ? 1.5 : 0)}%` }} />
      </div>
      <span className="field-hint">{caption}</span>
    </div>
  );
}

function NumberField({
  id,
  label,
  value,
  onChange,
  hint,
  prefix,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  hint: string;
  prefix: string;
}) {
  return (
    <div className="field">
      <label className="field-label" htmlFor={id}><span>{label}</span></label>
      <div className="input-row">
        <span className="input-affix">{prefix}</span>
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
      <p className="field-hint">{hint}</p>
    </div>
  );
}
