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
  private isDevelopment = import.meta.env.DEV;

  /**
   * Get authorization header with JWT token
   */
  private getAuthHeader(): Record<string, string> {
    const token = localStorage.getItem('access_token');
    return token ? { Authorization: `Bearer ${token}` } : {};
  }

  /**
   * Log API request details (only in development)
   */
  private logRequest(url: string, config: RequestInit) {
    if (this.isDevelopment) {
      console.group(`🌐 API Request: ${config.method || 'GET'} ${url}`);
      console.log('URL:', url);
      console.log('Method:', config.method || 'GET');
      console.log('Headers:', config.headers);
      if (config.body) {
        console.log('Body:', JSON.parse(config.body as string));
      }
      console.log('Timestamp:', new Date().toISOString());
      console.groupEnd();
    }
  }

  /**
   * Log API response details (only in development)
   */
  private logResponse(url: string, response: Response, data: any, duration: number) {
    if (this.isDevelopment) {
      const emoji = response.ok ? '✅' : '❌';
      console.group(`${emoji} API Response: ${response.status} ${url}`);
      console.log('Status:', response.status, response.statusText);
      console.log('Duration:', `${duration}ms`);
      console.log('Headers:', Object.fromEntries(response.headers.entries()));
      console.log('Data:', data);
      console.log('Timestamp:', new Date().toISOString());
      console.groupEnd();
    }
  }

  /**
   * Log API error details (only in development)
   */
  private logError(url: string, error: any, duration: number) {
    if (this.isDevelopment) {
      console.group(`🔴 API Error: ${url}`);
      console.error('Error:', error);
      console.log('Duration:', `${duration}ms`);
      console.log('Timestamp:', new Date().toISOString());
      console.groupEnd();
    }
  }

  /**
   * Generic fetch wrapper with error handling
   */
  private async request<T>(
    url: string,
    options: RequestInit = {}
  ): Promise<T> {
    const startTime = performance.now();
    
    const config: RequestInit = {
      ...options,
      headers: {
        ...API_HEADERS,
        ...this.getAuthHeader(),
        ...options.headers,
      },
      credentials: API_CONFIG.withCredentials ? 'include' : 'same-origin',
    };

    // Log the request
    this.logRequest(url, config);

    try {
      const response = await fetch(url, config);
      const duration = Math.round(performance.now() - startTime);

      if (!response.ok) {
        // Handle 401 Unauthorized - logout and redirect to login
        if (response.status === 401) {
          const errorData = await response.json().catch(() => ({}));
          this.logResponse(url, response, errorData, duration);
          
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
        this.logResponse(url, response, errorData, duration);
        
        throw {
          message: errorData.detail || errorData.message || `HTTP Error: ${response.status}`,
          status: response.status,
          details: errorData,
        } as APIError;
      }

      // Handle 204 No Content
      if (response.status === 204) {
        this.logResponse(url, response, {}, duration);
        return {} as T;
      }

      const data = await response.json();
      this.logResponse(url, response, data, duration);
      return data;
    } catch (error) {
      const duration = Math.round(performance.now() - startTime);
      this.logError(url, error, duration);
      
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
