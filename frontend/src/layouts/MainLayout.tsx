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
  BarChartOutlined,
} from "@ant-design/icons";
import { Outlet, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../contexts/AppContext";
import { useProject } from "../contexts/AppContext";
import { useWebSocketContext } from "../contexts/WebSocketContext";
import { CreateProjectModal } from "../components/CreateProjectModal";
import { NotificationBell } from "../components/NotificationBell";
import { Logo, LogoIcon } from "../components/Logo";
import LanguageSwitcher from "../components/LanguageSwitcher";
import { useTranslation } from "react-i18next";
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

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(() =>
    window.matchMedia("(max-width: 768px)").matches
  );

  useEffect(() => {
    const mql = window.matchMedia("(max-width: 768px)");
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mql.addEventListener("change", handler);
    return () => mql.removeEventListener("change", handler);
  }, []);

  return isMobile;
}

const MainLayout: React.FC = () => {
  const { t } = useTranslation('common');
  const [collapsed, setCollapsed] = useState(true);
  const [isCreateProjectModalOpen, setIsCreateProjectModalOpen] =
    useState(false);
  const [unreadChatCount, setUnreadChatCount] = useState(0);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const isMobile = useIsMobile();
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
      connectTickets(selectedProject.id);
      connectPresence(selectedProject.id);
    }

    // Cleanup: disconnect when project changes or component unmounts
    return () => {
      if (selectedProject?.id) {
        disconnectTickets();
        disconnectPresence();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedProject?.id]);

  // Load unread chat count
  useEffect(() => {
    if (!selectedProject) return;

    const loadUnreadCount = async () => {
      try {
        const rooms = await chatService.getRooms(selectedProject.id);
        const totalUnread = rooms.reduce(
          (sum, room) => sum + room.unread_count,
          0,
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
            0,
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

  // Listen for global chat notifications to update chat count
  useEffect(() => {
    if (!selectedProject) return;

    const handleChatNotification = () => {
      chatService.getRooms(selectedProject.id).then((rooms) => {
        const totalUnread = rooms.reduce(
          (sum, room) => sum + room.unread_count,
          0,
        );
        setUnreadChatCount(totalUnread);
      });
    };

    window.addEventListener("chatNotification", handleChatNotification);

    return () => {
      window.removeEventListener("chatNotification", handleChatNotification);
    };
  }, [selectedProject?.id]);

  // Close mobile menu when switching away from mobile
  useEffect(() => {
    if (!isMobile) {
      setMobileMenuOpen(false);
    }
  }, [isMobile]);

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

  const handleNavClick = (path: string) => {
    navigate(path);
    if (isMobile) {
      setMobileMenuOpen(false);
    }
  };

  const navItems: NavItem[] = [
    {
      key: "/",
      icon: <DashboardOutlined />,
      label: t('nav.dashboard'),
      path: "/",
    },
    {
      key: "/tickets",
      icon: <InboxOutlined />,
      label: t('nav.tickets'),
      path: "/tickets",
    },
    {
      key: "/chat",
      icon: <MessageOutlined />,
      label: t('nav.chat'),
      path: "/chat",
    },
    {
      key: "/companies",
      icon: <ShopOutlined />,
      label: t('nav.companies'),
      path: "/companies",
    },
    {
      key: "/users",
      icon: <UsergroupAddOutlined />,
      label: t('nav.users'),
      path: "/users",
    },
    {
      key: "/kpi",
      icon: <BarChartOutlined />,
      label: t('nav.kpi'),
      path: "/kpi",
    },
    {
      key: "/settings",
      icon: <SettingOutlined />,
      label: t('nav.settings'),
      path: "/settings",
    },
  ];

  const userMenuItems: MenuProps["items"] = [
    {
      key: "profile",
      icon: <UserOutlined />,
      label: t('user.profile'),
    },
    {
      key: "settings",
      icon: <SettingOutlined />,
      label: t('user.settings'),
    },
    {
      type: "divider",
    },
    {
      key: "logout",
      icon: <LogoutOutlined />,
      label: t('user.logout'),
      danger: true,
    },
  ];

  // On mobile, sidebar is always "expanded" (not icon-collapsed) but visibility
  // is controlled via transform. On desktop, use the existing collapsed state.
  const siderCollapsed = isMobile ? false : collapsed;

  return (
    <Layout style={{ minHeight: "100vh" }}>
      {/* Mobile backdrop overlay */}
      {isMobile && mobileMenuOpen && (
        <div
          className="mobile-sidebar-backdrop"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      <Sider
        trigger={null}
        collapsible
        collapsed={siderCollapsed}
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
          background: "var(--color-bg-sidebar)",
          borderRight: "1px solid var(--color-border)",
          ...(isMobile
            ? {
                zIndex: 1000,
                transform: mobileMenuOpen
                  ? "translateX(0)"
                  : "translateX(-100%)",
                width: 240,
                transition: "transform 0.25s ease",
              }
            : {}),
        }}
      >
        {/* Logo/Brand */}
        <div
          style={{
            height: 48,
            display: "flex",
            alignItems: "center",
            justifyContent: siderCollapsed ? "center" : "flex-start",
            padding: siderCollapsed ? "0" : "0 16px",
            borderBottom: "1px solid var(--color-border)",
            background: "var(--color-bg-surface)",
          }}
        >
          {siderCollapsed ? <LogoIcon size={20} /> : <Logo size={20} showText />}
        </div>

        {/* Navigation Items */}
        <div style={{ padding: siderCollapsed ? "8px 6px" : "8px" }}>
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            const isChatItem = item.key === "/chat";

            return (
              <div
                key={item.key}
                onClick={() => handleNavClick(item.path)}
                className={`nav-item ${isActive ? "active" : ""} ${
                  siderCollapsed ? "collapsed" : ""
                }`}
                style={{
                  display: "flex",
                  flexDirection: siderCollapsed ? "column" : "row",
                  alignItems: "center",
                  justifyContent: siderCollapsed ? "center" : "flex-start",
                  gap: siderCollapsed ? 2 : 8,
                  padding: siderCollapsed ? "10px 4px" : "6px 12px",
                  marginBottom: 2,
                  borderRadius: 2,
                  cursor: "pointer",
                  transition: "all 0.15s",
                  background: isActive ? "var(--color-nav-active-bg)" : "transparent",
                  borderLeft: isActive
                    ? "2px solid var(--color-nav-active-border)"
                    : "2px solid transparent",
                  color: isActive ? "var(--color-nav-active-text)" : "var(--color-text-secondary)",
                  position: "relative",
                }}
              >
                {isChatItem && unreadChatCount > 0 ? (
                  <Badge
                    count={unreadChatCount}
                    size="small"
                    offset={siderCollapsed ? [5, 0] : [10, 0]}
                    style={{
                      fontSize: siderCollapsed ? 'var(--fs-2xs)' : 'var(--fs-xs)',
                    }}
                  >
                    <span style={{ fontSize: siderCollapsed ? 'var(--fs-2xl)' : 'var(--fs-lg)' }}>
                      {item.icon}
                    </span>
                  </Badge>
                ) : (
                  <span style={{ fontSize: siderCollapsed ? 'var(--fs-2xl)' : 'var(--fs-lg)' }}>
                    {item.icon}
                  </span>
                )}
                <span
                  style={{
                    fontSize: siderCollapsed ? 'var(--fs-2xs)' : 'var(--fs-caption)',
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
            padding: siderCollapsed ? "8px 6px" : "8px",
            borderTop: "1px solid var(--color-border)",
            background: "var(--color-bg-surface)",
          }}
        >
          <div
            className="nav-item"
            style={{
              display: "flex",
              flexDirection: siderCollapsed ? "column" : "row",
              alignItems: "center",
              justifyContent: "center",
              gap: siderCollapsed ? 2 : 8,
              padding: siderCollapsed ? "10px 4px" : "6px 12px",
              borderRadius: 2,
              cursor: "pointer",
              transition: "all 0.15s",
              background: "var(--color-primary)",
              color: "var(--color-chat-mine-text)",
            }}
          >
            <PlusOutlined style={{ fontSize: siderCollapsed ? 'var(--fs-2xl)' : 'var(--fs-lg)' }} />
            {!siderCollapsed && (
              <span style={{ fontSize: 'var(--fs-caption)', fontWeight: 500 }}>{t('nav.newTicket')}</span>
            )}
          </div>
        </div>
      </Sider>
      <Layout
        style={{
          marginLeft: isMobile ? 0 : (collapsed ? 88 : 240),
          transition: "all 0.15s",
          background: "var(--color-bg-content)",
        }}
      >
        <Header
          style={{
            padding: isMobile ? "0 8px" : "0 16px",
            background: "var(--color-bg-surface)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            borderBottom: "1px solid var(--color-border)",
            position: "sticky",
            top: 0,
            zIndex: 10,
            height: 48,
          }}
        >
          <div
            onClick={() => {
              if (isMobile) {
                setMobileMenuOpen(!mobileMenuOpen);
              } else {
                setCollapsed(!collapsed);
              }
            }}
            style={{
              cursor: "pointer",
              padding: "6px 8px",
              borderRadius: 2,
              transition: "all 0.15s",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "var(--color-text-secondary)",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "var(--color-bg-content)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "transparent";
            }}
          >
            {(isMobile ? !mobileMenuOpen : collapsed) ? (
              <MenuUnfoldOutlined style={{ fontSize: 'var(--fs-lg)' }} />
            ) : (
              <MenuFoldOutlined style={{ fontSize: 'var(--fs-lg)' }} />
            )}
          </div>
          <Space size={isMobile ? "small" : "middle"} className={isMobile ? "mobile-header-actions" : ""}>
            {/* Project Selector - Show loading or data based on state */}
            {authLoading || projectLoading ? (
              <Space size="small">
                <ProjectOutlined style={{ fontSize: 'var(--fs-lg)', color: "var(--color-text-secondary)" }} />
                <Select
                  loading={true}
                  disabled={true}
                  style={{ minWidth: isMobile ? 120 : 150 }}
                  size="small"
                  placeholder={t('nav.loadingProjects')}
                />
              </Space>
            ) : availableProjects.length > 0 ? (
              <Space size="small">
                <ProjectOutlined style={{ fontSize: 'var(--fs-lg)', color: "var(--color-text-secondary)" }} />
                <Select
                  value={selectedProject?.id}
                  onChange={(value) => {
                    const project = availableProjects.find(
                      (p) => p.id === value,
                    );
                    if (project) {
                      setSelectedProject(project);
                    }
                  }}
                  style={{ minWidth: isMobile ? 120 : 150 }}
                  size="small"
                  placeholder={t('nav.selectProject')}
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
                  {!isMobile && t('nav.newProject')}
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
                {!isMobile && t('nav.createFirstProject')}
              </Button>
            )}

            <LanguageSwitcher />

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
                    background: "var(--color-primary)",
                  }}
                  icon={<UserOutlined />}
                />
                {!isMobile && (
                  <Text strong style={{ fontSize: 'var(--fs-caption)' }}>
                    {user?.username || "Admin"}
                  </Text>
                )}
              </Space>
            </Dropdown>
          </Space>
        </Header>
        <Content
          style={{
            padding: 0,
            minHeight: "calc(100vh - 48px)",
            background: "var(--color-bg-surface)",
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
