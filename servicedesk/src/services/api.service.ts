import { API_HEADERS, API_BASE_URL } from '../config/api';

class ApiService {
  private isRefreshing = false;
  private refreshPromise: Promise<boolean> | null = null;

  private getHeaders(): HeadersInit {
    // Cookies are primary auth (same-site). Authorization header is fallback
    // for cross-site deployments (e.g., traefik.me domains).
    const token = localStorage.getItem('access_token');
    return token
      ? { ...API_HEADERS, 'Authorization': `Bearer ${token}` }
      : API_HEADERS;
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
   * Attempt to refresh the access token using cookie or localStorage refresh token
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
        const refreshToken = localStorage.getItem('refresh_token');
        const response = await fetch(this.getRefreshEndpoint(), {
          method: 'POST',
          headers: this.getHeaders(),
          credentials: 'include',
          body: refreshToken ? JSON.stringify({ refresh: refreshToken }) : undefined,
        });

        if (!response.ok) {
          console.error('❌ [ApiService] Token refresh failed:', response.status);
          return false;
        }

        // Save new tokens from response body
        const data = await response.json().catch(() => ({}));
        if (data.access) localStorage.setItem('access_token', data.access);
        if (data.refresh) localStorage.setItem('refresh_token', data.refresh);

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
        headers: this.getHeaders(),
        credentials: 'include',
      });
    } catch {
      // Ignore logout errors
    }
    localStorage.removeItem('user');
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
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

    // Check for auth errors (401 or 403)
    // 403 can mean missing credentials (cross-site cookie issue) or permission denied
    // On retry after refresh, legitimate 403 (permission denied) passes through
    if ((response.status === 401 || response.status === 403) && !isRetry) {
      const isAuthEndpoint = url.includes('/auth/login/') || url.includes('/auth/token/refresh/');

      if (!isAuthEndpoint) {
        // Try to refresh the token
        const success = await this.refreshToken();

        if (success) {
          console.log('🔄 [ApiService] Retrying request after token refresh');
          return this.request<T>(url, options, true);
        }
        // Refresh failed - logout
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
