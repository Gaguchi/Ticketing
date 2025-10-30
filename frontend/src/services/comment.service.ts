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
    queryParams.append('ticket', ticketId.toString());
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.page_size) queryParams.append('page_size', params.page_size.toString());
    
    const url = `${API_ENDPOINTS.COMMENTS}?${queryParams.toString()}`;
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
  async getComment(id: number): Promise<Comment> {
    return apiService.get<Comment>(API_ENDPOINTS.COMMENT_DETAIL(id));
  }

  /**
   * Create a new comment
   */
  async createComment(data: CreateCommentData): Promise<Comment> {
    return apiService.post<Comment>(API_ENDPOINTS.COMMENTS, data);
  }

  /**
   * Update a comment
   */
  async updateComment(id: number, data: UpdateCommentData): Promise<Comment> {
    return apiService.patch<Comment>(API_ENDPOINTS.COMMENT_DETAIL(id), data);
  }

  /**
   * Delete a comment
   */
  async deleteComment(id: number): Promise<void> {
    return apiService.delete(API_ENDPOINTS.COMMENT_DETAIL(id));
  }
}

export const commentService = new CommentService();
export default commentService;
