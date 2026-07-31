import { NavLink } from "react-router-dom";
import { useSettings } from "../../context/SettingsContext";

const NAV_ITEMS = [
  { path: "/", label: "Dashboard", icon: "📊" },
  { path: "/analytics", label: "Analytics", icon: "📈" },
  { path: "/browser", label: "Browser", icon: "🌐" },
  { path: "/desktop", label: "Desktop", icon: "🖥️" },
  { path: "/local-models", label: "Local Models", icon: "🤖" },
  { path: "/litellm", label: "LiteLLM", icon: "🔗" },
  { path: "/widgets", label: "Widgets", icon: "📌" },
  { path: "/notifications", label: "Notifications", icon: "🔔" },
  { path: "/settings", label: "Settings", icon: "⚙️" },
  { path: "/about", label: "About", icon: "ℹ️" },
] as const;

export default function Sidebar() {
  const { connectedProviders } = useSettings();

  return (
    <aside className="flex flex-col w-64 h-screen bg-[#0A0F1C] border-r border-[#334155]/50">
      <div className="flex items-center gap-3 px-5 py-5 border-b border-[#334155]/50">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#22C55E] to-[#06B6D4] flex items-center justify-center text-[#0B1220] font-bold text-sm">
          AC
        </div>
        <div>
          <h1 className="text-sm font-bold text-[#F8FAFC]">APICostGuard</h1>
          <p className="text-[10px] text-[#94A3B8]/60">Monitor · Alert · Control</p>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto py-3 px-2">
        {NAV_ITEMS.map(({ path, label, icon }) => (
          <NavLink
            key={path}
            to={path}
            end={path === "/"}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 mx-1 rounded-lg text-sm transition-all duration-150 mb-0.5 ${
                isActive
                  ? "bg-[#22C55E]/10 text-[#22C55E] font-medium border border-[#22C55E]/20"
                  : "text-[#94A3B8] hover:bg-[#334155]/30 hover:text-[#F8FAFC] border border-transparent"
              }`
            }
          >
            <span className="text-base">{icon}</span>
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="px-4 py-4 border-t border-[#334155]/50">
        <p className="text-[10px] uppercase tracking-wider text-[#94A3B8]/50 mb-2">Connected</p>
        <div className="flex flex-wrap gap-1.5">
          {connectedProviders.length > 0 ? (
            connectedProviders.map((p) => (
              <span
                key={p}
                className="px-2 py-0.5 text-[10px] rounded-full bg-[#22C55E]/10 text-[#22C55E] border border-[#22C55E]/20"
              >
                {p}
              </span>
            ))
          ) : (
            <span className="text-[11px] text-[#94A3B8]/40">No providers</span>
          )}
        </div>
      </div>
    </aside>
  );
}
