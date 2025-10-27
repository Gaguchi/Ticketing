/**
 * Authentication Service
 * Handles user authentication, registration, and token management
 */

import { apiService } from './api.service';
import { API_ENDPOINTS } from '../config/api';

export interface LoginCredentials {
  username: string;
  password: string;
}

export interface RegisterData {
  username: string;
  email: string;
  password: string;
  first_name?: string;
  last_name?: string;
}

export interface AuthResponse {
  user: {
    id: number;
    username: string;
    email: string;
    first_name: string;
    last_name: string;
  };
  access: string;
  refresh: string;
}

export interface User {
  id: number;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
}

export interface UserWithProjects extends User {
  projects: Array<{
    id: number;
    key: string;
    name: string;
    description?: string;
    lead_username?: string;
    tickets_count: number;
    columns_count: number;
  }>;
  has_projects: boolean;
}

class AuthService {
  private readonly ACCESS_TOKEN_KEY = 'access_token';
  private readonly REFRESH_TOKEN_KEY = 'refresh_token';
  private readonly USER_KEY = 'user';

  /**
   * Login user
   */
  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    const response = await apiService.post<AuthResponse>(
      API_ENDPOINTS.AUTH_LOGIN,
      credentials
    );
    
    this.setTokens(response.access, response.refresh);
    this.setUser(response.user);
    
    return response;
  }

  /**
   * Register new user
   */
  async register(data: RegisterData): Promise<AuthResponse> {
    const response = await apiService.post<AuthResponse>(
      API_ENDPOINTS.AUTH_REGISTER,
      data
    );
    
    this.setTokens(response.access, response.refresh);
    this.setUser(response.user);
    
    return response;
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
  async getCurrentUserWithProjects(): Promise<UserWithProjects> {
    return await apiService.get<UserWithProjects>(API_ENDPOINTS.AUTH_ME);
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

    const response = await apiService.post<{ access: string }>(
      API_ENDPOINTS.AUTH_TOKEN_REFRESH,
      { refresh: refreshToken }
    );

    localStorage.setItem(this.ACCESS_TOKEN_KEY, response.access);
    return response.access;
  }
}

export const authService = new AuthService();
export default authService;
