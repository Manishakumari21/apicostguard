import { useMemo, useState } from "react";
import { getRequestHistory, clearRequestHistory } from "../services/requestService";
import { useGatewayQuery } from "../hooks/useGatewayQuery";
import type { RequestLog } from "../types/domain";
import PageHeader from "../components/ui/PageHeader";
import Panel from "../components/ui/Panel";
import FilterBar from "../components/ui/FilterBar";
import DataState from "../components/ui/DataState";
import RequestTable from "../components/ui/RequestTable";
import RequestDetail from "../components/ui/RequestDetail";
import Modal from "../components/common/Modal";
import Button from "../components/common/Button";

type StatusFilter = "all" | "success" | "error" | "blocked";

export default function Requests() {
  const [provider, setProvider] = useState("all");
  const [model, setModel] = useState("all");
  const [project, setProject] = useState("all");
  const [status, setStatus] = useState<StatusFilter>("all");
  const [query, setQuery] = useState("");
  const [detailLog, setDetailLog] = useState<RequestLog | null>(null);
  const [confirmClear, setConfirmClear] = useState(false);
  const [clearing, setClearing] = useState(false);

  const { data, error, loading, refetch } = useGatewayQuery(
    () => getRequestHistory(1000),
    ["requests"],
    15000
  );

  const logs = data ?? [];

  const providers = useMemo(
    () => Array.from(new Set(logs.map((l) => l.provider))).sort(),
    [logs]
  );
  const models = useMemo(
    () => Array.from(new Set(logs.map((l) => l.model))).sort(),
    [logs]
  );
  const projects = useMemo(
    () => Array.from(new Set(logs.filter((l) => l.projectId).map((l) => l.projectId!))).sort(),
    [logs]
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return logs.filter((l) => {
      if (provider !== "all" && l.provider !== provider) return false;
      if (model !== "all" && l.model !== model) return false;
      if (project !== "all" && (l.projectId ?? "unattributed") !== project) return false;
      if (status !== "all" && l.status !== status) return false;
      if (q && !l.model.toLowerCase().includes(q) && !l.provider.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [logs, provider, model, project, status, query]);

  const handleFilterChange = (key: string, value: string) => {
    if (key === "provider") setProvider(value);
    if (key === "model") setModel(value);
    if (key === "project") setProject(value);
    if (key === "status") setStatus(value as StatusFilter);
  };

  const resetFilters = () => {
    setProvider("all");
    setModel("all");
    setProject("all");
    setStatus("all");
    setQuery("");
  };

  const handleClear = async () => {
    setClearing(true);
    try {
      await clearRequestHistory();
      setConfirmClear(false);
      refetch();
    } finally {
      setClearing(false);
    }
  };

  return (
    <div>
      <PageHeader
        title="Request History"
        description="Every request routed through the gateway, with filters and per-request detail."
        actions={
          <Button variant="danger" size="sm" onClick={() => setConfirmClear(true)} disabled={logs.length === 0}>
            Clear history
          </Button>
        }
      />

      <div className="space-y-3">
        <FilterBar
          search={{ value: query, onChange: setQuery, placeholder: "Search model or provider…" }}
          filters={[
            {
              key: "status",
              label: "Status",
              value: status,
              onChange: handleFilterChange,
              options: [
                { value: "all", label: "All" },
                { value: "success", label: "Success" },
                { value: "error", label: "Error" },
                { value: "blocked", label: "Blocked" },
              ],
            },
            {
              key: "provider",
              label: "Provider",
              value: provider,
              onChange: handleFilterChange,
              options: [
                { value: "all", label: "All" },
                ...providers.map((p) => ({ value: p, label: p })),
              ],
            },
            {
              key: "model",
              label: "Model",
              value: model,
              onChange: handleFilterChange,
              options: [
                { value: "all", label: "All" },
                ...models.map((m) => ({ value: m, label: m })),
              ],
            },
            {
              key: "project",
              label: "Project",
              value: project,
              onChange: handleFilterChange,
              options: [
                { value: "all", label: "All" },
                ...projects.map((p) => ({ value: p, label: p })),
              ],
            },
          ]}
          onReset={resetFilters}
          resultCount={filtered.length}
        />

        <Panel pad={false}>
          <DataState
            loading={loading}
            error={error}
            hasData={logs.length > 0}
            onRetry={refetch}
            emptyTitle="No requests recorded"
            emptyDescription="Requests appear here as soon as the gateway routes them."
          >
            <div className="p-4">
              <RequestTable logs={filtered} onSelect={setDetailLog} maxHeight="max-h-[calc(100vh-320px)]" />
            </div>
          </DataState>
        </Panel>
      </div>

      {detailLog && <RequestDetail log={detailLog} onClose={() => setDetailLog(null)} />}

      <Modal open={confirmClear} onClose={() => setConfirmClear(false)} title="Clear request history">
        <p className="text-sm text-ink mb-4">
          This permanently deletes all recorded requests from the gateway database. This cannot be undone.
        </p>
        <div className="flex justify-end gap-2">
          <Button variant="secondary" size="sm" onClick={() => setConfirmClear(false)}>
            Cancel
          </Button>
          <Button variant="danger" size="sm" onClick={handleClear} disabled={clearing}>
            {clearing ? "Clearing…" : "Delete everything"}
          </Button>
        </div>
      </Modal>
    </div>
  );
}