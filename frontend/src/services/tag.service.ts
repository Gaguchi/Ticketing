/**
 * Tag Service
 * Handles all tag-related API calls
 */

import { apiService } from './api.service';
import { API_ENDPOINTS } from '../config/api';
import type {
  Tag,
  CreateTagData,
  UpdateTagData,
  AddContactToTagData,
  PaginatedResponse,
  PaginationParams,
} from '../types/api';

class TagService {
  /**
   * Get all tags with pagination (optionally filtered by project)
   */
  async getTags(projectId?: number, params?: PaginationParams): Promise<PaginatedResponse<Tag>> {
    const queryParams = new URLSearchParams();
    if (projectId) queryParams.append('project', projectId.toString());
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.page_size) queryParams.append('page_size', params.page_size.toString());
    
    const url = queryParams.toString()
      ? `${API_ENDPOINTS.TAGS}?${queryParams.toString()}`
      : API_ENDPOINTS.TAGS;
    
    return apiService.get<PaginatedResponse<Tag>>(url);
  }

  /**
   * Get all tags (unpaginated)
   */
  async getAllTags(projectId?: number): Promise<Tag[]> {
    const response = await this.getTags(projectId, { page_size: 1000 });
    return response.results;
  }

  /**
   * Get a single tag by ID
   */
  async getTag(id: number): Promise<Tag> {
    return apiService.get<Tag>(API_ENDPOINTS.TAG_DETAIL(id));
  }

  /**
   * Create a new tag
   */
  async createTag(data: CreateTagData): Promise<Tag> {
    return apiService.post<Tag>(API_ENDPOINTS.TAGS, data);
  }

  /**
   * Update a tag
   */
  async updateTag(id: number, data: UpdateTagData): Promise<Tag> {
    return apiService.patch<Tag>(API_ENDPOINTS.TAG_DETAIL(id), data);
  }

  /**
   * Delete a tag
   */
  async deleteTag(id: number): Promise<void> {
    return apiService.delete(API_ENDPOINTS.TAG_DETAIL(id));
  }

  /**
   * Add contact to tag
   */
  async addContact(id: number, data: AddContactToTagData): Promise<Tag> {
    return apiService.post<Tag>(API_ENDPOINTS.TAG_ADD_CONTACT(id), data);
  }

  /**
   * Remove contact from tag
   */
  async removeContact(id: number, contactId: number): Promise<Tag> {
    return apiService.post<Tag>(API_ENDPOINTS.TAG_REMOVE_CONTACT(id), { contact_id: contactId });
  }
}

export const tagService = new TagService();
export default tagService;
