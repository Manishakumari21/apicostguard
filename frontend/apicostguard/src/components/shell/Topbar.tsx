import { useEffect, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { navItemForPath } from "../../config/navigation";
import { useSystemStatus } from "../../context/SystemStatusContext";
import { requestGlobalRefresh } from "../../lib/useApiQuery";
import { Icon } from "../ui/Icon";

export function Topbar({
  onOpenNav,
  onOpenPalette,
}: {
  onOpenNav: () => void;
  onOpenPalette: () => void;
}) {
  const location = useLocation();
  const item = navItemForPath(location.pathname);
  const { status, checking, refreshStatus } = useSystemStatus();
  const [syncing, setSyncing] = useState(false);
  const timer = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (timer.current) window.clearTimeout(timer.current);
    };
  }, []);

  const online = status?.online ?? false;
  const statusClass = checking && !status ? "is-checking" : online ? "is-live" : "is-down";
  const statusText = checking && !status ? "Checking" : online ? "Live" : "Offline";

  const sync = () => {
    setSyncing(true);
    requestGlobalRefresh();
    void refreshStatus();
    if (timer.current) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setSyncing(false), 850);
  };

  return (
    <header className="topbar">
      <button type="button" className="icon-button mobile-menu" onClick={onOpenNav} aria-label="Open navigation">
        <Icon name="menu" />
      </button>

      <nav className="crumb" aria-label="Breadcrumb">
        <Link to="/">Control</Link>
        <span className="sep">/</span>
        <span className="crumb-current">
          {item ? `${item.index} ${item.label}` : "Unknown coordinate"}
        </span>
      </nav>

      <span className="topbar-spacer" />

      <button type="button" className="command-trigger" onClick={onOpenPalette} aria-label="Jump to a section" aria-keyshortcuts="Meta+K Control+K">
        <Icon name="search" />
        <span>Jump to a section</span>
        <kbd className="shortcut">⌘K</kbd>
      </button>

      <div className={`topbar-status ${statusClass}`} title={status?.error ?? "Backend health"}>
        <span className="signal" aria-hidden="true" />
        <span>{statusText}</span>
      </div>

      <button
        type="button"
        className={`icon-button${syncing ? " is-spinning" : ""}`}
        onClick={sync}
        aria-label="Refresh all data"
        title="Refresh all data"
      >
        <Icon name="refresh" />
      </button>

      <Link
        to="/showcase"
        className="specular-btn specular-btn--sm specular-btn--ghost"
        style={{ textDecoration: "none", padding: "5px 12px", fontSize: 12, height: 32 }}
        title="View Showcase & Downloads"
      >
        <Icon name="sparkles" size={12} />
        <span>Showcase &amp; Releases</span>
      </Link>

      <Link to="/settings" className="avatar-button" aria-label="Open settings" title="Settings">
        CG
      </Link>
    </header>
  );
}
