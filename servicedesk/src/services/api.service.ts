import { API_HEADERS, API_BASE_URL } from '../config/api';

class ApiService {
  private isRefreshing = false;
  private refreshPromise: Promise<string | null> | null = null;

  private getAuthHeaders(url?: string): HeadersInit {
    // Don't send auth token for login endpoint to avoid 403 if token is invalid
    if (url && (url.includes('/auth/login/') || url.includes('/auth/token/refresh/'))) {
      return API_HEADERS;
    }

    const token = localStorage.getItem('access_token');
    return {
      ...API_HEADERS,
      ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    };
  }

  /**
   * Get the token refresh endpoint URL
   */
  private getRefreshEndpoint(): string {
    if (API_BASE_URL) {
      return `${API_BASE_URL}/api/tickets/auth/token/refresh/`;
    }
    return '/api/tickets/auth/token/refresh/';
  }

  /**
   * Attempt to refresh the access token using the refresh token
   */
  private async refreshToken(): Promise<string | null> {
    // If already refreshing, wait for that to complete
    if (this.isRefreshing && this.refreshPromise) {
      return this.refreshPromise;
    }

    const refreshToken = localStorage.getItem('refresh_token');
    if (!refreshToken) {
      console.error('❌ [ApiService] No refresh token available');
      return null;
    }

    this.isRefreshing = true;
    this.refreshPromise = (async () => {
      try {
        console.log('🔄 [ApiService] Attempting to refresh token...');
        const response = await fetch(this.getRefreshEndpoint(), {
          method: 'POST',
          headers: API_HEADERS,
          body: JSON.stringify({ refresh: refreshToken }),
        });

        if (!response.ok) {
          console.error('❌ [ApiService] Token refresh failed:', response.status);
          return null;
        }

        const data = await response.json();
        const newAccessToken = data.access;

        if (newAccessToken) {
          localStorage.setItem('access_token', newAccessToken);
          console.log('✅ [ApiService] Token refreshed successfully');
          return newAccessToken;
        }

        return null;
      } catch (error) {
        console.error('❌ [ApiService] Token refresh error:', error);
        return null;
      } finally {
        this.isRefreshing = false;
        this.refreshPromise = null;
      }
    })();

    return this.refreshPromise;
  }

  /**
   * Clear auth and redirect to login
   */
  private handleAuthFailure(): void {
    console.log('🔒 [ApiService] Auth failure, redirecting to login...');
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('user');
    window.location.href = '/login';
  }

  async request<T>(url: string, options: RequestInit = {}, isRetry = false): Promise<T> {
    const response = await fetch(url, {
      ...options,
      headers: {
        ...this.getAuthHeaders(url),
        ...options.headers,
      },
    });

    // Check for auth errors (401 or 403 with token_not_valid)
    if (response.status === 401 || response.status === 403) {
      // Don't try to refresh for auth endpoints
      const isAuthEndpoint = url.includes('/auth/login/') || url.includes('/auth/token/refresh/');

      if (!isAuthEndpoint && !isRetry) {
        // Check if it's a token error (try to parse response)
        const errorData = await response.clone().json().catch(() => ({}));
        const isTokenError = response.status === 401 ||
          errorData.code === 'token_not_valid' ||
          errorData.detail?.includes('token');

        if (isTokenError) {
          // Try to refresh the token
          const newToken = await this.refreshToken();

          if (newToken) {
            // Retry the original request with new token
            console.log('🔄 [ApiService] Retrying request after token refresh');
            return this.request<T>(url, options, true);
          }
        }
      }

      // Refresh failed or not applicable - logout
      this.handleAuthFailure();
      throw new Error('Unauthorized');
    }

    if (!response.ok) {
      // Check if response is HTML (404 page)
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('text/html')) {
        console.error('API Error: Received HTML instead of JSON. URL:', url);
        throw new Error(`API endpoint not found: ${url}`);
      }

      const error = await response.json().catch(() => ({ error: 'Request failed' }));
      console.error('API Error Response:', error);
      // Try to extract the most helpful error message
      const errorMessage = error.error || error.detail || error.message ||
        (typeof error === 'object' ? JSON.stringify(error) : 'Request failed');
      throw new Error(errorMessage);
    }

    return response.json();
  }

  async get<T>(url: string): Promise<T> {
    return this.request<T>(url, { method: 'GET' });
  }

  async post<T>(url: string, data?: any): Promise<T> {
    return this.request<T>(url, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async put<T>(url: string, data?: any): Promise<T> {
    return this.request<T>(url, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async patch<T>(url: string, data?: any): Promise<T> {
    return this.request<T>(url, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  async delete<T>(url: string): Promise<T> {
    return this.request<T>(url, { method: 'DELETE' });
  }

  async uploadFile<T>(url: string, file: File, additionalData?: Record<string, any>): Promise<T> {
    const token = localStorage.getItem('access_token');
    const formData = new FormData();
    formData.append('file', file);

    if (additionalData) {
      Object.keys(additionalData).forEach(key => {
        formData.append(key, additionalData[key]);
      });
    }

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
      },
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Upload failed' }));
      throw new Error(error.error || 'Upload failed');
    }

    return response.json();
  }

  async postFormData<T>(url: string, formData: FormData): Promise<T> {
    const token = localStorage.getItem('access_token');

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
      },
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Request failed' }));
      throw new Error(error.error || error.detail || 'Request failed');
    }

    return response.json();
  }
}

export default new ApiService();
