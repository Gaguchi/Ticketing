/**
 * API Service
 * Handles all API requests with proper error handling and type safety
 */

import { API_ENDPOINTS, API_HEADERS, API_CONFIG } from '../config/api';

export interface APIError {
  message: string;
  status?: number;
  details?: any;
}

class APIService {
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
        ...options.headers,
      },
      credentials: API_CONFIG.withCredentials ? 'include' : 'same-origin',
    };

    try {
      const response = await fetch(url, config);

      if (!response.ok) {
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
