/**
 * Comment Service
 * Handles all comment-related API calls
 */

import { apiService } from './api.service';
import { API_ENDPOINTS } from '../config/api';
import type {
  Comment,
  CreateCommentData,
  UpdateCommentData,
  PaginatedResponse,
  PaginationParams,
} from '../types/api';

class CommentService {
  /**
   * Get comments for a ticket with pagination
   */
  async getComments(ticketId: number, params?: PaginationParams): Promise<PaginatedResponse<Comment>> {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.page_size) queryParams.append('page_size', params.page_size.toString());
    
    const url = params && (params.page || params.page_size)
      ? `${API_ENDPOINTS.TICKET_COMMENTS(ticketId)}?${queryParams.toString()}`
      : API_ENDPOINTS.TICKET_COMMENTS(ticketId);
    return apiService.get<PaginatedResponse<Comment>>(url);
  }

  /**
   * Get all comments for a ticket (unpaginated)
   */
  async getAllComments(ticketId: number): Promise<Comment[]> {
    const response = await this.getComments(ticketId, { page_size: 1000 });
    return response.results;
  }

  /**
   * Get a single comment by ID
   */
  async getComment(ticketId: number, commentId: number): Promise<Comment> {
    return apiService.get<Comment>(API_ENDPOINTS.TICKET_COMMENT_DETAIL(ticketId, commentId));
  }

  /**
   * Create a new comment
   */
  async createComment(ticketId: number, data: Omit<CreateCommentData, 'ticket'>): Promise<Comment> {
    return apiService.post<Comment>(API_ENDPOINTS.TICKET_COMMENTS(ticketId), data);
  }

  /**
   * Update a comment
   */
  async updateComment(ticketId: number, commentId: number, data: UpdateCommentData): Promise<Comment> {
    return apiService.patch<Comment>(API_ENDPOINTS.TICKET_COMMENT_DETAIL(ticketId, commentId), data);
  }

  /**
   * Delete a comment
   */
  async deleteComment(ticketId: number, commentId: number): Promise<void> {
    return apiService.delete(API_ENDPOINTS.TICKET_COMMENT_DETAIL(ticketId, commentId));
  }
}

export const commentService = new CommentService();
export default commentService;
