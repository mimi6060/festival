/**
 * Broadcast Gateway - Festival Announcements and Emergency Alerts
 *
 * This gateway handles:
 * - Festival-wide announcements
 * - Emergency alerts and notifications
 * - Schedule changes
 * - Artist updates
 * - Weather alerts
 * - Lost and found announcements
 * - VIP and targeted broadcasts
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

// Broadcast types
export type BroadcastPriority = 'low' | 'normal' | 'high' | 'urgent' | 'emergency';
export type BroadcastCategory =
  | 'announcement'
  | 'schedule_change'
  | 'artist_update'
  | 'weather'
  | 'emergency'
  | 'lost_found'
  | 'promotion'
  | 'reminder'
  | 'system';

export type TargetAudience =
  | 'all'
  | 'vip'
  | 'staff'
  | 'camping'
  | 'ticket_holders'
  | 'specific_zone'
  | 'specific_users';

export interface Broadcast {
  id: string;
  festivalId: string;
  title: string;
  message: string;
  category: BroadcastCategory;
  priority: BroadcastPriority;
  target: TargetAudience;
  targetDetails?: {
    zoneId?: string;
    zoneName?: string;
    ticketTypes?: string[];
    userIds?: string[];
  };
  media?: {
    type: 'image' | 'video' | 'audio';
    url: string;
    thumbnail?: string;
  };
  action?: {
    type: 'link' | 'navigate' | 'dismiss';
    label: string;
    url?: string;
    route?: string;
  };
  expiresAt?: Date;
  createdBy: string;
  createdAt: Date;
  readCount: number;
  dismissCount: number;
}

export interface ScheduleChange {
  id: string;
  festivalId: string;
  type: 'time_change' | 'venue_change' | 'cancelled' | 'added' | 'artist_swap';
  performanceId?: string;
  artistName: string;
  originalData?: {
    stage?: string;
    startTime?: Date;
    endTime?: Date;
  };
  newData?: {
    stage?: string;
    startTime?: Date;
    endTime?: Date;
  };
  reason?: string;
  announcedAt: Date;
}

export interface EmergencyAlert {
  id: string;
  festivalId: string;
  level: 'info' | 'warning' | 'critical' | 'evacuation';
  title: string;
  message: string;
  instructions?: string[];
  affectedZones?: string[];
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
  resolvedAt?: Date;
  resolvedBy?: string;
}

export interface SendBroadcastPayload {
  festivalId: string;
  title: string;
  message: string;
  category: BroadcastCategory;
  priority?: BroadcastPriority;
  target?: TargetAudience;
  targetDetails?: Broadcast['targetDetails'];
  media?: Broadcast['media'];
  action?: Broadcast['action'];
  expiresAt?: Date;
}

export interface EmergencyPayload {
  festivalId: string;
  level: EmergencyAlert['level'];
  title: string;
  message: string;
  instructions?: string[];
  affectedZones?: string[];
}

interface WsUser {
  id: string;
  email: string;
  role: string;
  festivalId?: string;
  ticketType?: string;
  zoneAccess?: string[];
}

@Injectable()
@WebSocketGateway({
  namespace: '/broadcast',
  cors: {
    origin: process.env.CORS_ORIGINS?.split(',') || [
      'http://localhost:3000',
      'http://localhost:4200',
    ],
    credentials: true,
  },
  transports: ['websocket', 'polling'],
})
export class BroadcastGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server;

  private readonly logger = new Logger(BroadcastGateway.name);

  // Store active broadcasts
  private activeBroadcasts = new Map<string, Broadcast>();

  // Store active emergency alerts
  private activeEmergencies = new Map<string, EmergencyAlert>();

  // Store schedule changes
  private scheduleChanges = new Map<string, ScheduleChange[]>();

  // Map socket to user
  private socketToUser = new Map<string, WsUser>();

  // Track read/dismiss counts
  private broadcastStats = new Map<string, { reads: Set<string>; dismisses: Set<string> }>();

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService
  ) {}

  afterInit(server: Server): void {
    this.logger.log('WebSocket Broadcast Gateway initialized');

    // Authentication middleware - requires valid token
    server.use(async (socket, next) => {
      try {
        const token =
          socket.handshake.auth?.token ||
          socket.handshake.headers?.authorization?.replace('Bearer ', '');

        if (!token) {
          this.logger.warn(
            `Broadcast gateway connection rejected: No token provided - Client: ${socket.id}`
          );
          return next(new Error('Authentication required'));
        }

        const payload = await this.verifyToken(token);
        (socket as Socket & { user?: WsUser }).user = payload;

        next();
      } catch (error) {
        this.logger.warn(
          `Broadcast auth failed: ${(error as Error).message} - Client: ${socket.id}`
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

    this.socketToUser.set(client.id, user);

    // Join festival broadcasts
    if (user.festivalId) {
      await client.join(`broadcast:${user.festivalId}`);
      await client.join(`broadcast:${user.festivalId}:all`);
    }

    // Join role-based channels
    if (this.isStaff(user)) {
      await client.join(`broadcast:${user.festivalId}:staff`);
    }

    if (this.isVIP(user)) {
      await client.join(`broadcast:${user.festivalId}:vip`);
    }

    // Join emergency channel
    await client.join(`emergency:${user.festivalId}`);

    this.logger.log(`User ${user.email} connected to broadcast gateway`);

    // Send active broadcasts and emergencies
    if (user.festivalId) {
      const broadcasts = this.getActiveBroadcastsForUser(user);
      const emergencies = this.getActiveEmergenciesForFestival(user.festivalId);
      const changes = this.scheduleChanges.get(user.festivalId) || [];

      client.emit('sync', {
        broadcasts,
        emergencies,
        scheduleChanges: changes.slice(-50), // Last 50 changes
        timestamp: new Date(),
      });
    }

    client.emit('connected', {
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
    const user = this.socketToUser.get(client.id);

    if (user) {
      this.logger.log(`User ${user.email} disconnected from broadcast gateway`);
    }

    this.socketToUser.delete(client.id);
  }

  /**
   * Subscribe to specific broadcast channel
   */
  @SubscribeMessage('subscribe')
  async handleSubscribe(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { festivalId: string; channel?: string }
  ): Promise<{ success: boolean }> {
    const { festivalId, channel } = payload;

    if (channel) {
      await client.join(`broadcast:${festivalId}:${channel}`);
    } else {
      await client.join(`broadcast:${festivalId}`);
    }

    return { success: true };
  }

  /**
   * Mark broadcast as read
   */
  @SubscribeMessage('mark_read')
  handleMarkRead(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { broadcastId: string }
  ): { success: boolean } {
    const user = this.socketToUser.get(client.id);

    if (!user) {
      return { success: false };
    }

    const stats = this.broadcastStats.get(payload.broadcastId);
    if (stats) {
      stats.reads.add(user.id);

      const broadcast = this.activeBroadcasts.get(payload.broadcastId);
      if (broadcast) {
        broadcast.readCount = stats.reads.size;
      }
    }

    return { success: true };
  }

  /**
   * Dismiss broadcast
   */
  @SubscribeMessage('dismiss')
  handleDismiss(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { broadcastId: string }
  ): { success: boolean } {
    const user = this.socketToUser.get(client.id);

    if (!user) {
      return { success: false };
    }

    const stats = this.broadcastStats.get(payload.broadcastId);
    if (stats) {
      stats.dismisses.add(user.id);

      const broadcast = this.activeBroadcasts.get(payload.broadcastId);
      if (broadcast) {
        broadcast.dismissCount = stats.dismisses.size;
      }
    }

    return { success: true };
  }

  /**
   * Get active broadcasts (for reconnection sync)
   */
  @SubscribeMessage('get_active')
  handleGetActive(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { festivalId: string }
  ): { broadcasts: Broadcast[]; emergencies: EmergencyAlert[] } {
    const user = this.socketToUser.get(client.id);

    const broadcasts = user
      ? this.getActiveBroadcastsForUser(user)
      : this.getPublicBroadcasts(payload.festivalId);

    const emergencies = this.getActiveEmergenciesForFestival(payload.festivalId);

    return { broadcasts, emergencies };
  }

  /**
   * Get schedule changes
   */
  @SubscribeMessage('get_schedule_changes')
  handleGetScheduleChanges(@MessageBody() payload: { festivalId: string; since?: Date }): {
    changes: ScheduleChange[];
  } {
    const allChanges = this.scheduleChanges.get(payload.festivalId) || [];

    if (payload.since) {
      const sinceDate = new Date(payload.since);
      return {
        changes: allChanges.filter((change) => new Date(change.announcedAt) > sinceDate),
      };
    }

    return { changes: allChanges };
  }

  // ==================== Server-side methods (called from services) ====================

  /**
   * Send a broadcast to festival attendees
   */
  sendBroadcast(payload: SendBroadcastPayload, createdBy: string): Broadcast {
    const broadcast: Broadcast = {
      id: this.generateBroadcastId(),
      festivalId: payload.festivalId,
      title: payload.title,
      message: payload.message,
      category: payload.category,
      priority: payload.priority || 'normal',
      target: payload.target || 'all',
      targetDetails: payload.targetDetails,
      media: payload.media,
      action: payload.action,
      expiresAt: payload.expiresAt,
      createdBy,
      createdAt: new Date(),
      readCount: 0,
      dismissCount: 0,
    };

    // Store broadcast
    this.activeBroadcasts.set(broadcast.id, broadcast);
    this.broadcastStats.set(broadcast.id, { reads: new Set(), dismisses: new Set() });

    // Determine target rooms
    const rooms = this.getTargetRooms(broadcast);

    // Send to all target rooms
    rooms.forEach((room) => {
      this.server.to(room).emit('broadcast', broadcast);
    });

    // Also send to specific users if targeted
    if (broadcast.target === 'specific_users' && broadcast.targetDetails?.userIds) {
      broadcast.targetDetails.userIds.forEach((userId) => {
        this.server.to(`user:${userId}`).emit('broadcast', broadcast);
      });
    }

    this.logger.log(
      `Broadcast sent: ${broadcast.title} (${broadcast.category}) to ${broadcast.target}`
    );

    // Schedule expiry cleanup
    if (broadcast.expiresAt) {
      const expiresIn = new Date(broadcast.expiresAt).getTime() - Date.now();
      if (expiresIn > 0) {
        setTimeout(() => {
          this.expireBroadcast(broadcast.id);
        }, expiresIn);
      }
    }

    return broadcast;
  }

  /**
   * Send emergency alert
   */
  sendEmergencyAlert(payload: EmergencyPayload, createdBy: string): EmergencyAlert {
    const alert: EmergencyAlert = {
      id: this.generateAlertId(),
      festivalId: payload.festivalId,
      level: payload.level,
      title: payload.title,
      message: payload.message,
      instructions: payload.instructions,
      affectedZones: payload.affectedZones,
      active: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // Store alert
    this.activeEmergencies.set(alert.id, alert);

    // Send to all in festival with high priority
    this.server.to(`emergency:${payload.festivalId}`).emit('emergency_alert', alert);

    // Also send as regular broadcast with emergency priority
    const broadcast: Broadcast = {
      id: alert.id,
      festivalId: payload.festivalId,
      title: `${payload.level.toUpperCase()}: ${payload.title}`,
      message: payload.message,
      category: 'emergency',
      priority: 'emergency',
      target: 'all',
      createdBy,
      createdAt: new Date(),
      readCount: 0,
      dismissCount: 0,
    };

    this.server.to(`broadcast:${payload.festivalId}`).emit('broadcast', broadcast);

    this.logger.warn(
      `EMERGENCY ALERT: ${payload.title} (${payload.level}) for festival ${payload.festivalId}`
    );

    return alert;
  }

  /**
   * Resolve emergency alert
   */
  resolveEmergency(alertId: string, resolvedBy: string): boolean {
    const alert = this.activeEmergencies.get(alertId);

    if (!alert) {
      return false;
    }

    alert.active = false;
    alert.resolvedAt = new Date();
    alert.resolvedBy = resolvedBy;
    alert.updatedAt = new Date();

    // Notify everyone
    this.server.to(`emergency:${alert.festivalId}`).emit('emergency_resolved', {
      alertId,
      resolvedBy,
      resolvedAt: alert.resolvedAt,
    });

    // Send all-clear broadcast
    this.sendBroadcast(
      {
        festivalId: alert.festivalId,
        title: 'All Clear',
        message: `The ${alert.title} situation has been resolved.`,
        category: 'announcement',
        priority: 'high',
        target: 'all',
      },
      resolvedBy
    );

    this.logger.log(`Emergency resolved: ${alert.title} by ${resolvedBy}`);

    return true;
  }

  /**
   * Announce schedule change
   */
  announceScheduleChange(change: Omit<ScheduleChange, 'id' | 'announcedAt'>): ScheduleChange {
    const scheduleChange: ScheduleChange = {
      ...change,
      id: this.generateChangeId(),
      announcedAt: new Date(),
    };

    // Store change
    if (!this.scheduleChanges.has(change.festivalId)) {
      this.scheduleChanges.set(change.festivalId, []);
    }
    this.scheduleChanges.get(change.festivalId)!.push(scheduleChange);

    // Build message based on type
    let message = '';
    switch (change.type) {
      case 'cancelled':
        message = `${change.artistName}'s performance has been cancelled${change.reason ? `: ${change.reason}` : ''}`;
        break;
      case 'time_change':
        message = `${change.artistName}'s set time has changed to ${this.formatTime(change.newData?.startTime)}`;
        break;
      case 'venue_change':
        message = `${change.artistName} has moved to ${change.newData?.stage}`;
        break;
      case 'added':
        message = `${change.artistName} has been added to the lineup at ${change.newData?.stage}`;
        break;
      case 'artist_swap':
        message = `${change.artistName}'s slot has been updated${change.reason ? `: ${change.reason}` : ''}`;
        break;
    }

    // Broadcast change
    this.server.to(`broadcast:${change.festivalId}`).emit('schedule_change', scheduleChange);

    // Also send as regular broadcast
    this.sendBroadcast(
      {
        festivalId: change.festivalId,
        title: 'Schedule Update',
        message,
        category: 'schedule_change',
        priority: change.type === 'cancelled' ? 'high' : 'normal',
        target: 'all',
      },
      'system'
    );

    this.logger.log(`Schedule change: ${change.type} - ${change.artistName}`);

    return scheduleChange;
  }

  /**
   * Send weather alert
   */
  sendWeatherAlert(
    festivalId: string,
    message: string,
    severity: 'info' | 'warning' | 'severe'
  ): Broadcast {
    const priority: BroadcastPriority =
      severity === 'severe' ? 'emergency' : severity === 'warning' ? 'high' : 'normal';

    return this.sendBroadcast(
      {
        festivalId,
        title: `Weather ${severity === 'severe' ? 'Alert' : 'Update'}`,
        message,
        category: 'weather',
        priority,
        target: 'all',
      },
      'system'
    );
  }

  /**
   * Send lost and found announcement
   */
  sendLostFoundAnnouncement(
    festivalId: string,
    type: 'lost' | 'found',
    description: string
  ): Broadcast {
    return this.sendBroadcast(
      {
        festivalId,
        title: type === 'lost' ? 'Item Lost' : 'Item Found',
        message: description,
        category: 'lost_found',
        priority: 'low',
        target: 'all',
      },
      'system'
    );
  }

  /**
   * Get broadcast statistics
   */
  getBroadcastStats(broadcastId: string): { reads: number; dismisses: number } | null {
    const stats = this.broadcastStats.get(broadcastId);
    if (!stats) {
      return null;
    }
    return {
      reads: stats.reads.size,
      dismisses: stats.dismisses.size,
    };
  }

  // ==================== Private helpers ====================

  private async verifyToken(token: string): Promise<WsUser> {
    const secret = this.configService.getOrThrow<string>('JWT_ACCESS_SECRET');
    const payload = await this.jwtService.verifyAsync(token, { secret });

    return {
      id: payload.sub || payload.id,
      email: payload.email,
      role: payload.role,
      festivalId: payload.festivalId,
      ticketType: payload.ticketType,
      zoneAccess: payload.zoneAccess,
    };
  }

  private isStaff(user: WsUser): boolean {
    return ['ADMIN', 'ORGANIZER', 'STAFF', 'SECURITY', 'SUPER_ADMIN'].includes(user.role);
  }

  private isVIP(user: WsUser): boolean {
    return user.ticketType === 'VIP' || user.ticketType === 'BACKSTAGE' || user.role === 'VIP';
  }

  private getTargetRooms(broadcast: Broadcast): string[] {
    const rooms: string[] = [];
    const festivalId = broadcast.festivalId;

    switch (broadcast.target) {
      case 'all':
        rooms.push(`broadcast:${festivalId}:all`);
        break;
      case 'vip':
        rooms.push(`broadcast:${festivalId}:vip`);
        break;
      case 'staff':
        rooms.push(`broadcast:${festivalId}:staff`);
        break;
      case 'camping':
        rooms.push(`broadcast:${festivalId}:camping`);
        break;
      case 'ticket_holders':
        rooms.push(`broadcast:${festivalId}:ticket_holders`);
        break;
      case 'specific_zone':
        if (broadcast.targetDetails?.zoneId) {
          rooms.push(`broadcast:${festivalId}:zone:${broadcast.targetDetails.zoneId}`);
        }
        break;
      case 'specific_users':
        // Handled separately
        break;
    }

    return rooms;
  }

  private getActiveBroadcastsForUser(user: WsUser): Broadcast[] {
    const broadcasts: Broadcast[] = [];
    const now = new Date();

    this.activeBroadcasts.forEach((broadcast) => {
      if (broadcast.festivalId !== user.festivalId) {
        return;
      }

      // Check expiry
      if (broadcast.expiresAt && new Date(broadcast.expiresAt) < now) {
        return;
      }

      // Check target
      if (this.isUserTargeted(user, broadcast)) {
        broadcasts.push(broadcast);
      }
    });

    // Sort by priority and date
    return broadcasts.sort((a, b) => {
      const priorityOrder = { emergency: 0, urgent: 1, high: 2, normal: 3, low: 4 };
      const priorityDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
      if (priorityDiff !== 0) {
        return priorityDiff;
      }
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  }

  private getPublicBroadcasts(festivalId: string): Broadcast[] {
    const broadcasts: Broadcast[] = [];
    const now = new Date();

    this.activeBroadcasts.forEach((broadcast) => {
      if (
        broadcast.festivalId === festivalId &&
        broadcast.target === 'all' &&
        (!broadcast.expiresAt || new Date(broadcast.expiresAt) >= now)
      ) {
        broadcasts.push(broadcast);
      }
    });

    return broadcasts;
  }

  private getActiveEmergenciesForFestival(festivalId: string): EmergencyAlert[] {
    const emergencies: EmergencyAlert[] = [];

    this.activeEmergencies.forEach((alert) => {
      if (alert.festivalId === festivalId && alert.active) {
        emergencies.push(alert);
      }
    });

    return emergencies.sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  private isUserTargeted(user: WsUser, broadcast: Broadcast): boolean {
    switch (broadcast.target) {
      case 'all':
        return true;
      case 'vip':
        return this.isVIP(user);
      case 'staff':
        return this.isStaff(user);
      case 'camping':
        return user.zoneAccess?.includes('camping') || false;
      case 'ticket_holders':
        return !!user.ticketType;
      case 'specific_zone':
        return user.zoneAccess?.includes(broadcast.targetDetails?.zoneId || '') || false;
      case 'specific_users':
        return broadcast.targetDetails?.userIds?.includes(user.id) || false;
      default:
        return true;
    }
  }

  private expireBroadcast(broadcastId: string): void {
    const broadcast = this.activeBroadcasts.get(broadcastId);
    if (broadcast) {
      this.server.to(`broadcast:${broadcast.festivalId}`).emit('broadcast_expired', {
        broadcastId,
      });
      this.activeBroadcasts.delete(broadcastId);
      this.logger.debug(`Broadcast expired: ${broadcastId}`);
    }
  }

  private formatTime(date?: Date): string {
    if (!date) {
      return 'TBA';
    }
    return new Date(date).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  private generateBroadcastId(): string {
    return `bc_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }

  private generateAlertId(): string {
    return `em_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }

  private generateChangeId(): string {
    return `sc_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }
}
