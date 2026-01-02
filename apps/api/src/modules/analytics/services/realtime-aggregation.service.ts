import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CacheService } from '../../cache/cache.service';
import {
  RealtimeAggregation,
  StreamingMetric,
} from '../interfaces/advanced-metrics.interfaces';
import { Decimal } from '@prisma/client/runtime/library';

interface MetricBuffer {
  values: number[];
  lastFlush: Date;
  windowSize: number;
}

interface AggregatedMetric {
  sum: number;
  count: number;
  min: number;
  max: number;
  lastValue: number;
  lastUpdate: Date;
}

@Injectable()
export class RealtimeAggregationService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RealtimeAggregationService.name);

  // In-memory buffers for streaming metrics
  private metricBuffers: Map<string, MetricBuffer> = new Map();
  private aggregatedMetrics: Map<string, AggregatedMetric> = new Map();
  private intervalHandles: NodeJS.Timeout[] = [];

  // Window sizes in seconds
  private readonly WINDOW_SIZES = {
    '1m': 60,
    '5m': 300,
    '15m': 900,
    '1h': 3600,
  };

  // Flush interval in milliseconds
  private readonly FLUSH_INTERVAL = 10000; // 10 seconds

  constructor(
    private readonly prisma: PrismaService,
    private readonly cacheService: CacheService,
  ) {}

  async onModuleInit() {
    this.logger.log('Initializing realtime aggregation service');
    this.startAggregationTasks();
  }

  async onModuleDestroy() {
    this.logger.log('Shutting down realtime aggregation service');
    this.intervalHandles.forEach(h => clearInterval(h));
  }

  /**
   * Start background aggregation tasks
   */
  private startAggregationTasks() {
    // Flush buffers periodically
    const flushHandle = setInterval(() => {
      this.flushBuffers();
    }, this.FLUSH_INTERVAL);

    // Aggregate metrics every minute
    const aggregateHandle = setInterval(() => {
      this.computeAggregations();
    }, 60000);

    this.intervalHandles.push(flushHandle, aggregateHandle);
  }

  /**
   * Record a streaming metric
   */
  recordMetric(metric: StreamingMetric): void {
    const key = this.getMetricKey(metric.name, metric.tags);

    let buffer = this.metricBuffers.get(key);
    if (!buffer) {
      buffer = {
        values: [],
        lastFlush: new Date(),
        windowSize: this.WINDOW_SIZES['1m'],
      };
      this.metricBuffers.set(key, buffer);
    }

    buffer.values.push(metric.value);

    // Update aggregated metric
    this.updateAggregatedMetric(key, metric.value);
  }

  /**
   * Update aggregated metric in memory
   */
  private updateAggregatedMetric(key: string, value: number): void {
    let agg = this.aggregatedMetrics.get(key);
    if (!agg) {
      agg = {
        sum: 0,
        count: 0,
        min: Infinity,
        max: -Infinity,
        lastValue: 0,
        lastUpdate: new Date(),
      };
      this.aggregatedMetrics.set(key, agg);
    }

    agg.sum += value;
    agg.count += 1;
    agg.min = Math.min(agg.min, value);
    agg.max = Math.max(agg.max, value);
    agg.lastValue = value;
    agg.lastUpdate = new Date();
  }

  /**
   * Flush buffers to cache
   */
  private async flushBuffers(): Promise<void> {
    const now = new Date();

    for (const [key, buffer] of this.metricBuffers.entries()) {
      if (buffer.values.length === 0) continue;

      try {
        // Calculate window aggregations
        const windowData = {
          sum: buffer.values.reduce((a, b) => a + b, 0),
          avg: buffer.values.reduce((a, b) => a + b, 0) / buffer.values.length,
          min: Math.min(...buffer.values),
          max: Math.max(...buffer.values),
          count: buffer.values.length,
          timestamp: now,
        };

        // Store in cache with TTL
        await this.cacheService.set(
          `realtime:window:${key}`,
          windowData,
          buffer.windowSize,
        );

        // Clear buffer
        buffer.values = [];
        buffer.lastFlush = now;
      } catch (error) {
        this.logger.error(`Failed to flush buffer for ${key}`, error);
      }
    }
  }

  /**
   * Compute aggregations for all window sizes
   */
  private async computeAggregations(): Promise<void> {
    const now = new Date();

    for (const [windowName, windowSeconds] of Object.entries(this.WINDOW_SIZES)) {
      try {
        await this.computeWindowAggregations(windowName, windowSeconds, now);
      } catch (error) {
        this.logger.error(`Failed to compute ${windowName} aggregations`, error);
      }
    }
  }

  /**
   * Compute aggregations for a specific window
   */
  private async computeWindowAggregations(
    windowName: string,
    windowSeconds: number,
    now: Date,
  ): Promise<void> {
    const windowStart = new Date(now.getTime() - windowSeconds * 1000);

    for (const [key, agg] of this.aggregatedMetrics.entries()) {
      if (agg.lastUpdate >= windowStart) {
        await this.cacheService.set(
          `realtime:agg:${windowName}:${key}`,
          {
            sum: agg.sum,
            avg: agg.count > 0 ? agg.sum / agg.count : 0,
            min: agg.min === Infinity ? 0 : agg.min,
            max: agg.max === -Infinity ? 0 : agg.max,
            count: agg.count,
            lastValue: agg.lastValue,
            windowSize: windowSeconds,
            timestamp: now,
          },
          windowSeconds * 2, // TTL is 2x window size
        );
      }
    }
  }

  /**
   * Get real-time aggregation for a metric
   */
  async getAggregation(
    metricName: string,
    tags: Record<string, string>,
    windowSize: '1m' | '5m' | '15m' | '1h' = '5m',
  ): Promise<RealtimeAggregation | null> {
    const key = this.getMetricKey(metricName, tags);
    const cacheKey = `realtime:agg:${windowSize}:${key}`;

    const cached = await this.cacheService.get<{
      sum: number;
      avg: number;
      min: number;
      max: number;
      count: number;
      lastValue: number;
      windowSize: number;
      timestamp: Date;
    }>(cacheKey);

    if (!cached) return null;

    return {
      metric: metricName,
      value: cached.avg,
      timestamp: new Date(cached.timestamp),
      windowSize: cached.windowSize,
      aggregationType: 'avg',
    };
  }

  /**
   * Get all aggregations for a metric across all windows
   */
  async getAllAggregations(
    metricName: string,
    tags: Record<string, string>,
  ): Promise<Record<string, RealtimeAggregation | null>> {
    const results: Record<string, RealtimeAggregation | null> = {};

    for (const windowName of Object.keys(this.WINDOW_SIZES)) {
      results[windowName] = await this.getAggregation(
        metricName,
        tags,
        windowName as '1m' | '5m' | '15m' | '1h',
      );
    }

    return results;
  }

  /**
   * Record ticket sale event
   */
  async recordTicketSale(
    festivalId: string,
    categoryId: string,
    price: number,
  ): Promise<void> {
    this.recordMetric({
      name: 'ticket_sales',
      value: 1,
      timestamp: new Date(),
      tags: { festivalId, categoryId },
    });

    this.recordMetric({
      name: 'ticket_revenue',
      value: price,
      timestamp: new Date(),
      tags: { festivalId, categoryId },
    });

    // Update live counters
    await this.incrementLiveCounter(`live:sales:${festivalId}`, 1);
    await this.incrementLiveCounter(`live:revenue:${festivalId}`, price);
  }

  /**
   * Record cashless transaction
   */
  async recordCashlessTransaction(
    festivalId: string,
    type: 'TOPUP' | 'PAYMENT' | 'TRANSFER' | 'REFUND',
    amount: number,
    vendorId?: string,
  ): Promise<void> {
    this.recordMetric({
      name: `cashless_${type.toLowerCase()}`,
      value: amount,
      timestamp: new Date(),
      tags: { festivalId, vendorId: vendorId || 'none' },
    });

    this.recordMetric({
      name: 'cashless_transactions',
      value: 1,
      timestamp: new Date(),
      tags: { festivalId, type },
    });

    await this.incrementLiveCounter(`live:cashless:${festivalId}:${type}`, 1);
    await this.incrementLiveCounter(`live:cashless_amount:${festivalId}:${type}`, amount);
  }

  /**
   * Record zone entry/exit
   */
  async recordZoneAccess(
    festivalId: string,
    zoneId: string,
    action: 'ENTRY' | 'EXIT',
  ): Promise<void> {
    this.recordMetric({
      name: `zone_${action.toLowerCase()}`,
      value: 1,
      timestamp: new Date(),
      tags: { festivalId, zoneId },
    });

    const delta = action === 'ENTRY' ? 1 : -1;
    await this.incrementLiveCounter(`live:zone_occupancy:${zoneId}`, delta);
    await this.incrementLiveCounter(`live:festival_attendance:${festivalId}`, delta);
  }

  /**
   * Record vendor order
   */
  async recordVendorOrder(
    festivalId: string,
    vendorId: string,
    amount: number,
    status: string,
  ): Promise<void> {
    this.recordMetric({
      name: 'vendor_orders',
      value: 1,
      timestamp: new Date(),
      tags: { festivalId, vendorId, status },
    });

    this.recordMetric({
      name: 'vendor_revenue',
      value: amount,
      timestamp: new Date(),
      tags: { festivalId, vendorId },
    });

    await this.incrementLiveCounter(`live:vendor_orders:${festivalId}`, 1);
    await this.incrementLiveCounter(`live:vendor_revenue:${festivalId}`, amount);
  }

  /**
   * Record support ticket
   */
  async recordSupportTicket(
    festivalId: string,
    priority: string,
    category: string,
  ): Promise<void> {
    this.recordMetric({
      name: 'support_tickets',
      value: 1,
      timestamp: new Date(),
      tags: { festivalId, priority, category },
    });

    await this.incrementLiveCounter(`live:support_tickets:${festivalId}`, 1);
  }

  /**
   * Increment a live counter in cache
   */
  private async incrementLiveCounter(key: string, delta: number): Promise<void> {
    const current = await this.cacheService.get<number>(key) || 0;
    await this.cacheService.set(key, current + delta, 86400); // 24 hour TTL
  }

  /**
   * Get live counter value
   */
  async getLiveCounter(key: string): Promise<number> {
    return (await this.cacheService.get<number>(key)) || 0;
  }

  /**
   * Get live festival metrics
   */
  async getLiveFestivalMetrics(festivalId: string): Promise<{
    ticketsSold: number;
    revenue: number;
    attendance: number;
    cashlessTopups: number;
    cashlessPayments: number;
    vendorOrders: number;
    vendorRevenue: number;
    supportTickets: number;
    timestamp: Date;
  }> {
    const [
      ticketsSold,
      revenue,
      attendance,
      cashlessTopups,
      cashlessPayments,
      vendorOrders,
      vendorRevenue,
      supportTickets,
    ] = await Promise.all([
      this.getLiveCounter(`live:sales:${festivalId}`),
      this.getLiveCounter(`live:revenue:${festivalId}`),
      this.getLiveCounter(`live:festival_attendance:${festivalId}`),
      this.getLiveCounter(`live:cashless:${festivalId}:TOPUP`),
      this.getLiveCounter(`live:cashless:${festivalId}:PAYMENT`),
      this.getLiveCounter(`live:vendor_orders:${festivalId}`),
      this.getLiveCounter(`live:vendor_revenue:${festivalId}`),
      this.getLiveCounter(`live:support_tickets:${festivalId}`),
    ]);

    return {
      ticketsSold,
      revenue,
      attendance,
      cashlessTopups,
      cashlessPayments,
      vendorOrders,
      vendorRevenue,
      supportTickets,
      timestamp: new Date(),
    };
  }

  /**
   * Get live zone metrics
   */
  async getLiveZoneMetrics(
    festivalId: string,
  ): Promise<{ zoneId: string; occupancy: number }[]> {
    const zones = await this.prisma.zone.findMany({
      where: { festivalId, isActive: true },
      select: { id: true, name: true },
    });

    const metrics = await Promise.all(
      zones.map(async (zone) => ({
        zoneId: zone.id,
        zoneName: zone.name,
        occupancy: await this.getLiveCounter(`live:zone_occupancy:${zone.id}`),
      })),
    );

    return metrics;
  }

  /**
   * Get metric trend for last N minutes
   */
  async getMetricTrend(
    metricName: string,
    tags: Record<string, string>,
    minutes: number = 60,
  ): Promise<{ timestamp: Date; value: number }[]> {
    const key = this.getMetricKey(metricName, tags);
    const points: { timestamp: Date; value: number }[] = [];

    // Get historical aggregations from cache
    const now = new Date();
    for (let i = 0; i < minutes; i++) {
      const timestamp = new Date(now.getTime() - i * 60 * 1000);
      const cacheKey = `realtime:history:${key}:${timestamp.toISOString().slice(0, 16)}`;

      const value = await this.cacheService.get<number>(cacheKey);
      if (value !== null) {
        points.push({ timestamp, value });
      }
    }

    return points.reverse();
  }

  /**
   * Store historical metric value
   */
  async storeHistoricalValue(
    metricName: string,
    tags: Record<string, string>,
    value: number,
  ): Promise<void> {
    const key = this.getMetricKey(metricName, tags);
    const timestamp = new Date().toISOString().slice(0, 16); // Minute precision
    const cacheKey = `realtime:history:${key}:${timestamp}`;

    await this.cacheService.set(cacheKey, value, 7200); // 2 hour TTL
  }

  /**
   * Get rate of change for a metric
   */
  async getMetricRateOfChange(
    metricName: string,
    tags: Record<string, string>,
    periodMinutes: number = 5,
  ): Promise<{
    current: number;
    previous: number;
    change: number;
    changePercentage: number;
  }> {
    const key = this.getMetricKey(metricName, tags);

    const [current, previous] = await Promise.all([
      this.getAggregation(metricName, tags, '5m'),
      this.cacheService.get<RealtimeAggregation>(
        `realtime:agg:5m:${key}:previous`,
      ),
    ]);

    const currentValue = current?.value || 0;
    const previousValue = previous?.value || 0;
    const change = currentValue - previousValue;
    const changePercentage = previousValue !== 0
      ? (change / previousValue) * 100
      : 0;

    return {
      current: currentValue,
      previous: previousValue,
      change,
      changePercentage,
    };
  }

  /**
   * Sync counters from database (periodic reconciliation)
   */
  async syncFromDatabase(festivalId: string): Promise<void> {
    this.logger.log(`Syncing realtime counters for festival ${festivalId}`);

    const [
      ticketCount,
      ticketRevenue,
      attendance,
      cashlessTopups,
      cashlessPayments,
      vendorOrders,
      vendorRevenue,
      supportTickets,
    ] = await Promise.all([
      this.prisma.ticket.count({
        where: { festivalId, status: { in: ['SOLD', 'USED'] } },
      }),
      this.prisma.ticket.aggregate({
        where: { festivalId, status: { in: ['SOLD', 'USED'] } },
        _sum: { purchasePrice: true },
      }),
      this.prisma.festival.findUnique({
        where: { id: festivalId },
        select: { currentAttendees: true },
      }),
      this.prisma.cashlessTransaction.count({
        where: { festivalId, type: 'TOPUP' },
      }),
      this.prisma.cashlessTransaction.count({
        where: { festivalId, type: 'PAYMENT' },
      }),
      this.prisma.vendorOrder.count({
        where: { vendor: { festivalId } },
      }),
      this.prisma.vendorOrder.aggregate({
        where: { vendor: { festivalId }, status: { in: ['DELIVERED', 'CONFIRMED'] } },
        _sum: { totalAmount: true },
      }),
      this.prisma.supportTicket.count({
        where: { festivalId },
      }),
    ]);

    await Promise.all([
      this.cacheService.set(`live:sales:${festivalId}`, ticketCount, 86400),
      this.cacheService.set(
        `live:revenue:${festivalId}`,
        Number(ticketRevenue._sum.purchasePrice) || 0,
        86400,
      ),
      this.cacheService.set(
        `live:festival_attendance:${festivalId}`,
        attendance?.currentAttendees || 0,
        86400,
      ),
      this.cacheService.set(`live:cashless:${festivalId}:TOPUP`, cashlessTopups, 86400),
      this.cacheService.set(`live:cashless:${festivalId}:PAYMENT`, cashlessPayments, 86400),
      this.cacheService.set(`live:vendor_orders:${festivalId}`, vendorOrders, 86400),
      this.cacheService.set(
        `live:vendor_revenue:${festivalId}`,
        Number(vendorRevenue._sum.totalAmount) || 0,
        86400,
      ),
      this.cacheService.set(`live:support_tickets:${festivalId}`, supportTickets, 86400),
    ]);

    this.logger.log(`Synced realtime counters for festival ${festivalId}`);
  }

  /**
   * Reset all counters for a festival
   */
  async resetCounters(festivalId: string): Promise<void> {
    const keys = [
      `live:sales:${festivalId}`,
      `live:revenue:${festivalId}`,
      `live:festival_attendance:${festivalId}`,
      `live:cashless:${festivalId}:TOPUP`,
      `live:cashless:${festivalId}:PAYMENT`,
      `live:cashless:${festivalId}:TRANSFER`,
      `live:cashless:${festivalId}:REFUND`,
      `live:vendor_orders:${festivalId}`,
      `live:vendor_revenue:${festivalId}`,
      `live:support_tickets:${festivalId}`,
    ];

    await Promise.all(keys.map(key => this.cacheService.delete(key)));
    this.logger.log(`Reset all counters for festival ${festivalId}`);
  }

  // Helper methods

  private getMetricKey(name: string, tags: Record<string, string>): string {
    const tagStr = Object.entries(tags)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => `${k}:${v}`)
      .join(',');
    return `${name}:${tagStr}`;
  }

  private decimalToNumber(value: Decimal | null): number {
    return value ? Number(value) : 0;
  }
}
