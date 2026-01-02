import {
  Controller,
  Get,
  Param,
  Query,
  Res,
  UseGuards,
  Logger,
  HttpStatus,
} from '@nestjs/common';
import { Response } from 'express';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { AnalyticsService } from './analytics.service';
import {
  SalesQueryDto,
  AttendanceQueryDto,
  CashlessQueryDto,
  ExportQueryDto,
} from './dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '@prisma/client';

@ApiTags('Analytics')
@ApiBearerAuth()
@Controller('festivals/:festivalId/analytics')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AnalyticsController {
  private readonly logger = new Logger(AnalyticsController.name);

  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('overview')
  @Roles(UserRole.ADMIN, UserRole.ORGANIZER, UserRole.STAFF)
  @ApiOperation({
    summary: 'Get overview KPIs',
    description: 'Returns global KPIs for the festival including revenue, tickets, attendance, and cashless metrics',
  })
  @ApiParam({ name: 'festivalId', description: 'Festival ID' })
  @ApiResponse({
    status: 200,
    description: 'Overview KPIs retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        totalRevenue: { type: 'number', example: 150000 },
        revenueToday: { type: 'number', example: 5000 },
        revenueGrowth: { type: 'number', example: 12.5 },
        totalTicketsSold: { type: 'number', example: 2500 },
        ticketsSoldToday: { type: 'number', example: 100 },
        ticketConversionRate: { type: 'number', example: 75.5 },
        totalAttendees: { type: 'number', example: 2000 },
        currentAttendees: { type: 'number', example: 1500 },
        peakAttendance: { type: 'number', example: 1800 },
        peakAttendanceTime: { type: 'string', format: 'date-time' },
        totalCashlessBalance: { type: 'number', example: 25000 },
        totalCashlessTransactions: { type: 'number', example: 8500 },
        averageTransactionValue: { type: 'number', example: 8.5 },
        averageOrderValue: { type: 'number', example: 120 },
        refundRate: { type: 'number', example: 2.3 },
      },
    },
  })
  @ApiResponse({ status: 404, description: 'Festival not found' })
  async getOverview(@Param('festivalId') festivalId: string) {
    this.logger.log(`Getting overview for festival: ${festivalId}`);
    return this.analyticsService.calculateOverview(festivalId);
  }

  @Get('sales')
  @Roles(UserRole.ADMIN, UserRole.ORGANIZER, UserRole.STAFF)
  @ApiOperation({
    summary: 'Get sales time series',
    description: 'Returns sales data grouped by period (hour, day, week, month)',
  })
  @ApiParam({ name: 'festivalId', description: 'Festival ID' })
  @ApiQuery({ name: 'startDate', required: false, type: String, description: 'Start date (ISO 8601)' })
  @ApiQuery({ name: 'endDate', required: false, type: String, description: 'End date (ISO 8601)' })
  @ApiQuery({ name: 'period', required: false, enum: ['hour', 'day', 'week', 'month'], description: 'Grouping period' })
  @ApiQuery({ name: 'categoryId', required: false, type: String, description: 'Filter by ticket category' })
  @ApiResponse({
    status: 200,
    description: 'Sales time series retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        period: { type: 'string', enum: ['hour', 'day', 'week', 'month'] },
        data: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              timestamp: { type: 'string', format: 'date-time' },
              value: { type: 'number' },
              label: { type: 'string' },
            },
          },
        },
        total: { type: 'number' },
        average: { type: 'number' },
        trend: { type: 'string', enum: ['up', 'down', 'stable'] },
        trendPercentage: { type: 'number' },
      },
    },
  })
  async getSales(
    @Param('festivalId') festivalId: string,
    @Query() query: SalesQueryDto,
  ) {
    this.logger.log(`Getting sales for festival: ${festivalId}`);
    return this.analyticsService.getSalesTimeSeries(festivalId, query);
  }

  @Get('attendance')
  @Roles(UserRole.ADMIN, UserRole.ORGANIZER, UserRole.STAFF, UserRole.SECURITY)
  @ApiOperation({
    summary: 'Get attendance time series',
    description: 'Returns attendance data over time with current and peak counts',
  })
  @ApiParam({ name: 'festivalId', description: 'Festival ID' })
  @ApiQuery({ name: 'startDate', required: false, type: String, description: 'Start date (ISO 8601)' })
  @ApiQuery({ name: 'endDate', required: false, type: String, description: 'End date (ISO 8601)' })
  @ApiQuery({ name: 'period', required: false, enum: ['hour', 'day'], description: 'Grouping period' })
  @ApiQuery({ name: 'zoneId', required: false, type: String, description: 'Filter by zone' })
  @ApiResponse({
    status: 200,
    description: 'Attendance data retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        period: { type: 'string', enum: ['hour', 'day'] },
        data: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              timestamp: { type: 'string', format: 'date-time' },
              value: { type: 'number' },
              label: { type: 'string' },
            },
          },
        },
        currentCount: { type: 'number' },
        peakCount: { type: 'number' },
        peakTime: { type: 'string', format: 'date-time' },
        averageStayDuration: { type: 'number', description: 'Average stay in minutes' },
      },
    },
  })
  async getAttendance(
    @Param('festivalId') festivalId: string,
    @Query() query: AttendanceQueryDto,
  ) {
    this.logger.log(`Getting attendance for festival: ${festivalId}`);
    return this.analyticsService.getAttendanceTimeSeries(festivalId, query);
  }

  @Get('cashless')
  @Roles(UserRole.ADMIN, UserRole.ORGANIZER, UserRole.CASHIER)
  @ApiOperation({
    summary: 'Get cashless statistics',
    description: 'Returns cashless payment statistics including topups, spending, and vendor breakdown',
  })
  @ApiParam({ name: 'festivalId', description: 'Festival ID' })
  @ApiQuery({ name: 'startDate', required: false, type: String, description: 'Start date (ISO 8601)' })
  @ApiQuery({ name: 'endDate', required: false, type: String, description: 'End date (ISO 8601)' })
  @ApiQuery({ name: 'vendorId', required: false, type: String, description: 'Filter by vendor' })
  @ApiResponse({
    status: 200,
    description: 'Cashless statistics retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        totalTopups: { type: 'number' },
        totalSpent: { type: 'number' },
        totalRefunds: { type: 'number' },
        activeAccounts: { type: 'number' },
        averageBalance: { type: 'number' },
        averageTopupAmount: { type: 'number' },
        averageSpendPerTransaction: { type: 'number' },
        topVendors: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              vendorId: { type: 'string' },
              vendorName: { type: 'string' },
              totalRevenue: { type: 'number' },
              transactionCount: { type: 'number' },
              averageTransaction: { type: 'number' },
            },
          },
        },
        transactionsByType: {
          type: 'object',
          properties: {
            topup: { type: 'number' },
            payment: { type: 'number' },
            transfer: { type: 'number' },
            refund: { type: 'number' },
          },
        },
        peakTransactionHour: { type: 'number' },
        transactionsPerHour: {
          type: 'array',
          items: { type: 'number' },
        },
      },
    },
  })
  async getCashless(
    @Param('festivalId') festivalId: string,
    @Query() query: CashlessQueryDto,
  ) {
    this.logger.log(`Getting cashless stats for festival: ${festivalId}`);
    return this.analyticsService.getCashlessStats(festivalId, query);
  }

  @Get('zones')
  @Roles(UserRole.ADMIN, UserRole.ORGANIZER, UserRole.STAFF, UserRole.SECURITY)
  @ApiOperation({
    summary: 'Get zone frequentation/heatmap',
    description: 'Returns occupancy data for all zones including current status and historical peaks',
  })
  @ApiParam({ name: 'festivalId', description: 'Festival ID' })
  @ApiResponse({
    status: 200,
    description: 'Zone data retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        zones: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              zoneId: { type: 'string' },
              zoneName: { type: 'string' },
              zoneType: { type: 'string' },
              currentOccupancy: { type: 'number' },
              maxCapacity: { type: 'number' },
              occupancyPercentage: { type: 'number' },
              averageStayDuration: { type: 'number' },
              totalVisitors: { type: 'number' },
              peakOccupancy: { type: 'number' },
              peakTime: { type: 'string', format: 'date-time' },
            },
          },
        },
        totalZones: { type: 'number' },
        overallOccupancy: { type: 'number' },
        mostPopularZone: { type: 'string' },
        leastPopularZone: { type: 'string' },
      },
    },
  })
  async getZones(@Param('festivalId') festivalId: string) {
    this.logger.log(`Getting zone heatmap for festival: ${festivalId}`);
    return this.analyticsService.getZoneHeatmap(festivalId);
  }

  @Get('dashboard')
  @Roles(UserRole.ADMIN, UserRole.ORGANIZER, UserRole.STAFF)
  @ApiOperation({
    summary: 'Get dashboard summary',
    description: 'Returns a comprehensive summary for the real-time dashboard',
  })
  @ApiParam({ name: 'festivalId', description: 'Festival ID' })
  @ApiResponse({
    status: 200,
    description: 'Dashboard summary retrieved successfully',
  })
  async getDashboard(@Param('festivalId') festivalId: string) {
    this.logger.log(`Getting dashboard summary for festival: ${festivalId}`);
    return this.analyticsService.getDashboardSummary(festivalId);
  }

  @Get('export')
  @Roles(UserRole.ADMIN, UserRole.ORGANIZER)
  @ApiOperation({
    summary: 'Export analytics data',
    description: 'Export analytics data in CSV, Excel (XLSX), or JSON format',
  })
  @ApiParam({ name: 'festivalId', description: 'Festival ID' })
  @ApiQuery({ name: 'format', required: true, enum: ['csv', 'xlsx', 'json'], description: 'Export format' })
  @ApiQuery({ name: 'sections', required: false, type: String, description: 'Comma-separated sections: overview,sales,attendance,cashless,zones,tickets' })
  @ApiQuery({ name: 'startDate', required: false, type: String, description: 'Start date (ISO 8601)' })
  @ApiQuery({ name: 'endDate', required: false, type: String, description: 'End date (ISO 8601)' })
  @ApiQuery({ name: 'includeDetails', required: false, type: Boolean, description: 'Include detailed data' })
  @ApiResponse({
    status: 200,
    description: 'Export file generated successfully',
    content: {
      'text/csv': { schema: { type: 'string', format: 'binary' } },
      'application/json': { schema: { type: 'object' } },
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': {
        schema: { type: 'string', format: 'binary' },
      },
    },
  })
  async exportData(
    @Param('festivalId') festivalId: string,
    @Query() query: ExportQueryDto,
    @Res() res: Response,
  ) {
    this.logger.log(`Exporting analytics for festival: ${festivalId}, format: ${query.format}`);

    const result = await this.analyticsService.generateReport(festivalId, query);

    res.set({
      'Content-Type': result.mimeType,
      'Content-Disposition': `attachment; filename="${result.fileName}"`,
      'X-Generated-At': result.generatedAt.toISOString(),
    });

    if (typeof result.data === 'string') {
      res.send(result.data);
    } else {
      res.send(result.data);
    }
  }
}
