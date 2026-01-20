/**
 * Custom Reports Service Unit Tests
 *
 * Comprehensive tests for custom reports functionality including:
 * - Report creation and management
 * - Report execution
 * - Comparison analytics
 * - Cohort analysis
 * - Funnel analysis
 * - Anomaly detection
 * - Benchmarks
 */

import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { CustomReportsService } from './custom-reports.service';
import { PrismaService } from '../../prisma/prisma.service';
import { CacheService } from '../../cache/cache.service';
import { AnalyticsService } from './analytics.service';
import { AdvancedMetricsService } from './advanced-metrics.service';
import { Decimal } from '@prisma/client/runtime/library';

describe('CustomReportsService', () => {
  let service: CustomReportsService;
  let mockAnalyticsService: jest.Mocked<Partial<AnalyticsService>>;
  let mockAdvancedMetricsService: jest.Mocked<Partial<AdvancedMetricsService>>;

  const mockPrismaService = {
    ticket: {
      count: jest.fn(),
      aggregate: jest.fn(),
      findMany: jest.fn(),
      groupBy: jest.fn(),
    },
    zoneAccessLog: {
      findMany: jest.fn(),
    },
    cashlessTransaction: {
      count: jest.fn(),
      findMany: jest.fn(),
    },
    vendorOrder: {
      count: jest.fn(),
    },
    supportTicket: {
      count: jest.fn(),
    },
    festival: {
      findUnique: jest.fn(),
    },
    user: {
      count: jest.fn(),
    },
    cashlessAccount: {
      count: jest.fn(),
    },
  };

  const mockCacheService = {
    get: jest.fn(),
    set: jest.fn(),
    delete: jest.fn(),
  };

  const festivalId = 'festival-uuid-test';
  const userId = 'user-uuid-test';
  const startDate = new Date('2024-07-01T00:00:00Z');
  const endDate = new Date('2024-07-07T23:59:59Z');

  beforeEach(async () => {
    jest.clearAllMocks();

    mockAnalyticsService = {
      getDashboardKPIs: jest.fn(),
      getSalesAnalytics: jest.fn(),
      getCashlessAnalytics: jest.fn(),
      getAttendanceAnalytics: jest.fn(),
      getZoneAnalytics: jest.fn(),
      getVendorAnalytics: jest.fn(),
    };

    mockAdvancedMetricsService = {
      getRevenueMetrics: jest.fn(),
      getCustomerMetrics: jest.fn(),
      getPerformanceMetrics: jest.fn(),
      getFraudMetrics: jest.fn(),
      getGrowthMetrics: jest.fn(),
      getForecastMetrics: jest.fn(),
      getStaffMetrics: jest.fn(),
      getEnvironmentalMetrics: jest.fn(),
      getSecurityMetrics: jest.fn(),
      getComprehensiveAnalytics: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CustomReportsService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: CacheService, useValue: mockCacheService },
        { provide: AnalyticsService, useValue: mockAnalyticsService },
        { provide: AdvancedMetricsService, useValue: mockAdvancedMetricsService },
      ],
    }).compile();

    service = module.get<CustomReportsService>(CustomReportsService);
  });

  function createDecimal(value: number): Decimal {
    return new Decimal(value);
  }

  // ==========================================================================
  // Report CRUD Operations
  // ==========================================================================

  describe('createReport', () => {
    it('should create a custom report configuration', async () => {
      const config = {
        name: 'Weekly Sales Report',
        description: 'Weekly sales summary',
        festivalId,
        metrics: ['sales', 'revenue'],
        schedule: undefined,
        filters: [],
      };

      const result = await service.createReport(festivalId, userId, config);

      expect(result).toBeDefined();
      expect(result.id).toBeDefined();
      expect(result.name).toBe('Weekly Sales Report');
      expect(result.festivalId).toBe(festivalId);
      expect(result.createdBy).toBe(userId);
      expect(result.createdAt).toBeInstanceOf(Date);
      expect(result.updatedAt).toBeInstanceOf(Date);
    });

    it('should generate a unique ID for each report', async () => {
      const config = {
        name: 'Test Report',
        metrics: ['dashboard'],
        festivalId,
        filters: [],
      };

      const result1 = await service.createReport(festivalId, userId, config);
      const result2 = await service.createReport(festivalId, userId, config);

      expect(result1.id).not.toBe(result2.id);
    });
  });

  describe('getReports', () => {
    it('should return all reports for a festival', async () => {
      // Create some reports first
      await service.createReport(festivalId, userId, {
        name: 'Report 1',
        metrics: ['sales'],
        festivalId,
        filters: [],
      });
      await service.createReport(festivalId, userId, {
        name: 'Report 2',
        metrics: ['cashless'],
        festivalId,
        filters: [],
      });
      await service.createReport('other-festival', userId, {
        name: 'Other Report',
        metrics: ['dashboard'],
        festivalId: 'other-festival',
        filters: [],
      });

      const result = await service.getReports(festivalId);

      expect(result.length).toBe(2);
      expect(result.every((r) => r.festivalId === festivalId)).toBe(true);
    });

    it('should return empty array if no reports exist', async () => {
      const result = await service.getReports('non-existent-festival');

      expect(result).toEqual([]);
    });
  });

  describe('getReport', () => {
    it('should return a report by ID', async () => {
      const created = await service.createReport(festivalId, userId, {
        name: 'Test Report',
        metrics: ['sales'],
        festivalId,
        filters: [],
      });

      const result = await service.getReport(created.id);

      expect(result.id).toBe(created.id);
      expect(result.name).toBe('Test Report');
    });

    it('should throw NotFoundException if report not found', async () => {
      await expect(service.getReport('non-existent-id')).rejects.toThrow(NotFoundException);
    });
  });

  describe('updateReport', () => {
    it('should update a report configuration', async () => {
      const created = await service.createReport(festivalId, userId, {
        name: 'Original Name',
        metrics: ['sales'],
        festivalId,
        filters: [],
      });

      const result = await service.updateReport(created.id, {
        name: 'Updated Name',
        metrics: ['sales', 'cashless'],
      });

      expect(result.id).toBe(created.id);
      expect(result.name).toBe('Updated Name');
      expect(result.metrics).toContain('cashless');
      expect(result.updatedAt.getTime()).toBeGreaterThanOrEqual(created.updatedAt.getTime());
    });

    it('should throw NotFoundException if report not found', async () => {
      await expect(service.updateReport('non-existent-id', { name: 'New Name' })).rejects.toThrow(
        NotFoundException
      );
    });
  });

  describe('deleteReport', () => {
    it('should delete a report', async () => {
      const created = await service.createReport(festivalId, userId, {
        name: 'To Be Deleted',
        metrics: ['sales'],
        festivalId,
        filters: [],
      });

      await service.deleteReport(created.id);

      await expect(service.getReport(created.id)).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException if report not found', async () => {
      await expect(service.deleteReport('non-existent-id')).rejects.toThrow(NotFoundException);
    });
  });

  // ==========================================================================
  // executeReport Tests
  // ==========================================================================

  describe('executeReport', () => {
    beforeEach(() => {
      mockCacheService.get.mockResolvedValue(null);
    });

    it('should execute a report with dashboard metric', async () => {
      const created = await service.createReport(festivalId, userId, {
        name: 'Dashboard Report',
        metrics: ['dashboard'],
        festivalId,
        filters: [],
      });

      mockAnalyticsService.getDashboardKPIs!.mockResolvedValue({
        festivalId,
        festivalName: 'Test Festival',
        generatedAt: new Date(),
        ticketing: {
          totalSold: 100,
          totalAvailable: 900,
          soldPercentage: 10,
          revenueTickets: 10000,
          ticketsByType: [],
          salesTrend: [],
        },
        revenue: {
          totalRevenue: 10000,
          ticketRevenue: 8000,
          cashlessRevenue: 1500,
          vendorRevenue: 500,
          currency: 'EUR',
        },
        attendance: {
          currentAttendees: 50,
          maxCapacity: 1000,
          occupancyRate: 5,
          peakAttendance: 75,
          peakTime: null,
        },
        cashless: { totalTopups: 5000, totalSpent: 3000, averageBalance: 50, activeAccounts: 100 },
        conversion: { visitorsToCart: 0, cartToPurchase: 0, overallConversion: 0 },
      });

      const result = await service.executeReport(created.id);

      expect(result).toBeDefined();
      expect(result.reportId).toBe(created.id);
      expect(result.reportName).toBe('Dashboard Report');
      expect(result.data).toBeDefined();
      expect(mockAnalyticsService.getDashboardKPIs).toHaveBeenCalled();
    });

    it('should execute a report with multiple metrics', async () => {
      const created = await service.createReport(festivalId, userId, {
        name: 'Multi-Metric Report',
        metrics: ['sales', 'cashless'],
        festivalId,
        filters: [],
      });

      mockAnalyticsService.getSalesAnalytics!.mockResolvedValue({
        festivalId,
        period: { startDate, endDate },
        summary: {
          totalSales: 100,
          totalRevenue: 10000,
          averageOrderValue: 100,
          uniqueCustomers: 90,
        },
        salesByDay: [],
        salesByHour: [],
        salesByCategory: [],
        topSellingCategories: [],
      });
      mockAnalyticsService.getCashlessAnalytics!.mockResolvedValue({
        festivalId,
        period: { startDate, endDate },
        summary: {
          totalTopups: 5000,
          totalPayments: 3000,
          totalTransfers: 500,
          totalRefunds: 200,
          averageTopup: 50,
          averageBalance: 25,
          activeAccounts: 100,
        },
        transactionsByHour: [],
        transactionsByType: [],
        topupDistribution: [],
        balanceDistribution: [],
        topVendors: [],
      });

      const result = await service.executeReport(created.id);

      expect(result.data).toBeDefined();
      expect(mockAnalyticsService.getSalesAnalytics).toHaveBeenCalled();
      expect(mockAnalyticsService.getCashlessAnalytics).toHaveBeenCalled();
    });

    it('should return cached result if available', async () => {
      const created = await service.createReport(festivalId, userId, {
        name: 'Cached Report',
        metrics: ['dashboard'],
        festivalId,
        filters: [],
      });

      const cachedData = {
        reportId: created.id,
        reportName: 'Cached Report',
        generatedAt: new Date(),
        period: { startDate, endDate },
        data: {
          dashboard: {
            /* mock data */
          },
        },
      };
      mockCacheService.get.mockResolvedValue(cachedData);

      const result = await service.executeReport(created.id);

      expect(result).toEqual(cachedData);
      expect(mockAnalyticsService.getDashboardKPIs).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException if report not found', async () => {
      await expect(service.executeReport('non-existent-id')).rejects.toThrow(NotFoundException);
    });

    it('should handle metric errors gracefully', async () => {
      const created = await service.createReport(festivalId, userId, {
        name: 'Error Report',
        metrics: ['dashboard'],
        festivalId,
        filters: [],
      });

      mockAnalyticsService.getDashboardKPIs!.mockRejectedValue(new Error('Database error'));

      const result = await service.executeReport(created.id);

      expect(result.data).toBeDefined();
      expect((result.data as any).dashboard.error).toBe('Database error');
    });

    it('should execute report with custom time range', async () => {
      const created = await service.createReport(festivalId, userId, {
        name: 'Custom Range Report',
        metrics: ['revenue'],
        festivalId,
        filters: [],
      });

      mockAdvancedMetricsService.getRevenueMetrics!.mockResolvedValue({
        grossRevenue: 50000,
        netRevenue: 48000,
        refundedAmount: 2000,
        refundCount: 5,
        platformFees: 1000,
        breakdown: {
          tickets: { amount: 40000, percentage: 80, count: 400 },
          cashless: { amount: 5000, percentage: 10 },
          vendors: { amount: 3000, percentage: 6, commission: 300 },
          camping: { amount: 2000, percentage: 4 },
        },
        averageRevenuePerAttendee: 100,
        profitMargin: 94,
      });

      const timeRange = { startDate, endDate };
      const _result = await service.executeReport(created.id, timeRange);

      expect(mockAdvancedMetricsService.getRevenueMetrics).toHaveBeenCalledWith(
        festivalId,
        startDate,
        endDate
      );
    });
  });

  // ==========================================================================
  // getComparisonAnalytics Tests
  // ==========================================================================

  describe('getComparisonAnalytics', () => {
    const currentPeriod = { startDate: new Date('2024-07-01'), endDate: new Date('2024-07-07') };
    const comparisonPeriod = { startDate: new Date('2024-06-24'), endDate: new Date('2024-06-30') };

    beforeEach(() => {
      mockCacheService.get.mockResolvedValue(null);
    });

    it('should return comparison analytics for multiple metrics', async () => {
      mockPrismaService.ticket.count.mockResolvedValue(100);
      mockPrismaService.ticket.aggregate.mockResolvedValue({
        _sum: { purchasePrice: createDecimal(10000) },
      });
      mockPrismaService.zoneAccessLog.findMany.mockResolvedValue([
        { ticketId: 'ticket1' },
        { ticketId: 'ticket2' },
      ]);
      mockPrismaService.cashlessTransaction.count.mockResolvedValue(50);
      mockPrismaService.vendorOrder.count.mockResolvedValue(30);
      mockPrismaService.supportTicket.count.mockResolvedValue(5);

      const result = await service.getComparisonAnalytics(
        festivalId,
        currentPeriod,
        comparisonPeriod,
        ['totalSales', 'totalRevenue']
      );

      expect(result).toBeDefined();
      expect(result.currentPeriod).toEqual(currentPeriod);
      expect(result.comparisonPeriod).toEqual(comparisonPeriod);
      expect(result.metrics).toBeDefined();
      expect(result.metrics.length).toBeGreaterThan(0);
    });

    it('should return cached data if available', async () => {
      const cachedData = {
        currentPeriod,
        comparisonPeriod,
        metrics: [
          {
            name: 'totalSales',
            current: 100,
            previous: 80,
            change: 20,
            changePercentage: 25,
            trend: 'up',
          },
        ],
      };
      mockCacheService.get.mockResolvedValue(cachedData);

      const result = await service.getComparisonAnalytics(
        festivalId,
        currentPeriod,
        comparisonPeriod,
        ['totalSales']
      );

      expect(result).toEqual(cachedData);
      expect(mockPrismaService.ticket.count).not.toHaveBeenCalled();
    });

    it('should calculate trend direction correctly', async () => {
      mockPrismaService.ticket.count
        .mockResolvedValueOnce(100) // current
        .mockResolvedValueOnce(80); // previous

      const result = await service.getComparisonAnalytics(
        festivalId,
        currentPeriod,
        comparisonPeriod,
        ['totalSales']
      );

      const salesMetric = result.metrics.find((m) => m.name === 'totalSales');
      expect(salesMetric?.trend).toBe('up');
      expect(salesMetric?.change).toBe(20);
      expect(salesMetric?.changePercentage).toBe(25);
    });

    it('should handle stable metrics (no change)', async () => {
      mockPrismaService.ticket.count
        .mockResolvedValueOnce(100) // current
        .mockResolvedValueOnce(100); // previous

      const result = await service.getComparisonAnalytics(
        festivalId,
        currentPeriod,
        comparisonPeriod,
        ['totalSales']
      );

      const salesMetric = result.metrics.find((m) => m.name === 'totalSales');
      expect(salesMetric?.trend).toBe('stable');
      expect(salesMetric?.change).toBe(0);
    });

    it('should handle zero previous value gracefully', async () => {
      mockPrismaService.ticket.count
        .mockResolvedValueOnce(100) // current
        .mockResolvedValueOnce(0); // previous

      const result = await service.getComparisonAnalytics(
        festivalId,
        currentPeriod,
        comparisonPeriod,
        ['totalSales']
      );

      const salesMetric = result.metrics.find((m) => m.name === 'totalSales');
      expect(salesMetric?.changePercentage).toBe(0);
    });
  });

  // ==========================================================================
  // getCohortAnalysis Tests
  // ==========================================================================

  describe('getCohortAnalysis', () => {
    const timeRange = { startDate, endDate };

    beforeEach(() => {
      mockCacheService.get.mockResolvedValue(null);
    });

    it('should return acquisition date cohorts', async () => {
      mockPrismaService.ticket.findMany.mockResolvedValue([
        { userId: 'user1', createdAt: new Date('2024-07-01'), purchasePrice: createDecimal(100) },
        { userId: 'user2', createdAt: new Date('2024-07-01'), purchasePrice: createDecimal(150) },
        { userId: 'user3', createdAt: new Date('2024-07-03'), purchasePrice: createDecimal(200) },
      ]);

      const result = await service.getCohortAnalysis(festivalId, 'acquisition_date', timeRange);

      expect(result).toBeDefined();
      expect(result.cohortType).toBe('acquisition_date');
      expect(result.cohorts).toBeDefined();
      expect(result.periods).toBeDefined();
    });

    it('should return ticket type cohorts', async () => {
      mockPrismaService.ticket.findMany.mockResolvedValue([
        {
          userId: 'user1',
          createdAt: new Date('2024-07-01'),
          purchasePrice: createDecimal(100),
          category: { type: 'STANDARD' },
        },
        {
          userId: 'user2',
          createdAt: new Date('2024-07-01'),
          purchasePrice: createDecimal(200),
          category: { type: 'VIP' },
        },
        {
          userId: 'user3',
          createdAt: new Date('2024-07-02'),
          purchasePrice: createDecimal(100),
          category: { type: 'STANDARD' },
        },
      ]);

      const result = await service.getCohortAnalysis(festivalId, 'ticket_type', timeRange);

      expect(result.cohortType).toBe('ticket_type');
      expect(result.cohorts).toBeDefined();
    });

    it('should return first purchase cohorts', async () => {
      mockPrismaService.ticket.groupBy.mockResolvedValue([
        { userId: 'user1', _min: { createdAt: new Date('2024-07-01') } },
        { userId: 'user2', _min: { createdAt: new Date('2024-07-02') } },
      ]);

      const result = await service.getCohortAnalysis(festivalId, 'first_purchase', timeRange);

      expect(result.cohortType).toBe('first_purchase');
      expect(result.cohorts).toBeDefined();
    });

    it('should return cached data if available', async () => {
      const cachedData = {
        cohortType: 'acquisition_date' as const,
        cohorts: [
          {
            name: 'Week of 2024-07-01',
            size: 100,
            retention: [100],
            revenue: [10000],
            avgSpending: 100,
          },
        ],
        periods: ['2024-07-01'],
      };
      mockCacheService.get.mockResolvedValue(cachedData);

      const result = await service.getCohortAnalysis(festivalId, 'acquisition_date', timeRange);

      expect(result).toEqual(cachedData);
      expect(mockPrismaService.ticket.findMany).not.toHaveBeenCalled();
    });

    it('should calculate average spending per cohort', async () => {
      mockPrismaService.ticket.findMany.mockResolvedValue([
        { userId: 'user1', createdAt: new Date('2024-07-01'), purchasePrice: createDecimal(100) },
        { userId: 'user2', createdAt: new Date('2024-07-01'), purchasePrice: createDecimal(200) },
      ]);

      const result = await service.getCohortAnalysis(festivalId, 'acquisition_date', timeRange);

      expect(result.cohorts.length).toBeGreaterThan(0);
      expect(result.cohorts[0].avgSpending).toBeDefined();
    });
  });

  // ==========================================================================
  // getFunnelAnalysis Tests
  // ==========================================================================

  describe('getFunnelAnalysis', () => {
    beforeEach(() => {
      mockCacheService.get.mockResolvedValue(null);
    });

    it('should return purchase funnel analysis', async () => {
      mockPrismaService.user.count.mockResolvedValue(1000);
      mockPrismaService.ticket.findMany
        .mockResolvedValueOnce([{ userId: 'user1' }, { userId: 'user2' }]) // purchased
        .mockResolvedValueOnce([{ userId: 'user1' }]); // attended

      const result = await service.getFunnelAnalysis(festivalId, 'purchase');

      expect(result).toBeDefined();
      expect(result.name).toBe('Purchase Funnel');
      expect(result.steps).toBeDefined();
      expect(result.steps.length).toBeGreaterThan(0);
      expect(result.overallConversion).toBeDefined();
    });

    it('should return entry funnel analysis', async () => {
      mockPrismaService.ticket.count
        .mockResolvedValueOnce(500) // total tickets
        .mockResolvedValueOnce(450) // validated
        .mockResolvedValueOnce(400); // used

      const result = await service.getFunnelAnalysis(festivalId, 'entry');

      expect(result.name).toBe('Entry Funnel');
      expect(result.steps).toBeDefined();
    });

    it('should return cashless funnel analysis', async () => {
      mockPrismaService.ticket.count.mockResolvedValue(400);
      mockPrismaService.cashlessAccount.count.mockResolvedValue(300);
      mockPrismaService.cashlessTransaction.findMany
        .mockResolvedValueOnce([{ accountId: 'acc1' }, { accountId: 'acc2' }]) // topups
        .mockResolvedValueOnce([{ accountId: 'acc1' }]); // payments

      const result = await service.getFunnelAnalysis(festivalId, 'cashless');

      expect(result.name).toBe('Cashless Funnel');
      expect(result.steps).toBeDefined();
    });

    it('should throw BadRequestException for unknown funnel', async () => {
      await expect(service.getFunnelAnalysis(festivalId, 'unknown')).rejects.toThrow(
        BadRequestException
      );
    });

    it('should return cached data if available', async () => {
      const cachedData = {
        name: 'Purchase Funnel',
        steps: [
          { name: 'Site Visit', count: 1000, percentage: 100, dropoff: 0 },
          { name: 'Ticket Purchased', count: 200, percentage: 20, dropoff: 800 },
        ],
        overallConversion: 20,
      };
      mockCacheService.get.mockResolvedValue(cachedData);

      const result = await service.getFunnelAnalysis(festivalId, 'purchase');

      expect(result).toEqual(cachedData);
    });

    it('should calculate step percentages and dropoff correctly', async () => {
      mockPrismaService.user.count.mockResolvedValue(1000);
      mockPrismaService.ticket.findMany
        .mockResolvedValueOnce(Array(200).fill({ userId: 'user' })) // purchased
        .mockResolvedValueOnce(Array(150).fill({ userId: 'user' })); // attended

      const result = await service.getFunnelAnalysis(festivalId, 'purchase');

      expect(result.steps[0].percentage).toBe(100);
      expect(result.steps[1].percentage).toBe(20);
      expect(result.steps[1].dropoff).toBe(800);
    });
  });

  // ==========================================================================
  // detectAnomalies Tests
  // ==========================================================================

  describe('detectAnomalies', () => {
    const timeRange = { startDate, endDate };

    beforeEach(() => {
      mockCacheService.get.mockResolvedValue(null);
    });

    it('should detect anomalies in sales data', async () => {
      // Create data with an anomaly
      const salesData = [
        { createdAt: new Date('2024-07-01T10:00:00Z') },
        { createdAt: new Date('2024-07-01T10:00:00Z') },
        { createdAt: new Date('2024-07-01T11:00:00Z') },
        { createdAt: new Date('2024-07-01T11:00:00Z') },
        { createdAt: new Date('2024-07-01T12:00:00Z') },
        { createdAt: new Date('2024-07-01T12:00:00Z') },
        { createdAt: new Date('2024-07-01T13:00:00Z') },
        { createdAt: new Date('2024-07-01T13:00:00Z') },
        { createdAt: new Date('2024-07-01T14:00:00Z') },
        { createdAt: new Date('2024-07-01T14:00:00Z') },
        { createdAt: new Date('2024-07-01T14:00:00Z') },
        { createdAt: new Date('2024-07-01T14:00:00Z') },
        { createdAt: new Date('2024-07-01T14:00:00Z') },
        { createdAt: new Date('2024-07-01T14:00:00Z') },
        { createdAt: new Date('2024-07-01T14:00:00Z') },
        { createdAt: new Date('2024-07-01T14:00:00Z') },
        { createdAt: new Date('2024-07-01T14:00:00Z') },
        { createdAt: new Date('2024-07-01T14:00:00Z') }, // Spike at 14:00
      ];
      mockPrismaService.ticket.findMany.mockResolvedValue(salesData);

      const result = await service.detectAnomalies(festivalId, 'sales', timeRange);

      expect(Array.isArray(result)).toBe(true);
    });

    it('should return empty array if not enough data points', async () => {
      mockPrismaService.ticket.findMany.mockResolvedValue([
        { createdAt: new Date('2024-07-01T10:00:00Z') },
        { createdAt: new Date('2024-07-01T11:00:00Z') },
      ]);

      const result = await service.detectAnomalies(festivalId, 'sales', timeRange);

      expect(result).toEqual([]);
    });

    it('should return cached data if available', async () => {
      const cachedData = [
        {
          metric: 'sales',
          timestamp: new Date('2024-07-01T14:00:00Z'),
          expectedValue: 2,
          actualValue: 10,
          deviation: 4,
          severity: 'high' as const,
          possibleCauses: ['Promotional campaign effect'],
        },
      ];
      mockCacheService.get.mockResolvedValue(cachedData);

      const result = await service.detectAnomalies(festivalId, 'sales', timeRange);

      expect(result).toEqual(cachedData);
    });

    it('should identify possible causes for anomalies', async () => {
      const salesData = Array(20)
        .fill(null)
        .map((_, i) => ({
          createdAt: new Date(`2024-07-01T${String(i % 24).padStart(2, '0')}:00:00Z`),
        }));
      // Add spike
      for (let i = 0; i < 50; i++) {
        salesData.push({ createdAt: new Date('2024-07-01T14:00:00Z') });
      }
      mockPrismaService.ticket.findMany.mockResolvedValue(salesData);

      const result = await service.detectAnomalies(festivalId, 'sales', timeRange);

      if (result.length > 0) {
        expect(result[0].possibleCauses).toBeDefined();
        expect(Array.isArray(result[0].possibleCauses)).toBe(true);
      }
    });
  });

  // ==========================================================================
  // getBenchmarks Tests
  // ==========================================================================

  describe('getBenchmarks', () => {
    beforeEach(() => {
      mockCacheService.get.mockResolvedValue(null);
    });

    it('should return benchmark data', async () => {
      mockPrismaService.festival.findUnique.mockResolvedValue({
        id: festivalId,
        name: 'Test Festival',
        maxCapacity: 10000,
        tickets: [
          { purchasePrice: createDecimal(100) },
          { purchasePrice: createDecimal(150) },
          { purchasePrice: createDecimal(200) },
        ],
        _count: { ticketCategories: 3 },
      });

      const result = await service.getBenchmarks(festivalId);

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);
    });

    it('should return cached data if available', async () => {
      const cachedData = [
        { metric: 'Average Ticket Price', festivalValue: 150, industryAverage: 85, percentile: 80 },
        { metric: 'Sell-out Rate', festivalValue: 75, industryAverage: 75, percentile: 50 },
      ];
      mockCacheService.get.mockResolvedValue(cachedData);

      const result = await service.getBenchmarks(festivalId);

      expect(result).toEqual(cachedData);
      expect(mockPrismaService.festival.findUnique).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException if festival not found', async () => {
      mockPrismaService.festival.findUnique.mockResolvedValue(null);

      await expect(service.getBenchmarks(festivalId)).rejects.toThrow(NotFoundException);
    });

    it('should calculate percentile correctly', async () => {
      mockPrismaService.festival.findUnique.mockResolvedValue({
        id: festivalId,
        name: 'Test Festival',
        maxCapacity: 10000,
        tickets: Array(7500).fill({ purchasePrice: createDecimal(100) }),
        _count: { ticketCategories: 3 },
      });

      const result = await service.getBenchmarks(festivalId);

      const sellOutBenchmark = result.find((b) => b.metric === 'Sell-out Rate');
      expect(sellOutBenchmark?.percentile).toBeGreaterThanOrEqual(0);
      expect(sellOutBenchmark?.percentile).toBeLessThanOrEqual(100);
    });

    it('should include recommendations when appropriate', async () => {
      mockPrismaService.festival.findUnique.mockResolvedValue({
        id: festivalId,
        name: 'Test Festival',
        maxCapacity: 10000,
        tickets: [
          { purchasePrice: createDecimal(50) }, // Below industry average
        ],
        _count: { ticketCategories: 1 },
      });

      const result = await service.getBenchmarks(festivalId);

      const priceBenchmark = result.find((b) => b.metric === 'Average Ticket Price');
      if (priceBenchmark && priceBenchmark.festivalValue < priceBenchmark.industryAverage) {
        expect(priceBenchmark.recommendation).toBeDefined();
      }
    });
  });
});
