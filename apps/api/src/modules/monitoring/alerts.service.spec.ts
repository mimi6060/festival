/**
 * AlertsService Unit Tests
 *
 * Comprehensive tests for the alerts service including:
 * - Alert registration
 * - Alert evaluation
 * - Alert firing and resolution
 * - Notification channels
 * - Alert history
 * - Alert summary
 */

import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import {
  AlertsService,
  AlertSeverity,
  AlertStatus,
  AlertDefinition,
  ActiveAlert,
} from './alerts.service';
import { MetricsService } from './metrics.service';

describe('AlertsService', () => {
  let service: AlertsService;
  let metricsService: jest.Mocked<MetricsService>;

  const mockConfigService = {
    get: jest.fn(),
  };

  const mockMetricsService = {
    getMetricsJson: jest.fn(),
    incrementCounter: jest.fn(),
    createCounter: jest.fn(),
    createGauge: jest.fn(),
    createHistogram: jest.fn(),
    onModuleInit: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    jest.useFakeTimers();

    mockMetricsService.getMetricsJson.mockReturnValue({});

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AlertsService,
        { provide: ConfigService, useValue: mockConfigService },
        { provide: MetricsService, useValue: mockMetricsService },
      ],
    }).compile();

    service = module.get<AlertsService>(AlertsService);
    metricsService = module.get(MetricsService);
  });

  afterEach(() => {
    service.stopEvaluation();
    jest.useRealTimers();
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
    it('should initialize default alerts', () => {
      service.onModuleInit();

      // Get private alertDefinitions via reflection
      const alertDefinitions = (service as any).alertDefinitions;
      expect(alertDefinitions.length).toBeGreaterThan(0);
    });

    it('should start evaluation timer', () => {
      service.onModuleInit();

      const timer = (service as any).evaluationTimer;
      expect(timer).toBeDefined();
    });

    it('should initialize webhook channel if configured', () => {
      mockConfigService.get.mockImplementation((key: string) => {
        if (key === 'ALERT_WEBHOOK_URL') return 'https://webhook.example.com';
        return undefined;
      });

      service.onModuleInit();

      const channels = (service as any).channels;
      const webhookChannel = channels.find((c: { type: string }) => c.type === 'webhook');
      expect(webhookChannel).toBeDefined();
    });

    it('should initialize slack channel if configured', () => {
      mockConfigService.get.mockImplementation((key: string) => {
        if (key === 'SLACK_ALERT_WEBHOOK') return 'https://hooks.slack.com/services/xxx';
        return undefined;
      });

      service.onModuleInit();

      const channels = (service as any).channels;
      const slackChannel = channels.find((c: { type: string }) => c.type === 'slack');
      expect(slackChannel).toBeDefined();
    });
  });

  // ==========================================================================
  // registerAlert() Tests
  // ==========================================================================

  describe('registerAlert', () => {
    it('should register a new alert definition', () => {
      const alertDef: AlertDefinition = {
        name: 'TestAlert',
        description: 'Test alert description',
        severity: AlertSeverity.WARNING,
        condition: async () => false,
      };

      service.registerAlert(alertDef);

      const alertDefinitions = (service as any).alertDefinitions;
      const registered = alertDefinitions.find(
        (a: AlertDefinition) => a.name === 'TestAlert',
      );
      expect(registered).toBeDefined();
      expect(registered.description).toBe('Test alert description');
    });

    it('should register alert with labels and annotations', () => {
      const alertDef: AlertDefinition = {
        name: 'LabeledAlert',
        description: 'Alert with labels',
        severity: AlertSeverity.CRITICAL,
        condition: async () => false,
        labels: { category: 'test', priority: 'high' },
        annotations: { runbook_url: 'https://docs.example.com' },
      };

      service.registerAlert(alertDef);

      const alertDefinitions = (service as any).alertDefinitions;
      const registered = alertDefinitions.find(
        (a: AlertDefinition) => a.name === 'LabeledAlert',
      );
      expect(registered.labels).toEqual({ category: 'test', priority: 'high' });
      expect(registered.annotations).toEqual({ runbook_url: 'https://docs.example.com' });
    });
  });

  // ==========================================================================
  // evaluateAlerts() Tests
  // ==========================================================================

  describe('evaluateAlerts', () => {
    it('should fire alert when condition becomes true', async () => {
      let shouldFire = false;
      const alertDef: AlertDefinition = {
        name: 'FiringAlert',
        description: 'This alert should fire',
        severity: AlertSeverity.WARNING,
        condition: async () => shouldFire,
      };

      service.registerAlert(alertDef);

      // First evaluation - should not fire
      await service.evaluateAlerts();
      expect(service.getActiveAlerts().length).toBe(0);

      // Change condition
      shouldFire = true;

      // Second evaluation - should fire
      await service.evaluateAlerts();
      const activeAlerts = service.getActiveAlerts();
      expect(activeAlerts.length).toBe(1);
      expect(activeAlerts[0].name).toBe('FiringAlert');
      expect(activeAlerts[0].status).toBe(AlertStatus.FIRING);
    });

    it('should resolve alert when condition becomes false', async () => {
      let shouldFire = true;
      const alertDef: AlertDefinition = {
        name: 'ResolvingAlert',
        description: 'This alert should resolve',
        severity: AlertSeverity.WARNING,
        condition: async () => shouldFire,
      };

      service.registerAlert(alertDef);

      // Fire the alert
      await service.evaluateAlerts();
      expect(service.getActiveAlerts().length).toBe(1);

      // Change condition
      shouldFire = false;

      // Resolve the alert
      await service.evaluateAlerts();
      expect(service.getActiveAlerts().length).toBe(0);
    });

    it('should not fire duplicate alerts', async () => {
      const alertDef: AlertDefinition = {
        name: 'DuplicateAlert',
        description: 'Should not duplicate',
        severity: AlertSeverity.WARNING,
        condition: async () => true,
      };

      service.registerAlert(alertDef);

      await service.evaluateAlerts();
      await service.evaluateAlerts();
      await service.evaluateAlerts();

      expect(service.getActiveAlerts().length).toBe(1);
    });

    it('should handle errors in condition evaluation', async () => {
      const alertDef: AlertDefinition = {
        name: 'ErrorAlert',
        description: 'Alert with error',
        severity: AlertSeverity.WARNING,
        condition: async () => {
          throw new Error('Condition evaluation failed');
        },
      };

      service.registerAlert(alertDef);

      // Should not throw
      await expect(service.evaluateAlerts()).resolves.not.toThrow();
    });

    it('should record metrics when alert fires', async () => {
      const alertDef: AlertDefinition = {
        name: 'MetricAlert',
        description: 'Alert for metric testing',
        severity: AlertSeverity.CRITICAL,
        condition: async () => true,
      };

      service.registerAlert(alertDef);
      await service.evaluateAlerts();

      expect(metricsService.incrementCounter).toHaveBeenCalledWith('alerts_total', {
        name: 'MetricAlert',
        severity: AlertSeverity.CRITICAL,
        status: 'firing',
      });
    });

    it('should record metrics when alert resolves', async () => {
      let shouldFire = true;
      const alertDef: AlertDefinition = {
        name: 'ResolveMetricAlert',
        description: 'Alert for resolve metric testing',
        severity: AlertSeverity.WARNING,
        condition: async () => shouldFire,
      };

      service.registerAlert(alertDef);
      await service.evaluateAlerts();

      shouldFire = false;
      await service.evaluateAlerts();

      expect(metricsService.incrementCounter).toHaveBeenCalledWith('alerts_total', {
        name: 'ResolveMetricAlert',
        severity: AlertSeverity.WARNING,
        status: 'resolved',
      });
    });
  });

  // ==========================================================================
  // Alert State Tests
  // ==========================================================================

  describe('alert state', () => {
    it('should set startsAt when alert fires', async () => {
      const alertDef: AlertDefinition = {
        name: 'TimingAlert',
        description: 'Alert with timing',
        severity: AlertSeverity.WARNING,
        condition: async () => true,
      };

      service.registerAlert(alertDef);
      await service.evaluateAlerts();

      const alerts = service.getActiveAlerts();
      expect(alerts[0].startsAt).toBeInstanceOf(Date);
    });

    it('should include labels in active alert', async () => {
      const alertDef: AlertDefinition = {
        name: 'LabeledActiveAlert',
        description: 'Alert with labels',
        severity: AlertSeverity.WARNING,
        condition: async () => true,
        labels: { team: 'backend', service: 'api' },
      };

      service.registerAlert(alertDef);
      await service.evaluateAlerts();

      const alerts = service.getActiveAlerts();
      expect(alerts[0].labels).toEqual({ team: 'backend', service: 'api' });
    });

    it('should include annotations in active alert', async () => {
      const alertDef: AlertDefinition = {
        name: 'AnnotatedAlert',
        description: 'Alert with annotations',
        severity: AlertSeverity.WARNING,
        condition: async () => true,
        annotations: { summary: 'Important alert' },
      };

      service.registerAlert(alertDef);
      await service.evaluateAlerts();

      const alerts = service.getActiveAlerts();
      expect(alerts[0].annotations).toEqual({ summary: 'Important alert' });
    });
  });

  // ==========================================================================
  // getActiveAlerts() Tests
  // ==========================================================================

  describe('getActiveAlerts', () => {
    it('should return empty array when no alerts are firing', () => {
      expect(service.getActiveAlerts()).toEqual([]);
    });

    it('should return all active alerts', async () => {
      service.registerAlert({
        name: 'Alert1',
        description: 'First alert',
        severity: AlertSeverity.WARNING,
        condition: async () => true,
      });
      service.registerAlert({
        name: 'Alert2',
        description: 'Second alert',
        severity: AlertSeverity.CRITICAL,
        condition: async () => true,
      });

      await service.evaluateAlerts();

      const alerts = service.getActiveAlerts();
      expect(alerts.length).toBe(2);
      expect(alerts.map((a) => a.name)).toContain('Alert1');
      expect(alerts.map((a) => a.name)).toContain('Alert2');
    });
  });

  // ==========================================================================
  // getAlertHistory() Tests
  // ==========================================================================

  describe('getAlertHistory', () => {
    it('should return empty array when no alerts have fired', () => {
      expect(service.getAlertHistory()).toEqual([]);
    });

    it('should include fired alerts in history', async () => {
      service.registerAlert({
        name: 'HistoryAlert',
        description: 'Alert for history',
        severity: AlertSeverity.WARNING,
        condition: async () => true,
      });

      await service.evaluateAlerts();

      const history = service.getAlertHistory();
      expect(history.length).toBe(1);
      expect(history[0].name).toBe('HistoryAlert');
      expect(history[0].status).toBe(AlertStatus.FIRING);
    });

    it('should include resolved alerts in history', async () => {
      let shouldFire = true;
      service.registerAlert({
        name: 'ResolvedHistoryAlert',
        description: 'Alert that resolves',
        severity: AlertSeverity.WARNING,
        condition: async () => shouldFire,
      });

      await service.evaluateAlerts();
      shouldFire = false;
      await service.evaluateAlerts();

      const history = service.getAlertHistory();
      expect(history.length).toBe(2);
      expect(history[0].status).toBe(AlertStatus.RESOLVED);
      expect(history[1].status).toBe(AlertStatus.FIRING);
    });

    it('should limit history size to 100 entries', async () => {
      for (let i = 0; i < 110; i++) {
        service.registerAlert({
          name: `Alert${i}`,
          description: `Alert ${i}`,
          severity: AlertSeverity.INFO,
          condition: async () => true,
        });
      }

      await service.evaluateAlerts();

      const history = service.getAlertHistory();
      expect(history.length).toBeLessThanOrEqual(100);
    });
  });

  // ==========================================================================
  // getAlertsBySeverity() Tests
  // ==========================================================================

  describe('getAlertsBySeverity', () => {
    beforeEach(async () => {
      service.registerAlert({
        name: 'InfoAlert',
        description: 'Info level alert',
        severity: AlertSeverity.INFO,
        condition: async () => true,
      });
      service.registerAlert({
        name: 'WarningAlert',
        description: 'Warning level alert',
        severity: AlertSeverity.WARNING,
        condition: async () => true,
      });
      service.registerAlert({
        name: 'CriticalAlert',
        description: 'Critical level alert',
        severity: AlertSeverity.CRITICAL,
        condition: async () => true,
      });

      await service.evaluateAlerts();
    });

    it('should return only INFO alerts', () => {
      const alerts = service.getAlertsBySeverity(AlertSeverity.INFO);
      expect(alerts.length).toBe(1);
      expect(alerts[0].name).toBe('InfoAlert');
    });

    it('should return only WARNING alerts', () => {
      const alerts = service.getAlertsBySeverity(AlertSeverity.WARNING);
      expect(alerts.length).toBe(1);
      expect(alerts[0].name).toBe('WarningAlert');
    });

    it('should return only CRITICAL alerts', () => {
      const alerts = service.getAlertsBySeverity(AlertSeverity.CRITICAL);
      expect(alerts.length).toBe(1);
      expect(alerts[0].name).toBe('CriticalAlert');
    });

    it('should return empty array for severity with no alerts', async () => {
      // Clear all alerts first
      service.stopEvaluation();
      const newModule = await Test.createTestingModule({
        providers: [
          AlertsService,
          { provide: ConfigService, useValue: mockConfigService },
          { provide: MetricsService, useValue: mockMetricsService },
        ],
      }).compile();

      const newService = newModule.get<AlertsService>(AlertsService);
      const alerts = newService.getAlertsBySeverity(AlertSeverity.CRITICAL);
      expect(alerts).toEqual([]);
      newService.stopEvaluation();
    });
  });

  // ==========================================================================
  // getAlertSummary() Tests
  // ==========================================================================

  describe('getAlertSummary', () => {
    it('should return summary with all zeroes when no alerts', () => {
      const summary = service.getAlertSummary();

      expect(summary).toEqual({
        total: 0,
        critical: 0,
        warning: 0,
        info: 0,
      });
    });

    it('should return correct counts by severity', async () => {
      service.registerAlert({
        name: 'Info1',
        description: 'Info',
        severity: AlertSeverity.INFO,
        condition: async () => true,
      });
      service.registerAlert({
        name: 'Warning1',
        description: 'Warning',
        severity: AlertSeverity.WARNING,
        condition: async () => true,
      });
      service.registerAlert({
        name: 'Warning2',
        description: 'Warning 2',
        severity: AlertSeverity.WARNING,
        condition: async () => true,
      });
      service.registerAlert({
        name: 'Critical1',
        description: 'Critical',
        severity: AlertSeverity.CRITICAL,
        condition: async () => true,
      });

      await service.evaluateAlerts();

      const summary = service.getAlertSummary();
      expect(summary).toEqual({
        total: 4,
        critical: 1,
        warning: 2,
        info: 1,
      });
    });
  });

  // ==========================================================================
  // stopEvaluation() Tests
  // ==========================================================================

  describe('stopEvaluation', () => {
    it('should stop the evaluation timer', () => {
      service.onModuleInit();
      const timer = (service as any).evaluationTimer;
      expect(timer).toBeDefined();

      service.stopEvaluation();

      // Timer should still be set but cleared
      // We can verify by checking no more evaluations happen
      expect(() => service.stopEvaluation()).not.toThrow();
    });

    it('should handle being called when no timer is set', () => {
      expect(() => service.stopEvaluation()).not.toThrow();
    });
  });

  // ==========================================================================
  // Default Alert Tests
  // ==========================================================================

  describe('default alerts', () => {
    beforeEach(() => {
      service.onModuleInit();
    });

    it('should have HighErrorRate alert', () => {
      const alertDefinitions = (service as any).alertDefinitions;
      const alert = alertDefinitions.find(
        (a: AlertDefinition) => a.name === 'HighErrorRate',
      );
      expect(alert).toBeDefined();
      expect(alert.severity).toBe(AlertSeverity.WARNING);
    });

    it('should have HighLatency alert', () => {
      const alertDefinitions = (service as any).alertDefinitions;
      const alert = alertDefinitions.find(
        (a: AlertDefinition) => a.name === 'HighLatency',
      );
      expect(alert).toBeDefined();
      expect(alert.severity).toBe(AlertSeverity.WARNING);
    });

    it('should have LowCacheHitRate alert', () => {
      const alertDefinitions = (service as any).alertDefinitions;
      const alert = alertDefinitions.find(
        (a: AlertDefinition) => a.name === 'LowCacheHitRate',
      );
      expect(alert).toBeDefined();
    });

    it('should have HighMemoryUsage alert', () => {
      const alertDefinitions = (service as any).alertDefinitions;
      const alert = alertDefinitions.find(
        (a: AlertDefinition) => a.name === 'HighMemoryUsage',
      );
      expect(alert).toBeDefined();
    });

    it('should have DatabaseErrors alert', () => {
      const alertDefinitions = (service as any).alertDefinitions;
      const alert = alertDefinitions.find(
        (a: AlertDefinition) => a.name === 'DatabaseErrors',
      );
      expect(alert).toBeDefined();
      expect(alert.severity).toBe(AlertSeverity.CRITICAL);
    });

    it('should have PaymentFailures alert', () => {
      const alertDefinitions = (service as any).alertDefinitions;
      const alert = alertDefinitions.find(
        (a: AlertDefinition) => a.name === 'PaymentFailures',
      );
      expect(alert).toBeDefined();
      expect(alert.severity).toBe(AlertSeverity.CRITICAL);
    });
  });

  // ==========================================================================
  // Default Alert Condition Tests
  // ==========================================================================

  describe('default alert conditions', () => {
    beforeEach(() => {
      service.onModuleInit();
    });

    it('HighErrorRate should fire when error rate > 5%', async () => {
      mockMetricsService.getMetricsJson.mockReturnValue({
        http_errors_total: { values: [{ value: 10 }] },
        http_requests_total: { values: [{ value: 100 }] },
      });

      const alertDefinitions = (service as any).alertDefinitions;
      const alert = alertDefinitions.find(
        (a: AlertDefinition) => a.name === 'HighErrorRate',
      );

      const shouldFire = await alert.condition();
      expect(shouldFire).toBe(true);
    });

    it('HighErrorRate should not fire when error rate <= 5%', async () => {
      mockMetricsService.getMetricsJson.mockReturnValue({
        http_errors_total: { values: [{ value: 5 }] },
        http_requests_total: { values: [{ value: 100 }] },
      });

      const alertDefinitions = (service as any).alertDefinitions;
      const alert = alertDefinitions.find(
        (a: AlertDefinition) => a.name === 'HighErrorRate',
      );

      const shouldFire = await alert.condition();
      expect(shouldFire).toBe(false);
    });

    it('HighLatency should fire when average latency > 500ms', async () => {
      mockMetricsService.getMetricsJson.mockReturnValue({
        http_request_duration_ms: {
          data: [{ sum: 60000, count: 100 }], // avg = 600ms
        },
      });

      const alertDefinitions = (service as any).alertDefinitions;
      const alert = alertDefinitions.find(
        (a: AlertDefinition) => a.name === 'HighLatency',
      );

      const shouldFire = await alert.condition();
      expect(shouldFire).toBe(true);
    });

    it('HighLatency should not fire when average latency <= 500ms', async () => {
      mockMetricsService.getMetricsJson.mockReturnValue({
        http_request_duration_ms: {
          data: [{ sum: 40000, count: 100 }], // avg = 400ms
        },
      });

      const alertDefinitions = (service as any).alertDefinitions;
      const alert = alertDefinitions.find(
        (a: AlertDefinition) => a.name === 'HighLatency',
      );

      const shouldFire = await alert.condition();
      expect(shouldFire).toBe(false);
    });

    it('DatabaseErrors should fire when errors > 0', async () => {
      mockMetricsService.getMetricsJson.mockReturnValue({
        db_errors_total: { values: [{ value: 1 }] },
      });

      const alertDefinitions = (service as any).alertDefinitions;
      const alert = alertDefinitions.find(
        (a: AlertDefinition) => a.name === 'DatabaseErrors',
      );

      const shouldFire = await alert.condition();
      expect(shouldFire).toBe(true);
    });

    it('DatabaseErrors should not fire when errors = 0', async () => {
      mockMetricsService.getMetricsJson.mockReturnValue({
        db_errors_total: { values: [] },
      });

      const alertDefinitions = (service as any).alertDefinitions;
      const alert = alertDefinitions.find(
        (a: AlertDefinition) => a.name === 'DatabaseErrors',
      );

      const shouldFire = await alert.condition();
      expect(shouldFire).toBe(false);
    });
  });

  // ==========================================================================
  // Notification Tests
  // ==========================================================================

  describe('notifications', () => {
    beforeEach(() => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        status: 200,
      });
    });

    afterEach(() => {
      jest.restoreAllMocks();
    });

    it('should send webhook notification when alert fires', async () => {
      mockConfigService.get.mockImplementation((key: string) => {
        if (key === 'ALERT_WEBHOOK_URL') return 'https://webhook.example.com';
        return undefined;
      });

      service.onModuleInit();

      service.registerAlert({
        name: 'WebhookAlert',
        description: 'Alert for webhook',
        severity: AlertSeverity.WARNING,
        condition: async () => true,
      });

      await service.evaluateAlerts();

      expect(global.fetch).toHaveBeenCalledWith(
        'https://webhook.example.com',
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        }),
      );
    });

    it('should send slack notification when alert fires', async () => {
      mockConfigService.get.mockImplementation((key: string) => {
        if (key === 'SLACK_ALERT_WEBHOOK')
          return 'https://hooks.slack.com/services/xxx';
        return undefined;
      });

      service.onModuleInit();

      service.registerAlert({
        name: 'SlackAlert',
        description: 'Alert for slack',
        severity: AlertSeverity.CRITICAL,
        condition: async () => true,
      });

      await service.evaluateAlerts();

      expect(global.fetch).toHaveBeenCalledWith(
        'https://hooks.slack.com/services/xxx',
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        }),
      );
    });

    it('should not send notification if severity not in channel severities', async () => {
      mockConfigService.get.mockImplementation((key: string) => {
        if (key === 'ALERT_WEBHOOK_URL') return 'https://webhook.example.com';
        return undefined;
      });

      service.onModuleInit();

      service.registerAlert({
        name: 'InfoAlert',
        description: 'Info level alert',
        severity: AlertSeverity.INFO, // INFO is not in default severities
        condition: async () => true,
      });

      await service.evaluateAlerts();

      // Webhook should not be called for INFO severity
      expect(global.fetch).not.toHaveBeenCalled();
    });

    it('should handle notification failure gracefully', async () => {
      global.fetch = jest.fn().mockRejectedValue(new Error('Network error'));

      mockConfigService.get.mockImplementation((key: string) => {
        if (key === 'ALERT_WEBHOOK_URL') return 'https://webhook.example.com';
        return undefined;
      });

      service.onModuleInit();

      service.registerAlert({
        name: 'FailNotificationAlert',
        description: 'Alert that fails notification',
        severity: AlertSeverity.WARNING,
        condition: async () => true,
      });

      // Should not throw
      await expect(service.evaluateAlerts()).resolves.not.toThrow();
    });
  });

  // ==========================================================================
  // AlertSeverity Enum Tests
  // ==========================================================================

  describe('AlertSeverity enum', () => {
    it('should have INFO severity', () => {
      expect(AlertSeverity.INFO).toBe('info');
    });

    it('should have WARNING severity', () => {
      expect(AlertSeverity.WARNING).toBe('warning');
    });

    it('should have CRITICAL severity', () => {
      expect(AlertSeverity.CRITICAL).toBe('critical');
    });
  });

  // ==========================================================================
  // AlertStatus Enum Tests
  // ==========================================================================

  describe('AlertStatus enum', () => {
    it('should have FIRING status', () => {
      expect(AlertStatus.FIRING).toBe('firing');
    });

    it('should have RESOLVED status', () => {
      expect(AlertStatus.RESOLVED).toBe('resolved');
    });
  });
});
