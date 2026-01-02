/**
 * Support Chat Gateway - Real-time Chat for Support Tickets
 *
 * This gateway handles:
 * - Real-time messaging between users and support agents
 * - Chat room management per support ticket
 * - Message history synchronization
 * - File attachment notifications
 * - Agent assignment notifications
 * - Ticket status updates
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

// Message types
export interface ChatMessage {
  id: string;
  ticketId: string;
  senderId: string;
  senderName: string;
  senderRole: 'user' | 'agent' | 'system';
  content: string;
  type: 'text' | 'image' | 'file' | 'system';
  attachments?: ChatAttachment[];
  metadata?: Record<string, unknown>;
  createdAt: Date;
  readBy?: string[];
}

export interface ChatAttachment {
  id: string;
  filename: string;
  mimeType: string;
  size: number;
  url: string;
}

export interface TicketRoom {
  ticketId: string;
  festivalId: string;
  userId: string;
  assignedAgentId?: string;
  status: 'open' | 'in_progress' | 'waiting_user' | 'waiting_agent' | 'resolved' | 'closed';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  participants: Set<string>;
  messageCount: number;
  lastActivity: Date;
}

export interface SendMessagePayload {
  ticketId: string;
  content: string;
  type?: 'text' | 'image' | 'file';
  attachments?: ChatAttachment[];
}

export interface JoinTicketPayload {
  ticketId: string;
}

export interface TicketStatusPayload {
  ticketId: string;
  status: TicketRoom['status'];
  reason?: string;
}

export interface AgentAssignPayload {
  ticketId: string;
  agentId: string;
  agentName: string;
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
  namespace: '/support',
  cors: {
    origin: process.env.CORS_ORIGINS?.split(',') || ['http://localhost:3000', 'http://localhost:4200'],
    credentials: true,
  },
  transports: ['websocket', 'polling'],
})
export class SupportChatGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server!: Server;

  private readonly logger = new Logger(SupportChatGateway.name);

  // Track ticket rooms
  private ticketRooms: Map<string, TicketRoom> = new Map();

  // Map socket to user
  private socketToUser: Map<string, WsUser> = new Map();

  // Map user to sockets
  private userToSockets: Map<string, Set<string>> = new Map();

  // Message queue for offline delivery
  private messageQueue: Map<string, ChatMessage[]> = new Map();

  // Typing indicators per ticket
  private typingInTicket: Map<string, Map<string, NodeJS.Timeout>> = new Map();

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  afterInit(server: Server): void {
    this.logger.log('WebSocket Support Chat Gateway initialized');

    // Authentication middleware
    server.use(async (socket, next) => {
      try {
        const token =
          socket.handshake.auth?.token ||
          socket.handshake.headers?.authorization?.replace('Bearer ', '');

        if (!token) {
          throw new WsException('Authentication required');
        }

        const payload = await this.verifyToken(token);
        (socket as Socket & { user?: WsUser }).user = payload;

        next();
      } catch (error) {
        this.logger.warn(`Support chat auth failed: ${(error as Error).message}`);
        next(new Error('Authentication failed'));
      }
    });
  }

  async handleConnection(client: Socket): Promise<void> {
    const user = (client as Socket & { user?: WsUser }).user;

    if (!user) {
      client.disconnect(true);
      return;
    }

    // Map socket to user
    this.socketToUser.set(client.id, user);

    // Add socket to user's socket set
    if (!this.userToSockets.has(user.id)) {
      this.userToSockets.set(user.id, new Set());
    }
    this.userToSockets.get(user.id)!.add(client.id);

    // Join user's personal notification room
    await client.join(`user:${user.id}`);

    // If user is support agent, join agents room
    if (this.isAgent(user)) {
      await client.join('support:agents');
      await client.join(`support:agents:${user.festivalId || 'global'}`);
    }

    // Deliver queued messages
    const queuedMessages = this.messageQueue.get(user.id);
    if (queuedMessages && queuedMessages.length > 0) {
      client.emit('queued_messages', { messages: queuedMessages });
      this.messageQueue.delete(user.id);
    }

    this.logger.log(`User ${user.email} connected to support chat (${client.id})`);

    client.emit('connected', {
      userId: user.id,
      isAgent: this.isAgent(user),
      timestamp: new Date(),
    });
  }

  handleDisconnect(client: Socket): void {
    const user = this.socketToUser.get(client.id);

    if (user) {
      // Remove socket from user's set
      const userSockets = this.userToSockets.get(user.id);
      if (userSockets) {
        userSockets.delete(client.id);
        if (userSockets.size === 0) {
          this.userToSockets.delete(user.id);
        }
      }

      // Clear typing indicators for this user
      this.typingInTicket.forEach((ticketTyping, ticketId) => {
        const timeout = ticketTyping.get(user.id);
        if (timeout) {
          clearTimeout(timeout);
          ticketTyping.delete(user.id);
          this.server.to(`ticket:${ticketId}`).emit('typing_stopped', {
            ticketId,
            userId: user.id,
          });
        }
      });

      this.logger.log(`User ${user.email} disconnected from support chat`);
    }

    this.socketToUser.delete(client.id);
  }

  /**
   * Join a support ticket chat room
   */
  @SubscribeMessage('join_ticket')
  async handleJoinTicket(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: JoinTicketPayload,
  ): Promise<{ success: boolean; room?: TicketRoom; error?: string }> {
    const user = this.socketToUser.get(client.id);

    if (!user) {
      return { success: false, error: 'Not authenticated' };
    }

    const { ticketId } = payload;
    const room = this.ticketRooms.get(ticketId);

    // Verify access
    if (room) {
      if (!this.canAccessTicket(user, room)) {
        return { success: false, error: 'Access denied' };
      }
    }

    // Join the ticket room
    await client.join(`ticket:${ticketId}`);

    // Initialize room if not exists
    if (!room) {
      const newRoom: TicketRoom = {
        ticketId,
        festivalId: user.festivalId || 'global',
        userId: user.id,
        status: 'open',
        priority: 'medium',
        participants: new Set([user.id]),
        messageCount: 0,
        lastActivity: new Date(),
      };
      this.ticketRooms.set(ticketId, newRoom);

      this.logger.debug(`Created ticket room ${ticketId}`);
      return { success: true, room: this.serializeRoom(newRoom) };
    }

    // Add participant
    room.participants.add(user.id);

    this.logger.debug(`User ${user.email} joined ticket ${ticketId}`);

    // Notify others in the room
    client.to(`ticket:${ticketId}`).emit('user_joined_ticket', {
      ticketId,
      userId: user.id,
      userName: user.displayName || user.email,
      isAgent: this.isAgent(user),
      timestamp: new Date(),
    });

    return { success: true, room: this.serializeRoom(room) };
  }

  /**
   * Leave a support ticket chat room
   */
  @SubscribeMessage('leave_ticket')
  async handleLeaveTicket(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: JoinTicketPayload,
  ): Promise<{ success: boolean }> {
    const user = this.socketToUser.get(client.id);

    if (!user) {
      return { success: false };
    }

    const { ticketId } = payload;

    await client.leave(`ticket:${ticketId}`);

    // Remove participant from room
    const room = this.ticketRooms.get(ticketId);
    if (room) {
      room.participants.delete(user.id);
    }

    // Notify others
    client.to(`ticket:${ticketId}`).emit('user_left_ticket', {
      ticketId,
      userId: user.id,
      timestamp: new Date(),
    });

    this.logger.debug(`User ${user.email} left ticket ${ticketId}`);

    return { success: true };
  }

  /**
   * Send a message in a ticket
   */
  @SubscribeMessage('send_message')
  async handleSendMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: SendMessagePayload,
  ): Promise<{ success: boolean; message?: ChatMessage; error?: string }> {
    const user = this.socketToUser.get(client.id);

    if (!user) {
      return { success: false, error: 'Not authenticated' };
    }

    const { ticketId, content, type = 'text', attachments } = payload;

    // Validate content
    if (!content || content.trim().length === 0) {
      return { success: false, error: 'Message content required' };
    }

    // Check if room exists
    let room = this.ticketRooms.get(ticketId);
    if (!room) {
      // Create room on first message
      room = {
        ticketId,
        festivalId: user.festivalId || 'global',
        userId: user.id,
        status: 'open',
        priority: 'medium',
        participants: new Set([user.id]),
        messageCount: 0,
        lastActivity: new Date(),
      };
      this.ticketRooms.set(ticketId, room);
    }

    // Verify access
    if (!this.canAccessTicket(user, room)) {
      return { success: false, error: 'Access denied' };
    }

    // Create message
    const message: ChatMessage = {
      id: this.generateMessageId(),
      ticketId,
      senderId: user.id,
      senderName: user.displayName || user.email,
      senderRole: this.isAgent(user) ? 'agent' : 'user',
      content: content.trim(),
      type,
      attachments,
      createdAt: new Date(),
      readBy: [user.id],
    };

    // Update room
    room.messageCount++;
    room.lastActivity = new Date();

    // Update status if needed
    if (this.isAgent(user) && room.status === 'waiting_agent') {
      room.status = 'in_progress';
    } else if (!this.isAgent(user) && room.status === 'waiting_user') {
      room.status = 'in_progress';
    }

    // Clear typing indicator
    this.clearTypingIndicator(ticketId, user.id);

    // Broadcast to room
    this.server.to(`ticket:${ticketId}`).emit('new_message', message);

    // Notify offline participants
    room.participants.forEach((participantId) => {
      if (participantId !== user.id && !this.isUserOnline(participantId)) {
        this.queueMessage(participantId, message);
      }
    });

    // Notify agents if it's a user message
    if (!this.isAgent(user)) {
      this.server.to('support:agents').emit('ticket_activity', {
        ticketId,
        festivalId: room.festivalId,
        type: 'new_message',
        preview: content.substring(0, 100),
        timestamp: new Date(),
      });
    }

    this.logger.debug(`Message sent in ticket ${ticketId} by ${user.email}`);

    return { success: true, message };
  }

  /**
   * Mark messages as read
   */
  @SubscribeMessage('mark_read')
  handleMarkRead(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { ticketId: string; messageIds: string[] },
  ): { success: boolean } {
    const user = this.socketToUser.get(client.id);

    if (!user) {
      return { success: false };
    }

    const { ticketId, messageIds } = payload;

    // Broadcast read receipts
    this.server.to(`ticket:${ticketId}`).emit('messages_read', {
      ticketId,
      messageIds,
      userId: user.id,
      timestamp: new Date(),
    });

    return { success: true };
  }

  /**
   * Typing indicator - start
   */
  @SubscribeMessage('typing_start')
  handleTypingStart(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { ticketId: string },
  ): void {
    const user = this.socketToUser.get(client.id);

    if (!user) {
      return;
    }

    const { ticketId } = payload;

    // Initialize ticket typing map
    if (!this.typingInTicket.has(ticketId)) {
      this.typingInTicket.set(ticketId, new Map());
    }

    const ticketTyping = this.typingInTicket.get(ticketId)!;

    // Clear existing timeout
    const existingTimeout = ticketTyping.get(user.id);
    if (existingTimeout) {
      clearTimeout(existingTimeout);
    }

    // Set timeout to auto-clear typing (5 seconds)
    const timeout = setTimeout(() => {
      this.clearTypingIndicator(ticketId, user.id);
    }, 5000);

    ticketTyping.set(user.id, timeout);

    // Broadcast typing indicator
    client.to(`ticket:${ticketId}`).emit('typing_started', {
      ticketId,
      userId: user.id,
      userName: user.displayName || user.email,
    });
  }

  /**
   * Typing indicator - stop
   */
  @SubscribeMessage('typing_stop')
  handleTypingStop(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { ticketId: string },
  ): void {
    const user = this.socketToUser.get(client.id);

    if (!user) {
      return;
    }

    this.clearTypingIndicator(payload.ticketId, user.id);
  }

  /**
   * Update ticket status
   */
  @SubscribeMessage('update_status')
  handleUpdateStatus(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: TicketStatusPayload,
  ): { success: boolean; error?: string } {
    const user = this.socketToUser.get(client.id);

    if (!user) {
      return { success: false, error: 'Not authenticated' };
    }

    const { ticketId, status, reason } = payload;
    const room = this.ticketRooms.get(ticketId);

    if (!room) {
      return { success: false, error: 'Ticket not found' };
    }

    // Only agents can update status
    if (!this.isAgent(user)) {
      return { success: false, error: 'Only agents can update status' };
    }

    const oldStatus = room.status;
    room.status = status;
    room.lastActivity = new Date();

    // Send system message
    const systemMessage: ChatMessage = {
      id: this.generateMessageId(),
      ticketId,
      senderId: 'system',
      senderName: 'System',
      senderRole: 'system',
      content: `Ticket status changed from ${oldStatus} to ${status}${reason ? `: ${reason}` : ''}`,
      type: 'system',
      createdAt: new Date(),
    };

    this.server.to(`ticket:${ticketId}`).emit('new_message', systemMessage);
    this.server.to(`ticket:${ticketId}`).emit('status_updated', {
      ticketId,
      oldStatus,
      newStatus: status,
      updatedBy: user.displayName || user.email,
      reason,
      timestamp: new Date(),
    });

    this.logger.debug(`Ticket ${ticketId} status updated to ${status} by ${user.email}`);

    return { success: true };
  }

  /**
   * Assign agent to ticket
   */
  @SubscribeMessage('assign_agent')
  async handleAssignAgent(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: AgentAssignPayload,
  ): Promise<{ success: boolean; error?: string }> {
    const user = this.socketToUser.get(client.id);

    if (!user) {
      return { success: false, error: 'Not authenticated' };
    }

    if (!this.isAgent(user)) {
      return { success: false, error: 'Only agents can assign' };
    }

    const { ticketId, agentId, agentName } = payload;
    const room = this.ticketRooms.get(ticketId);

    if (!room) {
      return { success: false, error: 'Ticket not found' };
    }

    room.assignedAgentId = agentId;
    room.participants.add(agentId);
    room.status = 'in_progress';
    room.lastActivity = new Date();

    // System message
    const systemMessage: ChatMessage = {
      id: this.generateMessageId(),
      ticketId,
      senderId: 'system',
      senderName: 'System',
      senderRole: 'system',
      content: `Agent ${agentName} has been assigned to this ticket`,
      type: 'system',
      createdAt: new Date(),
    };

    this.server.to(`ticket:${ticketId}`).emit('new_message', systemMessage);
    this.server.to(`ticket:${ticketId}`).emit('agent_assigned', {
      ticketId,
      agentId,
      agentName,
      assignedBy: user.displayName || user.email,
      timestamp: new Date(),
    });

    // Notify the assigned agent
    this.server.to(`user:${agentId}`).emit('ticket_assigned', {
      ticketId,
      festivalId: room.festivalId,
      assignedBy: user.displayName || user.email,
    });

    this.logger.debug(`Agent ${agentName} assigned to ticket ${ticketId}`);

    return { success: true };
  }

  /**
   * Get active tickets for support agents
   */
  @SubscribeMessage('get_active_tickets')
  handleGetActiveTickets(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { festivalId?: string },
  ): { tickets: ReturnType<typeof this.serializeRoom>[] } {
    const user = this.socketToUser.get(client.id);

    if (!user || !this.isAgent(user)) {
      return { tickets: [] };
    }

    const tickets: ReturnType<typeof this.serializeRoom>[] = [];

    this.ticketRooms.forEach((room) => {
      if (
        room.status !== 'closed' &&
        room.status !== 'resolved' &&
        (!payload.festivalId || room.festivalId === payload.festivalId)
      ) {
        tickets.push(this.serializeRoom(room));
      }
    });

    // Sort by last activity
    tickets.sort((a, b) => new Date(b.lastActivity).getTime() - new Date(a.lastActivity).getTime());

    return { tickets };
  }

  // ==================== Server-side methods ====================

  /**
   * Broadcast message to a ticket (from other services)
   */
  broadcastToTicket(ticketId: string, event: string, data: unknown): void {
    this.server.to(`ticket:${ticketId}`).emit(event, data);
  }

  /**
   * Notify agents of new ticket
   */
  notifyNewTicket(festivalId: string, ticketId: string, preview: string): void {
    this.server.to('support:agents').emit('new_ticket', {
      ticketId,
      festivalId,
      preview,
      timestamp: new Date(),
    });
  }

  /**
   * Get online agent count
   */
  getOnlineAgentCount(festivalId?: string): number {
    let count = 0;
    this.socketToUser.forEach((user) => {
      if (this.isAgent(user)) {
        if (!festivalId || user.festivalId === festivalId) {
          count++;
        }
      }
    });
    return count;
  }

  // ==================== Private helpers ====================

  private async verifyToken(token: string): Promise<WsUser> {
    const secret = this.configService.get<string>('JWT_SECRET') || 'default-secret';
    const payload = await this.jwtService.verifyAsync(token, { secret });

    return {
      id: payload.sub || payload.id,
      email: payload.email,
      displayName: payload.displayName || payload.name,
      role: payload.role,
      festivalId: payload.festivalId,
    };
  }

  private isAgent(user: WsUser): boolean {
    return ['ADMIN', 'ORGANIZER', 'SUPPORT', 'SUPER_ADMIN'].includes(user.role);
  }

  private canAccessTicket(user: WsUser, room: TicketRoom): boolean {
    // Agents can access any ticket
    if (this.isAgent(user)) {
      return true;
    }

    // User can only access their own ticket
    return room.userId === user.id;
  }

  private isUserOnline(userId: string): boolean {
    const sockets = this.userToSockets.get(userId);
    return sockets !== undefined && sockets.size > 0;
  }

  private queueMessage(userId: string, message: ChatMessage): void {
    if (!this.messageQueue.has(userId)) {
      this.messageQueue.set(userId, []);
    }
    const queue = this.messageQueue.get(userId)!;
    queue.push(message);

    // Limit queue size
    if (queue.length > 100) {
      queue.shift();
    }
  }

  private clearTypingIndicator(ticketId: string, userId: string): void {
    const ticketTyping = this.typingInTicket.get(ticketId);
    if (ticketTyping) {
      const timeout = ticketTyping.get(userId);
      if (timeout) {
        clearTimeout(timeout);
        ticketTyping.delete(userId);
      }

      this.server.to(`ticket:${ticketId}`).emit('typing_stopped', {
        ticketId,
        userId,
      });
    }
  }

  private generateMessageId(): string {
    return `msg_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }

  private serializeRoom(room: TicketRoom): Omit<TicketRoom, 'participants'> & { participants: string[] } {
    return {
      ...room,
      participants: Array.from(room.participants),
    };
  }
}
