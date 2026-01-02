import { Module, Global } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MetricsService } from './metrics.service';
import { MonitoringController } from './monitoring.controller';
import { MetricsInterceptor } from './metrics.interceptor';
import { AlertsService } from './alerts.service';
import { HealthIndicatorsService } from './health-indicators.service';

/**
 * Monitoring Module
 *
 * Provides comprehensive monitoring capabilities:
 * - Prometheus-compatible metrics endpoint
 * - Custom business metrics
 * - HTTP request/response metrics
 * - Database query metrics
 * - Cache performance metrics
 * - WebSocket connection metrics
 * - In-application alerting with notifications
 * - Health indicators for dependencies
 */
@Global()
@Module({
  imports: [ConfigModule],
  controllers: [MonitoringController],
  providers: [
    MetricsService,
    MetricsInterceptor,
    AlertsService,
    HealthIndicatorsService,
  ],
  exports: [
    MetricsService,
    MetricsInterceptor,
    AlertsService,
    HealthIndicatorsService,
  ],
})
export class MonitoringModule {}
