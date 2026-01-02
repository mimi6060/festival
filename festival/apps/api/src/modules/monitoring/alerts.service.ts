import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MetricsService } from './metrics.service';

/**
 * Alert severity levels
 */
export enum AlertSeverity {
  INFO = 'info',
  WARNING = 'warning',
  CRITICAL = 'critical',
}

/**
 * Alert status
 */
export enum AlertStatus {
  FIRING = 'firing',
  RESOLVED = 'resolved',
}

/**
 * Alert definition
 */
export interface AlertDefinition {
  name: string;
  description: string;
  severity: AlertSeverity;
  condition: () => Promise<boolean>;
  labels?: Record<string, string>;
  annotations?: Record<string, string>;
}

/**
 * Active alert
 */
export interface ActiveAlert {
  name: string;
  severity: AlertSeverity;
  status: AlertStatus;
  message: string;
  labels: Record<string, string>;
  annotations: Record<string, string>;
  startsAt: Date;
  endsAt?: Date;
  value?: number;
}

/**
 * Alert notification channel
 */
export interface AlertChannel {
  name: string;
  type: 'webhook' | 'email' | 'slack' | 'pagerduty';
  config: Record<string, string>;
  severities: AlertSeverity[];
}

/**
 * Alerts Service
 *
 * Provides in-application alerting capabilities:
 * - Define alert rules based on metrics
 * - Track active alerts
 * - Send notifications to configured channels
 * - Integration with external alerting systems
 */
@Injectable()
export class AlertsService implements OnModuleInit {
  private readonly logger = new Logger(AlertsService.name);

  // Active alerts
  private activeAlerts = new Map<string, ActiveAlert>();

  // Alert definitions
  private alertDefinitions: AlertDefinition[] = [];

  // Notification channels
  private channels: AlertChannel[] = [];

  // Evaluation interval (ms)
  private evaluationInterval = 30000;
  private evaluationTimer?: NodeJS.Timeout;

  // Alert history (last 100 alerts)
  private alertHistory: ActiveAlert[] = [];
  private readonly maxHistorySize = 100;

  constructor(
    private readonly configService: ConfigService,
    private readonly metricsService: MetricsService,
  ) {}

  onModuleInit(): void {
    this.initializeDefaultAlerts();
    this.initializeChannels();
    this.startEvaluation();
    this.logger.log('Alerts service initialized');
  }

  /**
   * Initialize default alert definitions
   */
  private initializeDefaultAlerts(): void {
    // High error rate alert
    this.registerAlert({
      name: 'HighErrorRate',
      description: 'HTTP error rate is above threshold',
      severity: AlertSeverity.WARNING,
      condition: async () => {
        const metrics = this.metricsService.getMetricsJson();
        const errors = this.sumMetricValues(metrics['http_errors_total']);
        const total = this.sumMetricValues(metrics['http_requests_total']);
        const errorRate = total > 0 ? (errors / total) * 100 : 0;
        return errorRate > 5;
      },
      labels: { category: 'api' },
      annotations: { runbook_url: 'https://docs.festival.app/runbooks/high-error-rate' },
    });

    // High latency alert
    this.registerAlert({
      name: 'HighLatency',
      description: 'API response time is above threshold',
      severity: AlertSeverity.WARNING,
      condition: async () => {
        const metrics = this.metricsService.getMetricsJson();
        const histogram = metrics['http_request_duration_ms'];
        if (!histogram?.data?.length) {return false;}

        // Calculate approximate P95
        const data = histogram.data[0];
        if (!data) {return false;}
        const avgLatency = data.count > 0 ? data.sum / data.count : 0;
        return avgLatency > 500;
      },
      labels: { category: 'api' },
    });

    // Low cache hit rate alert
    this.registerAlert({
      name: 'LowCacheHitRate',
      description: 'Cache hit rate is below threshold',
      severity: AlertSeverity.WARNING,
      condition: async () => {
        const metrics = this.metricsService.getMetricsJson();
        const hits = this.sumMetricValues(metrics['cache_hits_total']);
        const misses = this.sumMetricValues(metrics['cache_misses_total']);
        const total = hits + misses;
        const hitRate = total > 0 ? (hits / total) * 100 : 100;
        return total > 100 && hitRate < 70;
      },
      labels: { category: 'cache' },
    });

    // High memory usage alert
    this.registerAlert({
      name: 'HighMemoryUsage',
      description: 'Process memory usage is above threshold',
      severity: AlertSeverity.WARNING,
      condition: async () => {
        const memUsage = process.memoryUsage();
        const heapUsedMB = memUsage.heapUsed / 1024 / 1024;
        return heapUsedMB > 1024; // 1GB
      },
      labels: { category: 'infrastructure' },
    });

    // Database errors alert
    this.registerAlert({
      name: 'DatabaseErrors',
      description: 'Database errors detected',
      severity: AlertSeverity.CRITICAL,
      condition: async () => {
        const metrics = this.metricsService.getMetricsJson();
        const errors = this.sumMetricValues(metrics['db_errors_total']);
        return errors > 0;
      },
      labels: { category: 'database' },
    });

    // Payment failures alert
    this.registerAlert({
      name: 'PaymentFailures',
      description: 'Payment failure rate is above threshold',
      severity: AlertSeverity.CRITICAL,
      condition: async () => {
        const metrics = this.metricsService.getMetricsJson();
        const payments = metrics['payments_total'];
        if (!payments?.values) {return false;}

        let total = 0;
        let failed = 0;
        for (const value of payments.values) {
          total += value.value;
          if (value.labels?.status === 'failed') {
            failed += value.value;
          }
        }
        const failureRate = total > 0 ? (failed / total) * 100 : 0;
        return total > 10 && failureRate > 5;
      },
      labels: { category: 'business', domain: 'payments' },
    });
  }

  /**
   * Initialize notification channels from config
   */
  private initializeChannels(): void {
    // Webhook channel (if configured)
    const webhookUrl = this.configService.get<string>('ALERT_WEBHOOK_URL');
    if (webhookUrl) {
      this.channels.push({
        name: 'webhook',
        type: 'webhook',
        config: { url: webhookUrl },
        severities: [AlertSeverity.WARNING, AlertSeverity.CRITICAL],
      });
    }

    // Slack channel (if configured)
    const slackWebhook = this.configService.get<string>('SLACK_ALERT_WEBHOOK');
    if (slackWebhook) {
      this.channels.push({
        name: 'slack',
        type: 'slack',
        config: { webhook_url: slackWebhook },
        severities: [AlertSeverity.WARNING, AlertSeverity.CRITICAL],
      });
    }
  }

  /**
   * Start periodic alert evaluation
   */
  private startEvaluation(): void {
    this.evaluationTimer = setInterval(() => {
      this.evaluateAlerts().catch((err) => {
        this.logger.error('Error evaluating alerts', err);
      });
    }, this.evaluationInterval);
  }

  /**
   * Stop alert evaluation
   */
  stopEvaluation(): void {
    if (this.evaluationTimer) {
      clearInterval(this.evaluationTimer);
    }
  }

  /**
   * Register a new alert definition
   */
  registerAlert(definition: AlertDefinition): void {
    this.alertDefinitions.push(definition);
    this.logger.debug(`Registered alert: ${definition.name}`);
  }

  /**
   * Evaluate all alert conditions
   */
  async evaluateAlerts(): Promise<void> {
    for (const definition of this.alertDefinitions) {
      try {
        const shouldFire = await definition.condition();
        const existingAlert = this.activeAlerts.get(definition.name);

        if (shouldFire && !existingAlert) {
          // New alert - fire it
          await this.fireAlert(definition);
        } else if (!shouldFire && existingAlert) {
          // Alert resolved
          await this.resolveAlert(definition.name);
        }
      } catch (error) {
        this.logger.error(`Error evaluating alert ${definition.name}`, error);
      }
    }
  }

  /**
   * Fire a new alert
   */
  private async fireAlert(definition: AlertDefinition): Promise<void> {
    const alert: ActiveAlert = {
      name: definition.name,
      severity: definition.severity,
      status: AlertStatus.FIRING,
      message: definition.description,
      labels: definition.labels || {},
      annotations: definition.annotations || {},
      startsAt: new Date(),
    };

    this.activeAlerts.set(definition.name, alert);
    this.addToHistory(alert);

    this.logger.warn(`Alert fired: ${definition.name} (${definition.severity})`);

    // Record metric
    this.metricsService.incrementCounter('alerts_total', {
      name: definition.name,
      severity: definition.severity,
      status: 'firing',
    });

    // Send notifications
    await this.sendNotifications(alert);
  }

  /**
   * Resolve an active alert
   */
  private async resolveAlert(alertName: string): Promise<void> {
    const alert = this.activeAlerts.get(alertName);
    if (!alert) {return;}

    alert.status = AlertStatus.RESOLVED;
    alert.endsAt = new Date();

    this.activeAlerts.delete(alertName);
    this.addToHistory(alert);

    this.logger.log(`Alert resolved: ${alertName}`);

    // Record metric
    this.metricsService.incrementCounter('alerts_total', {
      name: alertName,
      severity: alert.severity,
      status: 'resolved',
    });

    // Send resolution notifications
    await this.sendNotifications(alert);
  }

  /**
   * Add alert to history
   */
  private addToHistory(alert: ActiveAlert): void {
    this.alertHistory.unshift({ ...alert });
    if (this.alertHistory.length > this.maxHistorySize) {
      this.alertHistory.pop();
    }
  }

  /**
   * Send notifications for an alert
   */
  private async sendNotifications(alert: ActiveAlert): Promise<void> {
    for (const channel of this.channels) {
      if (!channel.severities.includes(alert.severity)) {
        continue;
      }

      try {
        switch (channel.type) {
          case 'webhook':
            await this.sendWebhookNotification(channel, alert);
            break;
          case 'slack':
            await this.sendSlackNotification(channel, alert);
            break;
          default:
            this.logger.debug(`Unsupported channel type: ${channel.type}`);
        }
      } catch (error) {
        this.logger.error(`Failed to send notification to ${channel.name}`, error);
      }
    }
  }

  /**
   * Send webhook notification
   */
  private async sendWebhookNotification(channel: AlertChannel, alert: ActiveAlert): Promise<void> {
    const payload = {
      version: '1.0',
      alerts: [
        {
          status: alert.status,
          labels: {
            alertname: alert.name,
            severity: alert.severity,
            ...alert.labels,
          },
          annotations: {
            description: alert.message,
            ...alert.annotations,
          },
          startsAt: alert.startsAt.toISOString(),
          endsAt: alert.endsAt?.toISOString(),
        },
      ],
    };

    try {
      await fetch(channel.config['url'], {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
    } catch {
      this.logger.error(`Webhook notification failed for ${channel.name}`);
    }
  }

  /**
   * Send Slack notification
   */
  private async sendSlackNotification(channel: AlertChannel, alert: ActiveAlert): Promise<void> {
    const color = alert.status === AlertStatus.RESOLVED ? 'good' :
                  alert.severity === AlertSeverity.CRITICAL ? 'danger' : 'warning';

    const emoji = alert.status === AlertStatus.RESOLVED ? ':white_check_mark:' :
                  alert.severity === AlertSeverity.CRITICAL ? ':rotating_light:' : ':warning:';

    const payload = {
      attachments: [
        {
          color,
          title: `${emoji} ${alert.name}`,
          text: alert.message,
          fields: [
            { title: 'Status', value: alert.status, short: true },
            { title: 'Severity', value: alert.severity, short: true },
            { title: 'Started At', value: alert.startsAt.toISOString(), short: true },
            ...(alert.endsAt ? [{ title: 'Ended At', value: alert.endsAt.toISOString(), short: true }] : []),
          ],
          footer: 'Festival Platform Alerts',
          ts: Math.floor(Date.now() / 1000),
        },
      ],
    };

    try {
      await fetch(channel.config['webhook_url'], {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
    } catch {
      this.logger.error(`Slack notification failed for ${channel.name}`);
    }
  }

  /**
   * Get all active alerts
   */
  getActiveAlerts(): ActiveAlert[] {
    return Array.from(this.activeAlerts.values());
  }

  /**
   * Get alert history
   */
  getAlertHistory(): ActiveAlert[] {
    return this.alertHistory;
  }

  /**
   * Get alerts by severity
   */
  getAlertsBySeverity(severity: AlertSeverity): ActiveAlert[] {
    return this.getActiveAlerts().filter((a) => a.severity === severity);
  }

  /**
   * Get alert summary
   */
  getAlertSummary(): Record<string, number> {
    const alerts = this.getActiveAlerts();
    return {
      total: alerts.length,
      critical: alerts.filter((a) => a.severity === AlertSeverity.CRITICAL).length,
      warning: alerts.filter((a) => a.severity === AlertSeverity.WARNING).length,
      info: alerts.filter((a) => a.severity === AlertSeverity.INFO).length,
    };
  }

  /**
   * Helper: sum metric values
   */
  private sumMetricValues(metric: { values?: { value: number }[] } | undefined): number {
    if (!metric?.values) {return 0;}
    return metric.values.reduce((sum: number, v: { value: number }) => sum + (v.value || 0), 0);
  }
}
