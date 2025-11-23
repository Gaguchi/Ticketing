import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ConfigProvider } from "antd";
import { AuthProvider } from "./contexts/AuthContext";
import { ProjectProvider } from "./contexts/ProjectContext";
import { WebSocketProvider } from "./contexts/WebSocketContext";
import ProtectedRoute from "./components/auth/ProtectedRoute";
import MainLayout from "./components/MainLayout";
import Login from "./pages/Login";
import MyTickets from "./pages/MyTickets";
import Chat from "./pages/Chat";
import Profile from "./pages/Profile";
import ChangePassword from "./pages/ChangePassword";
import theme from "./theme/antd-theme";

function App() {
  return (
    <ConfigProvider theme={theme}>
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
                      <MainLayout />
                    </ProtectedRoute>
                  }
                >
                  <Route path="/tickets" element={<MyTickets />} />
                  <Route path="/chat" element={<Chat />} />
                  <Route path="/profile" element={<Profile />} />
                  <Route path="/change-password" element={<ChangePassword />} />
                </Route>

                {/* Default redirect */}
                <Route path="/" element={<Navigate to="/tickets" replace />} />
                <Route path="*" element={<Navigate to="/tickets" replace />} />
              </Routes>
            </BrowserRouter>
          </WebSocketProvider>
        </ProjectProvider>
      </AuthProvider>
    </ConfigProvider>
  );
}

export default App;
