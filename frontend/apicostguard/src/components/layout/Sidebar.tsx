import { NavLink, useNavigate } from "react-router-dom";
import { NAV_SECTIONS } from "../../config/navigation";
import { useGatewayStatus } from "../../hooks/useGatewayStatus";
import { useAppInfo } from "../../hooks/useAppInfo";
import { useUI } from "../../context/UIContext";
import Brand from "../common/Brand";
import GatewayStatusBadge from "../ui/GatewayStatusBadge";
import { useSettings } from "../../context/SettingsContext";

export default function Sidebar() {
  const { connectedProviders } = useSettings();
  const { data: gateway } = useGatewayStatus(15000);
  const { data: appInfo } = useAppInfo();
  const { sidebarCollapsed: collapsed } = useUI();
  const navigate = useNavigate();

  return (
    <aside
      className={`relative z-20 flex h-full flex-col bg-sidebar/80 backdrop-blur-2xl border-r border-line/60 shrink-0 transition-colors ${
        collapsed ? "w-[72px]" : "w-60"
      }`}
    >
      <div className="shrink-0 border-b border-line/60">
        <div className="px-4 py-5">
          {collapsed ? <Brand markOnly size="md" /> : <Brand showTagline />}
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto overflow-x-hidden py-4 px-2.5 min-h-0">
        {NAV_SECTIONS.map((section) => (
          <div key={section.label} className="mb-5">
            {!collapsed && (
              <p className="px-3 mb-1.5 text-[10px] uppercase tracking-widest text-faint">
                {section.label}
              </p>
            )}
            {collapsed && section.items.length > 0 && (
              <div className="mb-2 mx-3 h-px bg-line/50" />
            )}
            {section.items.map(({ path, label, icon }) => (
              <NavLink
                key={path}
                to={path}
                end={path === "/"}
                title={collapsed ? label : undefined}
                aria-label={collapsed ? label : undefined}
                className={({ isActive }) =>
                  `relative flex items-center rounded-lg text-sm transition-[color,background-color] duration-150 mb-0.5 cursor-pointer ${
                    collapsed ? "justify-center px-0 py-2.5" : "gap-3 px-3 py-2"
                  } ${
                    isActive
                      ? "bg-accent/10 text-accent font-medium"
                      : "text-muted hover:bg-line/20 hover:text-ink"
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    {isActive && (
                      <span className="absolute left-0 top-1/2 -translate-y-1/2 h-4 w-0.5 rounded-r-full bg-accent shadow-accent-glow" />
                    )}
                    <span className="text-base w-4 text-center shrink-0">{icon}</span>
                    {!collapsed && <span className="truncate">{label}</span>}
                  </>
                )}
              </NavLink>
            ))}
          </div>
        ))}
      </nav>

      <div className="shrink-0 border-t border-line/60">
        {collapsed ? (
          <div className="flex flex-col items-center gap-1 py-3">
            <button
              onClick={() => navigate("/gateway")}
              title="Gateway status"
              aria-label="Gateway status"
              className="icon-btn !h-9 !w-9"
            >
              <span
                className={`w-2 h-2 rounded-full ${
                  gateway?.running
                    ? "bg-success animate-pulse-beat"
                    : "bg-warning"
                }`}
              />
            </button>
            <button
              onClick={() => navigate("/settings", { state: { tab: "about" } })}
              title={`APICostGuard v${appInfo?.version ?? "…"} — Check for updates`}
              aria-label="Check for updates"
              className="icon-btn !h-9 !w-9"
            >
              <span className="font-mono text-[10px] tabular-nums">
                {appInfo?.version ?? "?"}
              </span>
            </button>
          </div>
        ) : (
          <div className="space-y-3 px-4 py-4">
            <GatewayStatusBadge gateway={gateway} />
            <div>
              <p className="text-[10px] uppercase tracking-wider text-faint mb-1.5">
                Healthy
              </p>
              <div className="flex flex-wrap gap-1.5">
                {connectedProviders.length > 0 ? (
                  connectedProviders.map((p) => (
                    <span
                      key={p}
                      className="chip bg-success/10 text-success border-success/20"
                    >
                      {p}
                    </span>
                  ))
                ) : (
                  <span className="text-[11px] text-faint">No providers configured</span>
                )}
              </div>
            </div>

            <div className="pt-3 border-t border-line/40 space-y-1">
              <div className="flex items-center justify-between px-1">
                <span className="text-[10px] font-semibold tracking-wide text-ink">
                  APICostGuard
                </span>
                <span className="font-mono text-[10px] text-faint tabular-nums">
                  v{appInfo?.version ?? "…"}
                </span>
              </div>
              <button
                onClick={() => navigate("/settings", { state: { tab: "about" } })}
                className="w-full flex items-center justify-between px-2 py-1 rounded-md text-xs text-muted hover:text-ink hover:bg-line/25 transition-colors duration-150 cursor-pointer"
              >
                <span>Check for Updates</span>
                <span className="text-[10px] text-faint tabular-nums">
                  v{appInfo?.version ?? "…"}
                </span>
              </button>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}