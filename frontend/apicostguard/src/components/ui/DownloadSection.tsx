import { useEffect, useState } from "react";
import { GITHUB_RELEASES_URL } from "../../config/app";
import { useAppInfo } from "../../hooks/useAppInfo";
import { openExternal } from "../../services/external";
import { fetchLatestRelease, type LatestRelease } from "../../services/releases";
import { palette } from "../../utils/palette";
import Button from "../common/Button";
import { DownloadIcon, ExternalLinkIcon, GitHubIcon } from "./Icons";

interface PlatformSpec {
  id: "windows" | "macos" | "linux";
  label: string;
  icon: string;
  format: string;
}

const PLATFORMS: PlatformSpec[] = [
  { id: "windows", label: "Windows", icon: "🪟", format: ".exe / .msi" },
  { id: "macos", label: "macOS", icon: "🍎", format: ".dmg / .app" },
  { id: "linux", label: "Linux", icon: "🐧", format: ".deb / .AppImage" },
];

const ICON_BG: Record<string, string> = {
  windows: palette.info,
  macos: palette.pink,
  linux: palette.warning,
};

export default function DownloadSection() {
  const { data: appInfo } = useAppInfo();
  const currentPlatform = appInfo?.platform ?? "unknown";

  const [release, setRelease] = useState<LatestRelease | null>(null);
  const [releasesMiss, setReleasesMiss] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    fetchLatestRelease().then((r) => {
      if (cancelled) return;
      setRelease(r);
      setReleasesMiss(r === null);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const assetFor = (id: string) =>
    release?.assets.find((a) => a.platform === id) ?? null;

  if (releasesMiss) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-muted">
          No public releases have been published yet. Once the first release is
          out, installers for Windows, macOS, and Linux will be available here
          and through in-app updates.
        </p>
        <div className="rounded-xl border border-line/70 bg-card p-5">
          <p className="text-[10px] uppercase tracking-widest text-muted">Latest release</p>
          <p className="text-lg font-bold text-ink mt-1">No public releases yet</p>
          <div className="mt-3">
            <Button variant="secondary" size="md" onClick={() => void openExternal(GITHUB_RELEASES_URL)}>
              <GitHubIcon />
              View GitHub Releases
              <ExternalLinkIcon className="w-3 h-3 opacity-60" />
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="rounded-xl border border-accent/25 bg-accent/8 p-5">
        <p className="text-[10px] uppercase tracking-widest text-muted">Latest release</p>
        <p className="text-xl font-bold text-ink mt-1">
          v{release?.version ?? "…"} <span className="text-sm font-normal text-muted">{release?.name}</span>
        </p>
        {release?.publishedAt && (
          <p className="text-xs text-muted mt-1">
            Published {new Date(release.publishedAt).toLocaleDateString()}
          </p>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {PLATFORMS.map((p) => {
          const asset = assetFor(p.id);
          const isCurrent = p.id === currentPlatform;
          return (
            <div
              key={p.id}
              className={`rounded-xl border p-4 flex flex-col gap-3 transition-colors duration-200 ${
                isCurrent ? "border-accent/40 bg-accent/8" : "border-line/70 bg-card"
              }`}
            >
              <div className="flex items-center gap-2.5">
                <span
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-base"
                  style={{
                    backgroundColor: `${ICON_BG[p.id]}1f`,
                    border: `1px solid ${ICON_BG[p.id]}33`,
                  }}
                >
                  {p.icon}
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-ink">{p.label}</p>
                  <p className="text-[10px] font-mono text-faint truncate">
                    {asset?.name ?? p.format}
                  </p>
                </div>
              </div>
              <div className="mt-auto space-y-2">
                <Button
                  size="md"
                  variant={isCurrent ? "primary" : "secondary"}
                  className="w-full"
                  disabled={!asset}
                  onClick={() => asset && void openExternal(asset.url)}
                >
                  <DownloadIcon className="w-3.5 h-3.5" />
                  {asset ? "Download" : "Not built yet"}
                </Button>
                {isCurrent && (
                  <p className="text-[10px] text-center text-accent font-medium">
                    Your system
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {release && release.assets.length === 0 && !loading && (
        <p className="text-xs text-muted">
          This release doesn't include installers yet — <a
            className="text-accent hover:underline cursor-pointer"
            href={GITHUB_RELEASES_URL}
            onClick={(e) => {
              e.preventDefault();
              void openExternal(GITHUB_RELEASES_URL);
            }}
          >
            view it on GitHub
          </a>.
        </p>
      )}
    </div>
  );
}