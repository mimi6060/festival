import { Module, forwardRef } from '@nestjs/common';
import { AnalyticsService } from './services/analytics.service';
import { ExcelExportService } from './services/excel-export.service';
import { ExportService } from './services/export.service';
import { AdvancedMetricsService } from './services/advanced-metrics.service';
import { CustomReportsService } from './services/custom-reports.service';
import { RealtimeAggregationService } from './services/realtime-aggregation.service';
import { DashboardConfigService } from './services/dashboard-config.service';
import { AnalyticsController } from './controllers/analytics.controller';
import { AdminExportController } from './controllers/admin-export.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { CacheModule } from '../cache/cache.module';
import { QueueModule } from '../queue/queue.module';

@Module({
  imports: [
    PrismaModule,
    CacheModule,
    forwardRef(() => QueueModule),
  ],
  controllers: [AnalyticsController, AdminExportController],
  providers: [
    AnalyticsService,
    ExcelExportService,
    ExportService,
    AdvancedMetricsService,
    CustomReportsService,
    RealtimeAggregationService,
    DashboardConfigService,
  ],
  exports: [
    AnalyticsService,
    ExcelExportService,
    ExportService,
    AdvancedMetricsService,
  ],
})
export class AnalyticsModule {}
