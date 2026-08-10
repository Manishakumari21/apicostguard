import { useEffect, useState } from "react";
import { getServers, type ServerStatus } from "../services/monitor";

export default function AIApps() {
  const [servers, setServers] = useState<ServerStatus[]>([]);

  useEffect(() => {
    let stopped = false;
    async function load() {
      const data = await getServers();
      if (!stopped) setServers(data);
    }
    load();
    const timer = setInterval(load, 5000);
    return () => {
      stopped = true;
      clearInterval(timer);
    };
  }, []);

  const running = servers.filter((s) => s.connected);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-ink">Local Models</h1>
      <p className="text-sm text-muted">
        APICostGuard monitors local AI servers on this machine — 100% offline,
        nothing leaves your laptop.
      </p>

      {running.length === 0 && (
        <div className="p-4 rounded-xl bg-card/80 border border-line/50 text-sm text-muted">
          No local AI server detected. Start{" "}
          <span className="text-success font-medium">Ollama</span> (port 11434) or{" "}
          <span className="text-success font-medium">LM Studio</span> (port 1234)
          and it will be tracked automatically.
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {servers.map((server) => (
          <div
            key={server.id}
            className="p-4 rounded-xl bg-card/80 border border-line/50"
          >
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <span
                  className={`w-2.5 h-2.5 rounded-full ${
                    server.connected
                      ? "bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.5)]"
                      : "bg-line"
                  }`}
                />
                <div>
                  <p className="text-sm font-semibold text-ink">{server.name}</p>
                  <p className="text-xs text-faint">{server.baseUrl}</p>
                </div>
              </div>
              <span
                className={`px-2.5 py-0.5 text-xs font-semibold rounded-full border ${
                  server.connected
                    ? "text-success border-success/30 bg-success/10"
                    : "text-muted border-line/60"
                }`}
              >
                {server.connected ? "Detected" : "Offline"}
              </span>
            </div>

            <div className="mt-3">
              {server.runningModels.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {server.runningModels.map((model) => (
                    <span
                      key={model}
                      className="px-2 py-1 text-xs rounded-lg bg-canvas/50 border border-line/50 text-muted"
                    >
                      {model}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-faint">
                  {server.connected ? "No model currently loaded" : "Server not running"}
                </p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
