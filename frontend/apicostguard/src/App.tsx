import { BrowserRouter } from "react-router-dom";
import AppRoutes from "./routes";
import { UsageProvider } from "../context/UsageContext";
import { SettingsProvider } from "../context/SettingsContext";
import Sidebar from "../components/layout/Sidebar";
import Header from "../components/layout/Header";

export default function App() {
  return (
    <BrowserRouter>
      <UsageProvider>
        <SettingsProvider>
          <div className="flex h-screen bg-gray-950 text-white">
            <Sidebar />
            <div className="flex flex-col flex-1">
              <Header />
              <main className="flex-1 overflow-y-auto p-6">
                <AppRoutes />
              </main>
            </div>
          </div>
        </SettingsProvider>
      </UsageProvider>
    </BrowserRouter>
  );
}