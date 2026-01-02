import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  Res,
  UseGuards,
  HttpStatus,
} from '@nestjs/common';
import type { Response } from 'express';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';

import { AnalyticsService } from '../services/analytics.service';
import { AdvancedMetricsService } from '../services/advanced-metrics.service';
import { CustomReportsService } from '../services/custom-reports.service';
import { RealtimeAggregationService } from '../services/realtime-aggregation.service';
import { ExportService } from '../services/export.service';
import { DashboardConfigService } from '../services/dashboard-config.service';

import {
  DashboardQueryDto,
  SalesQueryDto,
  CashlessQueryDto,
  AttendanceQueryDto,
  ZoneQueryDto,
  VendorQueryDto,
  RealtimeQueryDto,
  ExportQueryDto,
} from '../dto/analytics-query.dto';

@ApiTags('Analytics')
@Controller('analytics')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class AnalyticsController {
  constructor(
    private readonly analyticsService: AnalyticsService,
    private readonly advancedMetricsService: AdvancedMetricsService,
    private readonly customReportsService: CustomReportsService,
    private readonly realtimeService: RealtimeAggregationService,
    private readonly exportService: ExportService,
    private readonly dashboardConfigService: DashboardConfigService,
  ) {}

  // ============== Basic Analytics ==============

  @Get('festivals/:festivalId/dashboard')
  @Roles('ADMIN', 'ORGANIZER')
  @ApiOperation({ summary: 'Get dashboard KPIs for a festival' })
  @ApiParam({ name: 'festivalId', description: 'Festival ID' })
  async getFestivalDashboard(
    @Param('festivalId') festivalId: string,
    @Query() query: DashboardQueryDto,
  ) {
    return this.analyticsService.getDashboardKPIs(festivalId, query);
  }

  @Get('festivals/:festivalId/sales')
  @Roles('ADMIN', 'ORGANIZER')
  @ApiOperation({ summary: 'Get sales analytics for a festival' })
  async getSalesAnalytics(
    @Param('festivalId') festivalId: string,
    @Query() query: SalesQueryDto,
  ) {
    return this.analyticsService.getSalesAnalytics(festivalId, query);
  }

  @Get('festivals/:festivalId/cashless')
  @Roles('ADMIN', 'ORGANIZER')
  @ApiOperation({ summary: 'Get cashless analytics for a festival' })
  async getCashlessAnalytics(
    @Param('festivalId') festivalId: string,
    @Query() query: CashlessQueryDto,
  ) {
    return this.analyticsService.getCashlessAnalytics(festivalId, query);
  }

  @Get('festivals/:festivalId/attendance')
  @Roles('ADMIN', 'ORGANIZER')
  @ApiOperation({ summary: 'Get attendance analytics for a festival' })
  async getAttendanceAnalytics(
    @Param('festivalId') festivalId: string,
    @Query() query: AttendanceQueryDto,
  ) {
    return this.analyticsService.getAttendanceAnalytics(festivalId, query);
  }

  @Get('festivals/:festivalId/zones')
  @Roles('ADMIN', 'ORGANIZER')
  @ApiOperation({ summary: 'Get zone analytics for a festival' })
  async getZoneAnalytics(
    @Param('festivalId') festivalId: string,
    @Query() query: ZoneQueryDto,
  ) {
    return this.analyticsService.getZoneAnalytics(festivalId, query);
  }

  @Get('festivals/:festivalId/vendors')
  @Roles('ADMIN', 'ORGANIZER')
  @ApiOperation({ summary: 'Get vendor analytics for a festival' })
  async getVendorAnalytics(
    @Param('festivalId') festivalId: string,
    @Query() query: VendorQueryDto,
  ) {
    return this.analyticsService.getVendorAnalytics(festivalId, query);
  }

  // ============== Advanced Metrics ==============

  @Get('festivals/:festivalId/metrics/revenue')
  @Roles('ADMIN', 'ORGANIZER')
  @ApiOperation({ summary: 'Get advanced revenue metrics' })
  async getRevenueMetrics(
    @Param('festivalId') festivalId: string,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
    return this.advancedMetricsService.getRevenueMetrics(
      festivalId,
      new Date(startDate),
      new Date(endDate),
    );
  }

  @Get('festivals/:festivalId/metrics/customers')
  @Roles('ADMIN', 'ORGANIZER')
  @ApiOperation({ summary: 'Get customer behavior metrics' })
  async getCustomerMetrics(
    @Param('festivalId') festivalId: string,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
    return this.advancedMetricsService.getCustomerMetrics(
      festivalId,
      new Date(startDate),
      new Date(endDate),
    );
  }

  @Get('festivals/:festivalId/metrics/performance')
  @Roles('ADMIN', 'ORGANIZER')
  @ApiOperation({ summary: 'Get operational performance metrics' })
  async getPerformanceMetrics(
    @Param('festivalId') festivalId: string,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
    return this.advancedMetricsService.getPerformanceMetrics(
      festivalId,
      new Date(startDate),
      new Date(endDate),
    );
  }

  @Get('festivals/:festivalId/metrics/fraud')
  @Roles('ADMIN', 'ORGANIZER')
  @ApiOperation({ summary: 'Get fraud detection metrics' })
  async getFraudMetrics(
    @Param('festivalId') festivalId: string,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
    return this.advancedMetricsService.getFraudMetrics(
      festivalId,
      new Date(startDate),
      new Date(endDate),
    );
  }

  @Get('festivals/:festivalId/metrics/growth')
  @Roles('ADMIN', 'ORGANIZER')
  @ApiOperation({ summary: 'Get growth and trend metrics' })
  async getGrowthMetrics(
    @Param('festivalId') festivalId: string,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
    return this.advancedMetricsService.getGrowthMetrics(
      festivalId,
      new Date(startDate),
      new Date(endDate),
    );
  }

  @Get('festivals/:festivalId/metrics/forecast')
  @Roles('ADMIN', 'ORGANIZER')
  @ApiOperation({ summary: 'Get forecast metrics' })
  @ApiQuery({ name: 'daysAhead', required: false, description: 'Number of days to forecast' })
  async getForecastMetrics(
    @Param('festivalId') festivalId: string,
    @Query('daysAhead') daysAhead?: number,
  ) {
    return this.advancedMetricsService.getForecastMetrics(festivalId, daysAhead);
  }

  @Get('festivals/:festivalId/metrics/staff')
  @Roles('ADMIN', 'ORGANIZER')
  @ApiOperation({ summary: 'Get staff performance metrics' })
  async getStaffMetrics(
    @Param('festivalId') festivalId: string,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
    return this.advancedMetricsService.getStaffMetrics(
      festivalId,
      new Date(startDate),
      new Date(endDate),
    );
  }

  @Get('festivals/:festivalId/metrics/environmental')
  @Roles('ADMIN', 'ORGANIZER')
  @ApiOperation({ summary: 'Get environmental/sustainability metrics' })
  async getEnvironmentalMetrics(
    @Param('festivalId') festivalId: string,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
    return this.advancedMetricsService.getEnvironmentalMetrics(
      festivalId,
      new Date(startDate),
      new Date(endDate),
    );
  }

  @Get('festivals/:festivalId/metrics/security')
  @Roles('ADMIN', 'ORGANIZER')
  @ApiOperation({ summary: 'Get security metrics' })
  async getSecurityMetrics(
    @Param('festivalId') festivalId: string,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
    return this.advancedMetricsService.getSecurityMetrics(
      festivalId,
      new Date(startDate),
      new Date(endDate),
    );
  }

  @Get('festivals/:festivalId/metrics/comprehensive')
  @Roles('ADMIN', 'ORGANIZER')
  @ApiOperation({ summary: 'Get comprehensive analytics combining all metrics' })
  async getComprehensiveAnalytics(
    @Param('festivalId') festivalId: string,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
    return this.advancedMetricsService.getComprehensiveAnalytics(
      festivalId,
      new Date(startDate),
      new Date(endDate),
    );
  }

  // ============== Custom Reports ==============

  @Get('festivals/:festivalId/reports')
  @Roles('ADMIN', 'ORGANIZER')
  @ApiOperation({ summary: 'Get all custom reports for a festival' })
  async getReports(@Param('festivalId') festivalId: string) {
    return this.customReportsService.getReports(festivalId);
  }

  @Post('festivals/:festivalId/reports')
  @Roles('ADMIN', 'ORGANIZER')
  @ApiOperation({ summary: 'Create a custom report configuration' })
  async createReport(
    @Param('festivalId') festivalId: string,
    @CurrentUser() user: { id: string },
    @Body() body: { name: string; description?: string; metrics: string[]; format: string },
  ) {
    return this.customReportsService.createReport(festivalId, user.id, body as any);
  }

  @Get('reports/:reportId')
  @Roles('ADMIN', 'ORGANIZER')
  @ApiOperation({ summary: 'Get a specific report configuration' })
  async getReport(@Param('reportId') reportId: string) {
    return this.customReportsService.getReport(reportId);
  }

  @Post('reports/:reportId/execute')
  @Roles('ADMIN', 'ORGANIZER')
  @ApiOperation({ summary: 'Execute a custom report' })
  async executeReport(
    @Param('reportId') reportId: string,
    @Body() body: { startDate?: string; endDate?: string },
  ) {
    const timeRange = body.startDate && body.endDate
      ? { startDate: new Date(body.startDate), endDate: new Date(body.endDate) }
      : undefined;
    return this.customReportsService.executeReport(reportId, timeRange);
  }

  @Delete('reports/:reportId')
  @Roles('ADMIN', 'ORGANIZER')
  @ApiOperation({ summary: 'Delete a custom report' })
  async deleteReport(@Param('reportId') reportId: string) {
    await this.customReportsService.deleteReport(reportId);
    return { success: true };
  }

  @Get('festivals/:festivalId/comparison')
  @Roles('ADMIN', 'ORGANIZER')
  @ApiOperation({ summary: 'Get comparison analytics between two periods' })
  async getComparisonAnalytics(
    @Param('festivalId') festivalId: string,
    @Query('currentStart') currentStart: string,
    @Query('currentEnd') currentEnd: string,
    @Query('previousStart') previousStart: string,
    @Query('previousEnd') previousEnd: string,
    @Query('metrics') metrics: string,
  ) {
    return this.customReportsService.getComparisonAnalytics(
      festivalId,
      { startDate: new Date(currentStart), endDate: new Date(currentEnd) },
      { startDate: new Date(previousStart), endDate: new Date(previousEnd) },
      metrics.split(','),
    );
  }

  @Get('festivals/:festivalId/cohort')
  @Roles('ADMIN', 'ORGANIZER')
  @ApiOperation({ summary: 'Get cohort analysis' })
  async getCohortAnalysis(
    @Param('festivalId') festivalId: string,
    @Query('cohortType') cohortType: 'acquisition_date' | 'ticket_type' | 'first_purchase',
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
    return this.customReportsService.getCohortAnalysis(
      festivalId,
      cohortType,
      { startDate: new Date(startDate), endDate: new Date(endDate) },
    );
  }

  @Get('festivals/:festivalId/funnel/:funnelName')
  @Roles('ADMIN', 'ORGANIZER')
  @ApiOperation({ summary: 'Get funnel analysis' })
  async getFunnelAnalysis(
    @Param('festivalId') festivalId: string,
    @Param('funnelName') funnelName: string,
  ) {
    return this.customReportsService.getFunnelAnalysis(festivalId, funnelName);
  }

  @Get('festivals/:festivalId/anomalies')
  @Roles('ADMIN', 'ORGANIZER')
  @ApiOperation({ summary: 'Detect anomalies in metrics' })
  async detectAnomalies(
    @Param('festivalId') festivalId: string,
    @Query('metric') metric: string,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
    return this.customReportsService.detectAnomalies(
      festivalId,
      metric,
      { startDate: new Date(startDate), endDate: new Date(endDate) },
    );
  }

  @Get('festivals/:festivalId/benchmarks')
  @Roles('ADMIN', 'ORGANIZER')
  @ApiOperation({ summary: 'Get industry benchmark comparisons' })
  async getBenchmarks(@Param('festivalId') festivalId: string) {
    return this.customReportsService.getBenchmarks(festivalId);
  }

  // ============== Realtime Analytics ==============

  @Get('festivals/:festivalId/realtime')
  @Roles('ADMIN', 'ORGANIZER', 'STAFF')
  @ApiOperation({ summary: 'Get realtime analytics' })
  async getRealtimeAnalytics(
    @Param('festivalId') festivalId: string,
    @Query() query: RealtimeQueryDto,
  ) {
    return this.analyticsService.getRealtimeAnalytics(festivalId, query);
  }

  @Get('festivals/:festivalId/realtime/live')
  @Roles('ADMIN', 'ORGANIZER', 'STAFF')
  @ApiOperation({ summary: 'Get live festival metrics' })
  async getLiveMetrics(@Param('festivalId') festivalId: string) {
    return this.realtimeService.getLiveFestivalMetrics(festivalId);
  }

  @Get('festivals/:festivalId/realtime/zones')
  @Roles('ADMIN', 'ORGANIZER', 'STAFF')
  @ApiOperation({ summary: 'Get live zone metrics' })
  async getLiveZoneMetrics(@Param('festivalId') festivalId: string) {
    return this.realtimeService.getLiveZoneMetrics(festivalId);
  }

  @Post('festivals/:festivalId/realtime/sync')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Sync realtime counters from database' })
  async syncRealtimeCounters(@Param('festivalId') festivalId: string) {
    await this.realtimeService.syncFromDatabase(festivalId);
    return { success: true, message: 'Counters synced successfully' };
  }

  // ============== Exports ==============

  @Get('festivals/:festivalId/export')
  @Roles('ADMIN', 'ORGANIZER')
  @ApiOperation({ summary: 'Export analytics data' })
  async exportAnalytics(
    @Param('festivalId') festivalId: string,
    @Query() query: ExportQueryDto,
    @Res() res: Response,
  ) {
    const result = await this.exportService.exportData(festivalId, {
      format: query.format,
      metrics: [query.dataType],
      timeRange: {
        startDate: query.startDate ? new Date(query.startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        endDate: query.endDate ? new Date(query.endDate) : new Date(),
      },
      includeRawData: true,
      includeCharts: query.includeCharts || false,
    });

    res.setHeader('Content-Type', result.mimeType);
    res.setHeader('Content-Disposition', `attachment; filename="${result.filename}"`);
    res.send(result.data);
  }

  @Get('festivals/:festivalId/export/sales')
  @Roles('ADMIN', 'ORGANIZER')
  @ApiOperation({ summary: 'Export sales data' })
  async exportSales(
    @Param('festivalId') festivalId: string,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
    @Query('format') format: 'csv' | 'xlsx' = 'csv',
    @Res() res: Response,
  ) {
    const result = await this.exportService.exportSalesData(
      festivalId,
      { startDate: new Date(startDate), endDate: new Date(endDate) },
      format,
    );

    res.setHeader('Content-Type', result.mimeType);
    res.setHeader('Content-Disposition', `attachment; filename="${result.filename}"`);
    res.send(result.data);
  }

  @Get('festivals/:festivalId/export/cashless')
  @Roles('ADMIN', 'ORGANIZER')
  @ApiOperation({ summary: 'Export cashless transaction data' })
  async exportCashless(
    @Param('festivalId') festivalId: string,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
    @Query('format') format: 'csv' | 'xlsx' = 'csv',
    @Res() res: Response,
  ) {
    const result = await this.exportService.exportCashlessData(
      festivalId,
      { startDate: new Date(startDate), endDate: new Date(endDate) },
      format,
    );

    res.setHeader('Content-Type', result.mimeType);
    res.setHeader('Content-Disposition', `attachment; filename="${result.filename}"`);
    res.send(result.data);
  }

  @Get('festivals/:festivalId/export/attendance')
  @Roles('ADMIN', 'ORGANIZER')
  @ApiOperation({ summary: 'Export attendance data' })
  async exportAttendance(
    @Param('festivalId') festivalId: string,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
    @Query('format') format: 'csv' | 'xlsx' = 'csv',
    @Res() res: Response,
  ) {
    const result = await this.exportService.exportAttendanceData(
      festivalId,
      { startDate: new Date(startDate), endDate: new Date(endDate) },
      format,
    );

    res.setHeader('Content-Type', result.mimeType);
    res.setHeader('Content-Disposition', `attachment; filename="${result.filename}"`);
    res.send(result.data);
  }

  @Get('festivals/:festivalId/export/vendors')
  @Roles('ADMIN', 'ORGANIZER')
  @ApiOperation({ summary: 'Export vendor data' })
  async exportVendors(
    @Param('festivalId') festivalId: string,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
    @Query('format') format: 'csv' | 'xlsx' = 'csv',
    @Res() res: Response,
  ) {
    const result = await this.exportService.exportVendorData(
      festivalId,
      { startDate: new Date(startDate), endDate: new Date(endDate) },
      format,
    );

    res.setHeader('Content-Type', result.mimeType);
    res.setHeader('Content-Disposition', `attachment; filename="${result.filename}"`);
    res.send(result.data);
  }

  @Get('festivals/:festivalId/export/financial')
  @Roles('ADMIN', 'ORGANIZER')
  @ApiOperation({ summary: 'Export financial summary report' })
  async exportFinancial(
    @Param('festivalId') festivalId: string,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
    @Query('format') format: 'pdf' | 'xlsx' = 'pdf',
    @Res() res: Response,
  ) {
    const result = await this.exportService.exportFinancialSummary(
      festivalId,
      { startDate: new Date(startDate), endDate: new Date(endDate) },
      format,
    );

    res.setHeader('Content-Type', result.mimeType);
    res.setHeader('Content-Disposition', `attachment; filename="${result.filename}"`);
    res.send(result.data);
  }

  @Get('festivals/:festivalId/export/comprehensive')
  @Roles('ADMIN', 'ORGANIZER')
  @ApiOperation({ summary: 'Export comprehensive analytics report' })
  async exportComprehensive(
    @Param('festivalId') festivalId: string,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
    @Query('format') format: 'pdf' | 'xlsx' = 'pdf',
    @Res() res: Response,
  ) {
    const result = await this.exportService.exportComprehensiveReport(
      festivalId,
      { startDate: new Date(startDate), endDate: new Date(endDate) },
      format,
    );

    res.setHeader('Content-Type', result.mimeType);
    res.setHeader('Content-Disposition', `attachment; filename="${result.filename}"`);
    res.send(result.data);
  }

  // ============== Dashboards ==============

  @Get('dashboards/templates')
  @Roles('ADMIN', 'ORGANIZER')
  @ApiOperation({ summary: 'Get available dashboard templates' })
  async getDashboardTemplates() {
    return this.dashboardConfigService.getTemplates();
  }

  @Get('dashboards/templates/:templateId')
  @Roles('ADMIN', 'ORGANIZER')
  @ApiOperation({ summary: 'Get a specific dashboard template' })
  async getDashboardTemplate(@Param('templateId') templateId: string) {
    return this.dashboardConfigService.getTemplate(templateId);
  }

  @Get('dashboards/widget-types')
  @Roles('ADMIN', 'ORGANIZER')
  @ApiOperation({ summary: 'Get available widget types' })
  async getWidgetTypes() {
    return this.dashboardConfigService.getWidgetTypes();
  }

  @Get('dashboards/metrics')
  @Roles('ADMIN', 'ORGANIZER')
  @ApiOperation({ summary: 'Get available metrics for widgets' })
  async getAvailableMetrics() {
    return this.dashboardConfigService.getAvailableMetrics();
  }

  @Get('festivals/:festivalId/dashboards')
  @Roles('ADMIN', 'ORGANIZER')
  @ApiOperation({ summary: 'Get all dashboards for a festival' })
  async getDashboards(@Param('festivalId') festivalId: string) {
    return this.dashboardConfigService.getDashboards(festivalId);
  }

  @Post('festivals/:festivalId/dashboards')
  @Roles('ADMIN', 'ORGANIZER')
  @ApiOperation({ summary: 'Create a custom dashboard' })
  async createDashboard(
    @Param('festivalId') festivalId: string,
    @CurrentUser() user: { id: string },
    @Body() body: { name: string; description?: string },
  ) {
    return this.dashboardConfigService.createDashboard(festivalId, user.id, body);
  }

  @Post('festivals/:festivalId/dashboards/from-template')
  @Roles('ADMIN', 'ORGANIZER')
  @ApiOperation({ summary: 'Create a dashboard from a template' })
  async createFromTemplate(
    @Param('festivalId') festivalId: string,
    @CurrentUser() user: { id: string },
    @Body() body: { templateId: string; customName?: string },
  ) {
    return this.dashboardConfigService.createFromTemplate(
      festivalId,
      user.id,
      body.templateId,
      body.customName,
    );
  }

  @Get('dashboards/:dashboardId')
  @Roles('ADMIN', 'ORGANIZER')
  @ApiOperation({ summary: 'Get a specific dashboard' })
  async getDashboard(@Param('dashboardId') dashboardId: string) {
    return this.dashboardConfigService.getDashboard(dashboardId);
  }

  @Put('dashboards/:dashboardId')
  @Roles('ADMIN', 'ORGANIZER')
  @ApiOperation({ summary: 'Update a dashboard' })
  async updateDashboard(
    @Param('dashboardId') dashboardId: string,
    @Body() body: { name?: string; description?: string; refreshInterval?: number },
  ) {
    return this.dashboardConfigService.updateDashboard(dashboardId, body);
  }

  @Delete('dashboards/:dashboardId')
  @Roles('ADMIN', 'ORGANIZER')
  @ApiOperation({ summary: 'Delete a dashboard' })
  async deleteDashboard(@Param('dashboardId') dashboardId: string) {
    await this.dashboardConfigService.deleteDashboard(dashboardId);
    return { success: true };
  }

  @Post('dashboards/:dashboardId/widgets')
  @Roles('ADMIN', 'ORGANIZER')
  @ApiOperation({ summary: 'Add a widget to a dashboard' })
  async addWidget(
    @Param('dashboardId') dashboardId: string,
    @Body() widget: { type: string; title: string; metric: string; position: { x: number; y: number; width: number; height: number } },
  ) {
    return this.dashboardConfigService.addWidget(dashboardId, widget as any);
  }

  @Put('dashboards/:dashboardId/widgets/:widgetId')
  @Roles('ADMIN', 'ORGANIZER')
  @ApiOperation({ summary: 'Update a widget' })
  async updateWidget(
    @Param('dashboardId') dashboardId: string,
    @Param('widgetId') widgetId: string,
    @Body() updates: { title?: string; config?: Record<string, unknown> },
  ) {
    return this.dashboardConfigService.updateWidget(dashboardId, widgetId, updates as any);
  }

  @Delete('dashboards/:dashboardId/widgets/:widgetId')
  @Roles('ADMIN', 'ORGANIZER')
  @ApiOperation({ summary: 'Remove a widget from a dashboard' })
  async removeWidget(
    @Param('dashboardId') dashboardId: string,
    @Param('widgetId') widgetId: string,
  ) {
    return this.dashboardConfigService.removeWidget(dashboardId, widgetId);
  }

  @Post('dashboards/:dashboardId/set-default')
  @Roles('ADMIN', 'ORGANIZER')
  @ApiOperation({ summary: 'Set a dashboard as default' })
  async setDefaultDashboard(@Param('dashboardId') dashboardId: string) {
    return this.dashboardConfigService.setDefault(dashboardId);
  }

  @Post('dashboards/:dashboardId/clone')
  @Roles('ADMIN', 'ORGANIZER')
  @ApiOperation({ summary: 'Clone a dashboard' })
  async cloneDashboard(
    @Param('dashboardId') dashboardId: string,
    @Body() body: { newName: string; targetFestivalId?: string },
  ) {
    return this.dashboardConfigService.cloneDashboard(
      dashboardId,
      body.newName,
      body.targetFestivalId,
    );
  }
}
