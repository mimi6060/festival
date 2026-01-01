import { Module } from '@nestjs/common';
import {
  PrometheusModule,
  makeCounterProvider,
  makeGaugeProvider,
  makeHistogramProvider,
} from '@willsoto/nestjs-prometheus';
import { MetricsController } from './metrics.controller';

@Module({
  imports: [
    PrometheusModule.register({
      defaultLabels: {
        app: 'festival-api',
      },
      defaultMetrics: {
        enabled: true,
      },
    }),
  ],
  controllers: [MetricsController],
  providers: [
    // HTTP request counter
    makeCounterProvider({
      name: 'http_requests_total',
      help: 'Total number of HTTP requests',
      labelNames: ['method', 'path', 'status'],
    }),

    // HTTP request duration histogram
    makeHistogramProvider({
      name: 'http_request_duration_seconds',
      help: 'HTTP request duration in seconds',
      labelNames: ['method', 'path', 'status'],
      buckets: [0.01, 0.05, 0.1, 0.5, 1, 2, 5, 10],
    }),

    // Active connections gauge
    makeGaugeProvider({
      name: 'active_connections',
      help: 'Number of active connections',
    }),

    // Database connection pool gauge
    makeGaugeProvider({
      name: 'database_pool_connections',
      help: 'Number of database pool connections',
      labelNames: ['state'],
    }),

    // Business metrics
    makeCounterProvider({
      name: 'tickets_purchased_total',
      help: 'Total number of tickets purchased',
      labelNames: ['festival_id', 'ticket_type'],
    }),

    makeCounterProvider({
      name: 'payments_processed_total',
      help: 'Total number of payments processed',
      labelNames: ['status', 'payment_method'],
    }),

    makeGaugeProvider({
      name: 'cashless_balance_total',
      help: 'Total cashless balance across all users',
    }),

    makeHistogramProvider({
      name: 'payment_processing_duration_seconds',
      help: 'Payment processing duration in seconds',
      buckets: [0.1, 0.5, 1, 2, 5, 10, 30],
    }),
  ],
  exports: [PrometheusModule],
})
export class MetricsModule {}
