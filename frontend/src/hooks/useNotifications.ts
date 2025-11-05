/**
 * useNotifications Hook
 * React hook for real-time notifications
 */

import { useEffect, useState, useCallback } from 'react';
import { webSocketService } from '../services/websocket.service';
import { message as antdMessage } from 'antd';

export interface Notification {
  id: string;
  type: 'ticket_assigned' | 'ticket_updated' | 'comment_added' | 'mention' | 'general';
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  data?: any;
}

interface UseNotificationsReturn {
  notifications: Notification[];
  unreadCount: number;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  clearAll: () => void;
}

/**
 * Hook to manage real-time notifications
 * 
 * @example
 * const { notifications, unreadCount, markAsRead } = useNotifications();
 */
export function useNotifications(): UseNotificationsReturn {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  // Subscribe to notification WebSocket
  useEffect(() => {
    const handleNotification = (data: any) => {
      console.log('📨 [useNotifications] Received:', data);

      // Handle connection messages
      if (data.type === 'connection_established') {
        console.log('✅ [useNotifications] Connected to notification stream');
        return;
      }

      // Handle notification messages
      if (data.type === 'notification') {
        const newNotification: Notification = {
          id: data.data.id || `notif-${Date.now()}`,
          type: data.data.notification_type || 'general',
          title: data.data.title || 'Notification',
          message: data.data.message || '',
          timestamp: data.data.timestamp || new Date().toISOString(),
          read: false,
          data: data.data,
        };

        // Add to notifications list
        setNotifications((prev) => [newNotification, ...prev]);

        // Show toast notification
        showToastNotification(newNotification);
      }

      // Handle pong (heartbeat response)
      if (data.type === 'pong') {
        console.log('💓 [useNotifications] Heartbeat received');
      }
    };

    // Subscribe to notification messages
    const unsubscribe = webSocketService.subscribe('ws/notifications/', handleNotification);

    return () => {
      unsubscribe();
    };
  }, []);

  const showToastNotification = (notification: Notification) => {
    const key = `notif-${notification.id}`;
    
    switch (notification.type) {
      case 'ticket_assigned':
        antdMessage.info({
          content: notification.message,
          duration: 5,
          key,
        });
        break;
      
      case 'ticket_updated':
        antdMessage.info({
          content: notification.message,
          duration: 4,
          key,
        });
        break;
      
      case 'comment_added':
        antdMessage.open({
          content: notification.message,
          duration: 5,
          key,
        });
        break;
      
      case 'mention':
        antdMessage.warning({
          content: notification.message,
          duration: 6,
          key,
        });
        break;
      
      default:
        antdMessage.info({
          content: notification.message,
          duration: 4,
          key,
        });
    }
  };

  const markAsRead = useCallback((id: string) => {
    setNotifications((prev) =>
      prev.map((notif) =>
        notif.id === id ? { ...notif, read: true } : notif
      )
    );

    // Send mark_read message to backend
    webSocketService.send('ws/notifications/', {
      type: 'mark_read',
      notification_id: id,
    });
  }, []);

  const markAllAsRead = useCallback(() => {
    setNotifications((prev) =>
      prev.map((notif) => ({ ...notif, read: true }))
    );
  }, []);

  const clearAll = useCallback(() => {
    setNotifications([]);
  }, []);

  const unreadCount = notifications.filter((n) => !n.read).length;

  return {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    clearAll,
  };
}

export default useNotifications;
