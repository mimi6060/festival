import { Module, Global } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MetricsService } from './metrics.service';
import { MonitoringController } from './monitoring.controller';
import { MetricsInterceptor } from './metrics.interceptor';

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
 */
@Global()
@Module({
  imports: [ConfigModule],
  controllers: [MonitoringController],
  providers: [MetricsService, MetricsInterceptor],
  exports: [MetricsService, MetricsInterceptor],
})
export class MonitoringModule {}
