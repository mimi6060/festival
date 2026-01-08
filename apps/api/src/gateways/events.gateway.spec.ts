/**
 * Events Gateway Unit Tests
 *
 * Comprehensive tests for WebSocket Events Gateway functionality including:
 * - Connection handling with authentication
 * - Disconnection handling
 * - Room joining/leaving
 * - Event emission and broadcasting
 * - User authentication via token
 */

import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { WsException } from '@nestjs/websockets';
import { EventsGateway, WsUser, WsNotification } from './events.gateway';
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
  to: jest.fn().mockReturnThis(),
  disconnect: jest.fn(),
  ...overrides,
});

const mockUser: WsUser = {
  id: 'user-uuid-123',
  email: 'test@festival.test',
  role: 'USER',
  festivalId: 'festival-uuid-123',
};

const mockAdminUser: WsUser = {
  id: 'admin-uuid-456',
  email: 'admin@festival.test',
  role: 'ADMIN',
};

// ============================================================================
// Test Suite
// ============================================================================

describe('EventsGateway', () => {
  let gateway: EventsGateway;
  let jwtService: JwtService;
  let configService: ConfigService;
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

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EventsGateway,
        { provide: JwtService, useValue: mockJwtService },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    gateway = module.get<EventsGateway>(EventsGateway);
    jwtService = module.get<JwtService>(JwtService);
    configService = module.get<ConfigService>(ConfigService);

    // Setup mock server
    mockServer = {
      emit: jest.fn(),
      to: jest.fn().mockReturnThis(),
      use: jest.fn(),
      sockets: {
        sockets: new Map(),
      } as any,
    };

    gateway.server = mockServer as Server;
  });

  // ==========================================================================
  // afterInit Tests
  // ==========================================================================

  describe('afterInit', () => {
    it('should initialize the gateway and set up authentication middleware', () => {
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

      // Get the middleware function
      const middleware = mockServerWithMiddleware.use.mock.calls[0][0];

      const socketWithoutToken = createMockSocket({
        handshake: {
          auth: {},
          headers: {},
        },
      });

      const next = jest.fn();

      await middleware(socketWithoutToken, next);

      expect(next).toHaveBeenCalledWith(new Error('Authentication required'));
    });

    it('should accept connection with valid token in auth', async () => {
      mockJwtService.verifyAsync.mockResolvedValue({
        sub: mockUser.id,
        email: mockUser.email,
        role: mockUser.role,
        festivalId: mockUser.festivalId,
      });

      const mockServerWithMiddleware = {
        use: jest.fn(),
      } as any;

      gateway.afterInit(mockServerWithMiddleware);

      const middleware = mockServerWithMiddleware.use.mock.calls[0][0];
      const socket = createMockSocket();
      const next = jest.fn();

      await middleware(socket, next);

      // Verify token was validated and extracted from auth
      expect(mockJwtService.verifyAsync).toHaveBeenCalled();
      const callArgs = mockJwtService.verifyAsync.mock.calls[0];
      expect(callArgs[0]).toBe('valid-jwt-token');
      expect(next).toHaveBeenCalledWith();
      expect((socket as any).user).toEqual({
        id: mockUser.id,
        email: mockUser.email,
        role: mockUser.role,
        festivalId: mockUser.festivalId,
      });
    });

    it('should accept connection with valid token in authorization header', async () => {
      mockJwtService.verifyAsync.mockResolvedValue({
        sub: mockUser.id,
        email: mockUser.email,
        role: mockUser.role,
      });

      const mockServerWithMiddleware = {
        use: jest.fn(),
      } as any;

      gateway.afterInit(mockServerWithMiddleware);

      const middleware = mockServerWithMiddleware.use.mock.calls[0][0];
      const socket = createMockSocket({
        handshake: {
          auth: {},
          headers: { authorization: 'Bearer header-token' },
        },
      });
      const next = jest.fn();

      await middleware(socket, next);

      // Verify token from authorization header was extracted and used
      expect(mockJwtService.verifyAsync).toHaveBeenCalled();
      const callArgs = mockJwtService.verifyAsync.mock.calls[0];
      expect(callArgs[0]).toBe('header-token');
      expect(next).toHaveBeenCalledWith();
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

      expect(next).toHaveBeenCalledWith(new Error('Authentication required'));
    });
  });

  // ==========================================================================
  // handleConnection Tests
  // ==========================================================================

  describe('handleConnection', () => {
    it('should add authenticated client to connected clients', async () => {
      const socket = createMockSocket() as any;
      socket.user = mockUser;

      await gateway.handleConnection(socket as Socket);

      expect(socket.join).toHaveBeenCalledWith(`user:${mockUser.id}`);
      expect(socket.emit).toHaveBeenCalledWith(
        'connected',
        expect.objectContaining({
          clientId: socket.id,
          authenticated: true,
          user: {
            id: mockUser.id,
            email: mockUser.email,
            role: mockUser.role,
          },
        })
      );
    });

    it('should disconnect client without user data', async () => {
      const socket = createMockSocket() as any;
      // No user attached

      await gateway.handleConnection(socket as Socket);

      expect(socket.disconnect).toHaveBeenCalledWith(true);
      expect(socket.emit).not.toHaveBeenCalledWith('connected', expect.anything());
    });

    it('should auto-join user to personal room', async () => {
      const socket = createMockSocket() as any;
      socket.user = mockUser;

      await gateway.handleConnection(socket as Socket);

      expect(socket.join).toHaveBeenCalledWith(`user:${mockUser.id}`);
    });

    it('should track connected client count', async () => {
      const socket1 = createMockSocket({ id: 'socket-1' }) as any;
      socket1.user = mockUser;

      const socket2 = createMockSocket({ id: 'socket-2' }) as any;
      socket2.user = mockAdminUser;

      await gateway.handleConnection(socket1 as Socket);
      await gateway.handleConnection(socket2 as Socket);

      expect(gateway.getConnectedCount()).toBe(2);
    });

    it('should emit timestamp in connection response', async () => {
      const socket = createMockSocket() as any;
      socket.user = mockUser;

      await gateway.handleConnection(socket as Socket);

      expect(socket.emit).toHaveBeenCalledWith(
        'connected',
        expect.objectContaining({
          timestamp: expect.any(Date),
        })
      );
    });
  });

  // ==========================================================================
  // handleDisconnect Tests
  // ==========================================================================

  describe('handleDisconnect', () => {
    it('should remove client from connected clients on disconnect', async () => {
      const socket = createMockSocket() as any;
      socket.user = mockUser;

      await gateway.handleConnection(socket as Socket);
      expect(gateway.getConnectedCount()).toBe(1);

      gateway.handleDisconnect(socket as Socket);
      expect(gateway.getConnectedCount()).toBe(0);
    });

    it('should remove client from all tracked rooms on disconnect', async () => {
      const socket = createMockSocket() as any;
      socket.user = mockUser;

      await gateway.handleConnection(socket as Socket);

      // Join additional rooms
      await gateway.handleJoinRoom(socket as Socket, { room: 'test-room' });

      gateway.handleDisconnect(socket as Socket);

      expect(gateway.getRoomCount('test-room')).toBe(0);
    });

    it('should handle disconnect for unknown client gracefully', () => {
      const socket = createMockSocket({ id: 'unknown-socket' }) as any;

      // Should not throw
      expect(() => gateway.handleDisconnect(socket as Socket)).not.toThrow();
    });

    it('should handle disconnect for anonymous client', () => {
      const socket = createMockSocket() as any;
      // No user attached

      expect(() => gateway.handleDisconnect(socket as Socket)).not.toThrow();
    });
  });

  // ==========================================================================
  // handleAuthenticate Tests
  // ==========================================================================

  describe('handleAuthenticate', () => {
    it('should authenticate client with valid token', async () => {
      mockJwtService.verifyAsync.mockResolvedValue({
        sub: mockUser.id,
        email: mockUser.email,
        role: mockUser.role,
      });

      const socket = createMockSocket() as any;

      const result = await gateway.handleAuthenticate(socket as Socket, {
        token: 'valid-token',
      });

      expect(result).toEqual({ success: true, message: 'Authenticated successfully' });
      expect(socket.join).toHaveBeenCalledWith(`user:${mockUser.id}`);
    });

    it('should return failure for invalid token', async () => {
      mockJwtService.verifyAsync.mockRejectedValue(new Error('Invalid token'));

      const socket = createMockSocket() as any;

      const result = await gateway.handleAuthenticate(socket as Socket, {
        token: 'invalid-token',
      });

      expect(result).toEqual({ success: false, message: 'Authentication failed' });
    });

    it('should update connected clients map on authentication', async () => {
      mockJwtService.verifyAsync.mockResolvedValue({
        sub: mockUser.id,
        email: mockUser.email,
        role: mockUser.role,
      });

      const socket = createMockSocket() as any;

      await gateway.handleAuthenticate(socket as Socket, {
        token: 'valid-token',
      });

      expect(gateway.getConnectedCount()).toBe(1);
    });

    it('should extract user ID from sub or id field', async () => {
      mockJwtService.verifyAsync.mockResolvedValue({
        id: 'user-from-id-field',
        email: mockUser.email,
        role: mockUser.role,
      });

      const socket = createMockSocket() as any;

      const result = await gateway.handleAuthenticate(socket as Socket, {
        token: 'valid-token',
      });

      expect(result.success).toBe(true);
    });
  });

  // ==========================================================================
  // handleJoinRoom Tests
  // ==========================================================================

  describe('handleJoinRoom', () => {
    it('should join room without festival scope', async () => {
      const socket = createMockSocket() as any;
      socket.user = mockUser;

      const result = await gateway.handleJoinRoom(socket as Socket, {
        room: 'general',
      });

      expect(result).toEqual({ success: true, room: 'general' });
      expect(socket.join).toHaveBeenCalledWith('general');
    });

    it('should join room with festival scope', async () => {
      const socket = createMockSocket() as any;
      socket.user = mockUser;

      const result = await gateway.handleJoinRoom(socket as Socket, {
        room: 'announcements',
        festivalId: 'fest-123',
      });

      expect(result).toEqual({ success: true, room: 'festival:fest-123:announcements' });
      expect(socket.join).toHaveBeenCalledWith('festival:fest-123:announcements');
    });

    it('should notify other room members of new user', async () => {
      const socket = createMockSocket() as any;
      socket.user = mockUser;
      socket.to = jest.fn().mockReturnValue({ emit: jest.fn() });

      await gateway.handleJoinRoom(socket as Socket, { room: 'test-room' });

      expect(socket.to).toHaveBeenCalledWith('test-room');
    });

    it('should track room user count', async () => {
      const socket1 = createMockSocket({ id: 'socket-1' }) as any;
      socket1.user = mockUser;

      const socket2 = createMockSocket({ id: 'socket-2' }) as any;
      socket2.user = mockAdminUser;

      await gateway.handleConnection(socket1 as Socket);
      await gateway.handleConnection(socket2 as Socket);

      await gateway.handleJoinRoom(socket1 as Socket, { room: 'shared-room' });
      await gateway.handleJoinRoom(socket2 as Socket, { room: 'shared-room' });

      expect(gateway.getRoomCount('shared-room')).toBe(2);
    });
  });

  // ==========================================================================
  // handleLeaveRoom Tests
  // ==========================================================================

  describe('handleLeaveRoom', () => {
    it('should leave room without festival scope', async () => {
      const socket = createMockSocket() as any;
      socket.user = mockUser;
      socket.to = jest.fn().mockReturnValue({ emit: jest.fn() });

      await gateway.handleJoinRoom(socket as Socket, { room: 'test-room' });
      const result = await gateway.handleLeaveRoom(socket as Socket, { room: 'test-room' });

      expect(result).toEqual({ success: true, room: 'test-room' });
      expect(socket.leave).toHaveBeenCalledWith('test-room');
    });

    it('should leave room with festival scope', async () => {
      const socket = createMockSocket() as any;
      socket.user = mockUser;
      socket.to = jest.fn().mockReturnValue({ emit: jest.fn() });

      const result = await gateway.handleLeaveRoom(socket as Socket, {
        room: 'announcements',
        festivalId: 'fest-123',
      });

      expect(result).toEqual({ success: true, room: 'festival:fest-123:announcements' });
      expect(socket.leave).toHaveBeenCalledWith('festival:fest-123:announcements');
    });

    it('should notify other room members of user leaving', async () => {
      const socket = createMockSocket() as any;
      socket.user = mockUser;
      const emitMock = jest.fn();
      socket.to = jest.fn().mockReturnValue({ emit: emitMock });

      await gateway.handleLeaveRoom(socket as Socket, { room: 'test-room' });

      expect(socket.to).toHaveBeenCalledWith('test-room');
      expect(emitMock).toHaveBeenCalledWith(
        'user_left',
        expect.objectContaining({
          clientId: socket.id,
          room: 'test-room',
        })
      );
    });

    it('should decrement room user count', async () => {
      const socket = createMockSocket() as any;
      socket.user = mockUser;
      socket.to = jest.fn().mockReturnValue({ emit: jest.fn() });

      await gateway.handleConnection(socket as Socket);
      await gateway.handleJoinRoom(socket as Socket, { room: 'test-room' });
      expect(gateway.getRoomCount('test-room')).toBe(1);

      await gateway.handleLeaveRoom(socket as Socket, { room: 'test-room' });
      expect(gateway.getRoomCount('test-room')).toBe(0);
    });
  });

  // ==========================================================================
  // handleGetRooms Tests
  // ==========================================================================

  describe('handleGetRooms', () => {
    it('should return list of rooms client is in', () => {
      const socket = createMockSocket({
        rooms: new Set(['socket-id-123', 'room1', 'room2', 'room3']),
      }) as any;

      const result = gateway.handleGetRooms(socket as Socket);

      expect(result.rooms).toEqual(['room1', 'room2', 'room3']);
      expect(result.rooms).not.toContain('socket-id-123');
    });

    it('should return empty array when client is not in any rooms', () => {
      const socket = createMockSocket({
        rooms: new Set(['socket-id-123']),
      }) as any;

      const result = gateway.handleGetRooms(socket as Socket);

      expect(result.rooms).toEqual([]);
    });
  });

  // ==========================================================================
  // handlePing Tests
  // ==========================================================================

  describe('handlePing', () => {
    it('should respond with pong and timestamp', () => {
      const result = gateway.handlePing();

      expect(result.pong).toBe(true);
      expect(result.timestamp).toBeInstanceOf(Date);
    });
  });

  // ==========================================================================
  // Server-side Emit Methods Tests
  // ==========================================================================

  describe('sendToUser', () => {
    it('should emit event to specific user room', () => {
      const userId = 'user-123';
      const event = 'test-event';
      const data = { message: 'Hello' };

      gateway.sendToUser(userId, event, data);

      expect(mockServer.to).toHaveBeenCalledWith(`user:${userId}`);
      expect(mockServer.emit).toHaveBeenCalledWith(event, data);
    });
  });

  describe('sendToFestival', () => {
    it('should emit event to festival room', () => {
      const festivalId = 'fest-123';
      const event = 'announcement';
      const data = { title: 'Important' };

      gateway.sendToFestival(festivalId, event, data);

      expect(mockServer.to).toHaveBeenCalledWith(`festival:${festivalId}`);
      expect(mockServer.emit).toHaveBeenCalledWith(event, data);
    });
  });

  describe('sendToZone', () => {
    it('should emit event to zone room', () => {
      const festivalId = 'fest-123';
      const zoneId = 'zone-456';
      const event = 'capacity-update';
      const data = { current: 100, max: 500 };

      gateway.sendToZone(festivalId, zoneId, event, data);

      expect(mockServer.to).toHaveBeenCalledWith(`festival:${festivalId}:zone:${zoneId}`);
      expect(mockServer.emit).toHaveBeenCalledWith(event, data);
    });
  });

  describe('broadcast', () => {
    it('should emit event to all connected clients', () => {
      const event = 'global-announcement';
      const data = { message: 'System maintenance' };

      gateway.broadcast(event, data);

      expect(mockServer.emit).toHaveBeenCalledWith(event, data);
    });
  });

  describe('notifyUser', () => {
    it('should send notification object to user', () => {
      const userId = 'user-123';
      const notification: WsNotification = {
        id: 'notif-1',
        type: 'info',
        title: 'Test',
        message: 'Test notification',
        timestamp: new Date(),
      };

      gateway.notifyUser(userId, notification);

      expect(mockServer.to).toHaveBeenCalledWith(`user:${userId}`);
      expect(mockServer.emit).toHaveBeenCalledWith('notification', notification);
    });

    it('should support all notification types', () => {
      const userId = 'user-123';
      const types: Array<'info' | 'success' | 'warning' | 'error' | 'alert'> = [
        'info',
        'success',
        'warning',
        'error',
        'alert',
      ];

      types.forEach((type) => {
        const notification: WsNotification = {
          id: `notif-${type}`,
          type,
          title: 'Test',
          message: 'Test',
          timestamp: new Date(),
        };

        gateway.notifyUser(userId, notification);
      });

      expect(mockServer.emit).toHaveBeenCalledTimes(types.length);
    });

    it('should support notification with additional data', () => {
      const userId = 'user-123';
      const notification: WsNotification = {
        id: 'notif-with-data',
        type: 'info',
        title: 'Order Update',
        message: 'Your order is ready',
        data: {
          orderId: 'order-123',
          vendorName: 'Food Truck',
        },
        timestamp: new Date(),
      };

      gateway.notifyUser(userId, notification);

      expect(mockServer.emit).toHaveBeenCalledWith('notification', notification);
    });
  });

  // ==========================================================================
  // Utility Methods Tests
  // ==========================================================================

  describe('getConnectedCount', () => {
    it('should return correct count of connected clients', async () => {
      expect(gateway.getConnectedCount()).toBe(0);

      const socket1 = createMockSocket({ id: 'socket-1' }) as any;
      socket1.user = mockUser;
      await gateway.handleConnection(socket1 as Socket);

      expect(gateway.getConnectedCount()).toBe(1);

      const socket2 = createMockSocket({ id: 'socket-2' }) as any;
      socket2.user = mockAdminUser;
      await gateway.handleConnection(socket2 as Socket);

      expect(gateway.getConnectedCount()).toBe(2);
    });
  });

  describe('getRoomCount', () => {
    it('should return 0 for non-existent room', () => {
      expect(gateway.getRoomCount('non-existent-room')).toBe(0);
    });

    it('should return correct count for rooms with users', async () => {
      const socket = createMockSocket() as any;
      socket.user = mockUser;

      await gateway.handleConnection(socket as Socket);
      await gateway.handleJoinRoom(socket as Socket, { room: 'counted-room' });

      expect(gateway.getRoomCount('counted-room')).toBe(1);
    });
  });

  describe('getOnlineUsers', () => {
    it('should return all online users', async () => {
      const socket1 = createMockSocket({ id: 'socket-1' }) as any;
      socket1.user = mockUser;

      const socket2 = createMockSocket({ id: 'socket-2' }) as any;
      socket2.user = mockAdminUser;

      await gateway.handleConnection(socket1 as Socket);
      await gateway.handleConnection(socket2 as Socket);

      const onlineUsers = gateway.getOnlineUsers();

      expect(onlineUsers).toHaveLength(2);
      expect(onlineUsers).toContainEqual(mockUser);
      expect(onlineUsers).toContainEqual(mockAdminUser);
    });

    it('should return empty array when no users are online', () => {
      const onlineUsers = gateway.getOnlineUsers();
      expect(onlineUsers).toEqual([]);
    });
  });

  // ==========================================================================
  // Edge Cases Tests
  // ==========================================================================

  describe('edge cases', () => {
    it('should handle rapid connection/disconnection', async () => {
      const socket = createMockSocket() as any;
      socket.user = mockUser;

      await gateway.handleConnection(socket as Socket);
      gateway.handleDisconnect(socket as Socket);
      await gateway.handleConnection(socket as Socket);
      gateway.handleDisconnect(socket as Socket);

      expect(gateway.getConnectedCount()).toBe(0);
    });

    it('should handle same user connecting from multiple sockets', async () => {
      const socket1 = createMockSocket({ id: 'socket-1' }) as any;
      socket1.user = mockUser;

      const socket2 = createMockSocket({ id: 'socket-2' }) as any;
      socket2.user = mockUser; // Same user

      await gateway.handleConnection(socket1 as Socket);
      await gateway.handleConnection(socket2 as Socket);

      // Both connections should be tracked
      expect(gateway.getConnectedCount()).toBe(2);
    });

    it('should handle special characters in room names', async () => {
      const socket = createMockSocket() as any;
      socket.user = mockUser;

      const result = await gateway.handleJoinRoom(socket as Socket, {
        room: 'room:with:colons',
      });

      expect(result.success).toBe(true);
      expect(socket.join).toHaveBeenCalledWith('room:with:colons');
    });

    it('should handle empty room name', async () => {
      const socket = createMockSocket() as any;
      socket.user = mockUser;

      const result = await gateway.handleJoinRoom(socket as Socket, {
        room: '',
      });

      expect(result.success).toBe(true);
      expect(socket.join).toHaveBeenCalledWith('');
    });

    it('should handle unicode in room names', async () => {
      const socket = createMockSocket() as any;
      socket.user = mockUser;

      const result = await gateway.handleJoinRoom(socket as Socket, {
        room: 'room-with-emoji',
      });

      expect(result.success).toBe(true);
    });
  });

  // ==========================================================================
  // Token Verification Tests
  // ==========================================================================

  describe('token verification', () => {
    it('should use JWT_ACCESS_SECRET from config', async () => {
      mockJwtService.verifyAsync.mockResolvedValue({
        sub: mockUser.id,
        email: mockUser.email,
        role: mockUser.role,
      });

      const socket = createMockSocket() as any;

      await gateway.handleAuthenticate(socket as Socket, { token: 'test-token' });

      // Verify config service was called for secret and JWT was verified
      expect(mockConfigService.getOrThrow).toHaveBeenCalledWith('JWT_ACCESS_SECRET');
      expect(mockJwtService.verifyAsync).toHaveBeenCalled();
      const callArgs = mockJwtService.verifyAsync.mock.calls[0];
      expect(callArgs[0]).toBe('test-token');
    });

    it('should prefer sub over id for user ID', async () => {
      mockJwtService.verifyAsync.mockResolvedValue({
        sub: 'sub-user-id',
        id: 'id-user-id',
        email: mockUser.email,
        role: mockUser.role,
      });

      const socket = createMockSocket() as any;

      await gateway.handleAuthenticate(socket as Socket, { token: 'test-token' });

      // The gateway should use sub if available
      expect(socket.join).toHaveBeenCalledWith('user:sub-user-id');
    });

    it('should fall back to id when sub is not present', async () => {
      mockJwtService.verifyAsync.mockResolvedValue({
        id: 'id-user-id',
        email: mockUser.email,
        role: mockUser.role,
      });

      const socket = createMockSocket() as any;

      await gateway.handleAuthenticate(socket as Socket, { token: 'test-token' });

      expect(socket.join).toHaveBeenCalledWith('user:id-user-id');
    });
  });
});
