import { Controller, Get, UseGuards } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiOkResponse,
  ApiUnauthorizedResponse,
  ApiForbiddenResponse,
} from '@nestjs/swagger';
import { StatsService, PlatformStats, DashboardStats } from './stats.service';
import { Public } from '../auth/decorators/public.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { UserRole } from '@prisma/client';
import { RateLimit } from '../../common/guards/rate-limit.guard';
import { Cacheable, CacheTag } from '../cache';

/**
 * DTO for platform statistics response
 */
class PlatformStatsResponseDto implements PlatformStats {
  totalFestivals!: number;
  totalArtists!: number;
  totalUsers!: number;
  totalTicketsSold!: number;
  totalRevenue!: number;
  activeFestivals!: number;
}

/**
 * DTO for admin dashboard statistics response
 */
class DashboardStatsResponseDto implements DashboardStats {
  totalFestivals!: number;
  totalArtists!: number;
  totalUsers!: number;
  totalTicketsSold!: number;
  totalRevenue!: number;
  activeFestivals!: number;
  totalPayments!: number;
  pendingPayments!: number;
  completedPayments!: number;
  refundedPayments!: number;
  totalVendors!: number;
  activeVendors!: number;
  totalStaffMembers!: number;
  totalZones!: number;
  averageTicketPrice!: number;
  festivalsByStatus!: Record<string, number>;
  revenueByMonth!: { month: string; revenue: number }[];
  ticketsSoldByMonth!: { month: string; count: number }[];
}

@ApiTags('Statistics')
@Controller('stats')
export class StatsController {
  constructor(private readonly statsService: StatsService) {}

  /**
   * Get public platform statistics
   * This endpoint is publicly accessible for the homepage
   */
  @Get('platform')
  @Public()
  @RateLimit(60, 60) // 60 requests per minute
  @Cacheable({ ttl: 300 }) // Cache for 5 minutes
  @CacheTag('platform-stats')
  @ApiOperation({
    summary: 'Get public platform statistics',
    description:
      'Returns aggregated platform statistics including total festivals, artists, users, and revenue. This endpoint is public and cached for 5 minutes.',
  })
  @ApiOkResponse({
    description: 'Platform statistics retrieved successfully',
    type: PlatformStatsResponseDto,
  })
  async getPlatformStats(): Promise<PlatformStats> {
    return this.statsService.getPlatformStats();
  }

  /**
   * Get detailed admin dashboard statistics
   * This endpoint requires authentication and admin/organizer role
   */
  @Get('dashboard')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.ORGANIZER)
  @Cacheable({ ttl: 120 }) // Cache for 2 minutes
  @CacheTag('dashboard-stats')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get admin dashboard statistics',
    description:
      'Returns detailed platform statistics including payments, vendors, staff, and monthly trends. Requires admin or organizer role.',
  })
  @ApiOkResponse({
    description: 'Dashboard statistics retrieved successfully',
    type: DashboardStatsResponseDto,
  })
  @ApiUnauthorizedResponse({ description: 'Unauthorized - Invalid or missing token' })
  @ApiForbiddenResponse({ description: 'Forbidden - Insufficient permissions' })
  async getDashboardStats(): Promise<DashboardStats> {
    return this.statsService.getDashboardStats();
  }
}
