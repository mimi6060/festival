import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/**
 * Metric Types
 */
export enum MetricType {
  COUNTER = 'counter',
  GAUGE = 'gauge',
  HISTOGRAM = 'histogram',
  SUMMARY = 'summary',
}

/**
 * Metric Labels
 */
export type MetricLabels = Record<string, string | number>;

/**
 * Histogram Buckets Configuration
 */
export interface HistogramConfig {
  name: string;
  help: string;
  labelNames?: string[];
  buckets?: number[];
}

/**
 * Internal metric storage
 */
interface MetricData {
  type: MetricType;
  help: string;
  labelNames: string[];
  values: Map<string, number>;
  histogramData?: Map<string, { buckets: Map<number, number>; sum: number; count: number }>;
}

/**
 * Metrics Service for Prometheus-compatible monitoring
 *
 * Features:
 * - Custom business metrics
 * - HTTP request metrics
 * - Database query metrics
 * - Cache hit/miss metrics
 * - WebSocket connection metrics
 * - Festival-specific metrics
 */
@Injectable()
export class MetricsService implements OnModuleInit {
  private readonly logger = new Logger(MetricsService.name);

  // Metric storage
  private metrics = new Map<string, MetricData>();

  // Default histogram buckets (in milliseconds for latency)
  private readonly DEFAULT_LATENCY_BUCKETS = [
    5, 10, 25, 50, 100, 250, 500, 1000, 2500, 5000, 10000,
  ];
  private readonly DEFAULT_SIZE_BUCKETS = [100, 500, 1000, 5000, 10000, 50000, 100000];

  // Start time for uptime calculation
  private readonly startTime = Date.now();

  constructor(private readonly configService: ConfigService) {}

  onModuleInit(): void {
    this.initializeDefaultMetrics();
    this.logger.log('Metrics service initialized');
  }

  /**
   * Initialize default application metrics
   */
  private initializeDefaultMetrics(): void {
    // HTTP Metrics
    this.createCounter({
      name: 'http_requests_total',
      help: 'Total number of HTTP requests',
      labelNames: ['method', 'path', 'status'],
    });

    this.createHistogram({
      name: 'http_request_duration_ms',
      help: 'HTTP request duration in milliseconds',
      labelNames: ['method', 'path', 'status'],
      buckets: this.DEFAULT_LATENCY_BUCKETS,
    });

    this.createCounter({
      name: 'http_errors_total',
      help: 'Total number of HTTP errors',
      labelNames: ['method', 'path', 'status', 'error_type'],
    });

    // Database Metrics
    this.createCounter({
      name: 'db_queries_total',
      help: 'Total number of database queries',
      labelNames: ['operation', 'model'],
    });

    this.createHistogram({
      name: 'db_query_duration_ms',
      help: 'Database query duration in milliseconds',
      labelNames: ['operation', 'model'],
      buckets: this.DEFAULT_LATENCY_BUCKETS,
    });

    this.createCounter({
      name: 'db_errors_total',
      help: 'Total number of database errors',
      labelNames: ['operation', 'model', 'error_type'],
    });

    // Cache Metrics
    this.createCounter({
      name: 'cache_hits_total',
      help: 'Total number of cache hits',
      labelNames: ['cache_type'],
    });

    this.createCounter({
      name: 'cache_misses_total',
      help: 'Total number of cache misses',
      labelNames: ['cache_type'],
    });

    this.createGauge({
      name: 'cache_keys_count',
      help: 'Current number of keys in cache',
      labelNames: ['cache_type'],
    });

    // WebSocket Metrics
    this.createGauge({
      name: 'websocket_connections_active',
      help: 'Number of active WebSocket connections',
      labelNames: ['namespace'],
    });

    this.createCounter({
      name: 'websocket_messages_total',
      help: 'Total number of WebSocket messages',
      labelNames: ['namespace', 'event', 'direction'],
    });

    // Business Metrics - Tickets
    this.createCounter({
      name: 'tickets_sold_total',
      help: 'Total number of tickets sold',
      labelNames: ['festival_id', 'ticket_type'],
    });

    this.createCounter({
      name: 'tickets_validated_total',
      help: 'Total number of tickets validated at entry',
      labelNames: ['festival_id', 'zone_id'],
    });

    this.createCounter({
      name: 'tickets_refunded_total',
      help: 'Total number of tickets refunded',
      labelNames: ['festival_id', 'ticket_type'],
    });

    // Business Metrics - Payments
    this.createCounter({
      name: 'payments_total',
      help: 'Total number of payments',
      labelNames: ['festival_id', 'provider', 'status'],
    });

    this.createCounter({
      name: 'payments_amount_total',
      help: 'Total payment amount (in cents)',
      labelNames: ['festival_id', 'provider', 'currency'],
    });

    // Business Metrics - Cashless
    this.createCounter({
      name: 'cashless_topups_total',
      help: 'Total number of cashless topups',
      labelNames: ['festival_id'],
    });

    this.createCounter({
      name: 'cashless_topup_amount_total',
      help: 'Total cashless topup amount (in cents)',
      labelNames: ['festival_id', 'currency'],
    });

    this.createCounter({
      name: 'cashless_payments_total',
      help: 'Total number of cashless payments',
      labelNames: ['festival_id', 'vendor_type'],
    });

    this.createCounter({
      name: 'cashless_payment_amount_total',
      help: 'Total cashless payment amount (in cents)',
      labelNames: ['festival_id', 'currency'],
    });

    // Business Metrics - Zones
    this.createGauge({
      name: 'zone_occupancy_current',
      help: 'Current zone occupancy',
      labelNames: ['festival_id', 'zone_id', 'zone_name'],
    });

    this.createGauge({
      name: 'zone_occupancy_percentage',
      help: 'Current zone occupancy as percentage of capacity',
      labelNames: ['festival_id', 'zone_id', 'zone_name'],
    });

    this.createCounter({
      name: 'zone_entries_total',
      help: 'Total zone entries',
      labelNames: ['festival_id', 'zone_id'],
    });

    this.createCounter({
      name: 'zone_exits_total',
      help: 'Total zone exits',
      labelNames: ['festival_id', 'zone_id'],
    });

    // Business Metrics - Vendors
    this.createCounter({
      name: 'vendor_orders_total',
      help: 'Total number of vendor orders',
      labelNames: ['festival_id', 'vendor_id', 'status'],
    });

    this.createCounter({
      name: 'vendor_revenue_total',
      help: 'Total vendor revenue (in cents)',
      labelNames: ['festival_id', 'vendor_id', 'currency'],
    });

    // System Metrics
    this.createGauge({
      name: 'process_uptime_seconds',
      help: 'Process uptime in seconds',
    });

    this.createGauge({
      name: 'process_memory_heap_bytes',
      help: 'Process heap memory usage in bytes',
    });

    this.createGauge({
      name: 'process_memory_rss_bytes',
      help: 'Process RSS memory usage in bytes',
    });

    this.createGauge({
      name: 'nodejs_active_handles',
      help: 'Number of active handles',
    });

    // Festival-specific metrics
    this.createGauge({
      name: 'festival_attendees_current',
      help: 'Current number of attendees at festival',
      labelNames: ['festival_id'],
    });

    this.createGauge({
      name: 'festival_capacity_percentage',
      help: 'Festival capacity utilization percentage',
      labelNames: ['festival_id'],
    });
  }

  // ==================== METRIC CREATION ====================

  /**
   * Create a counter metric
   */
  createCounter(config: { name: string; help: string; labelNames?: string[] }): void {
    this.metrics.set(config.name, {
      type: MetricType.COUNTER,
      help: config.help,
      labelNames: config.labelNames || [],
      values: new Map(),
    });
  }

  /**
   * Create a gauge metric
   */
  createGauge(config: { name: string; help: string; labelNames?: string[] }): void {
    this.metrics.set(config.name, {
      type: MetricType.GAUGE,
      help: config.help,
      labelNames: config.labelNames || [],
      values: new Map(),
    });
  }

  /**
   * Create a histogram metric
   */
  createHistogram(config: HistogramConfig): void {
    const buckets = config.buckets || this.DEFAULT_LATENCY_BUCKETS;
    this.metrics.set(config.name, {
      type: MetricType.HISTOGRAM,
      help: config.help,
      labelNames: config.labelNames || [],
      values: new Map(),
      histogramData: new Map(),
    });

    // Store bucket configuration
    this.metrics.set(`${config.name}_buckets`, {
      type: MetricType.HISTOGRAM,
      help: `Bucket configuration for ${config.name}`,
      labelNames: [],
      values: new Map(buckets.map((b, i) => [String(i), b])),
    });
  }

  // ==================== METRIC OPERATIONS ====================

  /**
   * Increment a counter
   */
  incrementCounter(name: string, labels?: MetricLabels, value = 1): void {
    const metric = this.metrics.get(name);
    if (metric?.type !== MetricType.COUNTER) {
      this.logger.warn(`Counter metric not found: ${name}`);
      return;
    }

    const key = this.labelsToKey(labels);
    const current = metric.values.get(key) || 0;
    metric.values.set(key, current + value);
  }

  /**
   * Set a gauge value
   */
  setGauge(name: string, value: number, labels?: MetricLabels): void {
    const metric = this.metrics.get(name);
    if (metric?.type !== MetricType.GAUGE) {
      this.logger.warn(`Gauge metric not found: ${name}`);
      return;
    }

    const key = this.labelsToKey(labels);
    metric.values.set(key, value);
  }

  /**
   * Increment a gauge
   */
  incrementGauge(name: string, labels?: MetricLabels, value = 1): void {
    const metric = this.metrics.get(name);
    if (metric?.type !== MetricType.GAUGE) {
      this.logger.warn(`Gauge metric not found: ${name}`);
      return;
    }

    const key = this.labelsToKey(labels);
    const current = metric.values.get(key) || 0;
    metric.values.set(key, current + value);
  }

  /**
   * Decrement a gauge
   */
  decrementGauge(name: string, labels?: MetricLabels, value = 1): void {
    this.incrementGauge(name, labels, -value);
  }

  /**
   * Observe a histogram value
   */
  observeHistogram(name: string, value: number, labels?: MetricLabels): void {
    const metric = this.metrics.get(name);
    const bucketsMetric = this.metrics.get(`${name}_buckets`);

    if (metric?.type !== MetricType.HISTOGRAM || !bucketsMetric) {
      this.logger.warn(`Histogram metric not found: ${name}`);
      return;
    }

    const key = this.labelsToKey(labels);
    const buckets = Array.from(bucketsMetric.values.values());

    if (!metric.histogramData!.has(key)) {
      metric.histogramData!.set(key, {
        buckets: new Map(buckets.map((b) => [b, 0])),
        sum: 0,
        count: 0,
      });
    }

    const data = metric.histogramData!.get(key)!;
    data.sum += value;
    data.count += 1;

    // Update bucket counts
    for (const bucket of buckets) {
      if (value <= bucket) {
        data.buckets.set(bucket, (data.buckets.get(bucket) || 0) + 1);
      }
    }
  }

  // ==================== HELPER METHODS FOR COMMON METRICS ====================

  /**
   * Record HTTP request metrics
   */
  recordHttpRequest(method: string, path: string, statusCode: number, durationMs: number): void {
    const status = String(statusCode);
    const labels = { method, path, status };

    this.incrementCounter('http_requests_total', labels);
    this.observeHistogram('http_request_duration_ms', durationMs, labels);

    if (statusCode >= 400) {
      this.incrementCounter('http_errors_total', {
        ...labels,
        error_type: statusCode >= 500 ? 'server_error' : 'client_error',
      });
    }
  }

  /**
   * Record database query metrics
   */
  recordDbQuery(operation: string, model: string, durationMs: number, error?: string): void {
    const labels = { operation, model };

    this.incrementCounter('db_queries_total', labels);
    this.observeHistogram('db_query_duration_ms', durationMs, labels);

    if (error) {
      this.incrementCounter('db_errors_total', { ...labels, error_type: error });
    }
  }

  /**
   * Record cache hit
   */
  recordCacheHit(cacheType = 'redis'): void {
    this.incrementCounter('cache_hits_total', { cache_type: cacheType });
  }

  /**
   * Record cache miss
   */
  recordCacheMiss(cacheType = 'redis'): void {
    this.incrementCounter('cache_misses_total', { cache_type: cacheType });
  }

  /**
   * Update cache keys count
   */
  setCacheKeysCount(count: number, cacheType = 'redis'): void {
    this.setGauge('cache_keys_count', count, { cache_type: cacheType });
  }

  /**
   * Record ticket sale
   */
  recordTicketSale(festivalId: string, ticketType: string): void {
    this.incrementCounter('tickets_sold_total', {
      festival_id: festivalId,
      ticket_type: ticketType,
    });
  }

  /**
   * Record ticket validation
   */
  recordTicketValidation(festivalId: string, zoneId: string): void {
    this.incrementCounter('tickets_validated_total', { festival_id: festivalId, zone_id: zoneId });
  }

  /**
   * Record payment
   */
  recordPayment(
    festivalId: string,
    provider: string,
    status: string,
    amountCents: number,
    currency: string
  ): void {
    this.incrementCounter('payments_total', { festival_id: festivalId, provider, status });
    if (status === 'completed') {
      this.incrementCounter(
        'payments_amount_total',
        { festival_id: festivalId, provider, currency },
        amountCents
      );
    }
  }

  /**
   * Record cashless topup
   */
  recordCashlessTopup(festivalId: string, amountCents: number, currency: string): void {
    this.incrementCounter('cashless_topups_total', { festival_id: festivalId });
    this.incrementCounter(
      'cashless_topup_amount_total',
      { festival_id: festivalId, currency },
      amountCents
    );
  }

  /**
   * Record cashless payment
   */
  recordCashlessPayment(
    festivalId: string,
    vendorType: string,
    amountCents: number,
    currency: string
  ): void {
    this.incrementCounter('cashless_payments_total', {
      festival_id: festivalId,
      vendor_type: vendorType,
    });
    this.incrementCounter(
      'cashless_payment_amount_total',
      { festival_id: festivalId, currency },
      amountCents
    );
  }

  /**
   * Update zone occupancy
   */
  updateZoneOccupancy(
    festivalId: string,
    zoneId: string,
    zoneName: string,
    current: number,
    capacity: number
  ): void {
    const labels = { festival_id: festivalId, zone_id: zoneId, zone_name: zoneName };
    this.setGauge('zone_occupancy_current', current, labels);
    this.setGauge(
      'zone_occupancy_percentage',
      capacity > 0 ? (current / capacity) * 100 : 0,
      labels
    );
  }

  /**
   * Record zone entry
   */
  recordZoneEntry(festivalId: string, zoneId: string): void {
    this.incrementCounter('zone_entries_total', { festival_id: festivalId, zone_id: zoneId });
  }

  /**
   * Record zone exit
   */
  recordZoneExit(festivalId: string, zoneId: string): void {
    this.incrementCounter('zone_exits_total', { festival_id: festivalId, zone_id: zoneId });
  }

  /**
   * Update festival attendance
   */
  updateFestivalAttendance(festivalId: string, current: number, maxCapacity: number): void {
    this.setGauge('festival_attendees_current', current, { festival_id: festivalId });
    this.setGauge(
      'festival_capacity_percentage',
      maxCapacity > 0 ? (current / maxCapacity) * 100 : 0,
      { festival_id: festivalId }
    );
  }

  /**
   * Record WebSocket connection
   */
  recordWebSocketConnect(namespace: string): void {
    this.incrementGauge('websocket_connections_active', { namespace });
  }

  /**
   * Record WebSocket disconnection
   */
  recordWebSocketDisconnect(namespace: string): void {
    this.decrementGauge('websocket_connections_active', { namespace });
  }

  /**
   * Record WebSocket message
   */
  recordWebSocketMessage(namespace: string, event: string, direction: 'in' | 'out'): void {
    this.incrementCounter('websocket_messages_total', { namespace, event, direction });
  }

  // ==================== METRICS OUTPUT ====================

  /**
   * Generate Prometheus-compatible metrics output
   */
  getPrometheusMetrics(): string {
    this.updateSystemMetrics();

    const lines: string[] = [];

    for (const [name, metric] of this.metrics.entries()) {
      // Skip bucket configuration metrics
      if (name.endsWith('_buckets')) {
        continue;
      }

      // Add HELP and TYPE
      lines.push(`# HELP ${name} ${metric.help}`);
      lines.push(`# TYPE ${name} ${metric.type}`);

      if (metric.type === MetricType.HISTOGRAM) {
        // Output histogram data
        for (const [labelKey, data] of metric.histogramData!.entries()) {
          const labelStr = this.keyToLabelString(labelKey, metric.labelNames);

          // Output bucket counts
          const bucketsMetric = this.metrics.get(`${name}_buckets`);
          if (bucketsMetric) {
            const buckets = Array.from(bucketsMetric.values.values()).sort((a, b) => a - b);
            let cumulative = 0;
            for (const bucket of buckets) {
              cumulative += data.buckets.get(bucket) || 0;
              const bucketLabel = labelStr ? `${labelStr},le="${bucket}"` : `le="${bucket}"`;
              lines.push(`${name}_bucket{${bucketLabel}} ${cumulative}`);
            }
            // Add +Inf bucket
            const infLabel = labelStr ? `${labelStr},le="+Inf"` : `le="+Inf"`;
            lines.push(`${name}_bucket{${infLabel}} ${data.count}`);
          }

          // Output sum and count
          const sumLabel = labelStr ? `{${labelStr}}` : '';
          lines.push(`${name}_sum${sumLabel} ${data.sum}`);
          lines.push(`${name}_count${sumLabel} ${data.count}`);
        }
      } else {
        // Output counter or gauge values
        for (const [labelKey, value] of metric.values.entries()) {
          const labelStr = this.keyToLabelString(labelKey, metric.labelNames);
          if (labelStr) {
            lines.push(`${name}{${labelStr}} ${value}`);
          } else {
            lines.push(`${name} ${value}`);
          }
        }
      }

      lines.push(''); // Empty line between metrics
    }

    return lines.join('\n');
  }

  /**
   * Get metrics as JSON
   */
  getMetricsJson(): Record<string, any> {
    this.updateSystemMetrics();

    const result: Record<string, any> = {};

    for (const [name, metric] of this.metrics.entries()) {
      if (name.endsWith('_buckets')) {
        continue;
      }

      if (metric.type === MetricType.HISTOGRAM) {
        result[name] = {
          type: metric.type,
          help: metric.help,
          data: Array.from(metric.histogramData!.entries()).map(([key, data]) => ({
            labels: this.keyToLabels(key, metric.labelNames),
            sum: data.sum,
            count: data.count,
            buckets: Object.fromEntries(data.buckets),
          })),
        };
      } else {
        result[name] = {
          type: metric.type,
          help: metric.help,
          values: Array.from(metric.values.entries()).map(([key, value]) => ({
            labels: this.keyToLabels(key, metric.labelNames),
            value,
          })),
        };
      }
    }

    return result;
  }

  // ==================== PRIVATE HELPERS ====================

  private updateSystemMetrics(): void {
    const memUsage = process.memoryUsage();
    this.setGauge('process_uptime_seconds', (Date.now() - this.startTime) / 1000);
    this.setGauge('process_memory_heap_bytes', memUsage.heapUsed);
    this.setGauge('process_memory_rss_bytes', memUsage.rss);

    // @ts-expect-error - _getActiveHandles is internal but useful
    const activeHandles = process._getActiveHandles?.()?.length || 0;
    this.setGauge('nodejs_active_handles', activeHandles);
  }

  private labelsToKey(labels?: MetricLabels): string {
    if (!labels || Object.keys(labels).length === 0) {
      return '';
    }
    return Object.entries(labels)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => `${k}="${v}"`)
      .join(',');
  }

  private keyToLabelString(key: string, _labelNames: string[]): string {
    return key;
  }

  private keyToLabels(key: string, _labelNames: string[]): Record<string, string> {
    if (!key) {
      return {};
    }

    const labels: Record<string, string> = {};
    const pairs = key.split(',');

    for (const pair of pairs) {
      const match = pair.match(/(.+?)="(.+?)"/);
      if (match) {
        labels[match[1]] = match[2];
      }
    }

    return labels;
  }
}
