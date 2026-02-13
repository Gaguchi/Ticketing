import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ConfigProvider } from "antd";
import { useTranslation } from "react-i18next";
import enUS from "antd/locale/en_US";
import kaGE from "antd/locale/ka_GE";
import "./i18n";
import sdTheme from "./theme/antd-theme";
import { AuthProvider } from "./contexts/AuthContext";
import { ProjectProvider } from "./contexts/ProjectContext";
import { WebSocketProvider } from "./contexts/WebSocketContext";
import ProtectedRoute from "./components/auth/ProtectedRouteNew";
import AppLayout from "./components/AppLayout";
import Login from "./pages/LoginNew";
import Dashboard from "./pages/Dashboard";
import TicketDetail from "./pages/TicketDetail";
import Profile from "./pages/ProfileNew";

function App() {
  const { i18n } = useTranslation();
  const antdLocale = i18n.language === "ka" ? kaGE : enUS;

  return (
    <ConfigProvider theme={sdTheme} locale={antdLocale}>
    <AuthProvider>
      <ProjectProvider>
        <WebSocketProvider>
          <BrowserRouter>
            <Routes>
              {/* Public routes */}
              <Route path="/login" element={<Login />} />

              {/* Protected routes */}
              <Route
                element={
                  <ProtectedRoute>
                    <AppLayout />
                  </ProtectedRoute>
                }
              >
                <Route path="/" element={<Dashboard />} />
                <Route path="/tickets/:id" element={<TicketDetail />} />
                <Route path="/profile" element={<Profile />} />
              </Route>

              {/* Default redirect */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </BrowserRouter>
        </WebSocketProvider>
      </ProjectProvider>
    </AuthProvider>
    </ConfigProvider>
  );
}

export default App;
