import { useState } from "react";
import {
  deleteBudget,
  getBudgets,
  getProjects,
  saveBudget,
} from "../services/budgetService";
import { getProviderOverviews } from "../services/providerService";
import { useGatewayQuery } from "../hooks/useGatewayQuery";
import { formatCost } from "../utils/format";
import type { ApiBudgetRecord } from "../types/api";
import PageHeader from "../components/ui/PageHeader";
import DataState from "../components/ui/DataState";
import CapacityGauge from "../components/ui/CapacityGauge";
import Button from "../components/common/Button";
import Modal from "../components/common/Modal";

type Tab = "you" | "providers" | "projects";

const SCOPE_LABELS: Record<string, string> = {
  global: "Global",
  provider: "Provider",
  project: "Project",
};

const shortDate = (iso: string) =>
  new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });

function remainingPct(limit: number, spend: number): number {
  if (limit <= 0) return 100;
  return Math.max(0, Math.min(100, (1 - spend / limit) * 100));
}

function recordRunout(spend: number, limit: number): string | null {
  if (limit <= 0) return null;
  const remaining = Math.max(0, limit - spend);
  if (remaining <= 0) return "today";
  const now = new Date();
  const daysElapsed = Math.max(1, now.getDate());
  const dailyAvg = spend / daysElapsed;
  if (dailyAvg <= 0) return null;
  const d = new Date(now);
  d.setDate(d.getDate() + Math.floor(remaining / dailyAvg));
  if (d.getMonth() > now.getMonth()) return null;
  return shortDate(d.toISOString());
}

function recordCard(record: ApiBudgetRecord) {
  const title =
    record.scope === "provider"
      ? record.name !== "default"
        ? record.name
        : record.scope_id ?? "Provider budget"
      : record.scope === "project"
        ? record.name !== "default"
          ? record.name
          : record.scope_id ?? "Project budget"
        : "Global budget";
  return {
    id: record.id,
    title,
    limit: record.monthly_limit_usd,
    spend: record.current_spend_usd,
    spendLabel: formatCost(record.current_spend_usd),
    limitLabel: formatCost(record.monthly_limit_usd),
    remainingPtr: remainingPct(record.monthly_limit_usd, record.current_spend_usd),
    runout: recordRunout(record.current_spend_usd, record.monthly_limit_usd),
    scopeKind: record.scope as string,
    scopeId: record.scope_id,
    name: record.name,
  };
}

export default function Budgets() {
  const { data, error, loading, refetch } = useGatewayQuery(() => getBudgets(), ["budgets"], 15000);
  const { data: providersData, refetch: refetchProviders } = useGatewayQuery(
    () => getProviderOverviews(),
    ["budgets-providers"],
    15000
  );
  const { data: projectsData, refetch: refetchProjects } = useGatewayQuery(
    () => getProjects(),
    ["budgets-projects"],
    30000
  );
  const [tab, setTab] = useState<Tab>("you");
  const [editOpen, setEditOpen] = useState(false);
  const [scopeKind, setScopeKind] = useState<"global" | "provider" | "project">("global");
  const [scopeId, setScopeId] = useState<string>("");
  const [scopeName, setScopeName] = useState<string>("");
  const [monthlyLimit, setMonthlyLimit] = useState("");
  const [weeklyLimit, setWeeklyLimit] = useState("");
  const [dailyLimit, setDailyLimit] = useState("");
  const [threshold, setThreshold] = useState("80");
  const [editingRecord, setEditingRecord] = useState<ApiBudgetRecord | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [saveMsg, setSaveMsg] = useState<string | null>(null);

  const budget = data?.current;
  const records = data?.records ?? [];
  const providers = providersData ?? [];
  const projects = projectsData ?? [];

  const providerRecords = records.filter((r) => r.scope === "provider");
  const projectRecords = records.filter((r) => r.scope === "project");

  const providerWithoutBudget = providers.filter(
    (p) => !providerRecords.some((r) => r.scope_id === p.id)
  );
  const projectsWithoutBudget = projects.filter(
    (p) => !projectRecords.some((r) => r.scope_id === p.id)
  );

  function closeModal() {
    setEditOpen(false);
    setEditingRecord(null);
    setScopeKind("global");
    setScopeId("");
    setScopeName("");
    setMonthlyLimit("");
    setWeeklyLimit("");
    setDailyLimit("");
    setThreshold("80");
    setSaveMsg(null);
  }

  function openGlobal() {
    setEditingRecord(null);
    setScopeKind("global");
    setMonthlyLimit(budget ? String(budget.monthlyLimit || 0) : "");
    setWeeklyLimit(budget ? String(budget.weeklyLimit || 0) : "");
    setDailyLimit(budget ? String(budget.dailyLimit || 0) : "");
    setThreshold(budget ? String(budget.threshold || 80) : "80");
    setSaveMsg(null);
    setEditOpen(true);
  }

  function openAdd(kind: "provider" | "project", id: string, name: string) {
    setEditingRecord(null);
    setScopeKind(kind);
    setScopeId(id);
    setScopeName(name);
    setMonthlyLimit("");
    setDailyLimit("");
    setWeeklyLimit("");
    setThreshold("80");
    setSaveMsg(null);
    setEditOpen(true);
  }

  function openRecord(record: ApiBudgetRecord) {
    setEditingRecord(record);
    setScopeKind(record.scope === "project" ? "project" : record.scope === "provider" ? "provider" : "global");
    setScopeId(record.scope_id ?? "");
    setScopeName(record.name);
    setMonthlyLimit(String(record.monthly_limit_usd || 0));
    setThreshold(String(record.alert_threshold_percent || 80));
    setDailyLimit("");
    setWeeklyLimit("");
    setSaveMsg(null);
    setEditOpen(true);
  }

  function fullRefetch() {
    refetch();
    refetchProviders();
    refetchProjects();
  }

  const handleSave = async () => {
    setSaving(true);
    setSaveMsg(null);
    try {
      if (editingRecord) {
        await saveBudget({
          monthly_limit_usd: parseFloat(monthlyLimit) || 0,
          alert_threshold_percent: parseFloat(threshold) || 80,
          name: editingRecord.name === "default" ? undefined : editingRecord.name,
          scope: scopeKind === "global" ? { kind: "global" } : { kind: scopeKind, id: scopeId },
        });
      } else {
        await saveBudget({
          monthly_limit_usd: parseFloat(monthlyLimit) || 0,
          daily_limit_usd: scopeKind === "global" ? parseFloat(dailyLimit) || 0 : undefined,
          weekly_limit_usd: scopeKind === "global" ? parseFloat(weeklyLimit) || 0 : undefined,
          alert_threshold_percent: parseFloat(threshold) || 80,
          name:
            scopeKind === "global"
              ? undefined
              : scopeName
                ? scopeName
                : (scopeId.charAt(0).toUpperCase() + scopeId.slice(1)).replace(/-/g, " "),
          scope: scopeKind === "global" ? { kind: "global" } : { kind: scopeKind, id: scopeId },
        });
      }
      closeModal();
      fullRefetch();
    } catch (err) {
      setSaveMsg(err instanceof Error ? err.message : String(err));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!editingRecord) return;
    setDeleting(true);
    setSaveMsg(null);
    try {
      await deleteBudget(editingRecord.id);
      closeModal();
      fullRefetch();
    } catch (err) {
      setSaveMsg(err instanceof Error ? err.message : String(err));
    } finally {
      setDeleting(false);
    }
  };

  const resetLabel = budget ? new Date(new Date(budget.weekStart).getTime() + 7 * 86400000) : null;

  const weeksFooter = budget
    ? budget.weeklyLimit > 0
      ? `${formatCost(budget.weekSpend)} / ${formatCost(budget.weeklyLimit)} this week · resets ${resetLabel ? shortDate(resetLabel.toISOString()) : ""}`
      : `weekly window ${resetLabel ? `resets ${shortDate(resetLabel.toISOString())}` : ""}`
    : "";

  const tabs: { id: Tab; label: string }[] = [
    { id: "you", label: "You" },
    { id: "providers", label: "Providers" },
    { id: "projects", label: "Projects" },
  ];

  return (
    <div>
      <PageHeader
        title="Budgets"
        description="Capacity at a glance — remaining budget, resets, and when you run out."
        actions={
          <Button size="sm" variant="secondary" onClick={openGlobal}>
            Edit budget
          </Button>
        }
      />

      <div className="flex gap-1.5 mb-4">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-3 py-1.5 text-xs rounded-lg border transition-colors ${
              tab === t.id
                ? "bg-ink text-canvas border-ink font-semibold"
                : "bg-card text-muted border-line hover:border-line"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <DataState loading={loading} error={error} hasData={!!budget} onRetry={fullRefetch}>
        {budget && tab === "you" && (
          <div className="max-w-md">
            <CapacityGauge
              title="You · Global budget"
              remainingPercent={budget.remainingPercent}
              spent={budget.currentSpend}
              limit={budget.monthlyLimit}
              runoutLabel={budget.projectedRunoutDate ?? undefined}
              footer={weeksFooter}
              onClick={openGlobal}
            />
          </div>
        )}

        {tab === "providers" && (
          <>
            {providerRecords.length === 0 && providerWithoutBudget.length === 0 && (
              <p className="text-sm text-muted py-8 text-center">
                No provider budgets yet. Add one below.
              </p>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {providerRecords.map((r) => {
                const card = recordCard(r);
                return (
                  <CapacityGauge
                    key={r.id}
                    title={card.title}
                    remainingPercent={card.remainingPtr}
                    spent={card.spend}
                    limit={card.limit}
                    runoutLabel={card.runout}
                    onClick={() => openRecord(r)}
                  />
                );
              })}
            </div>
            {providerWithoutBudget.length > 0 && (
              <div className="mt-6">
                <h3 className="text-xs font-semibold text-muted mb-2">Add budgets for</h3>
                <div className="flex flex-wrap gap-2">
                  {providerWithoutBudget.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => openAdd("provider", p.id, p.name)}
                      className="px-3 py-1.5 text-xs rounded-lg bg-card hover:bg-line text-ink border border-line transition-colors"
                    >
                      + {p.name}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        {tab === "projects" && (
          <>
            {projectRecords.length === 0 && projectsWithoutBudget.length === 0 && (
              <p className="text-sm text-muted py-8 text-center">
                No project budgets yet. Add one below.
              </p>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {projectRecords.map((r) => {
                const card = recordCard(r);
                return (
                  <CapacityGauge
                    key={r.id}
                    title={card.title}
                    remainingPercent={card.remainingPtr}
                    spent={card.spend}
                    limit={card.limit}
                    runoutLabel={card.runout}
                    onClick={() => openRecord(r)}
                  />
                );
              })}
            </div>
            {projectsWithoutBudget.length > 0 && (
              <div className="mt-6">
                <h3 className="text-xs font-semibold text-muted mb-2">Add budgets for</h3>
                <div className="flex flex-wrap gap-2">
                  {projectsWithoutBudget.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => openAdd("project", p.id, p.name)}
                      className="px-3 py-1.5 text-xs rounded-lg bg-card hover:bg-line text-ink border border-line transition-colors"
                    >
                      + {p.name}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </DataState>

      <Modal
        open={editOpen}
        onClose={closeModal}
        title={
          editingRecord
            ? `Edit ${SCOPE_LABELS[editingRecord.scope] ?? "budget"} budget`
            : scopeKind === "global"
              ? "Edit budget"
              : `Add ${SCOPE_LABELS[scopeKind] ?? ""} budget`
        }
      >
        <div className="space-y-3">
          {!editingRecord && scopeKind !== "global" && (
            <label className="block">
              <span className="label text-xs">Scope</span>
              <select
                value={scopeKind}
                onChange={(e) => {
                  const next = e.target.value as "global" | "provider" | "project";
                  setScopeKind(next);
                  setScopeId("");
                  setScopeName("");
                }}
                className="input"
              >
                <option value="global">Global</option>
                <option value="provider">Provider</option>
                <option value="project">Project</option>
              </select>
            </label>
          )}
          {!editingRecord && scopeKind === "provider" && (
            <label className="block">
              <span className="label text-xs">Provider</span>
              <select value={scopeId} onChange={(e) => setScopeId(e.target.value)} className="input">
                <option value="">Select provider…</option>
                {providers.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </label>
          )}
          {!editingRecord && scopeKind === "project" && (
            <label className="block">
              <span className="label text-xs">Project</span>
              <select value={scopeId} onChange={(e) => setScopeId(e.target.value)} className="input">
                <option value="">Select project…</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </label>
          )}
          <label className="block">
            <span className="label text-xs">Monthly limit (USD)</span>
            <input
              type="number"
              min="0"
              step="0.01"
              value={monthlyLimit}
              onChange={(e) => setMonthlyLimit(e.target.value)}
              className="input"
            />
          </label>
          {scopeKind === "global" && !editingRecord && (
            <>
              <label className="block">
                <span className="label text-xs">Weekly limit (USD)</span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={weeklyLimit}
                  onChange={(e) => setWeeklyLimit(e.target.value)}
                  className="input"
                />
              </label>
              <label className="block">
                <span className="label text-xs">Daily limit (USD)</span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={dailyLimit}
                  onChange={(e) => setDailyLimit(e.target.value)}
                  className="input"
                />
              </label>
            </>
          )}
          <label className="block">
            <span className="label text-xs">Alert threshold (%)</span>
            <input
              type="number"
              min="1"
              max="100"
              value={threshold}
              onChange={(e) => setThreshold(e.target.value)}
              className="input"
            />
          </label>
          {saveMsg && <p className="text-xs text-danger">{saveMsg}</p>}
          <div className="flex justify-end gap-2 pt-2">
            {editingRecord && editingRecord.scope !== "global" && (
              <Button
                size="sm"
                variant="danger"
                onClick={handleDelete}
                disabled={deleting}
                className="mr-auto"
              >
                {deleting ? "Deleting…" : "Delete"}
              </Button>
            )}
            <Button variant="secondary" size="sm" onClick={closeModal}>
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleSave}
              disabled={saving || (scopeKind !== "global" && !scopeId && !editingRecord)}
            >
              {saving ? "Saving…" : "Save budget"}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}