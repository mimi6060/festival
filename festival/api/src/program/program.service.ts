import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma, Artist, Stage, Performance } from '@prisma/client';
import { CacheService, CACHE_KEYS, CACHE_TTL } from '../cache';
import {
  CreateArtistDto,
  UpdateArtistDto,
  ArtistQueryDto,
  ArtistResponseDto,
  PaginatedArtistsDto,
} from './dto/artist.dto';
import {
  CreateStageDto,
  UpdateStageDto,
  StageQueryDto,
  StageResponseDto,
  PaginatedStagesDto,
} from './dto/stage.dto';
import {
  CreatePerformanceDto,
  UpdatePerformanceDto,
  PerformanceQueryDto,
  PerformanceResponseDto,
  PaginatedPerformancesDto,
} from './dto/performance.dto';
import {
  FestivalProgramDto,
  ProgramByDayDto,
  ProgramByStageDto,
  ProgramPerformanceDto,
  DayScheduleDto,
  StageScheduleDto,
} from './dto/program.dto';

@Injectable()
export class ProgramService {
  private readonly logger = new Logger(ProgramService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly cacheService: CacheService,
  ) {}

  // ==================== ARTISTS ====================

  /**
   * Create a new artist
   */
  async createArtist(dto: CreateArtistDto): Promise<ArtistResponseDto> {
    this.logger.log(`Creating artist: ${dto.name}`);

    const artist = await this.prisma.artist.create({
      data: {
        name: dto.name,
        genre: dto.genre,
        bio: dto.bio,
        imageUrl: dto.imageUrl,
        spotifyUrl: dto.spotifyUrl,
        instagramUrl: dto.instagramUrl,
        websiteUrl: dto.websiteUrl,
      },
    });

    return this.toArtistResponse(artist);
  }

  /**
   * Find all artists with filters and pagination
   */
  async findAllArtists(query: ArtistQueryDto): Promise<PaginatedArtistsDto> {
    const { search, genre, page = 1, limit = 20 } = query;

    const where: Prisma.ArtistWhereInput = {};

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { genre: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (genre) {
      where.genre = { contains: genre, mode: 'insensitive' };
    }

    const skip = (page - 1) * limit;

    const [artists, total] = await Promise.all([
      this.prisma.artist.findMany({
        where,
        orderBy: { name: 'asc' },
        skip,
        take: limit,
      }),
      this.prisma.artist.count({ where }),
    ]);

    const totalPages = Math.ceil(total / limit);

    return {
      data: artists.map((a) => this.toArtistResponse(a)),
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
   * Find an artist by ID
   */
  async findArtistById(id: string): Promise<ArtistResponseDto> {
    const artist = await this.prisma.artist.findUnique({
      where: { id },
    });

    if (!artist) {
      throw new NotFoundException(`Artist with ID "${id}" not found`);
    }

    return this.toArtistResponse(artist);
  }

  /**
   * Update an artist
   */
  async updateArtist(id: string, dto: UpdateArtistDto): Promise<ArtistResponseDto> {
    await this.findArtistById(id); // Ensure exists

    const artist = await this.prisma.artist.update({
      where: { id },
      data: {
        name: dto.name,
        genre: dto.genre,
        bio: dto.bio,
        imageUrl: dto.imageUrl,
        spotifyUrl: dto.spotifyUrl,
        instagramUrl: dto.instagramUrl,
        websiteUrl: dto.websiteUrl,
      },
    });

    this.logger.log(`Artist ${id} updated`);
    return this.toArtistResponse(artist);
  }

  /**
   * Delete an artist
   */
  async deleteArtist(id: string): Promise<void> {
    await this.findArtistById(id); // Ensure exists

    // Check if artist has performances
    const performanceCount = await this.prisma.performance.count({
      where: { artistId: id },
    });

    if (performanceCount > 0) {
      throw new BadRequestException(
        `Cannot delete artist with ${performanceCount} scheduled performances. Remove performances first.`,
      );
    }

    await this.prisma.artist.delete({ where: { id } });
    this.logger.log(`Artist ${id} deleted`);
  }

  private toArtistResponse(artist: Artist): ArtistResponseDto {
    return {
      id: artist.id,
      name: artist.name,
      genre: artist.genre ?? undefined,
      bio: artist.bio ?? undefined,
      imageUrl: artist.imageUrl ?? undefined,
      spotifyUrl: artist.spotifyUrl ?? undefined,
      instagramUrl: artist.instagramUrl ?? undefined,
      websiteUrl: artist.websiteUrl ?? undefined,
      createdAt: artist.createdAt,
      updatedAt: artist.updatedAt,
    };
  }

  // ==================== STAGES ====================

  /**
   * Create a new stage for a festival
   */
  async createStage(festivalId: string, dto: CreateStageDto): Promise<StageResponseDto> {
    this.logger.log(`Creating stage: ${dto.name} for festival ${festivalId}`);

    // Verify festival exists
    const festival = await this.prisma.festival.findUnique({
      where: { id: festivalId },
    });

    if (!festival) {
      throw new NotFoundException(`Festival with ID "${festivalId}" not found`);
    }

    try {
      const stage = await this.prisma.stage.create({
        data: {
          festivalId,
          name: dto.name,
          description: dto.description,
          capacity: dto.capacity,
          location: dto.location,
        },
      });

      return this.toStageResponse(stage);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2002') {
          throw new ConflictException(
            `A stage named "${dto.name}" already exists for this festival`,
          );
        }
      }
      throw error;
    }
  }

  /**
   * Find all stages for a festival
   */
  async findAllStages(festivalId: string, query: StageQueryDto): Promise<PaginatedStagesDto> {
    const { search, page = 1, limit = 20 } = query;

    const where: Prisma.StageWhereInput = {
      festivalId,
    };

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { location: { contains: search, mode: 'insensitive' } },
      ];
    }

    const skip = (page - 1) * limit;

    const [stages, total] = await Promise.all([
      this.prisma.stage.findMany({
        where,
        orderBy: { name: 'asc' },
        skip,
        take: limit,
      }),
      this.prisma.stage.count({ where }),
    ]);

    const totalPages = Math.ceil(total / limit);

    return {
      data: stages.map((s) => this.toStageResponse(s)),
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
   * Find a stage by ID
   */
  async findStageById(festivalId: string, stageId: string): Promise<StageResponseDto> {
    const stage = await this.prisma.stage.findFirst({
      where: { id: stageId, festivalId },
    });

    if (!stage) {
      throw new NotFoundException(`Stage with ID "${stageId}" not found in festival`);
    }

    return this.toStageResponse(stage);
  }

  /**
   * Update a stage
   */
  async updateStage(
    festivalId: string,
    stageId: string,
    dto: UpdateStageDto,
  ): Promise<StageResponseDto> {
    await this.findStageById(festivalId, stageId); // Ensure exists

    try {
      const stage = await this.prisma.stage.update({
        where: { id: stageId },
        data: {
          name: dto.name,
          description: dto.description,
          capacity: dto.capacity,
          location: dto.location,
        },
      });

      this.logger.log(`Stage ${stageId} updated`);
      return this.toStageResponse(stage);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2002') {
          throw new ConflictException(
            `A stage named "${dto.name}" already exists for this festival`,
          );
        }
      }
      throw error;
    }
  }

  /**
   * Delete a stage
   */
  async deleteStage(festivalId: string, stageId: string): Promise<void> {
    await this.findStageById(festivalId, stageId); // Ensure exists

    // Check if stage has performances
    const performanceCount = await this.prisma.performance.count({
      where: { stageId },
    });

    if (performanceCount > 0) {
      throw new BadRequestException(
        `Cannot delete stage with ${performanceCount} scheduled performances. Remove performances first.`,
      );
    }

    await this.prisma.stage.delete({ where: { id: stageId } });
    this.logger.log(`Stage ${stageId} deleted`);
  }

  private toStageResponse(stage: Stage): StageResponseDto {
    return {
      id: stage.id,
      festivalId: stage.festivalId,
      name: stage.name,
      description: stage.description ?? undefined,
      capacity: stage.capacity ?? undefined,
      location: stage.location ?? undefined,
      createdAt: stage.createdAt,
      updatedAt: stage.updatedAt,
    };
  }

  // ==================== PERFORMANCES ====================

  /**
   * Create a new performance
   */
  async createPerformance(
    festivalId: string,
    dto: CreatePerformanceDto,
  ): Promise<PerformanceResponseDto> {
    this.logger.log(`Creating performance for festival ${festivalId}`);

    // Verify stage belongs to the festival
    const stage = await this.prisma.stage.findFirst({
      where: { id: dto.stageId, festivalId },
    });

    if (!stage) {
      throw new NotFoundException(
        `Stage with ID "${dto.stageId}" not found in festival "${festivalId}"`,
      );
    }

    // Verify artist exists
    const artist = await this.prisma.artist.findUnique({
      where: { id: dto.artistId },
    });

    if (!artist) {
      throw new NotFoundException(`Artist with ID "${dto.artistId}" not found`);
    }

    // Validate times
    const startTime = new Date(dto.startTime);
    const endTime = new Date(dto.endTime);

    if (endTime <= startTime) {
      throw new BadRequestException('End time must be after start time');
    }

    // Check for overlapping performances on the same stage
    const overlapping = await this.prisma.performance.findFirst({
      where: {
        stageId: dto.stageId,
        isCancelled: false,
        OR: [
          {
            startTime: { lt: endTime },
            endTime: { gt: startTime },
          },
        ],
      },
    });

    if (overlapping) {
      throw new ConflictException(
        'This performance overlaps with an existing performance on the same stage',
      );
    }

    const performance = await this.prisma.performance.create({
      data: {
        artistId: dto.artistId,
        stageId: dto.stageId,
        startTime,
        endTime,
        description: dto.description,
      },
      include: {
        artist: true,
        stage: true,
      },
    });

    // Invalidate program cache for this festival
    await this.invalidateProgramCache(festivalId);

    return this.toPerformanceResponse(performance);
  }

  /**
   * Find all performances for a festival
   */
  async findAllPerformances(
    festivalId: string,
    query: PerformanceQueryDto,
  ): Promise<PaginatedPerformancesDto> {
    const { artistId, stageId, dateFrom, dateTo, includeCancelled, page = 1, limit = 50 } = query;

    // Get all stage IDs for this festival
    const stages = await this.prisma.stage.findMany({
      where: { festivalId },
      select: { id: true },
    });

    const stageIds = stages.map((s) => s.id);

    if (stageIds.length === 0) {
      return {
        data: [],
        meta: {
          total: 0,
          page,
          limit,
          totalPages: 0,
          hasNextPage: false,
          hasPreviousPage: false,
        },
      };
    }

    const where: Prisma.PerformanceWhereInput = {
      stageId: stageId ? stageId : { in: stageIds },
    };

    if (artistId) {
      where.artistId = artistId;
    }

    if (!includeCancelled) {
      where.isCancelled = false;
    }

    if (dateFrom || dateTo) {
      where.startTime = {};
      if (dateFrom) where.startTime.gte = new Date(dateFrom);
      if (dateTo) where.startTime.lte = new Date(dateTo);
    }

    const skip = (page - 1) * limit;

    const [performances, total] = await Promise.all([
      this.prisma.performance.findMany({
        where,
        orderBy: { startTime: 'asc' },
        skip,
        take: limit,
        include: {
          artist: true,
          stage: true,
        },
      }),
      this.prisma.performance.count({ where }),
    ]);

    const totalPages = Math.ceil(total / limit);

    return {
      data: performances.map((p) => this.toPerformanceResponse(p)),
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
   * Find a performance by ID
   */
  async findPerformanceById(
    festivalId: string,
    performanceId: string,
  ): Promise<PerformanceResponseDto> {
    const performance = await this.prisma.performance.findUnique({
      where: { id: performanceId },
      include: {
        artist: true,
        stage: true,
      },
    });

    if (!performance || performance.stage.festivalId !== festivalId) {
      throw new NotFoundException(`Performance with ID "${performanceId}" not found in festival`);
    }

    return this.toPerformanceResponse(performance);
  }

  /**
   * Update a performance
   */
  async updatePerformance(
    festivalId: string,
    performanceId: string,
    dto: UpdatePerformanceDto,
  ): Promise<PerformanceResponseDto> {
    const existing = await this.findPerformanceById(festivalId, performanceId);

    // If changing stage, verify it belongs to the festival
    if (dto.stageId && dto.stageId !== existing.stageId) {
      const stage = await this.prisma.stage.findFirst({
        where: { id: dto.stageId, festivalId },
      });

      if (!stage) {
        throw new NotFoundException(`Stage with ID "${dto.stageId}" not found in festival`);
      }
    }

    // If changing artist, verify it exists
    if (dto.artistId && dto.artistId !== existing.artistId) {
      const artist = await this.prisma.artist.findUnique({
        where: { id: dto.artistId },
      });

      if (!artist) {
        throw new NotFoundException(`Artist with ID "${dto.artistId}" not found`);
      }
    }

    // Validate times if provided
    const startTime = dto.startTime ? new Date(dto.startTime) : existing.startTime;
    const endTime = dto.endTime ? new Date(dto.endTime) : existing.endTime;

    if (endTime <= startTime) {
      throw new BadRequestException('End time must be after start time');
    }

    // Check for overlapping performances (excluding current)
    const stageId = dto.stageId ?? existing.stageId;
    const overlapping = await this.prisma.performance.findFirst({
      where: {
        id: { not: performanceId },
        stageId,
        isCancelled: false,
        OR: [
          {
            startTime: { lt: endTime },
            endTime: { gt: startTime },
          },
        ],
      },
    });

    if (overlapping) {
      throw new ConflictException(
        'This performance overlaps with an existing performance on the same stage',
      );
    }

    const performance = await this.prisma.performance.update({
      where: { id: performanceId },
      data: {
        artistId: dto.artistId,
        stageId: dto.stageId,
        startTime: dto.startTime ? new Date(dto.startTime) : undefined,
        endTime: dto.endTime ? new Date(dto.endTime) : undefined,
        description: dto.description,
        isCancelled: dto.isCancelled,
      },
      include: {
        artist: true,
        stage: true,
      },
    });

    this.logger.log(`Performance ${performanceId} updated`);

    // Invalidate program cache for this festival
    await this.invalidateProgramCache(festivalId);

    return this.toPerformanceResponse(performance);
  }

  /**
   * Delete a performance
   */
  async deletePerformance(festivalId: string, performanceId: string): Promise<void> {
    await this.findPerformanceById(festivalId, performanceId); // Ensure exists

    await this.prisma.performance.delete({ where: { id: performanceId } });

    // Invalidate program cache for this festival
    await this.invalidateProgramCache(festivalId);

    this.logger.log(`Performance ${performanceId} deleted`);
  }

  /**
   * Invalidate program cache for a festival
   */
  private async invalidateProgramCache(festivalId: string): Promise<void> {
    await this.cacheService.del(CACHE_KEYS.FESTIVAL.PROGRAM(festivalId));
    this.logger.debug(`Program cache invalidated for festival ${festivalId}`);
  }

  private toPerformanceResponse(
    performance: Performance & { artist?: Artist; stage?: Stage },
  ): PerformanceResponseDto {
    return {
      id: performance.id,
      artistId: performance.artistId,
      stageId: performance.stageId,
      startTime: performance.startTime,
      endTime: performance.endTime,
      description: performance.description ?? undefined,
      isCancelled: performance.isCancelled,
      artist: performance.artist ? this.toArtistResponse(performance.artist) : undefined,
      stage: performance.stage ? this.toStageResponse(performance.stage) : undefined,
      createdAt: performance.createdAt,
      updatedAt: performance.updatedAt,
    };
  }

  // ==================== PROGRAM VIEWS ====================

  /**
   * Get complete festival program
   * Cached for 10 minutes (CACHE_TTL.FESTIVAL_PROGRAM)
   */
  async getFestivalProgram(festivalId: string): Promise<FestivalProgramDto> {
    const cacheKey = CACHE_KEYS.FESTIVAL.PROGRAM(festivalId);

    return this.cacheService.wrap(
      cacheKey,
      () => this.getFestivalProgramFromDb(festivalId),
      CACHE_TTL.FESTIVAL_PROGRAM,
    );
  }

  /**
   * Internal method to fetch festival program from database
   */
  private async getFestivalProgramFromDb(festivalId: string): Promise<FestivalProgramDto> {
    const festival = await this.prisma.festival.findUnique({
      where: { id: festivalId },
    });

    if (!festival) {
      throw new NotFoundException(`Festival with ID "${festivalId}" not found`);
    }

    const stages = await this.prisma.stage.findMany({
      where: { festivalId },
      orderBy: { name: 'asc' },
    });

    const stageIds = stages.map((s) => s.id);

    const performances = await this.prisma.performance.findMany({
      where: {
        stageId: { in: stageIds },
        isCancelled: false,
      },
      orderBy: { startTime: 'asc' },
      include: {
        artist: true,
        stage: true,
      },
    });

    const uniqueArtistIds = new Set(performances.map((p) => p.artistId));

    return {
      festivalId: festival.id,
      festivalName: festival.name,
      startDate: festival.startDate,
      endDate: festival.endDate,
      stages: stages.map((s) => this.toStageResponse(s)),
      performances: performances.map((p) => this.toProgramPerformance(p)),
      totalPerformances: performances.length,
      totalArtists: uniqueArtistIds.size,
    };
  }

  /**
   * Get festival program grouped by day
   */
  async getProgramByDay(festivalId: string): Promise<ProgramByDayDto> {
    const festival = await this.prisma.festival.findUnique({
      where: { id: festivalId },
    });

    if (!festival) {
      throw new NotFoundException(`Festival with ID "${festivalId}" not found`);
    }

    const stages = await this.prisma.stage.findMany({
      where: { festivalId },
      select: { id: true },
    });

    const stageIds = stages.map((s) => s.id);

    const performances = await this.prisma.performance.findMany({
      where: {
        stageId: { in: stageIds },
        isCancelled: false,
      },
      orderBy: { startTime: 'asc' },
      include: {
        artist: true,
        stage: true,
      },
    });

    // Group by day
    const dayMap = new Map<string, ProgramPerformanceDto[]>();
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

    for (const perf of performances) {
      const dateKey = perf.startTime.toISOString().split('T')[0];
      if (!dayMap.has(dateKey)) {
        dayMap.set(dateKey, []);
      }
      dayMap.get(dateKey)!.push(this.toProgramPerformance(perf));
    }

    const days: DayScheduleDto[] = Array.from(dayMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, perfs]) => {
        const d = new Date(date);
        return {
          date,
          dayName: dayNames[d.getUTCDay()],
          performances: perfs,
          performanceCount: perfs.length,
        };
      });

    return {
      festivalId: festival.id,
      festivalName: festival.name,
      days,
      totalDays: days.length,
      totalPerformances: performances.length,
    };
  }

  /**
   * Get festival program grouped by stage
   */
  async getProgramByStage(festivalId: string): Promise<ProgramByStageDto> {
    const festival = await this.prisma.festival.findUnique({
      where: { id: festivalId },
    });

    if (!festival) {
      throw new NotFoundException(`Festival with ID "${festivalId}" not found`);
    }

    const stages = await this.prisma.stage.findMany({
      where: { festivalId },
      orderBy: { name: 'asc' },
      include: {
        performances: {
          where: { isCancelled: false },
          orderBy: { startTime: 'asc' },
          include: {
            artist: true,
            stage: true,
          },
        },
      },
    });

    const stageSchedules: StageScheduleDto[] = stages.map((stage) => ({
      stage: this.toStageResponse(stage),
      performances: stage.performances.map((p) => this.toProgramPerformance(p)),
      performanceCount: stage.performances.length,
    }));

    const totalPerformances = stageSchedules.reduce((sum, s) => sum + s.performanceCount, 0);

    return {
      festivalId: festival.id,
      festivalName: festival.name,
      stages: stageSchedules,
      totalStages: stages.length,
      totalPerformances,
    };
  }

  private toProgramPerformance(
    performance: Performance & { artist: Artist; stage: Stage },
  ): ProgramPerformanceDto {
    return {
      id: performance.id,
      startTime: performance.startTime,
      endTime: performance.endTime,
      description: performance.description ?? undefined,
      isCancelled: performance.isCancelled,
      artist: this.toArtistResponse(performance.artist),
      stage: this.toStageResponse(performance.stage),
    };
  }
}
