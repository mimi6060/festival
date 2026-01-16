/**
 * Events Gateway - Main WebSocket Gateway for Real-time Notifications
 *
 * This gateway handles real-time communication for:
 * - User notifications
 * - Festival updates
 * - Ticket validation events
 * - Cashless transaction alerts
 * - Zone capacity updates
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
  WsException,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger, Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';

// Types for WebSocket events
export interface WsAuthPayload {
  token: string;
}

export interface WsJoinRoomPayload {
  room: string;
  festivalId?: string;
}

export interface WsNotification {
  id: string;
  type: 'info' | 'success' | 'warning' | 'error' | 'alert';
  title: string;
  message: string;
  data?: Record<string, unknown>;
  timestamp: Date;
}

export interface WsUser {
  id: string;
  email: string;
  role: string;
  festivalId?: string;
}

@Injectable()
@WebSocketGateway({
  namespace: '/events',
  cors: {
    origin: process.env.CORS_ORIGINS?.split(',') || [
      'http://localhost:3000',
      'http://localhost:4201',
    ],
    credentials: true,
  },
  transports: ['websocket', 'polling'],
})
export class EventsGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server;

  private readonly logger = new Logger(EventsGateway.name);

  // Track connected clients with their user info (all authenticated)
  private connectedClients = new Map<string, { socket: Socket; user: WsUser }>();

  // Track users in rooms
  private roomUsers = new Map<string, Set<string>>();

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService
  ) {}

  afterInit(server: Server): void {
    this.logger.log('WebSocket Events Gateway initialized');

    // Middleware for authentication
    server.use(async (socket, next) => {
      try {
        const token =
          socket.handshake.auth?.token ||
          socket.handshake.headers?.authorization?.replace('Bearer ', '');

        if (!token) {
          this.logger.warn(
            `WebSocket connection rejected: No token provided - Client: ${socket.id}`
          );
          return next(new Error('Authentication required'));
        }

        const payload = await this.verifyToken(token);
        (socket as Socket & { user?: WsUser }).user = payload;

        next();
      } catch (error) {
        this.logger.warn(
          `WebSocket connection rejected: Authentication failed - ${(error as Error).message} - Client: ${socket.id}`
        );
        next(new Error('Authentication required'));
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

    this.connectedClients.set(client.id, { socket: client, user });

    // Auto-join user's personal room
    const userRoom = `user:${user.id}`;
    await client.join(userRoom);
    this.addToRoom(userRoom, client.id);

    this.logger.log(`Client connected: ${client.id} (user: ${user.email})`);

    // Emit connection success
    client.emit('connected', {
      clientId: client.id,
      authenticated: true,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
      },
      timestamp: new Date(),
    });
  }

  handleDisconnect(client: Socket): void {
    const clientData = this.connectedClients.get(client.id);

    // Remove from all rooms tracking
    this.roomUsers.forEach((users, room) => {
      users.delete(client.id);
      if (users.size === 0) {
        this.roomUsers.delete(room);
      }
    });

    this.connectedClients.delete(client.id);

    if (clientData?.user) {
      this.logger.log(`Client disconnected: ${client.id} (user: ${clientData.user.email})`);
    } else {
      this.logger.log(`Anonymous client disconnected: ${client.id}`);
    }
  }

  /**
   * Authenticate WebSocket connection
   */
  @SubscribeMessage('authenticate')
  async handleAuthenticate(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: WsAuthPayload
  ): Promise<{ success: boolean; message: string }> {
    try {
      const user = await this.verifyToken(payload.token);

      (client as Socket & { user?: WsUser }).user = user;
      this.connectedClients.set(client.id, { socket: client, user });

      // Join user's personal room
      const userRoom = `user:${user.id}`;
      await client.join(userRoom);
      this.addToRoom(userRoom, client.id);

      this.logger.log(`Client ${client.id} authenticated as ${user.email}`);

      return { success: true, message: 'Authenticated successfully' };
    } catch (error) {
      this.logger.warn(
        `Authentication failed for client ${client.id}: ${(error as Error).message}`
      );
      return { success: false, message: 'Authentication failed' };
    }
  }

  /**
   * Join a specific room (festival, zone, etc.)
   */
  @SubscribeMessage('join_room')
  async handleJoinRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: WsJoinRoomPayload
  ): Promise<{ success: boolean; room: string }> {
    const { room, festivalId } = payload;

    // Construct room name with festival scope if provided
    const roomName = festivalId ? `festival:${festivalId}:${room}` : room;

    await client.join(roomName);
    this.addToRoom(roomName, client.id);

    this.logger.debug(`Client ${client.id} joined room: ${roomName}`);

    // Notify room of new member
    client.to(roomName).emit('user_joined', {
      clientId: client.id,
      room: roomName,
      timestamp: new Date(),
    });

    return { success: true, room: roomName };
  }

  /**
   * Leave a specific room
   */
  @SubscribeMessage('leave_room')
  async handleLeaveRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: WsJoinRoomPayload
  ): Promise<{ success: boolean; room: string }> {
    const { room, festivalId } = payload;
    const roomName = festivalId ? `festival:${festivalId}:${room}` : room;

    await client.leave(roomName);
    this.removeFromRoom(roomName, client.id);

    this.logger.debug(`Client ${client.id} left room: ${roomName}`);

    // Notify room of member leaving
    client.to(roomName).emit('user_left', {
      clientId: client.id,
      room: roomName,
      timestamp: new Date(),
    });

    return { success: true, room: roomName };
  }

  /**
   * Get list of rooms client is in
   */
  @SubscribeMessage('get_rooms')
  handleGetRooms(@ConnectedSocket() _client: Socket): { rooms: string[] } {
    const rooms = Array.from(_client.rooms).filter((room) => room !== _client.id);
    return { rooms };
  }

  /**
   * Ping to keep connection alive
   */
  @SubscribeMessage('ping')
  handlePing(): { pong: boolean; timestamp: Date } {
    return { pong: true, timestamp: new Date() };
  }

  // ==================== Server-side emit methods ====================

  /**
   * Send notification to a specific user
   */
  sendToUser(userId: string, event: string, data: unknown): void {
    const room = `user:${userId}`;
    this.server.to(room).emit(event, data);
    this.logger.debug(`Sent ${event} to user ${userId}`);
  }

  /**
   * Send notification to all users in a festival
   */
  sendToFestival(festivalId: string, event: string, data: unknown): void {
    const room = `festival:${festivalId}`;
    this.server.to(room).emit(event, data);
    this.logger.debug(`Sent ${event} to festival ${festivalId}`);
  }

  /**
   * Send notification to a specific zone
   */
  sendToZone(festivalId: string, zoneId: string, event: string, data: unknown): void {
    const room = `festival:${festivalId}:zone:${zoneId}`;
    this.server.to(room).emit(event, data);
    this.logger.debug(`Sent ${event} to zone ${zoneId}`);
  }

  /**
   * Broadcast to all connected clients
   */
  broadcast(event: string, data: unknown): void {
    this.server.emit(event, data);
    this.logger.debug(`Broadcast ${event} to all clients`);
  }

  /**
   * Send a notification object to a user
   */
  notifyUser(userId: string, notification: WsNotification): void {
    this.sendToUser(userId, 'notification', notification);
  }

  /**
   * Get count of connected clients
   */
  getConnectedCount(): number {
    return this.connectedClients.size;
  }

  /**
   * Get count of clients in a specific room
   */
  getRoomCount(room: string): number {
    return this.roomUsers.get(room)?.size || 0;
  }

  /**
   * Get all online users
   */
  getOnlineUsers(): WsUser[] {
    const users: WsUser[] = [];
    this.connectedClients.forEach(({ user }) => {
      if (user) {
        users.push(user);
      }
    });
    return users;
  }

  // ==================== Private helpers ====================

  private async verifyToken(token: string): Promise<WsUser> {
    try {
      const secret = this.configService.getOrThrow<string>('JWT_ACCESS_SECRET');
      const payload = await this.jwtService.verifyAsync(token, { secret });

      return {
        id: payload.sub || payload.id,
        email: payload.email,
        role: payload.role,
        festivalId: payload.festivalId,
      };
    } catch {
      throw new WsException('Invalid token');
    }
  }

  private addToRoom(room: string, clientId: string): void {
    if (!this.roomUsers.has(room)) {
      this.roomUsers.set(room, new Set());
    }
    const roomSet = this.roomUsers.get(room);
    if (roomSet) {
      roomSet.add(clientId);
    }
  }

  private removeFromRoom(room: string, clientId: string): void {
    const users = this.roomUsers.get(room);
    if (users) {
      users.delete(clientId);
      if (users.size === 0) {
        this.roomUsers.delete(room);
      }
    }
  }
}
