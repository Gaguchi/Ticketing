/**
 * useWebSocket Hook
 * React hook for subscribing to WebSocket messages
 */

import { useEffect, useRef, useState } from 'react';
import { webSocketService } from '../services/websocket.service';
import type { WebSocketMessageHandler } from '../services/websocket.service';

interface UseWebSocketOptions {
  onMessage?: WebSocketMessageHandler;
  onConnect?: () => void;
  onDisconnect?: () => void;
  autoConnect?: boolean;
}

interface UseWebSocketReturn {
  isConnected: boolean;
  send: (data: any) => boolean;
  lastMessage: any | null;
  reconnect: () => void;
}

/**
 * Hook to manage a WebSocket connection
 * 
 * @example
 * const { isConnected, send, lastMessage } = useWebSocket('ws/notifications/', {
 *   onMessage: (data) => console.log('Received:', data),
 *   autoConnect: true,
 * });
 */
export function useWebSocket(
  path: string,
  options: UseWebSocketOptions = {}
): UseWebSocketReturn {
  const { onMessage, onConnect, onDisconnect, autoConnect = false } = options;
  
  const [isConnected, setIsConnected] = useState(false);
  const [lastMessage, setLastMessage] = useState<any | null>(null);
  const unsubscribeRef = useRef<(() => void) | null>(null);

  // Monitor connection state
  useEffect(() => {
    const checkConnection = () => {
      const connected = webSocketService.isConnected(path);
      setIsConnected(connected);
      
      if (connected && onConnect) {
        onConnect();
      } else if (!connected && onDisconnect) {
        onDisconnect();
      }
    };

    // Check immediately
    checkConnection();

    // Check periodically
    const interval = setInterval(checkConnection, 1000);

    return () => {
      clearInterval(interval);
    };
  }, [path, onConnect, onDisconnect]);

  // Subscribe to messages
  useEffect(() => {
    const messageHandler: WebSocketMessageHandler = (data) => {
      setLastMessage(data);
      if (onMessage) {
        onMessage(data);
      }
    };

    // Subscribe to WebSocket messages
    unsubscribeRef.current = webSocketService.subscribe(path, messageHandler);

    // Auto-connect if enabled
    if (autoConnect && !webSocketService.isConnected(path)) {
      webSocketService.connect(path, messageHandler);
    }

    // Cleanup subscription
    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
      }
    };
  }, [path, onMessage, autoConnect]);

  const send = (data: any): boolean => {
    return webSocketService.send(path, data);
  };

  const reconnect = () => {
    webSocketService.disconnect(path);
    webSocketService.connect(path);
  };

  return {
    isConnected,
    send,
    lastMessage,
    reconnect,
  };
}

export default useWebSocket;
