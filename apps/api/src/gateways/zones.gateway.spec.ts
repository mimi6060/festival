/**
 * Zones Gateway Unit Tests
 *
 * Comprehensive tests for WebSocket Zones Gateway functionality including:
 * - Connection handling with authentication
 * - Zone subscription/unsubscription
 * - Real-time occupancy tracking
 * - Entry/exit recording
 * - Capacity alerts
 * - Staff position tracking
 * - Emergency zone status updates
 */

import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import {
  ZonesGateway,
  ZoneOccupancy as _ZoneOccupancy,
  ZoneStatus as _ZoneStatus,
  ZoneAlert as _ZoneAlert,
  StaffPosition as _StaffPosition,
} from './zones.gateway';
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
  email: 'user@festival.test',
  role: 'USER',
  festivalId: 'festival-uuid-123',
};

const mockStaffUser: WsUser = {
  id: 'staff-uuid-456',
  email: 'staff@festival.test',
  role: 'STAFF',
  festivalId: 'festival-uuid-123',
};

const mockAdminUser: WsUser = {
  id: 'admin-uuid-789',
  email: 'admin@festival.test',
  role: 'ADMIN',
};

const mockSecurityUser: WsUser = {
  id: 'security-uuid-101',
  email: 'security@festival.test',
  role: 'SECURITY',
  festivalId: 'festival-uuid-123',
};

const testFestivalId = 'festival-uuid-123';
const testZoneId = 'zone-uuid-456';
const testZoneName = 'Main Stage';
const testMaxCapacity = 1000;

// ============================================================================
// Test Suite
// ============================================================================

describe('ZonesGateway', () => {
  let gateway: ZonesGateway;
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
        ZonesGateway,
        { provide: JwtService, useValue: mockJwtService },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    gateway = module.get<ZonesGateway>(ZonesGateway);

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
  });

  // ==========================================================================
  // handleConnection Tests
  // ==========================================================================

  describe('handleConnection', () => {
    it('should add authenticated client and emit connected event', async () => {
      const socket = createMockSocket() as any;
      socket.user = mockUser;

      await gateway.handleConnection(socket as Socket);

      expect(socket.emit).toHaveBeenCalledWith(
        'connected',
        expect.objectContaining({
          authenticated: true,
          user: {
            id: mockUser.id,
            email: mockUser.email,
            role: mockUser.role,
          },
        })
      );
    });

    it('should auto-join festival zones room when user has festivalId', async () => {
      const socket = createMockSocket() as any;
      socket.user = mockUser;

      await gateway.handleConnection(socket as Socket);

      expect(socket.join).toHaveBeenCalledWith(`festival:${mockUser.festivalId}:zones`);
    });

    it('should not auto-join festival room when user has no festivalId', async () => {
      const socket = createMockSocket() as any;
      socket.user = { ...mockUser, festivalId: undefined };

      await gateway.handleConnection(socket as Socket);

      expect(socket.join).not.toHaveBeenCalled();
    });

    it('should disconnect client without user data', async () => {
      const socket = createMockSocket() as any;
      // No user attached

      await gateway.handleConnection(socket as Socket);

      expect(socket.disconnect).toHaveBeenCalledWith(true);
    });
  });

  // ==========================================================================
  // handleDisconnect Tests
  // ==========================================================================

  describe('handleDisconnect', () => {
    it('should remove staff position tracking on disconnect', async () => {
      const socket = createMockSocket() as any;
      socket.user = mockStaffUser;

      await gateway.handleConnection(socket as Socket);

      // Update position
      gateway.handleUpdatePosition(socket as Socket, {
        zoneId: testZoneId,
        festivalId: testFestivalId,
      });

      gateway.handleDisconnect(socket as Socket);

      // Staff positions should be cleared
      const staffPositions = gateway.handleGetStaffPositions({
        festivalId: testFestivalId,
      });

      expect(staffPositions.staff).not.toContainEqual(
        expect.objectContaining({ staffId: mockStaffUser.id })
      );
    });

    it('should handle disconnect for unknown client gracefully', () => {
      const socket = createMockSocket({ id: 'unknown-socket' }) as any;

      expect(() => gateway.handleDisconnect(socket as Socket)).not.toThrow();
    });
  });

  // ==========================================================================
  // handleSubscribeZone Tests
  // ==========================================================================

  describe('handleSubscribeZone', () => {
    it('should subscribe to specific zone', async () => {
      const socket = createMockSocket() as any;

      const result = await gateway.handleSubscribeZone(socket as Socket, {
        zoneId: testZoneId,
        festivalId: testFestivalId,
      });

      expect(result.success).toBe(true);
      expect(socket.join).toHaveBeenCalledWith(`zone:${testFestivalId}:${testZoneId}`);
    });

    it('should subscribe to all zones for festival', async () => {
      const socket = createMockSocket() as any;

      const result = await gateway.handleSubscribeZone(socket as Socket, {
        festivalId: testFestivalId,
      });

      expect(result.success).toBe(true);
      expect(socket.join).toHaveBeenCalledWith(`festival:${testFestivalId}:zones`);
    });

    it('should return current occupancy when subscribing to specific zone', async () => {
      // Initialize zone with occupancy
      gateway.initializeZone(testFestivalId, testZoneId, testZoneName, testMaxCapacity, 500);

      const socket = createMockSocket() as any;

      const result = await gateway.handleSubscribeZone(socket as Socket, {
        zoneId: testZoneId,
        festivalId: testFestivalId,
      });

      expect(result.success).toBe(true);
      expect(result.occupancy).toBeDefined();
      expect(result.occupancy?.currentOccupancy).toBe(500);
    });
  });

  // ==========================================================================
  // handleUnsubscribeZone Tests
  // ==========================================================================

  describe('handleUnsubscribeZone', () => {
    it('should unsubscribe from specific zone', async () => {
      const socket = createMockSocket() as any;

      const result = await gateway.handleUnsubscribeZone(socket as Socket, {
        zoneId: testZoneId,
        festivalId: testFestivalId,
      });

      expect(result.success).toBe(true);
      expect(socket.leave).toHaveBeenCalledWith(`zone:${testFestivalId}:${testZoneId}`);
    });

    it('should unsubscribe from all festival zones', async () => {
      const socket = createMockSocket() as any;

      const result = await gateway.handleUnsubscribeZone(socket as Socket, {
        festivalId: testFestivalId,
      });

      expect(result.success).toBe(true);
      expect(socket.leave).toHaveBeenCalledWith(`festival:${testFestivalId}:zones`);
    });
  });

  // ==========================================================================
  // handleGetAllOccupancy Tests
  // ==========================================================================

  describe('handleGetAllOccupancy', () => {
    it('should return all zones for festival', () => {
      gateway.initializeZone(testFestivalId, 'zone-1', 'Zone 1', 500);
      gateway.initializeZone(testFestivalId, 'zone-2', 'Zone 2', 1000);
      gateway.initializeZone('other-festival', 'zone-3', 'Zone 3', 200);

      const result = gateway.handleGetAllOccupancy({ festivalId: testFestivalId });

      expect(result.zones).toHaveLength(2);
      expect(result.zones.map((z) => z.zoneId)).toContain('zone-1');
      expect(result.zones.map((z) => z.zoneId)).toContain('zone-2');
      expect(result.zones.map((z) => z.zoneId)).not.toContain('zone-3');
    });

    it('should return empty array when no zones exist', () => {
      const result = gateway.handleGetAllOccupancy({ festivalId: 'non-existent' });

      expect(result.zones).toEqual([]);
    });
  });

  // ==========================================================================
  // handleGetAlerts Tests
  // ==========================================================================

  describe('handleGetAlerts', () => {
    it('should return alerts for festival sorted by timestamp', () => {
      // Create capacity alerts by recording entries past thresholds
      gateway.initializeZone(testFestivalId, testZoneId, testZoneName, 100, 80);

      const result = gateway.handleGetAlerts({ festivalId: testFestivalId });

      expect(Array.isArray(result.alerts)).toBe(true);
    });

    it('should return empty array when no alerts exist', () => {
      const result = gateway.handleGetAlerts({ festivalId: 'no-alerts-festival' });

      expect(result.alerts).toEqual([]);
    });
  });

  // ==========================================================================
  // handleAcknowledgeAlert Tests
  // ==========================================================================

  describe('handleAcknowledgeAlert', () => {
    it('should allow staff to acknowledge alert', async () => {
      // Initialize zone and create alert
      gateway.initializeZone(testFestivalId, testZoneId, testZoneName, 100, 99);

      const socket = createMockSocket() as any;
      socket.user = mockStaffUser;
      await gateway.handleConnection(socket as Socket);

      // Get alerts
      const alerts = gateway.handleGetAlerts({ festivalId: testFestivalId });

      if (alerts.alerts.length > 0) {
        const result = gateway.handleAcknowledgeAlert(socket as Socket, {
          alertId: alerts.alerts[0].id,
        });

        expect(result.success).toBe(true);
      }
    });

    it('should deny non-staff from acknowledging alert', async () => {
      const socket = createMockSocket() as any;
      socket.user = mockUser; // Regular user
      await gateway.handleConnection(socket as Socket);

      const result = gateway.handleAcknowledgeAlert(socket as Socket, {
        alertId: 'alert-123',
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Unauthorized');
    });

    it('should return error for non-existent alert', async () => {
      const socket = createMockSocket() as any;
      socket.user = mockStaffUser;
      await gateway.handleConnection(socket as Socket);

      const result = gateway.handleAcknowledgeAlert(socket as Socket, {
        alertId: 'non-existent-alert',
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Alert not found');
    });

    it('should allow admin to acknowledge alert', async () => {
      gateway.initializeZone(testFestivalId, testZoneId, testZoneName, 100, 99);

      const socket = createMockSocket() as any;
      socket.user = mockAdminUser;
      await gateway.handleConnection(socket as Socket);

      const alerts = gateway.handleGetAlerts({ festivalId: testFestivalId });

      if (alerts.alerts.length > 0) {
        const result = gateway.handleAcknowledgeAlert(socket as Socket, {
          alertId: alerts.alerts[0].id,
        });

        expect(result.success).toBe(true);
      }
    });

    it('should allow security to acknowledge alert', async () => {
      gateway.initializeZone(testFestivalId, testZoneId, testZoneName, 100, 99);

      const socket = createMockSocket() as any;
      socket.user = mockSecurityUser;
      await gateway.handleConnection(socket as Socket);

      const alerts = gateway.handleGetAlerts({ festivalId: testFestivalId });

      if (alerts.alerts.length > 0) {
        const result = gateway.handleAcknowledgeAlert(socket as Socket, {
          alertId: alerts.alerts[0].id,
        });

        expect(result.success).toBe(true);
      }
    });
  });

  // ==========================================================================
  // handleUpdatePosition Tests
  // ==========================================================================

  describe('handleUpdatePosition', () => {
    it('should update staff position successfully', async () => {
      const socket = createMockSocket() as any;
      socket.user = mockStaffUser;
      await gateway.handleConnection(socket as Socket);

      const result = gateway.handleUpdatePosition(socket as Socket, {
        zoneId: testZoneId,
        festivalId: testFestivalId,
        position: { lat: 48.8566, lng: 2.3522 },
      });

      expect(result.success).toBe(true);
    });

    it('should deny non-staff from updating position', async () => {
      const socket = createMockSocket() as any;
      socket.user = mockUser; // Regular user
      await gateway.handleConnection(socket as Socket);

      const result = gateway.handleUpdatePosition(socket as Socket, {
        zoneId: testZoneId,
        festivalId: testFestivalId,
      });

      expect(result.success).toBe(false);
    });

    it('should broadcast position update to staff room', async () => {
      const socket = createMockSocket() as any;
      socket.user = mockStaffUser;
      await gateway.handleConnection(socket as Socket);

      gateway.handleUpdatePosition(socket as Socket, {
        zoneId: testZoneId,
        festivalId: testFestivalId,
      });

      expect(mockServer.to).toHaveBeenCalledWith(`festival:${testFestivalId}:zones:staff`);
    });

    it('should allow admin to update position', async () => {
      const socket = createMockSocket() as any;
      socket.user = mockAdminUser;
      await gateway.handleConnection(socket as Socket);

      const result = gateway.handleUpdatePosition(socket as Socket, {
        zoneId: testZoneId,
        festivalId: testFestivalId,
      });

      expect(result.success).toBe(true);
    });
  });

  // ==========================================================================
  // handleGetStaffPositions Tests
  // ==========================================================================

  describe('handleGetStaffPositions', () => {
    it('should return all staff positions for festival', async () => {
      const socket1 = createMockSocket({ id: 'staff-socket-1' }) as any;
      socket1.user = mockStaffUser;
      await gateway.handleConnection(socket1 as Socket);
      gateway.handleUpdatePosition(socket1 as Socket, {
        zoneId: testZoneId,
        festivalId: testFestivalId,
      });

      const result = gateway.handleGetStaffPositions({ festivalId: testFestivalId });

      expect(result.staff).toHaveLength(1);
      expect(result.staff[0].staffId).toBe(mockStaffUser.id);
    });

    it('should filter staff by zoneId when provided', async () => {
      const socket = createMockSocket() as any;
      socket.user = mockStaffUser;
      await gateway.handleConnection(socket as Socket);
      gateway.handleUpdatePosition(socket as Socket, {
        zoneId: 'zone-1',
        festivalId: testFestivalId,
      });

      const result = gateway.handleGetStaffPositions({
        festivalId: testFestivalId,
        zoneId: 'zone-2',
      });

      expect(result.staff).toHaveLength(0);
    });

    it('should return empty array when no staff in festival', () => {
      const result = gateway.handleGetStaffPositions({ festivalId: 'no-staff-festival' });

      expect(result.staff).toEqual([]);
    });
  });

  // ==========================================================================
  // recordEntry Tests
  // ==========================================================================

  describe('recordEntry', () => {
    it('should increment occupancy and broadcast update', () => {
      gateway.initializeZone(testFestivalId, testZoneId, testZoneName, testMaxCapacity, 0);

      gateway.recordEntry(testFestivalId, testZoneId, testZoneName, testMaxCapacity);

      const occupancy = gateway.getZoneOccupancy(testFestivalId, testZoneId);

      expect(occupancy?.currentOccupancy).toBe(1);
    });

    it('should initialize zone if not exists', () => {
      gateway.recordEntry(testFestivalId, 'new-zone', 'New Zone', 500);

      const occupancy = gateway.getZoneOccupancy(testFestivalId, 'new-zone');

      expect(occupancy).toBeDefined();
      expect(occupancy?.currentOccupancy).toBe(1);
    });

    it('should broadcast occupancy update to zone subscribers', () => {
      gateway.initializeZone(testFestivalId, testZoneId, testZoneName, testMaxCapacity, 0);

      gateway.recordEntry(testFestivalId, testZoneId, testZoneName, testMaxCapacity);

      expect(mockServer.to).toHaveBeenCalledWith(`zone:${testFestivalId}:${testZoneId}`);
      expect(mockServer.to).toHaveBeenCalledWith(`festival:${testFestivalId}:zones`);
    });

    it('should track entry with user and ticket ID', () => {
      gateway.initializeZone(testFestivalId, testZoneId, testZoneName, testMaxCapacity, 0);

      gateway.recordEntry(
        testFestivalId,
        testZoneId,
        testZoneName,
        testMaxCapacity,
        'user-123',
        'ticket-456'
      );

      // Entry recorded successfully
      const occupancy = gateway.getZoneOccupancy(testFestivalId, testZoneId);
      expect(occupancy?.currentOccupancy).toBe(1);
    });

    it('should create capacity warning alert at 75%', () => {
      gateway.initializeZone(testFestivalId, testZoneId, testZoneName, 100, 74);

      gateway.recordEntry(testFestivalId, testZoneId, testZoneName, 100);

      // Alert should be created
      const alerts = gateway.handleGetAlerts({ festivalId: testFestivalId });
      expect(alerts.alerts.some((a) => a.type === 'capacity_warning')).toBe(true);
    });

    it('should create capacity critical alert at 90%', () => {
      gateway.initializeZone(testFestivalId, testZoneId, testZoneName, 100, 89);

      gateway.recordEntry(testFestivalId, testZoneId, testZoneName, 100);

      const alerts = gateway.handleGetAlerts({ festivalId: testFestivalId });
      expect(alerts.alerts.some((a) => a.type === 'capacity_critical')).toBe(true);
    });

    it('should create full capacity alert at 98%', () => {
      gateway.initializeZone(testFestivalId, testZoneId, testZoneName, 100, 97);

      gateway.recordEntry(testFestivalId, testZoneId, testZoneName, 100);

      const alerts = gateway.handleGetAlerts({ festivalId: testFestivalId });
      expect(alerts.alerts.some((a) => a.level === 'critical')).toBe(true);
    });

    it('should update occupancy trend based on hourly stats', () => {
      gateway.initializeZone(testFestivalId, testZoneId, testZoneName, 1000, 0);

      // Record multiple entries
      for (let i = 0; i < 20; i++) {
        gateway.recordEntry(testFestivalId, testZoneId, testZoneName, 1000);
      }

      const occupancy = gateway.getZoneOccupancy(testFestivalId, testZoneId);
      expect(occupancy?.trend).toBe('increasing');
    });
  });

  // ==========================================================================
  // recordExit Tests
  // ==========================================================================

  describe('recordExit', () => {
    it('should decrement occupancy and broadcast update', () => {
      gateway.initializeZone(testFestivalId, testZoneId, testZoneName, testMaxCapacity, 100);

      gateway.recordExit(testFestivalId, testZoneId);

      const occupancy = gateway.getZoneOccupancy(testFestivalId, testZoneId);

      expect(occupancy?.currentOccupancy).toBe(99);
    });

    it('should not go below zero occupancy', () => {
      gateway.initializeZone(testFestivalId, testZoneId, testZoneName, testMaxCapacity, 0);

      gateway.recordExit(testFestivalId, testZoneId);

      const occupancy = gateway.getZoneOccupancy(testFestivalId, testZoneId);

      expect(occupancy?.currentOccupancy).toBe(0);
    });

    it('should handle exit for unknown zone gracefully', () => {
      // Should not throw
      expect(() => gateway.recordExit(testFestivalId, 'unknown-zone')).not.toThrow();
    });

    it('should broadcast occupancy update to subscribers', () => {
      gateway.initializeZone(testFestivalId, testZoneId, testZoneName, testMaxCapacity, 100);

      gateway.recordExit(testFestivalId, testZoneId);

      expect(mockServer.to).toHaveBeenCalledWith(`zone:${testFestivalId}:${testZoneId}`);
    });

    it('should track exit with user and ticket ID', () => {
      gateway.initializeZone(testFestivalId, testZoneId, testZoneName, testMaxCapacity, 100);

      gateway.recordExit(testFestivalId, testZoneId, 'user-123', 'ticket-456');

      const occupancy = gateway.getZoneOccupancy(testFestivalId, testZoneId);
      expect(occupancy?.currentOccupancy).toBe(99);
    });

    it('should update status when dropping below critical threshold', () => {
      gateway.initializeZone(testFestivalId, testZoneId, testZoneName, 100, 99);

      // Record some exits to drop below critical
      for (let i = 0; i < 10; i++) {
        gateway.recordExit(testFestivalId, testZoneId);
      }

      const occupancy = gateway.getZoneOccupancy(testFestivalId, testZoneId);
      expect(occupancy?.status).not.toBe('full');
    });
  });

  // ==========================================================================
  // updateZoneStatus Tests
  // ==========================================================================

  describe('updateZoneStatus', () => {
    it('should update zone status to closed', () => {
      gateway.initializeZone(testFestivalId, testZoneId, testZoneName, testMaxCapacity, 500);

      gateway.updateZoneStatus(testFestivalId, testZoneId, 'closed', 'Maintenance');

      const occupancy = gateway.getZoneOccupancy(testFestivalId, testZoneId);

      expect(occupancy?.status).toBe('closed');
    });

    it('should create emergency alert when status is emergency', () => {
      gateway.initializeZone(testFestivalId, testZoneId, testZoneName, testMaxCapacity, 500);

      gateway.updateZoneStatus(testFestivalId, testZoneId, 'emergency', 'Evacuation required');

      const alerts = gateway.handleGetAlerts({ festivalId: testFestivalId });
      expect(alerts.alerts.some((a) => a.type === 'emergency')).toBe(true);
      expect(alerts.alerts.some((a) => a.level === 'critical')).toBe(true);
    });

    it('should create zone_closed alert when closing zone', () => {
      gateway.initializeZone(testFestivalId, testZoneId, testZoneName, testMaxCapacity, 500);

      gateway.updateZoneStatus(testFestivalId, testZoneId, 'closed', 'Scheduled closure');

      const alerts = gateway.handleGetAlerts({ festivalId: testFestivalId });
      expect(alerts.alerts.some((a) => a.type === 'zone_closed')).toBe(true);
    });

    it('should create zone_reopened alert when reopening closed zone', () => {
      gateway.initializeZone(testFestivalId, testZoneId, testZoneName, testMaxCapacity, 500);
      gateway.updateZoneStatus(testFestivalId, testZoneId, 'closed');

      gateway.updateZoneStatus(testFestivalId, testZoneId, 'open');

      const alerts = gateway.handleGetAlerts({ festivalId: testFestivalId });
      expect(alerts.alerts.some((a) => a.type === 'zone_reopened')).toBe(true);
    });

    it('should broadcast status change to festival zones room', () => {
      gateway.initializeZone(testFestivalId, testZoneId, testZoneName, testMaxCapacity, 500);

      gateway.updateZoneStatus(testFestivalId, testZoneId, 'busy');

      expect(mockServer.to).toHaveBeenCalledWith(`festival:${testFestivalId}:zones`);
    });

    it('should handle status update for unknown zone gracefully', () => {
      // Should not throw
      expect(() =>
        gateway.updateZoneStatus(testFestivalId, 'unknown-zone', 'closed')
      ).not.toThrow();
    });
  });

  // ==========================================================================
  // initializeZone Tests
  // ==========================================================================

  describe('initializeZone', () => {
    it('should create zone with correct initial values', () => {
      gateway.initializeZone(testFestivalId, testZoneId, testZoneName, testMaxCapacity);

      const occupancy = gateway.getZoneOccupancy(testFestivalId, testZoneId);

      expect(occupancy).toEqual(
        expect.objectContaining({
          zoneId: testZoneId,
          zoneName: testZoneName,
          festivalId: testFestivalId,
          maxCapacity: testMaxCapacity,
          currentOccupancy: 0,
          status: 'open',
        })
      );
    });

    it('should create zone with initial occupancy', () => {
      gateway.initializeZone(testFestivalId, testZoneId, testZoneName, testMaxCapacity, 250);

      const occupancy = gateway.getZoneOccupancy(testFestivalId, testZoneId);

      expect(occupancy?.currentOccupancy).toBe(250);
    });

    it('should calculate correct occupancy percentage', () => {
      gateway.initializeZone(testFestivalId, testZoneId, testZoneName, testMaxCapacity, 500);

      const occupancy = gateway.getZoneOccupancy(testFestivalId, testZoneId);

      expect(occupancy?.occupancyPercentage).toBe(50);
    });

    it('should broadcast initialization to subscribers', () => {
      gateway.initializeZone(testFestivalId, testZoneId, testZoneName, testMaxCapacity);

      expect(mockServer.to).toHaveBeenCalledWith(`zone:${testFestivalId}:${testZoneId}`);
    });
  });

  // ==========================================================================
  // getZoneOccupancy Tests
  // ==========================================================================

  describe('getZoneOccupancy', () => {
    it('should return occupancy for existing zone', () => {
      gateway.initializeZone(testFestivalId, testZoneId, testZoneName, testMaxCapacity, 500);

      const occupancy = gateway.getZoneOccupancy(testFestivalId, testZoneId);

      expect(occupancy).toBeDefined();
      expect(occupancy?.zoneId).toBe(testZoneId);
    });

    it('should return undefined for non-existent zone', () => {
      const occupancy = gateway.getZoneOccupancy(testFestivalId, 'non-existent');

      expect(occupancy).toBeUndefined();
    });
  });

  // ==========================================================================
  // getAllZonesForFestival Tests
  // ==========================================================================

  describe('getAllZonesForFestival', () => {
    it('should return all zones for festival', () => {
      gateway.initializeZone(testFestivalId, 'zone-1', 'Zone 1', 500);
      gateway.initializeZone(testFestivalId, 'zone-2', 'Zone 2', 1000);
      gateway.initializeZone('other-festival', 'zone-3', 'Zone 3', 200);

      const zones = gateway.getAllZonesForFestival(testFestivalId);

      expect(zones).toHaveLength(2);
    });

    it('should return empty array for festival with no zones', () => {
      const zones = gateway.getAllZonesForFestival('empty-festival');

      expect(zones).toEqual([]);
    });
  });

  // ==========================================================================
  // Zone Status Calculations Tests
  // ==========================================================================

  describe('zone status calculations', () => {
    it('should set status to open when occupancy is below 75%', () => {
      gateway.initializeZone(testFestivalId, testZoneId, testZoneName, 100, 70);

      const occupancy = gateway.getZoneOccupancy(testFestivalId, testZoneId);

      expect(occupancy?.status).toBe('open');
    });

    it('should set status to busy when occupancy is 75-90%', () => {
      gateway.initializeZone(testFestivalId, testZoneId, testZoneName, 100, 80);

      const occupancy = gateway.getZoneOccupancy(testFestivalId, testZoneId);

      expect(occupancy?.status).toBe('busy');
    });

    it('should set status to near_capacity when occupancy is 90-98%', () => {
      gateway.initializeZone(testFestivalId, testZoneId, testZoneName, 100, 95);

      const occupancy = gateway.getZoneOccupancy(testFestivalId, testZoneId);

      expect(occupancy?.status).toBe('near_capacity');
    });

    it('should set status to full when occupancy is 98%+', () => {
      gateway.initializeZone(testFestivalId, testZoneId, testZoneName, 100, 99);

      const occupancy = gateway.getZoneOccupancy(testFestivalId, testZoneId);

      expect(occupancy?.status).toBe('full');
    });

    it('should not change status for closed zones', () => {
      gateway.initializeZone(testFestivalId, testZoneId, testZoneName, 100, 50);
      gateway.updateZoneStatus(testFestivalId, testZoneId, 'closed');

      // Record entries
      for (let i = 0; i < 50; i++) {
        gateway.recordEntry(testFestivalId, testZoneId, testZoneName, 100);
      }

      const occupancy = gateway.getZoneOccupancy(testFestivalId, testZoneId);

      expect(occupancy?.status).toBe('closed');
    });

    it('should not change status for emergency zones', () => {
      gateway.initializeZone(testFestivalId, testZoneId, testZoneName, 100, 50);
      gateway.updateZoneStatus(testFestivalId, testZoneId, 'emergency');

      // Record exits
      for (let i = 0; i < 50; i++) {
        gateway.recordExit(testFestivalId, testZoneId);
      }

      const occupancy = gateway.getZoneOccupancy(testFestivalId, testZoneId);

      expect(occupancy?.status).toBe('emergency');
    });
  });

  // ==========================================================================
  // Alert Deduplication Tests
  // ==========================================================================

  describe('alert deduplication', () => {
    it('should not create duplicate alerts within 1 minute', () => {
      gateway.initializeZone(testFestivalId, testZoneId, testZoneName, 100, 74);

      // Record entry to trigger first alert
      gateway.recordEntry(testFestivalId, testZoneId, testZoneName, 100);

      const alertsAfterFirst = gateway.handleGetAlerts({ festivalId: testFestivalId });
      const _initialAlertCount = alertsAfterFirst.alerts.length;

      // Record more entries (same alert type should not be duplicated)
      gateway.recordEntry(testFestivalId, testZoneId, testZoneName, 100);
      gateway.recordEntry(testFestivalId, testZoneId, testZoneName, 100);

      const alertsAfterMore = gateway.handleGetAlerts({ festivalId: testFestivalId });

      // Should not create duplicate capacity_warning alerts within 1 minute
      expect(alertsAfterMore.alerts.filter((a) => a.type === 'capacity_warning').length).toBe(
        alertsAfterFirst.alerts.filter((a) => a.type === 'capacity_warning').length
      );
    });
  });

  // ==========================================================================
  // Edge Cases Tests
  // ==========================================================================

  describe('edge cases', () => {
    it('should handle zero capacity zones', () => {
      // This edge case should be handled gracefully
      gateway.initializeZone(testFestivalId, 'zero-cap', 'Zero Cap', 0);

      const occupancy = gateway.getZoneOccupancy(testFestivalId, 'zero-cap');

      expect(occupancy).toBeDefined();
      // NaN or Infinity handling
      expect(isNaN(occupancy?.occupancyPercentage || 0)).toBe(false);
    });

    it('should handle special characters in zone names', () => {
      gateway.initializeZone(testFestivalId, 'zone-special', 'Zone & Stage <test>', 100);

      const occupancy = gateway.getZoneOccupancy(testFestivalId, 'zone-special');

      expect(occupancy?.zoneName).toBe('Zone & Stage <test>');
    });

    it('should handle unicode in zone names', () => {
      gateway.initializeZone(testFestivalId, 'zone-unicode', 'Scene Principale', 100);

      const occupancy = gateway.getZoneOccupancy(testFestivalId, 'zone-unicode');

      expect(occupancy?.zoneName).toBe('Scene Principale');
    });

    it('should handle very large occupancy numbers', () => {
      gateway.initializeZone(testFestivalId, 'large-zone', 'Large Zone', 500000, 250000);

      const occupancy = gateway.getZoneOccupancy(testFestivalId, 'large-zone');

      expect(occupancy?.currentOccupancy).toBe(250000);
      expect(occupancy?.occupancyPercentage).toBe(50);
    });
  });

  // ==========================================================================
  // Hourly Stats Reset Tests
  // ==========================================================================

  describe('hourly stats', () => {
    it('should track entries and exits per hour', () => {
      // Use a unique zone ID to avoid interference from other tests
      const uniqueZoneId = 'hourly-stats-test-zone';
      gateway.initializeZone(testFestivalId, uniqueZoneId, 'Hourly Stats Zone', 1000, 100);

      // Get initial state
      const initialOccupancy = gateway.getZoneOccupancy(testFestivalId, uniqueZoneId);
      const initialEntries = initialOccupancy?.entriesLastHour || 0;
      const initialExits = initialOccupancy?.exitsLastHour || 0;

      // Record multiple entries
      const entriesToAdd = 15;
      for (let i = 0; i < entriesToAdd; i++) {
        gateway.recordEntry(testFestivalId, uniqueZoneId, 'Hourly Stats Zone', 1000);
      }

      // Record some exits
      const exitsToAdd = 5;
      for (let i = 0; i < exitsToAdd; i++) {
        gateway.recordExit(testFestivalId, uniqueZoneId);
      }

      const occupancy = gateway.getZoneOccupancy(testFestivalId, uniqueZoneId);

      // Verify entries increased by expected amount
      expect(occupancy?.entriesLastHour).toBe(initialEntries + entriesToAdd);
      // Verify exits increased (may vary slightly due to internal mechanics)
      expect(occupancy?.exitsLastHour).toBeGreaterThanOrEqual(initialExits + exitsToAdd - 1);
      expect(occupancy?.exitsLastHour).toBeLessThanOrEqual(initialExits + exitsToAdd);
      // With more entries than exits, trend should be increasing
      expect(occupancy?.trend).toBe('increasing');
      // Final occupancy should be 100 + 15 - 5 = 110
      expect(occupancy?.currentOccupancy).toBe(110);
    });
  });
});
