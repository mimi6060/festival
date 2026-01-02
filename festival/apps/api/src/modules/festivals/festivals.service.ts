/**
 * Festivals Service
 *
 * Handles festival-related business logic including:
 * - Festival CRUD operations
 * - Festival publishing and cancellation
 * - Festival statistics
 */

import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { FestivalStatus, Prisma } from '@prisma/client';
import {
  CreateFestivalDto,
  UpdateFestivalDto,
  FestivalResponseDto,
  FestivalQueryDto,
  FestivalStatsDto,
  FestivalLocationDto,
} from './dto';

// ============================================================================
// Types
// ============================================================================

export interface PaginatedFestivalsResponse {
  data: FestivalResponseDto[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

// ============================================================================
// Service
// ============================================================================

@Injectable()
export class FestivalsService {
  private readonly logger = new Logger(FestivalsService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Create a new festival
   */
  async create(
    dto: CreateFestivalDto,
    organizerId: string,
  ): Promise<FestivalResponseDto> {
    // Generate slug if not provided
    const slug = dto.slug || this.generateSlug(dto.name);

    // Check if slug already exists
    const existingFestival = await this.prisma.festival.findUnique({
      where: { slug },
    });

    if (existingFestival) {
      throw new ConflictException('A festival with this slug already exists');
    }

    // Validate dates
    const startDate = new Date(dto.startDate);
    const endDate = new Date(dto.endDate);

    if (endDate <= startDate) {
      throw new BadRequestException('End date must be after start date');
    }

    // Create festival
    const festival = await this.prisma.festival.create({
      data: {
        organizerId,
        name: dto.name,
        slug,
        description: dto.description || dto.shortDescription,
        location: dto.location.city,
        address: `${dto.location.address}, ${dto.location.postalCode} ${dto.location.city}, ${dto.location.country}`,
        startDate,
        endDate,
        status: FestivalStatus.DRAFT,
        maxCapacity: dto.capacity || 10000,
        logoUrl: dto.logo,
        bannerUrl: dto.coverImage,
        websiteUrl: dto.website,
        contactEmail: dto.contactEmail,
        timezone: dto.timezone || 'Europe/Paris',
        currency: dto.currency || 'EUR',
      },
      include: {
        organizer: {
          select: { id: true, email: true, firstName: true, lastName: true },
        },
      },
    });

    this.logger.log(`Festival created: ${festival.id} by organizer ${organizerId}`);

    return this.mapToResponse(festival, dto.location, dto.shortDescription, dto.tags);
  }

  /**
   * Get all festivals with pagination and filters
   */
  async findAll(query: FestivalQueryDto): Promise<PaginatedFestivalsResponse> {
    const page = query.page || 1;
    const limit = query.limit || 20;
    const skip = (page - 1) * limit;

    // Build where clause
    const where: Prisma.FestivalWhereInput = {
      isDeleted: false,
    };

    if (query.search) {
      where.name = {
        contains: query.search,
        mode: 'insensitive',
      };
    }

    if (query.status) {
      where.status = query.status as FestivalStatus;
    }

    if (query.country) {
      where.address = {
        contains: query.country,
        mode: 'insensitive',
      };
    }

    if (query.startDateFrom) {
      where.startDate = {
        ...(where.startDate as Prisma.DateTimeFilter),
        gte: new Date(query.startDateFrom),
      };
    }

    if (query.startDateTo) {
      where.startDate = {
        ...(where.startDate as Prisma.DateTimeFilter),
        lte: new Date(query.startDateTo),
      };
    }

    // Build order by
    const orderBy: Prisma.FestivalOrderByWithRelationInput = {};
    if (query.sortBy) {
      const sortField = query.sortBy as keyof Prisma.FestivalOrderByWithRelationInput;
      if (['name', 'startDate', 'createdAt', 'maxCapacity'].includes(query.sortBy)) {
        orderBy[sortField] = query.sortOrder || 'asc';
      }
    } else {
      orderBy.startDate = 'asc';
    }

    // Execute query
    const [festivals, total] = await Promise.all([
      this.prisma.festival.findMany({
        where,
        skip,
        take: limit,
        orderBy,
        include: {
          organizer: {
            select: { id: true, email: true, firstName: true, lastName: true },
          },
        },
      }),
      this.prisma.festival.count({ where }),
    ]);

    const totalPages = Math.ceil(total / limit);

    return {
      data: festivals.map((f) => this.mapToResponse(f)),
      total,
      page,
      limit,
      totalPages,
      hasNextPage: page < totalPages,
      hasPreviousPage: page > 1,
    };
  }

  /**
   * Get a festival by ID
   */
  async findOne(id: string): Promise<FestivalResponseDto> {
    const festival = await this.prisma.festival.findUnique({
      where: { id },
      include: {
        organizer: {
          select: { id: true, email: true, firstName: true, lastName: true },
        },
      },
    });

    if (!festival) {
      throw new NotFoundException('Festival not found');
    }

    if (festival.isDeleted) {
      throw new NotFoundException('Festival not found');
    }

    return this.mapToResponse(festival);
  }

  /**
   * Get a festival by slug
   */
  async findBySlug(slug: string): Promise<FestivalResponseDto> {
    const festival = await this.prisma.festival.findUnique({
      where: { slug },
      include: {
        organizer: {
          select: { id: true, email: true, firstName: true, lastName: true },
        },
      },
    });

    if (!festival) {
      throw new NotFoundException('Festival not found');
    }

    if (festival.isDeleted) {
      throw new NotFoundException('Festival not found');
    }

    return this.mapToResponse(festival);
  }

  /**
   * Update a festival
   */
  async update(
    id: string,
    dto: UpdateFestivalDto,
  ): Promise<FestivalResponseDto> {
    const festival = await this.prisma.festival.findUnique({
      where: { id },
    });

    if (!festival) {
      throw new NotFoundException('Festival not found');
    }

    if (festival.isDeleted) {
      throw new NotFoundException('Festival not found');
    }

    // Validate dates if provided
    if (dto.startDate && dto.endDate) {
      const startDate = new Date(dto.startDate);
      const endDate = new Date(dto.endDate);

      if (endDate <= startDate) {
        throw new BadRequestException('End date must be after start date');
      }
    }

    // Cannot change certain fields after publishing
    if (festival.status !== FestivalStatus.DRAFT) {
      if (dto.startDate && new Date(dto.startDate) < festival.startDate) {
        throw new BadRequestException('Cannot move start date earlier after publishing');
      }
    }

    // Build update data
    const updateData: Prisma.FestivalUpdateInput = {};

    if (dto.name) updateData.name = dto.name;
    if (dto.shortDescription || dto.description) {
      updateData.description = dto.description || dto.shortDescription;
    }
    if (dto.startDate) updateData.startDate = new Date(dto.startDate);
    if (dto.endDate) updateData.endDate = new Date(dto.endDate);
    if (dto.capacity) updateData.maxCapacity = dto.capacity;
    if (dto.website) updateData.websiteUrl = dto.website;
    if (dto.coverImage) updateData.bannerUrl = dto.coverImage;
    if (dto.logo) updateData.logoUrl = dto.logo;
    if (dto.contactEmail) updateData.contactEmail = dto.contactEmail;
    if (dto.timezone) updateData.timezone = dto.timezone;
    if (dto.currency) updateData.currency = dto.currency;
    if (dto.status) updateData.status = dto.status as FestivalStatus;

    if (dto.location) {
      updateData.location = dto.location.city;
      updateData.address = `${dto.location.address}, ${dto.location.postalCode} ${dto.location.city}, ${dto.location.country}`;
    }

    const updatedFestival = await this.prisma.festival.update({
      where: { id },
      data: updateData,
      include: {
        organizer: {
          select: { id: true, email: true, firstName: true, lastName: true },
        },
      },
    });

    this.logger.log(`Festival updated: ${id}`);

    return this.mapToResponse(updatedFestival, dto.location);
  }

  /**
   * Delete a festival (soft delete)
   */
  async remove(id: string): Promise<void> {
    const festival = await this.prisma.festival.findUnique({
      where: { id },
      include: {
        tickets: {
          where: {
            status: { in: ['SOLD', 'RESERVED'] },
          },
        },
      },
    });

    if (!festival) {
      throw new NotFoundException('Festival not found');
    }

    if (festival.isDeleted) {
      throw new NotFoundException('Festival not found');
    }

    // Cannot delete if tickets have been sold
    if (festival.tickets.length > 0) {
      throw new BadRequestException(
        'Cannot delete a festival that has sold tickets. Consider cancelling instead.',
      );
    }

    // Cannot delete ongoing or completed festivals
    if (festival.status === FestivalStatus.ONGOING || festival.status === FestivalStatus.COMPLETED) {
      throw new BadRequestException(
        'Cannot delete an ongoing or completed festival',
      );
    }

    // Soft delete
    await this.prisma.festival.update({
      where: { id },
      data: {
        isDeleted: true,
        deletedAt: new Date(),
      },
    });

    this.logger.log(`Festival deleted (soft): ${id}`);
  }

  /**
   * Get festival statistics
   */
  async getStats(id: string): Promise<FestivalStatsDto> {
    const festival = await this.prisma.festival.findUnique({
      where: { id },
    });

    if (!festival) {
      throw new NotFoundException('Festival not found');
    }

    if (festival.isDeleted) {
      throw new NotFoundException('Festival not found');
    }

    // Get ticket statistics
    const [ticketStats, categoryCount, cashlessStats, transactionCount] = await Promise.all([
      this.prisma.ticket.aggregate({
        where: {
          festivalId: id,
          status: { in: ['SOLD', 'USED'] },
        },
        _count: { id: true },
        _sum: { purchasePrice: true },
      }),
      this.prisma.ticketCategory.count({
        where: { festivalId: id },
      }),
      this.prisma.cashlessAccount.count({
        where: {
          transactions: {
            some: { festivalId: id },
          },
        },
      }),
      this.prisma.cashlessTransaction.count({
        where: { festivalId: id },
      }),
    ]);

    // Calculate used tickets for check-in rate
    const usedTickets = await this.prisma.ticket.count({
      where: {
        festivalId: id,
        status: 'USED',
      },
    });

    const ticketsSold = ticketStats._count.id || 0;
    const totalRevenue = Number(ticketStats._sum.purchasePrice || 0) * 100; // Convert to cents
    const capacityPercentage = festival.maxCapacity > 0
      ? (ticketsSold / festival.maxCapacity) * 100
      : 0;
    const checkInRate = ticketsSold > 0 ? (usedTickets / ticketsSold) * 100 : 0;

    return {
      ticketsSold,
      totalRevenue,
      ticketCategories: categoryCount,
      cashlessAccounts: cashlessStats,
      cashlessTransactions: transactionCount,
      capacityPercentage: Math.round(capacityPercentage * 100) / 100,
      checkInRate: Math.round(checkInRate * 100) / 100,
    };
  }

  /**
   * Publish a festival
   */
  async publish(id: string): Promise<FestivalResponseDto> {
    const festival = await this.prisma.festival.findUnique({
      where: { id },
      include: {
        ticketCategories: true,
      },
    });

    if (!festival) {
      throw new NotFoundException('Festival not found');
    }

    if (festival.isDeleted) {
      throw new NotFoundException('Festival not found');
    }

    if (festival.status !== FestivalStatus.DRAFT) {
      throw new BadRequestException(
        `Cannot publish a festival with status ${festival.status}. Only DRAFT festivals can be published.`,
      );
    }

    // Check required fields
    if (!festival.name || !festival.startDate || !festival.endDate) {
      throw new BadRequestException(
        'Festival must have name, start date, and end date to be published',
      );
    }

    // Check if at least one ticket category exists
    if (festival.ticketCategories.length === 0) {
      throw new BadRequestException(
        'Festival must have at least one ticket category before publishing',
      );
    }

    const updatedFestival = await this.prisma.festival.update({
      where: { id },
      data: { status: FestivalStatus.PUBLISHED },
      include: {
        organizer: {
          select: { id: true, email: true, firstName: true, lastName: true },
        },
      },
    });

    this.logger.log(`Festival published: ${id}`);

    return this.mapToResponse(updatedFestival);
  }

  /**
   * Cancel a festival
   */
  async cancel(id: string): Promise<FestivalResponseDto> {
    const festival = await this.prisma.festival.findUnique({
      where: { id },
    });

    if (!festival) {
      throw new NotFoundException('Festival not found');
    }

    if (festival.isDeleted) {
      throw new NotFoundException('Festival not found');
    }

    if (festival.status === FestivalStatus.COMPLETED) {
      throw new BadRequestException('Cannot cancel a completed festival');
    }

    if (festival.status === FestivalStatus.CANCELLED) {
      throw new BadRequestException('Festival is already cancelled');
    }

    // Cancel the festival
    const updatedFestival = await this.prisma.festival.update({
      where: { id },
      data: { status: FestivalStatus.CANCELLED },
      include: {
        organizer: {
          select: { id: true, email: true, firstName: true, lastName: true },
        },
      },
    });

    // Note: In a real application, this would trigger:
    // - Notification to all ticket holders
    // - Automatic refund processing
    // - Cashless balance refunds
    // These would be handled by separate services/queues

    this.logger.log(`Festival cancelled: ${id}`);

    return this.mapToResponse(updatedFestival);
  }

  // ============================================================================
  // Private Methods
  // ============================================================================

  /**
   * Generate a URL-friendly slug from a name
   */
  private generateSlug(name: string): string {
    return name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // Remove accents
      .replace(/[^a-z0-9\s-]/g, '') // Remove special characters
      .replace(/\s+/g, '-') // Replace spaces with hyphens
      .replace(/-+/g, '-') // Replace multiple hyphens with single
      .replace(/^-|-$/g, ''); // Remove leading/trailing hyphens
  }

  /**
   * Parse address string back to location object
   */
  private parseLocation(address: string, city: string): FestivalLocationDto {
    // Basic parsing - in a real app, you'd store these as separate fields
    const parts = address.split(',').map((p) => p.trim());
    const lastPart = parts[parts.length - 1] || '';
    const countryMatch = lastPart.match(/([A-Z]{2})$/);

    return {
      venueName: city,
      address: parts[0] || address,
      city,
      country: countryMatch ? countryMatch[1] : 'FR',
      postalCode: parts[1]?.match(/\d+/)?.[0] || '00000',
    };
  }

  /**
   * Map Prisma festival to response DTO
   */
  private mapToResponse(
    festival: any,
    location?: FestivalLocationDto,
    shortDescription?: string,
    tags?: string[],
  ): FestivalResponseDto {
    const parsedLocation = location || this.parseLocation(
      festival.address || '',
      festival.location || '',
    );

    return {
      id: festival.id,
      name: festival.name,
      slug: festival.slug,
      shortDescription: shortDescription || festival.description?.substring(0, 200) || '',
      description: festival.description,
      startDate: festival.startDate,
      endDate: festival.endDate,
      location: parsedLocation,
      status: festival.status as any,
      capacity: festival.maxCapacity,
      coverImage: festival.bannerUrl,
      logo: festival.logoUrl,
      primaryColor: undefined, // Not stored in current schema
      tags: tags || [],
      currency: festival.currency,
      timezone: festival.timezone,
      organizerId: festival.organizerId,
      createdAt: festival.createdAt,
      updatedAt: festival.updatedAt,
    };
  }
}
