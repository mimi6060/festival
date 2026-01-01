import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  ConflictException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma, Festival, FestivalStatus, UserRole } from '@prisma/client';
import { CreateFestivalDto } from './dto/create-festival.dto';
import { UpdateFestivalDto, UpdateFestivalStatusDto } from './dto/update-festival.dto';
import { FestivalQueryDto, FestivalSortField, SortOrder } from './dto/festival-query.dto';
import {
  FestivalResponseDto,
  FestivalStatsDto,
  PaginatedFestivalsDto,
  CategorySalesDto,
  CashlessStatsDto,
} from './dto/festival-response.dto';
import { AuthenticatedUser } from '../auth/decorators/current-user.decorator';

@Injectable()
export class FestivalService {
  private readonly logger = new Logger(FestivalService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Generate a unique slug from the festival name
   */
  private async generateUniqueSlug(name: string, existingSlug?: string): Promise<string> {
    // Convert name to slug format
    let baseSlug = name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // Remove accents
      .replace(/[^a-z0-9]+/g, '-') // Replace non-alphanumeric with hyphens
      .replace(/^-+|-+$/g, '') // Remove leading/trailing hyphens
      .substring(0, 200); // Limit length

    if (!baseSlug) {
      baseSlug = 'festival';
    }

    // Check if the base slug is unique
    let slug = baseSlug;
    let counter = 1;

    while (true) {
      const existing = await this.prisma.festival.findUnique({
        where: { slug },
        select: { id: true },
      });

      if (!existing || (existingSlug && slug === existingSlug)) {
        break;
      }

      slug = `${baseSlug}-${counter}`;
      counter++;

      if (counter > 1000) {
        // Safety limit
        slug = `${baseSlug}-${Date.now()}`;
        break;
      }
    }

    return slug;
  }

  /**
   * Create a new festival
   */
  async create(
    createFestivalDto: CreateFestivalDto,
    organizerId: string,
  ): Promise<Festival> {
    this.logger.log(`Creating festival: ${createFestivalDto.name} by organizer ${organizerId}`);

    // Validate dates
    const startDate = new Date(createFestivalDto.startDate);
    const endDate = new Date(createFestivalDto.endDate);

    if (endDate <= startDate) {
      throw new BadRequestException('End date must be after start date');
    }

    // Generate unique slug if not provided
    const slug = createFestivalDto.slug
      ? await this.ensureUniqueSlug(createFestivalDto.slug)
      : await this.generateUniqueSlug(createFestivalDto.name);

    try {
      const festival = await this.prisma.festival.create({
        data: {
          organizerId,
          name: createFestivalDto.name,
          slug,
          description: createFestivalDto.description,
          location: createFestivalDto.location,
          address: createFestivalDto.address,
          startDate,
          endDate,
          maxCapacity: createFestivalDto.maxCapacity,
          logoUrl: createFestivalDto.logoUrl,
          bannerUrl: createFestivalDto.bannerUrl,
          websiteUrl: createFestivalDto.websiteUrl,
          contactEmail: createFestivalDto.contactEmail,
          timezone: createFestivalDto.timezone ?? 'Europe/Paris',
          currency: createFestivalDto.currency ?? 'EUR',
          status: createFestivalDto.status ?? FestivalStatus.DRAFT,
        },
      });

      this.logger.log(`Festival created with ID: ${festival.id}`);
      return festival;
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2002') {
          throw new ConflictException('A festival with this slug already exists');
        }
      }
      throw error;
    }
  }

  /**
   * Ensure a custom slug is unique
   */
  private async ensureUniqueSlug(slug: string): Promise<string> {
    const existing = await this.prisma.festival.findUnique({
      where: { slug },
      select: { id: true },
    });

    if (existing) {
      throw new ConflictException(`Slug "${slug}" is already taken`);
    }

    return slug;
  }

  /**
   * Find all festivals with filters and pagination
   */
  async findAll(query: FestivalQueryDto, user?: AuthenticatedUser): Promise<PaginatedFestivalsDto> {
    const {
      page = 1,
      limit = 10,
      sortBy = FestivalSortField.START_DATE,
      sortOrder = SortOrder.ASC,
      search,
      status,
      statuses,
      startDateFrom,
      startDateTo,
      endDateFrom,
      endDateTo,
      organizerId,
      location,
      upcoming,
      ongoing,
      past,
      includeDeleted = false,
    } = query;

    const where: Prisma.FestivalWhereInput = {};

    // Soft delete filter - admins can see deleted, others cannot
    if (!includeDeleted || user?.role !== UserRole.ADMIN) {
      where.isDeleted = false;
    }

    // Status filter for public queries - only show published/ongoing
    if (!user || user.role === UserRole.USER) {
      where.status = { in: [FestivalStatus.PUBLISHED, FestivalStatus.ONGOING] };
    } else if (status) {
      where.status = status as FestivalStatus;
    } else if (statuses && statuses.length > 0) {
      where.status = { in: statuses as FestivalStatus[] };
    }

    // Search filter
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { location: { contains: search, mode: 'insensitive' } },
      ];
    }

    // Date filters
    const now = new Date();

    if (startDateFrom || startDateTo) {
      where.startDate = {};
      if (startDateFrom) where.startDate.gte = new Date(startDateFrom);
      if (startDateTo) where.startDate.lte = new Date(startDateTo);
    }

    if (endDateFrom || endDateTo) {
      where.endDate = {};
      if (endDateFrom) where.endDate.gte = new Date(endDateFrom);
      if (endDateTo) where.endDate.lte = new Date(endDateTo);
    }

    // Convenience date filters
    if (upcoming) {
      where.startDate = { gt: now };
    }

    if (ongoing) {
      where.AND = [
        { startDate: { lte: now } },
        { endDate: { gte: now } },
      ];
    }

    if (past) {
      where.endDate = { lt: now };
    }

    // Organizer filter
    if (organizerId) {
      where.organizerId = organizerId;
    }

    // Location filter
    if (location) {
      where.location = { contains: location, mode: 'insensitive' };
    }

    // Build sort order
    const orderBy: Prisma.FestivalOrderByWithRelationInput = {
      [sortBy]: sortOrder,
    };

    // Execute query with pagination
    const skip = (page - 1) * limit;

    const [festivals, total] = await Promise.all([
      this.prisma.festival.findMany({
        where,
        orderBy,
        skip,
        take: limit,
        include: {
          organizer: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: user?.role === UserRole.ADMIN ? true : false,
            },
          },
        },
      }),
      this.prisma.festival.count({ where }),
    ]);

    const totalPages = Math.ceil(total / limit);

    // Transform to response DTOs with computed fields
    const data = festivals.map((festival) => this.toResponseDto(festival));

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
      },
    };
  }

  /**
   * Find a festival by ID
   */
  async findOne(id: string, user?: AuthenticatedUser): Promise<FestivalResponseDto> {
    const festival = await this.prisma.festival.findUnique({
      where: { id },
      include: {
        organizer: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });

    if (!festival) {
      throw new NotFoundException(`Festival with ID "${id}" not found`);
    }

    // Check visibility for non-admins
    if (!user || user.role === UserRole.USER) {
      if (festival.isDeleted) {
        throw new NotFoundException(`Festival with ID "${id}" not found`);
      }
      if (festival.status === FestivalStatus.DRAFT || festival.status === FestivalStatus.CANCELLED) {
        throw new NotFoundException(`Festival with ID "${id}" not found`);
      }
    }

    // Hide organizer email for non-admins and non-owners
    if (user?.role !== UserRole.ADMIN && user?.id !== festival.organizerId) {
      (festival.organizer as { email?: string }).email = undefined;
    }

    return this.toResponseDto(festival);
  }

  /**
   * Find a festival by slug
   */
  async findBySlug(slug: string, user?: AuthenticatedUser): Promise<FestivalResponseDto> {
    const festival = await this.prisma.festival.findUnique({
      where: { slug },
      include: {
        organizer: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });

    if (!festival) {
      throw new NotFoundException(`Festival with slug "${slug}" not found`);
    }

    // Apply same visibility rules as findOne
    if (!user || user.role === UserRole.USER) {
      if (festival.isDeleted) {
        throw new NotFoundException(`Festival with slug "${slug}" not found`);
      }
      if (festival.status === FestivalStatus.DRAFT || festival.status === FestivalStatus.CANCELLED) {
        throw new NotFoundException(`Festival with slug "${slug}" not found`);
      }
    }

    if (user?.role !== UserRole.ADMIN && user?.id !== festival.organizerId) {
      (festival.organizer as { email?: string }).email = undefined;
    }

    return this.toResponseDto(festival);
  }

  /**
   * Update a festival
   */
  async update(
    id: string,
    updateFestivalDto: UpdateFestivalDto,
    user: AuthenticatedUser,
  ): Promise<FestivalResponseDto> {
    const festival = await this.prisma.festival.findUnique({
      where: { id },
    });

    if (!festival) {
      throw new NotFoundException(`Festival with ID "${id}" not found`);
    }

    // Check ownership (admin can update any)
    if (user.role !== UserRole.ADMIN && festival.organizerId !== user.id) {
      throw new ForbiddenException('You can only update your own festivals');
    }

    // Validate dates if provided
    let startDate = festival.startDate;
    let endDate = festival.endDate;

    if (updateFestivalDto.startDate) {
      startDate = new Date(updateFestivalDto.startDate);
    }
    if (updateFestivalDto.endDate) {
      endDate = new Date(updateFestivalDto.endDate);
    }

    if (endDate <= startDate) {
      throw new BadRequestException('End date must be after start date');
    }

    // Handle slug update
    let slug = festival.slug;
    if (updateFestivalDto.slug && updateFestivalDto.slug !== festival.slug) {
      await this.ensureUniqueSlug(updateFestivalDto.slug);
      slug = updateFestivalDto.slug;
    } else if (updateFestivalDto.name && updateFestivalDto.name !== festival.name && !updateFestivalDto.slug) {
      // Auto-generate new slug if name changed and no explicit slug provided
      slug = await this.generateUniqueSlug(updateFestivalDto.name, festival.slug);
    }

    const updatedFestival = await this.prisma.festival.update({
      where: { id },
      data: {
        name: updateFestivalDto.name,
        slug,
        description: updateFestivalDto.description,
        location: updateFestivalDto.location,
        address: updateFestivalDto.address,
        startDate: updateFestivalDto.startDate ? new Date(updateFestivalDto.startDate) : undefined,
        endDate: updateFestivalDto.endDate ? new Date(updateFestivalDto.endDate) : undefined,
        maxCapacity: updateFestivalDto.maxCapacity,
        logoUrl: updateFestivalDto.logoUrl,
        bannerUrl: updateFestivalDto.bannerUrl,
        websiteUrl: updateFestivalDto.websiteUrl,
        contactEmail: updateFestivalDto.contactEmail,
        timezone: updateFestivalDto.timezone,
        currency: updateFestivalDto.currency,
      },
      include: {
        organizer: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });

    this.logger.log(`Festival ${id} updated by user ${user.id}`);
    return this.toResponseDto(updatedFestival);
  }

  /**
   * Soft delete a festival (admin only)
   */
  async remove(id: string, user: AuthenticatedUser): Promise<void> {
    const festival = await this.prisma.festival.findUnique({
      where: { id },
    });

    if (!festival) {
      throw new NotFoundException(`Festival with ID "${id}" not found`);
    }

    // Only admin can delete
    if (user.role !== UserRole.ADMIN) {
      throw new ForbiddenException('Only administrators can delete festivals');
    }

    // Soft delete
    await this.prisma.festival.update({
      where: { id },
      data: {
        isDeleted: true,
        deletedAt: new Date(),
        status: FestivalStatus.CANCELLED,
      },
    });

    this.logger.log(`Festival ${id} soft-deleted by admin ${user.id}`);
  }

  /**
   * Update festival status
   */
  async updateStatus(
    id: string,
    updateStatusDto: UpdateFestivalStatusDto,
    user: AuthenticatedUser,
  ): Promise<FestivalResponseDto> {
    const festival = await this.prisma.festival.findUnique({
      where: { id },
    });

    if (!festival) {
      throw new NotFoundException(`Festival with ID "${id}" not found`);
    }

    // Check ownership (admin can update any)
    if (user.role !== UserRole.ADMIN && festival.organizerId !== user.id) {
      throw new ForbiddenException('You can only update your own festivals');
    }

    // Validate status transitions
    this.validateStatusTransition(festival.status, updateStatusDto.status);

    const updatedFestival = await this.prisma.festival.update({
      where: { id },
      data: { status: updateStatusDto.status },
      include: {
        organizer: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });

    this.logger.log(`Festival ${id} status changed to ${updateStatusDto.status} by user ${user.id}`);
    return this.toResponseDto(updatedFestival);
  }

  /**
   * Publish a festival (shortcut for status update to PUBLISHED)
   */
  async publish(id: string, user: AuthenticatedUser): Promise<FestivalResponseDto> {
    const festival = await this.prisma.festival.findUnique({
      where: { id },
    });

    if (!festival) {
      throw new NotFoundException(`Festival with ID "${id}" not found`);
    }

    // Check ownership
    if (user.role !== UserRole.ADMIN && festival.organizerId !== user.id) {
      throw new ForbiddenException('You can only publish your own festivals');
    }

    // Can only publish from DRAFT status
    if (festival.status !== FestivalStatus.DRAFT) {
      throw new BadRequestException(
        `Cannot publish festival. Current status is ${festival.status}, expected DRAFT`,
      );
    }

    // Validate festival has required fields for publishing
    if (!festival.name || !festival.location || !festival.startDate || !festival.endDate) {
      throw new BadRequestException('Festival must have name, location, and dates to be published');
    }

    const updatedFestival = await this.prisma.festival.update({
      where: { id },
      data: { status: FestivalStatus.PUBLISHED },
      include: {
        organizer: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });

    this.logger.log(`Festival ${id} published by user ${user.id}`);
    return this.toResponseDto(updatedFestival);
  }

  /**
   * Get festival statistics (owner or admin only)
   */
  async getStats(id: string, user: AuthenticatedUser): Promise<FestivalStatsDto> {
    const festival = await this.prisma.festival.findUnique({
      where: { id },
      include: {
        ticketCategories: true,
        tickets: {
          include: {
            category: true,
          },
        },
        zones: true,
        staffAssignments: true,
        cashlessTransactions: true,
      },
    });

    if (!festival) {
      throw new NotFoundException(`Festival with ID "${id}" not found`);
    }

    // Check ownership
    if (user.role !== UserRole.ADMIN && festival.organizerId !== user.id) {
      throw new ForbiddenException('You can only view stats for your own festivals');
    }

    // Calculate ticket stats
    const ticketsSold = festival.tickets.filter(
      (t) => t.status === 'SOLD' || t.status === 'USED',
    ).length;
    const ticketsUsed = festival.tickets.filter((t) => t.status === 'USED').length;
    const ticketsRefunded = festival.tickets.filter((t) => t.status === 'REFUNDED').length;
    const ticketsCancelled = festival.tickets.filter((t) => t.status === 'CANCELLED').length;

    // Calculate total revenue
    const totalRevenue = festival.tickets
      .filter((t) => t.status === 'SOLD' || t.status === 'USED')
      .reduce((sum, t) => sum + Number(t.purchasePrice), 0);

    const averageTicketPrice = ticketsSold > 0 ? totalRevenue / ticketsSold : 0;

    // Calculate total available tickets from categories
    const totalTicketsAvailable = festival.ticketCategories.reduce(
      (sum, cat) => sum + cat.quota,
      0,
    );

    // Calculate sales by category
    const salesByCategory: CategorySalesDto[] = festival.ticketCategories.map((category) => {
      const categoryTickets = festival.tickets.filter(
        (t) =>
          t.categoryId === category.id &&
          (t.status === 'SOLD' || t.status === 'USED'),
      );
      const revenue = categoryTickets.reduce(
        (sum, t) => sum + Number(t.purchasePrice),
        0,
      );

      return {
        categoryId: category.id,
        categoryName: category.name,
        sold: categoryTickets.length,
        quota: category.quota,
        revenue,
      };
    });

    // Calculate cashless stats
    const cashlessStats: CashlessStatsDto = {
      totalTransactions: festival.cashlessTransactions.length,
      totalTopups: festival.cashlessTransactions
        .filter((t) => t.type === 'TOPUP')
        .reduce((sum, t) => sum + Number(t.amount), 0),
      totalPayments: festival.cashlessTransactions
        .filter((t) => t.type === 'PAYMENT')
        .reduce((sum, t) => sum + Math.abs(Number(t.amount)), 0),
      totalRefunds: festival.cashlessTransactions
        .filter((t) => t.type === 'REFUND')
        .reduce((sum, t) => sum + Number(t.amount), 0),
    };

    return {
      festivalId: id,
      ticketsSold,
      totalTicketsAvailable,
      ticketsUsed,
      ticketsRefunded,
      ticketsCancelled,
      totalRevenue,
      currency: festival.currency,
      averageTicketPrice,
      salesByCategory,
      capacityUtilization:
        festival.maxCapacity > 0
          ? (ticketsSold / festival.maxCapacity) * 100
          : 0,
      zonesCount: festival.zones.length,
      staffCount: festival.staffAssignments.length,
      cashlessStats,
    };
  }

  /**
   * Validate status transitions
   */
  private validateStatusTransition(
    currentStatus: FestivalStatus,
    newStatus: FestivalStatus,
  ): void {
    const validTransitions: Record<FestivalStatus, FestivalStatus[]> = {
      [FestivalStatus.DRAFT]: [FestivalStatus.PUBLISHED, FestivalStatus.CANCELLED],
      [FestivalStatus.PUBLISHED]: [
        FestivalStatus.ONGOING,
        FestivalStatus.CANCELLED,
        FestivalStatus.DRAFT,
      ],
      [FestivalStatus.ONGOING]: [FestivalStatus.COMPLETED, FestivalStatus.CANCELLED],
      [FestivalStatus.COMPLETED]: [], // No transitions from completed
      [FestivalStatus.CANCELLED]: [FestivalStatus.DRAFT], // Can revert to draft
    };

    const allowed = validTransitions[currentStatus];

    if (!allowed.includes(newStatus)) {
      throw new BadRequestException(
        `Cannot transition from ${currentStatus} to ${newStatus}. ` +
          `Allowed transitions: ${allowed.length > 0 ? allowed.join(', ') : 'none'}`,
      );
    }
  }

  /**
   * Transform database entity to response DTO
   */
  private toResponseDto(festival: Festival & { organizer?: { id: string; firstName: string; lastName: string; email?: string } }): FestivalResponseDto {
    const now = new Date();
    const startDate = new Date(festival.startDate);
    const endDate = new Date(festival.endDate);

    const isOngoing = startDate <= now && now <= endDate;
    const daysUntilStart = Math.ceil(
      (startDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
    );

    return {
      id: festival.id,
      name: festival.name,
      slug: festival.slug,
      description: festival.description ?? undefined,
      location: festival.location,
      address: festival.address ?? undefined,
      startDate: festival.startDate,
      endDate: festival.endDate,
      status: festival.status as FestivalStatus,
      maxCapacity: festival.maxCapacity,
      currentAttendees: festival.currentAttendees,
      logoUrl: festival.logoUrl ?? undefined,
      bannerUrl: festival.bannerUrl ?? undefined,
      websiteUrl: festival.websiteUrl ?? undefined,
      contactEmail: festival.contactEmail ?? undefined,
      timezone: festival.timezone,
      currency: festival.currency,
      createdAt: festival.createdAt,
      updatedAt: festival.updatedAt,
      organizer: festival.organizer
        ? {
            id: festival.organizer.id,
            firstName: festival.organizer.firstName,
            lastName: festival.organizer.lastName,
            email: festival.organizer.email,
          }
        : undefined,
      availableCapacity: festival.maxCapacity - festival.currentAttendees,
      capacityUtilization:
        festival.maxCapacity > 0
          ? (festival.currentAttendees / festival.maxCapacity) * 100
          : 0,
      isOngoing,
      daysUntilStart,
    };
  }
}
