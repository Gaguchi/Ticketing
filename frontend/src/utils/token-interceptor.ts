/**
 * Token Interceptor
 * Handles automatic token refresh on 401 errors with request retry
 * Tokens are managed via httpOnly cookies
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
  private processQueue(error: any = null) {
    this.failedQueue.forEach((prom) => {
      if (error) {
        prom.reject(error);
      } else {
        prom.resolve(undefined);
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
      authService.logout().catch(() => {});
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
      // Refresh token via httpOnly cookie - no body needed
      await authService.refreshToken();

      // Process all queued requests
      this.processQueue();
      this.isRefreshing = false;

      // Retry the original request (cookies updated automatically)
      return originalRequest();
    } catch (error) {
      console.error('❌ [TokenInterceptor] Token refresh failed:', error);

      // Process queue with error
      this.processQueue(error);
      this.isRefreshing = false;

      // Logout and redirect to login
      authService.logout().catch(() => {});

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
