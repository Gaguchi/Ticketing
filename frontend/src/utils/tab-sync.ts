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
  }

  /**
   * Handle storage events from other tabs
   */
  private handleStorageEvent(event: StorageEvent) {
    // Notify all listeners
    this.listeners.forEach((callback) => callback(event));

    // Handle specific events
    if (event.key === 'logout_event') {
      // Explicit logout signal from another tab
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
  }

  /**
   * Broadcast logout to all tabs
   */
  broadcastLogout() {
    // Set a temporary flag to signal other tabs
    localStorage.setItem('logout_event', Date.now().toString());
    // Remove it immediately (the storage event will still fire)
    setTimeout(() => localStorage.removeItem('logout_event'), 100);
  }

  /**
   * Broadcast token refresh to all tabs
   * With httpOnly cookies, tokens are managed by the browser automatically
   */
  broadcastTokenRefresh() {
    // No-op: httpOnly cookies are shared across tabs automatically
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
  }
}

export const tabSync = new TabSync();
export default tabSync;
