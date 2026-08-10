import { useProviderAggregates } from "../hooks/useMonitor";
import { useSettings } from "../context/SettingsContext";
import { PROVIDERS } from "../utils/constants";
import { formatCost, formatTokens } from "../utils/formatter";

export default function Models() {
  const aggregates = useProviderAggregates();
  const { connectedProviders } = useSettings();

  const byId = new Map(aggregates.map((a) => [a.name.toLowerCase(), a]));

  const isConnected = (p: (typeof PROVIDERS)[number]) =>
    connectedProviders.some(
      (c) => c.toLowerCase() === p.id || c.toLowerCase() === p.name.toLowerCase()
    );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-ink">Models</h1>
        <p className="text-sm text-muted mt-0.5">
          Cost and usage per provider, from every tracked request.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {PROVIDERS.map((p) => {
          const agg = byId.get(p.id.toLowerCase());
          const connected = isConnected(p);
          return (
            <div key={p.name} className="card p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <span
                    className="w-10 h-10 rounded-xl flex items-center justify-center text-lg shrink-0"
                    style={{
                      backgroundColor: `${p.color}18`,
                      border: `1px solid ${p.color}30`,
                    }}
                  >
                    {p.icon}
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-ink">{p.name}</p>
                    <p className="text-[10px] uppercase tracking-wider text-faint">
                      {p.kind}
                    </p>
                  </div>
                </div>
                <span
                  className={`px-2 py-0.5 text-[10px] font-semibold rounded-full border shrink-0 ${
                    agg && agg.requests > 0
                      ? "text-success border-success/30 bg-success/10"
                      : connected
                        ? "text-accent border-accent/30 bg-accent/10"
                        : "text-faint border-line"
                  }`}
                >
                  {agg && agg.requests > 0
                    ? "Active"
                    : connected
                      ? "Connected"
                      : "Idle"}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3 mt-4">
                <Metric label="API Status" value={agg && agg.requests > 0 ? "Online" : "Idle"} color="#22c55e" />
                <Metric label="Monthly Cost" value={formatCost(agg?.monthCost ?? 0)} color="#22d3ee" />
                <Metric label="Today's Cost" value={formatCost(agg?.todayCost ?? 0)} color="#67e8f9" />
                <Metric label="Models Used" value={(agg?.models.length ?? 0).toString()} color="#8b5cf6" />
              </div>

              {agg && agg.models.length > 0 && (
                <div className="mt-4 pt-3 border-t border-line/50">
                  <p className="text-[10px] uppercase tracking-wider text-faint mb-2">
                    Models
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {agg.models.map((m) => (
                      <span
                        key={m}
                        className="px-2 py-0.5 text-[10px] rounded-md bg-canvas/60 border border-line text-muted"
                      >
                        {m}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {agg && agg.requests > 0 && (
                <p className="text-[11px] text-faint mt-3">
                  {agg.requests} requests · {formatTokens(agg.tokens)} tokens
                </p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Metric({
  label,
  value,
  color,
}: {
  label: string;
  value: string;
  color: string;
}) {
  return (
    <div className="rounded-xl bg-canvas/50 border border-line/50 px-3 py-2.5">
      <p className="text-[10px] text-faint mb-0.5">{label}</p>
      <p className="text-sm font-semibold tabular-nums" style={{ color }}>
        {value}
      </p>
    </div>
  );
}
