/**
 * Chat Service
 * Handles API calls for chat functionality
 */

import apiService from './api.service';
import { API_BASE_URL } from '../config/api';
import type {
  ChatRoom,
  ChatRoomCreate,
  ChatMessage,
  ChatMessageCreate,
  ChatMessageUpdate,
} from '../types/chat';

class ChatService {
  private readonly BASE_URL = API_BASE_URL ? `${API_BASE_URL}/api/chat` : '/api/chat';

  /**
   * Get all chat rooms for the current user
   */
  async getRooms(projectId?: number): Promise<ChatRoom[]> {
    const url = projectId
      ? `${this.BASE_URL}/rooms/?project=${projectId}`
      : `${this.BASE_URL}/rooms/`;
    const response = await apiService.get<{ count: number; results: ChatRoom[] }>(url);
    return response.results;
  }

  /**
   * Get a specific chat room by ID
   */
  async getRoom(roomId: number): Promise<ChatRoom> {
    return await apiService.get<ChatRoom>(`${this.BASE_URL}/rooms/${roomId}/`);
  }

  /**
   * Create a new chat room
   */
  async createRoom(data: ChatRoomCreate): Promise<ChatRoom> {
    return await apiService.post<ChatRoom>(`${this.BASE_URL}/rooms/`, data);
  }

  /**
   * Delete a chat room
   */
  async deleteRoom(roomId: number): Promise<void> {
    await apiService.delete(`${this.BASE_URL}/rooms/${roomId}/`);
  }

  /**
   * Add a participant to a room
   */
  async addParticipant(roomId: number, userId: number): Promise<void> {
    await apiService.post(`${this.BASE_URL}/rooms/${roomId}/add_participant/`, {
      user_id: userId,
    });
  }

  /**
   * Remove a participant from a room
   */
  async removeParticipant(roomId: number, userId: number): Promise<void> {
    await apiService.post(`${this.BASE_URL}/rooms/${roomId}/remove_participant/`, {
      user_id: userId,
    });
  }

  /**
   * Mark all messages in a room as read
   */
  async markRoomAsRead(roomId: number): Promise<void> {
    await apiService.post(`${this.BASE_URL}/rooms/${roomId}/mark_read/`);
  }

  /**
   * Get messages for a room with cursor-based pagination.
   * 
   * Industry-standard infinite scroll pattern:
   * - Initial load: No cursor, returns latest messages
   * - Load older: Use 'before' cursor from previous response
   * - Sync newer: Use 'after' cursor (for reconnection)
   * 
   * @param roomId - The room to fetch messages from
   * @param options.limit - Number of messages (default: 50, max: 100)
   * @param options.before - Cursor to load older messages
   * @param options.after - Cursor to load newer messages (sync)
   */
  async getMessages(
    roomId: number,
    options?: { limit?: number; before?: number; after?: number }
  ): Promise<{ messages: ChatMessage[]; hasMore: boolean; cursor: number | null }> {
    const params = new URLSearchParams({ room: roomId.toString() });

    if (options?.limit) {
      params.append('limit', options.limit.toString());
    }
    if (options?.before) {
      params.append('before', options.before.toString());
    }
    if (options?.after) {
      params.append('after', options.after.toString());
    }

    const response = await apiService.get<{
      messages: ChatMessage[];
      has_more: boolean;
      cursor: number | null;
    }>(`${this.BASE_URL}/messages/?${params.toString()}`);

    return {
      messages: response.messages,
      hasMore: response.has_more,
      cursor: response.cursor,
    };
  }

  /**
   * Send a new message
   */
  async sendMessage(data: ChatMessageCreate): Promise<ChatMessage> {
    if (data.attachment) {
      // Use FormData for file uploads
      const formData = new FormData();
      formData.append('room', data.room.toString());
      formData.append('content', data.content);
      if (data.type) {
        formData.append('type', data.type);
      }
      formData.append('attachment', data.attachment);

      return await apiService.postFormData<ChatMessage>(
        `${this.BASE_URL}/messages/`,
        formData
      );
    } else {
      return await apiService.post<ChatMessage>(`${this.BASE_URL}/messages/`, {
        room: data.room,
        content: data.content,
        type: data.type || 'text',
      });
    }
  }

  /**
   * Edit a message
   */
  async editMessage(messageId: number, data: ChatMessageUpdate): Promise<ChatMessage> {
    return await apiService.patch<ChatMessage>(
      `${this.BASE_URL}/messages/${messageId}/`,
      data
    );
  }

  /**
   * Delete a message
   */
  async deleteMessage(messageId: number): Promise<void> {
    await apiService.delete(`${this.BASE_URL}/messages/${messageId}/`);
  }

  /**
   * Add a reaction to a message
   */
  async addReaction(messageId: number, emoji: string): Promise<void> {
    await apiService.post(`${this.BASE_URL}/messages/${messageId}/add_reaction/`, {
      emoji,
    });
  }

  /**
   * Remove a reaction from a message
   */
  async removeReaction(messageId: number, emoji: string): Promise<void> {
    await apiService.post(`${this.BASE_URL}/messages/${messageId}/remove_reaction/`, {
      emoji,
    });
  }

  /**
   * Search messages
   */
  async searchMessages(query: string, roomId?: number): Promise<ChatMessage[]> {
    let url = `${this.BASE_URL}/messages/?search=${encodeURIComponent(query)}`;
    if (roomId) {
      url += `&room=${roomId}`;
    }
    const response = await apiService.get<{ count: number; results: ChatMessage[] }>(url);
    return response.results;
  }

  /**
   * Get the chat room for a specific ticket
   * @returns The chat room if it exists, null otherwise
   */
  async getTicketChatRoom(ticketId: number): Promise<ChatRoom | null> {
    try {
      const room = await apiService.get<ChatRoom>(
        `${this.BASE_URL}/rooms/for_ticket/?ticket_id=${ticketId}`
      );
      return room;
    } catch (error: any) {
      if (error?.response?.status === 404 || error?.status === 404) {
        return null;
      }
      throw error;
    }
  }

  /**
   * Create a chat room for a specific ticket
   * Returns existing room if one already exists
   */
  async createTicketChatRoom(ticketId: number): Promise<ChatRoom> {
    return await apiService.post<ChatRoom>(
      `${this.BASE_URL}/rooms/create_for_ticket/`,
      { ticket_id: ticketId }
    );
  }
}

export const chatService = new ChatService();
export default chatService;
