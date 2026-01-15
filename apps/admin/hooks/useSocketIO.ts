'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';

export interface SocketIOOptions {
  namespace: string;
  autoConnect?: boolean;
  reconnection?: boolean;
  reconnectionAttempts?: number;
  reconnectionDelay?: number;
  timeout?: number;
  onConnect?: () => void;
  onDisconnect?: (reason: string) => void;
  onError?: (error: Error) => void;
  onReconnect?: (attempt: number) => void;
  onReconnectFailed?: () => void;
}

export type ConnectionState = 'disconnected' | 'connecting' | 'connected' | 'error' | 'reconnecting';

export interface UseSocketIOReturn {
  socket: Socket | null;
  isConnected: boolean;
  connectionState: ConnectionState;
  reconnectAttempts: number;
  connect: () => void;
  disconnect: () => void;
  emit: <T = unknown>(event: string, data?: T) => void;
  on: <T = unknown>(event: string, callback: (data: T) => void) => void;
  off: (event: string, callback?: (...args: unknown[]) => void) => void;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3333';

/**
 * Custom hook for Socket.IO connection management
 * Provides connection state, auto-reconnection, and event handling
 */
export function useSocketIO(options: SocketIOOptions): UseSocketIOReturn {
  const {
    namespace,
    autoConnect = true,
    reconnection = true,
    reconnectionAttempts = 5,
    reconnectionDelay = 3000,
    timeout = 20000,
    onConnect,
    onDisconnect,
    onError,
    onReconnect,
    onReconnectFailed,
  } = options;

  const socketRef = useRef<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [connectionState, setConnectionState] = useState<ConnectionState>('disconnected');
  const [reconnectAttempts, setReconnectAttempts] = useState(0);

  // Get auth token from cookie
  const getToken = useCallback(() => {
    if (typeof document === 'undefined') { return null; }
    const token = document.cookie
      .split('; ')
      .find((row) => row.startsWith('admin_token='))
      ?.split('=')[1];
    return token || null;
  }, []);

  // Initialize socket connection
  const connect = useCallback(() => {
    const token = getToken();
    if (!token) {
      console.warn('[SocketIO] No auth token available');
      setConnectionState('error');
      return;
    }

    if (socketRef.current?.connected) {
      return;
    }

    setConnectionState('connecting');

    const socket = io(`${API_URL}${namespace}`, {
      transports: ['websocket', 'polling'],
      reconnection,
      reconnectionAttempts,
      reconnectionDelay,
      timeout,
      auth: { token },
      withCredentials: true,
    });

    // Connection events
    socket.on('connect', () => {
      setIsConnected(true);
      setConnectionState('connected');
      setReconnectAttempts(0);
      // Connected to namespace
      onConnect?.();
    });

    socket.on('disconnect', (reason) => {
      setIsConnected(false);
      if (reason === 'io server disconnect') {
        // Server disconnected us, need manual reconnect
        setConnectionState('disconnected');
      } else {
        setConnectionState('reconnecting');
      }
      // Disconnected from namespace: reason
      onDisconnect?.(reason);
    });

    socket.on('connect_error', (error) => {
      console.error(`[SocketIO] Connection error on ${namespace}:`, error.message);
      setConnectionState('error');
      onError?.(error);
    });

    socket.io.on('reconnect', (attempt) => {
      setReconnectAttempts(attempt);
      setIsConnected(true);
      setConnectionState('connected');
      // Reconnected to namespace
      onReconnect?.(attempt);
    });

    socket.io.on('reconnect_attempt', (attempt) => {
      setReconnectAttempts(attempt);
      setConnectionState('reconnecting');
      // Reconnecting to namespace
    });

    socket.io.on('reconnect_failed', () => {
      setConnectionState('error');
      console.error(`[SocketIO] Reconnection to ${namespace} failed after ${reconnectionAttempts} attempts`);
      onReconnectFailed?.();
    });

    socketRef.current = socket;
  }, [
    namespace,
    reconnection,
    reconnectionAttempts,
    reconnectionDelay,
    timeout,
    getToken,
    onConnect,
    onDisconnect,
    onError,
    onReconnect,
    onReconnectFailed,
  ]);

  // Disconnect socket
  const disconnect = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
    }
    setIsConnected(false);
    setConnectionState('disconnected');
    setReconnectAttempts(0);
  }, []);

  // Emit event
  const emit = useCallback(<T = unknown>(event: string, data?: T) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit(event, data);
    } else {
      console.warn(`[SocketIO] Cannot emit "${event}": Socket not connected`);
    }
  }, []);

  // Subscribe to event
  const on = useCallback(<T = unknown>(event: string, callback: (data: T) => void) => {
    socketRef.current?.on(event, callback as (...args: unknown[]) => void);
  }, []);

  // Unsubscribe from event
  const off = useCallback((event: string, callback?: (...args: unknown[]) => void) => {
    if (callback) {
      socketRef.current?.off(event, callback);
    } else {
      socketRef.current?.off(event);
    }
  }, []);

  // Auto-connect on mount
  useEffect(() => {
    if (autoConnect) {
      connect();
    }

    return () => {
      disconnect();
    };
  }, [autoConnect, connect, disconnect]);

  return {
    socket: socketRef.current,
    isConnected,
    connectionState,
    reconnectAttempts,
    connect,
    disconnect,
    emit,
    on,
    off,
  };
}

export default useSocketIO;
