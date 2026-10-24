import { useEffect, useRef, useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { useSystemStatus } from "../../context/SystemStatusContext";
import { API_BASE_URL } from "../../services/client";
import { Icon } from "../ui/Icon";
import { CommandPalette } from "./CommandPalette";
import { MobileNav } from "./MobileNav";
import { Sidebar } from "./Sidebar";
import { Topbar } from "./Topbar";

export function AppShell() {
  const [navOpen, setNavOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const location = useLocation();
  const { status } = useSystemStatus();
  const previousPath = useRef(location.pathname);

  useEffect(() => {
    if (previousPath.current !== location.pathname) {
      previousPath.current = location.pathname;
      window.scrollTo({ top: 0, behavior: "instant" });
    }
    setNavOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setPaletteOpen((open) => !open);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  return (
    <div className="app-shell">
      <a className="skip-link" href="#main-content">
        Skip to main content
      </a>
      <Sidebar />
      <MobileNav open={navOpen} onClose={() => setNavOpen(false)} />

      <div className="workspace">
        <Topbar onOpenNav={() => setNavOpen(true)} onOpenPalette={() => setPaletteOpen(true)} />
        <main id="main-content" className="content" tabIndex={-1}>
          <div className="page" key={location.pathname}>
            <Outlet />
          </div>
          <footer className="page-footer">
            <span className="inline">
              <Icon name="shield" size={11} /> Local-first · secrets stay in the OS keyring
            </span>
            <span>
              {status?.online ? "Telemetry connected" : "Telemetry offline"} · {API_BASE_URL.replace(/^https?:\/\//, "")}
            </span>
          </footer>
        </main>
      </div>

      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} />
    </div>
  );
}
