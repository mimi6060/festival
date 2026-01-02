import { Injectable, Logger, NotFoundException, Inject } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { PrismaService } from '../prisma/prisma.service';
import {
  OverviewKPIs,
  SalesTimeSeries,
  AttendanceTimeSeries,
  CashlessStats,
  ZoneFrequentation,
  ZoneHeatmapData,
  TimeSeriesDataPoint,
  ExportResult,
  VendorStats,
  DashboardSummary,
  AlertEvent,
} from './interfaces';
import {
  SalesQueryDto,
  AttendanceQueryDto,
  CashlessQueryDto,
  ExportQueryDto,
} from './dto';
import {
  TicketStatus,
  TransactionType,
  PaymentStatus,
} from '@prisma/client';

@Injectable()
export class AnalyticsService {
  private readonly logger = new Logger(AnalyticsService.name);

  // Cache TTL in seconds
  private readonly CACHE_TTL = {
    overview: 60, // 1 minute
    sales: 120, // 2 minutes
    attendance: 30, // 30 seconds (more real-time)
    cashless: 60,
    zones: 30,
  };

  constructor(
    private readonly prisma: PrismaService,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {}

  /**
   * Validate that a festival exists
   */
  private async validateFestival(festivalId: string): Promise<void> {
    const festival = await this.prisma.festival.findUnique({
      where: { id: festivalId },
    });

    if (!festival) {
      throw new NotFoundException(`Festival with ID ${festivalId} not found`);
    }
  }

  /**
   * Get cache key for a specific analytics query
   */
  private getCacheKey(
    festivalId: string,
    type: string,
    params?: object,
  ): string {
    const paramsStr = params ? JSON.stringify(params) : '';
    return `analytics:${festivalId}:${type}:${paramsStr}`;
  }

  /**
   * Calculate overview KPIs for a festival
   */
  async calculateOverview(festivalId: string): Promise<OverviewKPIs> {
    await this.validateFestival(festivalId);

    const cacheKey = this.getCacheKey(festivalId, 'overview');
    const cached = await this.cacheManager.get<OverviewKPIs>(cacheKey);
    if (cached) {
      this.logger.debug(`Cache hit for overview: ${festivalId}`);
      return cached;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    // Get festival info
    const festival = await this.prisma.festival.findUnique({
      where: { id: festivalId },
      select: { currentAttendees: true, maxCapacity: true },
    });

    // Parallel queries for efficiency
    const [
      ticketStats,
      ticketStatsToday,
      ticketStatsYesterday,
      revenueStats,
      revenueTodayStats,
      cashlessStats,
      usedTickets,
      peakAttendance,
    ] = await Promise.all([
      // Total tickets sold
      this.prisma.ticket.aggregate({
        where: {
          festivalId,
          status: { in: [TicketStatus.SOLD, TicketStatus.USED] },
        },
        _count: true,
        _sum: { purchasePrice: true },
      }),

      // Tickets sold today
      this.prisma.ticket.count({
        where: {
          festivalId,
          status: { in: [TicketStatus.SOLD, TicketStatus.USED] },
          createdAt: { gte: today },
        },
      }),

      // Tickets sold yesterday (for comparison)
      this.prisma.ticket.count({
        where: {
          festivalId,
          status: { in: [TicketStatus.SOLD, TicketStatus.USED] },
          createdAt: { gte: yesterday, lt: today },
        },
      }),

      // Total revenue from payments
      this.prisma.payment.aggregate({
        where: {
          status: PaymentStatus.COMPLETED,
          tickets: { some: { festivalId } },
        },
        _sum: { amount: true },
        _count: true,
      }),

      // Revenue today
      this.prisma.payment.aggregate({
        where: {
          status: PaymentStatus.COMPLETED,
          tickets: { some: { festivalId } },
          paidAt: { gte: today },
        },
        _sum: { amount: true },
      }),

      // Cashless stats
      this.prisma.cashlessTransaction.aggregate({
        where: { festivalId },
        _count: true,
        _sum: { amount: true },
      }),

      // Used tickets (attendance)
      this.prisma.ticket.count({
        where: {
          festivalId,
          status: TicketStatus.USED,
        },
      }),

      // Peak attendance (from zone access logs)
      this.getHistoricalPeakAttendance(festivalId),
    ]);

    // Calculate cashless balance
    const cashlessAccounts = await this.prisma.cashlessAccount.aggregate({
      where: {
        transactions: { some: { festivalId } },
        isActive: true,
      },
      _sum: { balance: true },
      _avg: { balance: true },
    });

    // Calculate metrics
    const totalRevenue = Number(ticketStats._sum?.purchasePrice || 0);
    const revenueToday = Number(revenueTodayStats._sum?.amount || 0);
    const totalTicketsSold = ticketStats._count || 0;
    const ticketsSoldToday = ticketStatsToday;

    // Revenue growth (vs yesterday)
    const revenueYesterday = ticketStatsYesterday * (totalTicketsSold > 0 ? totalRevenue / totalTicketsSold : 0);
    const revenueGrowth = revenueYesterday > 0
      ? ((revenueToday - revenueYesterday) / revenueYesterday) * 100
      : revenueToday > 0 ? 100 : 0;

    // Conversion rate (simplified: tickets sold / max capacity)
    const ticketConversionRate = festival?.maxCapacity
      ? (totalTicketsSold / festival.maxCapacity) * 100
      : 0;

    // Refund rate
    const refundedTickets = await this.prisma.ticket.count({
      where: { festivalId, status: TicketStatus.REFUNDED },
    });
    const refundRate = totalTicketsSold > 0
      ? (refundedTickets / totalTicketsSold) * 100
      : 0;

    // Average order value
    const paymentCount = revenueStats._count || 1;
    const averageOrderValue = Number(revenueStats._sum?.amount || 0) / paymentCount;

    // Cashless metrics
    const totalCashlessBalance = Number(cashlessAccounts._sum?.balance || 0);
    const totalCashlessTransactions = cashlessStats._count || 0;
    const averageTransactionValue = totalCashlessTransactions > 0
      ? Math.abs(Number(cashlessStats._sum?.amount || 0)) / totalCashlessTransactions
      : 0;

    const result: OverviewKPIs = {
      totalRevenue,
      revenueToday,
      revenueGrowth,
      totalTicketsSold,
      ticketsSoldToday,
      ticketConversionRate,
      totalAttendees: usedTickets,
      currentAttendees: festival?.currentAttendees || 0,
      peakAttendance: peakAttendance.count,
      peakAttendanceTime: peakAttendance.time,
      totalCashlessBalance,
      totalCashlessTransactions,
      averageTransactionValue,
      averageOrderValue,
      refundRate,
    };

    await this.cacheManager.set(cacheKey, result, this.CACHE_TTL.overview * 1000);
    return result;
  }

  /**
   * Get sales time series data
   */
  async getSalesTimeSeries(
    festivalId: string,
    query: SalesQueryDto,
  ): Promise<SalesTimeSeries> {
    await this.validateFestival(festivalId);

    const cacheKey = this.getCacheKey(festivalId, 'sales', { ...query });
    const cached = await this.cacheManager.get<SalesTimeSeries>(cacheKey);
    if (cached) return cached;

    const { period = 'day', startDate, endDate, categoryId } = query;

    // Default date range: last 30 days
    const end = endDate ? new Date(endDate) : new Date();
    const start = startDate ? new Date(startDate) : new Date(end.getTime() - 30 * 24 * 60 * 60 * 1000);

    const where: {
      festivalId: string;
      status: { in: TicketStatus[] };
      createdAt: { gte: Date; lte: Date };
      categoryId?: string;
    } = {
      festivalId,
      status: { in: [TicketStatus.SOLD, TicketStatus.USED] },
      createdAt: { gte: start, lte: end },
    };

    if (categoryId) {
      where.categoryId = categoryId;
    }

    // Get all tickets in range
    const tickets = await this.prisma.ticket.findMany({
      where,
      select: {
        createdAt: true,
        purchasePrice: true,
      },
      orderBy: { createdAt: 'asc' },
    });

    // Group by period
    const dataMap = new Map<string, number>();
    let total = 0;

    for (const ticket of tickets) {
      const key = this.getPeriodKey(ticket.createdAt, period);
      const current = dataMap.get(key) || 0;
      const amount = Number(ticket.purchasePrice);
      dataMap.set(key, current + amount);
      total += amount;
    }

    // Convert to time series
    const data: TimeSeriesDataPoint[] = Array.from(dataMap.entries()).map(
      ([key, value]) => ({
        timestamp: this.parsePeriodKey(key, period),
        value,
        label: key,
      }),
    );

    // Calculate trend
    const average = data.length > 0 ? total / data.length : 0;
    const recentAvg = data.length >= 2
      ? (data[data.length - 1].value + data[data.length - 2].value) / 2
      : data.length === 1 ? data[0].value : 0;
    const olderAvg = data.length >= 4
      ? (data[0].value + data[1].value) / 2
      : data.length >= 2 ? data[0].value : 0;

    let trend: 'up' | 'down' | 'stable' = 'stable';
    let trendPercentage = 0;

    if (olderAvg > 0) {
      trendPercentage = ((recentAvg - olderAvg) / olderAvg) * 100;
      trend = trendPercentage > 5 ? 'up' : trendPercentage < -5 ? 'down' : 'stable';
    }

    const result: SalesTimeSeries = {
      period,
      data,
      total,
      average,
      trend,
      trendPercentage,
    };

    await this.cacheManager.set(cacheKey, result, this.CACHE_TTL.sales * 1000);
    return result;
  }

  /**
   * Get attendance time series data
   */
  async getAttendanceTimeSeries(
    festivalId: string,
    query: AttendanceQueryDto,
  ): Promise<AttendanceTimeSeries> {
    await this.validateFestival(festivalId);

    const cacheKey = this.getCacheKey(festivalId, 'attendance', { ...query });
    const cached = await this.cacheManager.get<AttendanceTimeSeries>(cacheKey);
    if (cached) return cached;

    const { period = 'hour', startDate, endDate, zoneId } = query;

    // Default: last 24 hours for hourly, last 7 days for daily
    const end = endDate ? new Date(endDate) : new Date();
    const defaultDays = period === 'hour' ? 1 : 7;
    const start = startDate
      ? new Date(startDate)
      : new Date(end.getTime() - defaultDays * 24 * 60 * 60 * 1000);

    // Get zone access logs using Prisma
    const whereCondition: {
      zone: { festivalId: string };
      timestamp: { gte: Date; lte: Date };
      zoneId?: string;
    } = {
      zone: { festivalId },
      timestamp: { gte: start, lte: end },
    };

    if (zoneId) {
      whereCondition.zoneId = zoneId;
    }

    // Query ZoneAccessLog through the Zone relation
    const accessLogs = await this.prisma.zone.findMany({
      where: { festivalId },
      include: {
        accessLogs: {
          where: {
            timestamp: { gte: start, lte: end },
          },
          orderBy: { timestamp: 'asc' },
        },
      },
    });

    // Flatten access logs
    const allLogs = accessLogs.flatMap(zone =>
      zone.accessLogs.map(log => ({
        action: log.action,
        timestamp: log.timestamp,
      }))
    ).sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

    // Calculate running attendance per period
    const periodData = new Map<string, { entries: number; exits: number; count: number }>();
    let runningCount = 0;
    let peakCount = 0;
    let peakTime: Date | null = null;

    for (const log of allLogs) {
      const key = this.getPeriodKey(log.timestamp, period);
      const entry = periodData.get(key) || { entries: 0, exits: 0, count: 0 };

      if (log.action === 'ENTRY') {
        runningCount++;
        entry.entries++;
      } else {
        runningCount = Math.max(0, runningCount - 1);
        entry.exits++;
      }

      entry.count = runningCount;
      periodData.set(key, entry);

      if (runningCount > peakCount) {
        peakCount = runningCount;
        peakTime = log.timestamp;
      }
    }

    // Get current festival attendance
    const festival = await this.prisma.festival.findUnique({
      where: { id: festivalId },
      select: { currentAttendees: true },
    });

    // Convert to time series (net attendance per period)
    const data: TimeSeriesDataPoint[] = Array.from(periodData.entries()).map(
      ([key, value]) => ({
        timestamp: this.parsePeriodKey(key, period),
        value: value.count,
        label: key,
      }),
    );

    // Calculate average stay duration (simplified estimation)
    const totalEntries = allLogs.filter((l) => l.action === 'ENTRY').length;
    const totalExits = allLogs.filter((l) => l.action === 'EXIT').length;
    const completedVisits = Math.min(totalEntries, totalExits);

    // Estimate average stay: total time range / average visits
    const timeRangeMinutes = (end.getTime() - start.getTime()) / (60 * 1000);
    const averageStayDuration = completedVisits > 0
      ? Math.round(timeRangeMinutes / completedVisits)
      : 0;

    const result: AttendanceTimeSeries = {
      period,
      data,
      currentCount: festival?.currentAttendees || 0,
      peakCount,
      peakTime,
      averageStayDuration,
    };

    await this.cacheManager.set(cacheKey, result, this.CACHE_TTL.attendance * 1000);
    return result;
  }

  /**
   * Get cashless statistics
   */
  async getCashlessStats(
    festivalId: string,
    query: CashlessQueryDto,
  ): Promise<CashlessStats> {
    await this.validateFestival(festivalId);

    const cacheKey = this.getCacheKey(festivalId, 'cashless', { ...query });
    const cached = await this.cacheManager.get<CashlessStats>(cacheKey);
    if (cached) return cached;

    const { startDate, endDate } = query;

    const dateFilter: { gte?: Date; lte?: Date } = {};
    if (startDate) dateFilter.gte = new Date(startDate);
    if (endDate) dateFilter.lte = new Date(endDate);

    const whereCondition: {
      festivalId: string;
      createdAt?: { gte?: Date; lte?: Date };
    } = { festivalId };
    if (Object.keys(dateFilter).length > 0) {
      whereCondition.createdAt = dateFilter;
    }

    // Get transactions by type
    const [topups, payments, transfers, refunds, allTransactions] = await Promise.all([
      this.prisma.cashlessTransaction.aggregate({
        where: { ...whereCondition, type: TransactionType.TOPUP },
        _sum: { amount: true },
        _count: true,
      }),
      this.prisma.cashlessTransaction.aggregate({
        where: { ...whereCondition, type: TransactionType.PAYMENT },
        _sum: { amount: true },
        _count: true,
        _avg: { amount: true },
      }),
      this.prisma.cashlessTransaction.aggregate({
        where: { ...whereCondition, type: TransactionType.TRANSFER },
        _count: true,
      }),
      this.prisma.cashlessTransaction.aggregate({
        where: { ...whereCondition, type: TransactionType.REFUND },
        _sum: { amount: true },
        _count: true,
      }),
      this.prisma.cashlessTransaction.findMany({
        where: whereCondition,
        select: {
          createdAt: true,
          type: true,
          amount: true,
          metadata: true,
        },
      }),
    ]);

    // Get active accounts with balance
    const accountStats = await this.prisma.cashlessAccount.aggregate({
      where: {
        transactions: { some: { festivalId } },
        isActive: true,
      },
      _count: true,
      _avg: { balance: true },
    });

    // Calculate transactions per hour
    const transactionsPerHour = new Array(24).fill(0);
    let peakHour = 0;
    let peakHourCount = 0;

    for (const tx of allTransactions) {
      const hour = tx.createdAt.getHours();
      transactionsPerHour[hour]++;
      if (transactionsPerHour[hour] > peakHourCount) {
        peakHourCount = transactionsPerHour[hour];
        peakHour = hour;
      }
    }

    // Get top vendors (from payment metadata)
    const vendorRevenue = new Map<string, { revenue: number; count: number; name: string }>();

    for (const tx of allTransactions) {
      if (tx.type === TransactionType.PAYMENT && tx.metadata) {
        const metadata = tx.metadata as { vendorId?: string; vendorName?: string };
        if (metadata.vendorId) {
          const current = vendorRevenue.get(metadata.vendorId) || {
            revenue: 0,
            count: 0,
            name: metadata.vendorName || 'Unknown',
          };
          current.revenue += Math.abs(Number(tx.amount));
          current.count++;
          vendorRevenue.set(metadata.vendorId, current);
        }
      }
    }

    const topVendors: VendorStats[] = Array.from(vendorRevenue.entries())
      .map(([vendorId, data]) => ({
        vendorId,
        vendorName: data.name,
        totalRevenue: data.revenue,
        transactionCount: data.count,
        averageTransaction: data.count > 0 ? data.revenue / data.count : 0,
      }))
      .sort((a, b) => b.totalRevenue - a.totalRevenue)
      .slice(0, 10);

    const result: CashlessStats = {
      totalTopups: Number(topups._sum?.amount || 0),
      totalSpent: Math.abs(Number(payments._sum?.amount || 0)),
      totalRefunds: Math.abs(Number(refunds._sum?.amount || 0)),
      activeAccounts: accountStats._count || 0,
      averageBalance: Number(accountStats._avg?.balance || 0),
      averageTopupAmount: topups._count > 0
        ? Number(topups._sum?.amount || 0) / topups._count
        : 0,
      averageSpendPerTransaction: Math.abs(Number(payments._avg?.amount || 0)),
      topVendors,
      transactionsByType: {
        topup: topups._count || 0,
        payment: payments._count || 0,
        transfer: transfers._count || 0,
        refund: refunds._count || 0,
      },
      peakTransactionHour: peakHour,
      transactionsPerHour,
    };

    await this.cacheManager.set(cacheKey, result, this.CACHE_TTL.cashless * 1000);
    return result;
  }

  /**
   * Get zone heatmap data
   */
  async getZoneHeatmap(festivalId: string): Promise<ZoneFrequentation> {
    await this.validateFestival(festivalId);

    const cacheKey = this.getCacheKey(festivalId, 'zones');
    const cached = await this.cacheManager.get<ZoneFrequentation>(cacheKey);
    if (cached) return cached;

    // Get all zones for the festival with their access logs
    const zones = await this.prisma.zone.findMany({
      where: { festivalId, isActive: true },
      include: {
        accessLogs: {
          orderBy: { timestamp: 'desc' },
          take: 1000, // Last 1000 logs per zone
        },
      },
    });

    let totalOccupancy = 0;
    let totalCapacity = 0;
    let mostPopularZone = '';
    let leastPopularZone = '';
    let maxOccupancy = -1;
    let minOccupancy = Infinity;

    const zoneData: ZoneHeatmapData[] = zones.map((zone) => {
      // Calculate current occupancy from access logs
      let currentOccupancy = 0;
      let peakOccupancy = 0;
      let peakTime: Date | null = null;
      let runningCount = 0;
      let totalVisitors = 0;

      // Sort logs by timestamp (oldest first for running count)
      const sortedLogs = [...zone.accessLogs].sort(
        (a, b) => a.timestamp.getTime() - b.timestamp.getTime(),
      );

      for (const log of sortedLogs) {
        if (log.action === 'ENTRY') {
          runningCount++;
          totalVisitors++;
          if (runningCount > peakOccupancy) {
            peakOccupancy = runningCount;
            peakTime = log.timestamp;
          }
        } else {
          runningCount = Math.max(0, runningCount - 1);
        }
      }

      currentOccupancy = runningCount;
      const capacity = zone.capacity || 1000;
      const occupancyPercentage = (currentOccupancy / capacity) * 100;

      totalOccupancy += currentOccupancy;
      totalCapacity += capacity;

      if (occupancyPercentage > maxOccupancy) {
        maxOccupancy = occupancyPercentage;
        mostPopularZone = zone.name;
      }

      if (occupancyPercentage < minOccupancy) {
        minOccupancy = occupancyPercentage;
        leastPopularZone = zone.name;
      }

      return {
        zoneId: zone.id,
        zoneName: zone.name,
        zoneType: zone.requiresTicketType.join(', ') || 'GENERAL',
        currentOccupancy,
        maxCapacity: capacity,
        occupancyPercentage,
        averageStayDuration: 0, // Would need entry/exit pairing
        totalVisitors,
        peakOccupancy,
        peakTime,
      };
    });

    const result: ZoneFrequentation = {
      zones: zoneData,
      totalZones: zones.length,
      overallOccupancy: totalCapacity > 0 ? (totalOccupancy / totalCapacity) * 100 : 0,
      mostPopularZone,
      leastPopularZone,
    };

    await this.cacheManager.set(cacheKey, result, this.CACHE_TTL.zones * 1000);
    return result;
  }

  /**
   * Generate export report
   */
  async generateReport(
    festivalId: string,
    options: ExportQueryDto,
  ): Promise<ExportResult> {
    await this.validateFestival(festivalId);

    const { format, sections, startDate, endDate, includeDetails } = options;

    const dateRange = {
      startDate: startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      endDate: endDate ? new Date(endDate) : new Date(),
    };

    const reportData: Record<string, unknown> = {
      festivalId,
      generatedAt: new Date(),
      dateRange,
    };

    // Gather data for each section
    for (const section of sections || []) {
      switch (section) {
        case 'overview':
          reportData.overview = await this.calculateOverview(festivalId);
          break;
        case 'sales':
          reportData.sales = await this.getSalesTimeSeries(festivalId, {
            startDate: dateRange.startDate.toISOString(),
            endDate: dateRange.endDate.toISOString(),
            period: 'day',
          });
          break;
        case 'attendance':
          reportData.attendance = await this.getAttendanceTimeSeries(festivalId, {
            startDate: dateRange.startDate.toISOString(),
            endDate: dateRange.endDate.toISOString(),
            period: 'day',
          });
          break;
        case 'cashless':
          reportData.cashless = await this.getCashlessStats(festivalId, {
            startDate: dateRange.startDate.toISOString(),
            endDate: dateRange.endDate.toISOString(),
          });
          break;
        case 'zones':
          reportData.zones = await this.getZoneHeatmap(festivalId);
          break;
        case 'tickets':
          if (includeDetails) {
            reportData.tickets = await this.getTicketDetails(festivalId, dateRange);
          }
          break;
      }
    }

    // Generate output based on format
    let data: Buffer | string;
    let mimeType: string;
    let fileExtension: string;

    switch (format) {
      case 'json':
        data = JSON.stringify(reportData, null, 2);
        mimeType = 'application/json';
        fileExtension = 'json';
        break;

      case 'csv':
        data = this.convertToCSV(reportData);
        mimeType = 'text/csv';
        fileExtension = 'csv';
        break;

      case 'xlsx':
        // For xlsx, return JSON and let the controller handle Excel generation
        // In production, use a library like exceljs
        data = JSON.stringify(reportData, null, 2);
        mimeType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
        fileExtension = 'xlsx';
        break;

      default:
        data = JSON.stringify(reportData, null, 2);
        mimeType = 'application/json';
        fileExtension = 'json';
    }

    const festival = await this.prisma.festival.findUnique({
      where: { id: festivalId },
      select: { slug: true },
    });

    return {
      fileName: `analytics_${festival?.slug || festivalId}_${Date.now()}.${fileExtension}`,
      mimeType,
      data,
      generatedAt: new Date(),
    };
  }

  /**
   * Get dashboard summary for real-time updates
   */
  async getDashboardSummary(festivalId: string): Promise<DashboardSummary> {
    const [overview, salesData, zoneData] = await Promise.all([
      this.calculateOverview(festivalId),
      this.getSalesTimeSeries(festivalId, {
        period: 'hour',
        startDate: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
      }),
      this.getZoneHeatmap(festivalId),
    ]);

    const alerts = await this.checkForAlerts(festivalId, overview, zoneData);

    return {
      overview,
      recentSales: salesData.data.slice(-12), // Last 12 hours
      currentAttendance: overview.currentAttendees,
      zoneStatus: zoneData.zones.map((z) => ({
        zoneId: z.zoneId,
        zoneName: z.zoneName,
        occupancyPercentage: z.occupancyPercentage,
      })),
      alerts,
      lastUpdated: new Date(),
    };
  }

  /**
   * Check for alert conditions
   */
  private async checkForAlerts(
    festivalId: string,
    overview: OverviewKPIs,
    zones: ZoneFrequentation,
  ): Promise<AlertEvent[]> {
    const alerts: AlertEvent[] = [];
    const now = new Date();

    // Capacity warnings
    for (const zone of zones.zones) {
      if (zone.occupancyPercentage >= 90) {
        alerts.push({
          type: 'alert',
          festivalId,
          timestamp: now,
          data: {
            alertType: 'capacity_warning',
            severity: zone.occupancyPercentage >= 95 ? 'critical' : 'warning',
            message: `Zone "${zone.zoneName}" is at ${zone.occupancyPercentage.toFixed(1)}% capacity`,
            metadata: { zoneId: zone.zoneId, occupancy: zone.occupancyPercentage },
          },
        });
      }
    }

    // Revenue milestones (every 10000)
    const revenueMilestone = Math.floor(overview.totalRevenue / 10000) * 10000;
    if (revenueMilestone > 0 && overview.totalRevenue - revenueMilestone < 1000) {
      alerts.push({
        type: 'alert',
        festivalId,
        timestamp: now,
        data: {
          alertType: 'revenue_milestone',
          severity: 'info',
          message: `Revenue milestone reached: ${revenueMilestone.toLocaleString()}`,
          metadata: { milestone: revenueMilestone, current: overview.totalRevenue },
        },
      });
    }

    return alerts;
  }

  // ============ Helper Methods ============

  private getPeriodKey(date: Date, period: string): string {
    const d = new Date(date);
    switch (period) {
      case 'hour':
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:00`;
      case 'day':
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      case 'week':
        const weekStart = new Date(d);
        weekStart.setDate(d.getDate() - d.getDay());
        return `${weekStart.getFullYear()}-W${String(Math.ceil(d.getDate() / 7)).padStart(2, '0')}`;
      case 'month':
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      default:
        return d.toISOString();
    }
  }

  private parsePeriodKey(key: string, period: string): Date {
    switch (period) {
      case 'hour':
        return new Date(key.replace(' ', 'T') + ':00:00');
      case 'day':
        return new Date(key + 'T00:00:00');
      case 'week':
        const [year, week] = key.split('-W');
        const d = new Date(parseInt(year), 0, 1);
        d.setDate(d.getDate() + (parseInt(week) - 1) * 7);
        return d;
      case 'month':
        return new Date(key + '-01T00:00:00');
      default:
        return new Date(key);
    }
  }

  private async getHistoricalPeakAttendance(
    festivalId: string,
  ): Promise<{ count: number; time: Date | null }> {
    // Get peak from festival's currentAttendees or zone logs
    const festival = await this.prisma.festival.findUnique({
      where: { id: festivalId },
      select: { currentAttendees: true, startDate: true },
    });

    // For now, return current as peak (in production, track historical max)
    return {
      count: festival?.currentAttendees || 0,
      time: festival?.startDate || null,
    };
  }

  private async getTicketDetails(
    festivalId: string,
    dateRange: { startDate: Date; endDate: Date },
  ): Promise<unknown> {
    return this.prisma.ticket.findMany({
      where: {
        festivalId,
        createdAt: { gte: dateRange.startDate, lte: dateRange.endDate },
      },
      include: {
        category: { select: { name: true, type: true, price: true } },
        user: { select: { email: true, firstName: true, lastName: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  private convertToCSV(data: Record<string, unknown>): string {
    const lines: string[] = [];

    // Overview section
    if (data.overview) {
      lines.push('=== OVERVIEW ===');
      const overview = data.overview as OverviewKPIs;
      lines.push('Metric,Value');
      lines.push(`Total Revenue,${overview.totalRevenue}`);
      lines.push(`Revenue Today,${overview.revenueToday}`);
      lines.push(`Total Tickets Sold,${overview.totalTicketsSold}`);
      lines.push(`Current Attendees,${overview.currentAttendees}`);
      lines.push(`Peak Attendance,${overview.peakAttendance}`);
      lines.push(`Cashless Transactions,${overview.totalCashlessTransactions}`);
      lines.push('');
    }

    // Sales section
    if (data.sales) {
      lines.push('=== SALES ===');
      const sales = data.sales as SalesTimeSeries;
      lines.push('Date,Revenue');
      for (const point of sales.data) {
        lines.push(`${point.label || point.timestamp.toISOString()},${point.value}`);
      }
      lines.push('');
    }

    // Zones section
    if (data.zones) {
      lines.push('=== ZONES ===');
      const zones = data.zones as ZoneFrequentation;
      lines.push('Zone,Current Occupancy,Max Capacity,Occupancy %');
      for (const zone of zones.zones) {
        lines.push(`${zone.zoneName},${zone.currentOccupancy},${zone.maxCapacity},${zone.occupancyPercentage.toFixed(1)}`);
      }
      lines.push('');
    }

    return lines.join('\n');
  }

  /**
   * Invalidate cache for a festival (called after updates)
   */
  async invalidateCache(festivalId: string): Promise<void> {
    const keys = [
      this.getCacheKey(festivalId, 'overview'),
      this.getCacheKey(festivalId, 'sales'),
      this.getCacheKey(festivalId, 'attendance'),
      this.getCacheKey(festivalId, 'cashless'),
      this.getCacheKey(festivalId, 'zones'),
    ];

    for (const key of keys) {
      await this.cacheManager.del(key);
    }

    this.logger.debug(`Cache invalidated for festival: ${festivalId}`);
  }
}
