import { API_HEADERS, API_BASE_URL } from '../config/api';

class ApiService {
  private isRefreshing = false;
  private refreshPromise: Promise<boolean> | null = null;

  private getHeaders(): HeadersInit {
    // Auth is handled via httpOnly cookies sent with credentials: 'include'
    return API_HEADERS;
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
   * Get the logout endpoint URL
   */
  private getLogoutEndpoint(): string {
    if (API_BASE_URL) {
      return `${API_BASE_URL}/api/tickets/auth/logout/`;
    }
    return '/api/tickets/auth/logout/';
  }

  /**
   * Attempt to refresh the access token using the httpOnly refresh cookie
   */
  private async refreshToken(): Promise<boolean> {
    // If already refreshing, wait for that to complete
    if (this.isRefreshing && this.refreshPromise) {
      return this.refreshPromise;
    }

    this.isRefreshing = true;
    this.refreshPromise = (async () => {
      try {
        console.log('🔄 [ApiService] Attempting to refresh token...');
        const response = await fetch(this.getRefreshEndpoint(), {
          method: 'POST',
          headers: API_HEADERS,
          credentials: 'include',
        });

        if (!response.ok) {
          console.error('❌ [ApiService] Token refresh failed:', response.status);
          return false;
        }

        console.log('✅ [ApiService] Token refreshed successfully');
        return true;
      } catch (error) {
        console.error('❌ [ApiService] Token refresh error:', error);
        return false;
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
  private async handleAuthFailure(): Promise<void> {
    console.log('🔒 [ApiService] Auth failure, redirecting to login...');
    try {
      await fetch(this.getLogoutEndpoint(), {
        method: 'POST',
        headers: API_HEADERS,
        credentials: 'include',
      });
    } catch {
      // Ignore logout errors
    }
    localStorage.removeItem('user');
    window.location.href = '/login';
  }

  async request<T>(url: string, options: RequestInit = {}, isRetry = false): Promise<T> {
    const response = await fetch(url, {
      ...options,
      headers: {
        ...this.getHeaders(),
        ...options.headers,
      },
      credentials: 'include',
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
          const success = await this.refreshToken();

          if (success) {
            // Retry the original request with new cookie
            console.log('🔄 [ApiService] Retrying request after token refresh');
            return this.request<T>(url, options, true);
          }
          // Refresh failed - logout
          await this.handleAuthFailure();
          throw new Error('Unauthorized');
        }
      }

      // If it's a 403 but NOT a token error (e.g. permission denied), DO NOT logout.
      if (response.status === 403) {
        throw new Error('Permission Denied');
      }

      // 401 (refresh failed or not applicable) - logout
      if (response.status === 401) {
        await this.handleAuthFailure();
        throw new Error('Unauthorized');
      }
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
    const formData = new FormData();
    formData.append('file', file);

    if (additionalData) {
      Object.keys(additionalData).forEach(key => {
        formData.append(key, additionalData[key]);
      });
    }

    const response = await fetch(url, {
      method: 'POST',
      body: formData,
      credentials: 'include',
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Upload failed' }));
      throw new Error(error.error || 'Upload failed');
    }

    return response.json();
  }

  async postFormData<T>(url: string, formData: FormData): Promise<T> {
    const response = await fetch(url, {
      method: 'POST',
      body: formData,
      credentials: 'include',
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Request failed' }));
      throw new Error(error.error || error.detail || 'Request failed');
    }

    return response.json();
  }
}

export default new ApiService();
