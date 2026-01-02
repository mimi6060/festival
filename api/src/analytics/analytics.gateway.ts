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
import { Logger, UseGuards, Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { AnalyticsService } from './analytics.service';
import {
  RealtimeEventType,
  NewSaleEvent,
  TicketValidatedEvent,
  AttendanceUpdateEvent,
  CashlessTransactionEvent,
  ZoneUpdateEvent,
  AlertEvent,
  DashboardSummary,
} from './interfaces';

interface AuthenticatedSocket extends Socket {
  userId?: string;
  festivalId?: string;
  userRole?: string;
}

interface JoinRoomPayload {
  festivalId: string;
}

interface SubscribePayload {
  festivalId: string;
  events: RealtimeEventType[];
}

@WebSocketGateway({
  namespace: '/analytics',
  cors: {
    origin: process.env.CORS_ORIGINS?.split(',') || ['http://localhost:3000'],
    credentials: true,
  },
  transports: ['websocket', 'polling'],
})
@Injectable()
export class AnalyticsGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(AnalyticsGateway.name);
  private connectedClients = new Map<string, AuthenticatedSocket>();
  private festivalSubscriptions = new Map<string, Set<string>>(); // festivalId -> Set<socketId>

  constructor(
    private readonly analyticsService: AnalyticsService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  afterInit(server: Server) {
    this.logger.log('Analytics WebSocket Gateway initialized');
  }

  async handleConnection(client: AuthenticatedSocket) {
    try {
      // Extract and verify JWT token
      const token = this.extractToken(client);
      if (!token) {
        this.logger.warn(`Client ${client.id} connected without token`);
        client.emit('error', { message: 'Authentication required' });
        client.disconnect();
        return;
      }

      const payload = await this.verifyToken(token);
      if (!payload) {
        this.logger.warn(`Client ${client.id} has invalid token`);
        client.emit('error', { message: 'Invalid token' });
        client.disconnect();
        return;
      }

      // Attach user info to socket
      client.userId = payload.sub;
      client.userRole = payload.role;

      this.connectedClients.set(client.id, client);
      this.logger.log(
        `Client connected: ${client.id}, User: ${payload.sub}, Role: ${payload.role}`,
      );

      // Send connection confirmation
      client.emit('connected', {
        message: 'Connected to Analytics WebSocket',
        clientId: client.id,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      this.logger.error(`Connection error: ${error.message}`);
      client.emit('error', { message: 'Connection failed' });
      client.disconnect();
    }
  }

  handleDisconnect(client: AuthenticatedSocket) {
    this.connectedClients.delete(client.id);

    // Remove from all festival subscriptions
    for (const [festivalId, subscribers] of this.festivalSubscriptions) {
      subscribers.delete(client.id);
      if (subscribers.size === 0) {
        this.festivalSubscriptions.delete(festivalId);
      }
    }

    this.logger.log(`Client disconnected: ${client.id}`);
  }

  private extractToken(client: Socket): string | null {
    // Try to get token from handshake auth
    const authToken = client.handshake.auth?.token;
    if (authToken) return authToken;

    // Try to get from query params
    const queryToken = client.handshake.query?.token;
    if (typeof queryToken === 'string') return queryToken;

    // Try to get from headers
    const authHeader = client.handshake.headers?.authorization;
    if (authHeader?.startsWith('Bearer ')) {
      return authHeader.substring(7);
    }

    return null;
  }

  private async verifyToken(
    token: string,
  ): Promise<{ sub: string; role: string } | null> {
    try {
      const secret = this.configService.get<string>('JWT_SECRET');
      const payload = await this.jwtService.verifyAsync(token, { secret });
      return payload;
    } catch {
      return null;
    }
  }

  /**
   * Join a festival room to receive real-time updates
   */
  @SubscribeMessage('join_festival')
  async handleJoinFestival(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() payload: JoinRoomPayload,
  ) {
    const { festivalId } = payload;

    if (!festivalId) {
      throw new WsException('Festival ID is required');
    }

    // Check authorization (could add more granular checks)
    const allowedRoles = ['ADMIN', 'ORGANIZER', 'STAFF', 'SECURITY', 'CASHIER'];
    if (!client.userRole || !allowedRoles.includes(client.userRole)) {
      throw new WsException('Unauthorized to view analytics');
    }

    // Join Socket.IO room
    await client.join(`festival:${festivalId}`);
    client.festivalId = festivalId;

    // Track subscription
    if (!this.festivalSubscriptions.has(festivalId)) {
      this.festivalSubscriptions.set(festivalId, new Set());
    }
    this.festivalSubscriptions.get(festivalId)!.add(client.id);

    this.logger.log(`Client ${client.id} joined festival: ${festivalId}`);

    // Send initial dashboard data
    try {
      const dashboard = await this.analyticsService.getDashboardSummary(festivalId);
      client.emit('dashboard_update', dashboard);
    } catch (error) {
      this.logger.error(`Error fetching dashboard: ${error.message}`);
    }

    return {
      success: true,
      message: `Joined festival ${festivalId}`,
      festivalId,
    };
  }

  /**
   * Leave a festival room
   */
  @SubscribeMessage('leave_festival')
  async handleLeaveFestival(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() payload: JoinRoomPayload,
  ) {
    const { festivalId } = payload;

    await client.leave(`festival:${festivalId}`);
    client.festivalId = undefined;

    // Remove from subscriptions
    const subscribers = this.festivalSubscriptions.get(festivalId);
    if (subscribers) {
      subscribers.delete(client.id);
      if (subscribers.size === 0) {
        this.festivalSubscriptions.delete(festivalId);
      }
    }

    this.logger.log(`Client ${client.id} left festival: ${festivalId}`);

    return {
      success: true,
      message: `Left festival ${festivalId}`,
    };
  }

  /**
   * Subscribe to specific event types
   */
  @SubscribeMessage('subscribe')
  handleSubscribe(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() payload: SubscribePayload,
  ) {
    const { festivalId, events } = payload;

    if (!festivalId || !events?.length) {
      throw new WsException('Festival ID and events are required');
    }

    // Join specific event rooms
    for (const event of events) {
      client.join(`festival:${festivalId}:${event}`);
    }

    this.logger.log(
      `Client ${client.id} subscribed to events: ${events.join(', ')} for festival: ${festivalId}`,
    );

    return {
      success: true,
      subscribedEvents: events,
      festivalId,
    };
  }

  /**
   * Request immediate dashboard refresh
   */
  @SubscribeMessage('request_dashboard')
  async handleRequestDashboard(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() payload: JoinRoomPayload,
  ) {
    const { festivalId } = payload;

    try {
      const dashboard = await this.analyticsService.getDashboardSummary(festivalId);
      return { success: true, data: dashboard };
    } catch (error) {
      throw new WsException(`Failed to fetch dashboard: ${error.message}`);
    }
  }

  // ============ Event Broadcasting Methods ============

  /**
   * Broadcast a new sale event
   */
  emitNewSale(festivalId: string, data: NewSaleEvent['data']) {
    const event: NewSaleEvent = {
      type: 'new_sale',
      festivalId,
      timestamp: new Date(),
      data,
    };

    this.server.to(`festival:${festivalId}`).emit('new_sale', event);
    this.server.to(`festival:${festivalId}:new_sale`).emit('new_sale', event);

    this.logger.debug(`Emitted new_sale for festival: ${festivalId}`);
  }

  /**
   * Broadcast a ticket validation event
   */
  emitTicketValidated(festivalId: string, data: TicketValidatedEvent['data']) {
    const event: TicketValidatedEvent = {
      type: 'ticket_validated',
      festivalId,
      timestamp: new Date(),
      data,
    };

    this.server.to(`festival:${festivalId}`).emit('ticket_validated', event);
    this.server
      .to(`festival:${festivalId}:ticket_validated`)
      .emit('ticket_validated', event);

    this.logger.debug(`Emitted ticket_validated for festival: ${festivalId}`);
  }

  /**
   * Broadcast an attendance update
   */
  emitAttendanceUpdate(festivalId: string, data: AttendanceUpdateEvent['data']) {
    const event: AttendanceUpdateEvent = {
      type: 'attendance_update',
      festivalId,
      timestamp: new Date(),
      data,
    };

    this.server.to(`festival:${festivalId}`).emit('attendance_update', event);
    this.server
      .to(`festival:${festivalId}:attendance_update`)
      .emit('attendance_update', event);

    this.logger.debug(
      `Emitted attendance_update for festival: ${festivalId}, delta: ${data.delta}`,
    );
  }

  /**
   * Broadcast a cashless transaction
   */
  emitCashlessTransaction(
    festivalId: string,
    data: CashlessTransactionEvent['data'],
  ) {
    const event: CashlessTransactionEvent = {
      type: 'cashless_transaction',
      festivalId,
      timestamp: new Date(),
      data,
    };

    this.server.to(`festival:${festivalId}`).emit('cashless_transaction', event);
    this.server
      .to(`festival:${festivalId}:cashless_transaction`)
      .emit('cashless_transaction', event);

    this.logger.debug(
      `Emitted cashless_transaction for festival: ${festivalId}, type: ${data.transactionType}`,
    );
  }

  /**
   * Broadcast a zone update
   */
  emitZoneUpdate(festivalId: string, data: ZoneUpdateEvent['data']) {
    const event: ZoneUpdateEvent = {
      type: 'zone_update',
      festivalId,
      timestamp: new Date(),
      data,
    };

    this.server.to(`festival:${festivalId}`).emit('zone_update', event);
    this.server.to(`festival:${festivalId}:zone_update`).emit('zone_update', event);

    this.logger.debug(
      `Emitted zone_update for festival: ${festivalId}, zone: ${data.zoneName}`,
    );
  }

  /**
   * Broadcast an alert
   */
  emitAlert(festivalId: string, data: AlertEvent['data']) {
    const event: AlertEvent = {
      type: 'alert',
      festivalId,
      timestamp: new Date(),
      data,
    };

    this.server.to(`festival:${festivalId}`).emit('alert', event);
    this.server.to(`festival:${festivalId}:alert`).emit('alert', event);

    this.logger.log(
      `Emitted alert for festival: ${festivalId}, type: ${data.alertType}, severity: ${data.severity}`,
    );
  }

  /**
   * Broadcast full dashboard update
   */
  emitDashboardUpdate(festivalId: string, dashboard: DashboardSummary) {
    this.server.to(`festival:${festivalId}`).emit('dashboard_update', {
      type: 'dashboard_update',
      festivalId,
      timestamp: new Date(),
      data: dashboard,
    });

    this.logger.debug(`Emitted dashboard_update for festival: ${festivalId}`);
  }

  // ============ Utility Methods ============

  /**
   * Get number of connected clients for a festival
   */
  getConnectedClientsCount(festivalId: string): number {
    return this.festivalSubscriptions.get(festivalId)?.size || 0;
  }

  /**
   * Get all connected client IDs
   */
  getAllConnectedClients(): string[] {
    return Array.from(this.connectedClients.keys());
  }

  /**
   * Send message to specific client
   */
  sendToClient(clientId: string, event: string, data: unknown) {
    const client = this.connectedClients.get(clientId);
    if (client) {
      client.emit(event, data);
    }
  }

  /**
   * Broadcast to all connected clients
   */
  broadcastToAll(event: string, data: unknown) {
    this.server.emit(event, data);
  }
}
