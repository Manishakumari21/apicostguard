import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { motion } from "motion/react";
import { useSettings } from "../../context/SettingsContext";
import { useUI } from "../../context/UIContext";
import { useSetTheme } from "../../hooks/useSettings";
import { useGatewayStatus } from "../../hooks/useGatewayStatus";
import { useCapacity } from "../../hooks/useCapacity";
import { useAppInfo } from "../../hooks/useAppInfo";
import { findNavItem } from "../../config/navigation";
import { APP_TAGLINE } from "../../config/app";
import { GATEWAY_DEFAULT_HOST, GATEWAY_DEFAULT_PORT, THEME_CHOICES } from "../../utils/constants";
import AppActionBar from "../ui/AppActionBar";

export default function Header() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { theme } = useSettings();
  const { triggerRefresh, toggleSidebar } = useUI();
  const setTheme = useSetTheme();
  const { data: gw, refetch } = useGatewayStatus(10000);
  const { data: appInfo } = useAppInfo();
  const { remainingPercent, tone } = useCapacity(15000);
  const [refreshing, setRefreshing] = useState(false);

  const nav = findNavItem(pathname);
  const title = nav?.label ?? "APICostGuard";
  const port = gw?.endpointPort ?? GATEWAY_DEFAULT_PORT;

  function handleRefresh() {
    setRefreshing(true);
    triggerRefresh();
    refetch();
    setTimeout(() => setRefreshing(false), 600);
  }

  return (
    <header className="relative z-30 shrink-0 border-b border-line/60 bg-surface/45 backdrop-blur-2xl">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />

      <div className="flex items-center justify-between gap-3 px-4 py-3 sm:px-5">
        <div className="flex items-center gap-3 min-w-0">
          <button
            onClick={toggleSidebar}
            title="Toggle sidebar"
            aria-label="Toggle sidebar"
            className="icon-btn"
          >
            <svg
              viewBox="0 0 24 24"
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            >
              <line x1="4" y1="6" x2="20" y2="6" />
              <line x1="4" y1="12" x2="20" y2="12" />
              <line x1="4" y1="18" x2="20" y2="18" />
            </svg>
          </button>

          <div className="min-w-0">
            <h1 className="text-base font-semibold text-ink leading-tight truncate text-balance lg:text-lg">
              {title}
            </h1>
            <p className="text-[10px] text-faint tracking-wide truncate">
              {APP_TAGLINE}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <AppActionBar
            info={appInfo}
            onDownload={() => navigate("/settings", { state: { tab: "about" } })}
          />

          <button
            onClick={() => navigate("/gateway")}
            title={`Gateway ${gw?.running ? "running" : "stopped"} — ${GATEWAY_DEFAULT_HOST}:${port}`}
            className={`hidden sm:inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border text-[11px] font-medium transition-all duration-150 cursor-pointer active:scale-95 ${
              gw?.running
                ? "bg-success/10 border-success/25 text-success hover:bg-success/15"
                : "bg-warning/10 border-warning/25 text-warning hover:bg-warning/15"
            }`}
          >
            <span
              className={`w-2 h-2 rounded-full ${
                gw?.running ? "bg-success animate-pulse-beat" : "bg-warning"
              }`}
            />
            <span className="hidden lg:inline font-mono tabular-nums">
              {GATEWAY_DEFAULT_HOST}:{port}
            </span>
          </button>

          <button
            onClick={() => navigate("/budgets")}
            title={`${remainingPercent.toFixed(0)}% remaining — view budgets`}
            className={`hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-[11px] font-medium transition-all duration-150 cursor-pointer active:scale-95 ${
              tone === "success"
                ? "bg-success/10 border-success/25 text-success hover:bg-success/15"
                : tone === "warning"
                  ? "bg-warning/10 border-warning/25 text-warning hover:bg-warning/15"
                  : "bg-danger/10 border-danger/25 text-danger hover:bg-danger/15"
            }`}
          >
            <span className={`w-2 h-2 rounded-full ${
              tone === "success" ? "bg-success" : tone === "warning" ? "bg-warning" : "bg-danger animate-pulse-beat"
            }`} />
            <span className="hidden lg:inline tabular-nums">
              {remainingPercent.toFixed(0)}% left
            </span>
          </button>

          <button
            onClick={handleRefresh}
            title="Refresh data"
            aria-label="Refresh data"
            className="icon-btn"
          >
            <span
              className={`inline-block transition-transform duration-300 ${
                refreshing ? "animate-spin" : "group-hover:rotate-90"
              }`}
            >
              ⟳
            </span>
          </button>

          <div
            role="group"
            aria-label="Theme"
            className="flex items-center gap-0.5 relative p-1 rounded-xl bg-surface/80 border border-line/60"
          >
            {THEME_CHOICES.map((opt) => {
              const active = theme === opt.value;
              return (
                <button
                  key={opt.value}
                  title={opt.label}
                  aria-label={`${opt.label} theme`}
                  aria-pressed={active}
                  onClick={() => setTheme(opt.value)}
                  className={`relative z-10 w-8 h-7 rounded-lg text-sm transition-colors duration-150 cursor-pointer ${
                    active ? "text-accent" : "text-muted hover:text-ink"
                  }`}
                >
                  {active && (
                    <motion.span
                      layoutId="theme-pill"
                      className="absolute inset-0 -z-10 rounded-lg bg-accent/15 shadow-[inset_0_0_0_1px_rgb(var(--accent)/0.35)]"
                      transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
                    />
                  )}
                  {opt.icon}
                </button>
              );
            })}
          </div>

          <button
            onClick={() => navigate("/settings")}
            title="Settings"
            aria-label="Open settings"
            className="icon-btn"
          >
            <svg
              viewBox="0 0 24 24"
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z" />
            </svg>
          </button>
        </div>
      </div>
    </header>
  );
}