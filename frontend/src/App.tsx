import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ConfigProvider } from "antd";
import { AppProvider } from "./contexts/AppContext";
import { CompanyProvider } from "./contexts/CompanyContext";
import { WebSocketProvider } from "./contexts/WebSocketContext";
import ProtectedRoute from "./components/auth/ProtectedRoute";
import MainLayout from "./layouts/MainLayout";
import Login from "./pages/Login";
import Register from "./pages/Register";
import ProjectSetup from "./pages/ProjectSetup";
import Dashboard from "./pages/Dashboard";
import Tickets from "./pages/Tickets";
import Chat from "./pages/Chat";
import Companies from "./pages/Companies";
import Users from "./pages/Users";
import Settings from "./pages/Settings";
import theme from "./theme/antd-theme";

function App() {
  return (
    <ConfigProvider theme={theme}>
      <AppProvider>
        <CompanyProvider>
          <WebSocketProvider>
            <BrowserRouter>
              <Routes>
                {/* Public routes */}
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register />} />

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
                  <Route path="users" element={<Users />} />
                  <Route path="settings" element={<Settings />} />
                </Route>

                {/* Catch all */}
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </BrowserRouter>
          </WebSocketProvider>
        </CompanyProvider>
      </AppProvider>
    </ConfigProvider>
  );
}

export default App;
