'use client';

import { useEffect, useRef, useCallback, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from './useAuth';

const SOCKET_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

// Event types
export interface WebSocketNotification {
  id: string;
  type: string;
  title: string;
  content?: string;
  link?: string;
  createdAt: string;
}

export interface WebSocketMessage {
  id: string;
  conversationId: string;
  senderId: string;
  senderName: string;
  content: string;
  type: string;
  createdAt: string;
}

export interface WebSocketPointsUpdate {
  points: number;
  level: number;
  levelName: string;
  change: number;
  reason: string;
}

// Hook return type
interface UseWebSocketReturn {
  isConnected: boolean;
  notificationCount: number;
  messageCount: number;
  points: number | null;
  // Event handlers
  onNotification: (callback: (notification: WebSocketNotification) => void) => () => void;
  onMessage: (callback: (message: WebSocketMessage) => void) => () => void;
  onPointsUpdate: (callback: (update: WebSocketPointsUpdate) => void) => () => void;
  // Actions
  identify: () => void;
  refreshNotificationCount: () => Promise<void>;
  refreshMessageCount: () => Promise<void>;
}

// Callback storage
type Callback<T> = (data: T) => void;

export function useWebSocket(): UseWebSocketReturn {
  const { user, isAuthenticated, token } = useAuth();
  const socketRef = useRef<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [notificationCount, setNotificationCount] = useState(0);
  const [messageCount, setMessageCount] = useState(0);
  const [points, setPoints] = useState<number | null>(null);
  
  // Callback storage
  const notificationCallbacksRef = useRef<Set<Callback<WebSocketNotification>>>(new Set());
  const messageCallbacksRef = useRef<Set<Callback<WebSocketMessage>>>(new Set());
  const pointsCallbacksRef = useRef<Set<Callback<WebSocketPointsUpdate>>>(new Set());

  // Initialize socket connection
  useEffect(() => {
    // Only connect if user is authenticated
    if (!isAuthenticated || !token) {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
      setIsConnected(false);
      return;
    }

    // Create socket if not exists
    if (!socketRef.current) {
      socketRef.current = io(SOCKET_URL, {
        query: { token },
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionAttempts: 10,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
      });

      socketRef.current.on('connect', () => {
        console.log('🔌 WebSocket connected');
        setIsConnected(true);
        
        // Identify user after connection
        if (user?.id) {
          socketRef.current?.emit('identify', user.id);
        }
      });

      socketRef.current.on('disconnect', (reason) => {
        console.log(`🔌 WebSocket disconnected: ${reason}`);
        setIsConnected(false);
      });

      socketRef.current.on('connect_error', (error) => {
        console.error('WebSocket connection error:', error);
        setIsConnected(false);
      });

      // Listen for notification events
      socketRef.current.on('notification:new', (notification: WebSocketNotification) => {
        console.log('📢 New notification received:', notification);
        setNotificationCount(prev => prev + 1);
        // Notify all registered callbacks
        notificationCallbacksRef.current.forEach(callback => callback(notification));
      });

      // Listen for message events
      socketRef.current.on('message:new', (message: WebSocketMessage) => {
        console.log('💬 New message received:', message);
        setMessageCount(prev => prev + 1);
        // Notify all registered callbacks
        messageCallbacksRef.current.forEach(callback => callback(message));
      });

      // Listen for points update events
      socketRef.current.on('points:update', (update: WebSocketPointsUpdate) => {
        console.log('🎯 Points update received:', update);
        setPoints(update.points);
        // Notify all registered callbacks
        pointsCallbacksRef.current.forEach(callback => callback(update));
      });
    }

    return () => {
      // Cleanup on unmount
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, [isAuthenticated, token, user?.id]);

  // Identify user after connection
  const identify = useCallback(() => {
    if (socketRef.current?.connected && user?.id) {
      socketRef.current.emit('identify', user.id, (status: string) => {
        console.log('👤 User identified:', status);
      });
    }
  }, [user?.id]);

  // Refresh notification count from API
  const refreshNotificationCount = useCallback(async () => {
    try {
      const response = await fetch(`${SOCKET_URL}/api/notifications/unread-count`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      if (response.ok) {
        const data = await response.json();
        setNotificationCount(data.data?.count ?? 0);
      }
    } catch (error) {
      console.error('Failed to fetch notification count:', error);
    }
  }, [token]);

  // Refresh message count from API
  const refreshMessageCount = useCallback(async () => {
    try {
      const response = await fetch(`${SOCKET_URL}/api/messages/unread/count`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      if (response.ok) {
        const data = await response.json();
        setMessageCount(data.data?.count ?? 0);
      }
    } catch (error) {
      console.error('Failed to fetch message count:', error);
    }
  }, [token]);

  // Register notification callback
  const onNotification = useCallback((callback: (notification: WebSocketNotification) => void) => {
    notificationCallbacksRef.current.add(callback);
    return () => {
      notificationCallbacksRef.current.delete(callback);
    };
  }, []);

  // Register message callback
  const onMessage = useCallback((callback: (message: WebSocketMessage) => void) => {
    messageCallbacksRef.current.add(callback);
    return () => {
      messageCallbacksRef.current.delete(callback);
    };
  }, []);

  // Register points update callback
  const onPointsUpdate = useCallback((callback: (update: WebSocketPointsUpdate) => void) => {
    pointsCallbacksRef.current.add(callback);
    return () => {
      pointsCallbacksRef.current.delete(callback);
    };
  }, []);

  // Initial fetch of counts
  useEffect(() => {
    if (isAuthenticated && token) {
      refreshNotificationCount();
      refreshMessageCount();
    }
  }, [isAuthenticated, token, refreshNotificationCount, refreshMessageCount]);

  return {
    isConnected,
    notificationCount,
    messageCount,
    points,
    onNotification,
    onMessage,
    onPointsUpdate,
    identify,
    refreshNotificationCount,
    refreshMessageCount,
  };
}

export default useWebSocket;
