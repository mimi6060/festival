/**
 * Advanced Metrics Service Unit Tests
 *
 * Comprehensive tests for advanced analytics metrics including:
 * - Revenue metrics
 * - Customer metrics
 * - Performance metrics
 * - Fraud metrics
 * - Growth metrics
 * - Forecast metrics
 * - Staff metrics
 * - Environmental metrics
 * - Security metrics
 * - Comprehensive analytics
 */

import { Test, TestingModule } from '@nestjs/testing';
import { AdvancedMetricsService } from './advanced-metrics.service';
import { PrismaService } from '../../prisma/prisma.service';
import { CacheService } from '../../cache/cache.service';
import { Decimal } from '@prisma/client/runtime/library';

describe('AdvancedMetricsService', () => {
  let service: AdvancedMetricsService;

  const mockPrismaService = {
    ticket: {
      aggregate: jest.fn(),
      groupBy: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
    },
    cashlessTransaction: {
      aggregate: jest.fn(),
      groupBy: jest.fn(),
      count: jest.fn(),
    },
    vendorOrder: {
      aggregate: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
    },
    campingReservation: {
      aggregate: jest.fn(),
    },
    payment: {
      aggregate: jest.fn(),
      count: jest.fn(),
    },
    zoneAccessLog: {
      aggregate: jest.fn(),
      groupBy: jest.fn(),
      count: jest.fn(),
    },
    supportTicket: {
      findMany: jest.fn(),
      count: jest.fn(),
    },
    staffMember: {
      findMany: jest.fn(),
      groupBy: jest.fn(),
      count: jest.fn(),
    },
    staffShift: {
      findMany: jest.fn(),
    },
    festival: {
      findUnique: jest.fn(),
    },
    zone: {
      findMany: jest.fn(),
    },
    user: {
      count: jest.fn(),
    },
  };

  const mockCacheService = {
    get: jest.fn(),
    set: jest.fn(),
    delete: jest.fn(),
  };

  const festivalId = 'festival-uuid-test';
  const startDate = new Date('2024-07-01T00:00:00Z');
  const endDate = new Date('2024-07-07T23:59:59Z');

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdvancedMetricsService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: CacheService, useValue: mockCacheService },
      ],
    }).compile();

    service = module.get<AdvancedMetricsService>(AdvancedMetricsService);
  });

  function createDecimal(value: number): Decimal {
    return new Decimal(value);
  }

  // ==========================================================================
  // getRevenueMetrics Tests
  // ==========================================================================

  describe('getRevenueMetrics', () => {
    beforeEach(() => {
      mockCacheService.get.mockResolvedValue(null);
    });

    function setupRevenueMetricsMocks() {
      mockPrismaService.ticket.aggregate.mockResolvedValue({
        _sum: { purchasePrice: createDecimal(50000) },
        _count: 500,
      });
      mockPrismaService.cashlessTransaction.aggregate.mockResolvedValue({
        _sum: { amount: createDecimal(20000) },
      });
      mockPrismaService.vendorOrder.aggregate.mockResolvedValue({
        _sum: { totalAmount: createDecimal(15000), commissionAmount: createDecimal(1500) },
      });
      mockPrismaService.campingReservation.aggregate.mockResolvedValue({
        _sum: { totalPrice: createDecimal(10000) },
      });
      mockPrismaService.payment.aggregate.mockResolvedValue({
        _sum: { amount: createDecimal(2000) },
        _count: 10,
      });
    }

    it('should return revenue metrics with correct breakdown', async () => {
      setupRevenueMetricsMocks();

      const result = await service.getRevenueMetrics(festivalId, startDate, endDate);

      expect(result).toBeDefined();
      expect(result.grossRevenue).toBe(95000); // 50000 + 20000 + 15000 + 10000
      expect(result.netRevenue).toBe(93000); // 95000 - 2000 refunds
      expect(result.refundedAmount).toBe(2000);
      expect(result.refundCount).toBe(10);
      expect(result.breakdown).toBeDefined();
      expect(result.breakdown.tickets.amount).toBe(50000);
      expect(result.breakdown.cashless.amount).toBe(20000);
      expect(result.breakdown.vendors.amount).toBe(15000);
      expect(result.breakdown.camping.amount).toBe(10000);
    });

    it('should return cached data if available', async () => {
      const cachedData = {
        grossRevenue: 100000,
        netRevenue: 95000,
        refundedAmount: 5000,
        refundCount: 20,
        platformFees: 1000,
        breakdown: {
          tickets: { amount: 60000, percentage: 60, count: 600 },
          cashless: { amount: 20000, percentage: 20 },
          vendors: { amount: 15000, percentage: 15, commission: 1500 },
          camping: { amount: 5000, percentage: 5 },
        },
        averageRevenuePerAttendee: 100,
        profitMargin: 90,
      };
      mockCacheService.get.mockResolvedValue(cachedData);

      const result = await service.getRevenueMetrics(festivalId, startDate, endDate);

      expect(result).toEqual(cachedData);
      expect(mockPrismaService.ticket.aggregate).not.toHaveBeenCalled();
    });

    it('should calculate percentages correctly', async () => {
      setupRevenueMetricsMocks();

      const result = await service.getRevenueMetrics(festivalId, startDate, endDate);

      // Total gross revenue is 95000
      expect(result.breakdown.tickets.percentage).toBeCloseTo((50000 / 95000) * 100, 1);
      expect(result.breakdown.cashless.percentage).toBeCloseTo((20000 / 95000) * 100, 1);
      expect(result.breakdown.vendors.percentage).toBeCloseTo((15000 / 95000) * 100, 1);
      expect(result.breakdown.camping.percentage).toBeCloseTo((10000 / 95000) * 100, 1);
    });

    it('should handle zero revenue gracefully', async () => {
      mockPrismaService.ticket.aggregate.mockResolvedValue({
        _sum: { purchasePrice: null },
        _count: 0,
      });
      mockPrismaService.cashlessTransaction.aggregate.mockResolvedValue({
        _sum: { amount: null },
      });
      mockPrismaService.vendorOrder.aggregate.mockResolvedValue({
        _sum: { totalAmount: null, commissionAmount: null },
      });
      mockPrismaService.campingReservation.aggregate.mockResolvedValue({
        _sum: { totalPrice: null },
      });
      mockPrismaService.payment.aggregate.mockResolvedValue({
        _sum: { amount: null },
        _count: 0,
      });

      const result = await service.getRevenueMetrics(festivalId, startDate, endDate);

      expect(result.grossRevenue).toBe(0);
      expect(result.netRevenue).toBe(0);
      expect(result.breakdown.tickets.percentage).toBe(0);
    });

    it('should cache the result after computation', async () => {
      setupRevenueMetricsMocks();

      await service.getRevenueMetrics(festivalId, startDate, endDate);

      expect(mockCacheService.set).toHaveBeenCalledWith(
        expect.stringContaining(`analytics:revenue:${festivalId}`),
        expect.any(Object),
        120,
      );
    });

    it('should calculate profit margin correctly', async () => {
      setupRevenueMetricsMocks();

      const result = await service.getRevenueMetrics(festivalId, startDate, endDate);

      // Profit margin = (netRevenue - platformFees) / grossRevenue * 100
      // = (93000 - 1500) / 95000 * 100 = 96.31%
      expect(result.profitMargin).toBeCloseTo(96.31, 1);
    });
  });

  // ==========================================================================
  // getCustomerMetrics Tests
  // ==========================================================================

  describe('getCustomerMetrics', () => {
    beforeEach(() => {
      mockCacheService.get.mockResolvedValue(null);
    });

    function setupCustomerMetricsMocks() {
      mockPrismaService.ticket.findMany.mockResolvedValue([
        { userId: 'user1' },
        { userId: 'user2' },
        { userId: 'user3' },
      ]);
      mockPrismaService.ticket.groupBy
        .mockResolvedValueOnce([
          { userId: 'user1', _count: 2 },
        ]) // repeat customers
        .mockResolvedValueOnce([
          { userId: 'user1', _min: { createdAt: new Date('2024-07-01') } },
          { userId: 'user2', _min: { createdAt: new Date('2024-07-02') } },
          { userId: 'user3', _min: { createdAt: new Date('2024-06-01') } },
        ]); // first purchases
      mockPrismaService.ticket.aggregate.mockResolvedValue({
        _sum: { purchasePrice: createDecimal(3000) },
        _count: 5,
      });
      mockPrismaService.cashlessTransaction.groupBy.mockResolvedValue([
        { accountId: 'acc1', _sum: { amount: createDecimal(100) }, _count: 5 },
        { accountId: 'acc2', _sum: { amount: createDecimal(150) }, _count: 3 },
      ]);
      mockPrismaService.ticket.count.mockResolvedValue(10);
    }

    it('should return customer metrics', async () => {
      setupCustomerMetricsMocks();

      const result = await service.getCustomerMetrics(festivalId, startDate, endDate);

      expect(result).toBeDefined();
      expect(result.totalUniqueCustomers).toBe(3);
      expect(result.newCustomers).toBeGreaterThanOrEqual(0);
      expect(result.repeatPurchaseRate).toBeDefined();
      expect(result.averageSpendingPerCustomer).toBeDefined();
    });

    it('should return cached data if available', async () => {
      const cachedData = {
        totalUniqueCustomers: 100,
        newCustomers: 50,
        returningCustomers: 50,
        repeatPurchaseRate: 30,
        averageSpendingPerCustomer: 150,
        averageTicketsPerCustomer: 2,
        averageCashlessSpending: 75,
        customerLifetimeValue: 300,
        segmentation: { vip: 20, standard: 70, earlyBird: 10 },
        acquisitionChannels: [],
      };
      mockCacheService.get.mockResolvedValue(cachedData);

      const result = await service.getCustomerMetrics(festivalId, startDate, endDate);

      expect(result).toEqual(cachedData);
      expect(mockPrismaService.ticket.findMany).not.toHaveBeenCalled();
    });

    it('should calculate average spending per customer correctly', async () => {
      setupCustomerMetricsMocks();

      const result = await service.getCustomerMetrics(festivalId, startDate, endDate);

      // Total revenue 3000, 3 unique customers = 1000 per customer
      expect(result.averageSpendingPerCustomer).toBe(1000);
    });

    it('should handle zero customers gracefully', async () => {
      mockPrismaService.ticket.findMany.mockResolvedValue([]);
      mockPrismaService.ticket.groupBy.mockResolvedValue([]);
      mockPrismaService.ticket.aggregate.mockResolvedValue({
        _sum: { purchasePrice: null },
        _count: 0,
      });
      mockPrismaService.cashlessTransaction.groupBy.mockResolvedValue([]);
      mockPrismaService.ticket.count.mockResolvedValue(0);

      const result = await service.getCustomerMetrics(festivalId, startDate, endDate);

      expect(result.totalUniqueCustomers).toBe(0);
      expect(result.averageSpendingPerCustomer).toBe(0);
      expect(result.repeatPurchaseRate).toBe(0);
    });
  });

  // ==========================================================================
  // getPerformanceMetrics Tests
  // ==========================================================================

  describe('getPerformanceMetrics', () => {
    beforeEach(() => {
      mockCacheService.get.mockResolvedValue(null);
    });

    function setupPerformanceMetricsMocks() {
      mockPrismaService.zoneAccessLog.aggregate.mockResolvedValue({
        _count: 5000,
      });
      mockPrismaService.vendorOrder.findMany.mockResolvedValue([
        { createdAt: new Date('2024-07-01T10:00:00Z'), updatedAt: new Date('2024-07-01T10:15:00Z') },
        { createdAt: new Date('2024-07-01T11:00:00Z'), updatedAt: new Date('2024-07-01T11:10:00Z') },
      ]);
      mockPrismaService.cashlessTransaction.groupBy.mockResolvedValue([
        { type: 'TOPUP', _count: 50 },
        { type: 'PAYMENT', _count: 100 },
      ]);
      mockPrismaService.supportTicket.findMany.mockResolvedValue([
        { status: 'RESOLVED', priority: 'HIGH', createdAt: new Date('2024-07-01T10:00:00Z'), updatedAt: new Date('2024-07-01T12:00:00Z') },
        { status: 'OPEN', priority: 'MEDIUM', createdAt: new Date('2024-07-01T11:00:00Z'), updatedAt: new Date('2024-07-01T11:30:00Z') },
        { status: 'CLOSED', priority: 'LOW', createdAt: new Date('2024-07-01T12:00:00Z'), updatedAt: new Date('2024-07-01T14:00:00Z') },
      ]);
      mockPrismaService.zoneAccessLog.groupBy.mockResolvedValue([
        { timestamp: new Date('2024-07-01T10:00:00Z'), _count: 50 },
        { timestamp: new Date('2024-07-01T11:00:00Z'), _count: 75 },
      ]);
    }

    it('should return performance metrics', async () => {
      setupPerformanceMetricsMocks();

      const result = await service.getPerformanceMetrics(festivalId, startDate, endDate);

      expect(result).toBeDefined();
      expect(result.ticketScanThroughput).toBe(5000);
      expect(result.averageOrderFulfillmentTime).toBeDefined();
      expect(result.cashlessSuccessRate).toBeDefined();
      expect(result.supportTicketResolutionTime).toBeDefined();
      expect(result.supportTicketsByPriority).toBeDefined();
    });

    it('should return cached data if available', async () => {
      const cachedData = {
        ticketScanThroughput: 6000,
        averageOrderFulfillmentTime: 10,
        cashlessSuccessRate: 99.5,
        supportTicketResolutionTime: 2,
        supportTicketsByPriority: { HIGH: 10, MEDIUM: 20, LOW: 5 },
        averageQueueTime: 5,
        peakQueueTime: 15,
        systemUptime: 99.9,
        errorRate: 0.1,
      };
      mockCacheService.get.mockResolvedValue(cachedData);

      const result = await service.getPerformanceMetrics(festivalId, startDate, endDate);

      expect(result).toEqual(cachedData);
    });

    it('should calculate average order fulfillment time correctly', async () => {
      setupPerformanceMetricsMocks();

      const result = await service.getPerformanceMetrics(festivalId, startDate, endDate);

      // Order 1: 15 minutes, Order 2: 10 minutes, Average: 12.5 minutes
      expect(result.averageOrderFulfillmentTime).toBeCloseTo(12.5, 1);
    });

    it('should group support tickets by priority correctly', async () => {
      setupPerformanceMetricsMocks();

      const result = await service.getPerformanceMetrics(festivalId, startDate, endDate);

      expect(result.supportTicketsByPriority.HIGH).toBe(1);
      expect(result.supportTicketsByPriority.MEDIUM).toBe(1);
      expect(result.supportTicketsByPriority.LOW).toBe(1);
    });
  });

  // ==========================================================================
  // getFraudMetrics Tests
  // ==========================================================================

  describe('getFraudMetrics', () => {
    beforeEach(() => {
      mockCacheService.get.mockResolvedValue(null);
    });

    function setupFraudMetricsMocks() {
      mockPrismaService.zoneAccessLog.groupBy.mockResolvedValue([
        { ticketId: 'ticket1', _count: 3 },
        { ticketId: 'ticket2', _count: 2 },
      ]);
      mockPrismaService.cashlessTransaction.groupBy.mockResolvedValue([
        { accountId: 'acc1', _count: 60, _sum: { amount: createDecimal(5000) } },
      ]);
      mockPrismaService.payment.count.mockResolvedValue(5);
      mockPrismaService.user.count.mockResolvedValue(3);
    }

    it('should return fraud metrics', async () => {
      setupFraudMetricsMocks();

      const result = await service.getFraudMetrics(festivalId, startDate, endDate);

      expect(result).toBeDefined();
      expect(result.duplicateScanAttempts).toBe(2);
      expect(result.suspiciousTransactions).toBeDefined();
      expect(result.chargebackCount).toBe(5);
      expect(result.blockedUsers).toBe(3);
      expect(result.riskScore).toBeDefined();
    });

    it('should return cached data if available', async () => {
      const cachedData = {
        duplicateScanAttempts: 10,
        suspiciousTransactions: 5,
        suspiciousTransactionAmount: 1000,
        chargebackCount: 3,
        chargebackRate: 0.5,
        blockedUsers: 2,
        riskScore: 25,
        fraudIndicators: [],
      };
      mockCacheService.get.mockResolvedValue(cachedData);

      const result = await service.getFraudMetrics(festivalId, startDate, endDate);

      expect(result).toEqual(cachedData);
    });

    it('should calculate risk score based on fraud indicators', async () => {
      setupFraudMetricsMocks();

      const result = await service.getFraudMetrics(festivalId, startDate, endDate);

      // Risk score should be between 0 and 100
      expect(result.riskScore).toBeGreaterThanOrEqual(0);
      expect(result.riskScore).toBeLessThanOrEqual(100);
    });

    it('should handle no fraud activity gracefully', async () => {
      mockPrismaService.zoneAccessLog.groupBy.mockResolvedValue([]);
      mockPrismaService.cashlessTransaction.groupBy.mockResolvedValue([]);
      mockPrismaService.payment.count.mockResolvedValue(0);
      mockPrismaService.user.count.mockResolvedValue(0);

      const result = await service.getFraudMetrics(festivalId, startDate, endDate);

      expect(result.duplicateScanAttempts).toBe(0);
      expect(result.chargebackCount).toBe(0);
      expect(result.blockedUsers).toBe(0);
      expect(result.riskScore).toBe(0);
    });
  });

  // ==========================================================================
  // getGrowthMetrics Tests
  // ==========================================================================

  describe('getGrowthMetrics', () => {
    beforeEach(() => {
      mockCacheService.get.mockResolvedValue(null);
    });

    function setupGrowthMetricsMocks() {
      mockPrismaService.ticket.count
        .mockResolvedValueOnce(100) // current period sales
        .mockResolvedValueOnce(80); // previous period sales
      mockPrismaService.ticket.aggregate
        .mockResolvedValueOnce({ _sum: { purchasePrice: createDecimal(10000) } }) // current revenue
        .mockResolvedValueOnce({ _sum: { purchasePrice: createDecimal(8000) } }); // previous revenue
      mockPrismaService.ticket.findMany.mockResolvedValue([
        { userId: 'user1', createdAt: new Date('2024-07-01'), purchasePrice: createDecimal(100) },
        { userId: 'user2', createdAt: new Date('2024-07-02'), purchasePrice: createDecimal(100) },
      ]);
      mockPrismaService.ticket.groupBy.mockResolvedValue([
        { createdAt: new Date('2024-07-01'), _count: 50 },
        { createdAt: new Date('2024-07-02'), _count: 50 },
      ]);
    }

    it('should return growth metrics', async () => {
      setupGrowthMetricsMocks();

      const result = await service.getGrowthMetrics(festivalId, startDate, endDate);

      expect(result).toBeDefined();
      expect(result.salesGrowth).toBeDefined();
      expect(result.revenueGrowth).toBeDefined();
      expect(result.customerGrowth).toBeDefined();
      expect(result.projectedRevenue).toBeDefined();
      expect(result.projectedAttendance).toBeDefined();
    });

    it('should return cached data if available', async () => {
      const cachedData = {
        salesGrowth: 25,
        revenueGrowth: 30,
        customerGrowth: 20,
        dailyGrowthRate: [],
        weeklyTrends: [],
        projectedRevenue: 15000,
        projectedAttendance: 120,
      };
      mockCacheService.get.mockResolvedValue(cachedData);

      const result = await service.getGrowthMetrics(festivalId, startDate, endDate);

      expect(result).toEqual(cachedData);
    });

    it('should calculate sales growth correctly', async () => {
      setupGrowthMetricsMocks();

      const result = await service.getGrowthMetrics(festivalId, startDate, endDate);

      // 100 current vs 80 previous = 25% growth
      expect(result.salesGrowth).toBe(25);
    });

    it('should calculate revenue growth correctly', async () => {
      setupGrowthMetricsMocks();

      const result = await service.getGrowthMetrics(festivalId, startDate, endDate);

      // 10000 current vs 8000 previous = 25% growth
      expect(result.revenueGrowth).toBe(25);
    });

    it('should handle zero previous period gracefully', async () => {
      mockPrismaService.ticket.count
        .mockResolvedValueOnce(100) // current
        .mockResolvedValueOnce(0); // previous
      mockPrismaService.ticket.aggregate
        .mockResolvedValueOnce({ _sum: { purchasePrice: createDecimal(10000) } })
        .mockResolvedValueOnce({ _sum: { purchasePrice: null } });
      mockPrismaService.ticket.findMany.mockResolvedValue([]);
      mockPrismaService.ticket.groupBy.mockResolvedValue([]);

      const result = await service.getGrowthMetrics(festivalId, startDate, endDate);

      expect(result.salesGrowth).toBe(0);
      expect(result.revenueGrowth).toBe(0);
    });
  });

  // ==========================================================================
  // getForecastMetrics Tests
  // ==========================================================================

  describe('getForecastMetrics', () => {
    beforeEach(() => {
      mockCacheService.get.mockResolvedValue(null);
    });

    function setupForecastMetricsMocks() {
      mockPrismaService.ticket.groupBy.mockResolvedValue([
        { createdAt: new Date('2024-06-15'), _count: 50 },
        { createdAt: new Date('2024-06-20'), _count: 60 },
        { createdAt: new Date('2024-06-25'), _count: 70 },
        { createdAt: new Date('2024-06-30'), _count: 80 },
      ]);
      mockPrismaService.ticket.findMany.mockResolvedValue([
        { createdAt: new Date('2024-06-15'), purchasePrice: createDecimal(5000) },
        { createdAt: new Date('2024-06-20'), purchasePrice: createDecimal(6000) },
        { createdAt: new Date('2024-06-25'), purchasePrice: createDecimal(7000) },
        { createdAt: new Date('2024-06-30'), purchasePrice: createDecimal(8000) },
      ]);
      mockPrismaService.zoneAccessLog.groupBy.mockResolvedValue([
        { timestamp: new Date('2024-06-15'), _count: 1000 },
        { timestamp: new Date('2024-06-20'), _count: 1200 },
        { timestamp: new Date('2024-06-25'), _count: 1400 },
        { timestamp: new Date('2024-06-30'), _count: 1600 },
      ]);
    }

    it('should return forecast metrics', async () => {
      setupForecastMetricsMocks();

      const result = await service.getForecastMetrics(festivalId, 7);

      expect(result).toBeDefined();
      expect(result.predictedSales).toBeDefined();
      expect(result.predictedSales).toHaveLength(7);
      expect(result.predictedRevenue).toBeDefined();
      expect(result.predictedAttendance).toBeDefined();
      expect(result.confidenceLevel).toBeDefined();
      expect(result.peakDayPrediction).toBeInstanceOf(Date);
    });

    it('should return cached data if available', async () => {
      const cachedData = {
        predictedSales: [90, 95, 100, 105, 110, 115, 120],
        predictedRevenue: [9000, 9500, 10000, 10500, 11000, 11500, 12000],
        predictedAttendance: [1800, 2000, 2200, 2400, 2600, 2800, 3000],
        confidenceLevel: 75,
        peakDayPrediction: new Date('2024-07-07'),
        demandForecast: [],
        staffingRecommendation: [],
      };
      mockCacheService.get.mockResolvedValue(cachedData);

      const result = await service.getForecastMetrics(festivalId, 7);

      expect(result).toEqual(cachedData);
    });

    it('should generate predictions for the requested number of days', async () => {
      setupForecastMetricsMocks();

      const daysAhead = 14;
      const result = await service.getForecastMetrics(festivalId, daysAhead);

      expect(result.predictedSales).toHaveLength(daysAhead);
      expect(result.predictedRevenue).toHaveLength(daysAhead);
      expect(result.predictedAttendance).toHaveLength(daysAhead);
    });

    it('should calculate confidence level based on data variance', async () => {
      setupForecastMetricsMocks();

      const result = await service.getForecastMetrics(festivalId, 7);

      expect(result.confidenceLevel).toBeGreaterThanOrEqual(0);
      expect(result.confidenceLevel).toBeLessThanOrEqual(100);
    });
  });

  // ==========================================================================
  // getStaffMetrics Tests
  // ==========================================================================

  describe('getStaffMetrics', () => {
    beforeEach(() => {
      mockCacheService.get.mockResolvedValue(null);
    });

    function setupStaffMetricsMocks() {
      mockPrismaService.staffMember.findMany.mockResolvedValue([
        { id: 'staff1', isActive: true, shifts: [{ startTime: startDate, endTime: endDate }] },
        { id: 'staff2', isActive: true, shifts: [] },
        { id: 'staff3', isActive: false, shifts: [] },
      ]);
      mockPrismaService.staffShift.findMany
        .mockResolvedValueOnce([
          { startTime: new Date('2024-07-01T08:00:00Z'), endTime: new Date('2024-07-01T16:00:00Z') },
          { startTime: new Date('2024-07-02T08:00:00Z'), endTime: new Date('2024-07-02T16:00:00Z') },
        ])
        .mockResolvedValueOnce([
          {
            startTime: new Date('2024-07-01T08:00:00Z'),
            endTime: new Date('2024-07-01T16:00:00Z'),
            actualStartTime: new Date('2024-07-01T08:15:00Z'),
            actualEndTime: new Date('2024-07-01T16:15:00Z'),
          },
        ]);
      mockPrismaService.staffMember.groupBy.mockResolvedValue([
        { role: 'SECURITY', _count: 10 },
        { role: 'CASHIER', _count: 5 },
      ]);
      mockPrismaService.zone.findMany.mockResolvedValue([
        {
          name: 'Main Stage',
          staffShifts: [
            {
              memberId: 'staff1',
              startTime: new Date('2024-07-01T08:00:00Z'),
              endTime: new Date('2024-07-01T16:00:00Z'),
              member: { id: 'staff1' },
            },
          ],
        },
      ]);
    }

    it('should return staff metrics', async () => {
      setupStaffMetricsMocks();

      const result = await service.getStaffMetrics(festivalId, startDate, endDate);

      expect(result).toBeDefined();
      expect(result.totalStaff).toBe(3);
      expect(result.activeStaff).toBe(2);
      expect(result.totalScheduledHours).toBeDefined();
      expect(result.attendanceRate).toBeDefined();
    });

    it('should return cached data if available', async () => {
      const cachedData = {
        totalStaff: 50,
        activeStaff: 45,
        totalScheduledHours: 400,
        totalWorkedHours: 380,
        attendanceRate: 95,
        averageHoursPerStaff: 8,
        overtimeHours: 20,
        staffByRole: [],
        performanceByZone: [],
      };
      mockCacheService.get.mockResolvedValue(cachedData);

      const result = await service.getStaffMetrics(festivalId, startDate, endDate);

      expect(result).toEqual(cachedData);
    });

    it('should calculate attendance rate correctly', async () => {
      setupStaffMetricsMocks();

      const result = await service.getStaffMetrics(festivalId, startDate, endDate);

      // Attendance rate = totalWorkedHours / totalScheduledHours * 100
      expect(result.attendanceRate).toBeGreaterThanOrEqual(0);
      expect(result.attendanceRate).toBeLessThanOrEqual(100);
    });

    it('should handle no staff gracefully', async () => {
      mockPrismaService.staffMember.findMany.mockResolvedValue([]);
      mockPrismaService.staffShift.findMany.mockResolvedValue([]);
      mockPrismaService.staffMember.groupBy.mockResolvedValue([]);
      mockPrismaService.zone.findMany.mockResolvedValue([]);

      const result = await service.getStaffMetrics(festivalId, startDate, endDate);

      expect(result.totalStaff).toBe(0);
      expect(result.activeStaff).toBe(0);
      expect(result.attendanceRate).toBe(0);
    });
  });

  // ==========================================================================
  // getEnvironmentalMetrics Tests
  // ==========================================================================

  describe('getEnvironmentalMetrics', () => {
    beforeEach(() => {
      mockCacheService.get.mockResolvedValue(null);
    });

    function setupEnvironmentalMetricsMocks() {
      mockPrismaService.ticket.count
        .mockResolvedValueOnce(1000) // attendee count
        .mockResolvedValueOnce(900)  // digital tickets
        .mockResolvedValueOnce(100); // paper tickets
      mockPrismaService.vendorOrder.count.mockResolvedValue(500);
    }

    it('should return environmental metrics', async () => {
      setupEnvironmentalMetricsMocks();

      const result = await service.getEnvironmentalMetrics(festivalId, startDate, endDate);

      expect(result).toBeDefined();
      expect(result.estimatedCarbonFootprint).toBeDefined();
      expect(result.digitalTicketRate).toBeDefined();
      expect(result.paperSaved).toBeDefined();
      expect(result.sustainabilityScore).toBeDefined();
    });

    it('should return cached data if available', async () => {
      const cachedData = {
        estimatedCarbonFootprint: 15000,
        carbonPerAttendee: 15,
        digitalTicketRate: 90,
        paperSaved: 9,
        cashlessRate: 95,
        wasteEstimate: 500,
        sustainabilityScore: 85,
      };
      mockCacheService.get.mockResolvedValue(cachedData);

      const result = await service.getEnvironmentalMetrics(festivalId, startDate, endDate);

      expect(result).toEqual(cachedData);
    });

    it('should calculate digital ticket rate correctly', async () => {
      setupEnvironmentalMetricsMocks();

      const result = await service.getEnvironmentalMetrics(festivalId, startDate, endDate);

      // 900 digital out of 1000 total = 90%
      expect(result.digitalTicketRate).toBe(90);
    });

    it('should estimate carbon footprint based on attendees', async () => {
      setupEnvironmentalMetricsMocks();

      const result = await service.getEnvironmentalMetrics(festivalId, startDate, endDate);

      // 1000 attendees * 15 kg CO2 per attendee = 15000
      expect(result.estimatedCarbonFootprint).toBe(15000);
      expect(result.carbonPerAttendee).toBe(15);
    });

    it('should calculate sustainability score', async () => {
      setupEnvironmentalMetricsMocks();

      const result = await service.getEnvironmentalMetrics(festivalId, startDate, endDate);

      expect(result.sustainabilityScore).toBeGreaterThanOrEqual(0);
      expect(result.sustainabilityScore).toBeLessThanOrEqual(100);
    });
  });

  // ==========================================================================
  // getSecurityMetrics Tests
  // ==========================================================================

  describe('getSecurityMetrics', () => {
    beforeEach(() => {
      mockCacheService.get.mockResolvedValue(null);
    });

    function setupSecurityMetricsMocks() {
      mockPrismaService.zoneAccessLog.count.mockResolvedValue(50);
      mockPrismaService.supportTicket.count.mockResolvedValue(5);
      mockPrismaService.staffMember.count.mockResolvedValue(20);
      mockPrismaService.festival.findUnique.mockResolvedValue({
        currentAttendees: 5000,
      });
    }

    it('should return security metrics', async () => {
      setupSecurityMetricsMocks();

      const result = await service.getSecurityMetrics(festivalId, startDate, endDate);

      expect(result).toBeDefined();
      expect(result.totalAccessDenials).toBe(50);
      expect(result.securityIncidents).toBe(5);
      expect(result.securityStaffCount).toBe(20);
      expect(result.securityToAttendeeRatio).toBeDefined();
    });

    it('should return cached data if available', async () => {
      const cachedData = {
        totalAccessDenials: 100,
        securityIncidents: 10,
        incidentResponseTime: 3,
        evacuationDrillCount: 2,
        securityStaffCount: 30,
        securityToAttendeeRatio: 200,
        zoneViolations: 50,
        emergencyResponseReadiness: 95,
      };
      mockCacheService.get.mockResolvedValue(cachedData);

      const result = await service.getSecurityMetrics(festivalId, startDate, endDate);

      expect(result).toEqual(cachedData);
    });

    it('should calculate security to attendee ratio', async () => {
      setupSecurityMetricsMocks();

      const result = await service.getSecurityMetrics(festivalId, startDate, endDate);

      // 5000 attendees / 20 security staff = 250
      expect(result.securityToAttendeeRatio).toBe(250);
    });

    it('should handle no security staff gracefully', async () => {
      mockPrismaService.zoneAccessLog.count.mockResolvedValue(50);
      mockPrismaService.supportTicket.count.mockResolvedValue(5);
      mockPrismaService.staffMember.count.mockResolvedValue(0);
      mockPrismaService.festival.findUnique.mockResolvedValue({
        currentAttendees: 5000,
      });

      const result = await service.getSecurityMetrics(festivalId, startDate, endDate);

      expect(result.securityStaffCount).toBe(0);
      expect(result.securityToAttendeeRatio).toBe(5000); // attendees / max(1, 0)
    });
  });

  // ==========================================================================
  // getComprehensiveAnalytics Tests
  // ==========================================================================

  describe('getComprehensiveAnalytics', () => {
    it('should return comprehensive analytics combining all metrics when cached', async () => {
      // Return cached comprehensive analytics to avoid complex mock setup
      const cachedResult = {
        festivalId,
        generatedAt: new Date(),
        period: { startDate, endDate },
        revenue: {
          grossRevenue: 100000,
          netRevenue: 95000,
          refundedAmount: 5000,
          refundCount: 20,
          platformFees: 2000,
          breakdown: {
            tickets: { amount: 70000, percentage: 70, count: 700 },
            cashless: { amount: 15000, percentage: 15 },
            vendors: { amount: 10000, percentage: 10, commission: 1000 },
            camping: { amount: 5000, percentage: 5 },
          },
          averageRevenuePerAttendee: 100,
          profitMargin: 93,
        },
        customers: {
          totalUniqueCustomers: 500,
          newCustomers: 300,
          returningCustomers: 200,
          repeatPurchaseRate: 15,
          averageSpendingPerCustomer: 200,
          averageTicketsPerCustomer: 1.5,
          averageCashlessSpending: 50,
          customerLifetimeValue: 300,
          segmentation: { vip: 50, standard: 400, earlyBird: 50 },
          acquisitionChannels: [],
        },
        performance: {
          ticketScanThroughput: 5000,
          averageOrderFulfillmentTime: 10,
          cashlessSuccessRate: 99.5,
          supportTicketResolutionTime: 2,
          supportTicketsByPriority: { HIGH: 5, MEDIUM: 10, LOW: 20 },
          averageQueueTime: 5,
          peakQueueTime: 15,
          systemUptime: 99.9,
          errorRate: 0.1,
        },
        fraud: {
          duplicateScanAttempts: 10,
          suspiciousTransactions: 3,
          suspiciousTransactionAmount: 500,
          chargebackCount: 2,
          chargebackRate: 0.2,
          blockedUsers: 1,
          riskScore: 15,
          fraudIndicators: [],
        },
        growth: {
          salesGrowth: 25,
          revenueGrowth: 30,
          customerGrowth: 20,
          dailyGrowthRate: [],
          weeklyTrends: [],
          projectedRevenue: 150000,
          projectedAttendance: 700,
        },
        staff: {
          totalStaff: 50,
          activeStaff: 45,
          totalScheduledHours: 400,
          totalWorkedHours: 380,
          attendanceRate: 95,
          averageHoursPerStaff: 8,
          overtimeHours: 20,
          staffByRole: [],
          performanceByZone: [],
        },
        environmental: {
          estimatedCarbonFootprint: 15000,
          carbonPerAttendee: 15,
          digitalTicketRate: 90,
          paperSaved: 9,
          cashlessRate: 95,
          wasteEstimate: 500,
          sustainabilityScore: 85,
        },
        security: {
          totalAccessDenials: 50,
          securityIncidents: 5,
          incidentResponseTime: 3,
          evacuationDrillCount: 1,
          securityStaffCount: 10,
          securityToAttendeeRatio: 50,
          zoneViolations: 10,
          emergencyResponseReadiness: 90,
        },
      };

      mockCacheService.get.mockResolvedValue(cachedResult);

      const result = await service.getComprehensiveAnalytics(festivalId, startDate, endDate);

      expect(result).toBeDefined();
      expect(result.festivalId).toBe(festivalId);
      expect(result.period).toBeDefined();
      expect(result.period.startDate).toEqual(startDate);
      expect(result.period.endDate).toEqual(endDate);
      expect(result.revenue).toBeDefined();
      expect(result.customers).toBeDefined();
      expect(result.performance).toBeDefined();
      expect(result.fraud).toBeDefined();
      expect(result.growth).toBeDefined();
      expect(result.staff).toBeDefined();
      expect(result.environmental).toBeDefined();
      expect(result.security).toBeDefined();
    });

    it('should call all metrics methods when cache is empty', async () => {
      mockCacheService.get.mockResolvedValue(null);

      // Spy on the individual metric methods
      const revenueMetricsSpy = jest.spyOn(service, 'getRevenueMetrics').mockResolvedValue({
        grossRevenue: 100000,
        netRevenue: 95000,
        refundedAmount: 5000,
        refundCount: 20,
        platformFees: 2000,
        breakdown: {
          tickets: { amount: 70000, percentage: 70, count: 700 },
          cashless: { amount: 15000, percentage: 15 },
          vendors: { amount: 10000, percentage: 10, commission: 1000 },
          camping: { amount: 5000, percentage: 5 },
        },
        averageRevenuePerAttendee: 100,
        profitMargin: 93,
      });

      const customerMetricsSpy = jest.spyOn(service, 'getCustomerMetrics').mockResolvedValue({
        totalUniqueCustomers: 500,
        newCustomers: 300,
        returningCustomers: 200,
        repeatPurchaseRate: 15,
        averageSpendingPerCustomer: 200,
        averageTicketsPerCustomer: 1.5,
        averageCashlessSpending: 50,
        customerLifetimeValue: 300,
        segmentation: { vip: 50, standard: 400, earlyBird: 50 },
        acquisitionChannels: [],
      });

      const performanceMetricsSpy = jest.spyOn(service, 'getPerformanceMetrics').mockResolvedValue({
        ticketScanThroughput: 5000,
        averageOrderFulfillmentTime: 10,
        cashlessSuccessRate: 99.5,
        supportTicketResolutionTime: 2,
        supportTicketsByPriority: { HIGH: 5, MEDIUM: 10, LOW: 20 },
        averageQueueTime: 5,
        peakQueueTime: 15,
        systemUptime: 99.9,
        errorRate: 0.1,
      });

      const fraudMetricsSpy = jest.spyOn(service, 'getFraudMetrics').mockResolvedValue({
        duplicateScanAttempts: 10,
        suspiciousTransactions: 3,
        suspiciousTransactionAmount: 500,
        chargebackCount: 2,
        chargebackRate: 0.2,
        blockedUsers: 1,
        riskScore: 15,
        fraudIndicators: [],
      });

      const growthMetricsSpy = jest.spyOn(service, 'getGrowthMetrics').mockResolvedValue({
        salesGrowth: 25,
        revenueGrowth: 30,
        customerGrowth: 20,
        dailyGrowthRate: [],
        weeklyTrends: [],
        projectedRevenue: 150000,
        projectedAttendance: 700,
      });

      const staffMetricsSpy = jest.spyOn(service, 'getStaffMetrics').mockResolvedValue({
        totalStaff: 50,
        activeStaff: 45,
        totalScheduledHours: 400,
        totalWorkedHours: 380,
        attendanceRate: 95,
        averageHoursPerStaff: 8,
        overtimeHours: 20,
        staffByRole: [],
        performanceByZone: [],
      });

      const environmentalMetricsSpy = jest.spyOn(service, 'getEnvironmentalMetrics').mockResolvedValue({
        estimatedCarbonFootprint: 15000,
        carbonPerAttendee: 15,
        digitalTicketRate: 90,
        paperSaved: 9,
        cashlessRate: 95,
        wasteEstimate: 500,
        sustainabilityScore: 85,
      });

      const securityMetricsSpy = jest.spyOn(service, 'getSecurityMetrics').mockResolvedValue({
        totalAccessDenials: 50,
        securityIncidents: 5,
        incidentResponseTime: 3,
        evacuationDrillCount: 1,
        securityStaffCount: 10,
        securityToAttendeeRatio: 50,
        zoneViolations: 10,
        emergencyResponseReadiness: 90,
      });

      const result = await service.getComprehensiveAnalytics(festivalId, startDate, endDate);

      expect(result).toBeDefined();
      expect(revenueMetricsSpy).toHaveBeenCalledWith(festivalId, startDate, endDate);
      expect(customerMetricsSpy).toHaveBeenCalledWith(festivalId, startDate, endDate);
      expect(performanceMetricsSpy).toHaveBeenCalledWith(festivalId, startDate, endDate);
      expect(fraudMetricsSpy).toHaveBeenCalledWith(festivalId, startDate, endDate);
      expect(growthMetricsSpy).toHaveBeenCalledWith(festivalId, startDate, endDate);
      expect(staffMetricsSpy).toHaveBeenCalledWith(festivalId, startDate, endDate);
      expect(environmentalMetricsSpy).toHaveBeenCalledWith(festivalId, startDate, endDate);
      expect(securityMetricsSpy).toHaveBeenCalledWith(festivalId, startDate, endDate);

      // Cleanup spies
      revenueMetricsSpy.mockRestore();
      customerMetricsSpy.mockRestore();
      performanceMetricsSpy.mockRestore();
      fraudMetricsSpy.mockRestore();
      growthMetricsSpy.mockRestore();
      staffMetricsSpy.mockRestore();
      environmentalMetricsSpy.mockRestore();
      securityMetricsSpy.mockRestore();
    });
  });
});
