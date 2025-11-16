/**
 * API Service
 * Handles all API requests with proper error handling and type safety
 */

import { API_HEADERS, API_CONFIG, API_BASE_URL } from '../config/api';
import { tokenInterceptor } from '../utils/token-interceptor';

export interface APIError {
  message: string;
  status?: number;
  details?: any;
}

class APIService {
  private isDevelopment = import.meta.env.DEV;

  /**
   * Build full URL from relative path
   * In development: use relative URLs (Vite proxy handles routing)
   * In production: prepend API_BASE_URL
   */
  private buildUrl(path: string): string {
    // If already an absolute URL, return as-is
    if (path.startsWith('http://') || path.startsWith('https://')) {
      return path;
    }
    
    // In development, use relative URLs (Vite dev server proxy)
    if (this.isDevelopment) {
      return path;
    }
    
    // In production, prepend API_BASE_URL
    return `${API_BASE_URL}${path}`;
  }

  /**
   * Get authorization header with JWT token
   */
  private getAuthHeader(): Record<string, string> {
    const token = localStorage.getItem('access_token');
    return token ? { Authorization: `Bearer ${token}` } : {};
  }

  /**
   * Get project header for project-scoped requests
   */
  private getProjectHeader(): Record<string, string> {
    const projectId = localStorage.getItem('selectedProjectId');
    return projectId ? { 'X-Project-ID': projectId } : {};
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
    
    // Build full URL (adds base URL in production)
    const fullUrl = this.buildUrl(url);
    
    // For FormData, don't include default API_HEADERS (especially Content-Type)
    // Let the browser set Content-Type with the correct boundary
    const isFormData = options.body instanceof FormData;
    
    const config: RequestInit = {
      ...options,
      headers: {
        ...(isFormData ? {} : API_HEADERS),
        ...this.getAuthHeader(),
        ...this.getProjectHeader(),
        ...options.headers,
      },
      credentials: API_CONFIG.withCredentials ? 'include' : 'same-origin',
    };

    // Log the request
    this.logRequest(fullUrl, config);

    try {
      const response = await fetch(fullUrl, config);
      const duration = Math.round(performance.now() - startTime);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        this.logResponse(fullUrl, response, errorData, duration);

        // Check if this is a token refresh endpoint - don't retry these
        const isRefreshEndpoint = url.includes('/auth/token/refresh/');
        const isLoginEndpoint = url.includes('/auth/login/') || url.includes('/auth/register/');

        // Handle 401 Unauthorized or 403 Forbidden (invalid/expired token)
        // Django can return 403 with "token_not_valid" error code
        if (
          (response.status === 401 || 
          (response.status === 403 && errorData.code === 'token_not_valid')) &&
          !isRefreshEndpoint &&
          !isLoginEndpoint
        ) {
          console.log(`🔒 [APIService] ${response.status} error detected, attempting token refresh...`);
          
          // Use token interceptor to handle refresh and retry
          return await tokenInterceptor.handle401Error(
            () => this.request<T>(url, options),
            url
          );
        }

        // If refresh endpoint failed, logout immediately
        if (isRefreshEndpoint && (response.status === 401 || response.status === 403)) {
          console.error('❌ [APIService] Refresh token invalid, logging out...');
          const { default: authService } = await import('./auth.service');
          authService.logout();
          window.location.href = '/login';
        }
        
        throw {
          message: errorData.detail || errorData.message || `HTTP Error: ${response.status}`,
          status: response.status,
          details: errorData,
        } as APIError;
      }

      // Handle 204 No Content
      if (response.status === 204) {
        this.logResponse(fullUrl, response, {}, duration);
        return {} as T;
      }

      const data = await response.json();
      this.logResponse(fullUrl, response, data, duration);
      return data;
    } catch (error) {
      const duration = Math.round(performance.now() - startTime);
      this.logError(fullUrl, error, duration);
      
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
   * POST request with FormData (for file uploads)
   */
  async postFormData<T>(url: string, formData: FormData): Promise<T> {
    // Don't set Content-Type header for FormData - browser will set it with boundary
    const authHeader = this.getAuthHeader();
    const projectHeader = this.getProjectHeader();
    
    return this.request<T>(url, {
      method: 'POST',
      body: formData,
      headers: {
        ...authHeader,
        ...projectHeader,
        // Don't include Content-Type for FormData
      },
    });
  }

  /**
   * PATCH request with FormData (for file uploads)
   */
  async patchFormData<T>(url: string, formData: FormData): Promise<T> {
    // Don't set Content-Type header for FormData - browser will set it with boundary
    const authHeader = this.getAuthHeader();
    const projectHeader = this.getProjectHeader();
    
    return this.request<T>(url, {
      method: 'PATCH',
      body: formData,
      headers: {
        ...authHeader,
        ...projectHeader,
        // Don't include Content-Type for FormData
      },
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
