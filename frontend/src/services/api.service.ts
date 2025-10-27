/**
 * API Service
 * Handles all API requests with proper error handling and type safety
 */

import { API_HEADERS, API_CONFIG } from '../config/api';

export interface APIError {
  message: string;
  status?: number;
  details?: any;
}

class APIService {
  /**
   * Get authorization header with JWT token
   */
  private getAuthHeader(): Record<string, string> {
    const token = localStorage.getItem('access_token');
    return token ? { Authorization: `Bearer ${token}` } : {};
  }

  /**
   * Generic fetch wrapper with error handling
   */
  private async request<T>(
    url: string,
    options: RequestInit = {}
  ): Promise<T> {
    const config: RequestInit = {
      ...options,
      headers: {
        ...API_HEADERS,
        ...this.getAuthHeader(),
        ...options.headers,
      },
      credentials: API_CONFIG.withCredentials ? 'include' : 'same-origin',
    };

    try {
      const response = await fetch(url, config);

      if (!response.ok) {
        // Handle 401 Unauthorized - logout and redirect to login
        if (response.status === 401) {
          // Import dynamically to avoid circular dependencies
          const { default: authService } = await import('./auth.service');
          authService.logout();
          window.location.href = '/login';
          throw {
            message: 'Session expired. Please login again.',
            status: 401,
            details: {}
          } as APIError;
        }

        const errorData = await response.json().catch(() => ({}));
        throw {
          message: errorData.detail || errorData.message || `HTTP Error: ${response.status}`,
          status: response.status,
          details: errorData,
        } as APIError;
      }

      // Handle 204 No Content
      if (response.status === 204) {
        return {} as T;
      }

      return await response.json();
    } catch (error) {
      if ((error as APIError).status) {
        throw error;
      }
      throw {
        message: 'Network error. Please check your connection.',
        details: error,
      } as APIError;
    }
  }

  /**
   * GET request
   */
  async get<T>(url: string): Promise<T> {
    return this.request<T>(url, {
      method: 'GET',
    });
  }

  /**
   * POST request
   */
  async post<T>(url: string, data?: any): Promise<T> {
    return this.request<T>(url, {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  /**
   * PUT request
   */
  async put<T>(url: string, data: any): Promise<T> {
    return this.request<T>(url, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  /**
   * PATCH request
   */
  async patch<T>(url: string, data: any): Promise<T> {
    return this.request<T>(url, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  /**
   * DELETE request
   */
  async delete<T>(url: string): Promise<T> {
    return this.request<T>(url, {
      method: 'DELETE',
    });
  }
}

export const apiService = new APIService();
export default apiService;
