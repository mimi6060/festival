import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '@prisma/client';
import {
  CreateArtistDto,
  UpdateArtistDto,
  CreateStageDto,
  UpdateStageDto,
  CreatePerformanceDto,
  UpdatePerformanceDto,
  QueryArtistsDto,
  QueryLineupDto,
} from './dto';

@Injectable()
export class ProgramService {
  constructor(private readonly prisma: PrismaService) {}

  // ==================== ARTIST CRUD ====================

  async createArtist(dto: CreateArtistDto) {
    return this.prisma.artist.create({
      data: dto,
    });
  }

  async findAllArtists(query: QueryArtistsDto) {
    const { search, genre, page = 1, limit = 20 } = query;
    const skip = (page - 1) * limit;

    const where: Prisma.ArtistWhereInput = {
      ...(search && {
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { bio: { contains: search, mode: 'insensitive' } },
        ],
      }),
      ...(genre && { genre: { contains: genre, mode: 'insensitive' } }),
    };

    const [artists, total] = await Promise.all([
      this.prisma.artist.findMany({
        where,
        skip,
        take: limit,
        orderBy: { name: 'asc' },
        include: {
          _count: {
            select: { performances: true },
          },
        },
      }),
      this.prisma.artist.count({ where }),
    ]);

    return {
      data: artists,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findArtistById(id: string) {
    const artist = await this.prisma.artist.findUnique({
      where: { id },
      include: {
        performances: {
          include: {
            stage: {
              select: { id: true, name: true, festivalId: true },
            },
          },
          orderBy: { startTime: 'asc' },
        },
        _count: {
          select: { performances: true, favoriteArtists: true },
        },
      },
    });

    if (!artist) {
      throw new NotFoundException('Artist not found');
    }

    return artist;
  }

  async updateArtist(id: string, dto: UpdateArtistDto) {
    const artist = await this.prisma.artist.findUnique({
      where: { id },
    });

    if (!artist) {
      throw new NotFoundException('Artist not found');
    }

    return this.prisma.artist.update({
      where: { id },
      data: dto,
    });
  }

  async deleteArtist(id: string) {
    const artist = await this.prisma.artist.findUnique({
      where: { id },
      include: {
        _count: {
          select: { performances: true },
        },
      },
    });

    if (!artist) {
      throw new NotFoundException('Artist not found');
    }

    if (artist._count.performances > 0) {
      throw new BadRequestException(
        'Cannot delete artist with scheduled performances. Remove performances first.',
      );
    }

    return this.prisma.artist.delete({
      where: { id },
    });
  }

  // ==================== STAGE CRUD ====================

  async createStage(festivalId: string, dto: CreateStageDto) {
    // Verify festival exists
    const festival = await this.prisma.festival.findUnique({
      where: { id: festivalId },
    });

    if (!festival) {
      throw new NotFoundException('Festival not found');
    }

    // Check for duplicate stage name in festival
    const existingStage = await this.prisma.stage.findUnique({
      where: {
        festivalId_name: {
          festivalId,
          name: dto.name,
        },
      },
    });

    if (existingStage) {
      throw new ConflictException('A stage with this name already exists in this festival');
    }

    return this.prisma.stage.create({
      data: {
        ...dto,
        festivalId,
      },
      include: {
        festival: {
          select: { id: true, name: true, slug: true },
        },
      },
    });
  }

  async findStagesByFestival(festivalId: string) {
    // Verify festival exists
    const festival = await this.prisma.festival.findUnique({
      where: { id: festivalId },
    });

    if (!festival) {
      throw new NotFoundException('Festival not found');
    }

    return this.prisma.stage.findMany({
      where: { festivalId },
      include: {
        _count: {
          select: { performances: true },
        },
      },
      orderBy: { name: 'asc' },
    });
  }

  async findStageById(id: string) {
    const stage = await this.prisma.stage.findUnique({
      where: { id },
      include: {
        festival: {
          select: { id: true, name: true, slug: true },
        },
        performances: {
          include: {
            artist: {
              select: { id: true, name: true, genre: true, imageUrl: true },
            },
          },
          orderBy: { startTime: 'asc' },
        },
        _count: {
          select: { performances: true },
        },
      },
    });

    if (!stage) {
      throw new NotFoundException('Stage not found');
    }

    return stage;
  }

  async updateStage(id: string, dto: UpdateStageDto) {
    const stage = await this.prisma.stage.findUnique({
      where: { id },
    });

    if (!stage) {
      throw new NotFoundException('Stage not found');
    }

    // If updating name, check for duplicates
    if (dto.name && dto.name !== stage.name) {
      const existingStage = await this.prisma.stage.findUnique({
        where: {
          festivalId_name: {
            festivalId: stage.festivalId,
            name: dto.name,
          },
        },
      });

      if (existingStage) {
        throw new ConflictException('A stage with this name already exists in this festival');
      }
    }

    return this.prisma.stage.update({
      where: { id },
      data: dto,
      include: {
        festival: {
          select: { id: true, name: true, slug: true },
        },
      },
    });
  }

  async deleteStage(id: string) {
    const stage = await this.prisma.stage.findUnique({
      where: { id },
      include: {
        _count: {
          select: { performances: true },
        },
      },
    });

    if (!stage) {
      throw new NotFoundException('Stage not found');
    }

    if (stage._count.performances > 0) {
      throw new BadRequestException(
        'Cannot delete stage with scheduled performances. Remove performances first.',
      );
    }

    return this.prisma.stage.delete({
      where: { id },
    });
  }

  // ==================== PERFORMANCE CRUD ====================

  async createPerformance(festivalId: string, dto: CreatePerformanceDto) {
    // Verify festival exists
    const festival = await this.prisma.festival.findUnique({
      where: { id: festivalId },
    });

    if (!festival) {
      throw new NotFoundException('Festival not found');
    }

    // Verify artist exists
    const artist = await this.prisma.artist.findUnique({
      where: { id: dto.artistId },
    });

    if (!artist) {
      throw new NotFoundException('Artist not found');
    }

    // Verify stage exists and belongs to the festival
    const stage = await this.prisma.stage.findUnique({
      where: { id: dto.stageId },
    });

    if (!stage) {
      throw new NotFoundException('Stage not found');
    }

    if (stage.festivalId !== festivalId) {
      throw new BadRequestException('Stage does not belong to this festival');
    }

    const startTime = new Date(dto.startTime);
    const endTime = new Date(dto.endTime);

    // Validate times
    if (startTime >= endTime) {
      throw new BadRequestException('End time must be after start time');
    }

    // Check for overlapping performances on the same stage
    const overlappingStagePerformance = await this.prisma.performance.findFirst({
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

    if (overlappingStagePerformance) {
      throw new ConflictException(
        'Another performance is already scheduled on this stage during this time',
      );
    }

    // Check if artist already has a performance at overlapping time
    const overlappingArtistPerformance = await this.prisma.performance.findFirst({
      where: {
        artistId: dto.artistId,
        isCancelled: false,
        OR: [
          {
            startTime: { lt: endTime },
            endTime: { gt: startTime },
          },
        ],
      },
    });

    if (overlappingArtistPerformance) {
      throw new ConflictException(
        'This artist already has a performance scheduled during this time',
      );
    }

    return this.prisma.performance.create({
      data: {
        artistId: dto.artistId,
        stageId: dto.stageId,
        startTime,
        endTime,
        description: dto.description,
      },
      include: {
        artist: {
          select: { id: true, name: true, genre: true, imageUrl: true },
        },
        stage: {
          select: { id: true, name: true, festivalId: true },
        },
      },
    });
  }

  async findFestivalLineup(festivalId: string, query: QueryLineupDto) {
    const { stageId, date, includeCancelled = false, page = 1, limit = 50 } = query;
    const skip = (page - 1) * limit;

    // Verify festival exists
    const festival = await this.prisma.festival.findUnique({
      where: { id: festivalId },
    });

    if (!festival) {
      throw new NotFoundException('Festival not found');
    }

    // Get all stage IDs for this festival
    const festivalStages = await this.prisma.stage.findMany({
      where: { festivalId },
      select: { id: true },
    });

    const stageIds = festivalStages.map((s) => s.id);

    // Build date filter
    let dateFilter: Prisma.PerformanceWhereInput = {};
    if (date) {
      const startOfDay = new Date(date);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(date);
      endOfDay.setHours(23, 59, 59, 999);
      dateFilter = {
        startTime: {
          gte: startOfDay,
          lte: endOfDay,
        },
      };
    }

    const where: Prisma.PerformanceWhereInput = {
      stageId: stageId ? stageId : { in: stageIds },
      ...(stageId && { stageId }),
      ...(!includeCancelled && { isCancelled: false }),
      ...dateFilter,
    };

    const [performances, total] = await Promise.all([
      this.prisma.performance.findMany({
        where,
        skip,
        take: limit,
        include: {
          artist: {
            select: {
              id: true,
              name: true,
              genre: true,
              imageUrl: true,
              spotifyUrl: true,
              instagramUrl: true,
            },
          },
          stage: {
            select: { id: true, name: true, location: true, capacity: true },
          },
        },
        orderBy: [{ startTime: 'asc' }, { stage: { name: 'asc' } }],
      }),
      this.prisma.performance.count({ where }),
    ]);

    return {
      data: performances,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        festivalId,
      },
    };
  }

  async findPerformanceById(id: string) {
    const performance = await this.prisma.performance.findUnique({
      where: { id },
      include: {
        artist: true,
        stage: {
          include: {
            festival: {
              select: { id: true, name: true, slug: true },
            },
          },
        },
      },
    });

    if (!performance) {
      throw new NotFoundException('Performance not found');
    }

    return performance;
  }

  async updatePerformance(id: string, dto: UpdatePerformanceDto) {
    const performance = await this.prisma.performance.findUnique({
      where: { id },
      include: {
        stage: true,
      },
    });

    if (!performance) {
      throw new NotFoundException('Performance not found');
    }

    const festivalId = performance.stage.festivalId;
    const startTime = dto.startTime ? new Date(dto.startTime) : performance.startTime;
    const endTime = dto.endTime ? new Date(dto.endTime) : performance.endTime;
    const stageId = dto.stageId || performance.stageId;
    const artistId = dto.artistId || performance.artistId;

    // Validate times
    if (startTime >= endTime) {
      throw new BadRequestException('End time must be after start time');
    }

    // If changing stage, verify it belongs to the same festival
    if (dto.stageId) {
      const newStage = await this.prisma.stage.findUnique({
        where: { id: dto.stageId },
      });

      if (!newStage) {
        throw new NotFoundException('Stage not found');
      }

      if (newStage.festivalId !== festivalId) {
        throw new BadRequestException('Stage does not belong to this festival');
      }
    }

    // If changing artist, verify artist exists
    if (dto.artistId) {
      const artist = await this.prisma.artist.findUnique({
        where: { id: dto.artistId },
      });

      if (!artist) {
        throw new NotFoundException('Artist not found');
      }
    }

    // Check for overlapping performances on the same stage (excluding current)
    if (dto.startTime || dto.endTime || dto.stageId) {
      const overlappingStagePerformance = await this.prisma.performance.findFirst({
        where: {
          id: { not: id },
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

      if (overlappingStagePerformance) {
        throw new ConflictException(
          'Another performance is already scheduled on this stage during this time',
        );
      }
    }

    // Check if artist already has a performance at overlapping time (excluding current)
    if (dto.startTime || dto.endTime || dto.artistId) {
      const overlappingArtistPerformance = await this.prisma.performance.findFirst({
        where: {
          id: { not: id },
          artistId,
          isCancelled: false,
          OR: [
            {
              startTime: { lt: endTime },
              endTime: { gt: startTime },
            },
          ],
        },
      });

      if (overlappingArtistPerformance) {
        throw new ConflictException(
          'This artist already has a performance scheduled during this time',
        );
      }
    }

    return this.prisma.performance.update({
      where: { id },
      data: {
        ...(dto.artistId && { artistId: dto.artistId }),
        ...(dto.stageId && { stageId: dto.stageId }),
        ...(dto.startTime && { startTime: new Date(dto.startTime) }),
        ...(dto.endTime && { endTime: new Date(dto.endTime) }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.isCancelled !== undefined && { isCancelled: dto.isCancelled }),
      },
      include: {
        artist: {
          select: { id: true, name: true, genre: true, imageUrl: true },
        },
        stage: {
          select: { id: true, name: true, festivalId: true },
        },
      },
    });
  }

  async deletePerformance(id: string) {
    const performance = await this.prisma.performance.findUnique({
      where: { id },
    });

    if (!performance) {
      throw new NotFoundException('Performance not found');
    }

    return this.prisma.performance.delete({
      where: { id },
    });
  }

  async cancelPerformance(id: string) {
    const performance = await this.prisma.performance.findUnique({
      where: { id },
    });

    if (!performance) {
      throw new NotFoundException('Performance not found');
    }

    return this.prisma.performance.update({
      where: { id },
      data: { isCancelled: true },
      include: {
        artist: {
          select: { id: true, name: true },
        },
        stage: {
          select: { id: true, name: true, festivalId: true },
        },
      },
    });
  }

  // ==================== UTILITY METHODS ====================

  async getGenres() {
    const genres = await this.prisma.artist.findMany({
      where: {
        genre: { not: null },
      },
      select: { genre: true },
      distinct: ['genre'],
    });

    return genres
      .map((g) => g.genre)
      .filter((g): g is string => g !== null)
      .sort();
  }

  async getArtistsByFestival(festivalId: string) {
    // Verify festival exists
    const festival = await this.prisma.festival.findUnique({
      where: { id: festivalId },
    });

    if (!festival) {
      throw new NotFoundException('Festival not found');
    }

    // Get all stages for this festival
    const stages = await this.prisma.stage.findMany({
      where: { festivalId },
      select: { id: true },
    });

    const stageIds = stages.map((s) => s.id);

    // Get all unique artists performing at this festival
    const performances = await this.prisma.performance.findMany({
      where: {
        stageId: { in: stageIds },
        isCancelled: false,
      },
      select: {
        artist: true,
      },
      distinct: ['artistId'],
    });

    return performances.map((p) => p.artist);
  }
}
