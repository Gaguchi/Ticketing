import React from "react";
import { Outlet, useNavigate, useLocation } from "react-router-dom";
import { Dropdown, Avatar, Badge } from "antd";
import {
  UserOutlined,
  LogoutOutlined,
  LockOutlined,
  MessageOutlined,
} from "@ant-design/icons";
import { useAuth } from "../contexts/AuthContext";
import { useWebSocketContext } from "../contexts/WebSocketContext";
import type { MenuProps } from "antd";

const MainLayout: React.FC = () => {
  const { user, logout } = useAuth();
  const { chatUnreadCount } = useWebSocketContext();
  const navigate = useNavigate();
  const location = useLocation();

  const userMenuItems: MenuProps["items"] = [
    {
      key: "profile",
      icon: <UserOutlined />,
      label: "Profile",
      onClick: () => navigate("/profile"),
    },
    {
      key: "change-password",
      icon: <LockOutlined />,
      label: "Change Password",
      onClick: () => navigate("/change-password"),
    },
    {
      type: "divider",
    },
    {
      key: "logout",
      icon: <LogoutOutlined />,
      label: "Logout",
      danger: true,
      onClick: () => {
        logout();
        navigate("/login");
      },
    },
  ];

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      {/* Navbar */}
      <header className="bg-white border-b border-slate-200 h-16 px-4 sm:px-6 flex items-center justify-between sticky top-0 z-10 shadow-sm">
        <div className="flex items-center gap-8">
          <div
            className="flex items-center gap-3 cursor-pointer group"
            onClick={() => navigate("/tickets")}
          >
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold text-lg shadow-sm group-hover:bg-blue-700 transition-colors">
              SD
            </div>
            <span className="text-lg font-bold text-slate-800 tracking-tight group-hover:text-blue-600 transition-colors">
              ServiceDesk
            </span>
          </div>

          <nav className="hidden md:flex items-center gap-6">
            <div
              className={`cursor-pointer text-sm font-medium transition-colors ${
                location.pathname === "/tickets"
                  ? "text-blue-600"
                  : "text-slate-600 hover:text-slate-900"
              }`}
              onClick={() => navigate("/tickets")}
            >
              My Tickets
            </div>
            <div
              className={`cursor-pointer text-sm font-medium transition-colors ${
                location.pathname === "/chat"
                  ? "text-blue-600"
                  : "text-slate-600 hover:text-slate-900"
              }`}
              onClick={() => navigate("/chat")}
            >
              <Badge count={chatUnreadCount} size="small" offset={[10, 0]}>
                <span className="flex items-center gap-2">
                  <MessageOutlined />
                  Messages
                </span>
              </Badge>
            </div>
          </nav>
        </div>

        <div className="flex items-center gap-4">
          <Dropdown
            menu={{ items: userMenuItems }}
            placement="bottomRight"
            trigger={["click"]}
          >
            <div className="flex items-center gap-3 cursor-pointer hover:bg-slate-100 py-1.5 px-3 rounded-full transition-all duration-200 border border-transparent hover:border-slate-200">
              <Avatar
                size="small"
                icon={<UserOutlined />}
                className="bg-blue-600"
              />
              <span className="text-sm font-medium text-slate-700 hidden sm:block">
                {user?.first_name
                  ? `${user.first_name} ${user.last_name}`
                  : user?.username}
              </span>
            </div>
          </Dropdown>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 w-full max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
        <Outlet />
      </main>
    </div>
  );
};

export default MainLayout;
