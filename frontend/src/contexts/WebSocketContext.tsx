/**
 * WebSocket Context
 * Provides global WebSocket state and connections to the app
 */

import React, {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  useCallback,
} from "react";
import { message as antMessage } from "antd";
import { webSocketService } from "../services/websocket.service";
import { notificationService } from "../services/notification.service";
import { useAuth } from "./AppContext";
import type { Notification } from "../types/notification";

interface WebSocketContextType {
  // Connection states
  isNotificationConnected: boolean;
  isTicketConnected: boolean;
  isPresenceConnected: boolean;

  // Connection functions
  connectNotifications: () => void;
  connectTickets: (projectId: number) => void;
  connectPresence: (projectId: number) => void;

  // Disconnect functions
  disconnectNotifications: () => void;
  disconnectTickets: () => void;
  disconnectPresence: () => void;
  disconnectAll: () => void;

  // Send functions
  sendNotificationMessage: (data: any) => boolean;
  sendTicketMessage: (data: any) => boolean;
  sendPresenceMessage: (data: any) => boolean;

  // Notification state
  notifications: Notification[];
  unreadCount: number;

  // Notification handlers
  addNotification: (notification: Notification) => void;
  markAsRead: (id: number) => void;
  markAllAsRead: () => void;
  removeNotification: (id: number) => void;
}

const WebSocketContext = createContext<WebSocketContextType | undefined>(
  undefined
);

export const WebSocketProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const { user, isAuthenticated } = useAuth();
  const [isNotificationConnected, setIsNotificationConnected] = useState(false);
  const [isTicketConnected, setIsTicketConnected] = useState(false);
  const [isPresenceConnected, setIsPresenceConnected] = useState(false);

  // Notification state
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const currentProjectId = useRef<number | null>(null);
  const heartbeatInterval = useRef<number | null>(null);

  // Auto-connect to notifications when user logs in
  useEffect(() => {
    if (isAuthenticated && user) {
      console.log(
        "🔌 [WebSocketContext] User authenticated, connecting to notifications..."
      );
      connectNotifications();
      loadInitialNotifications();
    } else {
      console.log(
        "🔌 [WebSocketContext] User not authenticated, disconnecting all..."
      );
      disconnectAll();
      setNotifications([]);
      setUnreadCount(0);
    }

    // Cleanup on unmount
    return () => {
      disconnectAll();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, user]);

  /**
   * Load initial notifications from API
   */
  const loadInitialNotifications = useCallback(async () => {
    try {
      const response = await notificationService.getNotifications({
        limit: 20,
      });
      setNotifications(response.results);

      const count = response.results.filter((n) => !n.is_read).length;
      setUnreadCount(count);
    } catch (error) {
      console.error("Failed to load initial notifications:", error);
    }
  }, []);

  /**
   * Add a new notification (from WebSocket)
   */
  const addNotification = useCallback((notification: Notification) => {
    setNotifications((prev) => [notification, ...prev]);

    if (!notification.is_read) {
      setUnreadCount((prev) => prev + 1);

      // Show toast notification
      antMessage.info({
        content: notification.title,
        duration: 4,
      });
    }
  }, []);

  /**
   * Mark a notification as read
   */
  const markAsRead = useCallback((id: number) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
    );
    setUnreadCount((prev) => Math.max(0, prev - 1));
  }, []);

  /**
   * Mark all notifications as read
   */
  const markAllAsRead = useCallback(() => {
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    setUnreadCount(0);
  }, []);

  /**
   * Remove a notification
   */
  const removeNotification = useCallback((id: number) => {
    setNotifications((prev) => {
      const notification = prev.find((n) => n.id === id);
      const newNotifications = prev.filter((n) => n.id !== id);

      // Update unread count if the removed notification was unread
      if (notification && !notification.is_read) {
        setUnreadCount((prevCount) => Math.max(0, prevCount - 1));
      }

      return newNotifications;
    });
  }, []);

  // Start heartbeat to keep connections alive
  useEffect(() => {
    if (isAuthenticated) {
      heartbeatInterval.current = window.setInterval(() => {
        if (webSocketService.isConnected("ws/notifications/")) {
          webSocketService.ping("ws/notifications/");
        }
        if (
          currentProjectId.current &&
          webSocketService.isConnected(
            `ws/projects/${currentProjectId.current}/tickets/`
          )
        ) {
          webSocketService.ping(
            `ws/projects/${currentProjectId.current}/tickets/`
          );
        }
        if (
          currentProjectId.current &&
          webSocketService.isConnected(
            `ws/projects/${currentProjectId.current}/presence/`
          )
        ) {
          webSocketService.ping(
            `ws/projects/${currentProjectId.current}/presence/`
          );
        }
      }, 30000); // Ping every 30 seconds

      return () => {
        if (heartbeatInterval.current) {
          window.clearInterval(heartbeatInterval.current);
        }
      };
    }
  }, [isAuthenticated]);

  // Disconnect functions (defined first so connect functions can use them)
  const disconnectNotifications = useCallback(() => {
    webSocketService.disconnect("ws/notifications/");
    setIsNotificationConnected(false);
  }, []);

  const disconnectTickets = useCallback(() => {
    if (currentProjectId.current) {
      webSocketService.disconnect(
        `ws/projects/${currentProjectId.current}/tickets/`
      );
      setIsTicketConnected(false);
    }
  }, []);

  const disconnectPresence = useCallback(() => {
    if (currentProjectId.current) {
      webSocketService.disconnect(
        `ws/projects/${currentProjectId.current}/presence/`
      );
      setIsPresenceConnected(false);
    }
  }, []);

  const disconnectAll = useCallback(() => {
    webSocketService.disconnectAll();
    setIsNotificationConnected(false);
    setIsTicketConnected(false);
    setIsPresenceConnected(false);
    currentProjectId.current = null;
  }, []);

  // Connect functions
  const connectNotifications = useCallback(() => {
    if (!isAuthenticated) {
      console.warn(
        "⚠️ [WebSocketContext] Cannot connect notifications: not authenticated"
      );
      return;
    }

    const ws = webSocketService.connect(
      "ws/notifications/",
      (data) => {
        console.log("📨 [WebSocketContext] Notification:", data);

        // Handle different notification events
        if (data.type === "notification" && data.data) {
          // New notification received - notification is in data.data
          addNotification(data.data);
        } else if (data.type === "notification_read" && data.notification_id) {
          // Notification marked as read
          markAsRead(data.notification_id);
        }
      },
      (error) => {
        console.error("❌ [WebSocketContext] Notification error:", error);
        setIsNotificationConnected(false);
      },
      (event) => {
        console.log("🔌 [WebSocketContext] Notification disconnected:", event);
        setIsNotificationConnected(false);
      }
    );

    if (ws) {
      setIsNotificationConnected(true);
    }
  }, [isAuthenticated, addNotification, markAsRead]);

  const connectTickets = useCallback(
    (projectId: number) => {
      if (!isAuthenticated) {
        console.warn(
          "⚠️ [WebSocketContext] Cannot connect tickets: not authenticated"
        );
        return;
      }

      // Disconnect from previous project if exists
      if (currentProjectId.current && currentProjectId.current !== projectId) {
        disconnectTickets();
        disconnectPresence();
      }

      currentProjectId.current = projectId;

      const ws = webSocketService.connect(
        `ws/projects/${projectId}/tickets/`,
        (data) => {
          console.log("📨 [WebSocketContext] Ticket update:", data);
          // Ticket updates will be handled by custom hooks
        },
        (error) => {
          console.error("❌ [WebSocketContext] Ticket error:", error);
          setIsTicketConnected(false);
        },
        (event) => {
          console.log("🔌 [WebSocketContext] Ticket disconnected:", event);
          setIsTicketConnected(false);
        }
      );

      if (ws) {
        setIsTicketConnected(true);
      }
    },
    [isAuthenticated, disconnectTickets, disconnectPresence]
  );

  const connectPresence = useCallback(
    (projectId: number) => {
      if (!isAuthenticated) {
        console.warn(
          "⚠️ [WebSocketContext] Cannot connect presence: not authenticated"
        );
        return;
      }

      currentProjectId.current = projectId;

      const ws = webSocketService.connect(
        `ws/projects/${projectId}/presence/`,
        (data) => {
          console.log("📨 [WebSocketContext] Presence update:", data);
          // Presence updates will be handled by custom hooks
        },
        (error) => {
          console.error("❌ [WebSocketContext] Presence error:", error);
          setIsPresenceConnected(false);
        },
        (event) => {
          console.log("🔌 [WebSocketContext] Presence disconnected:", event);
          setIsPresenceConnected(false);
        }
      );

      if (ws) {
        setIsPresenceConnected(true);
      }
    },
    [isAuthenticated]
  );

  // Send functions
  const sendNotificationMessage = useCallback((data: any): boolean => {
    return webSocketService.send("ws/notifications/", data);
  }, []);

  const sendTicketMessage = useCallback((data: any): boolean => {
    if (!currentProjectId.current) return false;
    return webSocketService.send(
      `ws/projects/${currentProjectId.current}/tickets/`,
      data
    );
  }, []);

  const sendPresenceMessage = useCallback((data: any): boolean => {
    if (!currentProjectId.current) return false;
    return webSocketService.send(
      `ws/projects/${currentProjectId.current}/presence/`,
      data
    );
  }, []);

  const value: WebSocketContextType = {
    isNotificationConnected,
    isTicketConnected,
    isPresenceConnected,
    connectNotifications,
    connectTickets,
    connectPresence,
    disconnectNotifications,
    disconnectTickets,
    disconnectPresence,
    disconnectAll,
    sendNotificationMessage,
    sendTicketMessage,
    sendPresenceMessage,
    notifications,
    unreadCount,
    addNotification,
    markAsRead,
    markAllAsRead,
    removeNotification,
  };

  return (
    <WebSocketContext.Provider value={value}>
      {children}
    </WebSocketContext.Provider>
  );
};

export const useWebSocketContext = (): WebSocketContextType => {
  const context = useContext(WebSocketContext);
  if (context === undefined) {
    throw new Error(
      "useWebSocketContext must be used within a WebSocketProvider"
    );
  }
  return context;
};
