import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { CacheService } from './cache.service';
import { PrismaService } from '../prisma/prisma.service';
import { FestivalStatus } from '@prisma/client';

/**
 * Cache Warming Service
 *
 * Automatically pre-loads frequently accessed data into Redis cache
 * on application startup to improve initial response times.
 *
 * This service implements OnApplicationBootstrap to execute cache
 * warming immediately after the application is fully initialized.
 */
@Injectable()
export class CacheWarmingService implements OnApplicationBootstrap {
  private readonly logger = new Logger(CacheWarmingService.name);

  constructor(
    private readonly cacheService: CacheService,
    private readonly prisma: PrismaService,
  ) {}

  /**
   * Called after the application has fully initialized
   * Triggers cache warming with production data
   */
  async onApplicationBootstrap(): Promise<void> {
    this.logger.log('Application bootstrap complete, initiating cache warming...');

    // Run cache warming asynchronously to not block application startup
    setImmediate(() => {
      this.warmCache().catch((error) => {
        this.logger.error(`Cache warming error: ${error.message}`, error.stack);
      });
    });
  }

  /**
   * Execute cache warming with data loaders
   */
  private async warmCache(): Promise<void> {
    await this.cacheService.warmCache({
      loadActiveFestivals: this.loadActiveFestivals.bind(this),
      loadPopularTicketCategories: this.loadPopularTicketCategories.bind(this),
      loadSystemConfig: this.loadSystemConfig.bind(this),
    });
  }

  /**
   * Load active and upcoming festivals from database
   * Returns festivals that are published or ongoing
   */
  private async loadActiveFestivals(): Promise<any[]> {
    const now = new Date();

    const festivals = await this.prisma.festival.findMany({
      where: {
        isDeleted: false,
        status: {
          in: [FestivalStatus.PUBLISHED, FestivalStatus.ONGOING],
        },
        endDate: {
          gte: now, // Only festivals that haven't ended yet
        },
      },
      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
        location: true,
        address: true,
        startDate: true,
        endDate: true,
        status: true,
        maxCapacity: true,
        logoUrl: true,
        bannerUrl: true,
        websiteUrl: true,
        timezone: true,
        currency: true,
      },
      orderBy: {
        startDate: 'asc',
      },
      take: 50, // Limit to 50 most recent active festivals
    });

    return festivals;
  }

  /**
   * Load popular ticket categories from database
   * Returns active categories from published/ongoing festivals
   */
  private async loadPopularTicketCategories(): Promise<any[]> {
    const now = new Date();

    const categories = await this.prisma.ticketCategory.findMany({
      where: {
        isActive: true,
        saleStartDate: {
          lte: now,
        },
        saleEndDate: {
          gte: now,
        },
        festival: {
          isDeleted: false,
          status: {
            in: [FestivalStatus.PUBLISHED, FestivalStatus.ONGOING],
          },
        },
      },
      select: {
        id: true,
        festivalId: true,
        name: true,
        description: true,
        type: true,
        price: true,
        quota: true,
        soldCount: true,
        maxPerUser: true,
        saleStartDate: true,
        saleEndDate: true,
        festival: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
      },
      orderBy: [
        {
          soldCount: 'desc', // Most popular first
        },
        {
          createdAt: 'desc',
        },
      ],
      take: 100, // Limit to 100 most popular categories
    });

    return categories;
  }

  /**
   * Load system configuration
   * Returns application-wide settings and feature flags
   */
  private async loadSystemConfig(): Promise<any> {
    // This is a placeholder for system configuration
    // In a real application, you might have a Config table in the database
    // or environment-based configuration that needs to be cached

    const config = {
      features: {
        cashlessEnabled: true,
        analyticsEnabled: true,
        notificationsEnabled: true,
        gdprCompliance: true,
      },
      limits: {
        maxTicketsPerUser: 10,
        maxFestivalCapacity: 500000,
        sessionTimeout: 1800, // 30 minutes
      },
      payment: {
        supportedCurrencies: ['EUR', 'USD', 'GBP'],
        minAmount: 1,
        maxAmount: 10000,
      },
      cache: {
        defaultTTL: 3600,
        realtimeTTL: 10,
        configTTL: 86400,
      },
      timestamp: new Date().toISOString(),
    };

    return config;
  }
}
