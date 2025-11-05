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
} from "react";
import { webSocketService } from "../services/websocket.service";
import { useAuth } from "./AppContext";

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

  const currentProjectId = useRef<number | null>(null);
  const heartbeatInterval = useRef<number | null>(null);

  // Auto-connect to notifications when user logs in
  useEffect(() => {
    if (isAuthenticated && user) {
      console.log(
        "🔌 [WebSocketContext] User authenticated, connecting to notifications..."
      );
      connectNotifications();
    } else {
      console.log(
        "🔌 [WebSocketContext] User not authenticated, disconnecting all..."
      );
      disconnectAll();
    }

    // Cleanup on unmount
    return () => {
      disconnectAll();
    };
  }, [isAuthenticated, user]);

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

  const connectNotifications = () => {
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
        // Notifications will be handled by useNotifications hook
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
  };

  const connectTickets = (projectId: number) => {
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
  };

  const connectPresence = (projectId: number) => {
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
  };

  const disconnectNotifications = () => {
    webSocketService.disconnect("ws/notifications/");
    setIsNotificationConnected(false);
  };

  const disconnectTickets = () => {
    if (currentProjectId.current) {
      webSocketService.disconnect(
        `ws/projects/${currentProjectId.current}/tickets/`
      );
      setIsTicketConnected(false);
    }
  };

  const disconnectPresence = () => {
    if (currentProjectId.current) {
      webSocketService.disconnect(
        `ws/projects/${currentProjectId.current}/presence/`
      );
      setIsPresenceConnected(false);
    }
  };

  const disconnectAll = () => {
    webSocketService.disconnectAll();
    setIsNotificationConnected(false);
    setIsTicketConnected(false);
    setIsPresenceConnected(false);
    currentProjectId.current = null;
  };

  const sendNotificationMessage = (data: any): boolean => {
    return webSocketService.send("ws/notifications/", data);
  };

  const sendTicketMessage = (data: any): boolean => {
    if (!currentProjectId.current) return false;
    return webSocketService.send(
      `ws/projects/${currentProjectId.current}/tickets/`,
      data
    );
  };

  const sendPresenceMessage = (data: any): boolean => {
    if (!currentProjectId.current) return false;
    return webSocketService.send(
      `ws/projects/${currentProjectId.current}/presence/`,
      data
    );
  };

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
