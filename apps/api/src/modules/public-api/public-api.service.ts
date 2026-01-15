import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Prisma } from '@prisma/client';
import {
  PublicFestivalDto,
  PublicArtistDto,
  PublicStageDto,
  PublicPerformanceDto,
  PublicVenueDto,
  PublicTicketCategoryDto,
  PublicPaginatedResponseDto,
  PublicMetaDto,
  PublicFestivalsQueryDto,
  PublicArtistsQueryDto,
  PublicScheduleQueryDto,
  PublicPaginationDto,
} from './dto/public-api.dto';

@Injectable()
export class PublicApiService {
  constructor(private readonly prisma: PrismaService) {}

  // ==========================================================================
  // Festivals
  // ==========================================================================

  async getFestivals(
    query: PublicFestivalsQueryDto
  ): Promise<PublicPaginatedResponseDto<PublicFestivalDto>> {
    const { page = 1, limit = 20, status, country, search } = query;
    const skip = (page - 1) * limit;
    const now = new Date();

    const where: Prisma.FestivalWhereInput = {
      isDeleted: false,
    };

    // Status filter
    if (status === 'upcoming') {
      where.startDate = { gt: now };
    } else if (status === 'ongoing') {
      where.startDate = { lte: now };
      where.endDate = { gte: now };
    } else if (status === 'past') {
      where.endDate = { lt: now };
    }

    // Country filter
    if (country) {
      where.country = country;
    }

    // Search filter
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { city: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [festivals, total] = await Promise.all([
      this.prisma.festival.findMany({
        where,
        skip,
        take: limit,
        orderBy: { startDate: 'asc' },
        include: {
          _count: {
            select: {
              artists: true,
              stages: true,
            },
          },
        },
      }),
      this.prisma.festival.count({ where }),
    ]);

    const data: PublicFestivalDto[] = festivals.map((f) => ({
      id: f.id,
      name: f.name,
      slug: f.slug,
      description: f.description,
      websiteUrl: f.websiteUrl,
      startDate: f.startDate,
      endDate: f.endDate,
      location: f.location,
      city: f.city,
      country: f.country,
      latitude: f.latitude ? Number(f.latitude) : undefined,
      longitude: f.longitude ? Number(f.longitude) : undefined,
      coverImageUrl: f.coverImageUrl,
      logoUrl: f.logoUrl,
      isActive: f.startDate <= now && f.endDate >= now,
      artistCount: f._count.artists,
      stageCount: f._count.stages,
    }));

    return {
      data,
      meta: this.createMeta(page, limit, total),
    };
  }

  async getFestivalById(id: string): Promise<PublicFestivalDto> {
    const festival = await this.prisma.festival.findFirst({
      where: { id, isDeleted: false },
      include: {
        _count: {
          select: {
            artists: true,
            stages: true,
          },
        },
      },
    });

    if (!festival) {
      throw new NotFoundException(`Festival ${id} not found`);
    }

    const now = new Date();

    return {
      id: festival.id,
      name: festival.name,
      slug: festival.slug,
      description: festival.description,
      websiteUrl: festival.websiteUrl,
      startDate: festival.startDate,
      endDate: festival.endDate,
      location: festival.location,
      city: festival.city,
      country: festival.country,
      latitude: festival.latitude ? Number(festival.latitude) : undefined,
      longitude: festival.longitude ? Number(festival.longitude) : undefined,
      coverImageUrl: festival.coverImageUrl,
      logoUrl: festival.logoUrl,
      isActive: festival.startDate <= now && festival.endDate >= now,
      artistCount: festival._count.artists,
      stageCount: festival._count.stages,
    };
  }

  // ==========================================================================
  // Artists
  // ==========================================================================

  async getArtists(
    festivalId: string,
    query: PublicArtistsQueryDto
  ): Promise<PublicPaginatedResponseDto<PublicArtistDto>> {
    await this.validateFestival(festivalId);

    const { page = 1, limit = 20, genre, search } = query;
    const skip = (page - 1) * limit;

    const where: Prisma.ArtistWhereInput = {
      festivalId,
      isDeleted: false,
    };

    if (genre) {
      where.genre = genre;
    }

    if (search) {
      where.name = { contains: search, mode: 'insensitive' };
    }

    const [artists, total] = await Promise.all([
      this.prisma.artist.findMany({
        where,
        skip,
        take: limit,
        orderBy: { name: 'asc' },
      }),
      this.prisma.artist.count({ where }),
    ]);

    const data: PublicArtistDto[] = artists.map((a) => ({
      id: a.id,
      name: a.name,
      bio: a.bio,
      genre: a.genre,
      country: a.country,
      photoUrl: a.photoUrl,
      spotifyUrl: a.spotifyUrl,
      appleMusicUrl: a.appleMusicUrl,
      websiteUrl: a.websiteUrl,
      instagram: a.instagram,
      twitter: a.twitter,
    }));

    return {
      data,
      meta: this.createMeta(page, limit, total),
    };
  }

  async getArtistById(festivalId: string, artistId: string): Promise<PublicArtistDto> {
    await this.validateFestival(festivalId);

    const artist = await this.prisma.artist.findFirst({
      where: { id: artistId, festivalId, isDeleted: false },
    });

    if (!artist) {
      throw new NotFoundException(`Artist ${artistId} not found`);
    }

    return {
      id: artist.id,
      name: artist.name,
      bio: artist.bio,
      genre: artist.genre,
      country: artist.country,
      photoUrl: artist.photoUrl,
      spotifyUrl: artist.spotifyUrl,
      appleMusicUrl: artist.appleMusicUrl,
      websiteUrl: artist.websiteUrl,
      instagram: artist.instagram,
      twitter: artist.twitter,
    };
  }

  // ==========================================================================
  // Schedule / Performances
  // ==========================================================================

  async getSchedule(
    festivalId: string,
    query: PublicScheduleQueryDto
  ): Promise<PublicPaginatedResponseDto<PublicPerformanceDto>> {
    await this.validateFestival(festivalId);

    const { page = 1, limit = 50, date, stageId, artistId } = query;
    const skip = (page - 1) * limit;

    const where: Prisma.PerformanceWhereInput = {
      festivalId,
    };

    if (date) {
      const dayStart = new Date(date);
      const dayEnd = new Date(date);
      dayEnd.setDate(dayEnd.getDate() + 1);
      where.startTime = { gte: dayStart, lt: dayEnd };
    }

    if (stageId) {
      where.stageId = stageId;
    }

    if (artistId) {
      where.artistId = artistId;
    }

    const [performances, total] = await Promise.all([
      this.prisma.performance.findMany({
        where,
        skip,
        take: limit,
        orderBy: { startTime: 'asc' },
        include: {
          artist: { select: { id: true, name: true } },
          stage: { select: { id: true, name: true } },
        },
      }),
      this.prisma.performance.count({ where }),
    ]);

    const data: PublicPerformanceDto[] = performances.map((p) => ({
      id: p.id,
      stageId: p.stageId,
      stageName: p.stage.name,
      artistId: p.artistId,
      artistName: p.artist.name,
      startTime: p.startTime,
      endTime: p.endTime,
      description: p.description,
      isHeadliner: p.isHeadliner,
    }));

    return {
      data,
      meta: this.createMeta(page, limit, total),
    };
  }

  // ==========================================================================
  // Stages
  // ==========================================================================

  async getStages(
    festivalId: string,
    query: PublicPaginationDto
  ): Promise<PublicPaginatedResponseDto<PublicStageDto>> {
    await this.validateFestival(festivalId);

    const { page = 1, limit = 20 } = query;
    const skip = (page - 1) * limit;

    const [stages, total] = await Promise.all([
      this.prisma.stage.findMany({
        where: { festivalId },
        skip,
        take: limit,
        orderBy: { name: 'asc' },
      }),
      this.prisma.stage.count({ where: { festivalId } }),
    ]);

    const data: PublicStageDto[] = stages.map((s) => ({
      id: s.id,
      name: s.name,
      description: s.description,
      capacity: s.capacity,
      location: s.location,
      imageUrl: s.imageUrl,
    }));

    return {
      data,
      meta: this.createMeta(page, limit, total),
    };
  }

  // ==========================================================================
  // Venues / POIs
  // ==========================================================================

  async getVenues(
    festivalId: string,
    query: PublicPaginationDto
  ): Promise<PublicPaginatedResponseDto<PublicVenueDto>> {
    await this.validateFestival(festivalId);

    const { page = 1, limit = 50 } = query;
    const skip = (page - 1) * limit;

    const [pois, total] = await Promise.all([
      this.prisma.poi.findMany({
        where: { festivalId },
        skip,
        take: limit,
        orderBy: { name: 'asc' },
      }),
      this.prisma.poi.count({ where: { festivalId } }),
    ]);

    const data: PublicVenueDto[] = pois.map((p) => ({
      id: p.id,
      name: p.name,
      type: p.type,
      description: p.description,
      latitude: p.latitude ? Number(p.latitude) : undefined,
      longitude: p.longitude ? Number(p.longitude) : undefined,
      icon: p.icon,
    }));

    return {
      data,
      meta: this.createMeta(page, limit, total),
    };
  }

  // ==========================================================================
  // Ticket Categories (available for purchase)
  // ==========================================================================

  async getTicketCategories(festivalId: string): Promise<PublicTicketCategoryDto[]> {
    await this.validateFestival(festivalId);

    const now = new Date();

    const categories = await this.prisma.ticketCategory.findMany({
      where: {
        festivalId,
        isDeleted: false,
        isActive: true,
      },
      orderBy: { price: 'asc' },
    });

    return categories.map((c) => {
      const saleStart = c.saleStartDate ? new Date(c.saleStartDate) : null;
      const saleEnd = c.saleEndDate ? new Date(c.saleEndDate) : null;

      const isOnSale = (!saleStart || saleStart <= now) && (!saleEnd || saleEnd >= now);

      const remaining = c.maxQuantity !== null ? c.maxQuantity - (c.soldCount || 0) : undefined;

      return {
        id: c.id,
        name: c.name,
        description: c.description,
        price: c.price,
        currency: c.currency,
        available: isOnSale && (remaining === undefined || remaining > 0),
        remaining,
        saleStart: saleStart || undefined,
        saleEnd: saleEnd || undefined,
      };
    });
  }

  // ==========================================================================
  // Helper Methods
  // ==========================================================================

  private async validateFestival(festivalId: string): Promise<void> {
    const festival = await this.prisma.festival.findFirst({
      where: { id: festivalId, isDeleted: false },
      select: { id: true },
    });

    if (!festival) {
      throw new NotFoundException(`Festival ${festivalId} not found`);
    }
  }

  private createMeta(page: number, limit: number, total: number): PublicMetaDto {
    const totalPages = Math.ceil(total / limit);

    return {
      page,
      limit,
      total,
      totalPages,
      hasNextPage: page < totalPages,
      hasPreviousPage: page > 1,
    };
  }
}
