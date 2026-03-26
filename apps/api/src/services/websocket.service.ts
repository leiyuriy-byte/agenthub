/**
 * WebSocket Service - Manages real-time connections and event broadcasting
 * 
 * This service provides:
 * - Connection management (userId -> socket mapping)
 * - Event broadcasting to specific users or all connected clients
 * - Integration with Fastify for HTTP server sharing
 */

import { Server as SocketIOServer, Socket } from 'socket.io';
import { FastifyInstance } from 'fastify';
import jwt from '@fastify/jwt';

interface AuthenticatedSocket extends Socket {
  userId?: string;
  user?: {
    id: string;
    username: string;
    email: string;
  };
}

// Store userId -> Set<SocketId> mapping
const userSockets = new Map<string, Set<string>>();

// Store socketId -> userId mapping
const socketUsers = new Map<string, string>();

let io: SocketIOServer | null = null;

/**
 * Initialize WebSocket server
 */
export function initializeWebSocket(fastify: FastifyInstance): SocketIOServer {
  if (io) {
    return io;
  }

  // Get the underlying HTTP server from Fastify
  const httpServer = fastify.server;

  io = new SocketIOServer(httpServer, {
    cors: {
      origin: process.env.NODE_ENV === 'production'
        ? process.env.ALLOWED_ORIGINS?.split(',') || false
        : true,
      credentials: true,
      methods: ['GET', 'POST'],
    },
    pingTimeout: 60000,
    pingInterval: 25000,
  } as any);

  // Authentication middleware
  io.use(async (socket: AuthenticatedSocket, next) => {
    try {
      // Try to get token from query or handshake
      const token = (socket.handshake.query.token as string) ||
                    (socket.handshake.auth.token as string);

      if (!token) {
        // Allow unauthenticated connections for demo purposes
        // In production, you might want to require authentication
        return next();
      }

      // Verify JWT
      const decoded = fastify.jwt.verify<{
        id: string;
        username: string;
        email: string;
      }>(token);

      socket.userId = decoded.id;
      socket.user = {
        id: decoded.id,
        username: decoded.username,
        email: decoded.email,
      };

      next();
    } catch (error) {
      // Allow connection even if JWT verification fails
      // This is useful for development/demo
      next();
    }
  });

  // Connection handler
  io.on('connection', (socket: AuthenticatedSocket) => {
    console.log(`🔌 Client connected: ${socket.id}${socket.userId ? ` (User: ${socket.userId})` : ''}`);

    // If authenticated, track the socket
    if (socket.userId) {
      addUserSocket(socket.userId, socket.id);

      // Join user's personal room for targeted notifications
      socket.join(`user:${socket.userId}`);
    }

    // Handle user identification after connection
    socket.on('identify', (userId: string, callback?: (status: string) => void) => {
      socket.userId = userId;
      addUserSocket(userId, socket.id);
      socket.join(`user:${userId}`);
      console.log(`👤 Socket ${socket.id} identified as user ${userId}`);
      
      if (callback) {
        callback('identified');
      }
    });

    // Handle disconnection
    socket.on('disconnect', (reason) => {
      console.log(`🔌 Client disconnected: ${socket.id}, reason: ${reason}`);
      
      if (socket.userId) {
        removeUserSocket(socket.userId, socket.id);
      }
    });

    // Handle ping for connection health check
    socket.on('ping', (callback?: (timestamp: number) => void) => {
      if (callback) {
        callback(Date.now());
      }
    });
  });

  console.log('✅ WebSocket server initialized');
  return io;
}

/**
 * Get the Socket.IO instance
 */
export function getIO(): SocketIOServer | null {
  return io;
}

/**
 * Track a user's socket connection
 */
function addUserSocket(userId: string, socketId: string): void {
  if (!userSockets.has(userId)) {
    userSockets.set(userId, new Set());
  }
  userSockets.get(userId)!.add(socketId);
  socketUsers.set(socketId, userId);
}

/**
 * Remove a user's socket connection
 */
function removeUserSocket(userId: string, socketId: string): void {
  const sockets = userSockets.get(userId);
  if (sockets) {
    sockets.delete(socketId);
    if (sockets.size === 0) {
      userSockets.delete(userId);
    }
  }
  socketUsers.delete(socketId);
}

/**
 * Check if a user is online
 */
export function isUserOnline(userId: string): boolean {
  return userSockets.has(userId) && (userSockets.get(userId)!.size > 0);
}

/**
 * Get count of online users
 */
export function getOnlineUserCount(): number {
  return userSockets.size;
}

/**
 * Get all online user IDs
 */
export function getOnlineUserIds(): string[] {
  return Array.from(userSockets.keys());
}

/**
 * Send notification to a specific user
 */
export function sendNotificationToUser(
  userId: string,
  notification: {
    id: string;
    type: string;
    title: string;
    content?: string;
    link?: string;
    createdAt: string;
  }
): void {
  if (!io) {
    console.warn('⚠️ WebSocket not initialized');
    return;
  }

  // Send to user's personal room
  io.to(`user:${userId}`).emit('notification:new', notification);
  console.log(`📢 Notification sent to user ${userId}: ${notification.title}`);
}

/**
 * Send new message notification to a specific user
 */
export function sendMessageToUser(
  userId: string,
  message: {
    id: string;
    conversationId: string;
    senderId: string;
    senderName: string;
    content: string;
    type: string;
    createdAt: string;
  }
): void {
  if (!io) {
    console.warn('⚠️ WebSocket not initialized');
    return;
  }

  // Send to user's personal room
  io.to(`user:${userId}`).emit('message:new', message);
  console.log(`💬 Message sent to user ${userId}: ${message.content.slice(0, 30)}...`);
}

/**
 * Send points update notification to a specific user
 */
export function sendPointsUpdateToUser(
  userId: string,
  pointsData: {
    points: number;
    level: number;
    levelName: string;
    change: number;
    reason: string;
  }
): void {
  if (!io) {
    console.warn('⚠️ WebSocket not initialized');
    return;
  }

  // Send to user's personal room
  io.to(`user:${userId}`).emit('points:update', pointsData);
  console.log(`🎯 Points update sent to user ${userId}: ${pointsData.change} points (${pointsData.reason})`);
}

/**
 * Broadcast a system message to all connected users
 */
export function broadcastSystemMessage(
  message: {
    title: string;
    content: string;
  }
): void {
  if (!io) {
    console.warn('⚠️ WebSocket not initialized');
    return;
  }

  io.emit('system:message', message);
  console.log(`📢 System message broadcasted: ${message.title}`);
}

/**
 * Send event to specific users (multiple)
 */
export function sendToUsers(
  userIds: string[],
  event: string,
  data: unknown
): void {
  if (!io) {
    console.warn('⚠️ WebSocket not initialized');
    return;
  }

  userIds.forEach((userId) => {
    io!.to(`user:${userId}`).emit(event, data);
  });
}

export default {
  initializeWebSocket,
  getIO,
  isUserOnline,
  getOnlineUserCount,
  getOnlineUserIds,
  sendNotificationToUser,
  sendMessageToUser,
  sendPointsUpdateToUser,
  broadcastSystemMessage,
  sendToUsers,
};
