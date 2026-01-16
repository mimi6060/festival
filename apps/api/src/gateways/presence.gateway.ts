/**
 * Presence Gateway - Real-time User Presence System
 *
 * This gateway handles:
 * - User online/offline status tracking
 * - Presence status updates (online, away, busy, invisible)
 * - Last seen timestamps
 * - Typing indicators for chat
 * - User activity tracking per festival
 */

import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger, Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';

// Presence status types
export type PresenceStatus = 'online' | 'away' | 'busy' | 'invisible' | 'offline';

export interface UserPresence {
  userId: string;
  email: string;
  displayName?: string;
  status: PresenceStatus;
  lastSeen: Date;
  currentFestivalId?: string;
  currentZoneId?: string;
  deviceType?: 'web' | 'mobile' | 'admin';
  metadata?: Record<string, unknown>;
}

export interface PresenceUpdate {
  status: PresenceStatus;
  festivalId?: string;
  zoneId?: string;
  deviceType?: 'web' | 'mobile' | 'admin';
}

export interface TypingIndicator {
  channelId: string;
  isTyping: boolean;
}

export interface PresenceQuery {
  userIds?: string[];
  festivalId?: string;
  status?: PresenceStatus;
}

interface WsUser {
  id: string;
  email: string;
  displayName?: string;
  role: string;
  festivalId?: string;
}

@Injectable()
@WebSocketGateway({
  namespace: '/presence',
  cors: {
    origin: process.env.CORS_ORIGINS?.split(',') || [
      'http://localhost:3000',
      'http://localhost:4201',
    ],
    credentials: true,
  },
  transports: ['websocket', 'polling'],
})
export class PresenceGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server;

  private readonly logger = new Logger(PresenceGateway.name);

  // Store user presence data
  private userPresence = new Map<string, UserPresence>();

  // Map socket IDs to user IDs
  private socketToUser = new Map<string, string>();

  // Map user IDs to socket IDs (a user can have multiple connections)
  private userToSockets = new Map<string, Set<string>>();

  // Track typing indicators by channel
  private typingUsers = new Map<string, Set<string>>();

  // Away timeout (5 minutes of inactivity)
  private readonly AWAY_TIMEOUT_MS = 5 * 60 * 1000;
  private activityTimeouts = new Map<string, NodeJS.Timeout>();

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService
  ) {}

  afterInit(server: Server): void {
    this.logger.log('WebSocket Presence Gateway initialized');

    // Authentication middleware - requires valid token
    server.use(async (socket, next) => {
      try {
        const token =
          socket.handshake.auth?.token ||
          socket.handshake.headers?.authorization?.replace('Bearer ', '');

        if (!token) {
          this.logger.warn(
            `Presence gateway connection rejected: No token provided - Client: ${socket.id}`
          );
          return next(new Error('Authentication required'));
        }

        const payload = await this.verifyToken(token);
        (socket as Socket & { user?: WsUser }).user = payload;

        next();
      } catch (error) {
        this.logger.warn(
          `Presence auth failed: ${(error as Error).message} - Client: ${socket.id}`
        );
        next(new Error('Authentication failed'));
      }
    });
  }

  async handleConnection(client: Socket): Promise<void> {
    const user = (client as Socket & { user?: WsUser }).user;

    // This should never happen due to middleware, but added as safety check
    if (!user) {
      this.logger.error(`Client connected without authentication: ${client.id} - Disconnecting`);
      client.disconnect(true);
      return;
    }

    // Map socket to user
    this.socketToUser.set(client.id, user.id);

    // Add socket to user's socket set
    if (!this.userToSockets.has(user.id)) {
      this.userToSockets.set(user.id, new Set());
    }
    this.userToSockets.get(user.id)!.add(client.id);

    // Initialize or update presence
    const existingPresence = this.userPresence.get(user.id);
    const presence: UserPresence = {
      userId: user.id,
      email: user.email,
      displayName: user.displayName,
      status: existingPresence?.status || 'online',
      lastSeen: new Date(),
      currentFestivalId: user.festivalId,
      deviceType: 'web',
    };

    this.userPresence.set(user.id, presence);

    // Join user's presence room
    await client.join(`presence:${user.id}`);

    // If user has a festival, join that presence room
    if (user.festivalId) {
      await client.join(`presence:festival:${user.festivalId}`);
    }

    // Broadcast user came online (if this is their first connection)
    if (this.userToSockets.get(user.id)!.size === 1) {
      this.broadcastPresenceChange(user.id, presence);
    }

    // Start activity timeout
    this.resetActivityTimeout(user.id);

    this.logger.log(`User ${user.email} connected to presence (${client.id})`);

    // Send current presence to client
    client.emit('presence_init', {
      presence,
      onlineCount: this.getOnlineCount(),
    });
  }

  async handleDisconnect(client: Socket): Promise<void> {
    const userId = this.socketToUser.get(client.id);

    if (!userId) {
      return;
    }

    // Remove socket from user's socket set
    const userSockets = this.userToSockets.get(userId);
    if (userSockets) {
      userSockets.delete(client.id);

      // If user has no more connections, mark as offline
      if (userSockets.size === 0) {
        this.userToSockets.delete(userId);
        this.clearActivityTimeout(userId);

        const presence = this.userPresence.get(userId);
        if (presence && presence.status !== 'invisible') {
          presence.status = 'offline';
          presence.lastSeen = new Date();
          this.userPresence.set(userId, presence);

          // Broadcast user went offline
          this.broadcastPresenceChange(userId, presence);
        }

        this.logger.log(`User ${presence?.email || userId} went offline`);
      }
    }

    this.socketToUser.delete(client.id);
  }

  /**
   * Update user's presence status
   */
  @SubscribeMessage('update_status')
  handleUpdateStatus(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: PresenceUpdate
  ): { success: boolean; presence?: UserPresence } {
    const userId = this.socketToUser.get(client.id);

    if (!userId) {
      return { success: false };
    }

    const presence = this.userPresence.get(userId);
    if (!presence) {
      return { success: false };
    }

    // Update presence
    presence.status = payload.status;
    presence.lastSeen = new Date();

    if (payload.festivalId !== undefined) {
      presence.currentFestivalId = payload.festivalId;
    }
    if (payload.zoneId !== undefined) {
      presence.currentZoneId = payload.zoneId;
    }
    if (payload.deviceType !== undefined) {
      presence.deviceType = payload.deviceType;
    }

    this.userPresence.set(userId, presence);

    // Reset activity timeout if status is online
    if (payload.status === 'online') {
      this.resetActivityTimeout(userId);
    }

    // Broadcast change
    this.broadcastPresenceChange(userId, presence);

    this.logger.debug(`User ${presence.email} status changed to ${payload.status}`);

    return { success: true, presence };
  }

  /**
   * Track user activity (resets away timeout)
   */
  @SubscribeMessage('activity')
  handleActivity(@ConnectedSocket() client: Socket): { success: boolean } {
    const userId = this.socketToUser.get(client.id);

    if (!userId) {
      return { success: false };
    }

    const presence = this.userPresence.get(userId);
    if (!presence) {
      return { success: false };
    }

    // Update last seen
    presence.lastSeen = new Date();

    // If user was away, set back to online
    if (presence.status === 'away') {
      presence.status = 'online';
      this.broadcastPresenceChange(userId, presence);
    }

    this.userPresence.set(userId, presence);
    this.resetActivityTimeout(userId);

    return { success: true };
  }

  /**
   * Start typing indicator
   */
  @SubscribeMessage('typing_start')
  handleTypingStart(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: TypingIndicator
  ): void {
    const userId = this.socketToUser.get(client.id);

    if (!userId) {
      return;
    }

    const { channelId } = payload;

    // Add to typing set
    if (!this.typingUsers.has(channelId)) {
      this.typingUsers.set(channelId, new Set());
    }
    this.typingUsers.get(channelId)!.add(userId);

    // Broadcast to channel
    client.to(`channel:${channelId}`).emit('user_typing', {
      channelId,
      userId,
      isTyping: true,
    });
  }

  /**
   * Stop typing indicator
   */
  @SubscribeMessage('typing_stop')
  handleTypingStop(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: TypingIndicator
  ): void {
    const userId = this.socketToUser.get(client.id);

    if (!userId) {
      return;
    }

    const { channelId } = payload;

    // Remove from typing set
    const typingSet = this.typingUsers.get(channelId);
    if (typingSet) {
      typingSet.delete(userId);
      if (typingSet.size === 0) {
        this.typingUsers.delete(channelId);
      }
    }

    // Broadcast to channel
    client.to(`channel:${channelId}`).emit('user_typing', {
      channelId,
      userId,
      isTyping: false,
    });
  }

  /**
   * Get presence for specific users
   */
  @SubscribeMessage('get_presence')
  handleGetPresence(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: PresenceQuery
  ): { users: UserPresence[] } {
    const users: UserPresence[] = [];

    if (payload.userIds) {
      // Get specific users
      for (const userId of payload.userIds) {
        const presence = this.userPresence.get(userId);
        if (presence && presence.status !== 'invisible') {
          users.push(presence);
        }
      }
    } else if (payload.festivalId) {
      // Get all users in a festival
      this.userPresence.forEach((presence) => {
        if (
          presence.currentFestivalId === payload.festivalId &&
          presence.status !== 'invisible' &&
          presence.status !== 'offline'
        ) {
          users.push(presence);
        }
      });
    } else {
      // Get all online users (except invisible)
      this.userPresence.forEach((presence) => {
        if (presence.status !== 'invisible' && presence.status !== 'offline') {
          users.push(presence);
        }
      });
    }

    return { users };
  }

  /**
   * Subscribe to presence updates for specific users
   */
  @SubscribeMessage('subscribe_presence')
  async handleSubscribePresence(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { userIds: string[] }
  ): Promise<{ success: boolean }> {
    for (const userId of payload.userIds) {
      await client.join(`presence:${userId}`);
    }

    return { success: true };
  }

  /**
   * Unsubscribe from presence updates
   */
  @SubscribeMessage('unsubscribe_presence')
  async handleUnsubscribePresence(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { userIds: string[] }
  ): Promise<{ success: boolean }> {
    for (const userId of payload.userIds) {
      await client.leave(`presence:${userId}`);
    }

    return { success: true };
  }

  // ==================== Server-side methods ====================

  /**
   * Get online count
   */
  getOnlineCount(): number {
    let count = 0;
    this.userPresence.forEach((presence) => {
      if (
        presence.status === 'online' ||
        presence.status === 'away' ||
        presence.status === 'busy'
      ) {
        count++;
      }
    });
    return count;
  }

  /**
   * Get online users for a festival
   */
  getOnlineUsersForFestival(festivalId: string): UserPresence[] {
    const users: UserPresence[] = [];
    this.userPresence.forEach((presence) => {
      if (
        presence.currentFestivalId === festivalId &&
        presence.status !== 'invisible' &&
        presence.status !== 'offline'
      ) {
        users.push(presence);
      }
    });
    return users;
  }

  /**
   * Check if user is online
   */
  isUserOnline(userId: string): boolean {
    const presence = this.userPresence.get(userId);
    return presence !== undefined && presence.status !== 'offline';
  }

  /**
   * Get user presence
   */
  getUserPresence(userId: string): UserPresence | undefined {
    return this.userPresence.get(userId);
  }

  /**
   * Force user offline (for admin actions)
   */
  forceUserOffline(userId: string): void {
    const presence = this.userPresence.get(userId);
    if (presence) {
      presence.status = 'offline';
      presence.lastSeen = new Date();
      this.userPresence.set(userId, presence);
      this.broadcastPresenceChange(userId, presence);

      // Disconnect all sockets
      const sockets = this.userToSockets.get(userId);
      if (sockets) {
        sockets.forEach((socketId) => {
          this.server.sockets.sockets.get(socketId)?.disconnect(true);
        });
      }
    }
  }

  // ==================== Private helpers ====================

  private async verifyToken(token: string): Promise<WsUser> {
    const secret = this.configService.getOrThrow<string>('JWT_ACCESS_SECRET');
    const payload = await this.jwtService.verifyAsync(token, { secret });

    return {
      id: payload.sub || payload.id,
      email: payload.email,
      displayName: payload.displayName || payload.name,
      role: payload.role,
      festivalId: payload.festivalId,
    };
  }

  private broadcastPresenceChange(userId: string, presence: UserPresence): void {
    // Don't broadcast invisible users
    if (presence.status === 'invisible') {
      return;
    }

    // Broadcast to users subscribed to this user's presence
    this.server.to(`presence:${userId}`).emit('presence_update', {
      userId,
      presence,
      timestamp: new Date(),
    });

    // Broadcast to festival if applicable
    if (presence.currentFestivalId) {
      this.server.to(`presence:festival:${presence.currentFestivalId}`).emit('presence_update', {
        userId,
        presence,
        timestamp: new Date(),
      });
    }
  }

  private resetActivityTimeout(userId: string): void {
    this.clearActivityTimeout(userId);

    const timeout = setTimeout(() => {
      const presence = this.userPresence.get(userId);
      if (presence?.status === 'online') {
        presence.status = 'away';
        this.userPresence.set(userId, presence);
        this.broadcastPresenceChange(userId, presence);
        this.logger.debug(`User ${presence.email} went away due to inactivity`);
      }
    }, this.AWAY_TIMEOUT_MS);

    this.activityTimeouts.set(userId, timeout);
  }

  private clearActivityTimeout(userId: string): void {
    const timeout = this.activityTimeouts.get(userId);
    if (timeout) {
      clearTimeout(timeout);
      this.activityTimeouts.delete(userId);
    }
  }
}
