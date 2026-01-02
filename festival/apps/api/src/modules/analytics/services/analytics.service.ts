import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CacheService } from '../../cache/cache.service';
import {
  DashboardKPIs,
  SalesAnalytics,
  CashlessAnalytics,
  AttendanceAnalytics,
  ZoneAnalytics,
  VendorAnalytics,
  RealtimeAnalytics,
  TimeRange,
  AnalyticsAlert,
  TrendData,
  TicketsByType,
  DailySales,
  HourlySales,
  CategorySales,
  HourlyTransactions,
  TransactionsByType,
  AmountDistribution,
  VendorCashlessStats,
  HourlyAttendance,
  DailyAttendance,
  EntryExitFlow,
  ZoneAttendance,
  ZoneStats,
  ZoneHeatmapData,
  ZoneTransition,
  VendorTypeStats,
  VendorStats,
  ProductStats,
  HourlyVendorOrders,
  OrderStatusStats,
} from '../interfaces';
import {
  DashboardQueryDto,
  SalesQueryDto,
  CashlessQueryDto,
  AttendanceQueryDto,
  ZoneQueryDto,
  VendorQueryDto,
  RealtimeQueryDto,
  AlertThresholdsDto,
} from '../dto';
import { Decimal } from '@prisma/client/runtime/library';

@Injectable()
export class AnalyticsService {
  private readonly logger = new Logger(AnalyticsService.name);
  private readonly CACHE_TTL = 60; // 60 seconds default cache
  private readonly REALTIME_CACHE_TTL = 10; // 10 seconds for realtime data

  constructor(
    private readonly prisma: PrismaService,
    private readonly cacheService: CacheService,
  ) {}

  /**
   * Get dashboard KPIs for a festival
   */
  async getDashboardKPIs(
    festivalId: string,
    query: DashboardQueryDto,
  ): Promise<DashboardKPIs> {
    const cacheKey = `analytics:dashboard:${festivalId}:${JSON.stringify(query)}`;

    // Try cache first
    const cached = await this.cacheService.get<DashboardKPIs>(cacheKey);
    if (cached) {
      this.logger.debug(`Cache hit for dashboard KPIs: ${festivalId}`);
      return cached;
    }

    const festival = await this.prisma.festival.findUnique({
      where: { id: festivalId },
      include: {
        ticketCategories: true,
      },
    });

    if (!festival) {
      throw new NotFoundException(`Festival ${festivalId} not found`);
    }

    const timeRange = this.buildTimeRange(query, festival.startDate, festival.endDate);

    // Execute all queries in parallel
    const [
      ticketingData,
      revenueData,
      attendanceData,
      cashlessData,
      salesTrend,
    ] = await Promise.all([
      this.getTicketingMetrics(festivalId, festival.ticketCategories),
      this.getRevenueMetrics(festivalId, timeRange),
      this.getAttendanceMetrics(festivalId, festival.maxCapacity),
      this.getCashlessMetrics(festivalId, timeRange),
      query.includeTrends ? this.getSalesTrend(festivalId, timeRange) : Promise.resolve([]),
    ]);

    const result: DashboardKPIs = {
      festivalId,
      festivalName: festival.name,
      generatedAt: new Date(),
      ticketing: {
        ...ticketingData,
        salesTrend,
      },
      revenue: {
        ...revenueData,
        currency: festival.currency,
      },
      attendance: attendanceData,
      cashless: cashlessData,
      conversion: {
        visitorsToCart: 0, // Would need tracking data
        cartToPurchase: 0,
        overallConversion: 0,
      },
    };

    // Cache the result
    await this.cacheService.set(cacheKey, result, this.CACHE_TTL);

    return result;
  }

  /**
   * Get sales analytics for a festival
   */
  async getSalesAnalytics(
    festivalId: string,
    query: SalesQueryDto,
  ): Promise<SalesAnalytics> {
    const cacheKey = `analytics:sales:${festivalId}:${JSON.stringify(query)}`;

    const cached = await this.cacheService.get<SalesAnalytics>(cacheKey);
    if (cached) {
      return cached;
    }

    const festival = await this.validateFestival(festivalId);
    const timeRange = this.buildTimeRange(query, festival.startDate, festival.endDate);

    const [
      summary,
      salesByDay,
      salesByHour,
      salesByCategory,
    ] = await Promise.all([
      this.getSalesSummary(festivalId, timeRange),
      this.getSalesByDay(festivalId, timeRange),
      this.getSalesByHour(festivalId, timeRange),
      this.getSalesByCategory(festivalId, timeRange),
    ]);

    let comparison = undefined;
    if (query.includeComparison && query.comparisonType) {
      comparison = await this.getComparisonData(festivalId, timeRange, query.comparisonType);
    }

    const result: SalesAnalytics = {
      festivalId,
      period: timeRange,
      summary,
      salesByDay,
      salesByHour,
      salesByCategory,
      topSellingCategories: [...salesByCategory]
        .sort((a, b) => b.sold - a.sold)
        .slice(0, 5),
      comparison,
    };

    await this.cacheService.set(cacheKey, result, this.CACHE_TTL);
    return result;
  }

  /**
   * Get cashless analytics for a festival
   */
  async getCashlessAnalytics(
    festivalId: string,
    query: CashlessQueryDto,
  ): Promise<CashlessAnalytics> {
    const cacheKey = `analytics:cashless:${festivalId}:${JSON.stringify(query)}`;

    const cached = await this.cacheService.get<CashlessAnalytics>(cacheKey);
    if (cached) {
      return cached;
    }

    const festival = await this.validateFestival(festivalId);
    const timeRange = this.buildTimeRange(query, festival.startDate, festival.endDate);

    const [
      summary,
      transactionsByHour,
      transactionsByType,
      topupDistribution,
      balanceDistribution,
      vendorBreakdown,
    ] = await Promise.all([
      this.getCashlessSummary(festivalId, timeRange),
      this.getCashlessTransactionsByHour(festivalId, timeRange),
      this.getCashlessTransactionsByType(festivalId, timeRange),
      this.getTopupDistribution(festivalId, timeRange),
      this.getBalanceDistribution(festivalId),
      this.getVendorCashlessStats(festivalId, timeRange),
    ]);

    const result: CashlessAnalytics = {
      festivalId,
      period: timeRange,
      summary,
      transactionsByHour,
      transactionsByType,
      topupDistribution,
      balanceDistribution,
      vendorBreakdown,
    };

    await this.cacheService.set(cacheKey, result, this.CACHE_TTL);
    return result;
  }

  /**
   * Get attendance analytics for a festival
   */
  async getAttendanceAnalytics(
    festivalId: string,
    query: AttendanceQueryDto,
  ): Promise<AttendanceAnalytics> {
    const cacheKey = `analytics:attendance:${festivalId}:${JSON.stringify(query)}`;

    const cached = await this.cacheService.get<AttendanceAnalytics>(cacheKey);
    if (cached) {
      return cached;
    }

    const festival = await this.validateFestival(festivalId);
    const timeRange = this.buildTimeRange(query, festival.startDate, festival.endDate);

    const [
      currentAttendance,
      hourlyAttendance,
      dailyAttendance,
      entryExitFlow,
      zoneDistribution,
    ] = await Promise.all([
      this.getCurrentAttendance(festivalId, festival.maxCapacity),
      this.getHourlyAttendance(festivalId, timeRange),
      this.getDailyAttendance(festivalId, timeRange),
      query.includeFlow ? this.getEntryExitFlow(festivalId, timeRange) : Promise.resolve([]),
      this.getZoneDistribution(festivalId),
    ]);

    const peakTimes = this.calculatePeakTimes(hourlyAttendance);

    const result: AttendanceAnalytics = {
      festivalId,
      period: timeRange,
      current: currentAttendance,
      hourlyAttendance,
      dailyAttendance,
      entryExitFlow,
      peakTimes,
      zoneDistribution,
    };

    await this.cacheService.set(cacheKey, result, this.CACHE_TTL);
    return result;
  }

  /**
   * Get zone analytics for a festival
   */
  async getZoneAnalytics(
    festivalId: string,
    query: ZoneQueryDto,
  ): Promise<ZoneAnalytics> {
    const cacheKey = `analytics:zones:${festivalId}:${JSON.stringify(query)}`;

    const cached = await this.cacheService.get<ZoneAnalytics>(cacheKey);
    if (cached) {
      return cached;
    }

    const festival = await this.validateFestival(festivalId);
    const timeRange = this.buildTimeRange(query, festival.startDate, festival.endDate);

    const zones = await this.getZoneStats(festivalId, timeRange, query.zoneId);

    let heatmapData: ZoneHeatmapData[] | undefined;
    let zoneTransitions: ZoneTransition[] | undefined;

    if (query.includeHeatmap) {
      heatmapData = await this.getZoneHeatmapData(festivalId, timeRange);
    }

    if (query.includeTransitions) {
      zoneTransitions = await this.getZoneTransitions(festivalId, timeRange);
    }

    const result: ZoneAnalytics = {
      festivalId,
      period: timeRange,
      zones,
      heatmapData: heatmapData || [],
      zoneTransitions: zoneTransitions || [],
    };

    await this.cacheService.set(cacheKey, result, this.CACHE_TTL);
    return result;
  }

  /**
   * Get vendor analytics for a festival
   */
  async getVendorAnalytics(
    festivalId: string,
    query: VendorQueryDto,
  ): Promise<VendorAnalytics> {
    const cacheKey = `analytics:vendors:${festivalId}:${JSON.stringify(query)}`;

    const cached = await this.cacheService.get<VendorAnalytics>(cacheKey);
    if (cached) {
      return cached;
    }

    const festival = await this.validateFestival(festivalId);
    const timeRange = this.buildTimeRange(query, festival.startDate, festival.endDate);

    const [
      summary,
      vendorsByType,
      topVendors,
      topProducts,
      hourlyOrders,
      orderStatusBreakdown,
    ] = await Promise.all([
      this.getVendorSummary(festivalId, timeRange, query.vendorId, query.vendorType),
      this.getVendorsByType(festivalId, timeRange),
      this.getTopVendors(festivalId, timeRange, query.topLimit || 10),
      this.getTopProducts(festivalId, timeRange, query.topProductsLimit || 20),
      this.getHourlyVendorOrders(festivalId, timeRange),
      this.getOrderStatusBreakdown(festivalId, timeRange),
    ]);

    const result: VendorAnalytics = {
      festivalId,
      period: timeRange,
      summary,
      vendorsByType,
      topVendors,
      topProducts,
      hourlyOrders,
      orderStatusBreakdown,
    };

    await this.cacheService.set(cacheKey, result, this.CACHE_TTL);
    return result;
  }

  /**
   * Get real-time analytics for a festival
   */
  async getRealtimeAnalytics(
    festivalId: string,
    query: RealtimeQueryDto,
    thresholds?: AlertThresholdsDto,
  ): Promise<RealtimeAnalytics> {
    const cacheKey = `analytics:realtime:${festivalId}`;

    const cached = await this.cacheService.get<RealtimeAnalytics>(cacheKey);
    if (cached) {
      return cached;
    }

    const festival = await this.validateFestival(festivalId);
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);

    const [
      liveData,
      lastHourData,
      activeZones,
    ] = await Promise.all([
      this.getLiveAttendanceData(festivalId, festival.maxCapacity),
      this.getLastHourMetrics(festivalId, oneHourAgo, now),
      query.includeZones ? this.getZoneDistribution(festivalId) : Promise.resolve([]),
    ]);

    let alerts: AnalyticsAlert[] = [];
    if (query.includeAlerts) {
      alerts = await this.generateAlerts(
        festivalId,
        liveData,
        activeZones,
        thresholds || new AlertThresholdsDto(),
      );
    }

    const result: RealtimeAnalytics = {
      festivalId,
      timestamp: now,
      live: {
        ...liveData,
        activeZones,
      },
      lastHour: lastHourData,
      alerts,
    };

    await this.cacheService.set(cacheKey, result, this.REALTIME_CACHE_TTL);
    return result;
  }

  // ============ Private Helper Methods ============

  private async validateFestival(festivalId: string) {
    const festival = await this.prisma.festival.findUnique({
      where: { id: festivalId },
    });

    if (!festival) {
      throw new NotFoundException(`Festival ${festivalId} not found`);
    }

    return festival;
  }

  private buildTimeRange(
    query: { startDate?: string; endDate?: string },
    festivalStart: Date,
    festivalEnd: Date,
  ): TimeRange {
    return {
      startDate: query.startDate ? new Date(query.startDate) : festivalStart,
      endDate: query.endDate ? new Date(query.endDate) : festivalEnd,
    };
  }

  private decimalToNumber(value: Decimal | null): number {
    return value ? Number(value) : 0;
  }

  // ============ Ticketing Metrics ============

  private async getTicketingMetrics(
    festivalId: string,
    ticketCategories: any[],
  ): Promise<{
    totalSold: number;
    totalAvailable: number;
    soldPercentage: number;
    revenueTickets: number;
    ticketsByType: TicketsByType[];
  }> {
    const ticketStats = await this.prisma.ticket.aggregate({
      where: {
        festivalId,
        status: { in: ['SOLD', 'USED'] },
      },
      _count: true,
      _sum: {
        purchasePrice: true,
      },
    });

    const totalQuota = ticketCategories.reduce((sum, cat) => sum + cat.quota, 0);
    const totalSold = ticketStats._count || 0;
    const totalAvailable = totalQuota - totalSold;

    const ticketsByType: TicketsByType[] = await Promise.all(
      ticketCategories.map(async (cat) => {
        const stats = await this.prisma.ticket.aggregate({
          where: {
            festivalId,
            categoryId: cat.id,
            status: { in: ['SOLD', 'USED'] },
          },
          _count: true,
          _sum: {
            purchasePrice: true,
          },
        });

        return {
          type: cat.type,
          name: cat.name,
          sold: stats._count || 0,
          available: cat.quota - (stats._count || 0),
          revenue: this.decimalToNumber(stats._sum.purchasePrice),
        };
      }),
    );

    return {
      totalSold,
      totalAvailable,
      soldPercentage: totalQuota > 0 ? (totalSold / totalQuota) * 100 : 0,
      revenueTickets: this.decimalToNumber(ticketStats._sum.purchasePrice),
      ticketsByType,
    };
  }

  // ============ Revenue Metrics ============

  private async getRevenueMetrics(
    festivalId: string,
    timeRange: TimeRange,
  ): Promise<{
    totalRevenue: number;
    ticketRevenue: number;
    cashlessRevenue: number;
    vendorRevenue: number;
  }> {
    const [ticketRevenue, cashlessRevenue, vendorRevenue] = await Promise.all([
      this.prisma.ticket.aggregate({
        where: {
          festivalId,
          status: { in: ['SOLD', 'USED'] },
          createdAt: {
            gte: timeRange.startDate,
            lte: timeRange.endDate,
          },
        },
        _sum: {
          purchasePrice: true,
        },
      }),
      this.prisma.cashlessTransaction.aggregate({
        where: {
          festivalId,
          type: 'PAYMENT',
          createdAt: {
            gte: timeRange.startDate,
            lte: timeRange.endDate,
          },
        },
        _sum: {
          amount: true,
        },
      }),
      this.prisma.vendorOrder.aggregate({
        where: {
          vendor: {
            festivalId,
          },
          status: { in: ['CONFIRMED', 'PREPARING', 'READY', 'DELIVERED'] },
          createdAt: {
            gte: timeRange.startDate,
            lte: timeRange.endDate,
          },
        },
        _sum: {
          totalAmount: true,
        },
      }),
    ]);

    const ticketRev = this.decimalToNumber(ticketRevenue._sum.purchasePrice);
    const cashlessRev = this.decimalToNumber(cashlessRevenue._sum.amount);
    const vendorRev = this.decimalToNumber(vendorRevenue._sum.totalAmount);

    return {
      totalRevenue: ticketRev + cashlessRev + vendorRev,
      ticketRevenue: ticketRev,
      cashlessRevenue: cashlessRev,
      vendorRevenue: vendorRev,
    };
  }

  // ============ Attendance Metrics ============

  private async getAttendanceMetrics(
    festivalId: string,
    maxCapacity: number,
  ): Promise<{
    currentAttendees: number;
    maxCapacity: number;
    occupancyRate: number;
    peakAttendance: number;
    peakTime: Date | null;
  }> {
    const festival = await this.prisma.festival.findUnique({
      where: { id: festivalId },
      select: { currentAttendees: true },
    });

    const currentAttendees = festival?.currentAttendees || 0;

    // Get peak attendance from zone access logs
    const peakData = await this.prisma.zoneAccessLog.groupBy({
      by: ['timestamp'],
      where: {
        zone: { festivalId },
        action: 'ENTRY',
      },
      _count: true,
      orderBy: {
        _count: {
          timestamp: 'desc',
        },
      },
      take: 1,
    });

    return {
      currentAttendees,
      maxCapacity,
      occupancyRate: maxCapacity > 0 ? (currentAttendees / maxCapacity) * 100 : 0,
      peakAttendance: peakData[0]?._count || currentAttendees,
      peakTime: peakData[0]?.timestamp || null,
    };
  }

  // ============ Cashless Metrics ============

  private async getCashlessMetrics(
    festivalId: string,
    timeRange: TimeRange,
  ): Promise<{
    totalTopups: number;
    totalSpent: number;
    averageBalance: number;
    activeAccounts: number;
  }> {
    const [topups, payments, balanceStats, activeAccounts] = await Promise.all([
      this.prisma.cashlessTransaction.aggregate({
        where: {
          festivalId,
          type: 'TOPUP',
          createdAt: {
            gte: timeRange.startDate,
            lte: timeRange.endDate,
          },
        },
        _sum: {
          amount: true,
        },
      }),
      this.prisma.cashlessTransaction.aggregate({
        where: {
          festivalId,
          type: 'PAYMENT',
          createdAt: {
            gte: timeRange.startDate,
            lte: timeRange.endDate,
          },
        },
        _sum: {
          amount: true,
        },
      }),
      this.prisma.cashlessAccount.aggregate({
        where: {
          isActive: true,
          transactions: {
            some: {
              festivalId,
            },
          },
        },
        _avg: {
          balance: true,
        },
      }),
      this.prisma.cashlessAccount.count({
        where: {
          isActive: true,
          transactions: {
            some: {
              festivalId,
            },
          },
        },
      }),
    ]);

    return {
      totalTopups: this.decimalToNumber(topups._sum.amount),
      totalSpent: this.decimalToNumber(payments._sum.amount),
      averageBalance: this.decimalToNumber(balanceStats._avg.balance),
      activeAccounts,
    };
  }

  // ============ Sales Trend ============

  private async getSalesTrend(
    festivalId: string,
    timeRange: TimeRange,
  ): Promise<TrendData[]> {
    const tickets = await this.prisma.ticket.findMany({
      where: {
        festivalId,
        status: { in: ['SOLD', 'USED'] },
        createdAt: {
          gte: timeRange.startDate,
          lte: timeRange.endDate,
        },
      },
      select: {
        createdAt: true,
        purchasePrice: true,
      },
      orderBy: {
        createdAt: 'asc',
      },
    });

    // Group by day
    const dailyTrend = new Map<string, number>();
    tickets.forEach((ticket) => {
      const day = ticket.createdAt.toISOString().split('T')[0];
      dailyTrend.set(day, (dailyTrend.get(day) || 0) + this.decimalToNumber(ticket.purchasePrice));
    });

    return Array.from(dailyTrend.entries()).map(([day, value]) => ({
      timestamp: new Date(day),
      value,
      label: day,
    }));
  }

  // ============ Sales Details ============

  private async getSalesSummary(
    festivalId: string,
    timeRange: TimeRange,
  ): Promise<{
    totalSales: number;
    totalRevenue: number;
    averageOrderValue: number;
    uniqueCustomers: number;
  }> {
    const [ticketStats, uniqueCustomers] = await Promise.all([
      this.prisma.ticket.aggregate({
        where: {
          festivalId,
          status: { in: ['SOLD', 'USED'] },
          createdAt: {
            gte: timeRange.startDate,
            lte: timeRange.endDate,
          },
        },
        _count: true,
        _sum: {
          purchasePrice: true,
        },
      }),
      this.prisma.ticket.findMany({
        where: {
          festivalId,
          status: { in: ['SOLD', 'USED'] },
          createdAt: {
            gte: timeRange.startDate,
            lte: timeRange.endDate,
          },
        },
        select: {
          userId: true,
        },
        distinct: ['userId'],
      }),
    ]);

    const totalSales = ticketStats._count || 0;
    const totalRevenue = this.decimalToNumber(ticketStats._sum.purchasePrice);

    return {
      totalSales,
      totalRevenue,
      averageOrderValue: totalSales > 0 ? totalRevenue / totalSales : 0,
      uniqueCustomers: uniqueCustomers.length,
    };
  }

  private async getSalesByDay(
    festivalId: string,
    timeRange: TimeRange,
  ): Promise<DailySales[]> {
    const tickets = await this.prisma.ticket.findMany({
      where: {
        festivalId,
        createdAt: {
          gte: timeRange.startDate,
          lte: timeRange.endDate,
        },
      },
      select: {
        createdAt: true,
        purchasePrice: true,
        status: true,
      },
    });

    const dailyMap = new Map<string, { sold: number; revenue: number; refunds: number }>();

    tickets.forEach((ticket) => {
      const day = ticket.createdAt.toISOString().split('T')[0];
      const current = dailyMap.get(day) || { sold: 0, revenue: 0, refunds: 0 };

      if (ticket.status === 'REFUNDED') {
        current.refunds += 1;
      } else if (['SOLD', 'USED'].includes(ticket.status)) {
        current.sold += 1;
        current.revenue += this.decimalToNumber(ticket.purchasePrice);
      }

      dailyMap.set(day, current);
    });

    return Array.from(dailyMap.entries())
      .map(([date, data]) => ({
        date: new Date(date),
        ticketsSold: data.sold,
        revenue: data.revenue,
        refunds: data.refunds,
      }))
      .sort((a, b) => a.date.getTime() - b.date.getTime());
  }

  private async getSalesByHour(
    festivalId: string,
    timeRange: TimeRange,
  ): Promise<HourlySales[]> {
    const tickets = await this.prisma.ticket.findMany({
      where: {
        festivalId,
        status: { in: ['SOLD', 'USED'] },
        createdAt: {
          gte: timeRange.startDate,
          lte: timeRange.endDate,
        },
      },
      select: {
        createdAt: true,
        purchasePrice: true,
      },
    });

    const hourlyMap = new Map<number, { count: number; revenue: number }>();

    // Initialize all hours
    for (let i = 0; i < 24; i++) {
      hourlyMap.set(i, { count: 0, revenue: 0 });
    }

    tickets.forEach((ticket) => {
      const hour = ticket.createdAt.getHours();
      const current = hourlyMap.get(hour)!;
      current.count += 1;
      current.revenue += this.decimalToNumber(ticket.purchasePrice);
    });

    return Array.from(hourlyMap.entries())
      .map(([hour, data]) => ({
        hour,
        ticketsSold: data.count,
        revenue: data.revenue,
      }))
      .sort((a, b) => a.hour - b.hour);
  }

  private async getSalesByCategory(
    festivalId: string,
    timeRange: TimeRange,
  ): Promise<CategorySales[]> {
    const categories = await this.prisma.ticketCategory.findMany({
      where: { festivalId },
      include: {
        tickets: {
          where: {
            status: { in: ['SOLD', 'USED'] },
            createdAt: {
              gte: timeRange.startDate,
              lte: timeRange.endDate,
            },
          },
        },
      },
    });

    const totalRevenue = categories.reduce(
      (sum, cat) =>
        sum + cat.tickets.reduce((s, t) => s + this.decimalToNumber(t.purchasePrice), 0),
      0,
    );

    return categories.map((cat) => {
      const sold = cat.tickets.length;
      const revenue = cat.tickets.reduce(
        (s, t) => s + this.decimalToNumber(t.purchasePrice),
        0,
      );

      return {
        categoryId: cat.id,
        categoryName: cat.name,
        type: cat.type,
        sold,
        quota: cat.quota,
        revenue,
        percentageOfTotal: totalRevenue > 0 ? (revenue / totalRevenue) * 100 : 0,
      };
    });
  }

  private async getComparisonData(
    festivalId: string,
    currentRange: TimeRange,
    comparisonType: 'previous_day' | 'previous_week' | 'previous_edition',
  ) {
    const rangeDuration = currentRange.endDate.getTime() - currentRange.startDate.getTime();

    let previousStart: Date;
    let previousEnd: Date;

    if (comparisonType === 'previous_day') {
      previousEnd = new Date(currentRange.startDate.getTime() - 1);
      previousStart = new Date(previousEnd.getTime() - rangeDuration);
    } else if (comparisonType === 'previous_week') {
      previousEnd = new Date(currentRange.startDate.getTime() - 7 * 24 * 60 * 60 * 1000);
      previousStart = new Date(previousEnd.getTime() - rangeDuration);
    } else {
      // Previous edition - would need festival edition tracking
      return undefined;
    }

    const [currentStats, previousStats] = await Promise.all([
      this.prisma.ticket.aggregate({
        where: {
          festivalId,
          status: { in: ['SOLD', 'USED'] },
          createdAt: {
            gte: currentRange.startDate,
            lte: currentRange.endDate,
          },
        },
        _count: true,
        _sum: { purchasePrice: true },
      }),
      this.prisma.ticket.aggregate({
        where: {
          festivalId,
          status: { in: ['SOLD', 'USED'] },
          createdAt: {
            gte: previousStart,
            lte: previousEnd,
          },
        },
        _count: true,
        _sum: { purchasePrice: true },
      }),
    ]);

    const currentRevenue = this.decimalToNumber(currentStats._sum.purchasePrice);
    const previousRevenue = this.decimalToNumber(previousStats._sum.purchasePrice);

    return {
      previousPeriod: {
        totalSales: previousStats._count || 0,
        totalRevenue: previousRevenue,
        changePercentage:
          previousRevenue > 0
            ? ((currentRevenue - previousRevenue) / previousRevenue) * 100
            : 0,
      },
    };
  }

  // ============ Cashless Details ============

  private async getCashlessSummary(
    festivalId: string,
    timeRange: TimeRange,
  ): Promise<{
    totalTopups: number;
    totalTopupAmount: number;
    totalPayments: number;
    totalPaymentAmount: number;
    totalTransfers: number;
    totalRefunds: number;
    averageTopupAmount: number;
    averagePaymentAmount: number;
    averageBalance: number;
    totalActiveAccounts: number;
  }> {
    const [topups, payments, transfers, refunds, balanceStats, activeAccounts] =
      await Promise.all([
        this.prisma.cashlessTransaction.aggregate({
          where: {
            festivalId,
            type: 'TOPUP',
            createdAt: { gte: timeRange.startDate, lte: timeRange.endDate },
          },
          _count: true,
          _sum: { amount: true },
          _avg: { amount: true },
        }),
        this.prisma.cashlessTransaction.aggregate({
          where: {
            festivalId,
            type: 'PAYMENT',
            createdAt: { gte: timeRange.startDate, lte: timeRange.endDate },
          },
          _count: true,
          _sum: { amount: true },
          _avg: { amount: true },
        }),
        this.prisma.cashlessTransaction.count({
          where: {
            festivalId,
            type: 'TRANSFER',
            createdAt: { gte: timeRange.startDate, lte: timeRange.endDate },
          },
        }),
        this.prisma.cashlessTransaction.count({
          where: {
            festivalId,
            type: 'REFUND',
            createdAt: { gte: timeRange.startDate, lte: timeRange.endDate },
          },
        }),
        this.prisma.cashlessAccount.aggregate({
          where: {
            isActive: true,
            transactions: { some: { festivalId } },
          },
          _avg: { balance: true },
        }),
        this.prisma.cashlessAccount.count({
          where: {
            isActive: true,
            transactions: { some: { festivalId } },
          },
        }),
      ]);

    return {
      totalTopups: topups._count || 0,
      totalTopupAmount: this.decimalToNumber(topups._sum.amount),
      totalPayments: payments._count || 0,
      totalPaymentAmount: this.decimalToNumber(payments._sum.amount),
      totalTransfers: transfers,
      totalRefunds: refunds,
      averageTopupAmount: this.decimalToNumber(topups._avg.amount),
      averagePaymentAmount: this.decimalToNumber(payments._avg.amount),
      averageBalance: this.decimalToNumber(balanceStats._avg.balance),
      totalActiveAccounts: activeAccounts,
    };
  }

  private async getCashlessTransactionsByHour(
    festivalId: string,
    timeRange: TimeRange,
  ): Promise<HourlyTransactions[]> {
    const transactions = await this.prisma.cashlessTransaction.findMany({
      where: {
        festivalId,
        type: { in: ['TOPUP', 'PAYMENT'] },
        createdAt: { gte: timeRange.startDate, lte: timeRange.endDate },
      },
      select: {
        createdAt: true,
        type: true,
        amount: true,
      },
    });

    const hourlyMap = new Map<
      number,
      { topups: number; payments: number; topupAmount: number; paymentAmount: number }
    >();

    for (let i = 0; i < 24; i++) {
      hourlyMap.set(i, { topups: 0, payments: 0, topupAmount: 0, paymentAmount: 0 });
    }

    transactions.forEach((tx) => {
      const hour = tx.createdAt.getHours();
      const current = hourlyMap.get(hour)!;
      const amount = this.decimalToNumber(tx.amount);

      if (tx.type === 'TOPUP') {
        current.topups += 1;
        current.topupAmount += amount;
      } else {
        current.payments += 1;
        current.paymentAmount += amount;
      }
    });

    return Array.from(hourlyMap.entries())
      .map(([hour, data]) => ({
        hour,
        ...data,
      }))
      .sort((a, b) => a.hour - b.hour);
  }

  private async getCashlessTransactionsByType(
    festivalId: string,
    timeRange: TimeRange,
  ): Promise<TransactionsByType[]> {
    const transactions = await this.prisma.cashlessTransaction.groupBy({
      by: ['type'],
      where: {
        festivalId,
        createdAt: { gte: timeRange.startDate, lte: timeRange.endDate },
      },
      _count: true,
      _sum: { amount: true },
      _avg: { amount: true },
    });

    return transactions.map((tx) => ({
      type: tx.type,
      count: tx._count,
      totalAmount: this.decimalToNumber(tx._sum.amount),
      averageAmount: this.decimalToNumber(tx._avg.amount),
    }));
  }

  private async getTopupDistribution(
    festivalId: string,
    timeRange: TimeRange,
  ): Promise<AmountDistribution[]> {
    const topups = await this.prisma.cashlessTransaction.findMany({
      where: {
        festivalId,
        type: 'TOPUP',
        createdAt: { gte: timeRange.startDate, lte: timeRange.endDate },
      },
      select: { amount: true },
    });

    const ranges = [
      { range: '0-10', min: 0, max: 10 },
      { range: '10-25', min: 10, max: 25 },
      { range: '25-50', min: 25, max: 50 },
      { range: '50-100', min: 50, max: 100 },
      { range: '100+', min: 100, max: Infinity },
    ];

    const total = topups.length;

    return ranges.map((r) => {
      const count = topups.filter((t) => {
        const amount = this.decimalToNumber(t.amount);
        return amount >= r.min && amount < r.max;
      }).length;

      return {
        range: r.range,
        min: r.min,
        max: r.max === Infinity ? 999999 : r.max,
        count,
        percentage: total > 0 ? (count / total) * 100 : 0,
      };
    });
  }

  private async getBalanceDistribution(festivalId: string): Promise<AmountDistribution[]> {
    const accounts = await this.prisma.cashlessAccount.findMany({
      where: {
        isActive: true,
        transactions: { some: { festivalId } },
      },
      select: { balance: true },
    });

    const ranges = [
      { range: '0', min: 0, max: 0.01 },
      { range: '0-10', min: 0.01, max: 10 },
      { range: '10-25', min: 10, max: 25 },
      { range: '25-50', min: 25, max: 50 },
      { range: '50-100', min: 50, max: 100 },
      { range: '100+', min: 100, max: Infinity },
    ];

    const total = accounts.length;

    return ranges.map((r) => {
      const count = accounts.filter((a) => {
        const balance = this.decimalToNumber(a.balance);
        return balance >= r.min && balance < r.max;
      }).length;

      return {
        range: r.range,
        min: r.min,
        max: r.max === Infinity ? 999999 : r.max,
        count,
        percentage: total > 0 ? (count / total) * 100 : 0,
      };
    });
  }

  private async getVendorCashlessStats(
    festivalId: string,
    timeRange: TimeRange,
  ): Promise<VendorCashlessStats[]> {
    // This would need vendor metadata in cashless transactions
    // For now, return aggregated data by description parsing or metadata
    const transactions = await this.prisma.cashlessTransaction.findMany({
      where: {
        festivalId,
        type: 'PAYMENT',
        createdAt: { gte: timeRange.startDate, lte: timeRange.endDate },
      },
      select: {
        amount: true,
        description: true,
        metadata: true,
      },
    });

    // Group by vendor from metadata or description
    const vendorMap = new Map<
      string,
      { name: string; type: string; count: number; total: number }
    >();

    transactions.forEach((tx) => {
      const metadata = tx.metadata as any;
      const vendorId = metadata?.vendorId || 'unknown';
      const vendorName = metadata?.vendorName || tx.description || 'Unknown Vendor';
      const vendorType = metadata?.vendorType || 'UNKNOWN';

      const current = vendorMap.get(vendorId) || {
        name: vendorName,
        type: vendorType,
        count: 0,
        total: 0,
      };

      current.count += 1;
      current.total += this.decimalToNumber(tx.amount);
      vendorMap.set(vendorId, current);
    });

    return Array.from(vendorMap.entries())
      .map(([vendorId, data]) => ({
        vendorId,
        vendorName: data.name,
        vendorType: data.type,
        totalTransactions: data.count,
        totalAmount: data.total,
        averageTransaction: data.count > 0 ? data.total / data.count : 0,
      }))
      .sort((a, b) => b.totalAmount - a.totalAmount);
  }

  // ============ Attendance Details ============

  private async getCurrentAttendance(
    festivalId: string,
    maxCapacity: number,
  ): Promise<{
    totalInside: number;
    maxCapacity: number;
    occupancyRate: number;
  }> {
    const festival = await this.prisma.festival.findUnique({
      where: { id: festivalId },
      select: { currentAttendees: true },
    });

    const totalInside = festival?.currentAttendees || 0;

    return {
      totalInside,
      maxCapacity,
      occupancyRate: maxCapacity > 0 ? (totalInside / maxCapacity) * 100 : 0,
    };
  }

  private async getHourlyAttendance(
    festivalId: string,
    timeRange: TimeRange,
  ): Promise<HourlyAttendance[]> {
    const logs = await this.prisma.zoneAccessLog.findMany({
      where: {
        zone: { festivalId },
        timestamp: { gte: timeRange.startDate, lte: timeRange.endDate },
      },
      select: {
        timestamp: true,
        action: true,
      },
      orderBy: { timestamp: 'asc' },
    });

    const hourlyMap = new Map<
      string,
      { entries: number; exits: number; date: Date; hour: number }
    >();

    logs.forEach((log) => {
      const date = log.timestamp.toISOString().split('T')[0];
      const hour = log.timestamp.getHours();
      const key = `${date}-${hour}`;

      const current = hourlyMap.get(key) || { entries: 0, exits: 0, date: log.timestamp, hour };

      if (log.action === 'ENTRY') {
        current.entries += 1;
      } else {
        current.exits += 1;
      }

      hourlyMap.set(key, current);
    });

    let cumulative = 0;
    return Array.from(hourlyMap.values())
      .sort((a, b) => a.date.getTime() - b.date.getTime())
      .map((data) => {
        cumulative += data.entries - data.exits;
        return {
          hour: data.hour,
          date: data.date,
          entries: data.entries,
          exits: data.exits,
          netChange: data.entries - data.exits,
          totalInside: cumulative,
        };
      });
  }

  private async getDailyAttendance(
    festivalId: string,
    timeRange: TimeRange,
  ): Promise<DailyAttendance[]> {
    const logs = await this.prisma.zoneAccessLog.findMany({
      where: {
        zone: { festivalId },
        timestamp: { gte: timeRange.startDate, lte: timeRange.endDate },
      },
      select: {
        timestamp: true,
        action: true,
        ticketId: true,
      },
    });

    const dailyMap = new Map<
      string,
      {
        entries: number;
        exits: number;
        tickets: Set<string>;
        hourlyCount: Map<number, number>;
      }
    >();

    logs.forEach((log) => {
      const day = log.timestamp.toISOString().split('T')[0];
      const hour = log.timestamp.getHours();

      const current = dailyMap.get(day) || {
        entries: 0,
        exits: 0,
        tickets: new Set(),
        hourlyCount: new Map(),
      };

      if (log.action === 'ENTRY') {
        current.entries += 1;
        current.tickets.add(log.ticketId);
        current.hourlyCount.set(hour, (current.hourlyCount.get(hour) || 0) + 1);
      } else {
        current.exits += 1;
      }

      dailyMap.set(day, current);
    });

    return Array.from(dailyMap.entries())
      .map(([date, data]) => {
        const peakHour = Array.from(data.hourlyCount.entries()).reduce(
          (max, [h, c]) => (c > max.count ? { hour: h, count: c } : max),
          { hour: 0, count: 0 },
        );

        return {
          date: new Date(date),
          uniqueVisitors: data.tickets.size,
          totalEntries: data.entries,
          totalExits: data.exits,
          peakOccupancy: peakHour.count,
          peakTime: new Date(`${date}T${String(peakHour.hour).padStart(2, '0')}:00:00`),
        };
      })
      .sort((a, b) => a.date.getTime() - b.date.getTime());
  }

  private async getEntryExitFlow(
    festivalId: string,
    timeRange: TimeRange,
  ): Promise<EntryExitFlow[]> {
    const logs = await this.prisma.zoneAccessLog.findMany({
      where: {
        zone: { festivalId },
        timestamp: { gte: timeRange.startDate, lte: timeRange.endDate },
      },
      select: {
        timestamp: true,
        action: true,
      },
      orderBy: { timestamp: 'asc' },
    });

    // Group by 15-minute intervals
    const intervalMap = new Map<number, { entries: number; exits: number }>();

    logs.forEach((log) => {
      const interval = Math.floor(log.timestamp.getTime() / (15 * 60 * 1000)) * (15 * 60 * 1000);
      const current = intervalMap.get(interval) || { entries: 0, exits: 0 };

      if (log.action === 'ENTRY') {
        current.entries += 1;
      } else {
        current.exits += 1;
      }

      intervalMap.set(interval, current);
    });

    let cumulative = 0;
    return Array.from(intervalMap.entries())
      .sort(([a], [b]) => a - b)
      .map(([timestamp, data]) => {
        cumulative += data.entries - data.exits;
        return {
          timestamp: new Date(timestamp),
          entries: data.entries,
          exits: data.exits,
          cumulative,
        };
      });
  }

  private async getZoneDistribution(festivalId: string): Promise<ZoneAttendance[]> {
    const zones = await this.prisma.zone.findMany({
      where: { festivalId, isActive: true },
    });

    return zones.map((zone) => ({
      zoneId: zone.id,
      zoneName: zone.name,
      currentOccupancy: zone.currentOccupancy,
      capacity: zone.capacity || 0,
      occupancyRate: zone.capacity ? (zone.currentOccupancy / zone.capacity) * 100 : 0,
    }));
  }

  private calculatePeakTimes(hourlyData: HourlyAttendance[]) {
    if (hourlyData.length === 0) {
      return {
        peak: { time: new Date(), count: 0 },
        lowest: { time: new Date(), count: 0 },
      };
    }

    const sorted = [...hourlyData].sort((a, b) => b.totalInside - a.totalInside);

    return {
      peak: { time: sorted[0].date, count: sorted[0].totalInside },
      lowest: {
        time: sorted[sorted.length - 1].date,
        count: sorted[sorted.length - 1].totalInside,
      },
    };
  }

  // ============ Zone Details ============

  private async getZoneStats(
    festivalId: string,
    timeRange: TimeRange,
    zoneId?: string,
  ): Promise<ZoneStats[]> {
    const whereClause: any = { festivalId, isActive: true };
    if (zoneId) {
      whereClause.id = zoneId;
    }

    const zones = await this.prisma.zone.findMany({
      where: whereClause,
      include: {
        accessLogs: {
          where: {
            timestamp: { gte: timeRange.startDate, lte: timeRange.endDate },
          },
        },
      },
    });

    return Promise.all(
      zones.map(async (zone) => {
        const entries = zone.accessLogs.filter((l) => l.action === 'ENTRY');

        const uniqueTickets = new Set(zone.accessLogs.map((l) => l.ticketId));

        // Calculate hourly occupancy
        const hourlyOccupancy = new Map<number, number>();
        for (let i = 0; i < 24; i++) {
          hourlyOccupancy.set(i, 0);
        }

        entries.forEach((e) => {
          const hour = e.timestamp.getHours();
          hourlyOccupancy.set(hour, (hourlyOccupancy.get(hour) || 0) + 1);
        });

        // Find peak
        const peakEntry = Array.from(hourlyOccupancy.entries()).reduce(
          (max, [h, c]) => (c > max.count ? { hour: h, count: c } : max),
          { hour: 0, count: 0 },
        );

        return {
          zoneId: zone.id,
          zoneName: zone.name,
          capacity: zone.capacity,
          currentOccupancy: zone.currentOccupancy,
          occupancyRate: zone.capacity ? (zone.currentOccupancy / zone.capacity) * 100 : 0,
          totalVisits: entries.length,
          uniqueVisitors: uniqueTickets.size,
          averageTimeSpent: 0, // Would need entry-exit pairing
          peakOccupancy: peakEntry.count,
          peakTime:
            peakEntry.count > 0
              ? new Date(
                  `${timeRange.startDate.toISOString().split('T')[0]}T${String(peakEntry.hour).padStart(2, '0')}:00:00`,
                )
              : null,
          hourlyOccupancy: Array.from(hourlyOccupancy.entries())
            .map(([hour, occupancy]) => ({ hour, occupancy }))
            .sort((a, b) => a.hour - b.hour),
        };
      }),
    );
  }

  private async getZoneHeatmapData(
    festivalId: string,
    timeRange: TimeRange,
  ): Promise<ZoneHeatmapData[]> {
    const zones = await this.prisma.zone.findMany({
      where: { festivalId, isActive: true },
      include: {
        accessLogs: {
          where: {
            action: 'ENTRY',
            timestamp: { gte: timeRange.startDate, lte: timeRange.endDate },
          },
        },
      },
    });

    return zones.map((zone) => {
      const data: { hour: number; day: number; value: number }[] = [];

      // Group by day and hour
      const heatmap = new Map<string, number>();

      zone.accessLogs.forEach((log) => {
        const day = log.timestamp.getDay();
        const hour = log.timestamp.getHours();
        const key = `${day}-${hour}`;
        heatmap.set(key, (heatmap.get(key) || 0) + 1);
      });

      // Fill all combinations
      for (let day = 0; day < 7; day++) {
        for (let hour = 0; hour < 24; hour++) {
          data.push({
            day,
            hour,
            value: heatmap.get(`${day}-${hour}`) || 0,
          });
        }
      }

      return {
        zoneId: zone.id,
        zoneName: zone.name,
        data,
      };
    });
  }

  private async getZoneTransitions(
    festivalId: string,
    timeRange: TimeRange,
  ): Promise<ZoneTransition[]> {
    // Get all access logs ordered by ticket and time
    const logs = await this.prisma.zoneAccessLog.findMany({
      where: {
        zone: { festivalId },
        timestamp: { gte: timeRange.startDate, lte: timeRange.endDate },
      },
      include: {
        zone: true,
      },
      orderBy: [{ ticketId: 'asc' }, { timestamp: 'asc' }],
    });

    // Group by ticket and find transitions
    const transitionMap = new Map<string, { count: number; totalTime: number }>();

    let prevLog: (typeof logs)[0] | null = null;
    logs.forEach((log) => {
      if (prevLog && prevLog.ticketId === log.ticketId && prevLog.zoneId !== log.zoneId) {
        const key = `${prevLog.zone.name}->${log.zone.name}`;
        const current = transitionMap.get(key) || { count: 0, totalTime: 0 };
        current.count += 1;
        current.totalTime += log.timestamp.getTime() - prevLog.timestamp.getTime();
        transitionMap.set(key, current);
      }
      prevLog = log;
    });

    return Array.from(transitionMap.entries())
      .map(([key, data]) => {
        const [fromZone, toZone] = key.split('->');
        return {
          fromZone,
          toZone,
          count: data.count,
          averageTime: data.count > 0 ? data.totalTime / data.count / 60000 : 0, // Convert to minutes
        };
      })
      .sort((a, b) => b.count - a.count);
  }

  // ============ Vendor Details ============

  private async getVendorSummary(
    festivalId: string,
    timeRange: TimeRange,
    vendorId?: string,
    vendorType?: string,
  ): Promise<{
    totalVendors: number;
    totalOrders: number;
    totalRevenue: number;
    averageOrderValue: number;
  }> {
    const vendorWhere: any = { festivalId };
    if (vendorId) vendorWhere.id = vendorId;
    if (vendorType) vendorWhere.type = vendorType;

    const [vendorCount, orderStats] = await Promise.all([
      this.prisma.vendor.count({ where: vendorWhere }),
      this.prisma.vendorOrder.aggregate({
        where: {
          vendor: vendorWhere,
          status: { in: ['CONFIRMED', 'PREPARING', 'READY', 'DELIVERED'] },
          createdAt: { gte: timeRange.startDate, lte: timeRange.endDate },
        },
        _count: true,
        _sum: { totalAmount: true },
      }),
    ]);

    const totalOrders = orderStats._count || 0;
    const totalRevenue = this.decimalToNumber(orderStats._sum.totalAmount);

    return {
      totalVendors: vendorCount,
      totalOrders,
      totalRevenue,
      averageOrderValue: totalOrders > 0 ? totalRevenue / totalOrders : 0,
    };
  }

  private async getVendorsByType(
    festivalId: string,
    timeRange: TimeRange,
  ): Promise<VendorTypeStats[]> {
    const vendors = await this.prisma.vendor.findMany({
      where: { festivalId },
      include: {
        orders: {
          where: {
            status: { in: ['CONFIRMED', 'PREPARING', 'READY', 'DELIVERED'] },
            createdAt: { gte: timeRange.startDate, lte: timeRange.endDate },
          },
        },
      },
    });

    const typeMap = new Map<
      string,
      { vendorCount: number; orderCount: number; revenue: number }
    >();

    vendors.forEach((v) => {
      const current = typeMap.get(v.type) || { vendorCount: 0, orderCount: 0, revenue: 0 };
      current.vendorCount += 1;
      current.orderCount += v.orders.length;
      current.revenue += v.orders.reduce(
        (sum, o) => sum + this.decimalToNumber(o.totalAmount),
        0,
      );
      typeMap.set(v.type, current);
    });

    const totalRevenue = Array.from(typeMap.values()).reduce((s, d) => s + d.revenue, 0);

    return Array.from(typeMap.entries()).map(([type, data]) => ({
      type,
      vendorCount: data.vendorCount,
      orderCount: data.orderCount,
      revenue: data.revenue,
      percentageOfTotal: totalRevenue > 0 ? (data.revenue / totalRevenue) * 100 : 0,
    }));
  }

  private async getTopVendors(
    festivalId: string,
    timeRange: TimeRange,
    limit: number,
  ): Promise<VendorStats[]> {
    const vendors = await this.prisma.vendor.findMany({
      where: { festivalId },
      include: {
        orders: {
          where: {
            createdAt: { gte: timeRange.startDate, lte: timeRange.endDate },
          },
        },
      },
    });

    return vendors
      .map((v) => {
        const completedOrders = v.orders.filter((o) =>
          ['CONFIRMED', 'PREPARING', 'READY', 'DELIVERED'].includes(o.status),
        );
        const totalOrders = completedOrders.length;
        const totalRevenue = completedOrders.reduce(
          (sum, o) => sum + this.decimalToNumber(o.totalAmount),
          0,
        );

        return {
          vendorId: v.id,
          vendorName: v.name,
          vendorType: v.type,
          totalOrders,
          totalRevenue,
          averageOrderValue: totalOrders > 0 ? totalRevenue / totalOrders : 0,
          completionRate:
            v.orders.length > 0 ? (completedOrders.length / v.orders.length) * 100 : 0,
        };
      })
      .sort((a, b) => b.totalRevenue - a.totalRevenue)
      .slice(0, limit);
  }

  private async getTopProducts(
    festivalId: string,
    timeRange: TimeRange,
    limit: number,
  ): Promise<ProductStats[]> {
    const orders = await this.prisma.vendorOrder.findMany({
      where: {
        vendor: { festivalId },
        status: { in: ['CONFIRMED', 'PREPARING', 'READY', 'DELIVERED'] },
        createdAt: { gte: timeRange.startDate, lte: timeRange.endDate },
      },
      include: {
        vendor: true,
      },
    });

    const productMap = new Map<
      string,
      { vendorId: string; vendorName: string; category: string; units: number; revenue: number }
    >();

    orders.forEach((order) => {
      const orderMetadata = order as unknown as { items?: unknown[] };
      const items = (orderMetadata.items || []) as any[];
      if (Array.isArray(items)) {
        items.forEach((item) => {
          const key = `${order.vendorId}-${item.name}`;
          const current = productMap.get(key) || {
            vendorId: order.vendorId,
            vendorName: order.vendor.name,
            category: item.category || 'Uncategorized',
            units: 0,
            revenue: 0,
          };
          current.units += item.quantity || 1;
          current.revenue += (item.price || 0) * (item.quantity || 1);
          productMap.set(key, current);
        });
      }
    });

    return Array.from(productMap.entries())
      .map(([key, data]) => ({
        vendorId: data.vendorId,
        vendorName: data.vendorName,
        productName: key.split('-').slice(1).join('-'),
        category: data.category,
        unitsSold: data.units,
        revenue: data.revenue,
      }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, limit);
  }

  private async getHourlyVendorOrders(
    festivalId: string,
    timeRange: TimeRange,
  ): Promise<HourlyVendorOrders[]> {
    const orders = await this.prisma.vendorOrder.findMany({
      where: {
        vendor: { festivalId },
        status: { in: ['CONFIRMED', 'PREPARING', 'READY', 'DELIVERED'] },
        createdAt: { gte: timeRange.startDate, lte: timeRange.endDate },
      },
      select: {
        createdAt: true,
        totalAmount: true,
      },
    });

    const hourlyMap = new Map<number, { count: number; revenue: number }>();

    for (let i = 0; i < 24; i++) {
      hourlyMap.set(i, { count: 0, revenue: 0 });
    }

    orders.forEach((order) => {
      const hour = order.createdAt.getHours();
      const current = hourlyMap.get(hour)!;
      current.count += 1;
      current.revenue += this.decimalToNumber(order.totalAmount);
    });

    return Array.from(hourlyMap.entries())
      .map(([hour, data]) => ({
        hour,
        orderCount: data.count,
        revenue: data.revenue,
        averageOrderValue: data.count > 0 ? data.revenue / data.count : 0,
      }))
      .sort((a, b) => a.hour - b.hour);
  }

  private async getOrderStatusBreakdown(
    festivalId: string,
    timeRange: TimeRange,
  ): Promise<OrderStatusStats[]> {
    const orders = await this.prisma.vendorOrder.groupBy({
      by: ['status'],
      where: {
        vendor: { festivalId },
        createdAt: { gte: timeRange.startDate, lte: timeRange.endDate },
      },
      _count: true,
    });

    const total = orders.reduce((sum, o) => sum + o._count, 0);

    return orders.map((o) => ({
      status: o.status,
      count: o._count,
      percentage: total > 0 ? (o._count / total) * 100 : 0,
    }));
  }

  // ============ Realtime Helpers ============

  private async getLiveAttendanceData(
    festivalId: string,
    _maxCapacity: number,
  ): Promise<{
    currentAttendees: number;
    lastHourEntries: number;
    lastHourExits: number;
  }> {
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);

    const [festival, lastHourLogs] = await Promise.all([
      this.prisma.festival.findUnique({
        where: { id: festivalId },
        select: { currentAttendees: true },
      }),
      this.prisma.zoneAccessLog.findMany({
        where: {
          zone: { festivalId },
          timestamp: { gte: oneHourAgo },
        },
        select: { action: true },
      }),
    ]);

    return {
      currentAttendees: festival?.currentAttendees || 0,
      lastHourEntries: lastHourLogs.filter((l) => l.action === 'ENTRY').length,
      lastHourExits: lastHourLogs.filter((l) => l.action === 'EXIT').length,
    };
  }

  private async getLastHourMetrics(
    festivalId: string,
    from: Date,
    to: Date,
  ): Promise<{
    ticketsSold: number;
    ticketRevenue: number;
    cashlessTopups: number;
    cashlessPayments: number;
    vendorOrders: number;
  }> {
    const [tickets, cashless, vendorOrders] = await Promise.all([
      this.prisma.ticket.aggregate({
        where: {
          festivalId,
          status: { in: ['SOLD', 'USED'] },
          createdAt: { gte: from, lte: to },
        },
        _count: true,
        _sum: { purchasePrice: true },
      }),
      this.prisma.cashlessTransaction.groupBy({
        by: ['type'],
        where: {
          festivalId,
          type: { in: ['TOPUP', 'PAYMENT'] },
          createdAt: { gte: from, lte: to },
        },
        _count: true,
      }),
      this.prisma.vendorOrder.count({
        where: {
          vendor: { festivalId },
          createdAt: { gte: from, lte: to },
        },
      }),
    ]);

    const topups = cashless.find((c) => c.type === 'TOPUP')?._count || 0;
    const payments = cashless.find((c) => c.type === 'PAYMENT')?._count || 0;

    return {
      ticketsSold: tickets._count || 0,
      ticketRevenue: this.decimalToNumber(tickets._sum.purchasePrice),
      cashlessTopups: topups,
      cashlessPayments: payments,
      vendorOrders,
    };
  }

  private async generateAlerts(
    festivalId: string,
    liveData: { currentAttendees: number },
    zones: ZoneAttendance[],
    thresholds: AlertThresholdsDto,
  ): Promise<AnalyticsAlert[]> {
    const alerts: AnalyticsAlert[] = [];
    const now = new Date();

    const festival = await this.prisma.festival.findUnique({
      where: { id: festivalId },
      select: { maxCapacity: true },
    });

    if (!festival) return alerts;

    const occupancyRate = (liveData.currentAttendees / festival.maxCapacity) * 100;

    // Capacity alerts
    if (occupancyRate >= (thresholds.capacityCritical || 95)) {
      alerts.push({
        id: `capacity-critical-${now.getTime()}`,
        type: 'CAPACITY_CRITICAL',
        severity: 'CRITICAL',
        message: `Festival capacity critical: ${occupancyRate.toFixed(1)}% occupied`,
        value: occupancyRate,
        threshold: thresholds.capacityCritical || 95,
        timestamp: now,
      });
    } else if (occupancyRate >= (thresholds.capacityWarning || 80)) {
      alerts.push({
        id: `capacity-warning-${now.getTime()}`,
        type: 'CAPACITY_WARNING',
        severity: 'WARNING',
        message: `Festival capacity warning: ${occupancyRate.toFixed(1)}% occupied`,
        value: occupancyRate,
        threshold: thresholds.capacityWarning || 80,
        timestamp: now,
      });
    }

    // Zone capacity alerts
    zones.forEach((zone) => {
      if (zone.occupancyRate >= (thresholds.zoneCapacityWarning || 85)) {
        alerts.push({
          id: `zone-overcrowded-${zone.zoneId}-${now.getTime()}`,
          type: 'ZONE_OVERCROWDED',
          severity: 'WARNING',
          message: `Zone "${zone.zoneName}" is overcrowded: ${zone.occupancyRate.toFixed(1)}% capacity`,
          zone: zone.zoneName,
          value: zone.occupancyRate,
          threshold: thresholds.zoneCapacityWarning || 85,
          timestamp: now,
        });
      }
    });

    return alerts;
  }

  /**
   * Invalidate cache for a festival
   */
  async invalidateCache(festivalId: string): Promise<void> {
    const patterns = [
      `analytics:dashboard:${festivalId}*`,
      `analytics:sales:${festivalId}*`,
      `analytics:cashless:${festivalId}*`,
      `analytics:attendance:${festivalId}*`,
      `analytics:zones:${festivalId}*`,
      `analytics:vendors:${festivalId}*`,
      `analytics:realtime:${festivalId}*`,
    ];

    for (const pattern of patterns) {
      await this.cacheService.deletePattern(pattern);
    }

    this.logger.log(`Cache invalidated for festival: ${festivalId}`);
  }
}
