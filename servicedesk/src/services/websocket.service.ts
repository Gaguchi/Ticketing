/**
 * WebSocket Service
 * Manages WebSocket connections with automatic reconnection
 */

export type WebSocketMessageHandler = (data: any) => void;
export type WebSocketErrorHandler = (error: Event) => void;
export type WebSocketCloseHandler = (event: CloseEvent) => void;

// WebSocket ready states (matching WebSocket API)
export const WebSocketReadyState = {
  CONNECTING: 0,
  OPEN: 1,
  CLOSING: 2,
  CLOSED: 3,
} as const;

export type WebSocketReadyState = typeof WebSocketReadyState[keyof typeof WebSocketReadyState];

class WebSocketService {
  private connections: Map<string, WebSocket> = new Map();
  private messageHandlers: Map<string, Set<WebSocketMessageHandler>> = new Map();
  private reconnectAttempts: Map<string, number> = new Map();
  private reconnectTimeouts: Map<string, number> = new Map();
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000; // Start with 1 second
  private maxReconnectDelay = 30000; // Max 30 seconds

  /**
   * Get WebSocket URL based on HTTP URL
   */
  private getWebSocketUrl(path: string): string {
    // Check if explicit WebSocket URL is provided
    const wsBaseUrl = import.meta.env.VITE_WS_BASE_URL;
    
    if (wsBaseUrl) {
      // Use explicit WebSocket URL if provided
      const cleanWsUrl = wsBaseUrl.replace(/^wss?:\/\//, '');
      const wsProtocol = wsBaseUrl.startsWith('wss') ? 'wss' : 'ws';
      return `${wsProtocol}://${cleanWsUrl}/${path}`;
    }
    
    // Fallback: derive from API base URL
    const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
    const wsProtocol = baseUrl.startsWith('https') ? 'wss' : 'ws';
    const wsHost = baseUrl.replace(/^https?:\/\//, '');
    
    return `${wsProtocol}://${wsHost}/${path}`;
  }

  /**
   * Connect to WebSocket with JWT authentication
   */
  connect(
    path: string,
    onMessage?: WebSocketMessageHandler,
    onError?: WebSocketErrorHandler,
    onClose?: WebSocketCloseHandler
  ): WebSocket | null {
    // Check if already connected
    if (this.connections.has(path)) {
      const existingWs = this.connections.get(path)!;
      if (existingWs.readyState === WebSocketReadyState.OPEN) {
        console.log(`📡 [WebSocket] Already connected to ${path}`);
        return existingWs;
      }
    }

    // Get authentication token
    const token = localStorage.getItem('access_token');
    if (!token) {
      console.error('❌ [WebSocket] No authentication token available');
      return null;
    }

    // Build WebSocket URL with token
    const wsUrl = this.getWebSocketUrl(path);
    const urlWithToken = `${wsUrl}?token=${token}`;

    console.log(`🔌 [WebSocket] Connecting to ${path}...`);

    try {
      const ws = new WebSocket(urlWithToken);

      // Connection opened
      ws.onopen = () => {
        console.log(`✅ [WebSocket] Connected to ${path}`);
        this.reconnectAttempts.set(path, 0); // Reset reconnect attempts
        
        // Clear reconnect timeout if exists
        const timeout = this.reconnectTimeouts.get(path);
        if (timeout) {
          window.clearTimeout(timeout);
          this.reconnectTimeouts.delete(path);
        }
      };

      // Message received
      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log(`📨 [WebSocket] Message from ${path}:`, data);

          // Call all registered handlers
          const handlers = this.messageHandlers.get(path);
          if (handlers) {
            handlers.forEach((handler) => handler(data));
          }

          // Call inline handler if provided
          if (onMessage) {
            onMessage(data);
          }
        } catch (error) {
          console.error('❌ [WebSocket] Failed to parse message:', error);
        }
      };

      // Error occurred
      ws.onerror = (error) => {
        console.error(`❌ [WebSocket] Error on ${path}:`, error);
        if (onError) {
          onError(error);
        }
      };

      // Connection closed
      ws.onclose = (event) => {
        console.log(`🔌 [WebSocket] Disconnected from ${path}`, event.code, event.reason);
        this.connections.delete(path);

        if (onClose) {
          onClose(event);
        }

        // Attempt to reconnect if not a clean close
        if (event.code !== 1000 && event.code !== 4001) {
          this.scheduleReconnect(path, onMessage, onError, onClose);
        }
      };

      // Store connection
      this.connections.set(path, ws);
      return ws;
    } catch (error) {
      console.error(`❌ [WebSocket] Failed to create connection to ${path}:`, error);
      return null;
    }
  }

  /**
   * Schedule automatic reconnection with exponential backoff
   */
  private scheduleReconnect(
    path: string,
    onMessage?: WebSocketMessageHandler,
    onError?: WebSocketErrorHandler,
    onClose?: WebSocketCloseHandler
  ): void {
    const attempts = this.reconnectAttempts.get(path) || 0;

    if (attempts >= this.maxReconnectAttempts) {
      console.error(`❌ [WebSocket] Max reconnect attempts reached for ${path}`);
      return;
    }

    // Calculate delay with exponential backoff
    const delay = Math.min(
      this.reconnectDelay * Math.pow(2, attempts),
      this.maxReconnectDelay
    );

    console.log(
      `⏰ [WebSocket] Reconnecting to ${path} in ${delay / 1000}s (attempt ${attempts + 1}/${this.maxReconnectAttempts})`
    );

    this.reconnectAttempts.set(path, attempts + 1);

    const timeout = window.setTimeout(() => {
      this.connect(path, onMessage, onError, onClose);
    }, delay);

    this.reconnectTimeouts.set(path, timeout);
  }

  /**
   * Send message to WebSocket
   */
  send(path: string, data: any): boolean {
    const ws = this.connections.get(path);

    if (!ws || ws.readyState !== WebSocketReadyState.OPEN) {
      console.error(`❌ [WebSocket] Not connected to ${path}`);
      return false;
    }

    try {
      const message = typeof data === 'string' ? data : JSON.stringify(data);
      ws.send(message);
      console.log(`📤 [WebSocket] Sent to ${path}:`, data);
      return true;
    } catch (error) {
      console.error(`❌ [WebSocket] Failed to send message to ${path}:`, error);
      return false;
    }
  }

  /**
   * Subscribe to messages from a WebSocket connection
   */
  subscribe(path: string, handler: WebSocketMessageHandler): () => void {
    if (!this.messageHandlers.has(path)) {
      this.messageHandlers.set(path, new Set());
    }

    const handlers = this.messageHandlers.get(path)!;
    handlers.add(handler);

    // Return unsubscribe function
    return () => {
      handlers.delete(handler);
      if (handlers.size === 0) {
        this.messageHandlers.delete(path);
      }
    };
  }

  /**
   * Disconnect from WebSocket
   */
  disconnect(path: string): void {
    const ws = this.connections.get(path);

    if (ws) {
      console.log(`🔌 [WebSocket] Disconnecting from ${path}...`);
      ws.close(1000, 'Client disconnecting');
      this.connections.delete(path);
    }

    // Clear message handlers
    this.messageHandlers.delete(path);

    // Clear reconnect attempts
    this.reconnectAttempts.delete(path);

    // Clear reconnect timeout
    const timeout = this.reconnectTimeouts.get(path);
    if (timeout) {
      window.clearTimeout(timeout);
      this.reconnectTimeouts.delete(path);
    }
  }

  /**
   * Disconnect all WebSocket connections
   */
  disconnectAll(): void {
    console.log('🔌 [WebSocket] Disconnecting all connections...');
    this.connections.forEach((_ws, path) => {
      this.disconnect(path);
    });
  }

  /**
   * Get connection state
   */
  getState(path: string): number | null {
    const ws = this.connections.get(path);
    return ws ? ws.readyState : null;
  }

  /**
   * Check if connected
   */
  isConnected(path: string): boolean {
    const ws = this.connections.get(path);
    return ws !== undefined && ws.readyState === WebSocketReadyState.OPEN;
  }

  /**
   * Send ping to keep connection alive
   */
  ping(path: string): void {
    this.send(path, {
      type: 'ping',
      timestamp: Date.now(),
    });
  }

  /**
   * Get all active connections
   */
  getActiveConnections(): string[] {
    return Array.from(this.connections.keys()).filter((path) =>
      this.isConnected(path)
    );
  }
}

export const webSocketService = new WebSocketService();
export default webSocketService;
