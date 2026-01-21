import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TicketStatus, PaymentStatus, FestivalStatus, Prisma } from '@prisma/client';

/**
 * Platform statistics response
 */
export interface PlatformStats {
  totalFestivals: number;
  totalArtists: number;
  totalUsers: number;
  totalTicketsSold: number;
  totalRevenue: number;
  activeFestivals: number;
}

/**
 * Admin dashboard statistics response
 */
export interface DashboardStats extends PlatformStats {
  totalPayments: number;
  pendingPayments: number;
  completedPayments: number;
  refundedPayments: number;
  totalVendors: number;
  activeVendors: number;
  totalStaffMembers: number;
  totalZones: number;
  averageTicketPrice: number;
  festivalsByStatus: Record<string, number>;
  revenueByMonth: { month: string; revenue: number }[];
  ticketsSoldByMonth: { month: string; count: number }[];
}

@Injectable()
export class StatsService {
  private readonly logger = new Logger(StatsService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Get public platform statistics
   */
  async getPlatformStats(): Promise<PlatformStats> {
    this.logger.debug('Fetching platform statistics');

    const [
      totalFestivals,
      totalArtists,
      totalUsers,
      totalTicketsSold,
      totalRevenueResult,
      activeFestivals,
    ] = await Promise.all([
      // Count all festivals (excluding deleted)
      this.prisma.festival.count({
        where: { isDeleted: false },
      }),
      // Count all artists (excluding deleted)
      this.prisma.artist.count({
        where: { isDeleted: false },
      }),
      // Count all users (excluding deleted)
      this.prisma.user.count({
        where: { isDeleted: false },
      }),
      // Count valid/used tickets (sold tickets)
      this.prisma.ticket.count({
        where: {
          status: {
            in: [TicketStatus.SOLD, TicketStatus.USED],
          },
          isDeleted: false,
        },
      }),
      // Sum of completed payments
      this.prisma.payment.aggregate({
        _sum: {
          amount: true,
        },
        where: {
          status: PaymentStatus.COMPLETED,
          isDeleted: false,
        },
      }),
      // Count active festivals (PUBLISHED or ONGOING)
      this.prisma.festival.count({
        where: {
          status: {
            in: [FestivalStatus.PUBLISHED, FestivalStatus.ONGOING],
          },
          isDeleted: false,
        },
      }),
    ]);

    const totalRevenue = totalRevenueResult._sum.amount
      ? Number(totalRevenueResult._sum.amount)
      : 0;

    return {
      totalFestivals,
      totalArtists,
      totalUsers,
      totalTicketsSold,
      totalRevenue,
      activeFestivals,
    };
  }

  /**
   * Get detailed admin dashboard statistics
   */
  async getDashboardStats(): Promise<DashboardStats> {
    this.logger.debug('Fetching admin dashboard statistics');

    // Get platform stats as base
    const platformStats = await this.getPlatformStats();

    // Get additional admin statistics
    const [
      totalPayments,
      pendingPayments,
      completedPayments,
      refundedPayments,
      totalVendors,
      activeVendors,
      totalStaffMembers,
      totalZones,
      averageTicketPriceResult,
      festivalStatusCounts,
      revenueByMonth,
      ticketsSoldByMonth,
    ] = await Promise.all([
      // Total payments
      this.prisma.payment.count({
        where: { isDeleted: false },
      }),
      // Pending payments
      this.prisma.payment.count({
        where: { status: PaymentStatus.PENDING, isDeleted: false },
      }),
      // Completed payments
      this.prisma.payment.count({
        where: { status: PaymentStatus.COMPLETED, isDeleted: false },
      }),
      // Refunded payments
      this.prisma.payment.count({
        where: { status: PaymentStatus.REFUNDED, isDeleted: false },
      }),
      // Total vendors
      this.prisma.vendor.count({
        where: { isDeleted: false },
      }),
      // Active vendors
      this.prisma.vendor.count({
        where: { isActive: true, isDeleted: false },
      }),
      // Total staff members
      this.prisma.staffMember.count({
        where: { isActive: true },
      }),
      // Total zones
      this.prisma.zone.count({
        where: { isActive: true },
      }),
      // Average ticket price
      this.prisma.ticket.aggregate({
        _avg: {
          purchasePrice: true,
        },
        where: {
          isDeleted: false,
        },
      }),
      // Festival status counts
      this.prisma.festival.groupBy({
        by: ['status'],
        _count: true,
        where: { isDeleted: false },
      }),
      // Revenue by month (last 12 months)
      this.getRevenueByMonth(),
      // Tickets sold by month (last 12 months)
      this.getTicketsSoldByMonth(),
    ]);

    const averageTicketPrice = averageTicketPriceResult._avg.purchasePrice
      ? Number(averageTicketPriceResult._avg.purchasePrice)
      : 0;

    // Transform festival status counts to record
    const festivalsByStatus: Record<string, number> = {};
    for (const item of festivalStatusCounts) {
      festivalsByStatus[item.status] = item._count;
    }

    return {
      ...platformStats,
      totalPayments,
      pendingPayments,
      completedPayments,
      refundedPayments,
      totalVendors,
      activeVendors,
      totalStaffMembers,
      totalZones,
      averageTicketPrice,
      festivalsByStatus,
      revenueByMonth,
      ticketsSoldByMonth,
    };
  }

  /**
   * Get revenue aggregated by month for the last 12 months
   */
  private async getRevenueByMonth(): Promise<{ month: string; revenue: number }[]> {
    const twelveMonthsAgo = new Date();
    twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);

    const result = await this.prisma.$queryRaw<{ month: string; revenue: Prisma.Decimal }[]>`
      SELECT
        TO_CHAR(DATE_TRUNC('month', "paidAt"), 'YYYY-MM') as month,
        SUM(amount) as revenue
      FROM "Payment"
      WHERE status = 'COMPLETED'
        AND "isDeleted" = false
        AND "paidAt" >= ${twelveMonthsAgo}
      GROUP BY DATE_TRUNC('month', "paidAt")
      ORDER BY month DESC
      LIMIT 12
    `;

    return result.map((r) => ({
      month: r.month,
      revenue: Number(r.revenue),
    }));
  }

  /**
   * Get tickets sold aggregated by month for the last 12 months
   */
  private async getTicketsSoldByMonth(): Promise<{ month: string; count: number }[]> {
    const twelveMonthsAgo = new Date();
    twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);

    const result = await this.prisma.$queryRaw<{ month: string; count: bigint }[]>`
      SELECT
        TO_CHAR(DATE_TRUNC('month', "createdAt"), 'YYYY-MM') as month,
        COUNT(*) as count
      FROM "Ticket"
      WHERE status IN ('SOLD', 'USED')
        AND "isDeleted" = false
        AND "createdAt" >= ${twelveMonthsAgo}
      GROUP BY DATE_TRUNC('month', "createdAt")
      ORDER BY month DESC
      LIMIT 12
    `;

    return result.map((r) => ({
      month: r.month,
      count: Number(r.count),
    }));
  }
}
