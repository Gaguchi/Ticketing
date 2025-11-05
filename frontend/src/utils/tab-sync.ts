/**
 * Multi-Tab Synchronization
 * Synchronize auth state across browser tabs using localStorage events
 */

type StorageEventCallback = (event: StorageEvent) => void;

class TabSync {
  private listeners: Set<StorageEventCallback> = new Set();

  /**
   * Initialize tab synchronization
   */
  init() {
    window.addEventListener('storage', this.handleStorageEvent.bind(this));
    console.log('📡 [TabSync] Multi-tab synchronization initialized');
  }

  /**
   * Handle storage events from other tabs
   */
  private handleStorageEvent(event: StorageEvent) {
    // Notify all listeners
    this.listeners.forEach((callback) => callback(event));

    // Handle specific events
    if (event.key === 'access_token' && event.newValue) {
      console.log('📡 [TabSync] Token refreshed in another tab');
      // Token was updated in another tab - current tab will use it automatically
    }

    if (event.key === 'access_token' && event.newValue === null) {
      console.log('📡 [TabSync] Logout detected in another tab');
      // Token was removed (logout) in another tab
      window.location.href = '/login';
    }

    if (event.key === 'logout_event') {
      console.log('📡 [TabSync] Explicit logout event from another tab');
      // Explicit logout signal
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
  }

  /**
   * Broadcast logout to all tabs
   */
  broadcastLogout() {
    console.log('📡 [TabSync] Broadcasting logout to all tabs');
    // Set a temporary flag to signal other tabs
    localStorage.setItem('logout_event', Date.now().toString());
    // Remove it immediately (the storage event will still fire)
    setTimeout(() => localStorage.removeItem('logout_event'), 100);
  }

  /**
   * Broadcast token refresh to all tabs
   */
  broadcastTokenRefresh(token: string) {
    console.log('📡 [TabSync] Broadcasting token refresh to all tabs');
    // Updating localStorage will trigger storage event in other tabs
    localStorage.setItem('access_token', token);
  }

  /**
   * Add custom listener for storage events
   */
  addListener(callback: StorageEventCallback) {
    this.listeners.add(callback);
  }

  /**
   * Remove custom listener
   */
  removeListener(callback: StorageEventCallback) {
    this.listeners.delete(callback);
  }

  /**
   * Clean up event listeners
   */
  destroy() {
    window.removeEventListener('storage', this.handleStorageEvent.bind(this));
    this.listeners.clear();
    console.log('📡 [TabSync] Multi-tab synchronization destroyed');
  }
}

export const tabSync = new TabSync();
export default tabSync;
