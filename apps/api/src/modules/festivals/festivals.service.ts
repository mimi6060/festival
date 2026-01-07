import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateFestivalDto, UpdateFestivalDto, FestivalQueryDto, FestivalStatus } from './dto';
import { FestivalStatus as PrismaFestivalStatus } from '@prisma/client';

@Injectable()
export class FestivalsService {
  private readonly logger = new Logger(FestivalsService.name);

  constructor(private readonly prisma: PrismaService) {}

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
   */
  async findAll(query: FestivalQueryDto) {
    const { page = 1, limit = 10, status, search, organizerId } = query;
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
          _count: {
            select: { tickets: true, ticketCategories: true },
          },
        },
      }),
      this.prisma.festival.count({ where }),
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
   * Find a festival by ID
   */
  async findOne(id: string) {
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

    return festival;
  }

  /**
   * Find a festival by slug
   */
  async findBySlug(slug: string) {
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

    return this.prisma.festival.update({
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
  }

  /**
   * Update festival status
   */
  async updateStatus(id: string, status: FestivalStatus, userId: string) {
    const festival = await this.findOne(id);

    if (festival.organizerId !== userId) {
      throw new ForbiddenException('You do not have permission to update this festival');
    }

    return this.prisma.festival.update({
      where: { id },
      data: { status: status as PrismaFestivalStatus },
    });
  }

  /**
   * Soft delete a festival
   */
  async remove(id: string, userId: string) {
    const festival = await this.findOne(id);

    if (festival.organizerId !== userId) {
      throw new ForbiddenException('You do not have permission to delete this festival');
    }

    return this.prisma.festival.update({
      where: { id },
      data: {
        isDeleted: true,
        deletedAt: new Date(),
      },
    });
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
}
