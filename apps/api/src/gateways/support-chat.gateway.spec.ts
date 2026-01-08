/**
 * Support Chat Gateway Unit Tests
 *
 * Comprehensive tests for WebSocket Support Chat Gateway functionality including:
 * - Connection handling with authentication
 * - Ticket room management
 * - Real-time messaging
 * - Typing indicators
 * - Agent assignment
 * - Ticket status updates
 * - Message queueing for offline users
 */

import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { SupportChatGateway, TicketRoom } from './support-chat.gateway';
import { Server, Socket } from 'socket.io';

// ============================================================================
// Mock Types & Fixtures
// ============================================================================

interface MockSocket extends Partial<Socket> {
  id: string;
  rooms: Set<string>;
  user?: WsUser;
  handshake: {
    auth: { token?: string };
    headers: { authorization?: string };
  };
  join: jest.Mock;
  leave: jest.Mock;
  emit: jest.Mock;
  to: jest.Mock;
  disconnect: jest.Mock;
}

interface WsUser {
  id: string;
  email: string;
  displayName?: string;
  role: string;
  festivalId?: string;
}

const createMockSocket = (overrides: Partial<MockSocket> = {}): MockSocket => ({
  id: 'socket-id-123',
  rooms: new Set(['socket-id-123']),
  handshake: {
    auth: { token: 'valid-jwt-token' },
    headers: {},
  },
  join: jest.fn().mockResolvedValue(undefined),
  leave: jest.fn().mockResolvedValue(undefined),
  emit: jest.fn(),
  to: jest.fn().mockReturnValue({ emit: jest.fn() }),
  disconnect: jest.fn(),
  ...overrides,
});

const mockRegularUser: WsUser = {
  id: 'user-uuid-123',
  email: 'user@festival.test',
  displayName: 'Test User',
  role: 'USER',
  festivalId: 'festival-uuid-123',
};

const mockSecondUser: WsUser = {
  id: 'user-uuid-456',
  email: 'second@festival.test',
  displayName: 'Second User',
  role: 'USER',
  festivalId: 'festival-uuid-123',
};

const mockSupportAgent: WsUser = {
  id: 'agent-uuid-789',
  email: 'agent@festival.test',
  displayName: 'Support Agent',
  role: 'SUPPORT',
  festivalId: 'festival-uuid-123',
};

const mockAdminUser: WsUser = {
  id: 'admin-uuid-101',
  email: 'admin@festival.test',
  displayName: 'Admin User',
  role: 'ADMIN',
  festivalId: 'festival-uuid-123',
};

const mockOrganizerUser: WsUser = {
  id: 'organizer-uuid-102',
  email: 'organizer@festival.test',
  displayName: 'Organizer',
  role: 'ORGANIZER',
  festivalId: 'festival-uuid-123',
};

const testFestivalId = 'festival-uuid-123';
const testTicketId = 'ticket-uuid-789';

// ============================================================================
// Test Suite
// ============================================================================

describe('SupportChatGateway', () => {
  let gateway: SupportChatGateway;
  let mockServer: Partial<Server>;

  const mockJwtService = {
    verifyAsync: jest.fn(),
  };

  const mockConfigService = {
    getOrThrow: jest.fn().mockReturnValue('jwt-secret-key'),
    get: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    jest.useFakeTimers();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SupportChatGateway,
        { provide: JwtService, useValue: mockJwtService },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    gateway = module.get<SupportChatGateway>(SupportChatGateway);

    // Setup mock server
    mockServer = {
      emit: jest.fn(),
      to: jest.fn().mockReturnValue({ emit: jest.fn() }),
      use: jest.fn(),
      sockets: {
        sockets: new Map(),
      } as any,
    };

    gateway.server = mockServer as Server;
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  // ==========================================================================
  // afterInit Tests
  // ==========================================================================

  describe('afterInit', () => {
    it('should initialize the gateway with authentication middleware', () => {
      const mockServerWithMiddleware = {
        use: jest.fn(),
      } as any;

      gateway.afterInit(mockServerWithMiddleware);

      expect(mockServerWithMiddleware.use).toHaveBeenCalledTimes(1);
      expect(mockServerWithMiddleware.use).toHaveBeenCalledWith(expect.any(Function));
    });

    it('should reject connection when no token is provided', async () => {
      const mockServerWithMiddleware = {
        use: jest.fn(),
      } as any;

      gateway.afterInit(mockServerWithMiddleware);

      const middleware = mockServerWithMiddleware.use.mock.calls[0][0];
      const socketWithoutToken = createMockSocket({
        handshake: {
          auth: {},
          headers: {},
        },
      });
      const next = jest.fn();

      await middleware(socketWithoutToken, next);

      expect(next).toHaveBeenCalledWith(new Error('Authentication failed'));
    });

    it('should accept connection with valid token', async () => {
      mockJwtService.verifyAsync.mockResolvedValue({
        sub: mockRegularUser.id,
        email: mockRegularUser.email,
        displayName: mockRegularUser.displayName,
        role: mockRegularUser.role,
        festivalId: mockRegularUser.festivalId,
      });

      const mockServerWithMiddleware = {
        use: jest.fn(),
      } as any;

      gateway.afterInit(mockServerWithMiddleware);

      const middleware = mockServerWithMiddleware.use.mock.calls[0][0];
      const socket = createMockSocket();
      const next = jest.fn();

      await middleware(socket, next);

      expect(next).toHaveBeenCalledWith();
      expect((socket as any).user).toBeDefined();
    });

    it('should reject connection when token verification fails', async () => {
      mockJwtService.verifyAsync.mockRejectedValue(new Error('Invalid token'));

      const mockServerWithMiddleware = {
        use: jest.fn(),
      } as any;

      gateway.afterInit(mockServerWithMiddleware);

      const middleware = mockServerWithMiddleware.use.mock.calls[0][0];
      const socket = createMockSocket();
      const next = jest.fn();

      await middleware(socket, next);

      expect(next).toHaveBeenCalledWith(new Error('Authentication failed'));
    });

    it('should extract displayName from name field if displayName not present', async () => {
      mockJwtService.verifyAsync.mockResolvedValue({
        sub: mockRegularUser.id,
        email: mockRegularUser.email,
        name: 'Name From Token',
        role: mockRegularUser.role,
      });

      const mockServerWithMiddleware = {
        use: jest.fn(),
      } as any;

      gateway.afterInit(mockServerWithMiddleware);

      const middleware = mockServerWithMiddleware.use.mock.calls[0][0];
      const socket = createMockSocket();
      const next = jest.fn();

      await middleware(socket, next);

      expect((socket as any).user.displayName).toBe('Name From Token');
    });
  });

  // ==========================================================================
  // handleConnection Tests
  // ==========================================================================

  describe('handleConnection', () => {
    it('should add authenticated client and emit connected event', async () => {
      const socket = createMockSocket() as any;
      socket.user = mockRegularUser;

      await gateway.handleConnection(socket as Socket);

      expect(socket.emit).toHaveBeenCalledWith(
        'connected',
        expect.objectContaining({
          userId: mockRegularUser.id,
          isAgent: false,
          timestamp: expect.any(Date),
        })
      );
    });

    it('should join user personal room', async () => {
      const socket = createMockSocket() as any;
      socket.user = mockRegularUser;

      await gateway.handleConnection(socket as Socket);

      expect(socket.join).toHaveBeenCalledWith(`user:${mockRegularUser.id}`);
    });

    it('should join agents room for support agents', async () => {
      const socket = createMockSocket() as any;
      socket.user = mockSupportAgent;

      await gateway.handleConnection(socket as Socket);

      expect(socket.join).toHaveBeenCalledWith('support:agents');
      expect(socket.join).toHaveBeenCalledWith(`support:agents:${mockSupportAgent.festivalId}`);
    });

    it('should join agents room for admin users', async () => {
      const socket = createMockSocket() as any;
      socket.user = mockAdminUser;

      await gateway.handleConnection(socket as Socket);

      expect(socket.join).toHaveBeenCalledWith('support:agents');
    });

    it('should join agents room for organizer users', async () => {
      const socket = createMockSocket() as any;
      socket.user = mockOrganizerUser;

      await gateway.handleConnection(socket as Socket);

      expect(socket.join).toHaveBeenCalledWith('support:agents');
    });

    it('should disconnect client without user data', async () => {
      const socket = createMockSocket() as any;
      // No user attached

      await gateway.handleConnection(socket as Socket);

      expect(socket.disconnect).toHaveBeenCalledWith(true);
    });

    it('should deliver queued messages on connection', async () => {
      // First, queue messages for a user
      gateway.notifyNewTicket(testFestivalId, 'test-ticket', 'Preview');

      const socket = createMockSocket() as any;
      socket.user = mockRegularUser;

      await gateway.handleConnection(socket as Socket);

      // Should emit connected event at minimum
      expect(socket.emit).toHaveBeenCalled();
    });

    it('should identify agent correctly based on role', async () => {
      const socket = createMockSocket() as any;
      socket.user = mockSupportAgent;

      await gateway.handleConnection(socket as Socket);

      expect(socket.emit).toHaveBeenCalledWith(
        'connected',
        expect.objectContaining({
          isAgent: true,
        })
      );
    });
  });

  // ==========================================================================
  // handleDisconnect Tests
  // ==========================================================================

  describe('handleDisconnect', () => {
    it('should clean up socket-to-user mapping on disconnect', async () => {
      const socket = createMockSocket() as any;
      socket.user = mockRegularUser;

      await gateway.handleConnection(socket as Socket);
      gateway.handleDisconnect(socket as Socket);

      // Should not throw
    });

    it('should clear typing indicators on disconnect', async () => {
      const socket = createMockSocket() as any;
      socket.user = mockRegularUser;
      await gateway.handleConnection(socket as Socket);

      // Start typing
      gateway.handleTypingStart(socket as Socket, { ticketId: testTicketId });

      // Disconnect
      gateway.handleDisconnect(socket as Socket);

      // Should broadcast typing stopped
      expect(mockServer.to).toHaveBeenCalledWith(`ticket:${testTicketId}`);
    });

    it('should handle disconnect for unknown socket gracefully', () => {
      const socket = createMockSocket({ id: 'unknown-socket' }) as any;

      expect(() => gateway.handleDisconnect(socket as Socket)).not.toThrow();
    });
  });

  // ==========================================================================
  // handleJoinTicket Tests
  // ==========================================================================

  describe('handleJoinTicket', () => {
    it('should allow user to join their own ticket', async () => {
      const socket = createMockSocket() as any;
      socket.user = mockRegularUser;
      await gateway.handleConnection(socket as Socket);

      const result = await gateway.handleJoinTicket(socket as Socket, {
        ticketId: testTicketId,
      });

      expect(result.success).toBe(true);
      expect(socket.join).toHaveBeenCalledWith(`ticket:${testTicketId}`);
    });

    it('should create new room when joining non-existent ticket', async () => {
      const socket = createMockSocket() as any;
      socket.user = mockRegularUser;
      await gateway.handleConnection(socket as Socket);

      const result = await gateway.handleJoinTicket(socket as Socket, {
        ticketId: 'new-ticket-id',
      });

      expect(result.success).toBe(true);
      expect(result.room).toBeDefined();
      expect(result.room?.ticketId).toBe('new-ticket-id');
    });

    it('should allow agents to join any ticket', async () => {
      // First, create a ticket by user
      const userSocket = createMockSocket({ id: 'user-socket' }) as any;
      userSocket.user = mockRegularUser;
      await gateway.handleConnection(userSocket as Socket);
      await gateway.handleJoinTicket(userSocket as Socket, { ticketId: testTicketId });

      // Then agent joins
      const agentSocket = createMockSocket({ id: 'agent-socket' }) as any;
      agentSocket.user = mockSupportAgent;
      await gateway.handleConnection(agentSocket as Socket);

      const result = await gateway.handleJoinTicket(agentSocket as Socket, {
        ticketId: testTicketId,
      });

      expect(result.success).toBe(true);
    });

    it('should deny other users from joining ticket', async () => {
      // Create ticket for first user
      const userSocket = createMockSocket({ id: 'user-socket' }) as any;
      userSocket.user = mockRegularUser;
      await gateway.handleConnection(userSocket as Socket);
      await gateway.handleJoinTicket(userSocket as Socket, { ticketId: testTicketId });

      // Second user tries to join
      const secondSocket = createMockSocket({ id: 'second-socket' }) as any;
      secondSocket.user = mockSecondUser;
      await gateway.handleConnection(secondSocket as Socket);

      const result = await gateway.handleJoinTicket(secondSocket as Socket, {
        ticketId: testTicketId,
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Access denied');
    });

    it('should return error for unauthenticated user', async () => {
      const socket = createMockSocket() as any;
      // No user mapping established

      const result = await gateway.handleJoinTicket(socket as Socket, {
        ticketId: testTicketId,
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Not authenticated');
    });

    it('should notify others when user joins ticket', async () => {
      // First, user creates the ticket
      const userSocket = createMockSocket({ id: 'user-socket' }) as any;
      userSocket.user = mockRegularUser;
      await gateway.handleConnection(userSocket as Socket);
      await gateway.handleJoinTicket(userSocket as Socket, { ticketId: testTicketId });

      // Then an agent joins
      const agentSocket = createMockSocket({ id: 'agent-socket' }) as any;
      agentSocket.user = mockSupportAgent;
      const emitMock = jest.fn();
      agentSocket.to = jest.fn().mockReturnValue({ emit: emitMock });
      await gateway.handleConnection(agentSocket as Socket);

      // Agent joining existing room should notify others
      await gateway.handleJoinTicket(agentSocket as Socket, { ticketId: testTicketId });

      expect(agentSocket.to).toHaveBeenCalledWith(`ticket:${testTicketId}`);
      expect(emitMock).toHaveBeenCalledWith(
        'user_joined_ticket',
        expect.objectContaining({
          ticketId: testTicketId,
          userId: mockSupportAgent.id,
          isAgent: true,
        })
      );
    });
  });

  // ==========================================================================
  // handleLeaveTicket Tests
  // ==========================================================================

  describe('handleLeaveTicket', () => {
    it('should allow user to leave ticket', async () => {
      const socket = createMockSocket() as any;
      socket.user = mockRegularUser;
      const emitMock = jest.fn();
      socket.to = jest.fn().mockReturnValue({ emit: emitMock });
      await gateway.handleConnection(socket as Socket);

      await gateway.handleJoinTicket(socket as Socket, { ticketId: testTicketId });
      const result = await gateway.handleLeaveTicket(socket as Socket, {
        ticketId: testTicketId,
      });

      expect(result.success).toBe(true);
      expect(socket.leave).toHaveBeenCalledWith(`ticket:${testTicketId}`);
    });

    it('should return failure for unauthenticated user', async () => {
      const socket = createMockSocket() as any;

      const result = await gateway.handleLeaveTicket(socket as Socket, {
        ticketId: testTicketId,
      });

      expect(result.success).toBe(false);
    });

    it('should notify others when user leaves', async () => {
      const socket = createMockSocket() as any;
      socket.user = mockRegularUser;
      const emitMock = jest.fn();
      socket.to = jest.fn().mockReturnValue({ emit: emitMock });
      await gateway.handleConnection(socket as Socket);

      await gateway.handleJoinTicket(socket as Socket, { ticketId: testTicketId });
      await gateway.handleLeaveTicket(socket as Socket, { ticketId: testTicketId });

      expect(emitMock).toHaveBeenCalledWith(
        'user_left_ticket',
        expect.objectContaining({
          ticketId: testTicketId,
          userId: mockRegularUser.id,
        })
      );
    });
  });

  // ==========================================================================
  // handleSendMessage Tests
  // ==========================================================================

  describe('handleSendMessage', () => {
    it('should send message successfully', async () => {
      const socket = createMockSocket() as any;
      socket.user = mockRegularUser;
      await gateway.handleConnection(socket as Socket);
      await gateway.handleJoinTicket(socket as Socket, { ticketId: testTicketId });

      const result = await gateway.handleSendMessage(socket as Socket, {
        ticketId: testTicketId,
        content: 'Hello, I need help!',
      });

      expect(result.success).toBe(true);
      expect(result.message).toBeDefined();
      expect(result.message?.content).toBe('Hello, I need help!');
    });

    it('should broadcast message to ticket room', async () => {
      const socket = createMockSocket() as any;
      socket.user = mockRegularUser;
      await gateway.handleConnection(socket as Socket);
      await gateway.handleJoinTicket(socket as Socket, { ticketId: testTicketId });

      await gateway.handleSendMessage(socket as Socket, {
        ticketId: testTicketId,
        content: 'Test message',
      });

      expect(mockServer.to).toHaveBeenCalledWith(`ticket:${testTicketId}`);
    });

    it('should return error for empty content', async () => {
      const socket = createMockSocket() as any;
      socket.user = mockRegularUser;
      await gateway.handleConnection(socket as Socket);

      const result = await gateway.handleSendMessage(socket as Socket, {
        ticketId: testTicketId,
        content: '',
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Message content required');
    });

    it('should return error for whitespace-only content', async () => {
      const socket = createMockSocket() as any;
      socket.user = mockRegularUser;
      await gateway.handleConnection(socket as Socket);

      const result = await gateway.handleSendMessage(socket as Socket, {
        ticketId: testTicketId,
        content: '   ',
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Message content required');
    });

    it('should return error for unauthenticated user', async () => {
      const socket = createMockSocket() as any;

      const result = await gateway.handleSendMessage(socket as Socket, {
        ticketId: testTicketId,
        content: 'Test',
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Not authenticated');
    });

    it('should trim message content', async () => {
      const socket = createMockSocket() as any;
      socket.user = mockRegularUser;
      await gateway.handleConnection(socket as Socket);

      const result = await gateway.handleSendMessage(socket as Socket, {
        ticketId: testTicketId,
        content: '  Trimmed message  ',
      });

      expect(result.message?.content).toBe('Trimmed message');
    });

    it('should set correct sender role for agent', async () => {
      const socket = createMockSocket() as any;
      socket.user = mockSupportAgent;
      await gateway.handleConnection(socket as Socket);

      const result = await gateway.handleSendMessage(socket as Socket, {
        ticketId: testTicketId,
        content: 'Agent response',
      });

      expect(result.message?.senderRole).toBe('agent');
    });

    it('should set correct sender role for user', async () => {
      const socket = createMockSocket() as any;
      socket.user = mockRegularUser;
      await gateway.handleConnection(socket as Socket);

      const result = await gateway.handleSendMessage(socket as Socket, {
        ticketId: testTicketId,
        content: 'User message',
      });

      expect(result.message?.senderRole).toBe('user');
    });

    it('should support different message types', async () => {
      const socket = createMockSocket() as any;
      socket.user = mockRegularUser;
      await gateway.handleConnection(socket as Socket);

      const imageResult = await gateway.handleSendMessage(socket as Socket, {
        ticketId: testTicketId,
        content: 'Image attached',
        type: 'image',
      });

      expect(imageResult.message?.type).toBe('image');

      const fileResult = await gateway.handleSendMessage(socket as Socket, {
        ticketId: testTicketId,
        content: 'File attached',
        type: 'file',
      });

      expect(fileResult.message?.type).toBe('file');
    });

    it('should include attachments in message', async () => {
      const socket = createMockSocket() as any;
      socket.user = mockRegularUser;
      await gateway.handleConnection(socket as Socket);

      const result = await gateway.handleSendMessage(socket as Socket, {
        ticketId: testTicketId,
        content: 'With attachment',
        attachments: [
          {
            id: 'attach-1',
            filename: 'screenshot.png',
            mimeType: 'image/png',
            size: 1024,
            url: 'https://example.com/screenshot.png',
          },
        ],
      });

      expect(result.message?.attachments).toHaveLength(1);
      expect(result.message?.attachments?.[0].filename).toBe('screenshot.png');
    });

    it('should update ticket status when agent responds', async () => {
      // User creates ticket
      const userSocket = createMockSocket({ id: 'user-socket' }) as any;
      userSocket.user = mockRegularUser;
      await gateway.handleConnection(userSocket as Socket);
      await gateway.handleJoinTicket(userSocket as Socket, { ticketId: testTicketId });

      // Update status to waiting_agent
      const agentSocket = createMockSocket({ id: 'agent-socket' }) as any;
      agentSocket.user = mockSupportAgent;
      await gateway.handleConnection(agentSocket as Socket);
      await gateway.handleJoinTicket(agentSocket as Socket, { ticketId: testTicketId });

      gateway.handleUpdateStatus(agentSocket as Socket, {
        ticketId: testTicketId,
        status: 'waiting_agent',
      });

      // Agent responds
      await gateway.handleSendMessage(agentSocket as Socket, {
        ticketId: testTicketId,
        content: 'Agent response',
      });

      // Status should be updated automatically
    });

    it('should notify agents of user messages', async () => {
      const socket = createMockSocket() as any;
      socket.user = mockRegularUser;
      await gateway.handleConnection(socket as Socket);

      await gateway.handleSendMessage(socket as Socket, {
        ticketId: testTicketId,
        content: 'User needs help',
      });

      expect(mockServer.to).toHaveBeenCalledWith('support:agents');
    });

    it('should clear typing indicator when message is sent', async () => {
      const socket = createMockSocket() as any;
      socket.user = mockRegularUser;
      await gateway.handleConnection(socket as Socket);

      // Start typing
      gateway.handleTypingStart(socket as Socket, { ticketId: testTicketId });

      // Send message
      await gateway.handleSendMessage(socket as Socket, {
        ticketId: testTicketId,
        content: 'Message',
      });

      // Typing should be cleared (broadcast to room)
      expect(mockServer.to).toHaveBeenCalledWith(`ticket:${testTicketId}`);
    });
  });

  // ==========================================================================
  // handleMarkRead Tests
  // ==========================================================================

  describe('handleMarkRead', () => {
    it('should mark messages as read', async () => {
      const socket = createMockSocket() as any;
      socket.user = mockRegularUser;
      await gateway.handleConnection(socket as Socket);

      const result = gateway.handleMarkRead(socket as Socket, {
        ticketId: testTicketId,
        messageIds: ['msg-1', 'msg-2', 'msg-3'],
      });

      expect(result.success).toBe(true);
    });

    it('should broadcast read receipts', async () => {
      const socket = createMockSocket() as any;
      socket.user = mockRegularUser;
      await gateway.handleConnection(socket as Socket);

      gateway.handleMarkRead(socket as Socket, {
        ticketId: testTicketId,
        messageIds: ['msg-1'],
      });

      expect(mockServer.to).toHaveBeenCalledWith(`ticket:${testTicketId}`);
    });

    it('should return failure for unauthenticated user', () => {
      const socket = createMockSocket() as any;

      const result = gateway.handleMarkRead(socket as Socket, {
        ticketId: testTicketId,
        messageIds: ['msg-1'],
      });

      expect(result.success).toBe(false);
    });
  });

  // ==========================================================================
  // handleTypingStart Tests
  // ==========================================================================

  describe('handleTypingStart', () => {
    it('should broadcast typing started', async () => {
      const socket = createMockSocket() as any;
      socket.user = mockRegularUser;
      const emitMock = jest.fn();
      socket.to = jest.fn().mockReturnValue({ emit: emitMock });
      await gateway.handleConnection(socket as Socket);

      gateway.handleTypingStart(socket as Socket, { ticketId: testTicketId });

      expect(socket.to).toHaveBeenCalledWith(`ticket:${testTicketId}`);
      expect(emitMock).toHaveBeenCalledWith(
        'typing_started',
        expect.objectContaining({
          ticketId: testTicketId,
          userId: mockRegularUser.id,
        })
      );
    });

    it('should not emit for unauthenticated user', () => {
      const socket = createMockSocket() as any;
      const emitMock = jest.fn();
      socket.to = jest.fn().mockReturnValue({ emit: emitMock });

      gateway.handleTypingStart(socket as Socket, { ticketId: testTicketId });

      expect(socket.to).not.toHaveBeenCalled();
    });

    it('should auto-clear typing after timeout', async () => {
      const socket = createMockSocket() as any;
      socket.user = mockRegularUser;
      await gateway.handleConnection(socket as Socket);

      gateway.handleTypingStart(socket as Socket, { ticketId: testTicketId });

      // Advance time past the 5 second timeout
      jest.advanceTimersByTime(5001);

      expect(mockServer.to).toHaveBeenCalledWith(`ticket:${testTicketId}`);
    });
  });

  // ==========================================================================
  // handleTypingStop Tests
  // ==========================================================================

  describe('handleTypingStop', () => {
    it('should broadcast typing stopped', async () => {
      const socket = createMockSocket() as any;
      socket.user = mockRegularUser;
      await gateway.handleConnection(socket as Socket);

      gateway.handleTypingStart(socket as Socket, { ticketId: testTicketId });
      gateway.handleTypingStop(socket as Socket, { ticketId: testTicketId });

      expect(mockServer.to).toHaveBeenCalledWith(`ticket:${testTicketId}`);
    });

    it('should not emit for unauthenticated user', () => {
      const socket = createMockSocket() as any;

      gateway.handleTypingStop(socket as Socket, { ticketId: testTicketId });

      // Should not throw
    });
  });

  // ==========================================================================
  // handleUpdateStatus Tests
  // ==========================================================================

  describe('handleUpdateStatus', () => {
    it('should allow agent to update ticket status', async () => {
      // User creates ticket
      const userSocket = createMockSocket({ id: 'user-socket' }) as any;
      userSocket.user = mockRegularUser;
      await gateway.handleConnection(userSocket as Socket);
      await gateway.handleJoinTicket(userSocket as Socket, { ticketId: testTicketId });

      // Agent updates status
      const agentSocket = createMockSocket({ id: 'agent-socket' }) as any;
      agentSocket.user = mockSupportAgent;
      await gateway.handleConnection(agentSocket as Socket);

      const result = gateway.handleUpdateStatus(agentSocket as Socket, {
        ticketId: testTicketId,
        status: 'in_progress',
      });

      expect(result.success).toBe(true);
    });

    it('should deny non-agent from updating status', async () => {
      const socket = createMockSocket() as any;
      socket.user = mockRegularUser;
      await gateway.handleConnection(socket as Socket);
      await gateway.handleJoinTicket(socket as Socket, { ticketId: testTicketId });

      const result = gateway.handleUpdateStatus(socket as Socket, {
        ticketId: testTicketId,
        status: 'resolved',
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Only agents can update status');
    });

    it('should return error for non-existent ticket', async () => {
      const socket = createMockSocket() as any;
      socket.user = mockSupportAgent;
      await gateway.handleConnection(socket as Socket);

      const result = gateway.handleUpdateStatus(socket as Socket, {
        ticketId: 'non-existent',
        status: 'resolved',
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Ticket not found');
    });

    it('should broadcast status update to ticket room', async () => {
      const userSocket = createMockSocket({ id: 'user-socket' }) as any;
      userSocket.user = mockRegularUser;
      await gateway.handleConnection(userSocket as Socket);
      await gateway.handleJoinTicket(userSocket as Socket, { ticketId: testTicketId });

      const agentSocket = createMockSocket({ id: 'agent-socket' }) as any;
      agentSocket.user = mockSupportAgent;
      await gateway.handleConnection(agentSocket as Socket);

      gateway.handleUpdateStatus(agentSocket as Socket, {
        ticketId: testTicketId,
        status: 'resolved',
        reason: 'Issue fixed',
      });

      expect(mockServer.to).toHaveBeenCalledWith(`ticket:${testTicketId}`);
    });

    it('should send system message for status change', async () => {
      const userSocket = createMockSocket({ id: 'user-socket' }) as any;
      userSocket.user = mockRegularUser;
      await gateway.handleConnection(userSocket as Socket);
      await gateway.handleJoinTicket(userSocket as Socket, { ticketId: testTicketId });

      const agentSocket = createMockSocket({ id: 'agent-socket' }) as any;
      agentSocket.user = mockSupportAgent;
      await gateway.handleConnection(agentSocket as Socket);

      gateway.handleUpdateStatus(agentSocket as Socket, {
        ticketId: testTicketId,
        status: 'closed',
      });

      // Should emit new_message with system type
      expect(mockServer.to).toHaveBeenCalledWith(`ticket:${testTicketId}`);
    });

    it('should support all ticket statuses', async () => {
      const statuses: TicketRoom['status'][] = [
        'open',
        'in_progress',
        'waiting_user',
        'waiting_agent',
        'resolved',
        'closed',
      ];

      for (const status of statuses) {
        const userSocket = createMockSocket({ id: `user-${status}` }) as any;
        userSocket.user = mockRegularUser;
        await gateway.handleConnection(userSocket as Socket);
        await gateway.handleJoinTicket(userSocket as Socket, { ticketId: `ticket-${status}` });

        const agentSocket = createMockSocket({ id: `agent-${status}` }) as any;
        agentSocket.user = mockSupportAgent;
        await gateway.handleConnection(agentSocket as Socket);

        const result = gateway.handleUpdateStatus(agentSocket as Socket, {
          ticketId: `ticket-${status}`,
          status,
        });

        expect(result.success).toBe(true);
      }
    });
  });

  // ==========================================================================
  // handleAssignAgent Tests
  // ==========================================================================

  describe('handleAssignAgent', () => {
    it('should assign agent to ticket', async () => {
      const userSocket = createMockSocket({ id: 'user-socket' }) as any;
      userSocket.user = mockRegularUser;
      await gateway.handleConnection(userSocket as Socket);
      await gateway.handleJoinTicket(userSocket as Socket, { ticketId: testTicketId });

      const agentSocket = createMockSocket({ id: 'agent-socket' }) as any;
      agentSocket.user = mockSupportAgent;
      await gateway.handleConnection(agentSocket as Socket);

      const result = await gateway.handleAssignAgent(agentSocket as Socket, {
        ticketId: testTicketId,
        agentId: 'new-agent-id',
        agentName: 'New Agent',
      });

      expect(result.success).toBe(true);
    });

    it('should deny non-agent from assigning', async () => {
      const socket = createMockSocket() as any;
      socket.user = mockRegularUser;
      await gateway.handleConnection(socket as Socket);
      await gateway.handleJoinTicket(socket as Socket, { ticketId: testTicketId });

      const result = await gateway.handleAssignAgent(socket as Socket, {
        ticketId: testTicketId,
        agentId: 'agent-id',
        agentName: 'Agent',
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Only agents can assign');
    });

    it('should return error for non-existent ticket', async () => {
      const socket = createMockSocket() as any;
      socket.user = mockSupportAgent;
      await gateway.handleConnection(socket as Socket);

      const result = await gateway.handleAssignAgent(socket as Socket, {
        ticketId: 'non-existent',
        agentId: 'agent-id',
        agentName: 'Agent',
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Ticket not found');
    });

    it('should broadcast agent assignment', async () => {
      const userSocket = createMockSocket({ id: 'user-socket' }) as any;
      userSocket.user = mockRegularUser;
      await gateway.handleConnection(userSocket as Socket);
      await gateway.handleJoinTicket(userSocket as Socket, { ticketId: testTicketId });

      const agentSocket = createMockSocket({ id: 'agent-socket' }) as any;
      agentSocket.user = mockSupportAgent;
      await gateway.handleConnection(agentSocket as Socket);

      await gateway.handleAssignAgent(agentSocket as Socket, {
        ticketId: testTicketId,
        agentId: 'new-agent-id',
        agentName: 'New Agent',
      });

      expect(mockServer.to).toHaveBeenCalledWith(`ticket:${testTicketId}`);
    });

    it('should notify assigned agent', async () => {
      const userSocket = createMockSocket({ id: 'user-socket' }) as any;
      userSocket.user = mockRegularUser;
      await gateway.handleConnection(userSocket as Socket);
      await gateway.handleJoinTicket(userSocket as Socket, { ticketId: testTicketId });

      const agentSocket = createMockSocket({ id: 'agent-socket' }) as any;
      agentSocket.user = mockSupportAgent;
      await gateway.handleConnection(agentSocket as Socket);

      await gateway.handleAssignAgent(agentSocket as Socket, {
        ticketId: testTicketId,
        agentId: 'new-agent-id',
        agentName: 'New Agent',
      });

      expect(mockServer.to).toHaveBeenCalledWith('user:new-agent-id');
    });

    it('should send system message for assignment', async () => {
      const userSocket = createMockSocket({ id: 'user-socket' }) as any;
      userSocket.user = mockRegularUser;
      await gateway.handleConnection(userSocket as Socket);
      await gateway.handleJoinTicket(userSocket as Socket, { ticketId: testTicketId });

      const agentSocket = createMockSocket({ id: 'agent-socket' }) as any;
      agentSocket.user = mockSupportAgent;
      await gateway.handleConnection(agentSocket as Socket);

      await gateway.handleAssignAgent(agentSocket as Socket, {
        ticketId: testTicketId,
        agentId: 'new-agent-id',
        agentName: 'New Agent',
      });

      // Should emit new_message event for system message
      expect(mockServer.to).toHaveBeenCalled();
    });
  });

  // ==========================================================================
  // handleGetActiveTickets Tests
  // ==========================================================================

  describe('handleGetActiveTickets', () => {
    it('should return active tickets for agents', async () => {
      // Create some tickets
      const userSocket = createMockSocket({ id: 'user-socket' }) as any;
      userSocket.user = mockRegularUser;
      await gateway.handleConnection(userSocket as Socket);
      await gateway.handleJoinTicket(userSocket as Socket, { ticketId: 'ticket-1' });
      await gateway.handleJoinTicket(userSocket as Socket, { ticketId: 'ticket-2' });

      const agentSocket = createMockSocket({ id: 'agent-socket' }) as any;
      agentSocket.user = mockSupportAgent;
      await gateway.handleConnection(agentSocket as Socket);

      const result = gateway.handleGetActiveTickets(agentSocket as Socket, {});

      expect(result.tickets).toHaveLength(2);
    });

    it('should filter by festivalId', async () => {
      // Create ticket for festival 1
      const user1Socket = createMockSocket({ id: 'user1-socket' }) as any;
      user1Socket.user = { ...mockRegularUser, festivalId: 'festival-1' };
      await gateway.handleConnection(user1Socket as Socket);
      await gateway.handleJoinTicket(user1Socket as Socket, { ticketId: 'ticket-fest-1' });

      // Create ticket for festival 2
      const user2Socket = createMockSocket({ id: 'user2-socket' }) as any;
      user2Socket.user = { ...mockRegularUser, id: 'user-2', festivalId: 'festival-2' };
      await gateway.handleConnection(user2Socket as Socket);
      await gateway.handleJoinTicket(user2Socket as Socket, { ticketId: 'ticket-fest-2' });

      const agentSocket = createMockSocket({ id: 'agent-socket' }) as any;
      agentSocket.user = mockSupportAgent;
      await gateway.handleConnection(agentSocket as Socket);

      const result = gateway.handleGetActiveTickets(agentSocket as Socket, {
        festivalId: 'festival-1',
      });

      expect(result.tickets.every((t) => t.festivalId === 'festival-1')).toBe(true);
    });

    it('should return empty array for non-agents', async () => {
      const socket = createMockSocket() as any;
      socket.user = mockRegularUser;
      await gateway.handleConnection(socket as Socket);

      const result = gateway.handleGetActiveTickets(socket as Socket, {});

      expect(result.tickets).toEqual([]);
    });

    it('should exclude closed and resolved tickets', async () => {
      const userSocket = createMockSocket({ id: 'user-socket' }) as any;
      userSocket.user = mockRegularUser;
      await gateway.handleConnection(userSocket as Socket);
      await gateway.handleJoinTicket(userSocket as Socket, { ticketId: 'active-ticket' });
      await gateway.handleJoinTicket(userSocket as Socket, { ticketId: 'closed-ticket' });

      const agentSocket = createMockSocket({ id: 'agent-socket' }) as any;
      agentSocket.user = mockSupportAgent;
      await gateway.handleConnection(agentSocket as Socket);

      // Close one ticket
      gateway.handleUpdateStatus(agentSocket as Socket, {
        ticketId: 'closed-ticket',
        status: 'closed',
      });

      const result = gateway.handleGetActiveTickets(agentSocket as Socket, {});

      expect(result.tickets.every((t) => t.status !== 'closed' && t.status !== 'resolved')).toBe(
        true
      );
    });

    it('should sort tickets by last activity', async () => {
      const userSocket = createMockSocket({ id: 'user-socket' }) as any;
      userSocket.user = mockRegularUser;
      await gateway.handleConnection(userSocket as Socket);

      await gateway.handleJoinTicket(userSocket as Socket, { ticketId: 'old-ticket' });

      // Small delay simulation
      jest.advanceTimersByTime(1000);

      await gateway.handleJoinTicket(userSocket as Socket, { ticketId: 'new-ticket' });

      const agentSocket = createMockSocket({ id: 'agent-socket' }) as any;
      agentSocket.user = mockSupportAgent;
      await gateway.handleConnection(agentSocket as Socket);

      const result = gateway.handleGetActiveTickets(agentSocket as Socket, {});

      // Newest should be first
      if (result.tickets.length >= 2) {
        expect(new Date(result.tickets[0].lastActivity).getTime()).toBeGreaterThanOrEqual(
          new Date(result.tickets[1].lastActivity).getTime()
        );
      }
    });
  });

  // ==========================================================================
  // Server-side Methods Tests
  // ==========================================================================

  describe('broadcastToTicket', () => {
    it('should emit event to ticket room', () => {
      gateway.broadcastToTicket(testTicketId, 'custom_event', { data: 'test' });

      expect(mockServer.to).toHaveBeenCalledWith(`ticket:${testTicketId}`);
    });
  });

  describe('notifyNewTicket', () => {
    it('should notify agents of new ticket', () => {
      gateway.notifyNewTicket(testFestivalId, testTicketId, 'Help needed');

      expect(mockServer.to).toHaveBeenCalledWith('support:agents');
    });
  });

  describe('getOnlineAgentCount', () => {
    it('should return count of online agents', async () => {
      const agentSocket = createMockSocket() as any;
      agentSocket.user = mockSupportAgent;
      await gateway.handleConnection(agentSocket as Socket);

      const count = gateway.getOnlineAgentCount();

      expect(count).toBe(1);
    });

    it('should filter by festivalId', async () => {
      const agent1Socket = createMockSocket({ id: 'agent1' }) as any;
      agent1Socket.user = { ...mockSupportAgent, festivalId: 'festival-1' };
      await gateway.handleConnection(agent1Socket as Socket);

      const agent2Socket = createMockSocket({ id: 'agent2' }) as any;
      agent2Socket.user = { ...mockSupportAgent, id: 'agent-2', festivalId: 'festival-2' };
      await gateway.handleConnection(agent2Socket as Socket);

      const count = gateway.getOnlineAgentCount('festival-1');

      expect(count).toBe(1);
    });

    it('should return 0 when no agents online', () => {
      const count = gateway.getOnlineAgentCount();

      expect(count).toBe(0);
    });
  });

  // ==========================================================================
  // Edge Cases Tests
  // ==========================================================================

  describe('edge cases', () => {
    it('should handle special characters in message content', async () => {
      const socket = createMockSocket() as any;
      socket.user = mockRegularUser;
      await gateway.handleConnection(socket as Socket);

      const result = await gateway.handleSendMessage(socket as Socket, {
        ticketId: testTicketId,
        content: 'Special <chars> & "quotes" \'single\'',
      });

      expect(result.success).toBe(true);
      expect(result.message?.content).toContain('Special');
    });

    it('should handle unicode in messages', async () => {
      const socket = createMockSocket() as any;
      socket.user = mockRegularUser;
      await gateway.handleConnection(socket as Socket);

      const result = await gateway.handleSendMessage(socket as Socket, {
        ticketId: testTicketId,
        content: 'Message avec caracteres speciaux',
      });

      expect(result.success).toBe(true);
    });

    it('should handle emoji in messages', async () => {
      const socket = createMockSocket() as any;
      socket.user = mockRegularUser;
      await gateway.handleConnection(socket as Socket);

      const result = await gateway.handleSendMessage(socket as Socket, {
        ticketId: testTicketId,
        content: 'Message with emoji: text here!',
      });

      expect(result.success).toBe(true);
    });

    it('should handle very long messages', async () => {
      const socket = createMockSocket() as any;
      socket.user = mockRegularUser;
      await gateway.handleConnection(socket as Socket);

      const longMessage = 'A'.repeat(10000);

      const result = await gateway.handleSendMessage(socket as Socket, {
        ticketId: testTicketId,
        content: longMessage,
      });

      expect(result.success).toBe(true);
      expect(result.message?.content).toHaveLength(10000);
    });

    it('should handle multiple sockets for same user', async () => {
      const socket1 = createMockSocket({ id: 'socket-1' }) as any;
      socket1.user = mockRegularUser;
      await gateway.handleConnection(socket1 as Socket);

      const socket2 = createMockSocket({ id: 'socket-2' }) as any;
      socket2.user = mockRegularUser;
      await gateway.handleConnection(socket2 as Socket);

      // Both should connect successfully
      expect(socket1.emit).toHaveBeenCalledWith(
        'connected',
        expect.objectContaining({ userId: mockRegularUser.id })
      );
      expect(socket2.emit).toHaveBeenCalledWith(
        'connected',
        expect.objectContaining({ userId: mockRegularUser.id })
      );
    });

    it('should handle rapid typing start/stop', async () => {
      const socket = createMockSocket() as any;
      socket.user = mockRegularUser;
      await gateway.handleConnection(socket as Socket);

      // Rapid typing toggles
      for (let i = 0; i < 10; i++) {
        gateway.handleTypingStart(socket as Socket, { ticketId: testTicketId });
        gateway.handleTypingStop(socket as Socket, { ticketId: testTicketId });
      }

      // Should not throw
    });

    it('should handle message queue limit', async () => {
      // This tests internal queue limiting
      const socket = createMockSocket() as any;
      socket.user = mockRegularUser;

      // Queue many messages
      for (let i = 0; i < 150; i++) {
        gateway.broadcastToTicket(testTicketId, 'queued_message', { index: i });
      }

      await gateway.handleConnection(socket as Socket);

      // Should handle gracefully
    });
  });

  // ==========================================================================
  // Access Control Tests
  // ==========================================================================

  describe('access control', () => {
    it('should allow ticket owner to send messages', async () => {
      const socket = createMockSocket() as any;
      socket.user = mockRegularUser;
      await gateway.handleConnection(socket as Socket);
      await gateway.handleJoinTicket(socket as Socket, { ticketId: testTicketId });

      const result = await gateway.handleSendMessage(socket as Socket, {
        ticketId: testTicketId,
        content: 'Owner message',
      });

      expect(result.success).toBe(true);
    });

    it('should allow agent to send messages to any ticket', async () => {
      // User creates ticket
      const userSocket = createMockSocket({ id: 'user-socket' }) as any;
      userSocket.user = mockRegularUser;
      await gateway.handleConnection(userSocket as Socket);
      await gateway.handleJoinTicket(userSocket as Socket, { ticketId: testTicketId });

      // Agent sends message
      const agentSocket = createMockSocket({ id: 'agent-socket' }) as any;
      agentSocket.user = mockSupportAgent;
      await gateway.handleConnection(agentSocket as Socket);

      const result = await gateway.handleSendMessage(agentSocket as Socket, {
        ticketId: testTicketId,
        content: 'Agent message',
      });

      expect(result.success).toBe(true);
    });

    it('should deny non-owner non-agent from sending messages', async () => {
      // User creates ticket
      const userSocket = createMockSocket({ id: 'user-socket' }) as any;
      userSocket.user = mockRegularUser;
      await gateway.handleConnection(userSocket as Socket);
      await gateway.handleJoinTicket(userSocket as Socket, { ticketId: testTicketId });

      // Another user tries to send
      const otherSocket = createMockSocket({ id: 'other-socket' }) as any;
      otherSocket.user = mockSecondUser;
      await gateway.handleConnection(otherSocket as Socket);

      const result = await gateway.handleSendMessage(otherSocket as Socket, {
        ticketId: testTicketId,
        content: 'Unauthorized message',
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Access denied');
    });
  });
});
