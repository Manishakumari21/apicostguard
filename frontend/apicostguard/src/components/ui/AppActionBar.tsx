import { GITHUB_REPO_URL } from "../../config/app";
import type { AppInfo } from "../../types/domain";
import { openExternal } from "../../services/external";
import { DownloadIcon, ExternalLinkIcon, GitHubIcon } from "./Icons";

interface AppActionBarProps {
  info?: AppInfo | null;
  onDownload?: () => void;
}

export default function AppActionBar({ info, onDownload }: AppActionBarProps) {
  const version = info?.version ? `v${info.version}` : "";

  return (
    <div className="flex items-center gap-1.5">
      {version && (
        <span
          title="APICostGuard version"
          className="hidden md:inline-flex items-center rounded-lg px-2 py-1 font-mono text-[11px] font-semibold text-faint bg-canvas/60 border border-line/60 select-none"
        >
          {version}
        </span>
      )}

      <button
        onClick={() => void openExternal(GITHUB_REPO_URL)}
        title="Open the APICostGuard GitHub repository"
        aria-label="Open GitHub repository"
        className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-card border border-line/60 text-ink hover:border-line hover:bg-line/30 transition-all cursor-pointer"
      >
        <GitHubIcon className="w-3.5 h-3.5" />
        <span className="hidden sm:inline">GitHub</span>
        <ExternalLinkIcon className="w-3 h-3 opacity-60" />
      </button>

      <button
        onClick={onDownload}
        title="Download APICostGuard"
        aria-label="Download APICostGuard"
        className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-accent/15 text-accent border border-accent/30 hover:bg-accent/25 transition-all cursor-pointer"
      >
        <DownloadIcon className="w-3.5 h-3.5" />
        <span className="hidden sm:inline">Download</span>
      </button>
    </div>
  );
}