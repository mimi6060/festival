import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CacheService } from '../../cache/cache.service';
import { AnalyticsService } from './analytics.service';
import { AdvancedMetricsService } from './advanced-metrics.service';
import {
  CustomReportConfig,
  ReportFilter,
  ComparisonAnalytics,
  CohortAnalysis,
  FunnelAnalysis,
  AnomalyDetection,
  BenchmarkData,
} from '../interfaces/advanced-metrics.interfaces';
import { TimeRange } from '../interfaces/analytics.interfaces';

@Injectable()
export class CustomReportsService {
  private readonly logger = new Logger(CustomReportsService.name);
  private readonly CACHE_TTL = 300; // 5 minutes

  // In-memory store for report configs (would be in database in production)
  private reportConfigs = new Map<string, CustomReportConfig>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly cacheService: CacheService,
    private readonly analyticsService: AnalyticsService,
    private readonly advancedMetricsService: AdvancedMetricsService,
  ) {}

  /**
   * Create a custom report configuration
   */
  async createReport(
    festivalId: string,
    userId: string,
    config: Omit<CustomReportConfig, 'id' | 'createdAt' | 'updatedAt' | 'createdBy'>,
  ): Promise<CustomReportConfig> {
    const id = `report_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const reportConfig: CustomReportConfig = {
      ...config,
      id,
      festivalId,
      createdBy: userId,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.reportConfigs.set(id, reportConfig);
    this.logger.log(`Created custom report: ${reportConfig.name} (${id})`);

    return reportConfig;
  }

  /**
   * Get all reports for a festival
   */
  async getReports(festivalId: string): Promise<CustomReportConfig[]> {
    return Array.from(this.reportConfigs.values())
      .filter(r => r.festivalId === festivalId);
  }

  /**
   * Get a specific report by ID
   */
  async getReport(reportId: string): Promise<CustomReportConfig> {
    const report = this.reportConfigs.get(reportId);
    if (!report) {
      throw new NotFoundException(`Report ${reportId} not found`);
    }
    return report;
  }

  /**
   * Update a report configuration
   */
  async updateReport(
    reportId: string,
    updates: Partial<Omit<CustomReportConfig, 'id' | 'createdAt' | 'createdBy'>>,
  ): Promise<CustomReportConfig> {
    const existing = await this.getReport(reportId);

    const updated: CustomReportConfig = {
      ...existing,
      ...updates,
      updatedAt: new Date(),
    };

    this.reportConfigs.set(reportId, updated);
    return updated;
  }

  /**
   * Delete a report configuration
   */
  async deleteReport(reportId: string): Promise<void> {
    if (!this.reportConfigs.has(reportId)) {
      throw new NotFoundException(`Report ${reportId} not found`);
    }
    this.reportConfigs.delete(reportId);
  }

  /**
   * Execute a custom report and return results
   */
  async executeReport(
    reportId: string,
    timeRange?: TimeRange,
  ): Promise<Record<string, unknown>> {
    const config = await this.getReport(reportId);

    const cacheKey = `report:${reportId}:${JSON.stringify(timeRange)}`;
    const cached = await this.cacheService.get<Record<string, unknown>>(cacheKey);
    if (cached) {return cached;}

    const effectiveTimeRange = timeRange || this.getDefaultTimeRange();
    const results: Record<string, unknown> = {
      reportId: config.id,
      reportName: config.name,
      generatedAt: new Date(),
      period: effectiveTimeRange,
      data: {},
    };

    // Execute each requested metric
    for (const metric of config.metrics) {
      try {
        const metricData = await this.getMetricData(
          config.festivalId,
          metric,
          effectiveTimeRange,
          config.filters,
        );
        (results.data as Record<string, unknown>)[metric] = metricData;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        this.logger.warn(`Failed to get metric ${metric}: ${errorMessage}`);
        (results.data as Record<string, unknown>)[metric] = { error: errorMessage };
      }
    }

    await this.cacheService.set(cacheKey, results, this.CACHE_TTL);
    return results;
  }

  /**
   * Get data for a specific metric
   */
  private async getMetricData(
    festivalId: string,
    metric: string,
    timeRange: TimeRange,
    filters?: ReportFilter[],
  ): Promise<unknown> {
    switch (metric) {
      case 'dashboard':
        return this.analyticsService.getDashboardKPIs(festivalId, {
          startDate: timeRange.startDate.toISOString(),
          endDate: timeRange.endDate.toISOString(),
        });

      case 'sales':
        return this.analyticsService.getSalesAnalytics(festivalId, {
          startDate: timeRange.startDate.toISOString(),
          endDate: timeRange.endDate.toISOString(),
        });

      case 'cashless':
        return this.analyticsService.getCashlessAnalytics(festivalId, {
          startDate: timeRange.startDate.toISOString(),
          endDate: timeRange.endDate.toISOString(),
        });

      case 'attendance':
        return this.analyticsService.getAttendanceAnalytics(festivalId, {
          startDate: timeRange.startDate.toISOString(),
          endDate: timeRange.endDate.toISOString(),
        });

      case 'zones':
        return this.analyticsService.getZoneAnalytics(festivalId, {
          startDate: timeRange.startDate.toISOString(),
          endDate: timeRange.endDate.toISOString(),
        });

      case 'vendors':
        return this.analyticsService.getVendorAnalytics(festivalId, {
          startDate: timeRange.startDate.toISOString(),
          endDate: timeRange.endDate.toISOString(),
        });

      case 'revenue':
        return this.advancedMetricsService.getRevenueMetrics(
          festivalId,
          timeRange.startDate,
          timeRange.endDate,
        );

      case 'customers':
        return this.advancedMetricsService.getCustomerMetrics(
          festivalId,
          timeRange.startDate,
          timeRange.endDate,
        );

      case 'performance':
        return this.advancedMetricsService.getPerformanceMetrics(
          festivalId,
          timeRange.startDate,
          timeRange.endDate,
        );

      case 'fraud':
        return this.advancedMetricsService.getFraudMetrics(
          festivalId,
          timeRange.startDate,
          timeRange.endDate,
        );

      case 'growth':
        return this.advancedMetricsService.getGrowthMetrics(
          festivalId,
          timeRange.startDate,
          timeRange.endDate,
        );

      case 'forecast':
        return this.advancedMetricsService.getForecastMetrics(festivalId, 7);

      case 'staff':
        return this.advancedMetricsService.getStaffMetrics(
          festivalId,
          timeRange.startDate,
          timeRange.endDate,
        );

      case 'environmental':
        return this.advancedMetricsService.getEnvironmentalMetrics(
          festivalId,
          timeRange.startDate,
          timeRange.endDate,
        );

      case 'security':
        return this.advancedMetricsService.getSecurityMetrics(
          festivalId,
          timeRange.startDate,
          timeRange.endDate,
        );

      case 'comprehensive':
        return this.advancedMetricsService.getComprehensiveAnalytics(
          festivalId,
          timeRange.startDate,
          timeRange.endDate,
        );

      default:
        throw new BadRequestException(`Unknown metric: ${metric}`);
    }
  }

  /**
   * Get comparison analytics between two periods
   */
  async getComparisonAnalytics(
    festivalId: string,
    currentPeriod: TimeRange,
    comparisonPeriod: TimeRange,
    metrics: string[],
  ): Promise<ComparisonAnalytics> {
    const cacheKey = `comparison:${festivalId}:${JSON.stringify({ currentPeriod, comparisonPeriod, metrics })}`;

    const cached = await this.cacheService.get<ComparisonAnalytics>(cacheKey);
    if (cached) {return cached;}

    const comparisonMetrics: ComparisonAnalytics['metrics'] = [];

    for (const metricName of metrics) {
      try {
        const [current, previous] = await Promise.all([
          this.getSimpleMetricValue(festivalId, metricName, currentPeriod),
          this.getSimpleMetricValue(festivalId, metricName, comparisonPeriod),
        ]);

        const change = current - previous;
        const changePercentage = previous !== 0 ? (change / previous) * 100 : 0;

        comparisonMetrics.push({
          name: metricName,
          current,
          previous,
          change,
          changePercentage,
          trend: change > 0 ? 'up' : change < 0 ? 'down' : 'stable',
        });
      } catch (error) {
        this.logger.warn(`Failed to compare metric ${metricName}`);
      }
    }

    const result: ComparisonAnalytics = {
      currentPeriod,
      comparisonPeriod,
      metrics: comparisonMetrics,
    };

    await this.cacheService.set(cacheKey, result, this.CACHE_TTL);
    return result;
  }

  /**
   * Get simple numeric value for a metric
   */
  private async getSimpleMetricValue(
    festivalId: string,
    metric: string,
    timeRange: TimeRange,
  ): Promise<number> {
    switch (metric) {
      case 'totalSales': {
        const sales = await this.prisma.ticket.count({
          where: {
            festivalId,
            status: { in: ['SOLD', 'USED'] },
            createdAt: { gte: timeRange.startDate, lte: timeRange.endDate },
          },
        });
        return sales;
      }

      case 'totalRevenue': {
        const revenue = await this.prisma.ticket.aggregate({
          where: {
            festivalId,
            status: { in: ['SOLD', 'USED'] },
            createdAt: { gte: timeRange.startDate, lte: timeRange.endDate },
          },
          _sum: { purchasePrice: true },
        });
        return Number(revenue._sum.purchasePrice) || 0;
      }

      case 'totalAttendees': {
        const attendance = await this.prisma.zoneAccessLog.findMany({
          where: {
            zone: { festivalId },
            action: 'ENTRY',
            timestamp: { gte: timeRange.startDate, lte: timeRange.endDate },
          },
          select: { ticketId: true },
          distinct: ['ticketId'],
        });
        return attendance.length;
      }

      case 'cashlessTransactions': {
        const transactions = await this.prisma.cashlessTransaction.count({
          where: {
            festivalId,
            createdAt: { gte: timeRange.startDate, lte: timeRange.endDate },
          },
        });
        return transactions;
      }

      case 'vendorOrders': {
        const orders = await this.prisma.vendorOrder.count({
          where: {
            vendor: { festivalId },
            createdAt: { gte: timeRange.startDate, lte: timeRange.endDate },
          },
        });
        return orders;
      }

      case 'supportTickets': {
        const tickets = await this.prisma.supportTicket.count({
          where: {
            festivalId,
            createdAt: { gte: timeRange.startDate, lte: timeRange.endDate },
          },
        });
        return tickets;
      }

      default:
        return 0;
    }
  }

  /**
   * Perform cohort analysis
   */
  async getCohortAnalysis(
    festivalId: string,
    cohortType: CohortAnalysis['cohortType'],
    timeRange: TimeRange,
  ): Promise<CohortAnalysis> {
    const cacheKey = `cohort:${festivalId}:${cohortType}:${JSON.stringify(timeRange)}`;

    const cached = await this.cacheService.get<CohortAnalysis>(cacheKey);
    if (cached) {return cached;}

    let cohorts: CohortAnalysis['cohorts'] = [];
    let periods: string[] = [];

    switch (cohortType) {
      case 'acquisition_date': {
        const result = await this.getAcquisitionDateCohorts(festivalId, timeRange);
        cohorts = result.cohorts;
        periods = result.periods;
        break;
      }

      case 'ticket_type': {
        const ticketResult = await this.getTicketTypeCohorts(festivalId, timeRange);
        cohorts = ticketResult.cohorts;
        periods = ticketResult.periods;
        break;
      }

      case 'first_purchase': {
        const purchaseResult = await this.getFirstPurchaseCohorts(festivalId, timeRange);
        cohorts = purchaseResult.cohorts;
        periods = purchaseResult.periods;
        break;
      }
    }

    const analysis: CohortAnalysis = {
      cohortType,
      cohorts,
      periods,
    };

    await this.cacheService.set(cacheKey, analysis, this.CACHE_TTL);
    return analysis;
  }

  private async getAcquisitionDateCohorts(
    festivalId: string,
    timeRange: TimeRange,
  ): Promise<{ cohorts: CohortAnalysis['cohorts']; periods: string[] }> {
    // Get tickets grouped by week of purchase
    const tickets = await this.prisma.ticket.findMany({
      where: {
        festivalId,
        status: { in: ['SOLD', 'USED'] },
        createdAt: { gte: timeRange.startDate, lte: timeRange.endDate },
      },
      select: {
        userId: true,
        createdAt: true,
        purchasePrice: true,
      },
    });

    // Group by week
    const weeklyGroups = new Map<string, { users: Set<string>; revenue: number }>();
    tickets.forEach(t => {
      const weekStart = this.getWeekStart(t.createdAt);
      const key = weekStart.toISOString().split('T')[0];
      const current = weeklyGroups.get(key) || { users: new Set(), revenue: 0 };
      current.users.add(t.userId);
      current.revenue += Number(t.purchasePrice) || 0;
      weeklyGroups.set(key, current);
    });

    const periods = Array.from(weeklyGroups.keys()).sort();
    const cohorts: CohortAnalysis['cohorts'] = periods.map(period => {
      const group = weeklyGroups.get(period)!;
      return {
        name: `Week of ${period}`,
        size: group.users.size,
        retention: [100], // Would calculate actual retention over time
        revenue: [group.revenue],
        avgSpending: group.users.size > 0 ? group.revenue / group.users.size : 0,
      };
    });

    return { cohorts, periods };
  }

  private async getTicketTypeCohorts(
    festivalId: string,
    timeRange: TimeRange,
  ): Promise<{ cohorts: CohortAnalysis['cohorts']; periods: string[] }> {
    const tickets = await this.prisma.ticket.findMany({
      where: {
        festivalId,
        status: { in: ['SOLD', 'USED'] },
        createdAt: { gte: timeRange.startDate, lte: timeRange.endDate },
      },
      include: { category: true },
    });

    const typeGroups = new Map<string, { users: Set<string>; revenue: number; count: number }>();
    tickets.forEach(t => {
      const type = t.category.type;
      const current = typeGroups.get(type) || { users: new Set(), revenue: 0, count: 0 };
      current.users.add(t.userId);
      current.revenue += Number(t.purchasePrice) || 0;
      current.count += 1;
      typeGroups.set(type, current);
    });

    const periods = Array.from(typeGroups.keys()).sort();
    const cohorts: CohortAnalysis['cohorts'] = periods.map(type => {
      const group = typeGroups.get(type)!;
      return {
        name: type,
        size: group.users.size,
        retention: [100],
        revenue: [group.revenue],
        avgSpending: group.users.size > 0 ? group.revenue / group.users.size : 0,
      };
    });

    return { cohorts, periods };
  }

  private async getFirstPurchaseCohorts(
    festivalId: string,
    timeRange: TimeRange,
  ): Promise<{ cohorts: CohortAnalysis['cohorts']; periods: string[] }> {
    // Get first purchase date per user
    const firstPurchases = await this.prisma.ticket.groupBy({
      by: ['userId'],
      where: {
        festivalId,
        status: { in: ['SOLD', 'USED'] },
      },
      _min: { createdAt: true },
    });

    // Filter to users who first purchased in the time range
    const usersInRange = firstPurchases.filter(
      p => p._min.createdAt! >= timeRange.startDate && p._min.createdAt! <= timeRange.endDate
    );

    // Group by month
    const monthlyGroups = new Map<string, Set<string>>();
    usersInRange.forEach(p => {
      const month = p._min.createdAt!.toISOString().slice(0, 7);
      const current = monthlyGroups.get(month) || new Set();
      current.add(p.userId);
      monthlyGroups.set(month, current);
    });

    const periods = Array.from(monthlyGroups.keys()).sort();
    const cohorts: CohortAnalysis['cohorts'] = periods.map(month => {
      const users = monthlyGroups.get(month)!;
      return {
        name: month,
        size: users.size,
        retention: [100],
        revenue: [0], // Would need to calculate total revenue
        avgSpending: 0,
      };
    });

    return { cohorts, periods };
  }

  /**
   * Perform funnel analysis
   */
  async getFunnelAnalysis(
    festivalId: string,
    funnelName: string,
  ): Promise<FunnelAnalysis> {
    const cacheKey = `funnel:${festivalId}:${funnelName}`;

    const cached = await this.cacheService.get<FunnelAnalysis>(cacheKey);
    if (cached) {return cached;}

    let analysis: FunnelAnalysis;

    switch (funnelName) {
      case 'purchase':
        analysis = await this.getPurchaseFunnel(festivalId);
        break;
      case 'entry':
        analysis = await this.getEntryFunnel(festivalId);
        break;
      case 'cashless':
        analysis = await this.getCashlessFunnel(festivalId);
        break;
      default:
        throw new BadRequestException(`Unknown funnel: ${funnelName}`);
    }

    await this.cacheService.set(cacheKey, analysis, this.CACHE_TTL);
    return analysis;
  }

  private async getPurchaseFunnel(festivalId: string): Promise<FunnelAnalysis> {
    // This would typically use session/event tracking data
    // Simplified version using ticket data

    const [
      uniqueUsers,
      usersWithTickets,
      usersAttended,
    ] = await Promise.all([
      // Users who viewed (estimated from sessions)
      this.prisma.user.count(),
      // Users who purchased
      this.prisma.ticket.findMany({
        where: { festivalId, status: { in: ['SOLD', 'USED'] } },
        select: { userId: true },
        distinct: ['userId'],
      }),
      // Users who used their ticket
      this.prisma.ticket.findMany({
        where: { festivalId, status: 'USED' },
        select: { userId: true },
        distinct: ['userId'],
      }),
    ]);

    const steps = [
      { name: 'Site Visit', count: uniqueUsers },
      { name: 'Ticket Purchased', count: usersWithTickets.length },
      { name: 'Event Attended', count: usersAttended.length },
    ].map((step, index, arr) => ({
      ...step,
      percentage: arr[0].count > 0 ? (step.count / arr[0].count) * 100 : 0,
      dropoff: index > 0 ? arr[index - 1].count - step.count : 0,
    }));

    return {
      name: 'Purchase Funnel',
      steps,
      overallConversion: uniqueUsers > 0 ? (usersAttended.length / uniqueUsers) * 100 : 0,
    };
  }

  private async getEntryFunnel(festivalId: string): Promise<FunnelAnalysis> {
    const [
      totalTickets,
      validatedTickets,
      usedTickets,
    ] = await Promise.all([
      this.prisma.ticket.count({
        where: { festivalId, status: { in: ['SOLD', 'USED'] } },
      }),
      this.prisma.ticket.count({
        where: { festivalId, validatedAt: { not: null } },
      }),
      this.prisma.ticket.count({
        where: { festivalId, status: 'USED' },
      }),
    ]);

    const steps = [
      { name: 'Tickets Sold', count: totalTickets },
      { name: 'QR Scanned', count: validatedTickets },
      { name: 'Entry Completed', count: usedTickets },
    ].map((step, index, arr) => ({
      ...step,
      percentage: arr[0].count > 0 ? (step.count / arr[0].count) * 100 : 0,
      dropoff: index > 0 ? arr[index - 1].count - step.count : 0,
    }));

    return {
      name: 'Entry Funnel',
      steps,
      overallConversion: totalTickets > 0 ? (usedTickets / totalTickets) * 100 : 0,
    };
  }

  private async getCashlessFunnel(festivalId: string): Promise<FunnelAnalysis> {
    const [
      totalAttendees,
      accountsCreated,
      accountsToppedUp,
      accountsUsed,
    ] = await Promise.all([
      this.prisma.ticket.count({
        where: { festivalId, status: 'USED' },
      }),
      this.prisma.cashlessAccount.count({
        where: {
          transactions: { some: { festivalId } },
        },
      }),
      this.prisma.cashlessTransaction.findMany({
        where: { festivalId, type: 'TOPUP' },
        select: { accountId: true },
        distinct: ['accountId'],
      }),
      this.prisma.cashlessTransaction.findMany({
        where: { festivalId, type: 'PAYMENT' },
        select: { accountId: true },
        distinct: ['accountId'],
      }),
    ]);

    const steps = [
      { name: 'Attendees', count: totalAttendees },
      { name: 'Cashless Account', count: accountsCreated },
      { name: 'Account Topped Up', count: accountsToppedUp.length },
      { name: 'Made Purchase', count: accountsUsed.length },
    ].map((step, index, arr) => ({
      ...step,
      percentage: arr[0].count > 0 ? (step.count / arr[0].count) * 100 : 0,
      dropoff: index > 0 ? arr[index - 1].count - step.count : 0,
    }));

    return {
      name: 'Cashless Funnel',
      steps,
      overallConversion: totalAttendees > 0 ? (accountsUsed.length / totalAttendees) * 100 : 0,
    };
  }

  /**
   * Detect anomalies in metrics
   */
  async detectAnomalies(
    festivalId: string,
    metric: string,
    timeRange: TimeRange,
  ): Promise<AnomalyDetection[]> {
    const cacheKey = `anomalies:${festivalId}:${metric}:${JSON.stringify(timeRange)}`;

    const cached = await this.cacheService.get<AnomalyDetection[]>(cacheKey);
    if (cached) {return cached;}

    // Get historical data
    const historicalData = await this.getMetricTimeSeries(festivalId, metric, timeRange);

    if (historicalData.length < 7) {
      return []; // Need at least 7 data points for anomaly detection
    }

    // Calculate statistics
    const mean = historicalData.reduce((a, b) => a + b.value, 0) / historicalData.length;
    const variance = historicalData.reduce((sum, d) => sum + Math.pow(d.value - mean, 2), 0) / historicalData.length;
    const stdDev = Math.sqrt(variance);

    // Detect anomalies using z-score
    const anomalies: AnomalyDetection[] = [];
    const threshold = 2; // Standard deviations

    historicalData.forEach(dataPoint => {
      const zScore = Math.abs((dataPoint.value - mean) / stdDev);
      if (zScore > threshold) {
        let severity: AnomalyDetection['severity'] = 'low';
        if (zScore > 3) {severity = 'critical';}
        else if (zScore > 2.5) {severity = 'high';}
        else if (zScore > 2) {severity = 'medium';}

        anomalies.push({
          metric,
          timestamp: dataPoint.timestamp,
          expectedValue: mean,
          actualValue: dataPoint.value,
          deviation: zScore,
          severity,
          possibleCauses: this.identifyPossibleCauses(metric, dataPoint.value, mean),
        });
      }
    });

    await this.cacheService.set(cacheKey, anomalies, this.CACHE_TTL);
    return anomalies;
  }

  private async getMetricTimeSeries(
    festivalId: string,
    metric: string,
    timeRange: TimeRange,
  ): Promise<{ timestamp: Date; value: number }[]> {
    switch (metric) {
      case 'sales':
        const sales = await this.prisma.ticket.findMany({
          where: {
            festivalId,
            status: { in: ['SOLD', 'USED'] },
            createdAt: { gte: timeRange.startDate, lte: timeRange.endDate },
          },
          select: { createdAt: true },
        });

        // Group by hour
        const hourlyMap = new Map<string, number>();
        sales.forEach(s => {
          const hour = s.createdAt.toISOString().slice(0, 13);
          hourlyMap.set(hour, (hourlyMap.get(hour) || 0) + 1);
        });

        return Array.from(hourlyMap.entries())
          .map(([hour, count]) => ({
            timestamp: new Date(hour + ':00:00Z'),
            value: count,
          }))
          .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

      default:
        return [];
    }
  }

  private identifyPossibleCauses(metric: string, actual: number, expected: number): string[] {
    const causes: string[] = [];
    const isHigh = actual > expected;

    switch (metric) {
      case 'sales':
        if (isHigh) {
          causes.push('Promotional campaign effect');
          causes.push('Social media spike');
          causes.push('Artist announcement');
        } else {
          causes.push('Technical issues with website');
          causes.push('Payment gateway problems');
          causes.push('Negative PR event');
        }
        break;
      case 'attendance':
        if (isHigh) {
          causes.push('Weather conditions (good)');
          causes.push('Popular headliner performance');
        } else {
          causes.push('Weather conditions (bad)');
          causes.push('Transportation issues');
        }
        break;
    }

    return causes;
  }

  /**
   * Get benchmark data comparing festival to industry averages
   */
  async getBenchmarks(festivalId: string): Promise<BenchmarkData[]> {
    const cacheKey = `benchmarks:${festivalId}`;

    const cached = await this.cacheService.get<BenchmarkData[]>(cacheKey);
    if (cached) {return cached;}

    const festival = await this.prisma.festival.findUnique({
      where: { id: festivalId },
      include: {
        tickets: { where: { status: { in: ['SOLD', 'USED'] } } },
        _count: { select: { ticketCategories: true } },
      },
    });

    if (!festival) {
      throw new NotFoundException(`Festival ${festivalId} not found`);
    }

    const totalRevenue = festival.tickets.reduce(
      (sum, t) => sum + (Number(t.purchasePrice) || 0),
      0
    );
    const avgTicketPrice = festival.tickets.length > 0
      ? totalRevenue / festival.tickets.length
      : 0;

    // Industry averages (would be from actual benchmark database)
    const benchmarks: BenchmarkData[] = [
      {
        metric: 'Average Ticket Price',
        festivalValue: avgTicketPrice,
        industryAverage: 85,
        percentile: this.calculatePercentile(avgTicketPrice, 85, 20),
        recommendation: avgTicketPrice < 85 ? 'Consider premium ticket tiers' : undefined,
      },
      {
        metric: 'Sell-out Rate',
        festivalValue: (festival.tickets.length / festival.maxCapacity) * 100,
        industryAverage: 75,
        percentile: this.calculatePercentile(
          (festival.tickets.length / festival.maxCapacity) * 100,
          75,
          15
        ),
      },
      {
        metric: 'Cashless Adoption Rate',
        festivalValue: 95, // Assumed high since platform is cashless-first
        industryAverage: 60,
        percentile: 95,
        recommendation: undefined,
      },
      {
        metric: 'Support Ticket Resolution Time (hours)',
        festivalValue: 4,
        industryAverage: 8,
        percentile: 80,
        recommendation: undefined,
      },
    ];

    await this.cacheService.set(cacheKey, benchmarks, this.CACHE_TTL * 2);
    return benchmarks;
  }

  private calculatePercentile(value: number, average: number, stdDev: number): number {
    // Simplified percentile calculation using normal distribution
    const zScore = (value - average) / stdDev;
    // Approximate CDF
    const percentile = 50 + (50 * Math.tanh(zScore * 0.8));
    return Math.max(0, Math.min(100, Math.round(percentile)));
  }

  // Helper methods

  private getDefaultTimeRange(): TimeRange {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    return {
      startDate: thirtyDaysAgo,
      endDate: now,
    };
  }

  private getWeekStart(date: Date): Date {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day;
    return new Date(d.setDate(diff));
  }
}
