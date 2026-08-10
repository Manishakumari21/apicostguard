import { Routes, Route } from "react-router-dom";
import Dashboard from "./pages/Dashboard";
import Activity from "./pages/Activity";
import AIApps from "./pages/AIApps";
import Notifications from "./pages/Notifications";
import Settings from "./pages/Settings";
import Widgets from "./pages/Widgets";
import About from "./pages/About";
import Models from "./pages/Models";
import APIKeys from "./pages/APIKeys";

export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Dashboard />} />
      <Route path="/models" element={<Models />} />
      <Route path="/analytics" element={<Activity />} />
      <Route path="/browser" element={<AIApps />} />
      <Route path="/desktop" element={<AIApps />} />
      <Route path="/local-models" element={<AIApps />} />
      <Route path="/litellm" element={<AIApps />} />
      <Route path="/widgets" element={<Widgets />} />
      <Route path="/notifications" element={<Notifications />} />
      <Route path="/settings" element={<Settings />} />
      <Route path="/about" element={<About />} />
      <Route path="/api-keys" element={<APIKeys />} />
      <Route path="*" element={<Dashboard />} />
    </Routes>
  );
}
