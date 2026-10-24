import { Suspense, lazy } from "react";
import { HashRouter, Route, Routes } from "react-router-dom";
import { ErrorBoundary } from "./components/common/ErrorBoundary";
import { AppShell } from "./components/shell/AppShell";
import { LoadingState } from "./components/ui/States";
import { PreferencesProvider } from "./context/PreferencesContext";
import { SystemStatusProvider } from "./context/SystemStatusContext";
import { ToastProvider } from "./context/ToastContext";

const OverviewPage = lazy(() => import("./pages/OverviewPage"));
const GatewayPage = lazy(() => import("./pages/GatewayPage"));
const KeysPage = lazy(() => import("./pages/KeysPage"));
const ProvidersPage = lazy(() => import("./pages/ProvidersPage"));
const ModelsPage = lazy(() => import("./pages/ModelsPage"));
const UsagePage = lazy(() => import("./pages/UsagePage"));
const LogsPage = lazy(() => import("./pages/LogsPage"));
const AnalyticsPage = lazy(() => import("./pages/AnalyticsPage"));
const BudgetsPage = lazy(() => import("./pages/BudgetsPage"));
const RoutingPage = lazy(() => import("./pages/RoutingPage"));
const SettingsPage = lazy(() => import("./pages/SettingsPage"));
const NotFoundPage = lazy(() => import("./pages/NotFoundPage"));
const ShowcasePage = lazy(() => import("./pages/ShowcasePage"));

function PageFallback() {
  return (
    <div className="panel">
      <LoadingState />
    </div>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <PreferencesProvider>
        <ToastProvider>
          <SystemStatusProvider>
            <HashRouter>
              <Routes>
                <Route
                  path="showcase"
                  element={
                    <Suspense fallback={<PageFallback />}>
                      <ShowcasePage />
                    </Suspense>
                  }
                />
                <Route
                  path="releases"
                  element={
                    <Suspense fallback={<PageFallback />}>
                      <ShowcasePage />
                    </Suspense>
                  }
                />
                <Route
                  path="downloads"
                  element={
                    <Suspense fallback={<PageFallback />}>
                      <ShowcasePage />
                    </Suspense>
                  }
                />
                <Route element={<AppShell />}>
                  <Route
                    index
                    element={
                      <Suspense fallback={<PageFallback />}>
                        <OverviewPage />
                      </Suspense>
                    }
                  />
                  <Route
                    path="gateway"
                    element={
                      <Suspense fallback={<PageFallback />}>
                        <GatewayPage />
                      </Suspense>
                    }
                  />
                  <Route
                    path="api-keys"
                    element={
                      <Suspense fallback={<PageFallback />}>
                        <KeysPage />
                      </Suspense>
                    }
                  />
                  <Route
                    path="providers"
                    element={
                      <Suspense fallback={<PageFallback />}>
                        <ProvidersPage />
                      </Suspense>
                    }
                  />
                  <Route
                    path="models"
                    element={
                      <Suspense fallback={<PageFallback />}>
                        <ModelsPage />
                      </Suspense>
                    }
                  />
                  <Route
                    path="usage"
                    element={
                      <Suspense fallback={<PageFallback />}>
                        <UsagePage />
                      </Suspense>
                    }
                  />
                  <Route
                    path="logs"
                    element={
                      <Suspense fallback={<PageFallback />}>
                        <LogsPage />
                      </Suspense>
                    }
                  />
                  <Route
                    path="analytics"
                    element={
                      <Suspense fallback={<PageFallback />}>
                        <AnalyticsPage />
                      </Suspense>
                    }
                  />
                  <Route
                    path="budgets"
                    element={
                      <Suspense fallback={<PageFallback />}>
                        <BudgetsPage />
                      </Suspense>
                    }
                  />
                  <Route
                    path="routing"
                    element={
                      <Suspense fallback={<PageFallback />}>
                        <RoutingPage />
                      </Suspense>
                    }
                  />
                  <Route
                    path="settings"
                    element={
                      <Suspense fallback={<PageFallback />}>
                        <SettingsPage />
                      </Suspense>
                    }
                  />
                  <Route path="*" element={<NotFoundPage />} />
                </Route>
              </Routes>
            </HashRouter>
          </SystemStatusProvider>
        </ToastProvider>
      </PreferencesProvider>
    </ErrorBoundary>
  );
}
