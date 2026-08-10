import { NavLink } from "react-router-dom";
import { useSettings } from "../../context/SettingsContext";

const NAV_SECTIONS = [
  {
    label: "Overview",
    items: [
      { path: "/", label: "Dashboard", icon: "📊" },
      { path: "/models", label: "Models", icon: "🤖" },
      { path: "/analytics", label: "Analytics", icon: "📈" },
    ],
  },
  {
    label: "Manage",
    items: [
      { path: "/widgets", label: "Widgets", icon: "📌" },
      { path: "/notifications", label: "Notifications", icon: "🔔" },
      { path: "/api-keys", label: "API Keys", icon: "🔑" },
    ],
  },
  {
    label: "System",
    items: [
      { path: "/settings", label: "Settings", icon: "⚙️" },
      { path: "/about", label: "About", icon: "ℹ️" },
    ],
  },
] as const;

export default function Sidebar() {
  const { connectedProviders, desktopWidget } = useSettings();

  return (
    <aside className="flex flex-col w-64 h-screen bg-sidebar border-r border-line/50 shrink-0">
      <div className="flex items-center gap-3 px-5 py-5 border-b border-line/50">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-iris to-foam flex items-center justify-center ring-1 ring-white/20 shadow-[0_0_18px_rgba(196,167,231,0.35)]">
          <span
            className="font-extrabold text-base tracking-tight leading-none"
            style={{ color: "#ffffff", textShadow: "0 1px 3px rgba(31,29,46,0.6)" }}
          >
            AI
          </span>
        </div>
        <div>
          <h1 className="text-sm font-bold text-ink">APICostGuard</h1>
          <p className="text-[10px] text-muted/60">Monitor · Alert · Control</p>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto py-4 px-3">
        {NAV_SECTIONS.map((section) => (
          <div key={section.label} className="mb-4">
            <p className="px-3 mb-1.5 text-[10px] uppercase tracking-widest text-faint/80">
              {section.label}
            </p>
            {section.items.map(({ path, label, icon }) => (
              <NavLink
                key={path}
                to={path}
                end={path === "/"}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all duration-150 mb-0.5 ${
                    isActive
                      ? "bg-accent/10 text-accent font-medium border border-accent/20 shadow-[0_0_12px_rgba(196,167,231,0.14)]"
                      : "text-muted hover:bg-line/40 hover:text-ink border border-transparent"
                  }`
                }
              >
                <span className="text-base w-5 text-center">{icon}</span>
                <span>{label}</span>
              </NavLink>
            ))}
          </div>
        ))}
      </nav>

      <div className="px-4 py-4 border-t border-line/50 space-y-3">
        <div>
          <p className="text-[10px] uppercase tracking-wider text-faint/80 mb-2">
            Connected
          </p>
          <div className="flex flex-wrap gap-1.5">
            {connectedProviders.length > 0 ? (
              connectedProviders.map((p) => (
                <span
                  key={p}
                  className="px-2 py-0.5 text-[10px] rounded-full bg-success/10 text-success border border-success/20"
                >
                  {p}
                </span>
              ))
            ) : (
              <span className="text-[11px] text-faint">No providers</span>
            )}
          </div>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-[10px] uppercase tracking-wider text-faint/80">
            Desktop Widget
          </span>
          <span
            className={`w-2 h-2 rounded-full ${
              desktopWidget
                ? "bg-accent shadow-[0_0_6px_rgba(196,167,231,0.7)]"
                : "bg-faint"
            }`}
          />
        </div>
      </div>
    </aside>
  );
}
