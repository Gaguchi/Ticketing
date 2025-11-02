/**
 * Authentication Service
 * Handles user authentication, registration, and token management
 */

import { apiService } from './api.service';
import { API_ENDPOINTS } from '../config/api';
import type {
  LoginCredentials,
  RegisterData,
  AuthResponse,
  User,
  RefreshTokenResponse,
} from '../types/api';

class AuthService {
  private readonly ACCESS_TOKEN_KEY = 'access_token';
  private readonly REFRESH_TOKEN_KEY = 'refresh_token';
  private readonly USER_KEY = 'user';

  /**
   * Login user
   */
  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    const response = await apiService.post<any>(
      API_ENDPOINTS.AUTH_LOGIN,
      credentials
    );
    
    // Handle both response formats: {tokens: {access, refresh}} or {access, refresh}
    const access = response.tokens?.access || response.access;
    const refresh = response.tokens?.refresh || response.refresh;
    
    this.setTokens(access, refresh);
    this.setUser(response.user);
    
    // Return normalized format
    return {
      user: response.user,
      tokens: { access, refresh }
    };
  }

  /**
   * Register new user
   */
  async register(data: RegisterData): Promise<AuthResponse> {
    const response = await apiService.post<any>(
      API_ENDPOINTS.AUTH_REGISTER,
      data
    );
    
    // Handle both response formats: {tokens: {access, refresh}} or {access, refresh}
    const access = response.tokens?.access || response.access;
    const refresh = response.tokens?.refresh || response.refresh;
    
    this.setTokens(access, refresh);
    this.setUser(response.user);
    
    // Return normalized format
    return {
      user: response.user,
      tokens: { access, refresh }
    };
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
   * Logout user
   */
  logout(): void {
    localStorage.removeItem(this.ACCESS_TOKEN_KEY);
    localStorage.removeItem(this.REFRESH_TOKEN_KEY);
    localStorage.removeItem(this.USER_KEY);
  }

  /**
   * Get access token
   */
  getAccessToken(): string | null {
    return localStorage.getItem(this.ACCESS_TOKEN_KEY);
  }

  /**
   * Get refresh token
   */
  getRefreshToken(): string | null {
    return localStorage.getItem(this.REFRESH_TOKEN_KEY);
  }

  /**
   * Get stored user
   */
  getUser(): User | null {
    const userJson = localStorage.getItem(this.USER_KEY);
    return userJson ? JSON.parse(userJson) : null;
  }

  /**
   * Check if user is authenticated
   */
  isAuthenticated(): boolean {
    return !!this.getAccessToken();
  }

  /**
   * Set tokens in localStorage
   */
  private setTokens(access: string, refresh: string): void {
    localStorage.setItem(this.ACCESS_TOKEN_KEY, access);
    localStorage.setItem(this.REFRESH_TOKEN_KEY, refresh);
  }

  /**
   * Set user in localStorage
   */
  private setUser(user: User): void {
    localStorage.setItem(this.USER_KEY, JSON.stringify(user));
  }

  /**
   * Refresh access token
   */
  async refreshToken(): Promise<string> {
    const refreshToken = this.getRefreshToken();
    
    if (!refreshToken) {
      throw new Error('No refresh token available');
    }

    const response = await apiService.post<RefreshTokenResponse>(
      API_ENDPOINTS.AUTH_TOKEN_REFRESH,
      { refresh: refreshToken }
    );

    localStorage.setItem(this.ACCESS_TOKEN_KEY, response.access);
    return response.access;
  }
}

export const authService = new AuthService();
export default authService;
