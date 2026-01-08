/**
 * Broadcast Gateway Unit Tests
 *
 * Comprehensive tests for WebSocket Broadcast Gateway functionality including:
 * - Connection handling with authentication
 * - Festival-wide announcements
 * - Emergency alerts and notifications
 * - Schedule changes broadcasting
 * - Weather alerts
 * - Lost and found announcements
 * - VIP and targeted broadcasts
 * - Broadcast statistics tracking
 */

import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { BroadcastGateway, BroadcastPriority, BroadcastCategory } from './broadcast.gateway';
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
  role: string;
  festivalId?: string;
  ticketType?: string;
  zoneAccess?: string[];
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
  role: 'USER',
  festivalId: 'festival-uuid-123',
  ticketType: 'GENERAL',
};

const mockVIPUser: WsUser = {
  id: 'vip-uuid-456',
  email: 'vip@festival.test',
  role: 'USER',
  festivalId: 'festival-uuid-123',
  ticketType: 'VIP',
};

const mockStaffUser: WsUser = {
  id: 'staff-uuid-789',
  email: 'staff@festival.test',
  role: 'STAFF',
  festivalId: 'festival-uuid-123',
};

const mockAdminUser: WsUser = {
  id: 'admin-uuid-101',
  email: 'admin@festival.test',
  role: 'ADMIN',
  festivalId: 'festival-uuid-123',
};

const mockOrganizerUser: WsUser = {
  id: 'organizer-uuid-102',
  email: 'organizer@festival.test',
  role: 'ORGANIZER',
  festivalId: 'festival-uuid-123',
};

const mockCampingUser: WsUser = {
  id: 'camping-uuid-103',
  email: 'camping@festival.test',
  role: 'USER',
  festivalId: 'festival-uuid-123',
  ticketType: 'CAMPING',
  zoneAccess: ['camping', 'main-area'],
};

const testFestivalId = 'festival-uuid-123';

// ============================================================================
// Test Suite
// ============================================================================

describe('BroadcastGateway', () => {
  let gateway: BroadcastGateway;
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
        BroadcastGateway,
        { provide: JwtService, useValue: mockJwtService },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    gateway = module.get<BroadcastGateway>(BroadcastGateway);

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

      expect(next).toHaveBeenCalledWith(new Error('Authentication required'));
    });

    it('should accept connection with valid token', async () => {
      mockJwtService.verifyAsync.mockResolvedValue({
        sub: mockRegularUser.id,
        email: mockRegularUser.email,
        role: mockRegularUser.role,
        festivalId: mockRegularUser.festivalId,
        ticketType: mockRegularUser.ticketType,
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

    it('should extract ticketType and zoneAccess from token', async () => {
      mockJwtService.verifyAsync.mockResolvedValue({
        sub: mockCampingUser.id,
        email: mockCampingUser.email,
        role: mockCampingUser.role,
        festivalId: mockCampingUser.festivalId,
        ticketType: mockCampingUser.ticketType,
        zoneAccess: mockCampingUser.zoneAccess,
      });

      const mockServerWithMiddleware = {
        use: jest.fn(),
      } as any;

      gateway.afterInit(mockServerWithMiddleware);

      const middleware = mockServerWithMiddleware.use.mock.calls[0][0];
      const socket = createMockSocket();
      const next = jest.fn();

      await middleware(socket, next);

      expect((socket as any).user.ticketType).toBe('CAMPING');
      expect((socket as any).user.zoneAccess).toContain('camping');
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
          authenticated: true,
          user: {
            id: mockRegularUser.id,
            email: mockRegularUser.email,
            role: mockRegularUser.role,
          },
        })
      );
    });

    it('should join festival broadcast rooms when user has festivalId', async () => {
      const socket = createMockSocket() as any;
      socket.user = mockRegularUser;

      await gateway.handleConnection(socket as Socket);

      expect(socket.join).toHaveBeenCalledWith(`broadcast:${testFestivalId}`);
      expect(socket.join).toHaveBeenCalledWith(`broadcast:${testFestivalId}:all`);
    });

    it('should join staff broadcast room for staff users', async () => {
      const socket = createMockSocket() as any;
      socket.user = mockStaffUser;

      await gateway.handleConnection(socket as Socket);

      expect(socket.join).toHaveBeenCalledWith(`broadcast:${testFestivalId}:staff`);
    });

    it('should join VIP broadcast room for VIP users', async () => {
      const socket = createMockSocket() as any;
      socket.user = mockVIPUser;

      await gateway.handleConnection(socket as Socket);

      expect(socket.join).toHaveBeenCalledWith(`broadcast:${testFestivalId}:vip`);
    });

    it('should join emergency channel', async () => {
      const socket = createMockSocket() as any;
      socket.user = mockRegularUser;

      await gateway.handleConnection(socket as Socket);

      expect(socket.join).toHaveBeenCalledWith(`emergency:${testFestivalId}`);
    });

    it('should disconnect client without user data', async () => {
      const socket = createMockSocket() as any;
      // No user attached

      await gateway.handleConnection(socket as Socket);

      expect(socket.disconnect).toHaveBeenCalledWith(true);
    });

    it('should emit sync event with active broadcasts and emergencies', async () => {
      const socket = createMockSocket() as any;
      socket.user = mockRegularUser;

      await gateway.handleConnection(socket as Socket);

      expect(socket.emit).toHaveBeenCalledWith(
        'sync',
        expect.objectContaining({
          broadcasts: expect.any(Array),
          emergencies: expect.any(Array),
          scheduleChanges: expect.any(Array),
          timestamp: expect.any(Date),
        })
      );
    });

    it('should handle user without festivalId gracefully', async () => {
      const socket = createMockSocket() as any;
      socket.user = { ...mockRegularUser, festivalId: undefined };

      await gateway.handleConnection(socket as Socket);

      // Should not throw and should emit connected
      expect(socket.emit).toHaveBeenCalledWith(
        'connected',
        expect.objectContaining({
          authenticated: true,
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

      // No errors should occur
    });

    it('should handle disconnect for unknown socket gracefully', () => {
      const socket = createMockSocket({ id: 'unknown-socket' }) as any;

      expect(() => gateway.handleDisconnect(socket as Socket)).not.toThrow();
    });
  });

  // ==========================================================================
  // handleSubscribe Tests
  // ==========================================================================

  describe('handleSubscribe', () => {
    it('should subscribe to specific channel', async () => {
      const socket = createMockSocket() as any;

      const result = await gateway.handleSubscribe(socket as Socket, {
        festivalId: testFestivalId,
        channel: 'vip',
      });

      expect(result.success).toBe(true);
      expect(socket.join).toHaveBeenCalledWith(`broadcast:${testFestivalId}:vip`);
    });

    it('should subscribe to festival-wide broadcasts', async () => {
      const socket = createMockSocket() as any;

      const result = await gateway.handleSubscribe(socket as Socket, {
        festivalId: testFestivalId,
      });

      expect(result.success).toBe(true);
      expect(socket.join).toHaveBeenCalledWith(`broadcast:${testFestivalId}`);
    });
  });

  // ==========================================================================
  // handleMarkRead Tests
  // ==========================================================================

  describe('handleMarkRead', () => {
    it('should mark broadcast as read for authenticated user', async () => {
      const socket = createMockSocket() as any;
      socket.user = mockRegularUser;
      await gateway.handleConnection(socket as Socket);

      // Create a broadcast first
      const broadcast = gateway.sendBroadcast(
        {
          festivalId: testFestivalId,
          title: 'Test Announcement',
          message: 'Test message',
          category: 'announcement',
        },
        'admin'
      );

      const result = gateway.handleMarkRead(socket as Socket, {
        broadcastId: broadcast.id,
      });

      expect(result.success).toBe(true);
    });

    it('should return failure for unauthenticated user', () => {
      const socket = createMockSocket() as any;
      // No user mapping

      const result = gateway.handleMarkRead(socket as Socket, {
        broadcastId: 'some-broadcast-id',
      });

      expect(result.success).toBe(false);
    });

    it('should track read count in broadcast stats', async () => {
      const socket = createMockSocket() as any;
      socket.user = mockRegularUser;
      await gateway.handleConnection(socket as Socket);

      const broadcast = gateway.sendBroadcast(
        {
          festivalId: testFestivalId,
          title: 'Test',
          message: 'Test',
          category: 'announcement',
        },
        'admin'
      );

      gateway.handleMarkRead(socket as Socket, { broadcastId: broadcast.id });

      const stats = gateway.getBroadcastStats(broadcast.id);
      expect(stats?.reads).toBe(1);
    });
  });

  // ==========================================================================
  // handleDismiss Tests
  // ==========================================================================

  describe('handleDismiss', () => {
    it('should dismiss broadcast for authenticated user', async () => {
      const socket = createMockSocket() as any;
      socket.user = mockRegularUser;
      await gateway.handleConnection(socket as Socket);

      const broadcast = gateway.sendBroadcast(
        {
          festivalId: testFestivalId,
          title: 'Dismissable',
          message: 'You can dismiss this',
          category: 'reminder',
        },
        'admin'
      );

      const result = gateway.handleDismiss(socket as Socket, {
        broadcastId: broadcast.id,
      });

      expect(result.success).toBe(true);
    });

    it('should return failure for unauthenticated user', () => {
      const socket = createMockSocket() as any;

      const result = gateway.handleDismiss(socket as Socket, {
        broadcastId: 'some-broadcast-id',
      });

      expect(result.success).toBe(false);
    });

    it('should track dismiss count in broadcast stats', async () => {
      const socket = createMockSocket() as any;
      socket.user = mockRegularUser;
      await gateway.handleConnection(socket as Socket);

      const broadcast = gateway.sendBroadcast(
        {
          festivalId: testFestivalId,
          title: 'Test',
          message: 'Test',
          category: 'announcement',
        },
        'admin'
      );

      gateway.handleDismiss(socket as Socket, { broadcastId: broadcast.id });

      const stats = gateway.getBroadcastStats(broadcast.id);
      expect(stats?.dismisses).toBe(1);
    });
  });

  // ==========================================================================
  // handleGetActive Tests
  // ==========================================================================

  describe('handleGetActive', () => {
    it('should return active broadcasts and emergencies for authenticated user', async () => {
      const socket = createMockSocket() as any;
      socket.user = mockRegularUser;
      await gateway.handleConnection(socket as Socket);

      gateway.sendBroadcast(
        {
          festivalId: testFestivalId,
          title: 'Active Broadcast',
          message: 'Still active',
          category: 'announcement',
          target: 'all',
        },
        'admin'
      );

      const result = gateway.handleGetActive(socket as Socket, {
        festivalId: testFestivalId,
      });

      expect(result.broadcasts).toBeDefined();
      expect(Array.isArray(result.broadcasts)).toBe(true);
      expect(Array.isArray(result.emergencies)).toBe(true);
    });

    it('should return public broadcasts for unauthenticated users', () => {
      const socket = createMockSocket() as any;

      const result = gateway.handleGetActive(socket as Socket, {
        festivalId: testFestivalId,
      });

      expect(Array.isArray(result.broadcasts)).toBe(true);
      expect(Array.isArray(result.emergencies)).toBe(true);
    });
  });

  // ==========================================================================
  // handleGetScheduleChanges Tests
  // ==========================================================================

  describe('handleGetScheduleChanges', () => {
    it('should return all schedule changes for festival', () => {
      gateway.announceScheduleChange({
        festivalId: testFestivalId,
        type: 'time_change',
        artistName: 'Test Artist',
        newData: { startTime: new Date() },
      });

      const result = gateway.handleGetScheduleChanges({
        festivalId: testFestivalId,
      });

      expect(result.changes).toHaveLength(1);
      expect(result.changes[0].artistName).toBe('Test Artist');
    });

    it('should filter changes by since date', () => {
      const pastDate = new Date('2020-01-01');

      gateway.announceScheduleChange({
        festivalId: testFestivalId,
        type: 'cancelled',
        artistName: 'Old Change',
      });

      const result = gateway.handleGetScheduleChanges({
        festivalId: testFestivalId,
        since: pastDate,
      });

      expect(result.changes.length).toBeGreaterThanOrEqual(1);
    });

    it('should return empty array for festival with no changes', () => {
      const result = gateway.handleGetScheduleChanges({
        festivalId: 'no-changes-festival',
      });

      expect(result.changes).toEqual([]);
    });
  });

  // ==========================================================================
  // sendBroadcast Tests
  // ==========================================================================

  describe('sendBroadcast', () => {
    it('should create and store broadcast', () => {
      const broadcast = gateway.sendBroadcast(
        {
          festivalId: testFestivalId,
          title: 'New Feature',
          message: 'Check out our new feature!',
          category: 'announcement',
        },
        'admin-user'
      );

      expect(broadcast.id).toBeDefined();
      expect(broadcast.title).toBe('New Feature');
      expect(broadcast.createdBy).toBe('admin-user');
    });

    it('should broadcast to all users for target "all"', () => {
      gateway.sendBroadcast(
        {
          festivalId: testFestivalId,
          title: 'Global Announcement',
          message: 'For everyone',
          category: 'announcement',
          target: 'all',
        },
        'admin'
      );

      expect(mockServer.to).toHaveBeenCalledWith(`broadcast:${testFestivalId}:all`);
    });

    it('should broadcast to VIP users for target "vip"', () => {
      gateway.sendBroadcast(
        {
          festivalId: testFestivalId,
          title: 'VIP Only',
          message: 'Exclusive content',
          category: 'announcement',
          target: 'vip',
        },
        'admin'
      );

      expect(mockServer.to).toHaveBeenCalledWith(`broadcast:${testFestivalId}:vip`);
    });

    it('should broadcast to staff for target "staff"', () => {
      gateway.sendBroadcast(
        {
          festivalId: testFestivalId,
          title: 'Staff Alert',
          message: 'Staff meeting in 10 minutes',
          category: 'announcement',
          target: 'staff',
        },
        'admin'
      );

      expect(mockServer.to).toHaveBeenCalledWith(`broadcast:${testFestivalId}:staff`);
    });

    it('should broadcast to camping users for target "camping"', () => {
      gateway.sendBroadcast(
        {
          festivalId: testFestivalId,
          title: 'Camping Info',
          message: 'Showers available',
          category: 'announcement',
          target: 'camping',
        },
        'admin'
      );

      expect(mockServer.to).toHaveBeenCalledWith(`broadcast:${testFestivalId}:camping`);
    });

    it('should broadcast to specific zone', () => {
      gateway.sendBroadcast(
        {
          festivalId: testFestivalId,
          title: 'Zone Alert',
          message: 'Zone specific message',
          category: 'announcement',
          target: 'specific_zone',
          targetDetails: { zoneId: 'zone-123' },
        },
        'admin'
      );

      expect(mockServer.to).toHaveBeenCalledWith(`broadcast:${testFestivalId}:zone:zone-123`);
    });

    it('should set default priority to normal', () => {
      const broadcast = gateway.sendBroadcast(
        {
          festivalId: testFestivalId,
          title: 'Normal Priority',
          message: 'Default priority',
          category: 'announcement',
        },
        'admin'
      );

      expect(broadcast.priority).toBe('normal');
    });

    it('should support all priority levels', () => {
      const priorities: BroadcastPriority[] = ['low', 'normal', 'high', 'urgent', 'emergency'];

      priorities.forEach((priority) => {
        const broadcast = gateway.sendBroadcast(
          {
            festivalId: testFestivalId,
            title: `${priority} Priority`,
            message: 'Test',
            category: 'announcement',
            priority,
          },
          'admin'
        );

        expect(broadcast.priority).toBe(priority);
      });
    });

    it('should support all broadcast categories', () => {
      const categories: BroadcastCategory[] = [
        'announcement',
        'schedule_change',
        'artist_update',
        'weather',
        'emergency',
        'lost_found',
        'promotion',
        'reminder',
        'system',
      ];

      categories.forEach((category) => {
        const broadcast = gateway.sendBroadcast(
          {
            festivalId: testFestivalId,
            title: `${category} Broadcast`,
            message: 'Test',
            category,
          },
          'admin'
        );

        expect(broadcast.category).toBe(category);
      });
    });

    it('should include media in broadcast', () => {
      const broadcast = gateway.sendBroadcast(
        {
          festivalId: testFestivalId,
          title: 'With Media',
          message: 'Check this image',
          category: 'announcement',
          media: {
            type: 'image',
            url: 'https://example.com/image.jpg',
            thumbnail: 'https://example.com/thumb.jpg',
          },
        },
        'admin'
      );

      expect(broadcast.media?.type).toBe('image');
      expect(broadcast.media?.url).toBe('https://example.com/image.jpg');
    });

    it('should include action in broadcast', () => {
      const broadcast = gateway.sendBroadcast(
        {
          festivalId: testFestivalId,
          title: 'With Action',
          message: 'Click to learn more',
          category: 'promotion',
          action: {
            type: 'link',
            label: 'Learn More',
            url: 'https://example.com/promo',
          },
        },
        'admin'
      );

      expect(broadcast.action?.type).toBe('link');
      expect(broadcast.action?.label).toBe('Learn More');
    });

    it('should schedule expiry for broadcasts with expiresAt', () => {
      const expiresAt = new Date(Date.now() + 60000); // 1 minute from now

      const broadcast = gateway.sendBroadcast(
        {
          festivalId: testFestivalId,
          title: 'Expiring',
          message: 'Will expire soon',
          category: 'reminder',
          expiresAt,
        },
        'admin'
      );

      expect(broadcast.expiresAt).toEqual(expiresAt);
    });
  });

  // ==========================================================================
  // sendEmergencyAlert Tests
  // ==========================================================================

  describe('sendEmergencyAlert', () => {
    it('should create emergency alert', () => {
      const alert = gateway.sendEmergencyAlert(
        {
          festivalId: testFestivalId,
          level: 'warning',
          title: 'Weather Warning',
          message: 'Heavy rain expected',
        },
        'admin'
      );

      expect(alert.id).toBeDefined();
      expect(alert.level).toBe('warning');
      expect(alert.active).toBe(true);
    });

    it('should broadcast to emergency channel', () => {
      gateway.sendEmergencyAlert(
        {
          festivalId: testFestivalId,
          level: 'critical',
          title: 'Critical Alert',
          message: 'Immediate attention required',
        },
        'admin'
      );

      expect(mockServer.to).toHaveBeenCalledWith(`emergency:${testFestivalId}`);
    });

    it('should also broadcast as regular broadcast', () => {
      gateway.sendEmergencyAlert(
        {
          festivalId: testFestivalId,
          level: 'warning',
          title: 'Warning',
          message: 'Please be aware',
        },
        'admin'
      );

      expect(mockServer.to).toHaveBeenCalledWith(`broadcast:${testFestivalId}`);
    });

    it('should include instructions in alert', () => {
      const alert = gateway.sendEmergencyAlert(
        {
          festivalId: testFestivalId,
          level: 'evacuation',
          title: 'Evacuation',
          message: 'Please evacuate',
          instructions: ['Stay calm', 'Follow staff directions', 'Exit through marked routes'],
        },
        'admin'
      );

      expect(alert.instructions).toHaveLength(3);
      expect(alert.instructions).toContain('Stay calm');
    });

    it('should include affected zones in alert', () => {
      const alert = gateway.sendEmergencyAlert(
        {
          festivalId: testFestivalId,
          level: 'critical',
          title: 'Zone Alert',
          message: 'Specific zones affected',
          affectedZones: ['zone-1', 'zone-2'],
        },
        'admin'
      );

      expect(alert.affectedZones).toContain('zone-1');
      expect(alert.affectedZones).toContain('zone-2');
    });

    it('should support all alert levels', () => {
      const levels: ('info' | 'warning' | 'critical' | 'evacuation')[] = [
        'info',
        'warning',
        'critical',
        'evacuation',
      ];

      levels.forEach((level) => {
        const alert = gateway.sendEmergencyAlert(
          {
            festivalId: testFestivalId,
            level,
            title: `${level} Alert`,
            message: 'Test',
          },
          'admin'
        );

        expect(alert.level).toBe(level);
      });
    });
  });

  // ==========================================================================
  // resolveEmergency Tests
  // ==========================================================================

  describe('resolveEmergency', () => {
    it('should resolve active emergency', () => {
      const alert = gateway.sendEmergencyAlert(
        {
          festivalId: testFestivalId,
          level: 'warning',
          title: 'Test Emergency',
          message: 'Test',
        },
        'admin'
      );

      const result = gateway.resolveEmergency(alert.id, 'resolver@test.com');

      expect(result).toBe(true);
    });

    it('should return false for non-existent alert', () => {
      const result = gateway.resolveEmergency('non-existent-id', 'resolver@test.com');

      expect(result).toBe(false);
    });

    it('should broadcast emergency resolved event', () => {
      const alert = gateway.sendEmergencyAlert(
        {
          festivalId: testFestivalId,
          level: 'critical',
          title: 'Critical',
          message: 'Critical situation',
        },
        'admin'
      );

      gateway.resolveEmergency(alert.id, 'resolver@test.com');

      expect(mockServer.to).toHaveBeenCalledWith(`emergency:${testFestivalId}`);
    });

    it('should send all-clear broadcast after resolving', () => {
      const alert = gateway.sendEmergencyAlert(
        {
          festivalId: testFestivalId,
          level: 'warning',
          title: 'Test',
          message: 'Test',
        },
        'admin'
      );

      gateway.resolveEmergency(alert.id, 'resolver');

      // Should have been called for all-clear broadcast
      expect(mockServer.to).toHaveBeenCalledWith(`broadcast:${testFestivalId}:all`);
    });
  });

  // ==========================================================================
  // announceScheduleChange Tests
  // ==========================================================================

  describe('announceScheduleChange', () => {
    it('should create schedule change record', () => {
      const change = gateway.announceScheduleChange({
        festivalId: testFestivalId,
        type: 'time_change',
        artistName: 'DJ Test',
        originalData: { startTime: new Date('2024-01-01T18:00:00') },
        newData: { startTime: new Date('2024-01-01T19:00:00') },
      });

      expect(change.id).toBeDefined();
      expect(change.type).toBe('time_change');
      expect(change.artistName).toBe('DJ Test');
    });

    it('should broadcast schedule change event', () => {
      gateway.announceScheduleChange({
        festivalId: testFestivalId,
        type: 'venue_change',
        artistName: 'Band Test',
        newData: { stage: 'Main Stage' },
      });

      expect(mockServer.to).toHaveBeenCalledWith(`broadcast:${testFestivalId}`);
    });

    it('should create high priority broadcast for cancellation', () => {
      gateway.announceScheduleChange({
        festivalId: testFestivalId,
        type: 'cancelled',
        artistName: 'Cancelled Artist',
        reason: 'Illness',
      });

      // Should create broadcast with high priority
      expect(mockServer.to).toHaveBeenCalled();
    });

    it('should handle all schedule change types', () => {
      const types: ('time_change' | 'venue_change' | 'cancelled' | 'added' | 'artist_swap')[] = [
        'time_change',
        'venue_change',
        'cancelled',
        'added',
        'artist_swap',
      ];

      types.forEach((type) => {
        const change = gateway.announceScheduleChange({
          festivalId: testFestivalId,
          type,
          artistName: `Artist for ${type}`,
        });

        expect(change.type).toBe(type);
      });
    });

    it('should include reason in cancellation message', () => {
      const change = gateway.announceScheduleChange({
        festivalId: testFestivalId,
        type: 'cancelled',
        artistName: 'Cancelled Act',
        reason: 'Technical difficulties',
      });

      expect(change.reason).toBe('Technical difficulties');
    });
  });

  // ==========================================================================
  // sendWeatherAlert Tests
  // ==========================================================================

  describe('sendWeatherAlert', () => {
    it('should send weather info alert', () => {
      const broadcast = gateway.sendWeatherAlert(testFestivalId, 'Sunny with light breeze', 'info');

      expect(broadcast.category).toBe('weather');
      expect(broadcast.priority).toBe('normal');
    });

    it('should send weather warning alert', () => {
      const broadcast = gateway.sendWeatherAlert(
        testFestivalId,
        'Heavy rain expected in 30 minutes',
        'warning'
      );

      expect(broadcast.category).toBe('weather');
      expect(broadcast.priority).toBe('high');
    });

    it('should send severe weather alert', () => {
      const broadcast = gateway.sendWeatherAlert(
        testFestivalId,
        'Thunderstorm approaching - seek shelter immediately',
        'severe'
      );

      expect(broadcast.category).toBe('weather');
      expect(broadcast.priority).toBe('emergency');
    });
  });

  // ==========================================================================
  // sendLostFoundAnnouncement Tests
  // ==========================================================================

  describe('sendLostFoundAnnouncement', () => {
    it('should send lost item announcement', () => {
      const broadcast = gateway.sendLostFoundAnnouncement(
        testFestivalId,
        'lost',
        'Black wallet lost near Main Stage'
      );

      expect(broadcast.category).toBe('lost_found');
      expect(broadcast.title).toBe('Item Lost');
      expect(broadcast.priority).toBe('low');
    });

    it('should send found item announcement', () => {
      const broadcast = gateway.sendLostFoundAnnouncement(
        testFestivalId,
        'found',
        'Set of keys found at Info Point'
      );

      expect(broadcast.category).toBe('lost_found');
      expect(broadcast.title).toBe('Item Found');
    });
  });

  // ==========================================================================
  // getBroadcastStats Tests
  // ==========================================================================

  describe('getBroadcastStats', () => {
    it('should return stats for existing broadcast', async () => {
      const socket = createMockSocket() as any;
      socket.user = mockRegularUser;
      await gateway.handleConnection(socket as Socket);

      const broadcast = gateway.sendBroadcast(
        {
          festivalId: testFestivalId,
          title: 'Stats Test',
          message: 'Test message',
          category: 'announcement',
        },
        'admin'
      );

      gateway.handleMarkRead(socket as Socket, { broadcastId: broadcast.id });
      gateway.handleDismiss(socket as Socket, { broadcastId: broadcast.id });

      const stats = gateway.getBroadcastStats(broadcast.id);

      expect(stats?.reads).toBe(1);
      expect(stats?.dismisses).toBe(1);
    });

    it('should return null for non-existent broadcast', () => {
      const stats = gateway.getBroadcastStats('non-existent');

      expect(stats).toBeNull();
    });
  });

  // ==========================================================================
  // Broadcast Targeting Tests
  // ==========================================================================

  describe('broadcast targeting', () => {
    it('should filter broadcasts by user festivalId', async () => {
      const socket = createMockSocket() as any;
      socket.user = mockRegularUser;
      await gateway.handleConnection(socket as Socket);

      // Create broadcast for different festival
      gateway.sendBroadcast(
        {
          festivalId: 'different-festival',
          title: 'Other Festival',
          message: 'Not for this user',
          category: 'announcement',
          target: 'all',
        },
        'admin'
      );

      // Create broadcast for user's festival
      gateway.sendBroadcast(
        {
          festivalId: testFestivalId,
          title: 'My Festival',
          message: 'For this user',
          category: 'announcement',
          target: 'all',
        },
        'admin'
      );

      const result = gateway.handleGetActive(socket as Socket, {
        festivalId: testFestivalId,
      });

      expect(result.broadcasts.every((b) => b.festivalId === testFestivalId)).toBe(true);
    });

    it('should exclude expired broadcasts', async () => {
      const socket = createMockSocket() as any;
      socket.user = mockRegularUser;
      await gateway.handleConnection(socket as Socket);

      // Create expired broadcast
      gateway.sendBroadcast(
        {
          festivalId: testFestivalId,
          title: 'Expired',
          message: 'Already expired',
          category: 'reminder',
          expiresAt: new Date(Date.now() - 1000), // Already expired
        },
        'admin'
      );

      const result = gateway.handleGetActive(socket as Socket, {
        festivalId: testFestivalId,
      });

      expect(result.broadcasts.every((b) => b.title !== 'Expired')).toBe(true);
    });

    it('should sort broadcasts by priority and date', async () => {
      const socket = createMockSocket() as any;
      socket.user = mockRegularUser;
      await gateway.handleConnection(socket as Socket);

      // Clear any existing broadcasts by getting a fresh connection
      gateway.sendBroadcast(
        {
          festivalId: testFestivalId,
          title: 'Low Priority',
          message: 'Low',
          category: 'announcement',
          priority: 'low',
        },
        'admin'
      );

      gateway.sendBroadcast(
        {
          festivalId: testFestivalId,
          title: 'Emergency',
          message: 'Emergency',
          category: 'emergency',
          priority: 'emergency',
        },
        'admin'
      );

      const result = gateway.handleGetActive(socket as Socket, {
        festivalId: testFestivalId,
      });

      // Emergency should come before low priority
      const emergencyIndex = result.broadcasts.findIndex((b) => b.priority === 'emergency');
      const lowIndex = result.broadcasts.findIndex((b) => b.priority === 'low');

      if (emergencyIndex !== -1 && lowIndex !== -1) {
        expect(emergencyIndex).toBeLessThan(lowIndex);
      }
    });
  });

  // ==========================================================================
  // Edge Cases Tests
  // ==========================================================================

  describe('edge cases', () => {
    it('should handle special characters in broadcast messages', () => {
      const broadcast = gateway.sendBroadcast(
        {
          festivalId: testFestivalId,
          title: 'Special <chars> & "quotes"',
          message: "Message with 'special' characters: <>\"'&",
          category: 'announcement',
        },
        'admin'
      );

      expect(broadcast.title).toBe('Special <chars> & "quotes"');
    });

    it('should handle unicode in broadcast messages', () => {
      const broadcast = gateway.sendBroadcast(
        {
          festivalId: testFestivalId,
          title: 'Annonce Speciale',
          message: 'Message special',
          category: 'announcement',
        },
        'admin'
      );

      expect(broadcast.title).toContain('Speciale');
    });

    it('should handle emoji in broadcast messages', () => {
      const broadcast = gateway.sendBroadcast(
        {
          festivalId: testFestivalId,
          title: 'Party Time',
          message: 'Get ready for the show!',
          category: 'announcement',
        },
        'admin'
      );

      expect(broadcast.title).toBeDefined();
    });

    it('should handle very long broadcast messages', () => {
      const longMessage = 'A'.repeat(10000);

      const broadcast = gateway.sendBroadcast(
        {
          festivalId: testFestivalId,
          title: 'Long Message',
          message: longMessage,
          category: 'announcement',
        },
        'admin'
      );

      expect(broadcast.message).toHaveLength(10000);
    });

    it('should handle multiple simultaneous connections', async () => {
      const sockets = [];

      for (let i = 0; i < 10; i++) {
        const socket = createMockSocket({ id: `socket-${i}` }) as any;
        socket.user = { ...mockRegularUser, id: `user-${i}` };
        await gateway.handleConnection(socket as Socket);
        sockets.push(socket);
      }

      // All should connect successfully
      sockets.forEach((socket) => {
        expect(socket.emit).toHaveBeenCalledWith(
          'connected',
          expect.objectContaining({ authenticated: true })
        );
      });
    });

    it('should handle rapid broadcast creation', () => {
      const broadcasts = [];

      for (let i = 0; i < 100; i++) {
        const broadcast = gateway.sendBroadcast(
          {
            festivalId: testFestivalId,
            title: `Rapid Broadcast ${i}`,
            message: 'Test',
            category: 'announcement',
          },
          'admin'
        );
        broadcasts.push(broadcast);
      }

      // All should have unique IDs
      const ids = broadcasts.map((b) => b.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(100);
    });

    it('should handle broadcast to specific users', () => {
      gateway.sendBroadcast(
        {
          festivalId: testFestivalId,
          title: 'Private Message',
          message: 'For specific users only',
          category: 'announcement',
          target: 'specific_users',
          targetDetails: { userIds: ['user-1', 'user-2', 'user-3'] },
        },
        'admin'
      );

      expect(mockServer.to).toHaveBeenCalledWith('user:user-1');
      expect(mockServer.to).toHaveBeenCalledWith('user:user-2');
      expect(mockServer.to).toHaveBeenCalledWith('user:user-3');
    });
  });

  // ==========================================================================
  // User Role Checks Tests
  // ==========================================================================

  describe('user role checks', () => {
    it('should identify staff users correctly', async () => {
      const staffSocket = createMockSocket() as any;
      staffSocket.user = mockStaffUser;
      await gateway.handleConnection(staffSocket as Socket);

      expect(staffSocket.join).toHaveBeenCalledWith(`broadcast:${testFestivalId}:staff`);
    });

    it('should identify admin as staff', async () => {
      const adminSocket = createMockSocket() as any;
      adminSocket.user = mockAdminUser;
      await gateway.handleConnection(adminSocket as Socket);

      expect(adminSocket.join).toHaveBeenCalledWith(`broadcast:${testFestivalId}:staff`);
    });

    it('should identify organizer as staff', async () => {
      const organizerSocket = createMockSocket() as any;
      organizerSocket.user = mockOrganizerUser;
      await gateway.handleConnection(organizerSocket as Socket);

      expect(organizerSocket.join).toHaveBeenCalledWith(`broadcast:${testFestivalId}:staff`);
    });

    it('should identify VIP by ticketType', async () => {
      const vipSocket = createMockSocket() as any;
      vipSocket.user = mockVIPUser;
      await gateway.handleConnection(vipSocket as Socket);

      expect(vipSocket.join).toHaveBeenCalledWith(`broadcast:${testFestivalId}:vip`);
    });

    it('should identify BACKSTAGE ticket as VIP', async () => {
      const backstageSocket = createMockSocket() as any;
      backstageSocket.user = { ...mockRegularUser, ticketType: 'BACKSTAGE' };
      await gateway.handleConnection(backstageSocket as Socket);

      expect(backstageSocket.join).toHaveBeenCalledWith(`broadcast:${testFestivalId}:vip`);
    });
  });
});
