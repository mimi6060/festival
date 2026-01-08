/**
 * Analytics Service Unit Tests
 *
 * Comprehensive tests for analytics functionality including:
 * - Dashboard KPIs
 * - Sales analytics
 * - Cashless analytics
 * - Attendance analytics
 * - Zone analytics
 * - Vendor analytics
 * - Real-time analytics
 * - Cache invalidation
 */

import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { AnalyticsService } from './analytics.service';
import { PrismaService } from '../../prisma/prisma.service';
import { CacheService } from '../../cache/cache.service';
import {
  ongoingFestival,
  standardCategory,
  vipCategory,
} from '../../../test/fixtures';
import {
  DashboardQueryDto,
  SalesQueryDto,
  CashlessQueryDto,
  AttendanceQueryDto,
  ZoneQueryDto,
  VendorQueryDto,
  RealtimeQueryDto,
  AlertThresholdsDto,
} from '../dto';
import { Decimal } from '@prisma/client/runtime/library';

// ============================================================================
// Mock Setup
// ============================================================================

describe('AnalyticsService', () => {
  let analyticsService: AnalyticsService;

  // Comprehensive mock for Prisma service
  const mockPrismaService = {
    festival: {
      findUnique: jest.fn(),
    },
    ticket: {
      aggregate: jest.fn(),
      groupBy: jest.fn(),
      findMany: jest.fn(),
    },
    ticketCategory: {
      findMany: jest.fn(),
    },
    cashlessTransaction: {
      aggregate: jest.fn(),
      groupBy: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
    },
    cashlessAccount: {
      aggregate: jest.fn(),
      count: jest.fn(),
      findMany: jest.fn(),
    },
    zoneAccessLog: {
      groupBy: jest.fn(),
      findMany: jest.fn(),
    },
    zone: {
      findMany: jest.fn(),
    },
    vendor: {
      count: jest.fn(),
      findMany: jest.fn(),
    },
    vendorOrder: {
      aggregate: jest.fn(),
      groupBy: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
    },
  };

  const mockCacheService = {
    get: jest.fn(),
    set: jest.fn(),
    delete: jest.fn(),
    deletePattern: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AnalyticsService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: CacheService, useValue: mockCacheService },
      ],
    }).compile();

    analyticsService = module.get<AnalyticsService>(AnalyticsService);
  });

  // ==========================================================================
  // Helper Functions
  // ==========================================================================

  function createDecimal(value: number): Decimal {
    return new Decimal(value);
  }

  // Helper to setup default mocks for getDashboardKPIs
  function setupDashboardMocks(festivalData: any = null) {
    const festival = festivalData || {
      ...ongoingFestival,
      ticketCategories: [standardCategory, vipCategory],
    };
    mockPrismaService.festival.findUnique.mockResolvedValue(festival);
    mockPrismaService.ticket.aggregate.mockResolvedValue({
      _count: 0,
      _sum: { purchasePrice: null },
    });
    mockPrismaService.ticket.groupBy.mockResolvedValue([]);
    mockPrismaService.ticket.findMany.mockResolvedValue([]);
    mockPrismaService.cashlessTransaction.aggregate.mockResolvedValue({
      _sum: { amount: null },
    });
    mockPrismaService.cashlessAccount.aggregate.mockResolvedValue({
      _avg: { balance: null },
    });
    mockPrismaService.cashlessAccount.count.mockResolvedValue(0);
    mockPrismaService.zoneAccessLog.groupBy.mockResolvedValue([]);
    mockPrismaService.vendorOrder.aggregate.mockResolvedValue({
      _sum: { totalAmount: null },
    });
  }

  // Helper to setup default mocks for getSalesAnalytics
  function setupSalesMocks() {
    mockPrismaService.festival.findUnique.mockResolvedValue(ongoingFestival);
    mockPrismaService.ticket.aggregate.mockResolvedValue({
      _count: 0,
      _sum: { purchasePrice: null },
    });
    mockPrismaService.ticket.findMany.mockResolvedValue([]);
    mockPrismaService.ticketCategory.findMany.mockResolvedValue([]);
  }

  // Helper to setup default mocks for getCashlessAnalytics
  function setupCashlessMocks() {
    mockPrismaService.festival.findUnique.mockResolvedValue(ongoingFestival);
    mockPrismaService.cashlessTransaction.aggregate.mockResolvedValue({
      _count: 0,
      _sum: { amount: null },
      _avg: { amount: null },
    });
    mockPrismaService.cashlessTransaction.count.mockResolvedValue(0);
    mockPrismaService.cashlessTransaction.findMany.mockResolvedValue([]);
    mockPrismaService.cashlessTransaction.groupBy.mockResolvedValue([]);
    mockPrismaService.cashlessAccount.aggregate.mockResolvedValue({
      _avg: { balance: null },
    });
    mockPrismaService.cashlessAccount.count.mockResolvedValue(0);
    mockPrismaService.cashlessAccount.findMany.mockResolvedValue([]);
  }

  // Helper to setup default mocks for getAttendanceAnalytics
  function setupAttendanceMocks() {
    mockPrismaService.festival.findUnique.mockResolvedValue({
      ...ongoingFestival,
      currentAttendees: 5000,
    });
    mockPrismaService.zoneAccessLog.findMany.mockResolvedValue([]);
    mockPrismaService.zoneAccessLog.groupBy.mockResolvedValue([]);
    mockPrismaService.zone.findMany.mockResolvedValue([]);
  }

  // Helper to setup default mocks for getZoneAnalytics
  function setupZoneMocks() {
    mockPrismaService.festival.findUnique.mockResolvedValue(ongoingFestival);
    mockPrismaService.zone.findMany.mockResolvedValue([]);
    mockPrismaService.zoneAccessLog.findMany.mockResolvedValue([]);
  }

  // Helper to setup default mocks for getVendorAnalytics
  function setupVendorMocks() {
    mockPrismaService.festival.findUnique.mockResolvedValue(ongoingFestival);
    mockPrismaService.vendor.count.mockResolvedValue(0);
    mockPrismaService.vendor.findMany.mockResolvedValue([]);
    mockPrismaService.vendorOrder.aggregate.mockResolvedValue({
      _count: 0,
      _sum: { totalAmount: null },
    });
    mockPrismaService.vendorOrder.findMany.mockResolvedValue([]);
    mockPrismaService.vendorOrder.groupBy.mockResolvedValue([]);
  }

  // Helper to setup default mocks for getRealtimeAnalytics
  function setupRealtimeMocks() {
    mockPrismaService.festival.findUnique.mockResolvedValue({
      ...ongoingFestival,
      currentAttendees: 5000,
      maxCapacity: 10000,
    });
    mockPrismaService.zoneAccessLog.findMany.mockResolvedValue([]);
    mockPrismaService.ticket.aggregate.mockResolvedValue({
      _count: 0,
      _sum: { purchasePrice: null },
    });
    mockPrismaService.cashlessTransaction.groupBy.mockResolvedValue([]);
    mockPrismaService.vendorOrder.count.mockResolvedValue(0);
    mockPrismaService.zone.findMany.mockResolvedValue([]);
  }

  // ==========================================================================
  // getDashboardKPIs Tests
  // ==========================================================================

  describe('getDashboardKPIs', () => {
    const query: DashboardQueryDto = {
      startDate: '2024-07-01T00:00:00Z',
      endDate: '2024-07-07T23:59:59Z',
      includeTrends: true,
    };

    beforeEach(() => {
      mockCacheService.get.mockResolvedValue(null);
    });

    it('should return dashboard KPIs for a festival', async () => {
      // Arrange
      const mockFestivalWithCategories = {
        ...ongoingFestival,
        ticketCategories: [standardCategory, vipCategory],
      };
      mockPrismaService.festival.findUnique.mockResolvedValue(mockFestivalWithCategories);
      mockPrismaService.ticket.aggregate.mockResolvedValue({
        _count: 1000,
        _sum: { purchasePrice: createDecimal(50000) },
      });
      mockPrismaService.ticket.groupBy.mockResolvedValue([
        { categoryId: standardCategory.id, _count: 800, _sum: { purchasePrice: createDecimal(40000) } },
        { categoryId: vipCategory.id, _count: 200, _sum: { purchasePrice: createDecimal(10000) } },
      ]);
      mockPrismaService.cashlessTransaction.aggregate.mockResolvedValue({
        _sum: { amount: createDecimal(10000) },
      });
      mockPrismaService.cashlessAccount.aggregate.mockResolvedValue({
        _avg: { balance: createDecimal(50) },
      });
      mockPrismaService.cashlessAccount.count.mockResolvedValue(500);
      mockPrismaService.zoneAccessLog.groupBy.mockResolvedValue([]);
      mockPrismaService.vendorOrder.aggregate.mockResolvedValue({
        _sum: { totalAmount: createDecimal(5000) },
      });
      mockPrismaService.ticket.findMany.mockResolvedValue([]);

      // Act
      const result = await analyticsService.getDashboardKPIs(ongoingFestival.id, query);

      // Assert
      expect(result.festivalId).toBe(ongoingFestival.id);
      expect(result.festivalName).toBe(ongoingFestival.name);
      expect(result.ticketing.totalSold).toBe(1000);
      expect(result.generatedAt).toBeInstanceOf(Date);
    });

    it('should return cached data if available', async () => {
      // Arrange
      const cachedData = {
        festivalId: ongoingFestival.id,
        festivalName: ongoingFestival.name,
        generatedAt: new Date(),
        ticketing: { totalSold: 500, totalAvailable: 500, soldPercentage: 50, revenueTickets: 0, ticketsByType: [], salesTrend: [] },
        revenue: { totalRevenue: 0, ticketRevenue: 0, cashlessRevenue: 0, vendorRevenue: 0, currency: 'EUR' },
        attendance: { currentAttendees: 0, maxCapacity: 10000, occupancyRate: 0, peakAttendance: 0, peakTime: null },
        cashless: { totalTopups: 0, totalSpent: 0, averageBalance: 0, activeAccounts: 0 },
        conversion: { visitorsToCart: 0, cartToPurchase: 0, overallConversion: 0 },
      };
      mockCacheService.get.mockResolvedValue(cachedData);

      // Act
      const result = await analyticsService.getDashboardKPIs(ongoingFestival.id, query);

      // Assert
      expect(result).toEqual(cachedData);
      expect(mockPrismaService.festival.findUnique).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException if festival not found', async () => {
      // Arrange
      mockPrismaService.festival.findUnique.mockResolvedValue(null);

      // Act & Assert
      await expect(
        analyticsService.getDashboardKPIs('non-existent-id', query),
      ).rejects.toThrow(NotFoundException);
    });

    it('should include trends when includeTrends is true', async () => {
      // Arrange
      setupDashboardMocks();
      const ticketsWithDates = [
        { createdAt: new Date('2024-07-01'), purchasePrice: createDecimal(100) },
        { createdAt: new Date('2024-07-02'), purchasePrice: createDecimal(150) },
        { createdAt: new Date('2024-07-02'), purchasePrice: createDecimal(100) },
      ];
      mockPrismaService.ticket.findMany.mockResolvedValue(ticketsWithDates);

      // Act
      const result = await analyticsService.getDashboardKPIs(ongoingFestival.id, query);

      // Assert
      expect(result.ticketing.salesTrend).toBeDefined();
      expect(result.ticketing.salesTrend.length).toBeGreaterThanOrEqual(0);
    });

    it('should not include trends when includeTrends is false', async () => {
      // Arrange
      const queryWithoutTrends: DashboardQueryDto = { ...query, includeTrends: false };
      setupDashboardMocks();

      // Act
      const result = await analyticsService.getDashboardKPIs(ongoingFestival.id, queryWithoutTrends);

      // Assert
      expect(result.ticketing.salesTrend).toEqual([]);
    });

    it('should calculate correct occupancy rate', async () => {
      // Arrange
      const festivalWithAttendees = {
        ...ongoingFestival,
        ticketCategories: [],
        currentAttendees: 5000,
        maxCapacity: 10000,
      };
      setupDashboardMocks(festivalWithAttendees);

      // Act
      const result = await analyticsService.getDashboardKPIs(ongoingFestival.id, query);

      // Assert
      expect(result.attendance.currentAttendees).toBe(5000);
      expect(result.attendance.maxCapacity).toBe(10000);
      expect(result.attendance.occupancyRate).toBe(50);
    });

    it('should handle zero capacity gracefully', async () => {
      // Arrange
      const festivalWithZeroCapacity = {
        ...ongoingFestival,
        ticketCategories: [],
        maxCapacity: 0,
        currentAttendees: 0,
      };
      setupDashboardMocks(festivalWithZeroCapacity);

      // Act
      const result = await analyticsService.getDashboardKPIs(ongoingFestival.id, query);

      // Assert
      expect(result.attendance.occupancyRate).toBe(0);
    });

    it('should cache the result after computation', async () => {
      // Arrange
      setupDashboardMocks();

      // Act
      await analyticsService.getDashboardKPIs(ongoingFestival.id, query);

      // Assert
      expect(mockCacheService.set).toHaveBeenCalledWith(
        expect.stringContaining(`analytics:dashboard:${ongoingFestival.id}`),
        expect.any(Object),
        60,
      );
    });
  });

  // ==========================================================================
  // getSalesAnalytics Tests
  // ==========================================================================

  describe('getSalesAnalytics', () => {
    const query: SalesQueryDto = {
      startDate: '2024-07-01T00:00:00Z',
      endDate: '2024-07-07T23:59:59Z',
      groupBy: 'day',
    };

    beforeEach(() => {
      mockCacheService.get.mockResolvedValue(null);
    });

    it('should return sales analytics for a festival', async () => {
      // Arrange
      setupSalesMocks();
      mockPrismaService.ticket.aggregate.mockResolvedValue({
        _count: 500,
        _sum: { purchasePrice: createDecimal(25000) },
      });
      mockPrismaService.ticket.findMany.mockResolvedValue([
        { userId: 'user1', createdAt: new Date('2024-07-01'), purchasePrice: createDecimal(100), status: 'SOLD' },
        { userId: 'user2', createdAt: new Date('2024-07-01'), purchasePrice: createDecimal(100), status: 'SOLD' },
      ]);
      mockPrismaService.ticketCategory.findMany.mockResolvedValue([
        {
          ...standardCategory,
          tickets: [
            { purchasePrice: createDecimal(100) },
            { purchasePrice: createDecimal(100) },
          ],
        },
      ]);

      // Act
      const result = await analyticsService.getSalesAnalytics(ongoingFestival.id, query);

      // Assert
      expect(result.festivalId).toBe(ongoingFestival.id);
      expect(result.period).toBeDefined();
      expect(result.summary).toBeDefined();
      expect(result.salesByDay).toBeDefined();
      expect(result.salesByHour).toBeDefined();
      expect(result.salesByCategory).toBeDefined();
    });

    it('should return cached data if available', async () => {
      // Arrange
      const cachedData = {
        festivalId: ongoingFestival.id,
        period: { startDate: new Date(), endDate: new Date() },
        summary: { totalSales: 100, totalRevenue: 5000, averageOrderValue: 50, uniqueCustomers: 50 },
        salesByDay: [],
        salesByHour: [],
        salesByCategory: [],
        topSellingCategories: [],
      };
      mockCacheService.get.mockResolvedValue(cachedData);

      // Act
      const result = await analyticsService.getSalesAnalytics(ongoingFestival.id, query);

      // Assert
      expect(result).toEqual(cachedData);
    });

    it('should throw NotFoundException if festival not found', async () => {
      // Arrange
      mockPrismaService.festival.findUnique.mockResolvedValue(null);

      // Act & Assert
      await expect(
        analyticsService.getSalesAnalytics('non-existent-id', query),
      ).rejects.toThrow(NotFoundException);
    });

    it('should calculate average order value correctly', async () => {
      // Arrange
      setupSalesMocks();
      mockPrismaService.ticket.aggregate.mockResolvedValue({
        _count: 100,
        _sum: { purchasePrice: createDecimal(10000) },
      });
      mockPrismaService.ticket.findMany
        .mockResolvedValueOnce([{ userId: 'user1' }, { userId: 'user2' }]) // For unique customers
        .mockResolvedValueOnce([ // For sales by day
          { createdAt: new Date('2024-07-01'), purchasePrice: createDecimal(100), status: 'SOLD' },
        ])
        .mockResolvedValueOnce([ // For sales by hour
          { createdAt: new Date('2024-07-01T10:00:00Z'), purchasePrice: createDecimal(100) },
        ]);

      // Act
      const result = await analyticsService.getSalesAnalytics(ongoingFestival.id, query);

      // Assert
      expect(result.summary.averageOrderValue).toBe(100); // 10000 / 100
    });

    it('should include comparison data when requested', async () => {
      // Arrange
      const queryWithComparison: SalesQueryDto = {
        ...query,
        includeComparison: true,
        comparisonType: 'previous_week',
      };
      setupSalesMocks();
      mockPrismaService.ticket.findMany.mockResolvedValue([]);

      // Act
      const result = await analyticsService.getSalesAnalytics(ongoingFestival.id, queryWithComparison);

      // Assert
      expect(result.comparison).toBeDefined();
    });

    it('should group sales by day correctly', async () => {
      // Arrange
      const day1 = new Date('2024-07-01T10:00:00Z');
      const day2 = new Date('2024-07-02T14:00:00Z');
      setupSalesMocks();
      mockPrismaService.ticket.findMany.mockResolvedValue([
        { createdAt: day1, purchasePrice: createDecimal(100), status: 'SOLD' },
        { createdAt: day1, purchasePrice: createDecimal(100), status: 'SOLD' },
        { createdAt: day2, purchasePrice: createDecimal(100), status: 'SOLD' },
      ]);

      // Act
      const result = await analyticsService.getSalesAnalytics(ongoingFestival.id, query);

      // Assert
      expect(result.salesByDay).toBeDefined();
      expect(result.salesByDay.length).toBeGreaterThan(0);
    });

    it('should handle refunded tickets correctly', async () => {
      // Arrange
      setupSalesMocks();
      mockPrismaService.ticket.findMany.mockResolvedValue([
        { createdAt: new Date('2024-07-01'), purchasePrice: createDecimal(100), status: 'SOLD' },
        { createdAt: new Date('2024-07-01'), purchasePrice: createDecimal(100), status: 'REFUNDED' },
      ]);

      // Act
      const result = await analyticsService.getSalesAnalytics(ongoingFestival.id, query);

      // Assert
      expect(result.salesByDay).toBeDefined();
      // Check that refunds are tracked separately
      const hasRefunds = result.salesByDay.some(day => day.refunds > 0);
      expect(hasRefunds).toBe(true);
    });
  });

  // ==========================================================================
  // getCashlessAnalytics Tests
  // ==========================================================================

  describe('getCashlessAnalytics', () => {
    const query: CashlessQueryDto = {
      startDate: '2024-07-01T00:00:00Z',
      endDate: '2024-07-07T23:59:59Z',
      groupBy: 'hour',
    };

    beforeEach(() => {
      mockCacheService.get.mockResolvedValue(null);
    });

    it('should return cashless analytics for a festival', async () => {
      // Arrange
      setupCashlessMocks();
      mockPrismaService.cashlessTransaction.aggregate
        .mockResolvedValueOnce({ _count: 50, _sum: { amount: createDecimal(5000) }, _avg: { amount: createDecimal(100) } })
        .mockResolvedValueOnce({ _count: 100, _sum: { amount: createDecimal(8000) }, _avg: { amount: createDecimal(80) } });
      mockPrismaService.cashlessTransaction.count
        .mockResolvedValueOnce(10)
        .mockResolvedValueOnce(5);
      mockPrismaService.cashlessAccount.aggregate.mockResolvedValue({
        _avg: { balance: createDecimal(45) },
      });
      mockPrismaService.cashlessAccount.count.mockResolvedValue(200);

      // Act
      const result = await analyticsService.getCashlessAnalytics(ongoingFestival.id, query);

      // Assert
      expect(result.festivalId).toBe(ongoingFestival.id);
      expect(result.summary).toBeDefined();
      expect(result.transactionsByHour).toBeDefined();
      expect(result.transactionsByType).toBeDefined();
    });

    it('should throw NotFoundException if festival not found', async () => {
      // Arrange
      mockPrismaService.festival.findUnique.mockResolvedValue(null);

      // Act & Assert
      await expect(
        analyticsService.getCashlessAnalytics('non-existent-id', query),
      ).rejects.toThrow(NotFoundException);
    });

    it('should calculate topup distribution correctly', async () => {
      // Arrange
      setupCashlessMocks();
      // For getCashlessTransactionsByHour - needs createdAt
      mockPrismaService.cashlessTransaction.findMany
        .mockResolvedValueOnce([
          { createdAt: new Date('2024-07-01T10:00:00Z'), type: 'TOPUP', amount: createDecimal(50) },
        ])
        // For getTopupDistribution - only needs amount
        .mockResolvedValueOnce([
          { amount: createDecimal(5) },
          { amount: createDecimal(15) },
          { amount: createDecimal(30) },
          { amount: createDecimal(75) },
          { amount: createDecimal(120) },
        ])
        // For getBalanceDistribution
        .mockResolvedValueOnce([]);
      mockPrismaService.cashlessAccount.findMany.mockResolvedValue([]);

      // Act
      const result = await analyticsService.getCashlessAnalytics(ongoingFestival.id, query);

      // Assert
      expect(result.topupDistribution).toBeDefined();
      expect(result.topupDistribution.length).toBe(5); // 5 distribution ranges
    });

    it('should group transactions by hour correctly', async () => {
      // Arrange
      setupCashlessMocks();
      mockPrismaService.cashlessTransaction.findMany.mockResolvedValue([
        { createdAt: new Date('2024-07-01T10:30:00Z'), type: 'TOPUP', amount: createDecimal(50) },
        { createdAt: new Date('2024-07-01T10:45:00Z'), type: 'PAYMENT', amount: createDecimal(20) },
        { createdAt: new Date('2024-07-01T14:00:00Z'), type: 'PAYMENT', amount: createDecimal(30) },
      ]);

      // Act
      const result = await analyticsService.getCashlessAnalytics(ongoingFestival.id, query);

      // Assert
      expect(result.transactionsByHour).toBeDefined();
      expect(result.transactionsByHour.length).toBe(24); // All 24 hours
    });
  });

  // ==========================================================================
  // getAttendanceAnalytics Tests
  // ==========================================================================

  describe('getAttendanceAnalytics', () => {
    const query: AttendanceQueryDto = {
      startDate: '2024-07-01T00:00:00Z',
      endDate: '2024-07-07T23:59:59Z',
      granularity: 'hour',
      includeFlow: true,
    };

    beforeEach(() => {
      mockCacheService.get.mockResolvedValue(null);
    });

    it('should return attendance analytics for a festival', async () => {
      // Arrange
      setupAttendanceMocks();
      mockPrismaService.zoneAccessLog.findMany.mockResolvedValue([
        { timestamp: new Date(), action: 'ENTRY', ticketId: 'ticket1' },
        { timestamp: new Date(), action: 'EXIT', ticketId: 'ticket1' },
      ]);
      mockPrismaService.zone.findMany.mockResolvedValue([
        { id: 'zone1', name: 'Main Stage', currentOccupancy: 1000, capacity: 5000, isActive: true },
      ]);

      // Act
      const result = await analyticsService.getAttendanceAnalytics(ongoingFestival.id, query);

      // Assert
      expect(result.festivalId).toBe(ongoingFestival.id);
      expect(result.current).toBeDefined();
      expect(result.hourlyAttendance).toBeDefined();
      expect(result.dailyAttendance).toBeDefined();
      expect(result.zoneDistribution).toBeDefined();
    });

    it('should throw NotFoundException if festival not found', async () => {
      // Arrange
      mockPrismaService.festival.findUnique.mockResolvedValue(null);

      // Act & Assert
      await expect(
        analyticsService.getAttendanceAnalytics('non-existent-id', query),
      ).rejects.toThrow(NotFoundException);
    });

    it('should calculate current occupancy correctly', async () => {
      // Arrange
      const festivalWithAttendees = {
        ...ongoingFestival,
        currentAttendees: 4500,
        maxCapacity: 10000,
      };
      mockPrismaService.festival.findUnique.mockResolvedValue(festivalWithAttendees);
      mockPrismaService.zoneAccessLog.findMany.mockResolvedValue([]);
      mockPrismaService.zoneAccessLog.groupBy.mockResolvedValue([]);
      mockPrismaService.zone.findMany.mockResolvedValue([]);

      // Act
      const result = await analyticsService.getAttendanceAnalytics(ongoingFestival.id, query);

      // Assert
      expect(result.current.totalInside).toBe(4500);
      expect(result.current.maxCapacity).toBe(10000);
      expect(result.current.occupancyRate).toBe(45);
    });

    it('should include entry/exit flow when requested', async () => {
      // Arrange
      setupAttendanceMocks();
      mockPrismaService.zoneAccessLog.findMany.mockResolvedValue([
        { timestamp: new Date('2024-07-01T10:00:00Z'), action: 'ENTRY' },
        { timestamp: new Date('2024-07-01T10:05:00Z'), action: 'ENTRY' },
        { timestamp: new Date('2024-07-01T10:10:00Z'), action: 'EXIT' },
      ]);

      // Act
      const result = await analyticsService.getAttendanceAnalytics(ongoingFestival.id, query);

      // Assert
      expect(result.entryExitFlow).toBeDefined();
      expect(result.entryExitFlow.length).toBeGreaterThanOrEqual(0);
    });

    it('should not include entry/exit flow when not requested', async () => {
      // Arrange
      const queryWithoutFlow: AttendanceQueryDto = { ...query, includeFlow: false };
      setupAttendanceMocks();

      // Act
      const result = await analyticsService.getAttendanceAnalytics(ongoingFestival.id, queryWithoutFlow);

      // Assert
      expect(result.entryExitFlow).toEqual([]);
    });

    it('should calculate peak times correctly', async () => {
      // Arrange
      setupAttendanceMocks();
      mockPrismaService.zoneAccessLog.findMany.mockResolvedValue([
        { timestamp: new Date('2024-07-01T10:00:00Z'), action: 'ENTRY' },
        { timestamp: new Date('2024-07-01T10:00:00Z'), action: 'ENTRY' },
        { timestamp: new Date('2024-07-01T14:00:00Z'), action: 'ENTRY' },
        { timestamp: new Date('2024-07-01T14:00:00Z'), action: 'EXIT' },
      ]);

      // Act
      const result = await analyticsService.getAttendanceAnalytics(ongoingFestival.id, query);

      // Assert
      expect(result.peakTimes).toBeDefined();
      expect(result.peakTimes.peak).toBeDefined();
      expect(result.peakTimes.lowest).toBeDefined();
    });
  });

  // ==========================================================================
  // getZoneAnalytics Tests
  // ==========================================================================

  describe('getZoneAnalytics', () => {
    const query: ZoneQueryDto = {
      startDate: '2024-07-01T00:00:00Z',
      endDate: '2024-07-07T23:59:59Z',
      includeHeatmap: false,
      includeTransitions: false,
    };

    beforeEach(() => {
      mockCacheService.get.mockResolvedValue(null);
    });

    it('should return zone analytics for a festival', async () => {
      // Arrange
      setupZoneMocks();
      mockPrismaService.zone.findMany.mockResolvedValue([
        {
          id: 'zone1',
          name: 'Main Stage',
          capacity: 5000,
          currentOccupancy: 2000,
          isActive: true,
          accessLogs: [
            { action: 'ENTRY', timestamp: new Date(), ticketId: 'ticket1' },
          ],
        },
      ]);

      // Act
      const result = await analyticsService.getZoneAnalytics(ongoingFestival.id, query);

      // Assert
      expect(result.festivalId).toBe(ongoingFestival.id);
      expect(result.zones).toBeDefined();
      expect(result.heatmapData).toBeDefined();
      expect(result.zoneTransitions).toBeDefined();
    });

    it('should throw NotFoundException if festival not found', async () => {
      // Arrange
      mockPrismaService.festival.findUnique.mockResolvedValue(null);

      // Act & Assert
      await expect(
        analyticsService.getZoneAnalytics('non-existent-id', query),
      ).rejects.toThrow(NotFoundException);
    });

    it('should filter by zoneId when provided', async () => {
      // Arrange
      const queryWithZone: ZoneQueryDto = { ...query, zoneId: 'zone1' };
      setupZoneMocks();
      mockPrismaService.zone.findMany.mockResolvedValue([
        {
          id: 'zone1',
          name: 'Main Stage',
          capacity: 5000,
          currentOccupancy: 2000,
          isActive: true,
          accessLogs: [],
        },
      ]);

      // Act
      await analyticsService.getZoneAnalytics(ongoingFestival.id, queryWithZone);

      // Assert
      expect(mockPrismaService.zone.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ id: 'zone1' }),
        }),
      );
    });

    it('should calculate zone occupancy rate correctly', async () => {
      // Arrange
      setupZoneMocks();
      mockPrismaService.zone.findMany.mockResolvedValue([
        {
          id: 'zone1',
          name: 'VIP Area',
          capacity: 1000,
          currentOccupancy: 500,
          isActive: true,
          accessLogs: [],
        },
      ]);

      // Act
      const result = await analyticsService.getZoneAnalytics(ongoingFestival.id, query);

      // Assert
      expect(result.zones[0].occupancyRate).toBe(50);
    });

    it('should not include heatmap when not requested', async () => {
      // Arrange
      const queryWithoutHeatmap: ZoneQueryDto = { ...query, includeHeatmap: false };
      setupZoneMocks();
      mockPrismaService.zone.findMany.mockResolvedValue([
        {
          id: 'zone1',
          name: 'Main Stage',
          capacity: 5000,
          currentOccupancy: 2000,
          isActive: true,
          accessLogs: [],
        },
      ]);

      // Act
      const result = await analyticsService.getZoneAnalytics(ongoingFestival.id, queryWithoutHeatmap);

      // Assert
      expect(result.heatmapData).toEqual([]);
    });

    it('should not include transitions when not requested', async () => {
      // Arrange
      const queryWithoutTransitions: ZoneQueryDto = { ...query, includeTransitions: false };
      setupZoneMocks();
      mockPrismaService.zone.findMany.mockResolvedValue([
        {
          id: 'zone1',
          name: 'Main Stage',
          capacity: 5000,
          currentOccupancy: 2000,
          isActive: true,
          accessLogs: [],
        },
      ]);

      // Act
      const result = await analyticsService.getZoneAnalytics(ongoingFestival.id, queryWithoutTransitions);

      // Assert
      expect(result.zoneTransitions).toEqual([]);
    });
  });

  // ==========================================================================
  // getVendorAnalytics Tests
  // ==========================================================================

  describe('getVendorAnalytics', () => {
    const query: VendorQueryDto = {
      startDate: '2024-07-01T00:00:00Z',
      endDate: '2024-07-07T23:59:59Z',
      topLimit: 10,
      topProductsLimit: 20,
    };

    beforeEach(() => {
      mockCacheService.get.mockResolvedValue(null);
    });

    it('should return vendor analytics for a festival', async () => {
      // Arrange
      setupVendorMocks();
      mockPrismaService.vendor.count.mockResolvedValue(5);
      mockPrismaService.vendorOrder.aggregate.mockResolvedValue({
        _count: 100,
        _sum: { totalAmount: createDecimal(5000) },
      });
      mockPrismaService.vendor.findMany.mockResolvedValue([
        {
          id: 'vendor1',
          name: 'Pizza Stand',
          type: 'FOOD',
          orders: [{ status: 'DELIVERED', totalAmount: createDecimal(100) }],
        },
      ]);

      // Act
      const result = await analyticsService.getVendorAnalytics(ongoingFestival.id, query);

      // Assert
      expect(result.festivalId).toBe(ongoingFestival.id);
      expect(result.summary).toBeDefined();
      expect(result.vendorsByType).toBeDefined();
      expect(result.topVendors).toBeDefined();
      expect(result.topProducts).toBeDefined();
    });

    it('should throw NotFoundException if festival not found', async () => {
      // Arrange
      mockPrismaService.festival.findUnique.mockResolvedValue(null);

      // Act & Assert
      await expect(
        analyticsService.getVendorAnalytics('non-existent-id', query),
      ).rejects.toThrow(NotFoundException);
    });

    it('should filter by vendorId when provided', async () => {
      // Arrange
      const queryWithVendor: VendorQueryDto = { ...query, vendorId: 'vendor1' };
      setupVendorMocks();

      // Act
      await analyticsService.getVendorAnalytics(ongoingFestival.id, queryWithVendor);

      // Assert
      expect(mockPrismaService.vendor.count).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ id: 'vendor1' }),
        }),
      );
    });

    it('should filter by vendorType when provided', async () => {
      // Arrange
      const queryWithType: VendorQueryDto = { ...query, vendorType: 'FOOD' };
      setupVendorMocks();

      // Act
      await analyticsService.getVendorAnalytics(ongoingFestival.id, queryWithType);

      // Assert
      expect(mockPrismaService.vendor.count).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ type: 'FOOD' }),
        }),
      );
    });

    it('should calculate average order value correctly', async () => {
      // Arrange
      setupVendorMocks();
      mockPrismaService.vendor.count.mockResolvedValue(2);
      mockPrismaService.vendorOrder.aggregate.mockResolvedValue({
        _count: 100,
        _sum: { totalAmount: createDecimal(2500) },
      });

      // Act
      const result = await analyticsService.getVendorAnalytics(ongoingFestival.id, query);

      // Assert
      expect(result.summary.averageOrderValue).toBe(25); // 2500 / 100
    });

    it('should respect topLimit parameter', async () => {
      // Arrange
      const queryWithLimit: VendorQueryDto = { ...query, topLimit: 5 };
      const vendors = Array(10).fill(null).map((_, i) => ({
        id: `vendor${i}`,
        name: `Vendor ${i}`,
        type: 'FOOD',
        orders: [{ status: 'DELIVERED', totalAmount: createDecimal(100 * (10 - i)) }],
      }));
      setupVendorMocks();
      mockPrismaService.vendor.count.mockResolvedValue(10);
      mockPrismaService.vendorOrder.aggregate.mockResolvedValue({
        _count: 100,
        _sum: { totalAmount: createDecimal(5000) },
      });
      mockPrismaService.vendor.findMany.mockResolvedValue(vendors);

      // Act
      const result = await analyticsService.getVendorAnalytics(ongoingFestival.id, queryWithLimit);

      // Assert
      expect(result.topVendors.length).toBeLessThanOrEqual(5);
    });
  });

  // ==========================================================================
  // getRealtimeAnalytics Tests
  // ==========================================================================

  describe('getRealtimeAnalytics', () => {
    const query: RealtimeQueryDto = {
      includeAlerts: true,
      includeZones: true,
    };

    beforeEach(() => {
      mockCacheService.get.mockResolvedValue(null);
    });

    it('should return realtime analytics for a festival', async () => {
      // Arrange
      setupRealtimeMocks();
      mockPrismaService.zoneAccessLog.findMany.mockResolvedValue([
        { action: 'ENTRY' },
        { action: 'ENTRY' },
        { action: 'EXIT' },
      ]);
      mockPrismaService.ticket.aggregate.mockResolvedValue({
        _count: 10,
        _sum: { purchasePrice: createDecimal(1000) },
      });
      mockPrismaService.cashlessTransaction.groupBy.mockResolvedValue([
        { type: 'TOPUP', _count: 5 },
        { type: 'PAYMENT', _count: 10 },
      ]);
      mockPrismaService.vendorOrder.count.mockResolvedValue(20);
      mockPrismaService.zone.findMany.mockResolvedValue([
        { id: 'zone1', name: 'Main Stage', currentOccupancy: 3000, capacity: 5000, isActive: true },
      ]);

      // Act
      const result = await analyticsService.getRealtimeAnalytics(ongoingFestival.id, query);

      // Assert
      expect(result.festivalId).toBe(ongoingFestival.id);
      expect(result.timestamp).toBeInstanceOf(Date);
      expect(result.live).toBeDefined();
      expect(result.lastHour).toBeDefined();
    });

    it('should throw NotFoundException if festival not found', async () => {
      // Arrange
      mockPrismaService.festival.findUnique.mockResolvedValue(null);

      // Act & Assert
      await expect(
        analyticsService.getRealtimeAnalytics('non-existent-id', query),
      ).rejects.toThrow(NotFoundException);
    });

    it('should include alerts when requested', async () => {
      // Arrange
      setupRealtimeMocks();

      // Act
      const result = await analyticsService.getRealtimeAnalytics(ongoingFestival.id, query);

      // Assert
      expect(result.alerts).toBeDefined();
      expect(Array.isArray(result.alerts)).toBe(true);
    });

    it('should not include alerts when not requested', async () => {
      // Arrange
      const queryWithoutAlerts: RealtimeQueryDto = { ...query, includeAlerts: false };
      setupRealtimeMocks();

      // Act
      const result = await analyticsService.getRealtimeAnalytics(ongoingFestival.id, queryWithoutAlerts);

      // Assert
      expect(result.alerts).toEqual([]);
    });

    it('should generate capacity warning alert at 80% occupancy', async () => {
      // Arrange
      const festivalNearCapacity = {
        ...ongoingFestival,
        currentAttendees: 8500,
        maxCapacity: 10000,
      };
      mockPrismaService.festival.findUnique.mockResolvedValue(festivalNearCapacity);
      mockPrismaService.zoneAccessLog.findMany.mockResolvedValue([]);
      mockPrismaService.ticket.aggregate.mockResolvedValue({
        _count: 0,
        _sum: { purchasePrice: null },
      });
      mockPrismaService.cashlessTransaction.groupBy.mockResolvedValue([]);
      mockPrismaService.vendorOrder.count.mockResolvedValue(0);
      mockPrismaService.zone.findMany.mockResolvedValue([]);

      // Act
      const result = await analyticsService.getRealtimeAnalytics(ongoingFestival.id, query);

      // Assert
      const capacityAlert = result.alerts.find(a => a.type === 'CAPACITY_WARNING');
      expect(capacityAlert).toBeDefined();
    });

    it('should generate capacity critical alert at 95% occupancy', async () => {
      // Arrange
      const festivalAtCapacity = {
        ...ongoingFestival,
        currentAttendees: 9600,
        maxCapacity: 10000,
      };
      mockPrismaService.festival.findUnique.mockResolvedValue(festivalAtCapacity);
      mockPrismaService.zoneAccessLog.findMany.mockResolvedValue([]);
      mockPrismaService.ticket.aggregate.mockResolvedValue({
        _count: 0,
        _sum: { purchasePrice: null },
      });
      mockPrismaService.cashlessTransaction.groupBy.mockResolvedValue([]);
      mockPrismaService.vendorOrder.count.mockResolvedValue(0);
      mockPrismaService.zone.findMany.mockResolvedValue([]);

      // Act
      const result = await analyticsService.getRealtimeAnalytics(ongoingFestival.id, query);

      // Assert
      const capacityAlert = result.alerts.find(a => a.type === 'CAPACITY_CRITICAL');
      expect(capacityAlert).toBeDefined();
    });

    it('should generate zone overcrowded alert', async () => {
      // Arrange
      setupRealtimeMocks();
      mockPrismaService.zone.findMany.mockResolvedValue([
        { id: 'zone1', name: 'VIP Area', currentOccupancy: 900, capacity: 1000, isActive: true },
      ]);

      // Act
      const result = await analyticsService.getRealtimeAnalytics(ongoingFestival.id, query);

      // Assert
      const zoneAlert = result.alerts.find(a => a.type === 'ZONE_OVERCROWDED');
      expect(zoneAlert).toBeDefined();
      expect(zoneAlert?.zone).toBe('VIP Area');
    });

    it('should use custom thresholds when provided', async () => {
      // Arrange
      const thresholds: AlertThresholdsDto = {
        capacityWarning: 70,
        capacityCritical: 90,
        zoneCapacityWarning: 80,
      };
      const festivalAt75Percent = {
        ...ongoingFestival,
        currentAttendees: 7500,
        maxCapacity: 10000,
      };
      mockPrismaService.festival.findUnique.mockResolvedValue(festivalAt75Percent);
      mockPrismaService.zoneAccessLog.findMany.mockResolvedValue([]);
      mockPrismaService.ticket.aggregate.mockResolvedValue({
        _count: 0,
        _sum: { purchasePrice: null },
      });
      mockPrismaService.cashlessTransaction.groupBy.mockResolvedValue([]);
      mockPrismaService.vendorOrder.count.mockResolvedValue(0);
      mockPrismaService.zone.findMany.mockResolvedValue([]);

      // Act
      const result = await analyticsService.getRealtimeAnalytics(ongoingFestival.id, query, thresholds);

      // Assert
      // With custom threshold of 70%, 75% should trigger warning
      const capacityAlert = result.alerts.find(a => a.type === 'CAPACITY_WARNING');
      expect(capacityAlert).toBeDefined();
    });

    it('should include active zones when requested', async () => {
      // Arrange
      setupRealtimeMocks();
      mockPrismaService.zone.findMany.mockResolvedValue([
        { id: 'zone1', name: 'Main Stage', currentOccupancy: 2000, capacity: 5000, isActive: true },
        { id: 'zone2', name: 'VIP Area', currentOccupancy: 200, capacity: 500, isActive: true },
      ]);

      // Act
      const result = await analyticsService.getRealtimeAnalytics(ongoingFestival.id, query);

      // Assert
      expect(result.live.activeZones).toBeDefined();
      expect(result.live.activeZones.length).toBe(2);
    });

    it('should not include zones when not requested', async () => {
      // Arrange
      const queryWithoutZones: RealtimeQueryDto = { ...query, includeZones: false };
      setupRealtimeMocks();

      // Act
      const result = await analyticsService.getRealtimeAnalytics(ongoingFestival.id, queryWithoutZones);

      // Assert
      expect(result.live.activeZones).toEqual([]);
    });
  });

  // ==========================================================================
  // invalidateCache Tests
  // ==========================================================================

  describe('invalidateCache', () => {
    it('should delete all analytics cache patterns for a festival', async () => {
      // Act
      await analyticsService.invalidateCache(ongoingFestival.id);

      // Assert
      expect(mockCacheService.deletePattern).toHaveBeenCalledTimes(7);
      expect(mockCacheService.deletePattern).toHaveBeenCalledWith(
        `analytics:dashboard:${ongoingFestival.id}*`,
      );
      expect(mockCacheService.deletePattern).toHaveBeenCalledWith(
        `analytics:sales:${ongoingFestival.id}*`,
      );
      expect(mockCacheService.deletePattern).toHaveBeenCalledWith(
        `analytics:cashless:${ongoingFestival.id}*`,
      );
      expect(mockCacheService.deletePattern).toHaveBeenCalledWith(
        `analytics:attendance:${ongoingFestival.id}*`,
      );
      expect(mockCacheService.deletePattern).toHaveBeenCalledWith(
        `analytics:zones:${ongoingFestival.id}*`,
      );
      expect(mockCacheService.deletePattern).toHaveBeenCalledWith(
        `analytics:vendors:${ongoingFestival.id}*`,
      );
      expect(mockCacheService.deletePattern).toHaveBeenCalledWith(
        `analytics:realtime:${ongoingFestival.id}*`,
      );
    });
  });

  // ==========================================================================
  // Date Range Filtering Tests
  // ==========================================================================

  describe('Date Range Filtering', () => {
    beforeEach(() => {
      mockCacheService.get.mockResolvedValue(null);
    });

    it('should use festival dates when no date range provided', async () => {
      // Arrange
      const queryWithoutDates: DashboardQueryDto = {};
      setupDashboardMocks();

      // Act
      await analyticsService.getDashboardKPIs(ongoingFestival.id, queryWithoutDates);

      // Assert
      expect(mockPrismaService.ticket.aggregate).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: { in: ['SOLD', 'USED'] },
          }),
        }),
      );
    });

    it('should use provided date range when specified', async () => {
      // Arrange
      const customStartDate = new Date('2024-06-01');
      const customEndDate = new Date('2024-06-30');
      const queryWithDates: DashboardQueryDto = {
        startDate: customStartDate.toISOString(),
        endDate: customEndDate.toISOString(),
      };
      setupDashboardMocks();

      // Act
      await analyticsService.getDashboardKPIs(ongoingFestival.id, queryWithDates);

      // Assert - Revenue metrics should use the provided date range
      expect(mockPrismaService.ticket.aggregate).toHaveBeenCalled();
    });
  });

  // ==========================================================================
  // Edge Cases Tests
  // ==========================================================================

  describe('Edge Cases', () => {
    beforeEach(() => {
      mockCacheService.get.mockResolvedValue(null);
    });

    it('should handle festival with no tickets', async () => {
      // Arrange
      const festivalNoTickets = {
        ...ongoingFestival,
        ticketCategories: [],
      };
      setupDashboardMocks(festivalNoTickets);

      // Act
      const result = await analyticsService.getDashboardKPIs(ongoingFestival.id, {});

      // Assert
      expect(result.ticketing.totalSold).toBe(0);
      expect(result.ticketing.soldPercentage).toBe(0);
      expect(result.revenue.totalRevenue).toBe(0);
    });

    it('should handle festival with no cashless activity', async () => {
      // Arrange
      setupCashlessMocks();

      // Act
      const result = await analyticsService.getCashlessAnalytics(ongoingFestival.id, {});

      // Assert
      expect(result.summary.totalTopups).toBe(0);
      expect(result.summary.totalPayments).toBe(0);
      expect(result.summary.averageBalance).toBe(0);
    });

    it('should handle festival with no zones', async () => {
      // Arrange
      setupZoneMocks();
      mockPrismaService.zone.findMany.mockResolvedValue([]);

      // Act
      const result = await analyticsService.getZoneAnalytics(ongoingFestival.id, {
        includeHeatmap: false,
        includeTransitions: false,
      });

      // Assert
      expect(result.zones).toEqual([]);
      expect(result.heatmapData).toEqual([]);
      expect(result.zoneTransitions).toEqual([]);
    });

    it('should handle festival with no vendors', async () => {
      // Arrange
      setupVendorMocks();

      // Act
      const result = await analyticsService.getVendorAnalytics(ongoingFestival.id, {});

      // Assert
      expect(result.summary.totalVendors).toBe(0);
      expect(result.summary.totalOrders).toBe(0);
      expect(result.topVendors).toEqual([]);
    });

    it('should handle null decimal values gracefully', async () => {
      // Arrange
      const festivalNoData = {
        ...ongoingFestival,
        ticketCategories: [],
      };
      setupDashboardMocks(festivalNoData);

      // Act
      const result = await analyticsService.getDashboardKPIs(ongoingFestival.id, {});

      // Assert
      expect(result.revenue.ticketRevenue).toBe(0);
      expect(result.revenue.cashlessRevenue).toBe(0);
      expect(result.revenue.vendorRevenue).toBe(0);
      expect(result.revenue.totalRevenue).toBe(0);
    });
  });
});
