import { useEffect, useRef } from "react";
import { HashRouter, useLocation } from "react-router-dom";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import AppRoutes from "./routes";
import { UsageProvider } from "./context/UsageContext";
import { SettingsProvider } from "./context/SettingsContext";
import { NotificationProvider } from "./context/NotificationContext";
import { UIProvider } from "./context/UIContext";
import Sidebar from "./components/layout/Sidebar";
import Header from "./components/layout/Header";
import DataBridge from "./components/common/DataBridge";
import ToastHost from "./components/common/ToastHost";
import { EASE } from "./components/motion/reveal";

function Shell() {
  const location = useLocation();
  const mainRef = useRef<HTMLElement>(null);
  const reduce = useReducedMotion();

  useEffect(() => {
    mainRef.current?.scrollTo({ top: 0 });
  }, [location.pathname]);

  return (
    <div className="relative flex h-dvh text-ink overflow-hidden">
      <Sidebar />
      <div className="relative z-10 flex min-w-0 flex-1 flex-col">
        <Header />
        <main
          ref={mainRef}
          className="relative flex-1 overflow-y-auto px-5 py-5 lg:px-7"
          id="main-content"
        >
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={location.pathname}
              className="min-h-full"
              initial={reduce ? { opacity: 0 } : { opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={reduce ? { opacity: 0 } : { opacity: 0, y: -4 }}
              transition={{ duration: 0.2, ease: EASE }}
            >
              <AppRoutes />
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
      <div className="grain-overlay" aria-hidden="true" />
    </div>
  );
}

export default function App() {
  return (
    <HashRouter>
      <UIProvider>
        <UsageProvider>
          <SettingsProvider>
            <NotificationProvider>
              <DataBridge />
              <ToastHost />
              <Shell />
            </NotificationProvider>
          </SettingsProvider>
        </UsageProvider>
      </UIProvider>
    </HashRouter>
  );
}