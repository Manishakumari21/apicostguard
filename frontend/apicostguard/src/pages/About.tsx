import { useAppInfo } from "../hooks/useAppInfo";
import { GITHUB_ISSUES_URL, GITHUB_REPO_URL } from "../config/app";
import { openExternal } from "../services/external";
import Brand from "../components/common/Brand";
import Button from "../components/common/Button";
import Panel from "../components/ui/Panel";
import UpdateCheck from "../components/ui/UpdateCheck";
import DownloadSection from "../components/ui/DownloadSection";
import { ExternalLinkIcon, GitHubIcon } from "../components/ui/Icons";

export default function About() {
  const { data: appInfo } = useAppInfo();

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center gap-4">
        <Brand size="lg" showTagline />
      </div>

      <Panel title="About APICostGuard">
        <p className="text-sm text-muted leading-relaxed">
          APICostGuard sits as a local gateway between your AI-powered tools and AI
          providers. Every request passes through the gateway, which measures latency,
          counts tokens, calculates cost, and logs usage — all before returning the
          response.
        </p>

        <div className="rounded-lg border border-line/60 bg-card overflow-hidden mt-4">
          <InfoRow label="Version" value={appInfo?.version ? `v${appInfo.version}` : "…"} />
          <InfoRow label="Platform" value={appInfo?.platform ?? "…"} />
          <InfoRow label="Architecture" value={appInfo?.arch ?? "…"} />
          <InfoRow label="Frontend" value="React 19 + TypeScript" />
          <InfoRow label="Shell" value="Tauri 2 (Rust)" />
          <InfoRow label="Database" value="SQLite" />
          <InfoRow label="Privacy" value="100% local" />
        </div>
      </Panel>

      <Panel title="Safety & Privacy">
        <ul className="space-y-2 text-sm text-muted">
          <li><span className="font-semibold text-ink">Local only</span> — all data stays on this device; nothing is sent to third parties.</li>
          <li><span className="font-semibold text-ink">OS credential store</span> — API keys are held in your system keychain, not in plaintext storage.</li>
          <li><span className="font-semibold text-ink">Non-destructive</span> — disabling or removing a budget never deletes your request logs.</li>
          <li><span className="font-semibold text-ink">Respects provider limits</span> — weekly and monthly windows reflect real reset schedules (e.g., Monday resets).</li>
          <li><span className="font-semibold text-ink">Scoped budgets</span> — set limits for the whole gateway, per provider, or per project without exposing other data.</li>
        </ul>
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

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between px-3 py-2 border-b border-line/40 last:border-0">
      <span className="text-xs text-muted">{label}</span>
      <span className="text-xs font-medium text-ink">{value}</span>
    </div>
  );
}