/**
 * NotificationBell Component
 * Displays notification bell icon with badge count and dropdown list
 */

import React, { useState } from "react";
import { Badge, Dropdown, List, Empty, Button, Typography, Space } from "antd";
import { BellOutlined, CheckOutlined, DeleteOutlined } from "@ant-design/icons";
import { useNavigate } from "react-router-dom";
import { notificationService } from "../services/notification.service";
import type { Notification } from "../types/notification";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";

dayjs.extend(relativeTime);

const { Text } = Typography;

interface NotificationBellProps {
  /**
   * Notifications from WebSocket context (real-time)
   */
  notifications?: Notification[];

  /**
   * Unread count from WebSocket context
   */
  unreadCount?: number;

  /**
   * Callback when notification is marked as read
   */
  onNotificationRead?: (id: number) => void;

  /**
   * Callback when all notifications are marked as read
   */
  onAllNotificationsRead?: () => void;
}

export const NotificationBell: React.FC<NotificationBellProps> = ({
  notifications: propNotifications = [],
  unreadCount: propUnreadCount = 0,
  onNotificationRead,
  onAllNotificationsRead,
}) => {
  const navigate = useNavigate();
  const [dropdownVisible, setDropdownVisible] = useState(false);

  /**
   * Use notifications and count from props (provided by WebSocketContext)
   * No need for local state or API calls - context handles everything
   */
  const displayNotifications = propNotifications;
  const displayUnreadCount = propUnreadCount;

  /**
   * Handle notification click - navigate to link and mark as read
   */
  const handleNotificationClick = async (notification: Notification) => {
    // Mark as read if not already
    if (!notification.is_read) {
      try {
        await notificationService.markAsRead(notification.id);

        // Call callback to update context state
        if (onNotificationRead) {
          onNotificationRead(notification.id);
        }
      } catch (error) {
        console.error("Failed to mark notification as read:", error);
      }
    }

    // Navigate to link if provided
    if (notification.link) {
      setDropdownVisible(false);
      navigate(notification.link);
    }
  };

  /**
   * Mark all notifications as read
   */
  const handleMarkAllRead = async () => {
    try {
      await notificationService.markAllAsRead();

      // Call callback to update context state
      if (onAllNotificationsRead) {
        onAllNotificationsRead();
      }
    } catch (error) {
      console.error("Failed to mark all as read:", error);
    }
  };

  /**
   * Delete a notification
   */
  const handleDelete = async (e: React.MouseEvent, notificationId: number) => {
    e.stopPropagation(); // Prevent navigation

    try {
      await notificationService.deleteNotification(notificationId);
      // Context will handle state update via WebSocket
    } catch (error) {
      console.error("Failed to delete notification:", error);
    }
  };

  /**
   * Get notification type icon/color
   */
  const getNotificationStyle = (type: string) => {
    switch (type) {
      case "ticket_assigned":
        return { color: "#1890ff", emoji: "📋" };
      case "ticket_created":
        return { color: "#52c41a", emoji: "✨" };
      case "comment_added":
        return { color: "#722ed1", emoji: "💬" };
      case "mention":
        return { color: "#faad14", emoji: "👋" };
      case "status_changed":
        return { color: "#13c2c2", emoji: "🔄" };
      case "priority_changed":
        return { color: "#fa541c", emoji: "⚡" };
      default:
        return { color: "#8c8c8c", emoji: "🔔" };
    }
  };

  /**
   * Dropdown menu content
   */
  const dropdownContent = (
    <div
      style={{
        width: 380,
        maxHeight: 500,
        backgroundColor: "#ffffff",
        borderRadius: 8,
        boxShadow:
          "0 3px 6px -4px rgba(0, 0, 0, 0.12), 0 6px 16px 0 rgba(0, 0, 0, 0.08), 0 9px 28px 8px rgba(0, 0, 0, 0.05)",
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: "12px 16px",
          borderBottom: "1px solid #f0f0f0",
          backgroundColor: "#fafafa",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <Text strong style={{ fontSize: 16 }}>
          Notifications
        </Text>
        {displayUnreadCount > 0 && (
          <Button
            type="link"
            size="small"
            icon={<CheckOutlined />}
            onClick={handleMarkAllRead}
          >
            Mark all read
          </Button>
        )}
      </div>

      {/* Notification List */}
      <div style={{ flex: 1, overflow: "auto" }}>
        {displayNotifications.length === 0 ? (
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description="No notifications"
            style={{ padding: 40 }}
          />
        ) : (
          <List
            dataSource={displayNotifications}
            renderItem={(notification) => {
              const style = getNotificationStyle(notification.type);

              return (
                <List.Item
                  style={{
                    padding: "12px 16px",
                    cursor: notification.link ? "pointer" : "default",
                    backgroundColor: notification.is_read
                      ? "transparent"
                      : "#f0f7ff",
                    borderLeft: notification.is_read
                      ? "none"
                      : `3px solid ${style.color}`,
                    transition: "background-color 0.3s",
                  }}
                  onClick={() => handleNotificationClick(notification)}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = notification.is_read
                      ? "#fafafa"
                      : "#e6f4ff";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = notification.is_read
                      ? "transparent"
                      : "#f0f7ff";
                  }}
                  actions={[
                    <Button
                      type="text"
                      size="small"
                      icon={<DeleteOutlined />}
                      onClick={(e) => handleDelete(e, notification.id)}
                      danger
                    />,
                  ]}
                >
                  <List.Item.Meta
                    avatar={<div style={{ fontSize: 24 }}>{style.emoji}</div>}
                    title={
                      <Space
                        direction="vertical"
                        size={0}
                        style={{ width: "100%" }}
                      >
                        <Text strong style={{ fontSize: 14 }}>
                          {notification.title}
                        </Text>
                        <Text type="secondary" style={{ fontSize: 12 }}>
                          {dayjs(notification.created_at).fromNow()}
                        </Text>
                      </Space>
                    }
                    description={
                      <Text style={{ fontSize: 13 }}>
                        {notification.message}
                      </Text>
                    }
                  />
                </List.Item>
              );
            }}
          />
        )}
      </div>
    </div>
  );

  return (
    <Dropdown
      menu={{ items: [] }}
      dropdownRender={() => dropdownContent}
      trigger={["click"]}
      open={dropdownVisible}
      onOpenChange={setDropdownVisible}
      placement="bottomRight"
      overlayStyle={{ paddingTop: 8 }}
    >
      <Badge count={displayUnreadCount} offset={[-5, 5]} size="small">
        <Button
          type="text"
          icon={<BellOutlined style={{ fontSize: 18 }} />}
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            height: 40,
            width: 40,
          }}
        />
      </Badge>
    </Dropdown>
  );
};

export default NotificationBell;
