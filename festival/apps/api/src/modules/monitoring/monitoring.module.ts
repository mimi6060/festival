import { Module, Global } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TerminusModule } from '@nestjs/terminus';
import { MetricsService } from './metrics.service';
import { MonitoringController } from './monitoring.controller';
import { MetricsInterceptor } from './metrics.interceptor';
import { AlertsService } from './alerts.service';
import {
  HealthIndicatorsService,
  DatabaseHealthIndicator,
  RedisHealthIndicator,
  CustomMemoryHealthIndicator,
  CustomDiskHealthIndicator,
  EventLoopHealthIndicator,
  ExternalServiceHealthIndicator,
} from './health-indicators.service';

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
 * - Health indicators for dependencies using @nestjs/terminus pattern
 */
@Global()
@Module({
  imports: [ConfigModule, TerminusModule],
  controllers: [MonitoringController],
  providers: [
    MetricsService,
    MetricsInterceptor,
    AlertsService,
    // Health indicators following @nestjs/terminus HealthIndicator pattern
    DatabaseHealthIndicator,
    RedisHealthIndicator,
    CustomMemoryHealthIndicator,
    CustomDiskHealthIndicator,
    EventLoopHealthIndicator,
    ExternalServiceHealthIndicator,
    // Aggregated health indicators service
    HealthIndicatorsService,
  ],
  exports: [
    MetricsService,
    MetricsInterceptor,
    AlertsService,
    // Export individual health indicators for use in other modules
    DatabaseHealthIndicator,
    RedisHealthIndicator,
    CustomMemoryHealthIndicator,
    CustomDiskHealthIndicator,
    EventLoopHealthIndicator,
    ExternalServiceHealthIndicator,
    // Export aggregated service
    HealthIndicatorsService,
  ],
})
export class MonitoringModule {}
