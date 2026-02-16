/**
 * Centralized localStorage management with type safety and caching
 */

import type { User } from "../types/api";

// Storage keys enum for type safety
export const StorageKeys = {
  ACCESS_TOKEN: "access_token",
  REFRESH_TOKEN: "refresh_token",
  USER: "user",
  SELECTED_PROJECT_ID: "selectedProjectId",
  LAST_USER_FETCH: "last_user_fetch",
  THEME_VERSION: "theme_version",  // legacy, kept for compat
  THEME_PREFERENCE: "theme_preference",
  DARK_VARIANT: "dark_variant",
  FONT_SIZE: "font_size",
  COMPACT_MODE: "compact_mode",
} as const;

// Cache duration constants
export const CACHE_DURATION = {
  USER_DATA: 5 * 60 * 1000, // 5 minutes
  PROJECT_DATA: 10 * 60 * 1000, // 10 minutes
};

class StorageService {
  /**
   * Generic get with JSON parsing
   */
  private get<T>(key: string): T | null {
    try {
      const item = localStorage.getItem(key);
      if (!item) return null;
      return JSON.parse(item) as T;
    } catch (error) {
      console.error(`Failed to parse ${key} from localStorage:`, error);
      return null;
    }
  }

  /**
   * Generic set with JSON stringify
   */
  private set<T>(key: string, value: T): void {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      console.error(`Failed to save ${key} to localStorage:`, error);
    }
  }

  /**
   * Remove item from storage
   */
  private remove(key: string): void {
    localStorage.removeItem(key);
  }

  // ============ TOKEN MANAGEMENT ============
  getAccessToken(): string | null {
    return localStorage.getItem(StorageKeys.ACCESS_TOKEN);
  }

  setAccessToken(token: string): void {
    localStorage.setItem(StorageKeys.ACCESS_TOKEN, token);
  }

  getRefreshToken(): string | null {
    return localStorage.getItem(StorageKeys.REFRESH_TOKEN);
  }

  setRefreshToken(token: string): void {
    localStorage.setItem(StorageKeys.REFRESH_TOKEN, token);
  }

  clearTokens(): void {
    this.remove(StorageKeys.ACCESS_TOKEN);
    this.remove(StorageKeys.REFRESH_TOKEN);
  }

  // ============ USER MANAGEMENT ============
  getUser(): User | null {
    return this.get<User>(StorageKeys.USER);
  }

  setUser(user: User): void {
    this.set(StorageKeys.USER, user);
    this.setLastUserFetch(Date.now());
  }

  clearUser(): void {
    this.remove(StorageKeys.USER);
    this.remove(StorageKeys.LAST_USER_FETCH);
  }

  // ============ CACHE MANAGEMENT ============
  getLastUserFetch(): number {
    const timestamp = this.get<number>(StorageKeys.LAST_USER_FETCH);
    return timestamp || 0;
  }

  private setLastUserFetch(timestamp: number): void {
    this.set(StorageKeys.LAST_USER_FETCH, timestamp);
  }

  isUserDataFresh(): boolean {
    const lastFetch = this.getLastUserFetch();
    if (lastFetch === 0) return false;
    const timeSinceLastFetch = Date.now() - lastFetch;
    return timeSinceLastFetch < CACHE_DURATION.USER_DATA;
  }

  // ============ PROJECT MANAGEMENT ============
  getSelectedProjectId(): number | null {
    const id = localStorage.getItem(StorageKeys.SELECTED_PROJECT_ID);
    return id ? parseInt(id, 10) : null;
  }

  setSelectedProjectId(id: number): void {
    localStorage.setItem(StorageKeys.SELECTED_PROJECT_ID, id.toString());
  }

  clearSelectedProjectId(): void {
    this.remove(StorageKeys.SELECTED_PROJECT_ID);
  }

  // ============ THEME VERSION (legacy) ============
  getThemeVersion(): 'v1' | 'v2' {
    return (localStorage.getItem(StorageKeys.THEME_VERSION) as 'v1' | 'v2') || 'v2';
  }

  setThemeVersion(version: 'v1' | 'v2'): void {
    localStorage.setItem(StorageKeys.THEME_VERSION, version);
  }

  // ============ THEME PREFERENCE (light/dark/auto) ============
  getThemePreference(): 'light' | 'dark' | 'auto' {
    return (localStorage.getItem(StorageKeys.THEME_PREFERENCE) as 'light' | 'dark' | 'auto') || 'light';
  }

  setThemePreference(pref: 'light' | 'dark' | 'auto'): void {
    localStorage.setItem(StorageKeys.THEME_PREFERENCE, pref);
  }

  // ============ DARK VARIANT ============
  getDarkVariant(): 'midnight' | 'slate' | 'warm' {
    return (localStorage.getItem(StorageKeys.DARK_VARIANT) as 'midnight' | 'slate' | 'warm') || 'midnight';
  }

  setDarkVariant(variant: 'midnight' | 'slate' | 'warm'): void {
    localStorage.setItem(StorageKeys.DARK_VARIANT, variant);
  }

  // ============ FONT SIZE ============
  getFontSize(): 'small' | 'medium' | 'large' {
    return (localStorage.getItem(StorageKeys.FONT_SIZE) as 'small' | 'medium' | 'large') || 'medium';
  }

  setFontSize(size: 'small' | 'medium' | 'large'): void {
    localStorage.setItem(StorageKeys.FONT_SIZE, size);
  }

  // ============ COMPACT MODE ============
  getCompactMode(): boolean {
    return localStorage.getItem(StorageKeys.COMPACT_MODE) === 'true';
  }

  setCompactMode(compact: boolean): void {
    localStorage.setItem(StorageKeys.COMPACT_MODE, String(compact));
  }

  // ============ CLEAR ALL ============
  clearAll(): void {
    this.clearTokens();
    this.clearUser();
    this.clearSelectedProjectId();
  }
}

// Export singleton instance
export const storage = new StorageService();
