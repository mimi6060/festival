/**
 * MonitoringController Unit Tests
 *
 * Comprehensive tests for the monitoring controller including:
 * - Prometheus metrics endpoint
 * - JSON metrics endpoint
 * - Status endpoint
 * - Health check endpoints
 * - System info endpoint
 * - Business summary endpoint
 */

import { Test, TestingModule } from '@nestjs/testing';
import { MonitoringController } from './monitoring.controller';
import { MetricsService } from './metrics.service';
import {
  HealthIndicatorsService,
  HealthStatus,
  SystemHealth,
} from './health-indicators.service';

describe('MonitoringController', () => {
  let controller: MonitoringController;
  let metricsService: jest.Mocked<MetricsService>;
  let healthIndicatorsService: jest.Mocked<HealthIndicatorsService>;

  const mockMetricsService = {
    getPrometheusMetrics: jest.fn(),
    getMetricsJson: jest.fn(),
  };

  const mockHealthIndicatorsService = {
    checkHealth: jest.fn(),
    checkLiveness: jest.fn(),
    checkReadiness: jest.fn(),
    getHealthSummary: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [MonitoringController],
      providers: [
        { provide: MetricsService, useValue: mockMetricsService },
        { provide: HealthIndicatorsService, useValue: mockHealthIndicatorsService },
      ],
    }).compile();

    controller = module.get<MonitoringController>(MonitoringController);
    metricsService = module.get(MetricsService);
    healthIndicatorsService = module.get(HealthIndicatorsService);
  });

  // ==========================================================================
  // Constructor Tests
  // ==========================================================================

  describe('constructor', () => {
    it('should be defined', () => {
      expect(controller).toBeDefined();
    });
  });

  // ==========================================================================
  // getPrometheusMetrics() Tests
  // ==========================================================================

  describe('getPrometheusMetrics', () => {
    it('should return Prometheus metrics', () => {
      const prometheusOutput = `
# HELP http_requests_total Total HTTP requests
# TYPE http_requests_total counter
http_requests_total{method="GET",path="/api/users",status="200"} 100
      `.trim();

      mockMetricsService.getPrometheusMetrics.mockReturnValue(prometheusOutput);

      const result = controller.getPrometheusMetrics();

      expect(result).toBe(prometheusOutput);
      expect(metricsService.getPrometheusMetrics).toHaveBeenCalled();
    });

    it('should return empty string when no metrics', () => {
      mockMetricsService.getPrometheusMetrics.mockReturnValue('');

      const result = controller.getPrometheusMetrics();

      expect(result).toBe('');
    });
  });

  // ==========================================================================
  // getJsonMetrics() Tests
  // ==========================================================================

  describe('getJsonMetrics', () => {
    it('should return metrics as JSON', () => {
      const jsonMetrics = {
        http_requests_total: {
          type: 'counter',
          help: 'Total HTTP requests',
          values: [{ labels: { method: 'GET' }, value: 100 }],
        },
      };

      mockMetricsService.getMetricsJson.mockReturnValue(jsonMetrics);

      const result = controller.getJsonMetrics();

      expect(result).toEqual(jsonMetrics);
      expect(metricsService.getMetricsJson).toHaveBeenCalled();
    });

    it('should return empty object when no metrics', () => {
      mockMetricsService.getMetricsJson.mockReturnValue({});

      const result = controller.getJsonMetrics();

      expect(result).toEqual({});
    });
  });

  // ==========================================================================
  // getStatus() Tests
  // ==========================================================================

  describe('getStatus', () => {
    it('should return healthy status', () => {
      const result = controller.getStatus();

      expect(result.status).toBe('healthy');
      expect(result).toHaveProperty('timestamp');
      expect(result).toHaveProperty('uptime');
    });

    it('should return ISO timestamp', () => {
      const result = controller.getStatus();

      expect(new Date(result.timestamp).getTime()).not.toBeNaN();
    });

    it('should return positive uptime', () => {
      const result = controller.getStatus();

      expect(result.uptime).toBeGreaterThanOrEqual(0);
    });
  });

  // ==========================================================================
  // getHealth() Tests
  // ==========================================================================

  describe('getHealth', () => {
    it('should return health check result', async () => {
      const healthResult: SystemHealth = {
        status: HealthStatus.UP,
        timestamp: new Date().toISOString(),
        uptime: 1000,
        version: '1.0.0',
        checks: [
          { name: 'database', status: HealthStatus.UP, responseTime: 5 },
          { name: 'redis', status: HealthStatus.UP, responseTime: 3 },
        ],
      };

      mockHealthIndicatorsService.checkHealth.mockResolvedValue(healthResult);

      const result = await controller.getHealth();

      expect(result).toEqual(healthResult);
      expect(healthIndicatorsService.checkHealth).toHaveBeenCalled();
    });

    it('should return degraded status when checks are degraded', async () => {
      const healthResult: SystemHealth = {
        status: HealthStatus.DEGRADED,
        timestamp: new Date().toISOString(),
        uptime: 1000,
        version: '1.0.0',
        checks: [
          { name: 'database', status: HealthStatus.UP, responseTime: 5 },
          {
            name: 'memory',
            status: HealthStatus.DEGRADED,
            error: 'High memory usage',
          },
        ],
      };

      mockHealthIndicatorsService.checkHealth.mockResolvedValue(healthResult);

      const result = await controller.getHealth();

      expect(result.status).toBe(HealthStatus.DEGRADED);
    });

    it('should return down status when critical checks fail', async () => {
      const healthResult: SystemHealth = {
        status: HealthStatus.DOWN,
        timestamp: new Date().toISOString(),
        uptime: 1000,
        version: '1.0.0',
        checks: [
          {
            name: 'database',
            status: HealthStatus.DOWN,
            error: 'Connection refused',
          },
        ],
      };

      mockHealthIndicatorsService.checkHealth.mockResolvedValue(healthResult);

      const result = await controller.getHealth();

      expect(result.status).toBe(HealthStatus.DOWN);
    });
  });

  // ==========================================================================
  // getLiveness() Tests
  // ==========================================================================

  describe('getLiveness', () => {
    it('should return liveness status', async () => {
      const livenessResult = {
        status: HealthStatus.UP,
        uptime: 500,
      };

      mockHealthIndicatorsService.checkLiveness.mockResolvedValue(livenessResult);

      const result = await controller.getLiveness();

      expect(result.status).toBe('up');
      expect(result.uptime).toBe(500);
    });

    it('should always return UP status for liveness', async () => {
      mockHealthIndicatorsService.checkLiveness.mockResolvedValue({
        status: HealthStatus.UP,
        uptime: 100,
      });

      const result = await controller.getLiveness();

      expect(result.status).toBe('up');
    });
  });

  // ==========================================================================
  // getReadiness() Tests
  // ==========================================================================

  describe('getReadiness', () => {
    it('should return UP when all dependencies are healthy', async () => {
      const readinessResult = {
        status: HealthStatus.UP,
        checks: [
          { name: 'database', status: HealthStatus.UP, responseTime: 5 },
          { name: 'redis', status: HealthStatus.UP, responseTime: 3 },
        ],
      };

      mockHealthIndicatorsService.checkReadiness.mockResolvedValue(readinessResult);

      const result = await controller.getReadiness();

      expect(result.status).toBe(HealthStatus.UP);
      expect(result.checks).toHaveLength(2);
    });

    it('should return DOWN when any dependency is unhealthy', async () => {
      const readinessResult = {
        status: HealthStatus.DOWN,
        checks: [
          { name: 'database', status: HealthStatus.UP, responseTime: 5 },
          {
            name: 'redis',
            status: HealthStatus.DOWN,
            error: 'Connection refused',
          },
        ],
      };

      mockHealthIndicatorsService.checkReadiness.mockResolvedValue(readinessResult);

      const result = await controller.getReadiness();

      expect(result.status).toBe(HealthStatus.DOWN);
    });
  });

  // ==========================================================================
  // getHealthSummary() Tests
  // ==========================================================================

  describe('getHealthSummary', () => {
    it('should return health summary', async () => {
      const summaryResult = {
        healthy: true,
        status: HealthStatus.UP,
        timestamp: new Date().toISOString(),
        uptime: 1000,
        uptimeFormatted: '16m 40s',
        checks: {
          database: { status: HealthStatus.UP, responseTime: 5 },
          redis: { status: HealthStatus.UP, responseTime: 3 },
        },
      };

      mockHealthIndicatorsService.getHealthSummary.mockResolvedValue(summaryResult);

      const result = await controller.getHealthSummary();

      expect(result).toEqual(summaryResult);
    });

    it('should include formatted uptime', async () => {
      const summaryResult = {
        healthy: true,
        status: HealthStatus.UP,
        timestamp: new Date().toISOString(),
        uptime: 3661,
        uptimeFormatted: '1h 1m 1s',
        checks: {},
      };

      mockHealthIndicatorsService.getHealthSummary.mockResolvedValue(summaryResult);

      const result = await controller.getHealthSummary();

      expect(result.uptimeFormatted).toBe('1h 1m 1s');
    });
  });

  // ==========================================================================
  // getSystemInfo() Tests
  // ==========================================================================

  describe('getSystemInfo', () => {
    it('should return basic system info', () => {
      const result = controller.getSystemInfo();

      expect(result).toHaveProperty('service', 'festival-api');
      expect(result).toHaveProperty('version');
      expect(result).toHaveProperty('environment');
      expect(result).toHaveProperty('uptime');
      expect(result).toHaveProperty('memory');
      expect(result).toHaveProperty('process');
    });

    it('should include uptime in seconds and formatted', () => {
      const result = controller.getSystemInfo();

      expect(result.uptime).toHaveProperty('seconds');
      expect(result.uptime).toHaveProperty('formatted');
      expect(typeof result.uptime.seconds).toBe('number');
      expect(typeof result.uptime.formatted).toBe('string');
    });

    it('should include memory information', () => {
      const result = controller.getSystemInfo();

      expect(result.memory).toHaveProperty('heapUsed');
      expect(result.memory).toHaveProperty('heapTotal');
      expect(result.memory).toHaveProperty('rss');
      expect(result.memory).toHaveProperty('external');
    });

    it('should include process information', () => {
      const result = controller.getSystemInfo();

      expect(result.process).toHaveProperty('pid');
      expect(result.process).toHaveProperty('nodeVersion');
      expect(result.process).toHaveProperty('platform');
      expect(result.process).toHaveProperty('arch');
    });

    it('should include detailed info when detailed=true', () => {
      const result = controller.getSystemInfo('true');

      expect(result.memory).toHaveProperty('arrayBuffers');
      expect(result).toHaveProperty('cpu');
    });

    it('should not include detailed info when detailed=false', () => {
      const result = controller.getSystemInfo('false');

      expect(result.memory.arrayBuffers).toBeUndefined();
      expect(result.cpu).toBeUndefined();
    });

    it('should format bytes correctly', () => {
      const result = controller.getSystemInfo();

      // Memory values should be formatted strings with units
      expect(result.memory.heapUsed).toMatch(/\d+(\.\d+)?\s+(B|KB|MB|GB|TB)/);
      expect(result.memory.heapTotal).toMatch(/\d+(\.\d+)?\s+(B|KB|MB|GB|TB)/);
    });
  });

  // ==========================================================================
  // getBusinessSummary() Tests
  // ==========================================================================

  describe('getBusinessSummary', () => {
    beforeEach(() => {
      mockMetricsService.getMetricsJson.mockReturnValue({
        http_requests_total: {
          values: [
            { labels: { method: 'GET' }, value: 100 },
            { labels: { method: 'POST' }, value: 50 },
          ],
        },
        http_errors_total: {
          values: [{ labels: { status: '500' }, value: 5 }],
        },
        cache_hits_total: {
          values: [{ labels: { cache_type: 'redis' }, value: 80 }],
        },
        cache_misses_total: {
          values: [{ labels: { cache_type: 'redis' }, value: 20 }],
        },
        db_queries_total: {
          values: [{ labels: { operation: 'findMany' }, value: 200 }],
        },
        db_errors_total: {
          values: [],
        },
        tickets_sold_total: {
          values: [{ labels: { type: 'VIP' }, value: 50 }],
        },
        tickets_validated_total: {
          values: [{ labels: { zone: 'main' }, value: 40 }],
        },
        payments_total: {
          values: [{ labels: { status: 'completed' }, value: 100 }],
        },
        cashless_topups_total: {
          values: [{ labels: {}, value: 75 }],
        },
        cashless_payments_total: {
          values: [{ labels: {}, value: 60 }],
        },
        websocket_connections_active: {
          values: [{ labels: { namespace: '/events' }, value: 25 }],
        },
        websocket_messages_total: {
          values: [
            { labels: { direction: 'in' }, value: 500 },
            { labels: { direction: 'out' }, value: 600 },
          ],
        },
      });
    });

    it('should return business summary', () => {
      const result = controller.getBusinessSummary();

      expect(result).toHaveProperty('timestamp');
      expect(result).toHaveProperty('http');
      expect(result).toHaveProperty('cache');
      expect(result).toHaveProperty('database');
      expect(result).toHaveProperty('business');
      expect(result).toHaveProperty('websocket');
    });

    it('should calculate HTTP metrics correctly', () => {
      const result = controller.getBusinessSummary();

      expect(result.http.totalRequests).toBe(150);
      expect(result.http.totalErrors).toBe(5);
    });

    it('should calculate cache metrics correctly', () => {
      const result = controller.getBusinessSummary();

      expect(result.cache.hits).toBe(80);
      expect(result.cache.misses).toBe(20);
      expect(result.cache.hitRate).toBe('80.00%');
    });

    it('should calculate database metrics correctly', () => {
      const result = controller.getBusinessSummary();

      expect(result.database.totalQueries).toBe(200);
      expect(result.database.totalErrors).toBe(0);
    });

    it('should calculate business metrics correctly', () => {
      const result = controller.getBusinessSummary();

      expect(result.business.ticketsSold).toBe(50);
      expect(result.business.ticketsValidated).toBe(40);
      expect(result.business.totalPayments).toBe(100);
      expect(result.business.cashlessTopups).toBe(75);
      expect(result.business.cashlessPayments).toBe(60);
    });

    it('should calculate websocket metrics correctly', () => {
      const result = controller.getBusinessSummary();

      expect(result.websocket.activeConnections).toBe(25);
      expect(result.websocket.totalMessages).toBe(1100);
    });

    it('should handle missing metrics gracefully', () => {
      mockMetricsService.getMetricsJson.mockReturnValue({});

      const result = controller.getBusinessSummary();

      expect(result.http.totalRequests).toBe(0);
      expect(result.cache.hits).toBe(0);
      expect(result.cache.hitRate).toBe('0%');
    });

    it('should include timestamp', () => {
      const result = controller.getBusinessSummary();

      expect(result.timestamp).toBeDefined();
      expect(new Date(result.timestamp).getTime()).not.toBeNaN();
    });
  });

  // ==========================================================================
  // Helper Methods Tests
  // ==========================================================================

  describe('helper methods', () => {
    describe('formatBytes', () => {
      it('should format bytes correctly', () => {
        // Access private method via controller
        const result = (controller as any).formatBytes(1024);
        expect(result).toBe('1.00 KB');
      });

      it('should handle large values', () => {
        const result = (controller as any).formatBytes(1024 * 1024 * 1024);
        expect(result).toBe('1.00 GB');
      });

      it('should handle zero', () => {
        const result = (controller as any).formatBytes(0);
        expect(result).toBe('0.00 B');
      });
    });

    describe('formatUptime', () => {
      it('should format seconds', () => {
        const result = (controller as any).formatUptime(45);
        expect(result).toBe('45s');
      });

      it('should format minutes and seconds', () => {
        const result = (controller as any).formatUptime(125);
        expect(result).toBe('2m 5s');
      });

      it('should format hours, minutes and seconds', () => {
        const result = (controller as any).formatUptime(3665);
        expect(result).toBe('1h 1m 5s');
      });

      it('should format days, hours, minutes and seconds', () => {
        const result = (controller as any).formatUptime(90065);
        expect(result).toBe('1d 1h 1m 5s');
      });
    });

    describe('sumMetricValues', () => {
      it('should sum metric values', () => {
        const metric = {
          values: [{ value: 10 }, { value: 20 }, { value: 30 }],
        };
        const result = (controller as any).sumMetricValues(metric);
        expect(result).toBe(60);
      });

      it('should return 0 for undefined metric', () => {
        const result = (controller as any).sumMetricValues(undefined);
        expect(result).toBe(0);
      });

      it('should return 0 for metric without values', () => {
        const result = (controller as any).sumMetricValues({});
        expect(result).toBe(0);
      });
    });

    describe('calculateHitRate', () => {
      it('should calculate hit rate percentage', () => {
        const metrics = {
          cache_hits_total: { values: [{ value: 80 }] },
          cache_misses_total: { values: [{ value: 20 }] },
        };
        const result = (controller as any).calculateHitRate(metrics);
        expect(result).toBe('80.00%');
      });

      it('should return 0% when no cache operations', () => {
        const metrics = {
          cache_hits_total: { values: [] },
          cache_misses_total: { values: [] },
        };
        const result = (controller as any).calculateHitRate(metrics);
        expect(result).toBe('0%');
      });
    });
  });
});
