/**
 * MetricsService Unit Tests
 *
 * Comprehensive tests for the metrics service including:
 * - Counter metric operations
 * - Gauge metric operations
 * - Histogram metric operations
 * - HTTP request recording
 * - Database query recording
 * - Cache metrics
 * - Business metrics (tickets, payments, cashless)
 * - Prometheus format output
 * - JSON format output
 */

import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { MetricsService, MetricType } from './metrics.service';

describe('MetricsService', () => {
  let service: MetricsService;

  const mockConfigService = {
    get: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MetricsService,
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<MetricsService>(MetricsService);
    service.onModuleInit();
  });

  // ==========================================================================
  // Constructor Tests
  // ==========================================================================

  describe('constructor', () => {
    it('should be defined', () => {
      expect(service).toBeDefined();
    });
  });

  // ==========================================================================
  // onModuleInit() Tests
  // ==========================================================================

  describe('onModuleInit', () => {
    it('should initialize default metrics', () => {
      const metrics = service.getMetricsJson();

      // Check HTTP metrics exist
      expect(metrics).toHaveProperty('http_requests_total');
      expect(metrics).toHaveProperty('http_request_duration_ms');
      expect(metrics).toHaveProperty('http_errors_total');

      // Check database metrics exist
      expect(metrics).toHaveProperty('db_queries_total');
      expect(metrics).toHaveProperty('db_query_duration_ms');
      expect(metrics).toHaveProperty('db_errors_total');

      // Check cache metrics exist
      expect(metrics).toHaveProperty('cache_hits_total');
      expect(metrics).toHaveProperty('cache_misses_total');

      // Check business metrics exist
      expect(metrics).toHaveProperty('tickets_sold_total');
      expect(metrics).toHaveProperty('payments_total');
      expect(metrics).toHaveProperty('cashless_topups_total');
    });
  });

  // ==========================================================================
  // Counter Metric Tests
  // ==========================================================================

  describe('createCounter', () => {
    it('should create a counter metric', () => {
      service.createCounter({
        name: 'test_counter',
        help: 'A test counter',
        labelNames: ['label1', 'label2'],
      });

      const metrics = service.getMetricsJson();
      expect(metrics).toHaveProperty('test_counter');
      expect(metrics['test_counter'].type).toBe(MetricType.COUNTER);
      expect(metrics['test_counter'].help).toBe('A test counter');
    });
  });

  describe('incrementCounter', () => {
    it('should increment a counter by 1', () => {
      service.createCounter({ name: 'test_inc', help: 'Test' });

      service.incrementCounter('test_inc');
      service.incrementCounter('test_inc');
      service.incrementCounter('test_inc');

      const metrics = service.getMetricsJson();
      expect(metrics['test_inc'].values[0].value).toBe(3);
    });

    it('should increment a counter by specified value', () => {
      service.createCounter({ name: 'test_inc_val', help: 'Test' });

      service.incrementCounter('test_inc_val', undefined, 5);
      service.incrementCounter('test_inc_val', undefined, 3);

      const metrics = service.getMetricsJson();
      expect(metrics['test_inc_val'].values[0].value).toBe(8);
    });

    it('should track separate values for different labels', () => {
      service.createCounter({
        name: 'labeled_counter',
        help: 'Test',
        labelNames: ['method'],
      });

      service.incrementCounter('labeled_counter', { method: 'GET' }, 2);
      service.incrementCounter('labeled_counter', { method: 'POST' }, 3);
      service.incrementCounter('labeled_counter', { method: 'GET' }, 1);

      const metrics = service.getMetricsJson();
      const values = metrics['labeled_counter'].values;

      const getValue = (m: string) =>
        values.find((v: { labels: { method: string } }) => v.labels.method === m)?.value;

      expect(getValue('GET')).toBe(3);
      expect(getValue('POST')).toBe(3);
    });

    it('should log warning for non-existent counter', () => {
      const loggerSpy = jest.spyOn((service as any).logger, 'warn');
      service.incrementCounter('non_existent_counter');
      expect(loggerSpy).toHaveBeenCalledWith(
        expect.stringContaining('Counter metric not found'),
      );
    });
  });

  // ==========================================================================
  // Gauge Metric Tests
  // ==========================================================================

  describe('createGauge', () => {
    it('should create a gauge metric', () => {
      service.createGauge({
        name: 'test_gauge',
        help: 'A test gauge',
        labelNames: ['zone'],
      });

      const metrics = service.getMetricsJson();
      expect(metrics).toHaveProperty('test_gauge');
      expect(metrics['test_gauge'].type).toBe(MetricType.GAUGE);
    });
  });

  describe('setGauge', () => {
    it('should set gauge value', () => {
      service.createGauge({ name: 'test_set', help: 'Test' });

      service.setGauge('test_set', 42);

      const metrics = service.getMetricsJson();
      expect(metrics['test_set'].values[0].value).toBe(42);
    });

    it('should overwrite previous gauge value', () => {
      service.createGauge({ name: 'test_overwrite', help: 'Test' });

      service.setGauge('test_overwrite', 10);
      service.setGauge('test_overwrite', 25);
      service.setGauge('test_overwrite', 30);

      const metrics = service.getMetricsJson();
      expect(metrics['test_overwrite'].values[0].value).toBe(30);
    });

    it('should log warning for non-existent gauge', () => {
      const loggerSpy = jest.spyOn((service as any).logger, 'warn');
      service.setGauge('non_existent_gauge', 10);
      expect(loggerSpy).toHaveBeenCalledWith(
        expect.stringContaining('Gauge metric not found'),
      );
    });
  });

  describe('incrementGauge', () => {
    it('should increment gauge by 1', () => {
      service.createGauge({ name: 'test_inc_gauge', help: 'Test' });

      service.incrementGauge('test_inc_gauge');
      service.incrementGauge('test_inc_gauge');

      const metrics = service.getMetricsJson();
      expect(metrics['test_inc_gauge'].values[0].value).toBe(2);
    });

    it('should increment gauge by specified value', () => {
      service.createGauge({ name: 'test_inc_gauge_val', help: 'Test' });

      service.incrementGauge('test_inc_gauge_val', undefined, 5);

      const metrics = service.getMetricsJson();
      expect(metrics['test_inc_gauge_val'].values[0].value).toBe(5);
    });
  });

  describe('decrementGauge', () => {
    it('should decrement gauge by 1', () => {
      service.createGauge({ name: 'test_dec_gauge', help: 'Test' });
      service.setGauge('test_dec_gauge', 10);

      service.decrementGauge('test_dec_gauge');
      service.decrementGauge('test_dec_gauge');

      const metrics = service.getMetricsJson();
      expect(metrics['test_dec_gauge'].values[0].value).toBe(8);
    });

    it('should decrement gauge by specified value', () => {
      service.createGauge({ name: 'test_dec_gauge_val', help: 'Test' });
      service.setGauge('test_dec_gauge_val', 100);

      service.decrementGauge('test_dec_gauge_val', undefined, 30);

      const metrics = service.getMetricsJson();
      expect(metrics['test_dec_gauge_val'].values[0].value).toBe(70);
    });
  });

  // ==========================================================================
  // Histogram Metric Tests
  // ==========================================================================

  describe('createHistogram', () => {
    it('should create a histogram metric', () => {
      service.createHistogram({
        name: 'test_histogram',
        help: 'A test histogram',
        labelNames: ['status'],
        buckets: [10, 50, 100, 500, 1000],
      });

      const metrics = service.getMetricsJson();
      expect(metrics).toHaveProperty('test_histogram');
      expect(metrics['test_histogram'].type).toBe(MetricType.HISTOGRAM);
    });

    it('should use default buckets when not specified', () => {
      service.createHistogram({
        name: 'test_histogram_default',
        help: 'Test',
      });

      const metrics = service.getMetricsJson();
      expect(metrics).toHaveProperty('test_histogram_default');
    });
  });

  describe('observeHistogram', () => {
    it('should observe histogram values', () => {
      service.createHistogram({
        name: 'test_observe',
        help: 'Test',
        buckets: [10, 50, 100],
      });

      service.observeHistogram('test_observe', 25);
      service.observeHistogram('test_observe', 75);
      service.observeHistogram('test_observe', 5);

      const metrics = service.getMetricsJson();
      const data = metrics['test_observe'].data[0];

      expect(data.count).toBe(3);
      expect(data.sum).toBe(105); // 25 + 75 + 5
    });

    it('should update bucket counts correctly', () => {
      service.createHistogram({
        name: 'test_bucket_counts',
        help: 'Test histogram for bucket counting',
        buckets: [10, 50, 100],
      });

      // Each observation increments all buckets where value <= bucket threshold
      service.observeHistogram('test_bucket_counts', 5); // increments 10, 50, 100
      service.observeHistogram('test_bucket_counts', 25); // increments 50, 100
      service.observeHistogram('test_bucket_counts', 75); // increments 100
      service.observeHistogram('test_bucket_counts', 150); // none

      const metrics = service.getMetricsJson();
      const buckets = metrics['test_bucket_counts'].data[0].buckets;

      // Bucket 10: only 5 falls in (1 observation)
      expect(buckets['10']).toBe(1);
      // Bucket 50: 5 and 25 fall in (2 observations)
      expect(buckets['50']).toBe(2);
      // Bucket 100: 5, 25, and 75 fall in (3 observations)
      expect(buckets['100']).toBe(3);
    });

    it('should log warning for non-existent histogram', () => {
      const loggerSpy = jest.spyOn((service as any).logger, 'warn');
      service.observeHistogram('non_existent_histogram', 10);
      expect(loggerSpy).toHaveBeenCalledWith(
        expect.stringContaining('Histogram metric not found'),
      );
    });
  });

  // ==========================================================================
  // HTTP Request Recording Tests
  // ==========================================================================

  describe('recordHttpRequest', () => {
    it('should record successful HTTP request', () => {
      service.recordHttpRequest('GET', '/api/users', 200, 150);

      const metrics = service.getMetricsJson();

      // Check request counter
      const requestValues = metrics['http_requests_total'].values;
      const request = requestValues.find(
        (v: { labels: { method: string; path: string; status: string } }) =>
          v.labels.method === 'GET' &&
          v.labels.path === '/api/users' &&
          v.labels.status === '200',
      );
      expect(request?.value).toBe(1);

      // Check duration histogram
      const durationData = metrics['http_request_duration_ms'].data;
      expect(durationData.length).toBeGreaterThan(0);
    });

    it('should record error HTTP request (4xx)', () => {
      service.recordHttpRequest('POST', '/api/users', 400, 50);

      const metrics = service.getMetricsJson();

      const errorValues = metrics['http_errors_total'].values;
      const error = errorValues.find(
        (v: { labels: { error_type: string } }) =>
          v.labels.error_type === 'client_error',
      );
      expect(error?.value).toBe(1);
    });

    it('should record error HTTP request (5xx)', () => {
      service.recordHttpRequest('GET', '/api/data', 500, 100);

      const metrics = service.getMetricsJson();

      const errorValues = metrics['http_errors_total'].values;
      const error = errorValues.find(
        (v: { labels: { error_type: string } }) =>
          v.labels.error_type === 'server_error',
      );
      expect(error?.value).toBe(1);
    });

    it('should not record errors for successful requests', () => {
      service.recordHttpRequest('GET', '/api/success', 201, 50);

      const metrics = service.getMetricsJson();
      const errorValues = metrics['http_errors_total'].values;

      const error = errorValues.find(
        (v: { labels: { path: string } }) => v.labels.path === '/api/success',
      );
      expect(error).toBeUndefined();
    });
  });

  // ==========================================================================
  // Database Query Recording Tests
  // ==========================================================================

  describe('recordDbQuery', () => {
    it('should record successful database query', () => {
      service.recordDbQuery('findMany', 'User', 25);

      const metrics = service.getMetricsJson();

      const queryValues = metrics['db_queries_total'].values;
      const query = queryValues.find(
        (v: { labels: { operation: string; model: string } }) =>
          v.labels.operation === 'findMany' && v.labels.model === 'User',
      );
      expect(query?.value).toBe(1);
    });

    it('should record database query with error', () => {
      service.recordDbQuery('create', 'Order', 100, 'connection_error');

      const metrics = service.getMetricsJson();

      const errorValues = metrics['db_errors_total'].values;
      const error = errorValues.find(
        (v: { labels: { error_type: string } }) =>
          v.labels.error_type === 'connection_error',
      );
      expect(error?.value).toBe(1);
    });
  });

  // ==========================================================================
  // Cache Metrics Tests
  // ==========================================================================

  describe('recordCacheHit', () => {
    it('should record cache hit', () => {
      service.recordCacheHit('redis');
      service.recordCacheHit('redis');
      service.recordCacheHit('memory');

      const metrics = service.getMetricsJson();
      const hitValues = metrics['cache_hits_total'].values;

      const redisHits = hitValues.find(
        (v: { labels: { cache_type: string } }) => v.labels.cache_type === 'redis',
      );
      const memoryHits = hitValues.find(
        (v: { labels: { cache_type: string } }) => v.labels.cache_type === 'memory',
      );

      expect(redisHits?.value).toBe(2);
      expect(memoryHits?.value).toBe(1);
    });

    it('should use default cache type when not specified', () => {
      service.recordCacheHit();

      const metrics = service.getMetricsJson();
      const hitValues = metrics['cache_hits_total'].values;
      const hit = hitValues.find(
        (v: { labels: { cache_type: string } }) => v.labels.cache_type === 'redis',
      );
      expect(hit?.value).toBe(1);
    });
  });

  describe('recordCacheMiss', () => {
    it('should record cache miss', () => {
      service.recordCacheMiss('redis');

      const metrics = service.getMetricsJson();
      const missValues = metrics['cache_misses_total'].values;
      const miss = missValues.find(
        (v: { labels: { cache_type: string } }) => v.labels.cache_type === 'redis',
      );
      expect(miss?.value).toBe(1);
    });
  });

  describe('setCacheKeysCount', () => {
    it('should set cache keys count', () => {
      service.setCacheKeysCount(150, 'redis');

      const metrics = service.getMetricsJson();
      const keysValues = metrics['cache_keys_count'].values;
      const keys = keysValues.find(
        (v: { labels: { cache_type: string } }) => v.labels.cache_type === 'redis',
      );
      expect(keys?.value).toBe(150);
    });
  });

  // ==========================================================================
  // Business Metrics Tests - Tickets
  // ==========================================================================

  describe('recordTicketSale', () => {
    it('should record ticket sale', () => {
      service.recordTicketSale('festival-1', 'VIP');
      service.recordTicketSale('festival-1', 'VIP');
      service.recordTicketSale('festival-1', 'STANDARD');

      const metrics = service.getMetricsJson();
      const values = metrics['tickets_sold_total'].values;

      const vipTickets = values.find(
        (v: { labels: { ticket_type: string } }) => v.labels.ticket_type === 'VIP',
      );
      const standardTickets = values.find(
        (v: { labels: { ticket_type: string } }) =>
          v.labels.ticket_type === 'STANDARD',
      );

      expect(vipTickets?.value).toBe(2);
      expect(standardTickets?.value).toBe(1);
    });
  });

  describe('recordTicketValidation', () => {
    it('should record ticket validation', () => {
      service.recordTicketValidation('festival-1', 'zone-a');

      const metrics = service.getMetricsJson();
      const values = metrics['tickets_validated_total'].values;
      expect(values.length).toBeGreaterThan(0);
    });
  });

  // ==========================================================================
  // Business Metrics Tests - Payments
  // ==========================================================================

  describe('recordPayment', () => {
    it('should record payment', () => {
      service.recordPayment('festival-1', 'stripe', 'completed', 5000, 'EUR');
      service.recordPayment('festival-1', 'stripe', 'failed', 3000, 'EUR');

      const metrics = service.getMetricsJson();
      const values = metrics['payments_total'].values;

      const completed = values.find(
        (v: { labels: { status: string } }) => v.labels.status === 'completed',
      );
      const failed = values.find(
        (v: { labels: { status: string } }) => v.labels.status === 'failed',
      );

      expect(completed?.value).toBe(1);
      expect(failed?.value).toBe(1);
    });

    it('should record payment amount only for completed payments', () => {
      service.recordPayment('festival-1', 'stripe', 'completed', 5000, 'EUR');
      service.recordPayment('festival-1', 'stripe', 'failed', 3000, 'EUR');

      const metrics = service.getMetricsJson();
      const amountValues = metrics['payments_amount_total'].values;

      // Only completed payment amount should be recorded
      expect(amountValues.length).toBe(1);
      expect(amountValues[0].value).toBe(5000);
    });
  });

  // ==========================================================================
  // Business Metrics Tests - Cashless
  // ==========================================================================

  describe('recordCashlessTopup', () => {
    it('should record cashless topup', () => {
      service.recordCashlessTopup('festival-1', 2000, 'EUR');
      service.recordCashlessTopup('festival-1', 5000, 'EUR');

      const metrics = service.getMetricsJson();

      const topupValues = metrics['cashless_topups_total'].values;
      expect(topupValues[0].value).toBe(2);

      const amountValues = metrics['cashless_topup_amount_total'].values;
      expect(amountValues[0].value).toBe(7000);
    });
  });

  describe('recordCashlessPayment', () => {
    it('should record cashless payment', () => {
      service.recordCashlessPayment('festival-1', 'food', 1500, 'EUR');
      service.recordCashlessPayment('festival-1', 'drinks', 800, 'EUR');

      const metrics = service.getMetricsJson();

      const paymentValues = metrics['cashless_payments_total'].values;
      expect(paymentValues.length).toBe(2);

      const amountValues = metrics['cashless_payment_amount_total'].values;
      expect(amountValues[0].value).toBe(2300);
    });
  });

  // ==========================================================================
  // Zone Metrics Tests
  // ==========================================================================

  describe('updateZoneOccupancy', () => {
    it('should update zone occupancy metrics', () => {
      service.updateZoneOccupancy('festival-1', 'zone-a', 'Main Stage', 500, 1000);

      const metrics = service.getMetricsJson();

      const currentValues = metrics['zone_occupancy_current'].values;
      expect(currentValues[0].value).toBe(500);

      const percentValues = metrics['zone_occupancy_percentage'].values;
      expect(percentValues[0].value).toBe(50);
    });

    it('should handle zero capacity', () => {
      service.updateZoneOccupancy('festival-1', 'zone-b', 'VIP Area', 0, 0);

      const metrics = service.getMetricsJson();
      const percentValues = metrics['zone_occupancy_percentage'].values;
      const zoneB = percentValues.find(
        (v: { labels: { zone_id: string } }) => v.labels.zone_id === 'zone-b',
      );
      expect(zoneB?.value).toBe(0);
    });
  });

  describe('recordZoneEntry', () => {
    it('should record zone entry', () => {
      service.recordZoneEntry('festival-1', 'zone-a');

      const metrics = service.getMetricsJson();
      const values = metrics['zone_entries_total'].values;
      expect(values[0].value).toBe(1);
    });
  });

  describe('recordZoneExit', () => {
    it('should record zone exit', () => {
      service.recordZoneExit('festival-1', 'zone-a');

      const metrics = service.getMetricsJson();
      const values = metrics['zone_exits_total'].values;
      expect(values[0].value).toBe(1);
    });
  });

  // ==========================================================================
  // Festival Metrics Tests
  // ==========================================================================

  describe('updateFestivalAttendance', () => {
    it('should update festival attendance metrics', () => {
      service.updateFestivalAttendance('festival-1', 5000, 10000);

      const metrics = service.getMetricsJson();

      const attendeesValues = metrics['festival_attendees_current'].values;
      expect(attendeesValues[0].value).toBe(5000);

      const capacityValues = metrics['festival_capacity_percentage'].values;
      expect(capacityValues[0].value).toBe(50);
    });

    it('should handle zero max capacity', () => {
      service.updateFestivalAttendance('festival-1', 100, 0);

      const metrics = service.getMetricsJson();
      const capacityValues = metrics['festival_capacity_percentage'].values;
      expect(capacityValues[0].value).toBe(0);
    });
  });

  // ==========================================================================
  // WebSocket Metrics Tests
  // ==========================================================================

  describe('recordWebSocketConnect', () => {
    it('should record WebSocket connection', () => {
      service.recordWebSocketConnect('/events');
      service.recordWebSocketConnect('/events');

      const metrics = service.getMetricsJson();
      const values = metrics['websocket_connections_active'].values;
      expect(values[0].value).toBe(2);
    });
  });

  describe('recordWebSocketDisconnect', () => {
    it('should record WebSocket disconnection', () => {
      service.recordWebSocketConnect('/events');
      service.recordWebSocketConnect('/events');
      service.recordWebSocketDisconnect('/events');

      const metrics = service.getMetricsJson();
      const values = metrics['websocket_connections_active'].values;
      expect(values[0].value).toBe(1);
    });
  });

  describe('recordWebSocketMessage', () => {
    it('should record WebSocket messages', () => {
      service.recordWebSocketMessage('/events', 'ticket_scanned', 'in');
      service.recordWebSocketMessage('/events', 'zone_update', 'out');

      const metrics = service.getMetricsJson();
      const values = metrics['websocket_messages_total'].values;
      expect(values.length).toBe(2);
    });
  });

  // ==========================================================================
  // Prometheus Output Tests
  // ==========================================================================

  describe('getPrometheusMetrics', () => {
    it('should return Prometheus-formatted metrics', () => {
      service.recordHttpRequest('GET', '/api/test', 200, 100);

      const output = service.getPrometheusMetrics();

      expect(output).toContain('# HELP http_requests_total');
      expect(output).toContain('# TYPE http_requests_total counter');
      expect(output).toContain('http_requests_total');
    });

    it('should include system metrics', () => {
      const output = service.getPrometheusMetrics();

      expect(output).toContain('process_uptime_seconds');
      expect(output).toContain('process_memory_heap_bytes');
      expect(output).toContain('process_memory_rss_bytes');
    });

    it('should format histogram with buckets', () => {
      service.observeHistogram('http_request_duration_ms', 50, {
        method: 'GET',
        path: '/api/test',
        status: '200',
      });

      const output = service.getPrometheusMetrics();

      expect(output).toContain('http_request_duration_ms_bucket');
      expect(output).toContain('http_request_duration_ms_sum');
      expect(output).toContain('http_request_duration_ms_count');
    });
  });

  // ==========================================================================
  // JSON Output Tests
  // ==========================================================================

  describe('getMetricsJson', () => {
    it('should return metrics as JSON object', () => {
      const metrics = service.getMetricsJson();

      expect(typeof metrics).toBe('object');
      expect(metrics).toHaveProperty('http_requests_total');
    });

    it('should include metric type and help', () => {
      const metrics = service.getMetricsJson();

      expect(metrics['http_requests_total']).toHaveProperty('type', 'counter');
      expect(metrics['http_requests_total']).toHaveProperty('help');
    });

    it('should include histogram data structure', () => {
      service.observeHistogram('http_request_duration_ms', 100, {
        method: 'GET',
        path: '/test',
        status: '200',
      });

      const metrics = service.getMetricsJson();
      const histogram = metrics['http_request_duration_ms'];

      expect(histogram.type).toBe('histogram');
      expect(histogram.data[0]).toHaveProperty('sum');
      expect(histogram.data[0]).toHaveProperty('count');
      expect(histogram.data[0]).toHaveProperty('buckets');
    });
  });

  // ==========================================================================
  // Label Handling Tests
  // ==========================================================================

  describe('label handling', () => {
    it('should handle empty labels', () => {
      service.createCounter({ name: 'no_labels', help: 'Test' });
      service.incrementCounter('no_labels', {});

      const metrics = service.getMetricsJson();
      expect(metrics['no_labels'].values[0].value).toBe(1);
    });

    it('should handle numeric label values', () => {
      service.createCounter({
        name: 'numeric_labels',
        help: 'Test',
        labelNames: ['count'],
      });
      service.incrementCounter('numeric_labels', { count: 123 });

      const metrics = service.getMetricsJson();
      const value = metrics['numeric_labels'].values[0];
      expect(value.labels.count).toBe('123');
    });

    it('should sort labels consistently', () => {
      service.createCounter({
        name: 'sorted_labels',
        help: 'Test',
        labelNames: ['z', 'a', 'm'],
      });

      service.incrementCounter('sorted_labels', { z: '1', a: '2', m: '3' });
      service.incrementCounter('sorted_labels', { a: '2', m: '3', z: '1' });

      const metrics = service.getMetricsJson();
      // Both increments should go to the same counter since labels are sorted
      expect(metrics['sorted_labels'].values[0].value).toBe(2);
    });
  });
});
