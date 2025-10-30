/**
 * Attachment Service
 * Handles file uploads and attachment-related API calls
 */

import { apiService } from './api.service';
import { API_ENDPOINTS } from '../config/api';
import type {
  Attachment,
  UploadAttachmentData,
  PaginatedResponse,
  PaginationParams,
} from '../types/api';

class AttachmentService {
  /**
   * Get attachments for a ticket with pagination
   */
  async getAttachments(ticketId: number, params?: PaginationParams): Promise<PaginatedResponse<Attachment>> {
    const queryParams = new URLSearchParams();
    queryParams.append('ticket', ticketId.toString());
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.page_size) queryParams.append('page_size', params.page_size.toString());
    
    const url = `${API_ENDPOINTS.ATTACHMENTS}?${queryParams.toString()}`;
    return apiService.get<PaginatedResponse<Attachment>>(url);
  }

  /**
   * Get all attachments for a ticket (unpaginated)
   */
  async getAllAttachments(ticketId: number): Promise<Attachment[]> {
    const response = await this.getAttachments(ticketId, { page_size: 1000 });
    return response.results;
  }

  /**
   * Get a single attachment by ID
   */
  async getAttachment(id: number): Promise<Attachment> {
    return apiService.get<Attachment>(API_ENDPOINTS.ATTACHMENT_DETAIL(id));
  }

  /**
   * Upload a file attachment
   */
  async uploadAttachment(data: UploadAttachmentData): Promise<Attachment> {
    const formData = new FormData();
    formData.append('ticket', data.ticket.toString());
    formData.append('file', data.file);
    if (data.filename) {
      formData.append('filename', data.filename);
    }
    
    return apiService.postFormData<Attachment>(API_ENDPOINTS.ATTACHMENTS, formData);
  }

  /**
   * Delete an attachment
   */
  async deleteAttachment(id: number): Promise<void> {
    return apiService.delete(API_ENDPOINTS.ATTACHMENT_DETAIL(id));
  }
}

export const attachmentService = new AttachmentService();
export default attachmentService;
