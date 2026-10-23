import { useMemo, useState } from "react";
import { getAlerts } from "../services/alertService";
import { useGatewayQuery } from "../hooks/useGatewayQuery";
import type { AlertSeverity } from "../types/domain";
import PageHeader from "../components/ui/PageHeader";
import AlertCard from "../components/ui/AlertCard";
import FilterBar from "../components/ui/FilterBar";
import DataState from "../components/ui/DataState";

export default function Alerts() {
  const [severity, setSeverity] = useState<"all" | AlertSeverity>("all");
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  const { data, error, loading, refetch } = useGatewayQuery(() => getAlerts(), ["alerts"], 20000);

  const alerts = useMemo(
    () => (data ?? []).filter((a) => !dismissed.has(a.id)),
    [data, dismissed]
  );

  const visible = alerts.filter((a) => severity === "all" || a.severity === severity);
  const countBy = useMemo(() => {
    const c = { critical: 0, warning: 0, info: 0 };
    for (const a of alerts) c[a.severity] += 1;
    return c;
  }, [alerts]);

  const dismiss = (id: string) =>
    setDismissed((prev) => new Set(prev).add(id));

  return (
    <div>
      <PageHeader
        title="Alerts"
        description="Budget, cost, latency, provider, and gateway alerts."
      />

      <div className="space-y-3">
        <FilterBar
          filters={[
            {
              key: "severity",
              label: "Severity",
              value: severity,
              onChange: (_k, v) => setSeverity(v as "all" | AlertSeverity),
              options: [
                { value: "all", label: `All (${alerts.length})` },
                { value: "critical", label: `Critical (${countBy.critical})` },
                { value: "warning", label: `Warning (${countBy.warning})` },
                { value: "info", label: `Info (${countBy.info})` },
              ],
            },
          ]}
          onReset={() => {
            setSeverity("all");
            setDismissed(new Set());
          }}
          resultCount={visible.length}
        />

        <DataState
          loading={loading}
          error={error}
          hasData={alerts.length > 0}
          onRetry={refetch}
          emptyTitle="All clear"
          emptyDescription="No alerts detected. Budget, cost, latency, and provider health are within limits."
        >
          <div className="space-y-2">
            {visible.map((a) => (
              <AlertCard key={a.id} alert={a} onMarkRead={dismiss} />
            ))}
          </div>
        </DataState>
      </div>
    </div>
  );
}