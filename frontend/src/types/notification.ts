/**
 * Notification Types
 * TypeScript interfaces for the notification system
 */

export interface NotificationUser {
  id: number;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
}

export interface Notification {
  id: number;
  user: NotificationUser;
  type: 'ticket_assigned' | 'ticket_created' | 'ticket_updated' | 'comment_added' | 'mention' | 'status_changed' | 'priority_changed' | 'general';
  title: string;
  message: string;
  link?: string;
  is_read: boolean;
  data: Record<string, any>;
  created_at: string;
}

export interface NotificationCreate {
  notification_type: string;
  title: string;
  message: string;
  link?: string;
  data?: Record<string, any>;
}

export interface NotificationListResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: Notification[];
}

export interface UnreadCountResponse {
  unread_count: number;
}

export interface MarkAllReadResponse {
  success: boolean;
  updated_count: number;
  message: string;
}
