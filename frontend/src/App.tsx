import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ConfigProvider } from "antd";
import { Suspense, lazy } from "react";
import { Spin } from "antd";
import { useTranslation } from "react-i18next";
import enUS from "antd/locale/en_US";
import kaGE from "antd/locale/ka_GE";
import "./i18n";
import { AppProvider } from "./contexts/AppContext";
import { CompanyProvider } from "./contexts/CompanyContext";
import { WebSocketProvider } from "./contexts/WebSocketContext";
import { ThemeProvider, useThemeVersion } from "./contexts/ThemeContext";
import ProtectedRoute from "./components/auth/ProtectedRoute";
import MainLayout from "./layouts/MainLayout";

// Lazy load all pages for code splitting
const Login = lazy(() => import("./pages/Login"));
const Register = lazy(() => import("./pages/Register"));
const ProjectSetup = lazy(() => import("./pages/ProjectSetup"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Tickets = lazy(() => import("./pages/Tickets"));
const Chat = lazy(() => import("./pages/Chat"));
const Companies = lazy(() => import("./pages/Companies"));
const CompanyDetail = lazy(() => import("./pages/CompanyDetail"));
const Users = lazy(() => import("./pages/Users"));
const Settings = lazy(() => import("./pages/Settings"));
const KPI = lazy(() => import("./pages/KPI"));
const KPIDemoPage = lazy(() => import("./pages/KPIDemoPage"));
const AcceptInvitationPage = lazy(() => import("./pages/AcceptInvitationPage"));

// Loading fallback component
const PageLoader = () => (
  <div
    style={{
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
      height: "100vh",
      background: "var(--color-bg-content)",
    }}
  >
    <Spin size="large" />
  </div>
);

function AppInner() {
  const { i18n } = useTranslation();
  const { activeTheme } = useThemeVersion();
  const antdLocale = i18n.language === "ka" ? kaGE : enUS;

  return (
    <ConfigProvider theme={activeTheme} locale={antdLocale}>
      <AppProvider>
        <CompanyProvider>
          <BrowserRouter>
            <WebSocketProvider>
              <Suspense fallback={<PageLoader />}>
                <Routes>
                  {/* Public routes */}
                  <Route path="/login" element={<Login />} />
                  <Route path="/register" element={<Register />} />
                  <Route
                    path="/invite/accept"
                    element={<AcceptInvitationPage />}
                  />

                  {/* Project setup (protected) */}
                  <Route
                    path="/setup"
                    element={
                      <ProtectedRoute>
                        <ProjectSetup />
                      </ProtectedRoute>
                    }
                  />

                  {/* Protected routes */}
                  <Route
                    path="/"
                    element={
                      <ProtectedRoute>
                        <MainLayout />
                      </ProtectedRoute>
                    }
                  >
                    <Route index element={<Dashboard />} />
                    <Route path="tickets" element={<Tickets />} />
                    <Route path="chat" element={<Chat />} />
                    <Route path="companies" element={<Companies />} />
                    <Route path="companies/:id" element={<CompanyDetail />} />
                    <Route path="users" element={<Users />} />
                    <Route path="kpi" element={<KPI />} />
                    <Route path="kpi-demo" element={<KPIDemoPage />} />
                    <Route path="settings" element={<Settings />} />
                  </Route>

                  {/* Catch all */}
                  <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
              </Suspense>
            </WebSocketProvider>
          </BrowserRouter>
        </CompanyProvider>
      </AppProvider>
    </ConfigProvider>
  );
}

function App() {
  return (
    <ThemeProvider>
      <AppInner />
    </ThemeProvider>
  );
}

export default App;
