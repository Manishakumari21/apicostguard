export default function About() {
  return (
    <div className="space-y-6 max-w-2xl">
      <h1 className="text-2xl font-bold text-ink">About</h1>

      <div className="p-6 rounded-xl bg-card/80 border border-line/50">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-success to-accent flex items-center justify-center">
            <span
              className="font-extrabold text-lg tracking-tight leading-none"
              style={{ color: "#ffffff", textShadow: "0 1px 3px rgba(31,29,46,0.6)" }}
            >
              AI
            </span>
          </div>
          <div>
            <h2 className="text-lg font-bold text-ink">APICostGuard</h2>
            <p className="text-sm text-muted">Monitor · Alert · Control</p>
          </div>
        </div>

        <p className="text-sm text-muted leading-relaxed">
          APICostGuard sits as a local gateway between your AI-powered tools and AI
          providers. Every request passes through the gateway, which measures latency,
          counts tokens, calculates cost, and logs usage — all before returning the
          response.
        </p>

        <div className="grid grid-cols-2 gap-3 mt-6">
          <InfoRow label="Version" value="v0.1.0" />
          <InfoRow label="Backend" value="Rust + Axum" />
          <InfoRow label="Frontend" value="React 19 + TypeScript" />
          <InfoRow label="Shell" value="Tauri 2" />
          <InfoRow label="Database" value="SQLite" />
          <InfoRow label="Privacy" value="100% local" />
        </div>
      </div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between px-3 py-2 rounded-lg bg-canvas/50">
      <span className="text-xs text-muted">{label}</span>
      <span className="text-xs font-medium text-ink">{value}</span>
    </div>
  );
}
