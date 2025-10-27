/**
 * Tag Service
 * Handles all tag-related API calls
 */

import { apiService } from './api.service';
import { API_ENDPOINTS } from '../config/api';

export interface Tag {
  id: number;
  name: string;
  description?: string;
  color: string;
  project: number;
  project_name?: string;
  tickets_count?: number;
  contacts_count?: number;
  created_at: string;
  updated_at: string;
}

export interface CreateTagData {
  name: string;
  description?: string;
  color?: string;
  project: number;
}

class TagService {
  /**
   * Get all tags (optionally filtered by project)
   */
  async getTags(projectId?: number): Promise<Tag[]> {
    const url = projectId 
      ? `${API_ENDPOINTS.TAGS}?project=${projectId}`
      : API_ENDPOINTS.TAGS;
    return apiService.get<Tag[]>(url);
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
  async updateTag(id: number, data: Partial<CreateTagData>): Promise<Tag> {
    return apiService.patch<Tag>(API_ENDPOINTS.TAG_DETAIL(id), data);
  }

  /**
   * Delete a tag
   */
  async deleteTag(id: number): Promise<void> {
    return apiService.delete(API_ENDPOINTS.TAG_DETAIL(id));
  }
}

export const tagService = new TagService();
export default tagService;
