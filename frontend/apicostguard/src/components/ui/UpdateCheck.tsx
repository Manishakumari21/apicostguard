import { useState } from "react";
import {
  checkForUpdates,
  installUpdate,
  type UpdateCheckResult,
} from "../../services/updateService";
import { useAppInfo } from "../../hooks/useAppInfo";
import Button from "../common/Button";
import { AlertIcon, CheckIcon, DownloadIcon } from "./Icons";

interface UpdateCheckProps {
  compact?: boolean;
}

export default function UpdateCheck({ compact }: UpdateCheckProps) {
  const { data: appInfo } = useAppInfo();
  const [result, setResult] = useState<UpdateCheckResult | null>(null);
  const [checking, setChecking] = useState(false);
  const [installing, setInstalling] = useState(false);
  const [installError, setInstallError] = useState<string | null>(null);

  const runCheck = async () => {
    setChecking(true);
    setInstallError(null);
    setResult(null);
    try {
      setResult(await checkForUpdates());
    } finally {
      setChecking(false);
    }
  };

  const runInstall = async () => {
    const update = result?.update;
    if (!update) return;
    setInstalling(true);
    setInstallError(null);
    try {
      await installUpdate(update);
      setResult({ status: "installing", message: "Update installed — relaunch to apply." });
    } catch (err) {
      setInstallError(err instanceof Error ? err.message : "Install failed.");
    } finally {
      setInstalling(false);
    }
  };

  return (
    <div>
      <div className="flex items-center gap-3 flex-wrap">
        <span className="text-xs text-muted">Current version</span>
        <span className="font-mono text-sm font-semibold text-ink tabular-nums">
          v{appInfo?.version ?? "…"} {appInfo?.arch ? `(${appInfo.arch})` : ""}
        </span>
        <Button variant="secondary" size="sm" onClick={runCheck} disabled={checking || installing}>
          {checking ? "Checking…" : "Check for updates"}
        </Button>
      </div>

      {!compact && (
        <p className="text-[11px] text-faint mt-2 max-w-lg">
          APICostGuard checks GitHub Releases for installer updates. Until the first
          release is published, this will report that no update is available yet.
        </p>
      )}

      {result && !checking && (
        <div className="mt-3 space-y-2">
          <StatusLine result={result} installing={installing} />
          {result.status === "available" && result.update && (
            <div className="flex items-center gap-2">
              <Button size="sm" onClick={runInstall} disabled={installing}>
                <DownloadIcon className="w-3.5 h-3.5" />
                {installing ? "Installing…" : "Install Update"}
              </Button>
            </div>
          )}
          {(result.status === "unable" || result.status === "installing") &&
            result.message && (
              <p className="text-[11px] text-muted mt-1 leading-relaxed max-w-lg">
                {result.message}
              </p>
            )}
          {installError && (
            <p className="text-[11px] text-danger mt-1 leading-relaxed max-w-lg">
              {installError}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

function StatusLine({
  result,
  installing,
}: {
  result: UpdateCheckResult;
  installing: boolean;
}) {
  switch (result.status) {
    case "up-to-date":
      return (
        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-success">
          <CheckIcon className="w-3.5 h-3.5" /> You're up to date.
        </span>
      );
    case "available":
      return (
        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-accent">
          <AlertIcon className="w-3.5 h-3.5" /> Update available — {result.message}
        </span>
      );
    case "installing":
      return (
        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-accent">
          <DownloadIcon className="w-3.5 h-3.5" />{" "}
          {installing ? "Installing update…" : "Update installed — relaunch to apply."}
        </span>
      );
    case "checking":
      return <span className="text-xs text-muted">Checking…</span>;
    default:
      return (
        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-warning">
          <AlertIcon className="w-3.5 h-3.5" /> Unable to check for updates.
        </span>
      );
  }
}