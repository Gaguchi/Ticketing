/**
 * Notification Service
 * API service for managing notifications
 */

import { apiService } from './api.service';
import type {
  Notification,
  NotificationListResponse,
  UnreadCountResponse,
  MarkAllReadResponse,
} from '../types/notification';

class NotificationService {
  /**
   * Get paginated list of notifications for current user
   */
  async getNotifications(params?: {
    limit?: number;
    offset?: number;
  }): Promise<NotificationListResponse> {
    const queryParams = new URLSearchParams();
    
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.offset) queryParams.append('offset', params.offset.toString());
    
    const url = queryParams.toString()
      ? `/api/tickets/notifications/?${queryParams.toString()}`
      : '/api/tickets/notifications/';
    
    return await apiService.get<NotificationListResponse>(url);
  }

  /**
   * Get a specific notification by ID
   */
  async getNotification(id: number): Promise<Notification> {
    return await apiService.get<Notification>(
      `/api/tickets/notifications/${id}/`
    );
  }

  /**
   * Mark a notification as read
   */
  async markAsRead(id: number): Promise<Notification> {
    return await apiService.post<Notification>(
      `/api/tickets/notifications/${id}/mark_read/`
    );
  }

  /**
   * Mark all notifications as read for current user
   */
  async markAllAsRead(): Promise<MarkAllReadResponse> {
    return await apiService.post<MarkAllReadResponse>(
      '/api/tickets/notifications/mark_all_read/'
    );
  }

  /**
   * Delete a notification
   */
  async deleteNotification(id: number): Promise<void> {
    await apiService.delete(`/api/tickets/notifications/${id}/`);
  }

  /**
   * Get count of unread notifications
   */
  async getUnreadCount(): Promise<number> {
    const response = await apiService.get<UnreadCountResponse>(
      '/api/tickets/notifications/unread_count/'
    );
    return response.unread_count;
  }

  /**
   * Get recent unread notifications (for initial load)
   */
  async getRecentUnread(limit: number = 10): Promise<Notification[]> {
    const response = await this.getNotifications({ limit });
    return response.results.filter((n) => !n.is_read);
  }
}

export const notificationService = new NotificationService();
export default notificationService;

