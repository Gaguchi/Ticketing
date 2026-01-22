import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ConfigProvider } from "antd";
import { Suspense, lazy } from "react";
import { Spin } from "antd";
import { AppProvider } from "./contexts/AppContext";
import { CompanyProvider } from "./contexts/CompanyContext";
import { WebSocketProvider } from "./contexts/WebSocketContext";
import ProtectedRoute from "./components/auth/ProtectedRoute";
import MainLayout from "./layouts/MainLayout";
import theme from "./theme/antd-theme";

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
const ServiceDeskDemo = lazy(() => import("./pages/ServiceDeskDemo"));
const AcceptInvitationPage = lazy(() => import("./pages/AcceptInvitationPage"));

// Loading fallback component
const PageLoader = () => (
  <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100vh" }}>
    <Spin size="large" />
  </div>
);

function App() {
  return (
    <ConfigProvider theme={theme}>
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
                    <Route path="settings" element={<Settings />} />
                    <Route path="service-desk-demo" element={<ServiceDeskDemo />} />
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

export default App;
