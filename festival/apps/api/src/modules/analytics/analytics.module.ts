import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from '../prisma/prisma.module';
import { CacheModule } from '../cache/cache.module';
import { AnalyticsService } from './services/analytics.service';
import { AdvancedMetricsService } from './services/advanced-metrics.service';
import { CustomReportsService } from './services/custom-reports.service';
import { DashboardConfigService } from './services/dashboard-config.service';
import { ExportService } from './services/export.service';
import { RealtimeAggregationService } from './services/realtime-aggregation.service';
import { AnalyticsController } from './controllers/analytics.controller';

@Module({
  imports: [ConfigModule, PrismaModule, CacheModule],
  controllers: [AnalyticsController],
  providers: [
    AnalyticsService,
    AdvancedMetricsService,
    CustomReportsService,
    DashboardConfigService,
    ExportService,
    RealtimeAggregationService,
  ],
  exports: [
    AnalyticsService,
    AdvancedMetricsService,
    CustomReportsService,
    DashboardConfigService,
    ExportService,
    RealtimeAggregationService,
  ],
})
export class AnalyticsModule {}
