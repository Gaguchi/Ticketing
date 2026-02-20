/**
 * Authentication Service
 * Handles user authentication via httpOnly cookies
 * Tokens are managed by the backend via httpOnly cookies - not accessible from JS
 */

import { apiService } from './api.service';
import { API_ENDPOINTS } from '../config/api';
import type {
  LoginCredentials,
  RegisterData,
  User,
} from '../types/api';

// Helper to read a specific cookie value
function getCookie(name: string): string | null {
  const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
  return match ? decodeURIComponent(match[2]) : null;
}

class AuthService {
  private readonly USER_KEY = 'user';

  /**
   * Login user - tokens are set as httpOnly cookies by the backend
   */
  async login(credentials: LoginCredentials): Promise<{ user: User }> {
    const response = await apiService.post<any>(
      API_ENDPOINTS.AUTH_LOGIN,
      credentials
    );

    this.setUser(response.user);

    return { user: response.user };
  }

  /**
   * Register new user - tokens are set as httpOnly cookies by the backend
   */
  async register(data: RegisterData): Promise<{ user: User }> {
    const response = await apiService.post<any>(
      API_ENDPOINTS.AUTH_REGISTER,
      data
    );

    this.setUser(response.user);

    return { user: response.user };
  }

  /**
   * Get current user
   */
  async getCurrentUser(): Promise<User> {
    return await apiService.get<User>(API_ENDPOINTS.AUTH_ME);
  }

  /**
   * Get current user with their projects
   */
  async getCurrentUserWithProjects(): Promise<User> {
    return await apiService.get<User>(API_ENDPOINTS.AUTH_ME);
  }

  /**
   * Logout user - clears httpOnly cookies via API call
   */
  async logout(): Promise<void> {
    try {
      await apiService.post(API_ENDPOINTS.AUTH_LOGOUT);
    } catch {
      // Even if API call fails, clear local state
    }
    localStorage.removeItem(this.USER_KEY);
  }

  /**
   * Get stored user
   */
  getUser(): User | null {
    const userJson = localStorage.getItem(this.USER_KEY);
    return userJson ? JSON.parse(userJson) : null;
  }

  /**
   * Check if user is authenticated (via non-httpOnly is_authenticated cookie)
   */
  isAuthenticated(): boolean {
    return getCookie('is_authenticated') === 'true';
  }

  /**
   * Set user in localStorage
   */
  private setUser(user: User): void {
    localStorage.setItem(this.USER_KEY, JSON.stringify(user));
  }

  /**
   * Refresh access token via httpOnly cookie
   * Backend reads refresh_token cookie and sets new access_token cookie
   */
  async refreshToken(): Promise<void> {
    await apiService.post(API_ENDPOINTS.AUTH_TOKEN_REFRESH);
  }
}

export const authService = new AuthService();
export default authService;
