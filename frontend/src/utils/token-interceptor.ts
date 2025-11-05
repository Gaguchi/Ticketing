/**
 * Token Interceptor
 * Handles automatic token refresh on 401 errors with request retry
 */

import { authService } from '../services/auth.service';

interface QueuedRequest {
  resolve: (value: any) => void;
  reject: (error: any) => void;
}

class TokenInterceptor {
  private isRefreshing = false;
  private failedQueue: QueuedRequest[] = [];

  /**
   * Process queued requests after token refresh
   */
  private processQueue(error: any = null, token: string | null = null) {
    this.failedQueue.forEach((prom) => {
      if (error) {
        prom.reject(error);
      } else {
        prom.resolve(token);
      }
    });

    this.failedQueue = [];
  }

  /**
   * Handle 401/403 errors with automatic token refresh and retry
   */
  async handle401Error(
    originalRequest: () => Promise<any>,
    url: string
  ): Promise<any> {
    // Don't retry token refresh endpoint or login/register
    if (
      url.includes('/auth/token/refresh/') ||
      url.includes('/auth/login/') ||
      url.includes('/auth/register/')
    ) {
      console.error('❌ [TokenInterceptor] Auth endpoint failed, logging out');
      authService.logout();
      window.location.href = '/login';
      throw new Error('Authentication failed');
    }

    // If already refreshing, queue this request
    if (this.isRefreshing) {
      return new Promise((resolve, reject) => {
        this.failedQueue.push({ resolve, reject });
      })
        .then(() => {
          // Retry original request after token is refreshed
          return originalRequest();
        })
        .catch((err) => {
          throw err;
        });
    }

    this.isRefreshing = true;

    try {
      console.log('🔄 [TokenInterceptor] Attempting to refresh token...');
      const newToken = await authService.refreshToken();
      console.log('✅ [TokenInterceptor] Token refreshed successfully');
      
      // Process all queued requests
      this.processQueue(null, newToken);
      this.isRefreshing = false;

      // Retry the original request with new token
      return originalRequest();
    } catch (error) {
      console.error('❌ [TokenInterceptor] Token refresh failed:', error);
      
      // Process queue with error
      this.processQueue(error, null);
      this.isRefreshing = false;

      // Logout and redirect to login
      console.log('🚪 [TokenInterceptor] Redirecting to login...');
      authService.logout();
      
      // Force immediate redirect
      setTimeout(() => {
        window.location.href = '/login';
      }, 100);
      
      throw error;
    }
  }

  /**
   * Check if current request is being retried
   */
  isRetrying(): boolean {
    return this.isRefreshing;
  }

  /**
   * Get queue length (for debugging)
   */
  getQueueLength(): number {
    return this.failedQueue.length;
  }
}

export const tokenInterceptor = new TokenInterceptor();
export default tokenInterceptor;
