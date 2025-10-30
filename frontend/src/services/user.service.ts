/**
 * User Management Service
 * Handles user CRUD and role management operations
 */

import { apiService } from './api.service';
import { API_ENDPOINTS } from '../config/api';
import type {
  User,
  PaginatedResponse,
  PaginationParams,
  MessageResponse,
} from '../types/api';

export interface AssignRoleData {
  role: 'superadmin' | 'admin' | 'user' | 'manager';
}

export interface SetPasswordData {
  password: string;
  password_confirm: string;
}

class UserService {
  /**
   * Get all users with pagination
   */
  async getUsers(params?: PaginationParams): Promise<PaginatedResponse<User>> {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.page_size) queryParams.append('page_size', params.page_size.toString());
    
    const url = queryParams.toString()
      ? `${API_ENDPOINTS.USERS}?${queryParams.toString()}`
      : API_ENDPOINTS.USERS;
    
    return apiService.get<PaginatedResponse<User>>(url);
  }

  /**
   * Get all users (unpaginated)
   */
  async getAllUsers(): Promise<User[]> {
    const response = await this.getUsers({ page_size: 1000 });
    return response.results;
  }

  /**
   * Get a single user by ID
   */
  async getUser(id: number): Promise<User> {
    return apiService.get<User>(API_ENDPOINTS.USER_DETAIL(id));
  }

  /**
   * Assign role to user
   */
  async assignRole(id: number, data: AssignRoleData): Promise<User> {
    return apiService.post<User>(API_ENDPOINTS.USER_ASSIGN_ROLE(id), data);
  }

  /**
   * Remove role from user
   */
  async removeRole(id: number, role: string): Promise<User> {
    return apiService.post<User>(API_ENDPOINTS.USER_REMOVE_ROLE(id), { role });
  }

  /**
   * Set user password (admin operation)
   */
  async setPassword(id: number, data: SetPasswordData): Promise<MessageResponse> {
    return apiService.post<MessageResponse>(API_ENDPOINTS.USER_SET_PASSWORD(id), data);
  }

  /**
   * Toggle user active status
   */
  async toggleActive(id: number): Promise<User> {
    return apiService.post<User>(API_ENDPOINTS.USER_TOGGLE_ACTIVE(id));
  }

  /**
   * Get user roles
   */
  async getUserRoles(id: number): Promise<{ roles: string[] }> {
    return apiService.get<{ roles: string[] }>(API_ENDPOINTS.USER_ROLES(id));
  }
}

export const userService = new UserService();
export default userService;
