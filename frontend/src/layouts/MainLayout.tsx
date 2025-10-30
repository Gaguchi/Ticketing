import React, { useState } from "react";
import { Layout, Avatar, Dropdown, Space, Typography, Tooltip } from "antd";
import {
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  DashboardOutlined,
  InboxOutlined,
  TeamOutlined,
  SettingOutlined,
  UserOutlined,
  LogoutOutlined,
  BellOutlined,
  PlusOutlined,
  MessageOutlined,
  UsergroupAddOutlined,
} from "@ant-design/icons";
import { Outlet, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import type { MenuProps } from "antd";
import "./MainLayout.css";

const { Header, Sider, Content } = Layout;
const { Text } = Typography;

interface NavItem {
  key: string;
  icon: React.ReactNode;
  label: string;
  path: string;
}

const MainLayout: React.FC = () => {
  const [collapsed, setCollapsed] = useState(true);
  const navigate = useNavigate();
  const location = useLocation();
  const { logout, user } = useAuth();

  const handleMenuClick: MenuProps["onClick"] = ({ key }) => {
    if (key === "logout") {
      logout();
      navigate("/login");
    } else if (key === "profile") {
      navigate("/profile");
    } else if (key === "settings") {
      navigate("/settings");
    }
  };

  const navItems: NavItem[] = [
    {
      key: "/",
      icon: <DashboardOutlined />,
      label: "Dashboard",
      path: "/",
    },
    {
      key: "/tickets",
      icon: <InboxOutlined />,
      label: "Tickets",
      path: "/tickets",
    },
    {
      key: "/chat",
      icon: <MessageOutlined />,
      label: "Chat",
      path: "/chat",
    },
    {
      key: "/companies",
      icon: <TeamOutlined />,
      label: "Companies",
      path: "/companies",
    },
    {
      key: "/users",
      icon: <UsergroupAddOutlined />,
      label: "Users",
      path: "/users",
    },
    {
      key: "/settings",
      icon: <SettingOutlined />,
      label: "Settings",
      path: "/settings",
    },
  ];

  const userMenuItems: MenuProps["items"] = [
    {
      key: "profile",
      icon: <UserOutlined />,
      label: "Profile",
    },
    {
      key: "settings",
      icon: <SettingOutlined />,
      label: "Settings",
    },
    {
      type: "divider",
    },
    {
      key: "logout",
      icon: <LogoutOutlined />,
      label: "Logout",
      danger: true,
    },
  ];

  return (
    <Layout style={{ minHeight: "100vh" }}>
      <Sider
        trigger={null}
        collapsible
        collapsed={collapsed}
        collapsedWidth={88}
        width={240}
        className="modern-sider"
        style={{
          overflow: "auto",
          height: "100vh",
          position: "fixed",
          left: 0,
          top: 0,
          bottom: 0,
          background: "#fafafa",
          borderRight: "1px solid #e8e8e8",
        }}
      >
        {/* Logo/Brand */}
        <div
          style={{
            height: 48,
            display: "flex",
            alignItems: "center",
            justifyContent: collapsed ? "center" : "flex-start",
            padding: collapsed ? "0" : "0 16px",
            borderBottom: "1px solid #e8e8e8",
            background: "#ffffff",
          }}
        >
          {collapsed ? (
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: 2,
                background: "#1890ff",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "white",
                fontSize: "14px",
                fontWeight: 600,
              }}
            >
              TS
            </div>
          ) : (
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 2,
                  background: "#1890ff",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "white",
                  fontSize: "14px",
                  fontWeight: 600,
                }}
              >
                TS
              </div>
              <Text strong style={{ fontSize: 14 }}>
                TicketSystem
              </Text>
            </div>
          )}
        </div>

        {/* Navigation Items */}
        <div style={{ padding: collapsed ? "8px 6px" : "8px" }}>
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Tooltip
                key={item.key}
                title={collapsed ? item.label : ""}
                placement="right"
              >
                <div
                  onClick={() => navigate(item.path)}
                  className={`nav-item ${isActive ? "active" : ""} ${
                    collapsed ? "collapsed" : ""
                  }`}
                  style={{
                    display: "flex",
                    flexDirection: collapsed ? "column" : "row",
                    alignItems: "center",
                    justifyContent: collapsed ? "center" : "flex-start",
                    gap: collapsed ? 2 : 8,
                    padding: collapsed ? "10px 4px" : "6px 12px",
                    marginBottom: 2,
                    borderRadius: 2,
                    cursor: "pointer",
                    transition: "all 0.15s",
                    background: isActive ? "#e6f7ff" : "transparent",
                    borderLeft: isActive
                      ? "2px solid #1890ff"
                      : "2px solid transparent",
                    color: isActive ? "#1890ff" : "#595959",
                  }}
                >
                  <span style={{ fontSize: collapsed ? 20 : 16 }}>
                    {item.icon}
                  </span>
                  <span
                    style={{
                      fontSize: collapsed ? 10 : 13,
                      fontWeight: isActive ? 500 : 400,
                      whiteSpace: "nowrap",
                    }}
                  >
                    {item.label}
                  </span>
                </div>
              </Tooltip>
            );
          })}
        </div>

        {/* Bottom Actions */}
        <div
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
            padding: collapsed ? "8px 6px" : "8px",
            borderTop: "1px solid #e8e8e8",
            background: "#ffffff",
          }}
        >
          <Tooltip title={collapsed ? "New Ticket" : ""} placement="right">
            <div
              className="nav-item"
              style={{
                display: "flex",
                flexDirection: collapsed ? "column" : "row",
                alignItems: "center",
                justifyContent: "center",
                gap: collapsed ? 2 : 8,
                padding: collapsed ? "10px 4px" : "6px 12px",
                borderRadius: 2,
                cursor: "pointer",
                transition: "all 0.15s",
                background: "#1890ff",
                color: "#ffffff",
              }}
            >
              <PlusOutlined style={{ fontSize: collapsed ? 20 : 16 }} />
              {!collapsed && (
                <span style={{ fontSize: 13, fontWeight: 500 }}>
                  New Ticket
                </span>
              )}
            </div>
          </Tooltip>
        </div>
      </Sider>
      <Layout
        style={{
          marginLeft: collapsed ? 88 : 240,
          transition: "all 0.15s",
          background: "#f0f0f0",
        }}
      >
        <Header
          style={{
            padding: "0 16px",
            background: "#ffffff",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            borderBottom: "1px solid #e8e8e8",
            position: "sticky",
            top: 0,
            zIndex: 10,
            height: 48,
          }}
        >
          <div
            onClick={() => setCollapsed(!collapsed)}
            style={{
              cursor: "pointer",
              padding: "6px 8px",
              borderRadius: 2,
              transition: "all 0.15s",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#595959",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "#f0f0f0";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "transparent";
            }}
          >
            {collapsed ? (
              <MenuUnfoldOutlined style={{ fontSize: 16 }} />
            ) : (
              <MenuFoldOutlined style={{ fontSize: 16 }} />
            )}
          </div>
          <Space size="middle">
            <Tooltip title="Notifications">
              <div
                style={{
                  cursor: "pointer",
                  padding: "6px 8px",
                  borderRadius: 2,
                  transition: "all 0.15s",
                  display: "flex",
                  alignItems: "center",
                  position: "relative",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "#f0f0f0";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "transparent";
                }}
              >
                <BellOutlined style={{ fontSize: 16, color: "#595959" }} />
                <span
                  style={{
                    position: "absolute",
                    top: 4,
                    right: 6,
                    width: 6,
                    height: 6,
                    borderRadius: "50%",
                    background: "#ff4d4f",
                    border: "1px solid white",
                  }}
                />
              </div>
            </Tooltip>
            <Dropdown
              menu={{ items: userMenuItems, onClick: handleMenuClick }}
              placement="bottomRight"
            >
              <Space size="small" style={{ cursor: "pointer" }}>
                <Avatar
                  size="small"
                  style={{
                    background: "#1890ff",
                  }}
                  icon={<UserOutlined />}
                />
                <Text strong style={{ fontSize: 13 }}>
                  {user?.username || "Admin"}
                </Text>
              </Space>
            </Dropdown>
          </Space>
        </Header>
        <Content
          style={{
            padding: 0,
            minHeight: "calc(100vh - 48px)",
            background: "#fff",
          }}
        >
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  );
};

export default MainLayout;
