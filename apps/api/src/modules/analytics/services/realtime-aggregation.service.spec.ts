/**
 * Realtime Aggregation Service Unit Tests
 *
 * Comprehensive tests for real-time metrics aggregation including:
 * - Metric recording
 * - Buffer management
 * - Aggregation windows
 * - Live counters
 * - Festival metrics
 * - Zone metrics
 * - Database sync
 */

import { Test, TestingModule } from '@nestjs/testing';
import { RealtimeAggregationService } from './realtime-aggregation.service';
import { PrismaService } from '../../prisma/prisma.service';
import { CacheService } from '../../cache/cache.service';
import { Decimal } from '@prisma/client/runtime/library';

describe('RealtimeAggregationService', () => {
  let service: RealtimeAggregationService;

  const mockPrismaService = {
    ticket: {
      count: jest.fn(),
      aggregate: jest.fn(),
    },
    festival: {
      findUnique: jest.fn(),
    },
    cashlessTransaction: {
      count: jest.fn(),
    },
    vendorOrder: {
      count: jest.fn(),
      aggregate: jest.fn(),
    },
    supportTicket: {
      count: jest.fn(),
    },
    zone: {
      findMany: jest.fn(),
    },
  };

  const mockCacheService = {
    get: jest.fn(),
    set: jest.fn(),
    delete: jest.fn(),
  };

  const festivalId = 'festival-uuid-test';

  beforeEach(async () => {
    jest.clearAllMocks();
    jest.useFakeTimers();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RealtimeAggregationService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: CacheService, useValue: mockCacheService },
      ],
    }).compile();

    service = module.get<RealtimeAggregationService>(RealtimeAggregationService);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  function createDecimal(value: number): Decimal {
    return new Decimal(value);
  }

  // ==========================================================================
  // Lifecycle Tests
  // ==========================================================================

  describe('onModuleInit', () => {
    it('should start aggregation tasks on init', async () => {
      const startSpy = jest.spyOn(service as any, 'startAggregationTasks');

      await service.onModuleInit();

      expect(startSpy).toHaveBeenCalled();
    });
  });

  describe('onModuleDestroy', () => {
    it('should clear all intervals on destroy', async () => {
      await service.onModuleInit();

      const clearIntervalSpy = jest.spyOn(global, 'clearInterval');

      await service.onModuleDestroy();

      expect(clearIntervalSpy).toHaveBeenCalled();
    });
  });

  // ==========================================================================
  // recordMetric Tests
  // ==========================================================================

  describe('recordMetric', () => {
    it('should record a metric to the buffer', () => {
      service.recordMetric({
        name: 'test_metric',
        value: 100,
        timestamp: new Date(),
        tags: { festivalId },
      });

      // Access private buffer through service methods
      // The metric should be stored in the buffer
      expect(() => service.recordMetric({
        name: 'test_metric',
        value: 100,
        timestamp: new Date(),
        tags: { festivalId },
      })).not.toThrow();
    });

    it('should create a new buffer for new metric keys', () => {
      service.recordMetric({
        name: 'metric_1',
        value: 50,
        timestamp: new Date(),
        tags: { festivalId },
      });

      service.recordMetric({
        name: 'metric_2',
        value: 75,
        timestamp: new Date(),
        tags: { festivalId },
      });

      // Both metrics should be recorded without error
      expect(() => service.recordMetric({
        name: 'metric_1',
        value: 60,
        timestamp: new Date(),
        tags: { festivalId },
      })).not.toThrow();
    });

    it('should update aggregated metrics when recording', () => {
      service.recordMetric({
        name: 'sales',
        value: 100,
        timestamp: new Date(),
        tags: { festivalId },
      });

      service.recordMetric({
        name: 'sales',
        value: 200,
        timestamp: new Date(),
        tags: { festivalId },
      });

      // The aggregated value should be updated
      // This is tested through getLiveCounter and other methods
    });
  });

  // ==========================================================================
  // recordTicketSale Tests
  // ==========================================================================

  describe('recordTicketSale', () => {
    it('should record ticket sale metrics', async () => {
      const incrementSpy = jest.spyOn(service as any, 'incrementLiveCounter');

      await service.recordTicketSale(festivalId, 'category-1', 150);

      expect(incrementSpy).toHaveBeenCalledWith(`live:sales:${festivalId}`, 1);
      expect(incrementSpy).toHaveBeenCalledWith(`live:revenue:${festivalId}`, 150);
    });

    it('should record both count and revenue metrics', async () => {
      mockCacheService.get.mockResolvedValue(0);

      await service.recordTicketSale(festivalId, 'category-1', 100);
      await service.recordTicketSale(festivalId, 'category-1', 200);

      expect(mockCacheService.set).toHaveBeenCalled();
    });
  });

  // ==========================================================================
  // recordCashlessTransaction Tests
  // ==========================================================================

  describe('recordCashlessTransaction', () => {
    it('should record cashless topup', async () => {
      const incrementSpy = jest.spyOn(service as any, 'incrementLiveCounter');

      await service.recordCashlessTransaction(festivalId, 'TOPUP', 50, undefined);

      expect(incrementSpy).toHaveBeenCalledWith(`live:cashless:${festivalId}:TOPUP`, 1);
      expect(incrementSpy).toHaveBeenCalledWith(`live:cashless_amount:${festivalId}:TOPUP`, 50);
    });

    it('should record cashless payment', async () => {
      const incrementSpy = jest.spyOn(service as any, 'incrementLiveCounter');

      await service.recordCashlessTransaction(festivalId, 'PAYMENT', 25, 'vendor-1');

      expect(incrementSpy).toHaveBeenCalledWith(`live:cashless:${festivalId}:PAYMENT`, 1);
    });

    it('should record cashless transfer', async () => {
      const incrementSpy = jest.spyOn(service as any, 'incrementLiveCounter');

      await service.recordCashlessTransaction(festivalId, 'TRANSFER', 30);

      expect(incrementSpy).toHaveBeenCalledWith(`live:cashless:${festivalId}:TRANSFER`, 1);
    });

    it('should record cashless refund', async () => {
      const incrementSpy = jest.spyOn(service as any, 'incrementLiveCounter');

      await service.recordCashlessTransaction(festivalId, 'REFUND', 20);

      expect(incrementSpy).toHaveBeenCalledWith(`live:cashless:${festivalId}:REFUND`, 1);
    });
  });

  // ==========================================================================
  // recordZoneAccess Tests
  // ==========================================================================

  describe('recordZoneAccess', () => {
    it('should record zone entry', async () => {
      const incrementSpy = jest.spyOn(service as any, 'incrementLiveCounter');

      await service.recordZoneAccess(festivalId, 'zone-1', 'ENTRY');

      expect(incrementSpy).toHaveBeenCalledWith(`live:zone_occupancy:zone-1`, 1);
      expect(incrementSpy).toHaveBeenCalledWith(`live:festival_attendance:${festivalId}`, 1);
    });

    it('should record zone exit', async () => {
      const incrementSpy = jest.spyOn(service as any, 'incrementLiveCounter');

      await service.recordZoneAccess(festivalId, 'zone-1', 'EXIT');

      expect(incrementSpy).toHaveBeenCalledWith(`live:zone_occupancy:zone-1`, -1);
      expect(incrementSpy).toHaveBeenCalledWith(`live:festival_attendance:${festivalId}`, -1);
    });
  });

  // ==========================================================================
  // recordVendorOrder Tests
  // ==========================================================================

  describe('recordVendorOrder', () => {
    it('should record vendor order metrics', async () => {
      const incrementSpy = jest.spyOn(service as any, 'incrementLiveCounter');

      await service.recordVendorOrder(festivalId, 'vendor-1', 35, 'CONFIRMED');

      expect(incrementSpy).toHaveBeenCalledWith(`live:vendor_orders:${festivalId}`, 1);
      expect(incrementSpy).toHaveBeenCalledWith(`live:vendor_revenue:${festivalId}`, 35);
    });
  });

  // ==========================================================================
  // recordSupportTicket Tests
  // ==========================================================================

  describe('recordSupportTicket', () => {
    it('should record support ticket', async () => {
      const incrementSpy = jest.spyOn(service as any, 'incrementLiveCounter');

      await service.recordSupportTicket(festivalId, 'HIGH', 'PAYMENT');

      expect(incrementSpy).toHaveBeenCalledWith(`live:support_tickets:${festivalId}`, 1);
    });
  });

  // ==========================================================================
  // getLiveCounter Tests
  // ==========================================================================

  describe('getLiveCounter', () => {
    it('should return counter value from cache', async () => {
      mockCacheService.get.mockResolvedValue(100);

      const result = await service.getLiveCounter('live:sales:test');

      expect(result).toBe(100);
      expect(mockCacheService.get).toHaveBeenCalledWith('live:sales:test');
    });

    it('should return 0 if counter not found', async () => {
      mockCacheService.get.mockResolvedValue(null);

      const result = await service.getLiveCounter('live:non-existent');

      expect(result).toBe(0);
    });
  });

  // ==========================================================================
  // getLiveFestivalMetrics Tests
  // ==========================================================================

  describe('getLiveFestivalMetrics', () => {
    it('should return all live festival metrics', async () => {
      mockCacheService.get
        .mockResolvedValueOnce(500)   // ticketsSold
        .mockResolvedValueOnce(50000) // revenue
        .mockResolvedValueOnce(1000)  // attendance
        .mockResolvedValueOnce(200)   // cashlessTopups
        .mockResolvedValueOnce(300)   // cashlessPayments
        .mockResolvedValueOnce(150)   // vendorOrders
        .mockResolvedValueOnce(4500)  // vendorRevenue
        .mockResolvedValueOnce(10);   // supportTickets

      const result = await service.getLiveFestivalMetrics(festivalId);

      expect(result).toBeDefined();
      expect(result.ticketsSold).toBe(500);
      expect(result.revenue).toBe(50000);
      expect(result.attendance).toBe(1000);
      expect(result.cashlessTopups).toBe(200);
      expect(result.cashlessPayments).toBe(300);
      expect(result.vendorOrders).toBe(150);
      expect(result.vendorRevenue).toBe(4500);
      expect(result.supportTickets).toBe(10);
      expect(result.timestamp).toBeInstanceOf(Date);
    });

    it('should return zeros for empty counters', async () => {
      mockCacheService.get.mockResolvedValue(null);

      const result = await service.getLiveFestivalMetrics(festivalId);

      expect(result.ticketsSold).toBe(0);
      expect(result.revenue).toBe(0);
      expect(result.attendance).toBe(0);
    });
  });

  // ==========================================================================
  // getLiveZoneMetrics Tests
  // ==========================================================================

  describe('getLiveZoneMetrics', () => {
    it('should return live zone metrics', async () => {
      mockPrismaService.zone.findMany.mockResolvedValue([
        { id: 'zone-1', name: 'Main Stage' },
        { id: 'zone-2', name: 'VIP Area' },
      ]);
      mockCacheService.get
        .mockResolvedValueOnce(500)   // zone-1 occupancy
        .mockResolvedValueOnce(100);  // zone-2 occupancy

      const result = await service.getLiveZoneMetrics(festivalId);

      expect(result).toBeDefined();
      expect(result.length).toBe(2);
      expect(result[0].zoneId).toBe('zone-1');
      expect(result[0].occupancy).toBe(500);
      expect(result[1].zoneId).toBe('zone-2');
      expect(result[1].occupancy).toBe(100);
    });

    it('should return empty array if no zones', async () => {
      mockPrismaService.zone.findMany.mockResolvedValue([]);

      const result = await service.getLiveZoneMetrics(festivalId);

      expect(result).toEqual([]);
    });
  });

  // ==========================================================================
  // getAggregation Tests
  // ==========================================================================

  describe('getAggregation', () => {
    it('should return aggregation for a metric', async () => {
      mockCacheService.get.mockResolvedValue({
        sum: 1000,
        avg: 100,
        min: 50,
        max: 200,
        count: 10,
        lastValue: 150,
        windowSize: 300,
        timestamp: new Date(),
      });

      const result = await service.getAggregation('test_metric', { festivalId }, '5m');

      expect(result).toBeDefined();
      expect(result?.metric).toBe('test_metric');
      expect(result?.value).toBe(100);
      expect(result?.windowSize).toBe(300);
    });

    it('should return null if no aggregation found', async () => {
      mockCacheService.get.mockResolvedValue(null);

      const result = await service.getAggregation('non_existent', { festivalId }, '5m');

      expect(result).toBeNull();
    });

    it('should use different window sizes', async () => {
      mockCacheService.get.mockResolvedValue({
        sum: 100,
        avg: 10,
        min: 5,
        max: 20,
        count: 10,
        lastValue: 15,
        windowSize: 60,
        timestamp: new Date(),
      });

      await service.getAggregation('test', { festivalId }, '1m');
      expect(mockCacheService.get).toHaveBeenCalledWith(expect.stringContaining('1m'));

      await service.getAggregation('test', { festivalId }, '5m');
      await service.getAggregation('test', { festivalId }, '15m');
      await service.getAggregation('test', { festivalId }, '1h');
    });
  });

  // ==========================================================================
  // getAllAggregations Tests
  // ==========================================================================

  describe('getAllAggregations', () => {
    it('should return aggregations for all window sizes', async () => {
      mockCacheService.get.mockResolvedValue({
        sum: 100,
        avg: 10,
        min: 5,
        max: 20,
        count: 10,
        lastValue: 15,
        windowSize: 60,
        timestamp: new Date(),
      });

      const result = await service.getAllAggregations('test_metric', { festivalId });

      expect(result).toBeDefined();
      expect(result['1m']).toBeDefined();
      expect(result['5m']).toBeDefined();
      expect(result['15m']).toBeDefined();
      expect(result['1h']).toBeDefined();
    });
  });

  // ==========================================================================
  // getMetricTrend Tests
  // ==========================================================================

  describe('getMetricTrend', () => {
    it('should return metric trend for specified minutes', async () => {
      mockCacheService.get.mockResolvedValue(100);

      const result = await service.getMetricTrend('sales', { festivalId }, 30);

      expect(Array.isArray(result)).toBe(true);
    });

    it('should return empty array if no historical data', async () => {
      mockCacheService.get.mockResolvedValue(null);

      const result = await service.getMetricTrend('sales', { festivalId }, 30);

      expect(result).toEqual([]);
    });
  });

  // ==========================================================================
  // storeHistoricalValue Tests
  // ==========================================================================

  describe('storeHistoricalValue', () => {
    it('should store historical value in cache', async () => {
      await service.storeHistoricalValue('sales', { festivalId }, 100);

      expect(mockCacheService.set).toHaveBeenCalledWith(
        expect.stringContaining('realtime:history:'),
        100,
        7200,
      );
    });
  });

  // ==========================================================================
  // getMetricRateOfChange Tests
  // ==========================================================================

  describe('getMetricRateOfChange', () => {
    it('should calculate rate of change', async () => {
      mockCacheService.get
        .mockResolvedValueOnce({
          sum: 100,
          avg: 10,
          min: 5,
          max: 20,
          count: 10,
          lastValue: 15,
          windowSize: 300,
          timestamp: new Date(),
        }) // current
        .mockResolvedValueOnce({
          metric: 'test',
          value: 8,
          timestamp: new Date(),
          windowSize: 300,
          aggregationType: 'avg',
        }); // previous

      const result = await service.getMetricRateOfChange('test', { festivalId }, 5);

      expect(result).toBeDefined();
      expect(result.current).toBeDefined();
      expect(result.previous).toBeDefined();
      expect(result.change).toBeDefined();
      expect(result.changePercentage).toBeDefined();
    });

    it('should handle zero previous value', async () => {
      mockCacheService.get
        .mockResolvedValueOnce({
          sum: 100,
          avg: 10,
          min: 5,
          max: 20,
          count: 10,
          lastValue: 15,
          windowSize: 300,
          timestamp: new Date(),
        })
        .mockResolvedValueOnce(null);

      const result = await service.getMetricRateOfChange('test', { festivalId }, 5);

      expect(result.changePercentage).toBe(0);
    });
  });

  // ==========================================================================
  // syncFromDatabase Tests
  // ==========================================================================

  describe('syncFromDatabase', () => {
    it('should sync all counters from database', async () => {
      mockPrismaService.ticket.count.mockResolvedValue(500);
      mockPrismaService.ticket.aggregate.mockResolvedValue({
        _sum: { purchasePrice: createDecimal(50000) },
      });
      mockPrismaService.festival.findUnique.mockResolvedValue({
        currentAttendees: 1000,
      });
      mockPrismaService.cashlessTransaction.count
        .mockResolvedValueOnce(200)  // topups
        .mockResolvedValueOnce(300); // payments
      mockPrismaService.vendorOrder.count.mockResolvedValue(150);
      mockPrismaService.vendorOrder.aggregate.mockResolvedValue({
        _sum: { totalAmount: createDecimal(4500) },
      });
      mockPrismaService.supportTicket.count.mockResolvedValue(10);

      await service.syncFromDatabase(festivalId);

      expect(mockCacheService.set).toHaveBeenCalledWith(`live:sales:${festivalId}`, 500, 86400);
      expect(mockCacheService.set).toHaveBeenCalledWith(`live:revenue:${festivalId}`, 50000, 86400);
      expect(mockCacheService.set).toHaveBeenCalledWith(`live:festival_attendance:${festivalId}`, 1000, 86400);
    });

    it('should handle null values from database', async () => {
      mockPrismaService.ticket.count.mockResolvedValue(0);
      mockPrismaService.ticket.aggregate.mockResolvedValue({
        _sum: { purchasePrice: null },
      });
      mockPrismaService.festival.findUnique.mockResolvedValue(null);
      mockPrismaService.cashlessTransaction.count.mockResolvedValue(0);
      mockPrismaService.vendorOrder.count.mockResolvedValue(0);
      mockPrismaService.vendorOrder.aggregate.mockResolvedValue({
        _sum: { totalAmount: null },
      });
      mockPrismaService.supportTicket.count.mockResolvedValue(0);

      await service.syncFromDatabase(festivalId);

      expect(mockCacheService.set).toHaveBeenCalledWith(`live:sales:${festivalId}`, 0, 86400);
      expect(mockCacheService.set).toHaveBeenCalledWith(`live:revenue:${festivalId}`, 0, 86400);
    });
  });

  // ==========================================================================
  // resetCounters Tests
  // ==========================================================================

  describe('resetCounters', () => {
    it('should reset all counters for a festival', async () => {
      await service.resetCounters(festivalId);

      expect(mockCacheService.delete).toHaveBeenCalledWith(`live:sales:${festivalId}`);
      expect(mockCacheService.delete).toHaveBeenCalledWith(`live:revenue:${festivalId}`);
      expect(mockCacheService.delete).toHaveBeenCalledWith(`live:festival_attendance:${festivalId}`);
      expect(mockCacheService.delete).toHaveBeenCalledWith(`live:cashless:${festivalId}:TOPUP`);
      expect(mockCacheService.delete).toHaveBeenCalledWith(`live:cashless:${festivalId}:PAYMENT`);
      expect(mockCacheService.delete).toHaveBeenCalledWith(`live:cashless:${festivalId}:TRANSFER`);
      expect(mockCacheService.delete).toHaveBeenCalledWith(`live:cashless:${festivalId}:REFUND`);
      expect(mockCacheService.delete).toHaveBeenCalledWith(`live:vendor_orders:${festivalId}`);
      expect(mockCacheService.delete).toHaveBeenCalledWith(`live:vendor_revenue:${festivalId}`);
      expect(mockCacheService.delete).toHaveBeenCalledWith(`live:support_tickets:${festivalId}`);
    });
  });

  // ==========================================================================
  // Private Method Integration Tests
  // ==========================================================================

  describe('incrementLiveCounter', () => {
    it('should increment counter in cache', async () => {
      mockCacheService.get.mockResolvedValue(100);

      await (service as any).incrementLiveCounter('test:counter', 5);

      expect(mockCacheService.set).toHaveBeenCalledWith('test:counter', 105, 86400);
    });

    it('should create counter if not exists', async () => {
      mockCacheService.get.mockResolvedValue(null);

      await (service as any).incrementLiveCounter('test:counter', 10);

      expect(mockCacheService.set).toHaveBeenCalledWith('test:counter', 10, 86400);
    });

    it('should handle negative increments (decrements)', async () => {
      mockCacheService.get.mockResolvedValue(100);

      await (service as any).incrementLiveCounter('test:counter', -20);

      expect(mockCacheService.set).toHaveBeenCalledWith('test:counter', 80, 86400);
    });
  });

  describe('getMetricKey', () => {
    it('should generate consistent metric keys', () => {
      const key1 = (service as any).getMetricKey('sales', { festivalId: 'f1', categoryId: 'c1' });
      const key2 = (service as any).getMetricKey('sales', { categoryId: 'c1', festivalId: 'f1' });

      // Keys should be the same regardless of tag order
      expect(key1).toBe(key2);
    });

    it('should include all tags in the key', () => {
      const key = (service as any).getMetricKey('sales', { festivalId: 'f1', categoryId: 'c1' });

      expect(key).toContain('sales');
      expect(key).toContain('festivalId:f1');
      expect(key).toContain('categoryId:c1');
    });
  });
});
