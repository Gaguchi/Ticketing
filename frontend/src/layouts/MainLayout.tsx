import React, { useState, useEffect } from "react";
import {
  Layout,
  Avatar,
  Dropdown,
  Space,
  Typography,
  Select,
  Button,
  Badge,
} from "antd";
import {
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  DashboardOutlined,
  InboxOutlined,
  ShopOutlined,
  SettingOutlined,
  UserOutlined,
  LogoutOutlined,
  PlusOutlined,
  MessageOutlined,
  UsergroupAddOutlined,
  ProjectOutlined,
} from "@ant-design/icons";
import { Outlet, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../contexts/AppContext";
import { useProject } from "../contexts/AppContext";
import { useWebSocketContext } from "../contexts/WebSocketContext";
import { CreateProjectModal } from "../components/CreateProjectModal";
import { NotificationBell } from "../components/NotificationBell";
import { chatService } from "../services/chat.service";
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
  const [isCreateProjectModalOpen, setIsCreateProjectModalOpen] =
    useState(false);
  const [unreadChatCount, setUnreadChatCount] = useState(0);
  const navigate = useNavigate();
  const location = useLocation();
  const { logout, user, loading: authLoading } = useAuth();
  const {
    selectedProject,
    availableProjects,
    setSelectedProject,
    loading: projectLoading,
  } = useProject();
  const {
    connectTickets,
    connectPresence,
    disconnectTickets,
    disconnectPresence,
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
  } = useWebSocketContext();

  // Connect to WebSocket channels when project changes
  useEffect(() => {
    if (selectedProject?.id) {
      console.log(
        "🔌 [MainLayout] Connecting to WebSocket channels for project:",
        selectedProject.id
      );
      connectTickets(selectedProject.id);
      connectPresence(selectedProject.id);
    }

    // Cleanup: disconnect when project changes or component unmounts
    return () => {
      if (selectedProject?.id) {
        console.log(
          "🔌 [MainLayout] Disconnecting WebSocket channels for project:",
          selectedProject.id
        );
        disconnectTickets();
        disconnectPresence();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedProject?.id]);

  // Log the state for debugging
  useEffect(() => {
    console.log("🏗️ [MainLayout] Render state:");
    console.log("  - authLoading:", authLoading);
    console.log("  - projectLoading:", projectLoading);
    console.log("  - user:", user ? user.username : "NULL");
    console.log("  - availableProjects:", availableProjects.length);
    console.log(
      "  - selectedProject:",
      selectedProject ? selectedProject.name : "NULL"
    );
  }, [
    authLoading,
    projectLoading,
    user?.username,
    availableProjects.length,
    selectedProject?.name,
  ]); // Use primitive values

  // Load unread chat count
  useEffect(() => {
    if (!selectedProject) return;

    const loadUnreadCount = async () => {
      try {
        const rooms = await chatService.getRooms(selectedProject.id);
        const totalUnread = rooms.reduce(
          (sum, room) => sum + room.unread_count,
          0
        );
        setUnreadChatCount(totalUnread);
      } catch (error) {
        console.error("Failed to load unread chat count:", error);
      }
    };

    loadUnreadCount();

    // Refresh every 30 seconds
    const interval = setInterval(loadUnreadCount, 30000);
    return () => clearInterval(interval);
  }, [selectedProject?.id]); // Run for any project change

  // WebSocket listener for real-time chat updates
  useEffect(() => {
    if (!selectedProject) return;

    // Listen to all chat room WebSocket connections for new messages
    // This is a simplified approach - ideally you'd have a global chat notification channel
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === "chat_message_received") {
        // Reload unread count when a message is received
        chatService.getRooms(selectedProject.id).then((rooms) => {
          const totalUnread = rooms.reduce(
            (sum, room) => sum + room.unread_count,
            0
          );
          setUnreadChatCount(totalUnread);
        });
      }
    };

    window.addEventListener("storage", handleStorageChange);

    // Also listen for custom events from Chat page
    const handleChatUpdate = ((e: CustomEvent) => {
      const { unreadCount } = e.detail;
      if (typeof unreadCount === "number") {
        setUnreadChatCount(unreadCount);
      }
    }) as EventListener;

    window.addEventListener("chatUnreadUpdate", handleChatUpdate);

    return () => {
      window.removeEventListener("storage", handleStorageChange);
      window.removeEventListener("chatUnreadUpdate", handleChatUpdate);
    };
  }, [selectedProject?.id]); // Only depend on project ID

  // Listen for global notifications to update chat count
  useEffect(() => {
    if (notifications.length > 0 && selectedProject) {
      const latest = notifications[0];
      if (latest.type === "chat_message") {
        chatService.getRooms(selectedProject.id).then((rooms) => {
          const totalUnread = rooms.reduce(
            (sum, room) => sum + room.unread_count,
            0
          );
          setUnreadChatCount(totalUnread);
        });
      }
    }
  }, [notifications, selectedProject]);

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
      icon: <ShopOutlined />,
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
            const isChatItem = item.key === "/chat";

            return (
              <div
                key={item.key}
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
                  position: "relative",
                }}
              >
                {isChatItem && unreadChatCount > 0 ? (
                  <Badge
                    count={unreadChatCount}
                    size="small"
                    offset={collapsed ? [5, 0] : [10, 0]}
                    style={{
                      fontSize: collapsed ? 10 : 11,
                    }}
                  >
                    <span style={{ fontSize: collapsed ? 20 : 16 }}>
                      {item.icon}
                    </span>
                  </Badge>
                ) : (
                  <span style={{ fontSize: collapsed ? 20 : 16 }}>
                    {item.icon}
                  </span>
                )}
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
              <span style={{ fontSize: 13, fontWeight: 500 }}>New Ticket</span>
            )}
          </div>
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
            {/* Project Selector - Show loading or data based on state */}
            {authLoading || projectLoading ? (
              <Space size="small">
                <ProjectOutlined style={{ fontSize: 16, color: "#595959" }} />
                <Select
                  loading={true}
                  disabled={true}
                  style={{ minWidth: 150 }}
                  size="small"
                  placeholder="Loading projects..."
                />
              </Space>
            ) : availableProjects.length > 0 ? (
              <Space size="small">
                <ProjectOutlined style={{ fontSize: 16, color: "#595959" }} />
                <Select
                  value={selectedProject?.id}
                  onChange={(value) => {
                    const project = availableProjects.find(
                      (p) => p.id === value
                    );
                    if (project) {
                      setSelectedProject(project);
                    }
                  }}
                  style={{ minWidth: 150 }}
                  size="small"
                  placeholder="Select Project"
                  options={availableProjects.map((project) => ({
                    label: `${project.key} - ${project.name}`,
                    value: project.id,
                  }))}
                />
                <Button
                  type="primary"
                  size="small"
                  icon={<PlusOutlined />}
                  onClick={() => setIsCreateProjectModalOpen(true)}
                >
                  New Project
                </Button>
              </Space>
            ) : (
              /* Show Create Project button if no projects */
              <Button
                type="primary"
                size="small"
                icon={<PlusOutlined />}
                onClick={() => setIsCreateProjectModalOpen(true)}
              >
                Create Your First Project
              </Button>
            )}

            {/* Notification Bell */}
            <NotificationBell
              notifications={notifications}
              unreadCount={unreadCount}
              onNotificationRead={markAsRead}
              onAllNotificationsRead={markAllAsRead}
            />

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

      {/* Create Project Modal */}
      <CreateProjectModal
        open={isCreateProjectModalOpen}
        onClose={() => setIsCreateProjectModalOpen(false)}
        onSuccess={() => {
          // Modal will handle refreshing projects
        }}
      />
    </Layout>
  );
};

export default MainLayout;
