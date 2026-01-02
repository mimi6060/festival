/**
 * Zones Gateway - Real-time Zone Occupancy and Events
 *
 * This gateway handles:
 * - Real-time zone occupancy tracking
 * - Entry/exit event broadcasting
 * - Capacity alerts and warnings
 * - Zone status updates
 * - Staff positioning
 * - Emergency zone closures
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

// Zone types
export interface ZoneOccupancy {
  zoneId: string;
  zoneName: string;
  festivalId: string;
  currentOccupancy: number;
  maxCapacity: number;
  occupancyPercentage: number;
  status: ZoneStatus;
  lastUpdate: Date;
  trend: 'increasing' | 'decreasing' | 'stable';
  entriesLastHour: number;
  exitsLastHour: number;
}

export type ZoneStatus = 'open' | 'busy' | 'near_capacity' | 'full' | 'closed' | 'emergency';

export interface ZoneEvent {
  id: string;
  zoneId: string;
  festivalId: string;
  type: 'entry' | 'exit' | 'status_change' | 'alert' | 'emergency';
  userId?: string;
  ticketId?: string;
  staffId?: string;
  details?: Record<string, unknown>;
  timestamp: Date;
}

export interface ZoneAlert {
  id: string;
  zoneId: string;
  zoneName: string;
  festivalId: string;
  type: 'capacity_warning' | 'capacity_critical' | 'emergency' | 'zone_closed' | 'zone_reopened';
  message: string;
  level: 'info' | 'warning' | 'critical';
  timestamp: Date;
  acknowledgedBy?: string;
  acknowledgedAt?: Date;
}

export interface StaffPosition {
  staffId: string;
  staffName: string;
  zoneId: string;
  festivalId: string;
  role: string;
  position?: { lat: number; lng: number };
  lastUpdate: Date;
}

export interface SubscribeZonePayload {
  zoneId?: string;
  festivalId: string;
}

export interface ZoneUpdatePayload {
  zoneId: string;
  festivalId: string;
  occupancy?: number;
  status?: ZoneStatus;
}

interface WsUser {
  id: string;
  email: string;
  role: string;
  festivalId?: string;
}

// Thresholds for capacity alerts
const CAPACITY_THRESHOLDS = {
  WARNING: 0.75, // 75%
  CRITICAL: 0.90, // 90%
  FULL: 0.98, // 98%
};

@Injectable()
@WebSocketGateway({
  namespace: '/zones',
  cors: {
    origin: process.env.CORS_ORIGINS?.split(',') || ['http://localhost:3000', 'http://localhost:4200'],
    credentials: true,
  },
  transports: ['websocket', 'polling'],
})
export class ZonesGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server!: Server;

  private readonly logger = new Logger(ZonesGateway.name);

  // Store zone occupancy data
  private zoneOccupancy: Map<string, ZoneOccupancy> = new Map();

  // Track active alerts
  private activeAlerts: Map<string, ZoneAlert> = new Map();

  // Track staff positions
  private staffPositions: Map<string, StaffPosition> = new Map();

  // Map socket to user
  private socketToUser: Map<string, WsUser> = new Map();

  // Track entry/exit counts per hour
  private hourlyStats: Map<string, { entries: number; exits: number; hour: number }> = new Map();

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  afterInit(server: Server): void {
    this.logger.log('WebSocket Zones Gateway initialized');

    // Authentication middleware
    server.use(async (socket, next) => {
      try {
        const token =
          socket.handshake.auth?.token ||
          socket.handshake.headers?.authorization?.replace('Bearer ', '');

        if (token) {
          const payload = await this.verifyToken(token);
          (socket as Socket & { user?: WsUser }).user = payload;
        }

        next();
      } catch (error) {
        this.logger.warn(`Zones gateway auth failed: ${(error as Error).message}`);
        next();
      }
    });

    // Start hourly stats reset
    this.startHourlyStatsReset();
  }

  async handleConnection(client: Socket): Promise<void> {
    const user = (client as Socket & { user?: WsUser }).user;

    if (user) {
      this.socketToUser.set(client.id, user);

      // Auto-join festival zones room if user has festival context
      if (user.festivalId) {
        await client.join(`festival:${user.festivalId}:zones`);
      }

      this.logger.log(`User ${user.email} connected to zones gateway`);
    } else {
      this.logger.debug(`Anonymous connection to zones gateway: ${client.id}`);
    }

    client.emit('connected', {
      authenticated: !!user,
      timestamp: new Date(),
    });
  }

  handleDisconnect(client: Socket): void {
    const user = this.socketToUser.get(client.id);

    if (user) {
      // If staff, remove position tracking
      this.staffPositions.delete(user.id);

      this.logger.log(`User ${user.email} disconnected from zones gateway`);
    }

    this.socketToUser.delete(client.id);
  }

  /**
   * Subscribe to zone updates
   */
  @SubscribeMessage('subscribe_zone')
  async handleSubscribeZone(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: SubscribeZonePayload,
  ): Promise<{ success: boolean; occupancy?: ZoneOccupancy }> {
    const { zoneId, festivalId } = payload;

    if (zoneId) {
      // Subscribe to specific zone
      await client.join(`zone:${festivalId}:${zoneId}`);
      const occupancy = this.zoneOccupancy.get(`${festivalId}:${zoneId}`);

      this.logger.debug(`Client subscribed to zone ${zoneId}`);

      return { success: true, occupancy };
    } else {
      // Subscribe to all zones for festival
      await client.join(`festival:${festivalId}:zones`);

      this.logger.debug(`Client subscribed to all zones for festival ${festivalId}`);

      return { success: true };
    }
  }

  /**
   * Unsubscribe from zone updates
   */
  @SubscribeMessage('unsubscribe_zone')
  async handleUnsubscribeZone(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: SubscribeZonePayload,
  ): Promise<{ success: boolean }> {
    const { zoneId, festivalId } = payload;

    if (zoneId) {
      await client.leave(`zone:${festivalId}:${zoneId}`);
    } else {
      await client.leave(`festival:${festivalId}:zones`);
    }

    return { success: true };
  }

  /**
   * Get current occupancy for all zones in a festival
   */
  @SubscribeMessage('get_all_occupancy')
  handleGetAllOccupancy(
    @MessageBody() payload: { festivalId: string },
  ): { zones: ZoneOccupancy[] } {
    const zones: ZoneOccupancy[] = [];

    this.zoneOccupancy.forEach((occupancy, key) => {
      if (key.startsWith(payload.festivalId)) {
        zones.push(occupancy);
      }
    });

    return { zones };
  }

  /**
   * Get active alerts
   */
  @SubscribeMessage('get_alerts')
  handleGetAlerts(
    @MessageBody() payload: { festivalId: string },
  ): { alerts: ZoneAlert[] } {
    const alerts: ZoneAlert[] = [];

    this.activeAlerts.forEach((alert) => {
      if (alert.festivalId === payload.festivalId) {
        alerts.push(alert);
      }
    });

    // Sort by timestamp descending
    alerts.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    return { alerts };
  }

  /**
   * Acknowledge an alert (staff only)
   */
  @SubscribeMessage('acknowledge_alert')
  handleAcknowledgeAlert(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { alertId: string },
  ): { success: boolean; error?: string } {
    const user = this.socketToUser.get(client.id);

    if (!user || !this.isStaff(user)) {
      return { success: false, error: 'Unauthorized' };
    }

    const alert = this.activeAlerts.get(payload.alertId);
    if (!alert) {
      return { success: false, error: 'Alert not found' };
    }

    alert.acknowledgedBy = user.email;
    alert.acknowledgedAt = new Date();

    // Broadcast acknowledgment
    this.server.to(`festival:${alert.festivalId}:zones`).emit('alert_acknowledged', {
      alertId: payload.alertId,
      acknowledgedBy: user.email,
      timestamp: new Date(),
    });

    return { success: true };
  }

  /**
   * Update staff position (staff only)
   */
  @SubscribeMessage('update_position')
  handleUpdatePosition(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { zoneId: string; festivalId: string; position?: { lat: number; lng: number } },
  ): { success: boolean } {
    const user = this.socketToUser.get(client.id);

    if (!user || !this.isStaff(user)) {
      return { success: false };
    }

    const staffPosition: StaffPosition = {
      staffId: user.id,
      staffName: user.email,
      zoneId: payload.zoneId,
      festivalId: payload.festivalId,
      role: user.role,
      position: payload.position,
      lastUpdate: new Date(),
    };

    this.staffPositions.set(user.id, staffPosition);

    // Broadcast to zone managers
    this.server.to(`festival:${payload.festivalId}:zones:staff`).emit('staff_position_update', staffPosition);

    return { success: true };
  }

  /**
   * Get staff positions in a zone
   */
  @SubscribeMessage('get_staff_positions')
  handleGetStaffPositions(
    @MessageBody() payload: { festivalId: string; zoneId?: string },
  ): { staff: StaffPosition[] } {
    const staff: StaffPosition[] = [];

    this.staffPositions.forEach((position) => {
      if (position.festivalId === payload.festivalId) {
        if (!payload.zoneId || position.zoneId === payload.zoneId) {
          staff.push(position);
        }
      }
    });

    return { staff };
  }

  // ==================== Server-side methods (called from services) ====================

  /**
   * Record zone entry
   */
  recordEntry(festivalId: string, zoneId: string, zoneName: string, maxCapacity: number, userId?: string, ticketId?: string): void {
    const key = `${festivalId}:${zoneId}`;
    let occupancy = this.zoneOccupancy.get(key);

    if (!occupancy) {
      occupancy = this.initializeZoneOccupancy(festivalId, zoneId, zoneName, maxCapacity);
    }

    occupancy.currentOccupancy++;
    occupancy.lastUpdate = new Date();
    this.updateOccupancyStats(occupancy);

    // Update hourly stats
    this.incrementHourlyStats(key, 'entries');

    // Create entry event
    const event: ZoneEvent = {
      id: this.generateEventId(),
      zoneId,
      festivalId,
      type: 'entry',
      userId,
      ticketId,
      timestamp: new Date(),
    };

    // Broadcast occupancy update
    this.broadcastOccupancyUpdate(festivalId, zoneId, occupancy);

    // Broadcast entry event
    this.server.to(`zone:${festivalId}:${zoneId}`).emit('zone_event', event);

    // Check for capacity alerts
    this.checkCapacityAlerts(occupancy);

    this.logger.debug(`Entry recorded for zone ${zoneId}: ${occupancy.currentOccupancy}/${maxCapacity}`);
  }

  /**
   * Record zone exit
   */
  recordExit(festivalId: string, zoneId: string, userId?: string, ticketId?: string): void {
    const key = `${festivalId}:${zoneId}`;
    const occupancy = this.zoneOccupancy.get(key);

    if (!occupancy) {
      this.logger.warn(`Exit recorded for unknown zone: ${zoneId}`);
      return;
    }

    if (occupancy.currentOccupancy > 0) {
      occupancy.currentOccupancy--;
    }
    occupancy.lastUpdate = new Date();
    this.updateOccupancyStats(occupancy);

    // Update hourly stats
    this.incrementHourlyStats(key, 'exits');

    // Create exit event
    const event: ZoneEvent = {
      id: this.generateEventId(),
      zoneId,
      festivalId,
      type: 'exit',
      userId,
      ticketId,
      timestamp: new Date(),
    };

    // Broadcast updates
    this.broadcastOccupancyUpdate(festivalId, zoneId, occupancy);
    this.server.to(`zone:${festivalId}:${zoneId}`).emit('zone_event', event);

    // Check if we dropped below critical threshold
    if (occupancy.status === 'full' && occupancy.occupancyPercentage < CAPACITY_THRESHOLDS.CRITICAL) {
      occupancy.status = 'near_capacity';
      this.createAlert(occupancy, 'capacity_warning', `Zone ${occupancy.zoneName} is no longer at full capacity`, 'info');
    }

    this.logger.debug(`Exit recorded for zone ${zoneId}: ${occupancy.currentOccupancy}/${occupancy.maxCapacity}`);
  }

  /**
   * Update zone status (open, closed, emergency)
   */
  updateZoneStatus(festivalId: string, zoneId: string, status: ZoneStatus, reason?: string): void {
    const key = `${festivalId}:${zoneId}`;
    const occupancy = this.zoneOccupancy.get(key);

    if (!occupancy) {
      return;
    }

    const oldStatus = occupancy.status;
    occupancy.status = status;
    occupancy.lastUpdate = new Date();

    // Create status change event
    const event: ZoneEvent = {
      id: this.generateEventId(),
      zoneId,
      festivalId,
      type: 'status_change',
      details: { oldStatus, newStatus: status, reason },
      timestamp: new Date(),
    };

    // Broadcast
    this.broadcastOccupancyUpdate(festivalId, zoneId, occupancy);
    this.server.to(`zone:${festivalId}:${zoneId}`).emit('zone_event', event);
    this.server.to(`festival:${festivalId}:zones`).emit('zone_status_change', {
      zoneId,
      zoneName: occupancy.zoneName,
      oldStatus,
      newStatus: status,
      reason,
      timestamp: new Date(),
    });

    // Create appropriate alert
    if (status === 'emergency') {
      this.createAlert(occupancy, 'emergency', `EMERGENCY: Zone ${occupancy.zoneName} - ${reason || 'Emergency declared'}`, 'critical');
    } else if (status === 'closed') {
      this.createAlert(occupancy, 'zone_closed', `Zone ${occupancy.zoneName} has been closed: ${reason || 'No reason provided'}`, 'warning');
    } else if (oldStatus === 'closed' && status === 'open') {
      this.createAlert(occupancy, 'zone_reopened', `Zone ${occupancy.zoneName} has reopened`, 'info');
    }

    this.logger.log(`Zone ${zoneId} status changed from ${oldStatus} to ${status}`);
  }

  /**
   * Initialize or reset zone occupancy
   */
  initializeZone(festivalId: string, zoneId: string, zoneName: string, maxCapacity: number, currentOccupancy = 0): void {
    const occupancy = this.initializeZoneOccupancy(festivalId, zoneId, zoneName, maxCapacity);
    occupancy.currentOccupancy = currentOccupancy;
    this.updateOccupancyStats(occupancy);

    this.broadcastOccupancyUpdate(festivalId, zoneId, occupancy);

    this.logger.log(`Zone ${zoneId} initialized with capacity ${maxCapacity}`);
  }

  /**
   * Get current occupancy for a zone
   */
  getZoneOccupancy(festivalId: string, zoneId: string): ZoneOccupancy | undefined {
    return this.zoneOccupancy.get(`${festivalId}:${zoneId}`);
  }

  /**
   * Get all zones for a festival
   */
  getAllZonesForFestival(festivalId: string): ZoneOccupancy[] {
    const zones: ZoneOccupancy[] = [];
    this.zoneOccupancy.forEach((occupancy, key) => {
      if (key.startsWith(festivalId)) {
        zones.push(occupancy);
      }
    });
    return zones;
  }

  // ==================== Private helpers ====================

  private async verifyToken(token: string): Promise<WsUser> {
    const secret = this.configService.get<string>('JWT_SECRET') || 'default-secret';
    const payload = await this.jwtService.verifyAsync(token, { secret });

    return {
      id: payload.sub || payload.id,
      email: payload.email,
      role: payload.role,
      festivalId: payload.festivalId,
    };
  }

  private isStaff(user: WsUser): boolean {
    return ['ADMIN', 'ORGANIZER', 'STAFF', 'SECURITY', 'SUPER_ADMIN'].includes(user.role);
  }

  private initializeZoneOccupancy(festivalId: string, zoneId: string, zoneName: string, maxCapacity: number): ZoneOccupancy {
    const key = `${festivalId}:${zoneId}`;
    const occupancy: ZoneOccupancy = {
      zoneId,
      zoneName,
      festivalId,
      currentOccupancy: 0,
      maxCapacity,
      occupancyPercentage: 0,
      status: 'open',
      lastUpdate: new Date(),
      trend: 'stable',
      entriesLastHour: 0,
      exitsLastHour: 0,
    };
    this.zoneOccupancy.set(key, occupancy);
    return occupancy;
  }

  private updateOccupancyStats(occupancy: ZoneOccupancy): void {
    occupancy.occupancyPercentage = Math.round((occupancy.currentOccupancy / occupancy.maxCapacity) * 100);

    // Get hourly stats
    const key = `${occupancy.festivalId}:${occupancy.zoneId}`;
    const stats = this.hourlyStats.get(key);
    if (stats) {
      occupancy.entriesLastHour = stats.entries;
      occupancy.exitsLastHour = stats.exits;

      // Calculate trend
      if (stats.entries > stats.exits + 10) {
        occupancy.trend = 'increasing';
      } else if (stats.exits > stats.entries + 10) {
        occupancy.trend = 'decreasing';
      } else {
        occupancy.trend = 'stable';
      }
    }

    // Update status based on occupancy
    if (occupancy.status !== 'closed' && occupancy.status !== 'emergency') {
      if (occupancy.occupancyPercentage >= CAPACITY_THRESHOLDS.FULL * 100) {
        occupancy.status = 'full';
      } else if (occupancy.occupancyPercentage >= CAPACITY_THRESHOLDS.CRITICAL * 100) {
        occupancy.status = 'near_capacity';
      } else if (occupancy.occupancyPercentage >= CAPACITY_THRESHOLDS.WARNING * 100) {
        occupancy.status = 'busy';
      } else {
        occupancy.status = 'open';
      }
    }
  }

  private broadcastOccupancyUpdate(festivalId: string, zoneId: string, occupancy: ZoneOccupancy): void {
    // Broadcast to specific zone subscribers
    this.server.to(`zone:${festivalId}:${zoneId}`).emit('occupancy_update', occupancy);

    // Broadcast to festival-wide zone subscribers
    this.server.to(`festival:${festivalId}:zones`).emit('occupancy_update', occupancy);
  }

  private checkCapacityAlerts(occupancy: ZoneOccupancy): void {
    const percentage = occupancy.occupancyPercentage / 100;

    if (percentage >= CAPACITY_THRESHOLDS.FULL) {
      this.createAlert(occupancy, 'capacity_critical', `CRITICAL: Zone ${occupancy.zoneName} is at FULL CAPACITY (${occupancy.occupancyPercentage}%)`, 'critical');
    } else if (percentage >= CAPACITY_THRESHOLDS.CRITICAL) {
      this.createAlert(occupancy, 'capacity_critical', `Zone ${occupancy.zoneName} is near capacity (${occupancy.occupancyPercentage}%)`, 'warning');
    } else if (percentage >= CAPACITY_THRESHOLDS.WARNING) {
      this.createAlert(occupancy, 'capacity_warning', `Zone ${occupancy.zoneName} is getting busy (${occupancy.occupancyPercentage}%)`, 'info');
    }
  }

  private createAlert(occupancy: ZoneOccupancy, type: ZoneAlert['type'], message: string, level: ZoneAlert['level']): void {
    const alertId = `alert_${occupancy.zoneId}_${type}`;

    // Check if similar alert already exists
    const existingAlert = this.activeAlerts.get(alertId);
    if (existingAlert && (Date.now() - new Date(existingAlert.timestamp).getTime()) < 60000) {
      // Don't create duplicate alerts within 1 minute
      return;
    }

    const alert: ZoneAlert = {
      id: alertId,
      zoneId: occupancy.zoneId,
      zoneName: occupancy.zoneName,
      festivalId: occupancy.festivalId,
      type,
      message,
      level,
      timestamp: new Date(),
    };

    this.activeAlerts.set(alertId, alert);

    // Broadcast alert
    this.server.to(`festival:${occupancy.festivalId}:zones`).emit('zone_alert', alert);

    this.logger.warn(`Alert created: ${message}`);
  }

  private incrementHourlyStats(key: string, type: 'entries' | 'exits'): void {
    const currentHour = new Date().getHours();
    let stats = this.hourlyStats.get(key);

    if (!stats || stats.hour !== currentHour) {
      stats = { entries: 0, exits: 0, hour: currentHour };
      this.hourlyStats.set(key, stats);
    }

    stats[type]++;
  }

  private startHourlyStatsReset(): void {
    // Reset hourly stats at the start of each hour
    setInterval(() => {
      const currentHour = new Date().getHours();
      this.hourlyStats.forEach((stats, key) => {
        if (stats.hour !== currentHour) {
          this.hourlyStats.set(key, { entries: 0, exits: 0, hour: currentHour });
        }
      });
    }, 60000); // Check every minute
  }

  private generateEventId(): string {
    return `evt_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }
}
