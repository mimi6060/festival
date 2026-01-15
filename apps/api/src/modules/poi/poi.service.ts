import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePoiDto, UpdatePoiDto, PoiQueryDto } from './dto';
import { MapPoi, PoiType, UserRole, Prisma } from '@prisma/client';

/**
 * Interface for authenticated user context
 */
export interface AuthenticatedUser {
  id: string;
  email: string;
  role: UserRole;
}

/**
 * Interface for POI with festival relation
 */
export interface PoiWithFestival extends MapPoi {
  festival: {
    id: string;
    name: string;
    organizerId: string;
  };
}

/**
 * Interface for POI category count
 */
export interface PoiCategoryCount {
  type: PoiType;
  count: number;
}

/**
 * Service for managing Points of Interest (POI)
 */
@Injectable()
export class PoiService {
  private readonly logger = new Logger(PoiService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Create a new POI for a festival
   */
  async create(
    festivalId: string,
    createPoiDto: CreatePoiDto,
    user: AuthenticatedUser
  ): Promise<MapPoi> {
    // Verify festival exists and user has permission
    const festival = await this.prisma.festival.findUnique({
      where: { id: festivalId },
    });

    if (!festival) {
      throw new NotFoundException(`Festival with ID ${festivalId} not found`);
    }

    // Only organizer or admin can create POIs
    if (festival.organizerId !== user.id && user.role !== UserRole.ADMIN) {
      throw new ForbiddenException(
        'You do not have permission to create POIs for this festival'
      );
    }

    this.logger.log(
      `Creating POI "${createPoiDto.name}" of type ${createPoiDto.type} for festival ${festivalId}`
    );

    return this.prisma.mapPoi.create({
      data: {
        festivalId,
        name: createPoiDto.name,
        type: createPoiDto.type,
        description: createPoiDto.description,
        latitude: createPoiDto.latitude,
        longitude: createPoiDto.longitude,
        iconUrl: createPoiDto.iconUrl,
        metadata: createPoiDto.metadata as Prisma.InputJsonValue,
        isActive: createPoiDto.isActive ?? true,
      },
    });
  }

  /**
   * Get all POIs for a festival with optional filtering
   */
  async findAllByFestival(
    festivalId: string,
    query?: PoiQueryDto
  ): Promise<{
    pois: MapPoi[];
    total: number;
    page: number;
    limit: number;
  }> {
    // Verify festival exists
    const festival = await this.prisma.festival.findUnique({
      where: { id: festivalId },
    });

    if (!festival) {
      throw new NotFoundException(`Festival with ID ${festivalId} not found`);
    }

    const { type, isActive, page = 1, limit = 50 } = query || {};

    const where: Prisma.MapPoiWhereInput = {
      festivalId,
      ...(type && { type }),
      ...(isActive !== undefined && { isActive }),
    };

    const [pois, total] = await Promise.all([
      this.prisma.mapPoi.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: [{ type: 'asc' }, { name: 'asc' }],
      }),
      this.prisma.mapPoi.count({ where }),
    ]);

    return {
      pois,
      total,
      page,
      limit,
    };
  }

  /**
   * Get a single POI by ID
   */
  async findOne(id: string): Promise<PoiWithFestival> {
    const poi = await this.prisma.mapPoi.findUnique({
      where: { id },
      include: {
        festival: {
          select: {
            id: true,
            name: true,
            organizerId: true,
          },
        },
      },
    });

    if (!poi) {
      throw new NotFoundException(`POI with ID ${id} not found`);
    }

    return poi as PoiWithFestival;
  }

  /**
   * Update a POI
   */
  async update(
    id: string,
    updatePoiDto: UpdatePoiDto,
    user: AuthenticatedUser
  ): Promise<MapPoi> {
    const poi = await this.findOne(id);

    // Only organizer or admin can update POIs
    if (poi.festival.organizerId !== user.id && user.role !== UserRole.ADMIN) {
      throw new ForbiddenException(
        'You do not have permission to update this POI'
      );
    }

    this.logger.log(`Updating POI ${id}`);

    return this.prisma.mapPoi.update({
      where: { id },
      data: {
        ...(updatePoiDto.name && { name: updatePoiDto.name }),
        ...(updatePoiDto.type && { type: updatePoiDto.type }),
        ...(updatePoiDto.description !== undefined && {
          description: updatePoiDto.description,
        }),
        ...(updatePoiDto.latitude !== undefined && {
          latitude: updatePoiDto.latitude,
        }),
        ...(updatePoiDto.longitude !== undefined && {
          longitude: updatePoiDto.longitude,
        }),
        ...(updatePoiDto.iconUrl !== undefined && {
          iconUrl: updatePoiDto.iconUrl,
        }),
        ...(updatePoiDto.metadata !== undefined && {
          metadata: updatePoiDto.metadata as Prisma.InputJsonValue,
        }),
        ...(updatePoiDto.isActive !== undefined && {
          isActive: updatePoiDto.isActive,
        }),
      },
    });
  }

  /**
   * Delete a POI
   */
  async remove(id: string, user: AuthenticatedUser): Promise<void> {
    const poi = await this.findOne(id);

    // Only organizer or admin can delete POIs
    if (poi.festival.organizerId !== user.id && user.role !== UserRole.ADMIN) {
      throw new ForbiddenException(
        'You do not have permission to delete this POI'
      );
    }

    this.logger.log(`Deleting POI ${id}`);

    await this.prisma.mapPoi.delete({
      where: { id },
    });
  }

  /**
   * Get POIs by type for a festival
   */
  async findByType(festivalId: string, type: PoiType): Promise<MapPoi[]> {
    // Verify festival exists
    const festival = await this.prisma.festival.findUnique({
      where: { id: festivalId },
    });

    if (!festival) {
      throw new NotFoundException(`Festival with ID ${festivalId} not found`);
    }

    return this.prisma.mapPoi.findMany({
      where: {
        festivalId,
        type,
        isActive: true,
      },
      orderBy: { name: 'asc' },
    });
  }

  /**
   * Get POI category counts for a festival
   */
  async getCategoryCounts(festivalId: string): Promise<PoiCategoryCount[]> {
    // Verify festival exists
    const festival = await this.prisma.festival.findUnique({
      where: { id: festivalId },
    });

    if (!festival) {
      throw new NotFoundException(`Festival with ID ${festivalId} not found`);
    }

    const groupedCounts = await this.prisma.mapPoi.groupBy({
      by: ['type'],
      where: {
        festivalId,
        isActive: true,
      },
      _count: {
        id: true,
      },
      orderBy: {
        type: 'asc',
      },
    });

    return groupedCounts.map((item) => ({
      type: item.type,
      count: item._count.id,
    }));
  }

  /**
   * Find POIs near a location
   * Uses Haversine formula approximation for distance calculation
   */
  async findNearby(
    festivalId: string,
    latitude: number,
    longitude: number,
    radiusMeters = 1000
  ): Promise<(MapPoi & { distance: number })[]> {
    // Verify festival exists
    const festival = await this.prisma.festival.findUnique({
      where: { id: festivalId },
    });

    if (!festival) {
      throw new NotFoundException(`Festival with ID ${festivalId} not found`);
    }

    // Get all active POIs for the festival
    const pois = await this.prisma.mapPoi.findMany({
      where: {
        festivalId,
        isActive: true,
      },
    });

    // Calculate distance for each POI using Haversine formula
    const poisWithDistance = pois
      .map((poi) => ({
        ...poi,
        distance: this.calculateDistance(
          latitude,
          longitude,
          poi.latitude,
          poi.longitude
        ),
      }))
      .filter((poi) => poi.distance <= radiusMeters)
      .sort((a, b) => a.distance - b.distance);

    return poisWithDistance;
  }

  /**
   * Calculate distance between two points using Haversine formula
   * @returns distance in meters
   */
  private calculateDistance(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
  ): number {
    const R = 6371000; // Earth's radius in meters
    const dLat = this.toRadians(lat2 - lat1);
    const dLon = this.toRadians(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRadians(lat1)) *
        Math.cos(this.toRadians(lat2)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  /**
   * Convert degrees to radians
   */
  private toRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
  }

  /**
   * Bulk create POIs for a festival
   */
  async bulkCreate(
    festivalId: string,
    pois: CreatePoiDto[],
    user: AuthenticatedUser
  ): Promise<{ created: number }> {
    // Verify festival exists and user has permission
    const festival = await this.prisma.festival.findUnique({
      where: { id: festivalId },
    });

    if (!festival) {
      throw new NotFoundException(`Festival with ID ${festivalId} not found`);
    }

    // Only organizer or admin can create POIs
    if (festival.organizerId !== user.id && user.role !== UserRole.ADMIN) {
      throw new ForbiddenException(
        'You do not have permission to create POIs for this festival'
      );
    }

    this.logger.log(`Bulk creating ${pois.length} POIs for festival ${festivalId}`);

    const result = await this.prisma.mapPoi.createMany({
      data: pois.map((poi) => ({
        festivalId,
        name: poi.name,
        type: poi.type,
        description: poi.description,
        latitude: poi.latitude,
        longitude: poi.longitude,
        iconUrl: poi.iconUrl,
        metadata: poi.metadata as Prisma.InputJsonValue,
        isActive: poi.isActive ?? true,
      })),
    });

    this.logger.log(`Created ${result.count} POIs for festival ${festivalId}`);

    return { created: result.count };
  }

  /**
   * Toggle POI active status
   */
  async toggleActive(
    id: string,
    user: AuthenticatedUser
  ): Promise<MapPoi> {
    const poi = await this.findOne(id);

    // Only organizer or admin can toggle POI status
    if (poi.festival.organizerId !== user.id && user.role !== UserRole.ADMIN) {
      throw new ForbiddenException(
        'You do not have permission to update this POI'
      );
    }

    this.logger.log(`Toggling POI ${id} active status from ${poi.isActive} to ${!poi.isActive}`);

    return this.prisma.mapPoi.update({
      where: { id },
      data: {
        isActive: !poi.isActive,
      },
    });
  }
}
