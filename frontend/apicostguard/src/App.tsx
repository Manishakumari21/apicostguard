import { BrowserRouter } from "react-router-dom";
import AppRoutes from "./routes";
import { UsageProvider } from "./context/UsageContext";
import { SettingsProvider } from "./context/SettingsContext";
import { NotificationProvider } from "./context/NotificationContext";
import { UIProvider } from "./context/UIContext";
import Sidebar from "./components/layout/Sidebar";
import Header from "./components/layout/Header";
import DataBridge from "./components/common/DataBridge";
import ToastHost from "./components/common/ToastHost";

export default function App() {
  return (
    <BrowserRouter>
      <UIProvider>
        <UsageProvider>
          <SettingsProvider>
            <NotificationProvider>
              <DataBridge />
              <ToastHost />
              <div className="flex h-screen bg-canvas text-ink">
                <Sidebar />
                <div className="flex flex-col flex-1">
                  <Header />
                  <main className="flex-1 overflow-y-auto p-6">
                    <AppRoutes />
                  </main>
                </div>
              </div>
            </NotificationProvider>
          </SettingsProvider>
        </UsageProvider>
      </UIProvider>
    </BrowserRouter>
  );
}
