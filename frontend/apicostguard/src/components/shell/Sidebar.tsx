import { NavLink, Link } from "react-router-dom";
import { NAV_ITEMS } from "../../config/navigation";
import { useSystemStatus } from "../../context/SystemStatusContext";
import { Icon } from "../ui/Icon";
import { API_BASE_URL } from "../../services/client";

function BrandMark() {
  return (
    <span className="brand-mark" aria-hidden="true">
      <svg viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="12" r="7.2" stroke="currentColor" strokeWidth="1.5" opacity=".55" />
        <circle cx="12" cy="12" r="2.6" fill="currentColor" />
        <path
          d="M12 3.2v3M12 17.8v3M3.2 12h3M17.8 12h3"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
      </svg>
    </span>
  );
}

export function SidebarContent({ onNavigate, onClose }: { onNavigate?: () => void; onClose?: () => void }) {
  const { status, checking } = useSystemStatus();
  const online = status?.online ?? false;
  const statusLabel = checking && !status ? "Checking" : online ? "Gateway online" : "Gateway offline";
  const statusMeta = online
    ? `${status?.environment ?? "local"} · ${status?.latencyMs ?? "—"} ms`
    : status?.error?.includes("unreachable")
      ? "Backend unreachable"
      : "Open settings to reconnect";

  return (
    <>
      {onClose ? (
        <button type="button" className="icon-button mobile-rail-close" onClick={onClose} aria-label="Close navigation">
          <Icon name="close" />
        </button>
      ) : null}

      <div className="rail-brand">
        <BrandMark />
        <div className="brand-copy">
          <div className="brand-name">
            Cost<span>Guard</span>
          </div>
          <div className="brand-sub">Spend control plane</div>
        </div>
      </div>

      <Link className="workspace-pill" to="/settings" onClick={onNavigate}>
        <span className="workspace-avatar">CG</span>
        <span className="workspace-copy">
          <span className="workspace-label">Local workspace</span>
          <span className="workspace-meta">
            <span className="dot" aria-hidden="true" />
            {status?.version ? `v${status.version}` : "self-hosted"}
          </span>
        </span>
        <Icon name="chevron-right" size={12} className="faint" />
      </Link>

      <nav className="rail-nav" aria-label="Primary navigation">
        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.id}
            to={item.path}
            end={item.path === "/"}
            onClick={onNavigate}
            className={({ isActive }) => `nav-item${isActive ? " is-active" : ""}`}
          >
            <span className="nav-index" aria-hidden="true">
              {item.index}
            </span>
            <span className="nav-icon" aria-hidden="true">
              <Icon name={item.icon} />
            </span>
            <span className="nav-label">{item.label}</span>
            {item.id === "gateway" && online ? <span className="nav-hint">Live</span> : null}
          </NavLink>
        ))}

        <NavLink
          to="/showcase"
          onClick={onNavigate}
          className={({ isActive }) => `nav-item${isActive ? " is-active" : ""}`}
          style={{
            marginTop: 8,
            background: "linear-gradient(135deg, rgba(99, 102, 241, 0.12), rgba(168, 85, 247, 0.12))",
            border: "1px solid rgba(165, 180, 252, 0.2)",
            borderRadius: "var(--radius-md)",
          }}
        >
          <span className="nav-index" aria-hidden="true">★</span>
          <span className="nav-icon" aria-hidden="true" style={{ color: "#38bdf8" }}>
            <Icon name="sparkles" />
          </span>
          <span className="nav-label" style={{ fontWeight: 600 }}>Showcase &amp; Releases</span>
          <span className="nav-hint" style={{ background: "rgba(56, 189, 248, 0.2)", color: "#38bdf8" }}>v0.1.0</span>
        </NavLink>
      </nav>

      <div className="rail-footer">
        <div className="rail-status">
          <span
            className={`status-orb${online ? " is-live" : checking ? " is-checking" : " is-down"}`}
            aria-hidden="true"
          />
          <span className="rail-status-copy">
            <span className="rail-status-label">{statusLabel}</span>
            <span className="rail-status-meta">{statusMeta}</span>
          </span>
        </div>
        <div className="rail-links">
          <a href="https://github.com/Manishakumari21/apicostguard" target="_blank" rel="noreferrer">
            Docs <Icon name="arrow-up-right" size={9} />
          </a>
          <span>{API_BASE_URL.replace(/^https?:\/\//, "")}</span>
        </div>
      </div>
    </>
  );
}

export function Sidebar() {
  return (
    <aside className="rail" aria-label="Application sidebar">
      <SidebarContent />
    </aside>
  );
}
