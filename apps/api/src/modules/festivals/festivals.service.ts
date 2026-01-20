import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CacheService, CacheTag } from '../cache/cache.service';
import {
  CreateFestivalDto,
  UpdateFestivalDto,
  FestivalQueryDto,
  FestivalStatus,
  PublishValidationResultDto,
  PublishValidationErrorDto,
} from './dto';
import { FestivalStatus as PrismaFestivalStatus } from '@prisma/client';
import { ErrorCodes } from '../../common/exceptions/error-codes';

// Cache TTL constants (in seconds)
const CACHE_TTL = {
  FESTIVAL_DETAIL: 30, // 30 seconds for individual festival (by ID or slug)
  FESTIVAL_LIST: 60, // 60 seconds for festival list
  TICKET_CATEGORIES: 300, // 5 minutes
};

@Injectable()
export class FestivalsService {
  private readonly logger = new Logger(FestivalsService.name);

  // Cache metrics for monitoring
  private cacheMetrics = {
    hits: 0,
    misses: 0,
    lastReset: new Date(),
  };

  constructor(
    private readonly prisma: PrismaService,
    private readonly cacheService: CacheService
  ) {}

  /**
   * Get cache metrics
   */
  getCacheMetrics() {
    const total = this.cacheMetrics.hits + this.cacheMetrics.misses;
    const hitRate = total > 0 ? (this.cacheMetrics.hits / total) * 100 : 0;
    return {
      hits: this.cacheMetrics.hits,
      misses: this.cacheMetrics.misses,
      total,
      hitRate: Math.round(hitRate * 100) / 100,
      lastReset: this.cacheMetrics.lastReset,
    };
  }

  /**
   * Reset cache metrics
   */
  resetCacheMetrics() {
    this.cacheMetrics = {
      hits: 0,
      misses: 0,
      lastReset: new Date(),
    };
    this.logger.log('Cache metrics reset');
  }

  /**
   * Log cache hit
   */
  private logCacheHit(key: string, operation: string) {
    this.cacheMetrics.hits++;
    this.logger.debug(
      `[CACHE HIT] ${operation} - Key: ${key} | Total hits: ${this.cacheMetrics.hits}, misses: ${this.cacheMetrics.misses}`
    );
  }

  /**
   * Log cache miss
   */
  private logCacheMiss(key: string, operation: string) {
    this.cacheMetrics.misses++;
    this.logger.debug(
      `[CACHE MISS] ${operation} - Key: ${key} | Total hits: ${this.cacheMetrics.hits}, misses: ${this.cacheMetrics.misses}`
    );
  }

  /**
   * Create a new festival
   */
  async create(dto: CreateFestivalDto, organizerId: string) {
    const slug = dto.slug || this.generateSlug(dto.name);

    // Check slug uniqueness
    const existing = await this.prisma.festival.findUnique({ where: { slug } });
    if (existing) {
      throw new ConflictException(`Festival with slug "${slug}" already exists`);
    }

    return this.prisma.festival.create({
      data: {
        name: dto.name,
        slug,
        description: dto.description,
        location: dto.location,
        address: dto.address,
        startDate: new Date(dto.startDate),
        endDate: new Date(dto.endDate),
        maxCapacity: dto.maxCapacity || 10000,
        status: PrismaFestivalStatus.DRAFT,
        organizerId,
        timezone: dto.timezone || 'Europe/Paris',
        currency: dto.currency || 'EUR',
        websiteUrl: dto.websiteUrl,
        contactEmail: dto.contactEmail,
        logoUrl: dto.logoUrl,
        bannerUrl: dto.bannerUrl,
      },
    });
  }

  /**
   * Find all festivals with pagination and filters
   * Cache TTL: 60 seconds
   */
  async findAll(query: FestivalQueryDto) {
    const { page = 1, limit = 10, status, search, organizerId } = query;

    // Build cache key from query params
    const cacheKey = `festivals:list:${status || 'all'}:${page}:${limit}:${search || ''}:${organizerId || ''}`;

    // Try to get from cache
    const cached = await this.cacheService.get(cacheKey);
    if (cached) {
      this.logCacheHit(cacheKey, 'findAll');
      return cached;
    }

    this.logCacheMiss(cacheKey, 'findAll');

    const skip = (page - 1) * limit;

    const where: any = { isDeleted: false };

    if (status) {
      where.status = status;
    }

    if (organizerId) {
      where.organizerId = organizerId;
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { location: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [festivals, total] = await Promise.all([
      this.prisma.festival.findMany({
        where,
        skip,
        take: limit,
        orderBy: { startDate: 'asc' },
        include: {
          organizer: {
            select: { id: true, firstName: true, lastName: true, email: true },
          },
          ticketCategories: {
            where: { isActive: true },
            select: { id: true, name: true, price: true, isActive: true },
            orderBy: { price: 'asc' },
            take: 5,
          },
          _count: {
            select: { tickets: true, ticketCategories: true },
          },
        },
      }),
      this.prisma.festival.count({ where }),
    ]);

    const totalPages = Math.ceil(total / limit);

    const result = {
      data: festivals,
      total,
      page,
      limit,
      totalPages,
      hasNextPage: page < totalPages,
      hasPreviousPage: page > 1,
    };

    // Cache the result with 60 second TTL
    await this.cacheService.set(cacheKey, result, {
      ttl: CACHE_TTL.FESTIVAL_LIST,
      tags: [CacheTag.FESTIVAL],
    });

    this.logger.debug(`[CACHE SET] findAll - Key: ${cacheKey}, TTL: ${CACHE_TTL.FESTIVAL_LIST}s`);

    return result;
  }

  /**
   * Find a festival by ID
   * Cache TTL: 30 seconds
   */
  async findOne(id: string) {
    const cacheKey = `festival:${id}`;

    // Try to get from cache
    const cached = await this.cacheService.get(cacheKey);
    if (cached) {
      this.logCacheHit(cacheKey, 'findOne');
      return cached;
    }

    this.logCacheMiss(cacheKey, 'findOne');

    const festival = await this.prisma.festival.findUnique({
      where: { id },
      include: {
        organizer: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
        ticketCategories: true,
        stages: true,
        zones: true,
        _count: {
          select: { tickets: true, vendors: true, staffAssignments: true },
        },
      },
    });

    if (!festival || festival.isDeleted) {
      throw new NotFoundException(`Festival with ID "${id}" not found`);
    }

    // Cache the result with 30 second TTL
    await this.cacheService.set(cacheKey, festival, {
      ttl: CACHE_TTL.FESTIVAL_DETAIL,
      tags: [CacheTag.FESTIVAL],
    });

    this.logger.debug(`[CACHE SET] findOne - Key: ${cacheKey}, TTL: ${CACHE_TTL.FESTIVAL_DETAIL}s`);

    return festival;
  }

  /**
   * Find a festival by slug
   * Cache TTL: 30 seconds
   */
  async findBySlug(slug: string) {
    const cacheKey = `festival:slug:${slug}`;

    // Try to get from cache
    const cached = await this.cacheService.get(cacheKey);
    if (cached) {
      this.logCacheHit(cacheKey, 'findBySlug');
      return cached;
    }

    this.logCacheMiss(cacheKey, 'findBySlug');

    const festival = await this.prisma.festival.findUnique({
      where: { slug },
      include: {
        organizer: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
        ticketCategories: {
          where: { isActive: true },
        },
        stages: true,
        _count: {
          select: { tickets: true },
        },
      },
    });

    if (!festival || festival.isDeleted) {
      throw new NotFoundException(`Festival with slug "${slug}" not found`);
    }

    // Cache the result with 30 second TTL
    await this.cacheService.set(cacheKey, festival, {
      ttl: CACHE_TTL.FESTIVAL_DETAIL,
      tags: [CacheTag.FESTIVAL],
    });

    this.logger.debug(
      `[CACHE SET] findBySlug - Key: ${cacheKey}, TTL: ${CACHE_TTL.FESTIVAL_DETAIL}s`
    );

    return festival;
  }

  /**
   * Update a festival
   */
  async update(id: string, dto: UpdateFestivalDto, userId: string) {
    const festival = await this.findOne(id);

    // Check ownership (organizer or admin can update)
    if (festival.organizerId !== userId) {
      throw new ForbiddenException('You do not have permission to update this festival');
    }

    const updatedFestival = await this.prisma.festival.update({
      where: { id },
      data: {
        name: dto.name,
        description: dto.description,
        location: dto.location,
        address: dto.address,
        startDate: dto.startDate ? new Date(dto.startDate) : undefined,
        endDate: dto.endDate ? new Date(dto.endDate) : undefined,
        maxCapacity: dto.maxCapacity,
        websiteUrl: dto.websiteUrl,
        contactEmail: dto.contactEmail,
        logoUrl: dto.logoUrl,
        bannerUrl: dto.bannerUrl,
      },
    });

    // Invalidate festival cache
    await this.invalidateFestivalCache(id, festival.slug);

    return updatedFestival;
  }

  /**
   * Update festival status
   */
  async updateStatus(id: string, status: FestivalStatus, userId: string) {
    const festival = await this.findOne(id);

    if (festival.organizerId !== userId) {
      throw new ForbiddenException('You do not have permission to update this festival');
    }

    const updatedFestival = await this.prisma.festival.update({
      where: { id },
      data: { status: status as PrismaFestivalStatus },
    });

    // Invalidate festival cache
    await this.invalidateFestivalCache(id, festival.slug);

    return updatedFestival;
  }

  /**
   * Soft delete a festival
   */
  async remove(id: string, userId: string) {
    const festival = await this.findOne(id);

    if (festival.organizerId !== userId) {
      throw new ForbiddenException('You do not have permission to delete this festival');
    }

    const deletedFestival = await this.prisma.festival.update({
      where: { id },
      data: {
        isDeleted: true,
        deletedAt: new Date(),
      },
    });

    // Invalidate festival cache
    await this.invalidateFestivalCache(id, festival.slug);

    return deletedFestival;
  }

  /**
   * Get festival statistics
   */
  async getStats(id: string) {
    const festival = await this.findOne(id);

    const [ticketStats, revenueStats] = await Promise.all([
      this.prisma.ticket.groupBy({
        by: ['status'],
        where: { festivalId: id },
        _count: true,
      }),
      this.prisma.ticket.aggregate({
        where: { festivalId: id, status: 'SOLD' },
        _sum: { purchasePrice: true },
      }),
    ]);

    return {
      festivalId: id,
      festivalName: festival.name,
      maxCapacity: festival.maxCapacity,
      currentAttendees: festival.currentAttendees,
      ticketsSold: ticketStats.reduce((acc, s) => acc + s._count, 0),
      ticketsByStatus: ticketStats,
      totalRevenue: revenueStats._sum.purchasePrice || 0,
      occupancyRate: (festival.currentAttendees / festival.maxCapacity) * 100,
    };
  }

  /**
   * Get published festivals (public endpoint)
   */
  async findPublished(query: FestivalQueryDto) {
    return this.findAll({ ...query, status: FestivalStatus.PUBLISHED });
  }

  /**
   * Get ticket categories for a festival (cached)
   * Cache TTL: 5 minutes
   */
  async getTicketCategories(festivalId: string) {
    const cacheKey = `festival:${festivalId}:categories`;

    // Try to get from cache
    const cached = await this.cacheService.get(cacheKey);
    if (cached) {
      this.logCacheHit(cacheKey, 'getTicketCategories');
      return cached;
    }

    this.logCacheMiss(cacheKey, 'getTicketCategories');

    // Verify festival exists
    await this.findOne(festivalId);

    const categories = await this.prisma.ticketCategory.findMany({
      where: {
        festivalId,
        isActive: true,
      },
      orderBy: { price: 'asc' },
    });

    // Cache the result with 5 minute TTL
    await this.cacheService.set(cacheKey, categories, {
      ttl: CACHE_TTL.TICKET_CATEGORIES,
      tags: [CacheTag.FESTIVAL, CacheTag.TICKET],
    });

    this.logger.debug(
      `[CACHE SET] getTicketCategories - Key: ${cacheKey}, TTL: ${CACHE_TTL.TICKET_CATEGORIES}s`
    );

    return categories;
  }

  /**
   * Generate URL-friendly slug from name
   */
  private generateSlug(name: string): string {
    return name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // Remove accents
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .substring(0, 50);
  }

  /**
   * Invalidate all cache entries related to a festival
   */
  private async invalidateFestivalCache(festivalId: string, slug?: string): Promise<void> {
    const invalidatedKeys: string[] = [];

    // Delete specific festival cache entries
    await this.cacheService.delete(`festival:${festivalId}`);
    invalidatedKeys.push(`festival:${festivalId}`);

    await this.cacheService.delete(`festival:${festivalId}:categories`);
    invalidatedKeys.push(`festival:${festivalId}:categories`);

    if (slug) {
      await this.cacheService.delete(`festival:slug:${slug}`);
      invalidatedKeys.push(`festival:slug:${slug}`);
    }

    // Delete all festival list caches (they might contain this festival)
    await this.cacheService.deletePattern('festivals:list:*');
    invalidatedKeys.push('festivals:list:*');

    // Also invalidate program cache for this festival
    await this.cacheService.deletePattern(`program:${festivalId}:*`);
    invalidatedKeys.push(`program:${festivalId}:*`);

    this.logger.log(
      `[CACHE INVALIDATE] Festival ${festivalId} - Invalidated keys: ${invalidatedKeys.join(', ')}`
    );
  }

  // ============================================================================
  // Soft Delete Operations
  // ============================================================================

  /**
   * Restore a soft-deleted festival
   */
  async restore(id: string, userId: string) {
    // Find the soft-deleted festival using raw query to bypass middleware
    const festival = await this.prisma.festival.findFirst({
      where: { id },
      includeDeleted: true,
    } as any);

    if (!festival) {
      throw new NotFoundException(`Festival with ID "${id}" not found`);
    }

    if (festival.organizerId !== userId) {
      throw new ForbiddenException('You do not have permission to restore this festival');
    }

    if (!festival.isDeleted) {
      throw new ConflictException('Festival is not deleted');
    }

    const restoredFestival = await this.prisma.festival.update({
      where: { id },
      data: {
        isDeleted: false,
        deletedAt: null,
      },
    });

    // Invalidate festival cache
    await this.invalidateFestivalCache(id, festival.slug);

    this.logger.log(`Festival ${id} restored by user ${userId}`);

    return restoredFestival;
  }

  /**
   * Get all soft-deleted festivals for an organizer
   */
  async findDeleted(organizerId: string, query: FestivalQueryDto) {
    const { page = 1, limit = 10 } = query;
    const skip = (page - 1) * limit;

    const where: any = {
      organizerId,
      isDeleted: true,
    };

    const [festivals, total] = await Promise.all([
      this.prisma.festival.findMany({
        where,
        skip,
        take: limit,
        orderBy: { deletedAt: 'desc' },
        include: {
          organizer: {
            select: { id: true, firstName: true, lastName: true, email: true },
          },
          _count: {
            select: { tickets: true, ticketCategories: true },
          },
        },
        includeDeleted: true,
      } as any),
      this.prisma.festival.count({
        where,
        includeDeleted: true,
      } as any),
    ]);

    const totalPages = Math.ceil(total / limit);

    return {
      data: festivals,
      total,
      page,
      limit,
      totalPages,
      hasNextPage: page < totalPages,
      hasPreviousPage: page > 1,
    };
  }

  /**
   * Permanently delete a soft-deleted festival
   * WARNING: This is irreversible!
   */
  async hardDelete(id: string, userId: string) {
    // Find the festival using raw query to bypass middleware
    const festival = await this.prisma.festival.findFirst({
      where: { id },
      includeDeleted: true,
    } as any);

    if (!festival) {
      throw new NotFoundException(`Festival with ID "${id}" not found`);
    }

    if (festival.organizerId !== userId) {
      throw new ForbiddenException('You do not have permission to delete this festival');
    }

    // Permanently delete the festival
    await (this.prisma.festival.delete as any)({
      where: { id },
      hardDelete: true,
    });

    // Invalidate festival cache
    await this.invalidateFestivalCache(id, festival.slug);

    this.logger.warn(`Festival ${id} permanently deleted by user ${userId}`);

    return { message: `Festival ${id} has been permanently deleted` };
  }

  // ============================================================================
  // Festival Publication Operations
  // ============================================================================

  /**
   * Validate if a festival can be published
   * Checks for required data: name, dates, venue/location, at least one ticket category
   */
  async validateForPublication(id: string): Promise<PublishValidationResultDto> {
    const festival = await this.prisma.festival.findUnique({
      where: { id },
      include: {
        ticketCategories: {
          where: { isActive: true },
        },
      },
    });

    if (!festival || festival.isDeleted) {
      throw new NotFoundException(`Festival with ID "${id}" not found`);
    }

    const errors: PublishValidationErrorDto[] = [];

    // Check required fields
    if (!festival.name || festival.name.trim() === '') {
      errors.push({
        code: ErrorCodes.FESTIVAL_PUBLISH_MISSING_NAME,
        message: 'Festival name is required for publishing',
        field: 'name',
      });
    }

    if (!festival.startDate || !festival.endDate) {
      errors.push({
        code: ErrorCodes.FESTIVAL_PUBLISH_MISSING_DATES,
        message: 'Festival dates are required for publishing',
        field: 'dates',
      });
    }

    if (!festival.location || festival.location.trim() === '') {
      errors.push({
        code: ErrorCodes.FESTIVAL_PUBLISH_MISSING_VENUE,
        message: 'Festival venue/location is required for publishing',
        field: 'location',
      });
    }

    // Check for at least one active ticket category
    if (!festival.ticketCategories || festival.ticketCategories.length === 0) {
      errors.push({
        code: ErrorCodes.FESTIVAL_PUBLISH_NO_TICKET_CATEGORY,
        message: 'At least one active ticket category is required for publishing',
        field: 'ticketCategories',
      });
    }

    // Check current status
    if (festival.status !== PrismaFestivalStatus.DRAFT) {
      errors.push({
        code: ErrorCodes.FESTIVAL_NOT_DRAFT,
        message: 'Festival must be in DRAFT status to be published',
        field: 'status',
      });
    }

    return {
      canPublish: errors.length === 0,
      errors,
    };
  }

  /**
   * Publish a festival
   * Validates required data and changes status from DRAFT to PUBLISHED
   */
  async publish(id: string, userId: string) {
    const festival = await this.findOne(id);

    // Check ownership
    if (festival.organizerId !== userId) {
      throw new ForbiddenException('You do not have permission to publish this festival');
    }

    // Check if already published
    if (festival.status === PrismaFestivalStatus.PUBLISHED) {
      throw new BadRequestException({
        code: ErrorCodes.FESTIVAL_ALREADY_PUBLISHED,
        message: 'Festival is already published',
      });
    }

    // Validate for publication
    const validation = await this.validateForPublication(id);
    if (!validation.canPublish) {
      throw new BadRequestException({
        code: ErrorCodes.FESTIVAL_PUBLISH_INVALID_STATUS,
        message: 'Festival cannot be published due to validation errors',
        errors: validation.errors,
      });
    }

    // Update festival status to PUBLISHED
    const updatedFestival = await this.prisma.festival.update({
      where: { id },
      data: {
        status: PrismaFestivalStatus.PUBLISHED,
      },
      include: {
        organizer: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
        ticketCategories: true,
        stages: true,
        zones: true,
        _count: {
          select: { tickets: true, vendors: true, staffAssignments: true },
        },
      },
    });

    // Invalidate festival cache
    await this.invalidateFestivalCache(id, festival.slug);

    this.logger.log(`Festival ${id} published by user ${userId}`);

    return updatedFestival;
  }

  /**
   * Unpublish a festival
   * Changes status from PUBLISHED back to DRAFT
   */
  async unpublish(id: string, userId: string) {
    const festival = await this.findOne(id);

    // Check ownership
    if (festival.organizerId !== userId) {
      throw new ForbiddenException('You do not have permission to unpublish this festival');
    }

    // Check if festival is actually published
    if (festival.status !== PrismaFestivalStatus.PUBLISHED) {
      throw new BadRequestException({
        code: ErrorCodes.FESTIVAL_NOT_PUBLISHED,
        message: 'Festival is not published',
      });
    }

    // Update festival status back to DRAFT
    const updatedFestival = await this.prisma.festival.update({
      where: { id },
      data: {
        status: PrismaFestivalStatus.DRAFT,
      },
      include: {
        organizer: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
        ticketCategories: true,
        stages: true,
        zones: true,
        _count: {
          select: { tickets: true, vendors: true, staffAssignments: true },
        },
      },
    });

    // Invalidate festival cache
    await this.invalidateFestivalCache(id, festival.slug);

    this.logger.log(`Festival ${id} unpublished by user ${userId}`);

    return updatedFestival;
  }
}
