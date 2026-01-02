import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CacheService } from '../../cache/cache.service';
import { Decimal } from '@prisma/client/runtime/library';
import {
  RevenueMetrics,
  CustomerMetrics,
  PerformanceMetrics,
  FraudMetrics,
  GrowthMetrics,
  ForecastMetrics,
  ComprehensiveAnalytics,
  StaffMetrics,
  EnvironmentalMetrics,
  SecurityMetrics,
} from '../interfaces/advanced-metrics.interfaces';

@Injectable()
export class AdvancedMetricsService {
  private readonly logger = new Logger(AdvancedMetricsService.name);
  private readonly CACHE_TTL = 120; // 2 minutes

  constructor(
    private readonly prisma: PrismaService,
    private readonly cacheService: CacheService,
  ) {}

  private decimalToNumber(value: Decimal | null): number {
    return value ? Number(value) : 0;
  }

  /**
   * Get comprehensive revenue metrics with breakdown
   */
  async getRevenueMetrics(
    festivalId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<RevenueMetrics> {
    const cacheKey = `analytics:revenue:${festivalId}:${startDate.toISOString()}:${endDate.toISOString()}`;

    const cached = await this.cacheService.get<RevenueMetrics>(cacheKey);
    if (cached) return cached;

    const [
      ticketRevenue,
      cashlessRevenue,
      vendorRevenue,
      campingRevenue,
      refunds,
      platformFees,
    ] = await Promise.all([
      // Ticket revenue
      this.prisma.ticket.aggregate({
        where: {
          festivalId,
          status: { in: ['SOLD', 'USED'] },
          createdAt: { gte: startDate, lte: endDate },
        },
        _sum: { purchasePrice: true },
        _count: true,
      }),
      // Cashless revenue (topups)
      this.prisma.cashlessTransaction.aggregate({
        where: {
          festivalId,
          type: 'TOPUP',
          createdAt: { gte: startDate, lte: endDate },
        },
        _sum: { amount: true },
      }),
      // Vendor revenue
      this.prisma.vendorOrder.aggregate({
        where: {
          vendor: { festivalId },
          status: { in: ['DELIVERED', 'CONFIRMED', 'READY'] },
          createdAt: { gte: startDate, lte: endDate },
        },
        _sum: { totalAmount: true, commissionAmount: true },
      }),
      // Camping revenue
      this.prisma.campingReservation.aggregate({
        where: {
          spot: { zone: { festivalId } },
          status: 'CONFIRMED',
          createdAt: { gte: startDate, lte: endDate },
        },
        _sum: { totalPrice: true },
      }),
      // Refunds
      this.prisma.payment.aggregate({
        where: {
          festivalId,
          status: 'REFUNDED',
          updatedAt: { gte: startDate, lte: endDate },
        },
        _sum: { amount: true },
        _count: true,
      }),
      // Platform fees
      this.prisma.vendorOrder.aggregate({
        where: {
          vendor: { festivalId },
          status: { in: ['DELIVERED', 'CONFIRMED', 'READY'] },
          createdAt: { gte: startDate, lte: endDate },
        },
        _sum: { commissionAmount: true },
      }),
    ]);

    const ticketRev = this.decimalToNumber(ticketRevenue._sum.purchasePrice);
    const cashlessRev = this.decimalToNumber(cashlessRevenue._sum.amount);
    const vendorRev = this.decimalToNumber(vendorRevenue._sum.totalAmount);
    const campingRev = this.decimalToNumber(campingRevenue._sum.totalPrice);
    const refundAmount = this.decimalToNumber(refunds._sum.amount);
    const feesAmount = this.decimalToNumber(platformFees._sum.commissionAmount);

    const grossRevenue = ticketRev + cashlessRev + vendorRev + campingRev;
    const netRevenue = grossRevenue - refundAmount;

    const result: RevenueMetrics = {
      grossRevenue,
      netRevenue,
      refundedAmount: refundAmount,
      refundCount: refunds._count || 0,
      platformFees: feesAmount,
      breakdown: {
        tickets: {
          amount: ticketRev,
          percentage: grossRevenue > 0 ? (ticketRev / grossRevenue) * 100 : 0,
          count: ticketRevenue._count || 0,
        },
        cashless: {
          amount: cashlessRev,
          percentage: grossRevenue > 0 ? (cashlessRev / grossRevenue) * 100 : 0,
        },
        vendors: {
          amount: vendorRev,
          percentage: grossRevenue > 0 ? (vendorRev / grossRevenue) * 100 : 0,
          commission: this.decimalToNumber(vendorRevenue._sum.commissionAmount),
        },
        camping: {
          amount: campingRev,
          percentage: grossRevenue > 0 ? (campingRev / grossRevenue) * 100 : 0,
        },
      },
      averageRevenuePerAttendee: 0, // Will be calculated with attendance data
      profitMargin: grossRevenue > 0 ? ((netRevenue - feesAmount) / grossRevenue) * 100 : 0,
    };

    await this.cacheService.set(cacheKey, result, this.CACHE_TTL);
    return result;
  }

  /**
   * Get customer behavior metrics
   */
  async getCustomerMetrics(
    festivalId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<CustomerMetrics> {
    const cacheKey = `analytics:customers:${festivalId}:${startDate.toISOString()}:${endDate.toISOString()}`;

    const cached = await this.cacheService.get<CustomerMetrics>(cacheKey);
    if (cached) return cached;

    const [
      uniqueCustomers,
      repeatCustomers,
      ticketStats,
      cashlessStats,
      newCustomers,
    ] = await Promise.all([
      // Unique customers (bought tickets)
      this.prisma.ticket.findMany({
        where: {
          festivalId,
          status: { in: ['SOLD', 'USED'] },
          createdAt: { gte: startDate, lte: endDate },
        },
        select: { userId: true },
        distinct: ['userId'],
      }),
      // Repeat customers (bought multiple tickets or attended previous festivals)
      this.prisma.ticket.groupBy({
        by: ['userId'],
        where: {
          festivalId,
          status: { in: ['SOLD', 'USED'] },
          createdAt: { gte: startDate, lte: endDate },
        },
        _count: true,
        having: {
          userId: {
            _count: {
              gt: 1,
            },
          },
        },
      }),
      // Ticket purchase stats
      this.prisma.ticket.aggregate({
        where: {
          festivalId,
          status: { in: ['SOLD', 'USED'] },
          createdAt: { gte: startDate, lte: endDate },
        },
        _sum: { purchasePrice: true },
        _count: true,
      }),
      // Cashless spending per user
      this.prisma.cashlessTransaction.groupBy({
        by: ['accountId'],
        where: {
          festivalId,
          type: 'PAYMENT',
          createdAt: { gte: startDate, lte: endDate },
        },
        _sum: { amount: true },
        _count: true,
      }),
      // New customers (first time buying)
      this.getNewCustomerCount(festivalId, startDate, endDate),
    ]);

    const totalCustomers = uniqueCustomers.length;
    const totalRevenue = this.decimalToNumber(ticketStats._sum.purchasePrice);

    // Calculate average spending per customer
    const avgCashlessSpending = cashlessStats.length > 0
      ? cashlessStats.reduce((sum, cs) => sum + this.decimalToNumber(cs._sum.amount), 0) / cashlessStats.length
      : 0;

    const result: CustomerMetrics = {
      totalUniqueCustomers: totalCustomers,
      newCustomers,
      returningCustomers: totalCustomers - newCustomers,
      repeatPurchaseRate: totalCustomers > 0 ? (repeatCustomers.length / totalCustomers) * 100 : 0,
      averageSpendingPerCustomer: totalCustomers > 0 ? totalRevenue / totalCustomers : 0,
      averageTicketsPerCustomer: totalCustomers > 0 ? (ticketStats._count || 0) / totalCustomers : 0,
      averageCashlessSpending: avgCashlessSpending,
      customerLifetimeValue: this.calculateCLV(totalRevenue, totalCustomers, repeatCustomers.length),
      segmentation: {
        vip: await this.getCustomerSegmentCount(festivalId, 'VIP', startDate, endDate),
        standard: await this.getCustomerSegmentCount(festivalId, 'STANDARD', startDate, endDate),
        earlyBird: await this.getCustomerSegmentCount(festivalId, 'EARLY_BIRD', startDate, endDate),
      },
      acquisitionChannels: await this.getAcquisitionChannels(festivalId, startDate, endDate),
    };

    await this.cacheService.set(cacheKey, result, this.CACHE_TTL);
    return result;
  }

  /**
   * Get performance and operational metrics
   */
  async getPerformanceMetrics(
    festivalId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<PerformanceMetrics> {
    const cacheKey = `analytics:performance:${festivalId}:${startDate.toISOString()}:${endDate.toISOString()}`;

    const cached = await this.cacheService.get<PerformanceMetrics>(cacheKey);
    if (cached) return cached;

    const [
      ticketScans,
      vendorOrders,
      cashlessTransactions,
      supportTickets,
      queueTimes,
    ] = await Promise.all([
      // Average scan time per ticket
      this.prisma.zoneAccessLog.aggregate({
        where: {
          zone: { festivalId },
          timestamp: { gte: startDate, lte: endDate },
        },
        _count: true,
      }),
      // Order fulfillment times
      this.prisma.vendorOrder.findMany({
        where: {
          vendor: { festivalId },
          status: 'DELIVERED',
          createdAt: { gte: startDate, lte: endDate },
        },
        select: {
          createdAt: true,
          updatedAt: true,
        },
      }),
      // Cashless transaction success rate
      this.prisma.cashlessTransaction.groupBy({
        by: ['type'],
        where: {
          festivalId,
          createdAt: { gte: startDate, lte: endDate },
        },
        _count: true,
      }),
      // Support ticket resolution
      this.prisma.supportTicket.findMany({
        where: {
          festivalId,
          createdAt: { gte: startDate, lte: endDate },
        },
        select: {
          status: true,
          priority: true,
          createdAt: true,
          updatedAt: true,
        },
      }),
      // Estimate queue times based on zone entries
      this.estimateQueueTimes(festivalId, startDate, endDate),
    ]);

    // Calculate average order fulfillment time
    const fulfillmentTimes = vendorOrders.map(o =>
      o.updatedAt.getTime() - o.createdAt.getTime()
    );
    const avgFulfillmentTime = fulfillmentTimes.length > 0
      ? fulfillmentTimes.reduce((a, b) => a + b, 0) / fulfillmentTimes.length / 60000 // Convert to minutes
      : 0;

    // Calculate support ticket metrics
    const resolvedTickets = supportTickets.filter(t => t.status === 'RESOLVED' || t.status === 'CLOSED');
    const avgResolutionTime = resolvedTickets.length > 0
      ? resolvedTickets.reduce((sum, t) => sum + (t.updatedAt.getTime() - t.createdAt.getTime()), 0) / resolvedTickets.length / 3600000 // Hours
      : 0;

    const result: PerformanceMetrics = {
      ticketScanThroughput: ticketScans._count || 0,
      averageOrderFulfillmentTime: avgFulfillmentTime,
      cashlessSuccessRate: this.calculateSuccessRate(cashlessTransactions),
      supportTicketResolutionTime: avgResolutionTime,
      supportTicketsByPriority: {
        HIGH: supportTickets.filter(t => t.priority === 'HIGH').length,
        MEDIUM: supportTickets.filter(t => t.priority === 'MEDIUM').length,
        LOW: supportTickets.filter(t => t.priority === 'LOW').length,
      },
      averageQueueTime: queueTimes.average,
      peakQueueTime: queueTimes.peak,
      systemUptime: 99.9, // Would come from monitoring system
      errorRate: 0.1, // Would come from logging system
    };

    await this.cacheService.set(cacheKey, result, this.CACHE_TTL);
    return result;
  }

  /**
   * Get fraud detection metrics
   */
  async getFraudMetrics(
    festivalId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<FraudMetrics> {
    const cacheKey = `analytics:fraud:${festivalId}:${startDate.toISOString()}:${endDate.toISOString()}`;

    const cached = await this.cacheService.get<FraudMetrics>(cacheKey);
    if (cached) return cached;

    const [
      duplicateScans,
      suspiciousTransactions,
      chargebacks,
      blockedUsers,
    ] = await Promise.all([
      // Duplicate ticket scan attempts
      this.prisma.zoneAccessLog.groupBy({
        by: ['ticketId'],
        where: {
          zone: { festivalId },
          action: 'ENTRY',
          timestamp: { gte: startDate, lte: endDate },
        },
        _count: true,
        having: {
          ticketId: {
            _count: {
              gt: 1,
            },
          },
        },
      }),
      // Suspicious cashless transactions (high velocity or unusual amounts)
      this.detectSuspiciousTransactions(festivalId, startDate, endDate),
      // Chargebacks
      this.prisma.payment.count({
        where: {
          festivalId,
          status: 'REFUNDED',
          metadata: {
            path: ['reason'],
            equals: 'chargeback',
          },
        },
      }),
      // Blocked users
      this.prisma.user.count({
        where: {
          status: 'BANNED',
          tickets: {
            some: { festivalId },
          },
        },
      }),
    ]);

    const result: FraudMetrics = {
      duplicateScanAttempts: duplicateScans.length,
      suspiciousTransactions: suspiciousTransactions.count,
      suspiciousTransactionAmount: suspiciousTransactions.totalAmount,
      chargebackCount: chargebacks,
      chargebackRate: 0, // Would need total successful payments
      blockedUsers,
      riskScore: this.calculateRiskScore(duplicateScans.length, suspiciousTransactions.count, chargebacks),
      fraudIndicators: await this.getFraudIndicators(festivalId, startDate, endDate),
    };

    await this.cacheService.set(cacheKey, result, this.CACHE_TTL);
    return result;
  }

  /**
   * Get growth and trend metrics
   */
  async getGrowthMetrics(
    festivalId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<GrowthMetrics> {
    const cacheKey = `analytics:growth:${festivalId}:${startDate.toISOString()}:${endDate.toISOString()}`;

    const cached = await this.cacheService.get<GrowthMetrics>(cacheKey);
    if (cached) return cached;

    const periodDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    const previousStart = new Date(startDate.getTime() - periodDays * 24 * 60 * 60 * 1000);
    const previousEnd = new Date(startDate.getTime() - 1);

    const [currentSales, previousSales, currentRevenue, previousRevenue] = await Promise.all([
      this.prisma.ticket.count({
        where: {
          festivalId,
          status: { in: ['SOLD', 'USED'] },
          createdAt: { gte: startDate, lte: endDate },
        },
      }),
      this.prisma.ticket.count({
        where: {
          festivalId,
          status: { in: ['SOLD', 'USED'] },
          createdAt: { gte: previousStart, lte: previousEnd },
        },
      }),
      this.prisma.ticket.aggregate({
        where: {
          festivalId,
          status: { in: ['SOLD', 'USED'] },
          createdAt: { gte: startDate, lte: endDate },
        },
        _sum: { purchasePrice: true },
      }),
      this.prisma.ticket.aggregate({
        where: {
          festivalId,
          status: { in: ['SOLD', 'USED'] },
          createdAt: { gte: previousStart, lte: previousEnd },
        },
        _sum: { purchasePrice: true },
      }),
    ]);

    const currRev = this.decimalToNumber(currentRevenue._sum.purchasePrice);
    const prevRev = this.decimalToNumber(previousRevenue._sum.purchasePrice);

    const result: GrowthMetrics = {
      salesGrowth: previousSales > 0 ? ((currentSales - previousSales) / previousSales) * 100 : 0,
      revenueGrowth: prevRev > 0 ? ((currRev - prevRev) / prevRev) * 100 : 0,
      customerGrowth: await this.calculateCustomerGrowth(festivalId, startDate, endDate, previousStart, previousEnd),
      dailyGrowthRate: await this.getDailyGrowthRates(festivalId, startDate, endDate),
      weeklyTrends: await this.getWeeklyTrends(festivalId, startDate, endDate),
      projectedRevenue: this.projectRevenue(currRev, periodDays),
      projectedAttendance: this.projectAttendance(currentSales, periodDays),
    };

    await this.cacheService.set(cacheKey, result, this.CACHE_TTL);
    return result;
  }

  /**
   * Get forecast metrics using simple prediction models
   */
  async getForecastMetrics(
    festivalId: string,
    daysAhead: number = 7,
  ): Promise<ForecastMetrics> {
    const cacheKey = `analytics:forecast:${festivalId}:${daysAhead}`;

    const cached = await this.cacheService.get<ForecastMetrics>(cacheKey);
    if (cached) return cached;

    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    // Get historical data for predictions
    const [dailySales, dailyRevenue, dailyAttendance] = await Promise.all([
      this.getDailySalesHistory(festivalId, thirtyDaysAgo, now),
      this.getDailyRevenueHistory(festivalId, thirtyDaysAgo, now),
      this.getDailyAttendanceHistory(festivalId, thirtyDaysAgo, now),
    ]);

    const result: ForecastMetrics = {
      predictedSales: this.linearRegression(dailySales, daysAhead),
      predictedRevenue: this.linearRegression(dailyRevenue, daysAhead),
      predictedAttendance: this.linearRegression(dailyAttendance, daysAhead),
      confidenceLevel: this.calculateConfidenceLevel(dailySales),
      peakDayPrediction: this.predictPeakDay(dailySales, daysAhead),
      demandForecast: await this.getDemandForecast(festivalId, daysAhead),
      staffingRecommendation: this.calculateStaffingNeeds(dailyAttendance, daysAhead),
    };

    await this.cacheService.set(cacheKey, result, this.CACHE_TTL);
    return result;
  }

  /**
   * Get staff performance metrics
   */
  async getStaffMetrics(
    festivalId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<StaffMetrics> {
    const cacheKey = `analytics:staff:${festivalId}:${startDate.toISOString()}:${endDate.toISOString()}`;

    const cached = await this.cacheService.get<StaffMetrics>(cacheKey);
    if (cached) return cached;

    const [staffMembers, shifts, attendanceLogs] = await Promise.all([
      this.prisma.staffMember.findMany({
        where: { festivalId },
        include: {
          shifts: {
            where: {
              startTime: { gte: startDate },
              endTime: { lte: endDate },
            },
          },
        },
      }),
      this.prisma.staffShift.findMany({
        where: {
          member: { festivalId },
          startTime: { gte: startDate },
          endTime: { lte: endDate },
        },
      }),
      this.prisma.staffShift.findMany({
        where: {
          member: { festivalId },
          actualStartTime: { not: null },
          startTime: { gte: startDate },
          endTime: { lte: endDate },
        },
      }),
    ]);

    const totalScheduledHours = shifts.reduce((sum, s) =>
      sum + (s.endTime.getTime() - s.startTime.getTime()) / 3600000, 0
    );

    const totalWorkedHours = attendanceLogs.reduce((sum, s) => {
      if (s.actualStartTime && s.actualEndTime) {
        return sum + (s.actualEndTime.getTime() - s.actualStartTime.getTime()) / 3600000;
      }
      return sum;
    }, 0);

    const result: StaffMetrics = {
      totalStaff: staffMembers.length,
      activeStaff: staffMembers.filter(s => s.isActive).length,
      totalScheduledHours,
      totalWorkedHours,
      attendanceRate: totalScheduledHours > 0 ? (totalWorkedHours / totalScheduledHours) * 100 : 0,
      averageHoursPerStaff: staffMembers.length > 0 ? totalWorkedHours / staffMembers.length : 0,
      overtimeHours: Math.max(0, totalWorkedHours - totalScheduledHours),
      staffByRole: await this.getStaffByRole(festivalId),
      performanceByZone: await this.getStaffPerformanceByZone(festivalId, startDate, endDate),
    };

    await this.cacheService.set(cacheKey, result, this.CACHE_TTL);
    return result;
  }

  /**
   * Get environmental/sustainability metrics
   */
  async getEnvironmentalMetrics(
    festivalId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<EnvironmentalMetrics> {
    const cacheKey = `analytics:environmental:${festivalId}:${startDate.toISOString()}:${endDate.toISOString()}`;

    const cached = await this.cacheService.get<EnvironmentalMetrics>(cacheKey);
    if (cached) return cached;

    const [
      attendeeCount,
      digitalTickets,
      paperTickets,
      vendorOrders,
    ] = await Promise.all([
      this.prisma.ticket.count({
        where: {
          festivalId,
          status: 'USED',
          createdAt: { gte: startDate, lte: endDate },
        },
      }),
      this.prisma.ticket.count({
        where: {
          festivalId,
          status: { in: ['SOLD', 'USED'] },
          deliveryMethod: 'DIGITAL',
          createdAt: { gte: startDate, lte: endDate },
        },
      }),
      this.prisma.ticket.count({
        where: {
          festivalId,
          status: { in: ['SOLD', 'USED'] },
          deliveryMethod: 'PRINT',
          createdAt: { gte: startDate, lte: endDate },
        },
      }),
      this.prisma.vendorOrder.count({
        where: {
          vendor: { festivalId },
          status: { in: ['DELIVERED', 'CONFIRMED', 'READY'] },
          createdAt: { gte: startDate, lte: endDate },
        },
      }),
    ]);

    // Estimate carbon footprint (simplified model)
    const estimatedCarbonPerAttendee = 15; // kg CO2 (transport, food, etc)
    const paperSaved = digitalTickets * 0.01; // kg of paper per ticket

    const result: EnvironmentalMetrics = {
      estimatedCarbonFootprint: attendeeCount * estimatedCarbonPerAttendee,
      carbonPerAttendee: estimatedCarbonPerAttendee,
      digitalTicketRate: (digitalTickets + paperTickets) > 0
        ? (digitalTickets / (digitalTickets + paperTickets)) * 100
        : 0,
      paperSaved,
      cashlessRate: 95, // Assumed high since cashless is primary payment
      wasteEstimate: attendeeCount * 0.5, // kg per person estimate
      sustainabilityScore: this.calculateSustainabilityScore(digitalTickets, paperTickets, attendeeCount),
    };

    await this.cacheService.set(cacheKey, result, this.CACHE_TTL);
    return result;
  }

  /**
   * Get security metrics
   */
  async getSecurityMetrics(
    festivalId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<SecurityMetrics> {
    const cacheKey = `analytics:security:${festivalId}:${startDate.toISOString()}:${endDate.toISOString()}`;

    const cached = await this.cacheService.get<SecurityMetrics>(cacheKey);
    if (cached) return cached;

    const [
      accessDenials,
      incidents,
      evacuationDrills,
      securityStaff,
    ] = await Promise.all([
      // Access denials
      this.prisma.zoneAccessLog.count({
        where: {
          zone: { festivalId },
          action: 'DENIED',
          timestamp: { gte: startDate, lte: endDate },
        },
      }),
      // Security incidents (from support tickets with security tag)
      this.prisma.supportTicket.count({
        where: {
          festivalId,
          category: 'SECURITY',
          createdAt: { gte: startDate, lte: endDate },
        },
      }),
      // Evacuation drills (would be logged separately)
      Promise.resolve(0),
      // Security staff count
      this.prisma.staffMember.count({
        where: {
          festivalId,
          role: 'SECURITY',
          isActive: true,
        },
      }),
    ]);

    const attendeeCount = await this.prisma.festival.findUnique({
      where: { id: festivalId },
      select: { currentAttendees: true },
    });

    const result: SecurityMetrics = {
      totalAccessDenials: accessDenials,
      securityIncidents: incidents,
      incidentResponseTime: 5, // Would need actual logging
      evacuationDrillCount: evacuationDrills,
      securityStaffCount: securityStaff,
      securityToAttendeeRatio: (attendeeCount?.currentAttendees || 1) / Math.max(1, securityStaff),
      zoneViolations: accessDenials, // Simplified
      emergencyResponseReadiness: 95, // Would need actual assessment
    };

    await this.cacheService.set(cacheKey, result, this.CACHE_TTL);
    return result;
  }

  /**
   * Get comprehensive analytics combining all metrics
   */
  async getComprehensiveAnalytics(
    festivalId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<ComprehensiveAnalytics> {
    const [
      revenue,
      customers,
      performance,
      fraud,
      growth,
      staff,
      environmental,
      security,
    ] = await Promise.all([
      this.getRevenueMetrics(festivalId, startDate, endDate),
      this.getCustomerMetrics(festivalId, startDate, endDate),
      this.getPerformanceMetrics(festivalId, startDate, endDate),
      this.getFraudMetrics(festivalId, startDate, endDate),
      this.getGrowthMetrics(festivalId, startDate, endDate),
      this.getStaffMetrics(festivalId, startDate, endDate),
      this.getEnvironmentalMetrics(festivalId, startDate, endDate),
      this.getSecurityMetrics(festivalId, startDate, endDate),
    ]);

    return {
      festivalId,
      generatedAt: new Date(),
      period: { startDate, endDate },
      revenue,
      customers,
      performance,
      fraud,
      growth,
      staff,
      environmental,
      security,
    };
  }

  // Helper methods

  private async getNewCustomerCount(
    festivalId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<number> {
    // Users whose first ticket purchase was in this period
    const firstPurchases = await this.prisma.ticket.groupBy({
      by: ['userId'],
      where: {
        festivalId,
        status: { in: ['SOLD', 'USED'] },
      },
      _min: { createdAt: true },
    });

    return firstPurchases.filter(p =>
      p._min.createdAt &&
      p._min.createdAt >= startDate &&
      p._min.createdAt <= endDate
    ).length;
  }

  private async getCustomerSegmentCount(
    festivalId: string,
    ticketType: string,
    startDate: Date,
    endDate: Date,
  ): Promise<number> {
    return this.prisma.ticket.count({
      where: {
        festivalId,
        status: { in: ['SOLD', 'USED'] },
        category: { type: ticketType },
        createdAt: { gte: startDate, lte: endDate },
      },
    });
  }

  private async getAcquisitionChannels(
    festivalId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<{ channel: string; count: number; percentage: number }[]> {
    // This would typically come from tracking data
    // Simplified implementation
    const total = await this.prisma.ticket.count({
      where: {
        festivalId,
        status: { in: ['SOLD', 'USED'] },
        createdAt: { gte: startDate, lte: endDate },
      },
    });

    return [
      { channel: 'direct', count: Math.floor(total * 0.4), percentage: 40 },
      { channel: 'social', count: Math.floor(total * 0.3), percentage: 30 },
      { channel: 'email', count: Math.floor(total * 0.2), percentage: 20 },
      { channel: 'referral', count: Math.floor(total * 0.1), percentage: 10 },
    ];
  }

  private calculateCLV(totalRevenue: number, totalCustomers: number, repeatCustomers: number): number {
    if (totalCustomers === 0) return 0;
    const avgRevenue = totalRevenue / totalCustomers;
    const repeatRate = repeatCustomers / totalCustomers;
    // Simple CLV = Average Revenue * (1 + Repeat Rate) * 2 (assumed lifespan multiplier)
    return avgRevenue * (1 + repeatRate) * 2;
  }

  private calculateSuccessRate(transactions: { type: string; _count: number }[]): number {
    // Assume all recorded transactions are successful
    // In production, would track failed attempts separately
    return 99.5;
  }

  private async estimateQueueTimes(
    festivalId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<{ average: number; peak: number }> {
    // Estimate based on entry volume
    const entries = await this.prisma.zoneAccessLog.groupBy({
      by: ['timestamp'],
      where: {
        zone: { festivalId },
        action: 'ENTRY',
        timestamp: { gte: startDate, lte: endDate },
      },
      _count: true,
    });

    // Calculate estimated wait times based on throughput
    const hourlyVolumes = new Map<number, number>();
    entries.forEach(e => {
      const hour = e.timestamp.getHours();
      hourlyVolumes.set(hour, (hourlyVolumes.get(hour) || 0) + e._count);
    });

    const volumes = Array.from(hourlyVolumes.values());
    const avgVolume = volumes.length > 0 ? volumes.reduce((a, b) => a + b) / volumes.length : 0;
    const maxVolume = volumes.length > 0 ? Math.max(...volumes) : 0;

    // Estimate: 1 minute per 100 people throughput
    return {
      average: avgVolume / 100,
      peak: maxVolume / 100,
    };
  }

  private async detectSuspiciousTransactions(
    festivalId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<{ count: number; totalAmount: number }> {
    // Detect high-velocity transactions from same account
    const highVelocity = await this.prisma.cashlessTransaction.groupBy({
      by: ['accountId'],
      where: {
        festivalId,
        createdAt: { gte: startDate, lte: endDate },
      },
      _count: true,
      _sum: { amount: true },
      having: {
        accountId: {
          _count: {
            gt: 50, // More than 50 transactions per account is suspicious
          },
        },
      },
    });

    return {
      count: highVelocity.length,
      totalAmount: highVelocity.reduce((sum, h) => sum + this.decimalToNumber(h._sum.amount), 0),
    };
  }

  private calculateRiskScore(duplicates: number, suspicious: number, chargebacks: number): number {
    // Simple risk score 0-100
    let score = 0;
    score += Math.min(duplicates * 2, 30);
    score += Math.min(suspicious * 5, 40);
    score += Math.min(chargebacks * 10, 30);
    return Math.min(score, 100);
  }

  private async getFraudIndicators(
    festivalId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<string[]> {
    const indicators: string[] = [];

    // Check for patterns
    const duplicates = await this.prisma.zoneAccessLog.groupBy({
      by: ['ticketId'],
      where: {
        zone: { festivalId },
        action: 'ENTRY',
        timestamp: { gte: startDate, lte: endDate },
      },
      _count: true,
      having: {
        ticketId: { _count: { gt: 3 } },
      },
    });

    if (duplicates.length > 0) {
      indicators.push(`${duplicates.length} tickets with multiple entry attempts`);
    }

    return indicators;
  }

  private async calculateCustomerGrowth(
    festivalId: string,
    currentStart: Date,
    currentEnd: Date,
    previousStart: Date,
    previousEnd: Date,
  ): Promise<number> {
    const [current, previous] = await Promise.all([
      this.prisma.ticket.findMany({
        where: { festivalId, createdAt: { gte: currentStart, lte: currentEnd } },
        select: { userId: true },
        distinct: ['userId'],
      }),
      this.prisma.ticket.findMany({
        where: { festivalId, createdAt: { gte: previousStart, lte: previousEnd } },
        select: { userId: true },
        distinct: ['userId'],
      }),
    ]);

    return previous.length > 0 ? ((current.length - previous.length) / previous.length) * 100 : 0;
  }

  private async getDailyGrowthRates(
    festivalId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<{ date: Date; growthRate: number }[]> {
    const dailySales = await this.prisma.ticket.groupBy({
      by: ['createdAt'],
      where: {
        festivalId,
        status: { in: ['SOLD', 'USED'] },
        createdAt: { gte: startDate, lte: endDate },
      },
      _count: true,
    });

    // Group by day and calculate growth
    const byDay = new Map<string, number>();
    dailySales.forEach(s => {
      const day = s.createdAt.toISOString().split('T')[0];
      byDay.set(day, (byDay.get(day) || 0) + s._count);
    });

    const days = Array.from(byDay.entries()).sort((a, b) => a[0].localeCompare(b[0]));
    const result: { date: Date; growthRate: number }[] = [];

    for (let i = 1; i < days.length; i++) {
      const prev = days[i - 1][1];
      const curr = days[i][1];
      result.push({
        date: new Date(days[i][0]),
        growthRate: prev > 0 ? ((curr - prev) / prev) * 100 : 0,
      });
    }

    return result;
  }

  private async getWeeklyTrends(
    festivalId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<{ week: number; sales: number; revenue: number }[]> {
    const tickets = await this.prisma.ticket.findMany({
      where: {
        festivalId,
        status: { in: ['SOLD', 'USED'] },
        createdAt: { gte: startDate, lte: endDate },
      },
      select: { createdAt: true, purchasePrice: true },
    });

    const weeklyData = new Map<number, { sales: number; revenue: number }>();
    tickets.forEach(t => {
      const week = this.getWeekNumber(t.createdAt);
      const current = weeklyData.get(week) || { sales: 0, revenue: 0 };
      current.sales += 1;
      current.revenue += this.decimalToNumber(t.purchasePrice);
      weeklyData.set(week, current);
    });

    return Array.from(weeklyData.entries())
      .map(([week, data]) => ({ week, ...data }))
      .sort((a, b) => a.week - b.week);
  }

  private getWeekNumber(date: Date): number {
    const oneJan = new Date(date.getFullYear(), 0, 1);
    return Math.ceil((((date.getTime() - oneJan.getTime()) / 86400000) + oneJan.getDay() + 1) / 7);
  }

  private projectRevenue(currentRevenue: number, periodDays: number): number {
    // Simple linear projection
    const daysRemaining = 30 - periodDays; // Assume 30-day festival window
    const dailyRate = currentRevenue / Math.max(1, periodDays);
    return currentRevenue + (dailyRate * daysRemaining);
  }

  private projectAttendance(currentSales: number, periodDays: number): number {
    const daysRemaining = 30 - periodDays;
    const dailyRate = currentSales / Math.max(1, periodDays);
    return currentSales + (dailyRate * daysRemaining);
  }

  private async getDailySalesHistory(
    festivalId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<number[]> {
    const sales = await this.prisma.ticket.groupBy({
      by: ['createdAt'],
      where: {
        festivalId,
        status: { in: ['SOLD', 'USED'] },
        createdAt: { gte: startDate, lte: endDate },
      },
      _count: true,
    });

    const byDay = new Map<string, number>();
    sales.forEach(s => {
      const day = s.createdAt.toISOString().split('T')[0];
      byDay.set(day, (byDay.get(day) || 0) + s._count);
    });

    return Array.from(byDay.values());
  }

  private async getDailyRevenueHistory(
    festivalId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<number[]> {
    const tickets = await this.prisma.ticket.findMany({
      where: {
        festivalId,
        status: { in: ['SOLD', 'USED'] },
        createdAt: { gte: startDate, lte: endDate },
      },
      select: { createdAt: true, purchasePrice: true },
    });

    const byDay = new Map<string, number>();
    tickets.forEach(t => {
      const day = t.createdAt.toISOString().split('T')[0];
      byDay.set(day, (byDay.get(day) || 0) + this.decimalToNumber(t.purchasePrice));
    });

    return Array.from(byDay.values());
  }

  private async getDailyAttendanceHistory(
    festivalId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<number[]> {
    const entries = await this.prisma.zoneAccessLog.groupBy({
      by: ['timestamp'],
      where: {
        zone: { festivalId },
        action: 'ENTRY',
        timestamp: { gte: startDate, lte: endDate },
      },
      _count: true,
    });

    const byDay = new Map<string, number>();
    entries.forEach(e => {
      const day = e.timestamp.toISOString().split('T')[0];
      byDay.set(day, (byDay.get(day) || 0) + e._count);
    });

    return Array.from(byDay.values());
  }

  private linearRegression(data: number[], daysAhead: number): number[] {
    if (data.length < 2) return Array(daysAhead).fill(data[0] || 0);

    const n = data.length;
    let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;

    for (let i = 0; i < n; i++) {
      sumX += i;
      sumY += data[i];
      sumXY += i * data[i];
      sumX2 += i * i;
    }

    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;

    const predictions: number[] = [];
    for (let i = 0; i < daysAhead; i++) {
      predictions.push(Math.max(0, slope * (n + i) + intercept));
    }

    return predictions;
  }

  private calculateConfidenceLevel(data: number[]): number {
    if (data.length < 3) return 50;

    // Calculate variance
    const mean = data.reduce((a, b) => a + b, 0) / data.length;
    const variance = data.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / data.length;
    const coefficientOfVariation = Math.sqrt(variance) / mean;

    // Lower CV = higher confidence
    return Math.max(0, Math.min(100, 100 - coefficientOfVariation * 100));
  }

  private predictPeakDay(data: number[], daysAhead: number): Date {
    const predictions = this.linearRegression(data, daysAhead);
    const maxIndex = predictions.indexOf(Math.max(...predictions));
    const peakDate = new Date();
    peakDate.setDate(peakDate.getDate() + maxIndex);
    return peakDate;
  }

  private async getDemandForecast(
    festivalId: string,
    daysAhead: number,
  ): Promise<{ date: Date; predictedDemand: number; confidence: number }[]> {
    const history = await this.getDailySalesHistory(
      festivalId,
      new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      new Date(),
    );

    const predictions = this.linearRegression(history, daysAhead);
    const confidence = this.calculateConfidenceLevel(history);

    return predictions.map((p, i) => {
      const date = new Date();
      date.setDate(date.getDate() + i + 1);
      return {
        date,
        predictedDemand: Math.round(p),
        confidence: confidence - i * 2, // Confidence decreases with time
      };
    });
  }

  private calculateStaffingNeeds(
    attendanceHistory: number[],
    daysAhead: number,
  ): { date: Date; recommendedStaff: number }[] {
    const predictions = this.linearRegression(attendanceHistory, daysAhead);

    // Rule of thumb: 1 staff per 100 attendees
    return predictions.map((p, i) => {
      const date = new Date();
      date.setDate(date.getDate() + i + 1);
      return {
        date,
        recommendedStaff: Math.ceil(p / 100),
      };
    });
  }

  private async getStaffByRole(festivalId: string): Promise<{ role: string; count: number }[]> {
    const staff = await this.prisma.staffMember.groupBy({
      by: ['role'],
      where: { festivalId, isActive: true },
      _count: true,
    });

    return staff.map(s => ({
      role: s.role,
      count: s._count,
    }));
  }

  private async getStaffPerformanceByZone(
    festivalId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<{ zoneName: string; staffCount: number; avgHoursWorked: number }[]> {
    const zones = await this.prisma.zone.findMany({
      where: { festivalId },
      include: {
        staffShifts: {
          where: {
            startTime: { gte: startDate },
            endTime: { lte: endDate },
          },
          include: { member: true },
        },
      },
    });

    return zones.map(z => {
      const uniqueStaff = new Set(z.staffShifts.map(s => s.memberId));
      const totalHours = z.staffShifts.reduce((sum, s) =>
        sum + (s.endTime.getTime() - s.startTime.getTime()) / 3600000, 0
      );

      return {
        zoneName: z.name,
        staffCount: uniqueStaff.size,
        avgHoursWorked: uniqueStaff.size > 0 ? totalHours / uniqueStaff.size : 0,
      };
    });
  }

  private calculateSustainabilityScore(
    digitalTickets: number,
    paperTickets: number,
    attendees: number,
  ): number {
    let score = 50; // Base score

    // Digital ticket bonus
    const digitalRate = (digitalTickets + paperTickets) > 0
      ? digitalTickets / (digitalTickets + paperTickets)
      : 0;
    score += digitalRate * 30;

    // Cashless bonus (assumed 95%)
    score += 15;

    // Scale for attendee count (larger events have more impact potential)
    if (attendees > 10000) score += 5;

    return Math.min(100, Math.round(score));
  }
}
