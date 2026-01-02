import { Controller, Get, Header, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { MetricsService } from './metrics.service';

/**
 * Monitoring Controller
 *
 * Provides endpoints for metrics collection and monitoring
 */
@ApiTags('Monitoring')
@Controller('monitoring')
export class MonitoringController {
  constructor(private readonly metricsService: MetricsService) {}

  /**
   * Prometheus metrics endpoint
   */
  @Get('metrics')
  @Header('Content-Type', 'text/plain; charset=utf-8')
  @ApiOperation({
    summary: 'Get Prometheus metrics',
    description: 'Returns all metrics in Prometheus text format',
  })
  @ApiResponse({
    status: 200,
    description: 'Prometheus metrics in text format',
  })
  getPrometheusMetrics(): string {
    return this.metricsService.getPrometheusMetrics();
  }

  /**
   * JSON metrics endpoint
   */
  @Get('metrics/json')
  @ApiOperation({
    summary: 'Get metrics as JSON',
    description: 'Returns all metrics in JSON format for easy consumption',
  })
  @ApiResponse({
    status: 200,
    description: 'Metrics in JSON format',
  })
  getJsonMetrics(): Record<string, any> {
    return this.metricsService.getMetricsJson();
  }

  /**
   * Simple status endpoint for load balancer health checks
   */
  @Get('status')
  @ApiOperation({
    summary: 'Get service status',
    description: 'Simple status check for load balancers',
  })
  @ApiResponse({
    status: 200,
    description: 'Service status',
  })
  getStatus(): { status: string; timestamp: string; uptime: number } {
    return {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    };
  }

  /**
   * Detailed system info endpoint
   */
  @Get('info')
  @ApiOperation({
    summary: 'Get system information',
    description: 'Returns detailed system and process information',
  })
  @ApiResponse({
    status: 200,
    description: 'System information',
  })
  @ApiQuery({
    name: 'detailed',
    required: false,
    type: Boolean,
    description: 'Include detailed memory information',
  })
  getSystemInfo(@Query('detailed') detailed?: string): Record<string, any> {
    const memUsage = process.memoryUsage();
    const isDetailed = detailed === 'true';

    const info: Record<string, any> = {
      service: 'festival-api',
      version: process.env['npm_package_version'] || '1.0.0',
      environment: process.env['NODE_ENV'] || 'development',
      uptime: {
        seconds: Math.floor(process.uptime()),
        formatted: this.formatUptime(process.uptime()),
      },
      memory: {
        heapUsed: this.formatBytes(memUsage.heapUsed),
        heapTotal: this.formatBytes(memUsage.heapTotal),
        rss: this.formatBytes(memUsage.rss),
        external: this.formatBytes(memUsage.external),
      },
      process: {
        pid: process.pid,
        nodeVersion: process.version,
        platform: process.platform,
        arch: process.arch,
      },
    };

    if (isDetailed) {
      info.memory.arrayBuffers = this.formatBytes(memUsage.arrayBuffers || 0);
      info.cpu = process.cpuUsage();
      info.resourceUsage = process.resourceUsage?.() || null;
    }

    return info;
  }

  /**
   * Business metrics summary
   */
  @Get('summary')
  @ApiOperation({
    summary: 'Get business metrics summary',
    description: 'Returns a summary of key business metrics',
  })
  @ApiResponse({
    status: 200,
    description: 'Business metrics summary',
  })
  getBusinessSummary(): Record<string, any> {
    const metrics = this.metricsService.getMetricsJson();

    // Extract key business metrics
    const summary: Record<string, any> = {
      timestamp: new Date().toISOString(),
      http: {
        totalRequests: this.sumMetricValues(metrics['http_requests_total']),
        totalErrors: this.sumMetricValues(metrics['http_errors_total']),
      },
      cache: {
        hits: this.sumMetricValues(metrics['cache_hits_total']),
        misses: this.sumMetricValues(metrics['cache_misses_total']),
        hitRate: this.calculateHitRate(metrics),
      },
      database: {
        totalQueries: this.sumMetricValues(metrics['db_queries_total']),
        totalErrors: this.sumMetricValues(metrics['db_errors_total']),
      },
      business: {
        ticketsSold: this.sumMetricValues(metrics['tickets_sold_total']),
        ticketsValidated: this.sumMetricValues(metrics['tickets_validated_total']),
        totalPayments: this.sumMetricValues(metrics['payments_total']),
        cashlessTopups: this.sumMetricValues(metrics['cashless_topups_total']),
        cashlessPayments: this.sumMetricValues(metrics['cashless_payments_total']),
      },
      websocket: {
        activeConnections: this.sumMetricValues(metrics['websocket_connections_active']),
        totalMessages: this.sumMetricValues(metrics['websocket_messages_total']),
      },
    };

    return summary;
  }

  // ==================== PRIVATE HELPERS ====================

  private formatBytes(bytes: number): string {
    const units = ['B', 'KB', 'MB', 'GB', 'TB'];
    let unitIndex = 0;
    let size = bytes;

    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }

    return `${size.toFixed(2)} ${units[unitIndex]}`;
  }

  private formatUptime(seconds: number): string {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);

    const parts: string[] = [];
    if (days > 0) {parts.push(`${days}d`);}
    if (hours > 0) {parts.push(`${hours}h`);}
    if (minutes > 0) {parts.push(`${minutes}m`);}
    parts.push(`${secs}s`);

    return parts.join(' ');
  }

  private sumMetricValues(metric: any): number {
    if (!metric?.values) {return 0;}
    return metric.values.reduce((sum: number, v: any) => sum + (v.value || 0), 0);
  }

  private calculateHitRate(metrics: Record<string, any>): string {
    const hits = this.sumMetricValues(metrics['cache_hits_total']);
    const misses = this.sumMetricValues(metrics['cache_misses_total']);
    const total = hits + misses;

    if (total === 0) {return '0%';}
    return `${((hits / total) * 100).toFixed(2)}%`;
  }
}
