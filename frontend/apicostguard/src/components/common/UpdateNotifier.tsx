import { useEffect, useState } from "react";
import { checkForUpdates, installUpdate } from "../../services/updateService";
import type { Update } from "@tauri-apps/plugin-updater";
import { isTauri } from "../../services/tauri";
import Button from "./Button";

const LAST_CHECK_KEY = "acg-last-update-check";
const DISMISSED_KEY = "acg-dismissed-update";
const CHECK_EVERY_MS = 24 * 60 * 60 * 1000;

/** Background update notifier: once a day, ask the Tauri updater feed for new
 *  releases and show an in-app message with a one-click install. Silent when
 *  there is nothing new, offline, or not running in the desktop shell. */
export default function UpdateNotifier() {
  const [update, setUpdate] = useState<Update | null>(null);
  const [version, setVersion] = useState("");
  const [installing, setInstalling] = useState(false);
  const [done, setDone] = useState(false);
  const [failed, setFailed] = useState<string | null>(null);

  useEffect(() => {
    if (!isTauri()) return;
    const last = Number(localStorage.getItem(LAST_CHECK_KEY) ?? 0);
    if (Date.now() - last < CHECK_EVERY_MS) return;
    let alive = true;
    (async () => {
      try {
        const result = await checkForUpdates();
        if (!alive || result.status !== "available" || !result.update) return;
        localStorage.setItem(LAST_CHECK_KEY, String(Date.now()));
        if (localStorage.getItem(DISMISSED_KEY) === result.availableVersion) return;
        setUpdate(result.update);
        setVersion(result.availableVersion ?? "");
      } catch {
        // Offline or no feed yet — stay silent, manual check still works.
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  if (!update && !done) return null;

  function dismiss() {
    if (version) localStorage.setItem(DISMISSED_KEY, version);
    setUpdate(null);
  }

  async function install() {
    if (!update) return;
    setInstalling(true);
    setFailed(null);
    try {
      await installUpdate(update);
      setDone(true);
      setUpdate(null);
    } catch (err) {
      setFailed(err instanceof Error ? err.message : "Install failed.");
    } finally {
      setInstalling(false);
    }
  }

  return (
    <div className="fixed bottom-4 left-4 z-50 w-[22rem] rounded-2xl bg-card/95 backdrop-blur-md shadow-[var(--shadow-pop)] ring-1 ring-accent/30 p-3.5" role="alert">
      {done ? (
        <p className="text-xs text-ink">Update installed — restart the app to apply it.</p>
      ) : (
        <>
          <p className="text-sm font-bold text-ink">Update available — v{version}</p>
          <p className="text-xs text-muted mt-0.5">A new APICostGuard release is ready to install.</p>
          {failed && <p className="text-[11px] text-danger mt-1">{failed}</p>}
          <div className="flex gap-2 mt-2.5">
            <Button size="sm" onClick={install} disabled={installing}>
              {installing ? "Installing…" : "Install update"}
            </Button>
            <Button size="sm" variant="secondary" onClick={dismiss} disabled={installing}>
              Later
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
