import { lazy, Suspense } from "react";
import { Routes, Route } from "react-router-dom";
import Loader from "./components/common/Loader";
import ErrorBoundary from "./components/common/ErrorBoundary";

const Dashboard = lazy(() => import("./pages/Dashboard"));
const Gateway = lazy(() => import("./pages/Gateway"));
const Requests = lazy(() => import("./pages/Requests"));
const Providers = lazy(() => import("./pages/Providers"));
const Models = lazy(() => import("./pages/Models"));
const Costs = lazy(() => import("./pages/Costs"));
const Budgets = lazy(() => import("./pages/Budgets"));
const Optimize = lazy(() => import("./pages/Optimize"));
const Alerts = lazy(() => import("./pages/Alerts"));
const Settings = lazy(() => import("./pages/Settings"));
const APIKeys = lazy(() => import("./pages/APIKeys"));
const About = lazy(() => import("./pages/About"));
const Landing = lazy(() => import("./pages/Landing"));
const NotFound = lazy(() => import("./pages/NotFound"));

function PageLoader({ children }: { children: React.ReactNode }) {
  return (
    <ErrorBoundary>
      <Suspense fallback={<Loader />}>{children}</Suspense>
    </ErrorBoundary>
  );
}

export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<PageLoader><Landing /></PageLoader>} />
<Route path="/app" element={<PageLoader><Dashboard /></PageLoader>} />
      <Route path="/gateway" element={<PageLoader><Gateway /></PageLoader>} />
      <Route path="/requests" element={<PageLoader><Requests /></PageLoader>} />
      <Route path="/providers" element={<PageLoader><Providers /></PageLoader>} />
      <Route path="/models" element={<PageLoader><Models /></PageLoader>} />
      <Route path="/costs" element={<PageLoader><Costs /></PageLoader>} />
      <Route path="/budgets" element={<PageLoader><Budgets /></PageLoader>} />
      <Route path="/optimize" element={<PageLoader><Optimize /></PageLoader>} />
      <Route path="/alerts" element={<PageLoader><Alerts /></PageLoader>} />
      <Route path="/settings" element={<PageLoader><Settings /></PageLoader>} />
      <Route path="/api-keys" element={<PageLoader><APIKeys /></PageLoader>} />
      <Route path="/about" element={<PageLoader><About /></PageLoader>} />
      <Route path="*" element={<PageLoader><NotFound /></PageLoader>} />
    </Routes>
  );
}
