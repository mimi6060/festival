import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { MapPoi, PoiType, UserRole } from '@prisma/client';
import {
  CreatePoiDto,
  UpdatePoiDto,
  NearbyQueryDto,
  MapConfigResponseDto,
  NearbyPoiResponseDto,
} from './dto';

interface AuthenticatedUser {
  id: string;
  email: string;
  role: UserRole;
}

@Injectable()
export class MapService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Create a new POI for a festival
   */
  async createPoi(
    festivalId: string,
    createPoiDto: CreatePoiDto,
    user: AuthenticatedUser,
  ): Promise<MapPoi> {
    // Verify festival exists and user has permission
    const festival = await this.prisma.festival.findUnique({
      where: { id: festivalId },
    });

    if (!festival) {
      throw new NotFoundException(`Festival with ID ${festivalId} not found`);
    }

    // Only organizer of this festival or admin can create POIs
    if (user.role !== UserRole.ADMIN && festival.organizerId !== user.id) {
      throw new ForbiddenException(
        'You do not have permission to create POIs for this festival',
      );
    }

    return this.prisma.mapPoi.create({
      data: {
        festivalId,
        name: createPoiDto.name,
        type: createPoiDto.type,
        description: createPoiDto.description,
        latitude: createPoiDto.latitude,
        longitude: createPoiDto.longitude,
        iconUrl: createPoiDto.iconUrl,
        metadata: createPoiDto.metadata,
      },
    });
  }

  /**
   * Get all POIs for a festival
   */
  async getAllPois(festivalId: string): Promise<MapPoi[]> {
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
        isActive: true,
      },
      orderBy: [{ type: 'asc' }, { name: 'asc' }],
    });
  }

  /**
   * Get POIs by type for a festival
   */
  async getPoisByType(festivalId: string, type: PoiType): Promise<MapPoi[]> {
    // Verify festival exists
    const festival = await this.prisma.festival.findUnique({
      where: { id: festivalId },
    });

    if (!festival) {
      throw new NotFoundException(`Festival with ID ${festivalId} not found`);
    }

    // Validate POI type
    if (!Object.values(PoiType).includes(type)) {
      throw new BadRequestException(`Invalid POI type: ${type}`);
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
   * Get a single POI by ID
   */
  async getPoiById(id: string): Promise<MapPoi> {
    const poi = await this.prisma.mapPoi.findUnique({
      where: { id },
    });

    if (!poi) {
      throw new NotFoundException(`POI with ID ${id} not found`);
    }

    return poi;
  }

  /**
   * Update a POI
   */
  async updatePoi(
    id: string,
    updatePoiDto: UpdatePoiDto,
    user: AuthenticatedUser,
  ): Promise<MapPoi> {
    const poi = await this.prisma.mapPoi.findUnique({
      where: { id },
      include: { festival: true },
    });

    if (!poi) {
      throw new NotFoundException(`POI with ID ${id} not found`);
    }

    // Only organizer of this festival or admin can update POIs
    if (user.role !== UserRole.ADMIN && poi.festival.organizerId !== user.id) {
      throw new ForbiddenException(
        'You do not have permission to update this POI',
      );
    }

    return this.prisma.mapPoi.update({
      where: { id },
      data: {
        name: updatePoiDto.name,
        type: updatePoiDto.type,
        description: updatePoiDto.description,
        latitude: updatePoiDto.latitude,
        longitude: updatePoiDto.longitude,
        iconUrl: updatePoiDto.iconUrl,
        metadata: updatePoiDto.metadata,
        isActive: updatePoiDto.isActive,
      },
    });
  }

  /**
   * Delete a POI (soft delete by setting isActive to false)
   */
  async deletePoi(id: string, user: AuthenticatedUser): Promise<void> {
    const poi = await this.prisma.mapPoi.findUnique({
      where: { id },
      include: { festival: true },
    });

    if (!poi) {
      throw new NotFoundException(`POI with ID ${id} not found`);
    }

    // Only organizer of this festival or admin can delete POIs
    if (user.role !== UserRole.ADMIN && poi.festival.organizerId !== user.id) {
      throw new ForbiddenException(
        'You do not have permission to delete this POI',
      );
    }

    // Hard delete the POI
    await this.prisma.mapPoi.delete({
      where: { id },
    });
  }

  /**
   * Find nearby POIs using Haversine formula
   * This calculates the great-circle distance between two points on a sphere
   */
  async findNearby(
    festivalId: string,
    query: NearbyQueryDto,
  ): Promise<NearbyPoiResponseDto[]> {
    // Verify festival exists
    const festival = await this.prisma.festival.findUnique({
      where: { id: festivalId },
    });

    if (!festival) {
      throw new NotFoundException(`Festival with ID ${festivalId} not found`);
    }

    const { latitude, longitude, radius = 500, type, limit = 20 } = query;

    // Get all POIs for the festival (filtered by type if specified)
    const whereClause: any = {
      festivalId,
      isActive: true,
    };

    if (type) {
      whereClause.type = type;
    }

    const pois = await this.prisma.mapPoi.findMany({
      where: whereClause,
    });

    // Calculate distance for each POI using Haversine formula
    const poisWithDistance = pois.map((poi) => {
      const distance = this.calculateHaversineDistance(
        latitude,
        longitude,
        poi.latitude,
        poi.longitude,
      );

      return {
        ...poi,
        distance,
      };
    });

    // Filter by radius and sort by distance
    const nearbyPois = poisWithDistance
      .filter((poi) => poi.distance <= radius)
      .sort((a, b) => a.distance - b.distance)
      .slice(0, limit);

    return nearbyPois;
  }

  /**
   * Get map configuration for a festival
   */
  async getMapConfig(festivalId: string): Promise<MapConfigResponseDto> {
    const festival = await this.prisma.festival.findUnique({
      where: { id: festivalId },
    });

    if (!festival) {
      throw new NotFoundException(`Festival with ID ${festivalId} not found`);
    }

    const pois = await this.prisma.mapPoi.findMany({
      where: {
        festivalId,
        isActive: true,
      },
    });

    // Calculate bounds and center from POI locations
    let bounds = {
      southWestLat: 0,
      southWestLng: 0,
      northEastLat: 0,
      northEastLng: 0,
    };

    let center = {
      latitude: 0,
      longitude: 0,
    };

    if (pois.length > 0) {
      const lats = pois.map((p) => p.latitude);
      const lngs = pois.map((p) => p.longitude);

      bounds = {
        southWestLat: Math.min(...lats),
        southWestLng: Math.min(...lngs),
        northEastLat: Math.max(...lats),
        northEastLng: Math.max(...lngs),
      };

      // Calculate center as the average of all POI positions
      center = {
        latitude: lats.reduce((a, b) => a + b, 0) / lats.length,
        longitude: lngs.reduce((a, b) => a + b, 0) / lngs.length,
      };
    }

    // Count POIs by type
    const poiCountByType: Record<string, number> = {};
    for (const poi of pois) {
      poiCountByType[poi.type] = (poiCountByType[poi.type] || 0) + 1;
    }

    return {
      festivalId,
      festivalName: festival.name,
      center,
      bounds,
      defaultZoom: 16,
      minZoom: 14,
      maxZoom: 20,
      totalPois: pois.length,
      poiCountByType,
    };
  }

  /**
   * Calculate distance between two coordinates using Haversine formula
   * Returns distance in meters
   */
  private calculateHaversineDistance(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number,
  ): number {
    const R = 6371000; // Earth's radius in meters
    const phi1 = this.toRadians(lat1);
    const phi2 = this.toRadians(lat2);
    const deltaPhi = this.toRadians(lat2 - lat1);
    const deltaLambda = this.toRadians(lon2 - lon1);

    const a =
      Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
      Math.cos(phi1) *
        Math.cos(phi2) *
        Math.sin(deltaLambda / 2) *
        Math.sin(deltaLambda / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return Math.round(R * c * 100) / 100; // Round to 2 decimal places
  }

  private toRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
  }
}
