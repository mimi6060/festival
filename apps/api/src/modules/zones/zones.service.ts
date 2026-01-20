import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateZoneDto, UpdateZoneDto, CheckAccessDto, LogAccessDto } from './dto';
import {
  Zone,
  ZoneAccessLog,
  ZoneAccessAction,
  TicketStatus,
  UserRole,
  Prisma,
} from '@prisma/client';
import { ErrorCodes, getErrorMessage } from '../../common/exceptions/error-codes';

/**
 * Interface for authenticated user context
 */
export interface AuthenticatedUser {
  id: string;
  email: string;
  role: UserRole;
}

/**
 * Interface for zone with relations
 */
export interface ZoneWithRelations extends Zone {
  festival: {
    id: string;
    name: string;
    organizerId: string;
  };
  _count?: {
    accessLogs: number;
  };
}

/**
 * Interface for access log with relations
 */
export interface AccessLogWithRelations extends ZoneAccessLog {
  ticket: {
    id: string;
    qrCode: string;
    status: TicketStatus;
    user: {
      firstName: string;
      lastName: string;
      email: string;
    };
    category: {
      name: string;
      type: string;
    };
  };
}

/**
 * Default warning threshold for capacity alerts
 */
const DEFAULT_CAPACITY_WARNING_THRESHOLD = 80;

@Injectable()
export class ZonesService {
  private readonly logger = new Logger(ZonesService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Create a new zone for a festival
   *
   * Optimized: Uses select to fetch only required fields.
   * Validates:
   * - Festival exists
   * - User has permission (admin or organizer)
   * - Zone name is unique within festival
   * - Capacity is positive if provided
   */
  async create(
    festivalId: string,
    createZoneDto: CreateZoneDto,
    user: AuthenticatedUser
  ): Promise<Zone> {
    // Verify festival exists and user has permission - only select needed fields
    const festival = await this.prisma.festival.findUnique({
      where: { id: festivalId },
      select: { id: true, organizerId: true },
    });

    if (!festival) {
      throw new NotFoundException(`Festival with ID ${festivalId} not found`);
    }

    // Only organizer, admin, or security can create zones
    if (
      festival.organizerId !== user.id &&
      user.role !== UserRole.ADMIN &&
      user.role !== UserRole.ORGANIZER
    ) {
      throw new ForbiddenException('You do not have permission to create zones for this festival');
    }

    // Validate capacity is positive if provided
    if (createZoneDto.capacity !== undefined && createZoneDto.capacity <= 0) {
      throw new BadRequestException({
        message: getErrorMessage(ErrorCodes.ZONE_INVALID_CAPACITY, 'en'),
        errorCode: ErrorCodes.ZONE_INVALID_CAPACITY,
      });
    }

    // Check for unique zone name within festival
    const existingZone = await this.prisma.zone.findFirst({
      where: {
        festivalId,
        name: createZoneDto.name.trim(),
      },
      select: { id: true },
    });

    if (existingZone) {
      throw new ConflictException({
        message: getErrorMessage(ErrorCodes.ZONE_NAME_EXISTS, 'en'),
        errorCode: ErrorCodes.ZONE_NAME_EXISTS,
      });
    }

    this.logger.log(`Creating zone "${createZoneDto.name}" for festival ${festivalId}`);

    return this.prisma.zone.create({
      data: {
        festivalId,
        name: createZoneDto.name.trim(),
        description: createZoneDto.description?.trim(),
        capacity: createZoneDto.capacity,
        requiresTicketType: createZoneDto.requiresTicketType || [],
        isActive: createZoneDto.isActive ?? true,
      },
    });
  }

  /**
   * Get all zones for a festival
   *
   * Optimized: Uses select to fetch only required fields for festival check.
   */
  async findAllByFestival(festivalId: string): Promise<ZoneWithRelations[]> {
    // Verify festival exists - only select id to minimize data transfer
    const festival = await this.prisma.festival.findUnique({
      where: { id: festivalId },
      select: { id: true },
    });

    if (!festival) {
      throw new NotFoundException(`Festival with ID ${festivalId} not found`);
    }

    const zones = await this.prisma.zone.findMany({
      where: { festivalId },
      include: {
        festival: {
          select: {
            id: true,
            name: true,
            organizerId: true,
          },
        },
        _count: {
          select: {
            accessLogs: true,
          },
        },
      },
      orderBy: { name: 'asc' },
    });

    return zones as unknown as ZoneWithRelations[];
  }

  /**
   * Get a zone by ID with detailed information
   */
  async findOne(id: string): Promise<ZoneWithRelations> {
    const zone = await this.prisma.zone.findUnique({
      where: { id },
      include: {
        festival: {
          select: {
            id: true,
            name: true,
            organizerId: true,
          },
        },
        _count: {
          select: {
            accessLogs: true,
          },
        },
      },
    });

    if (!zone) {
      throw new NotFoundException(`Zone with ID ${id} not found`);
    }

    return zone as unknown as ZoneWithRelations;
  }

  /**
   * Update a zone
   *
   * Validates:
   * - User has permission (admin, organizer, or security)
   * - Zone name is unique within festival (if changed)
   * - Capacity is positive if provided
   */
  async update(id: string, updateZoneDto: UpdateZoneDto, user: AuthenticatedUser): Promise<Zone> {
    const zone = await this.findOne(id);

    // Only organizer, admin, or security can update zones
    if (
      zone.festival.organizerId !== user.id &&
      user.role !== UserRole.ADMIN &&
      user.role !== UserRole.ORGANIZER &&
      user.role !== UserRole.SECURITY
    ) {
      throw new ForbiddenException('You do not have permission to update this zone');
    }

    // Validate capacity is positive if provided
    if (updateZoneDto.capacity !== undefined && updateZoneDto.capacity <= 0) {
      throw new BadRequestException({
        message: getErrorMessage(ErrorCodes.ZONE_INVALID_CAPACITY, 'en'),
        errorCode: ErrorCodes.ZONE_INVALID_CAPACITY,
      });
    }

    // Check for unique zone name within festival if name is being updated
    if (updateZoneDto.name && updateZoneDto.name.trim() !== zone.name) {
      const existingZone = await this.prisma.zone.findFirst({
        where: {
          festivalId: zone.festivalId,
          name: updateZoneDto.name.trim(),
          NOT: { id },
        },
        select: { id: true },
      });

      if (existingZone) {
        throw new ConflictException({
          message: getErrorMessage(ErrorCodes.ZONE_NAME_EXISTS, 'en'),
          errorCode: ErrorCodes.ZONE_NAME_EXISTS,
        });
      }
    }

    this.logger.log(`Updating zone ${id}`);

    return this.prisma.zone.update({
      where: { id },
      data: {
        ...(updateZoneDto.name && { name: updateZoneDto.name.trim() }),
        ...(updateZoneDto.description !== undefined && {
          description: updateZoneDto.description?.trim(),
        }),
        ...(updateZoneDto.capacity !== undefined && {
          capacity: updateZoneDto.capacity,
        }),
        ...(updateZoneDto.requiresTicketType && {
          requiresTicketType: updateZoneDto.requiresTicketType,
        }),
        ...(updateZoneDto.isActive !== undefined && {
          isActive: updateZoneDto.isActive,
        }),
      },
    });
  }

  /**
   * Delete a zone
   */
  async remove(id: string, user: AuthenticatedUser): Promise<void> {
    const zone = await this.findOne(id);

    // Only organizer or admin can delete zones
    if (zone.festival.organizerId !== user.id && user.role !== UserRole.ADMIN) {
      throw new ForbiddenException('You do not have permission to delete this zone');
    }

    this.logger.log(`Deleting zone ${id}`);

    await this.prisma.zone.delete({
      where: { id },
    });
  }

  /**
   * Check if a ticket/QR code has access to a zone
   * Supports both ticketId and qrCode lookup
   */
  async checkAccess(
    zoneId: string,
    checkAccessDto: CheckAccessDto
  ): Promise<{
    granted: boolean;
    message: string;
    ticketHolder?: {
      name: string;
      ticketType: string;
      ticketStatus: string;
      ticketId: string;
    };
    zone?: {
      id: string;
      name: string;
      currentOccupancy: number;
      capacity: number | null;
      capacityPercentage: number | null;
      isAtCapacity: boolean;
      isNearCapacity: boolean;
    };
    alert?: {
      type: 'WARNING' | 'CRITICAL';
      message: string;
    };
  }> {
    // Find zone
    const zone = await this.prisma.zone.findUnique({
      where: { id: zoneId },
    });

    if (!zone) {
      throw new NotFoundException(`Zone with ID ${zoneId} not found`);
    }

    const capacityPercentage = zone.capacity ? (zone.currentOccupancy / zone.capacity) * 100 : null;
    const isAtCapacity = zone.capacity !== null && zone.currentOccupancy >= zone.capacity;
    const isNearCapacity =
      capacityPercentage !== null && capacityPercentage >= DEFAULT_CAPACITY_WARNING_THRESHOLD;

    const zoneInfo = {
      id: zone.id,
      name: zone.name,
      currentOccupancy: zone.currentOccupancy,
      capacity: zone.capacity,
      capacityPercentage,
      isAtCapacity,
      isNearCapacity,
    };

    if (!zone.isActive) {
      return {
        granted: false,
        message: 'Zone is not active',
        zone: zoneInfo,
      };
    }

    // Find ticket by ID or QR code
    let ticket;
    if (checkAccessDto.ticketId) {
      ticket = await this.prisma.ticket.findUnique({
        where: { id: checkAccessDto.ticketId },
        include: {
          user: {
            select: {
              firstName: true,
              lastName: true,
            },
          },
          category: {
            select: {
              name: true,
              type: true,
            },
          },
          festival: {
            select: {
              id: true,
            },
          },
        },
      });
    } else if (checkAccessDto.qrCode) {
      ticket = await this.prisma.ticket.findUnique({
        where: { qrCode: checkAccessDto.qrCode },
        include: {
          user: {
            select: {
              firstName: true,
              lastName: true,
            },
          },
          category: {
            select: {
              name: true,
              type: true,
            },
          },
          festival: {
            select: {
              id: true,
            },
          },
        },
      });
    } else {
      throw new BadRequestException('Either ticketId or qrCode is required');
    }

    if (!ticket) {
      return {
        granted: false,
        message: 'Ticket not found',
        zone: zoneInfo,
      };
    }

    const ticketHolder = {
      name: `${ticket.user.firstName} ${ticket.user.lastName}`,
      ticketType: ticket.category.type,
      ticketStatus: ticket.status,
      ticketId: ticket.id,
    };

    // Check ticket status
    if (ticket.status !== TicketStatus.USED && ticket.status !== TicketStatus.SOLD) {
      return {
        granted: false,
        message: `Ticket status is ${ticket.status} - access denied`,
        ticketHolder,
        zone: zoneInfo,
      };
    }

    // Verify ticket belongs to the same festival as the zone
    if (ticket.festivalId !== zone.festivalId) {
      return {
        granted: false,
        message: 'Ticket is not valid for this festival',
        ticketHolder,
        zone: zoneInfo,
      };
    }

    // Check if zone requires specific ticket types
    if (zone.requiresTicketType.length > 0) {
      const ticketType = ticket.category.type as any;
      if (!zone.requiresTicketType.includes(ticketType)) {
        return {
          granted: false,
          message: `This zone requires one of the following ticket types: ${zone.requiresTicketType.join(
            ', '
          )}. Your ticket type is ${ticketType}`,
          ticketHolder,
          zone: zoneInfo,
        };
      }
    }

    // Check capacity
    if (isAtCapacity) {
      return {
        granted: false,
        message: 'Zone is at full capacity',
        ticketHolder,
        zone: zoneInfo,
        alert: {
          type: 'CRITICAL',
          message: `Zone "${zone.name}" is at FULL CAPACITY (${zone.currentOccupancy}/${zone.capacity})`,
        },
      };
    }

    // Prepare response with potential warning
    const response: any = {
      granted: true,
      message: `Access granted - ${ticket.category.type} ticket verified`,
      ticketHolder,
      zone: zoneInfo,
    };

    // Add warning if near capacity
    if (isNearCapacity) {
      response.alert = {
        type: 'WARNING',
        message: `Zone "${zone.name}" is at ${Math.round(
          capacityPercentage!
        )}% capacity (${zone.currentOccupancy}/${zone.capacity})`,
      };
    }

    return response;
  }

  /**
   * Log zone access (entry or exit) with real-time capacity update
   */
  async logAccess(
    zoneId: string,
    logAccessDto: LogAccessDto,
    performedById?: string
  ): Promise<{
    log: ZoneAccessLog;
    zone: {
      id: string;
      name: string;
      currentOccupancy: number;
      capacity: number | null;
      capacityPercentage: number | null;
    };
    alert?: {
      type: 'WARNING' | 'CRITICAL';
      message: string;
    };
  }> {
    // Resolve ticket ID from QR code if needed
    let ticketId = logAccessDto.ticketId;
    if (!ticketId && logAccessDto.qrCode) {
      const ticket = await this.prisma.ticket.findUnique({
        where: { qrCode: logAccessDto.qrCode },
        select: { id: true },
      });
      if (!ticket) {
        throw new NotFoundException('Ticket not found for the provided QR code');
      }
      ticketId = ticket.id;
    }

    if (!ticketId) {
      throw new BadRequestException('Either ticketId or qrCode is required');
    }

    // Check access first if this is an entry
    if (logAccessDto.action === ZoneAccessAction.ENTRY) {
      const accessCheck = await this.checkAccess(zoneId, { ticketId });
      if (!accessCheck.granted) {
        throw new BadRequestException(accessCheck.message);
      }
    }

    // Batch query: fetch zone and ticket in parallel to prevent N+1
    const [zone, ticket] = await Promise.all([
      this.prisma.zone.findUnique({
        where: { id: zoneId },
      }),
      this.prisma.ticket.findUnique({
        where: { id: ticketId },
      }),
    ]);

    if (!zone) {
      throw new NotFoundException(`Zone with ID ${zoneId} not found`);
    }

    if (!ticket) {
      throw new NotFoundException(`Ticket with ID ${ticketId} not found`);
    }

    // Use transaction to update occupancy and create log atomically
    const result = await this.prisma.$transaction(async (tx) => {
      // Update zone occupancy
      let updatedZone = zone;
      if (logAccessDto.action === ZoneAccessAction.ENTRY) {
        updatedZone = await tx.zone.update({
          where: { id: zoneId },
          data: { currentOccupancy: { increment: 1 } },
        });
      } else if (logAccessDto.action === ZoneAccessAction.EXIT) {
        // Prevent negative occupancy
        if (zone.currentOccupancy > 0) {
          updatedZone = await tx.zone.update({
            where: { id: zoneId },
            data: { currentOccupancy: { decrement: 1 } },
          });
        }
      }

      // Create access log
      const log = await tx.zoneAccessLog.create({
        data: {
          zoneId,
          ticketId,
          action: logAccessDto.action,
          performedById,
        },
      });

      // Mark ticket as used if first entry
      if (logAccessDto.action === ZoneAccessAction.ENTRY && ticket.status === TicketStatus.SOLD) {
        await tx.ticket.update({
          where: { id: ticketId },
          data: {
            status: TicketStatus.USED,
            usedAt: new Date(),
            usedByStaffId: performedById,
          },
        });
      }

      return { log, updatedZone };
    });

    this.logger.log(
      `${logAccessDto.action} logged for ticket ${ticketId} at zone ${zoneId}. Occupancy: ${result.updatedZone.currentOccupancy}/${zone.capacity || 'unlimited'}`
    );

    // Calculate capacity metrics
    const capacityPercentage = result.updatedZone.capacity
      ? (result.updatedZone.currentOccupancy / result.updatedZone.capacity) * 100
      : null;

    const response: any = {
      log: result.log,
      zone: {
        id: result.updatedZone.id,
        name: result.updatedZone.name,
        currentOccupancy: result.updatedZone.currentOccupancy,
        capacity: result.updatedZone.capacity,
        capacityPercentage,
      },
    };

    // Add alerts for capacity
    if (capacityPercentage !== null) {
      if (capacityPercentage >= 100) {
        response.alert = {
          type: 'CRITICAL',
          message: `ALERT: Zone "${zone.name}" is at FULL CAPACITY!`,
        };
        this.logger.warn(`CRITICAL: Zone ${zone.name} reached full capacity!`);
      } else if (capacityPercentage >= DEFAULT_CAPACITY_WARNING_THRESHOLD) {
        response.alert = {
          type: 'WARNING',
          message: `Zone "${zone.name}" is at ${Math.round(capacityPercentage)}% capacity`,
        };
        this.logger.warn(
          `WARNING: Zone ${zone.name} at ${Math.round(capacityPercentage)}% capacity`
        );
      }
    }

    return response;
  }

  /**
   * Get real-time capacity status for a zone
   */
  async getCapacityStatus(zoneId: string): Promise<{
    zoneId: string;
    zoneName: string;
    currentOccupancy: number;
    capacity: number | null;
    occupancyPercentage: number | null;
    isAtCapacity: boolean;
    isNearCapacity: boolean;
    availableSpots: number | null;
    status: 'GREEN' | 'YELLOW' | 'ORANGE' | 'RED';
  }> {
    const zone = await this.prisma.zone.findUnique({
      where: { id: zoneId },
    });

    if (!zone) {
      throw new NotFoundException(`Zone with ID ${zoneId} not found`);
    }

    const occupancyPercentage = zone.capacity
      ? (zone.currentOccupancy / zone.capacity) * 100
      : null;
    const isAtCapacity = zone.capacity !== null && zone.currentOccupancy >= zone.capacity;
    const isNearCapacity =
      occupancyPercentage !== null && occupancyPercentage >= DEFAULT_CAPACITY_WARNING_THRESHOLD;
    const availableSpots = zone.capacity
      ? Math.max(0, zone.capacity - zone.currentOccupancy)
      : null;

    // Determine status color
    let status: 'GREEN' | 'YELLOW' | 'ORANGE' | 'RED' = 'GREEN';
    if (occupancyPercentage !== null) {
      if (occupancyPercentage >= 100) {
        status = 'RED';
      } else if (occupancyPercentage >= 90) {
        status = 'ORANGE';
      } else if (occupancyPercentage >= 70) {
        status = 'YELLOW';
      }
    }

    return {
      zoneId: zone.id,
      zoneName: zone.name,
      currentOccupancy: zone.currentOccupancy,
      capacity: zone.capacity,
      occupancyPercentage,
      isAtCapacity,
      isNearCapacity,
      availableSpots,
      status,
    };
  }

  /**
   * Get all zones capacity status for a festival (dashboard view)
   */
  async getAllZonesCapacityStatus(festivalId: string): Promise<
    {
      zoneId: string;
      zoneName: string;
      currentOccupancy: number;
      capacity: number | null;
      occupancyPercentage: number | null;
      status: 'GREEN' | 'YELLOW' | 'ORANGE' | 'RED';
      isActive: boolean;
    }[]
  > {
    const zones = await this.prisma.zone.findMany({
      where: { festivalId },
      orderBy: { name: 'asc' },
    });

    return zones.map((zone) => {
      const occupancyPercentage = zone.capacity
        ? (zone.currentOccupancy / zone.capacity) * 100
        : null;

      let status: 'GREEN' | 'YELLOW' | 'ORANGE' | 'RED' = 'GREEN';
      if (occupancyPercentage !== null) {
        if (occupancyPercentage >= 100) {
          status = 'RED';
        } else if (occupancyPercentage >= 90) {
          status = 'ORANGE';
        } else if (occupancyPercentage >= 70) {
          status = 'YELLOW';
        }
      }

      return {
        zoneId: zone.id,
        zoneName: zone.name,
        currentOccupancy: zone.currentOccupancy,
        capacity: zone.capacity,
        occupancyPercentage,
        status,
        isActive: zone.isActive,
      };
    });
  }

  /**
   * Get access log history for a zone
   */
  async getAccessLog(
    zoneId: string,
    options?: {
      page?: number;
      limit?: number;
      startDate?: Date;
      endDate?: Date;
      action?: ZoneAccessAction;
    }
  ): Promise<{
    logs: AccessLogWithRelations[];
    total: number;
    page: number;
    limit: number;
  }> {
    const { page = 1, limit = 50, startDate, endDate, action } = options || {};

    // Verify zone exists
    const zone = await this.prisma.zone.findUnique({
      where: { id: zoneId },
    });

    if (!zone) {
      throw new NotFoundException(`Zone with ID ${zoneId} not found`);
    }

    const where: Prisma.ZoneAccessLogWhereInput = {
      zoneId,
      ...(startDate && endDate
        ? { timestamp: { gte: startDate, lte: endDate } }
        : startDate
          ? { timestamp: { gte: startDate } }
          : endDate
            ? { timestamp: { lte: endDate } }
            : {}),
      ...(action && { action }),
    };

    const [logs, total] = await Promise.all([
      this.prisma.zoneAccessLog.findMany({
        where,
        include: {
          ticket: {
            select: {
              id: true,
              qrCode: true,
              status: true,
              user: {
                select: {
                  firstName: true,
                  lastName: true,
                  email: true,
                },
              },
              category: {
                select: {
                  name: true,
                  type: true,
                },
              },
            },
          },
        },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { timestamp: 'desc' },
      }),
      this.prisma.zoneAccessLog.count({ where }),
    ]);

    return {
      logs: logs as unknown as AccessLogWithRelations[],
      total,
      page,
      limit,
    };
  }

  /**
   * Get access statistics for a zone
   */
  async getAccessStats(
    zoneId: string,
    options?: {
      startDate?: Date;
      endDate?: Date;
    }
  ): Promise<{
    zone: {
      id: string;
      name: string;
      capacity: number | null;
      currentOccupancy: number;
    };
    stats: {
      totalEntries: number;
      totalExits: number;
      uniqueVisitors: number;
      peakOccupancy: number;
      averageStayDurationMinutes: number | null;
    };
    hourlyDistribution: {
      hour: number;
      entries: number;
      exits: number;
    }[];
  }> {
    // Verify zone exists
    const zone = await this.prisma.zone.findUnique({
      where: { id: zoneId },
    });

    if (!zone) {
      throw new NotFoundException(`Zone with ID ${zoneId} not found`);
    }

    const { startDate, endDate } = options || {};

    const where: Prisma.ZoneAccessLogWhereInput = {
      zoneId,
      ...(startDate && endDate
        ? { timestamp: { gte: startDate, lte: endDate } }
        : startDate
          ? { timestamp: { gte: startDate } }
          : endDate
            ? { timestamp: { lte: endDate } }
            : {}),
    };

    // Get total entries and exits
    const [entriesCount, exitsCount] = await Promise.all([
      this.prisma.zoneAccessLog.count({
        where: { ...where, action: ZoneAccessAction.ENTRY },
      }),
      this.prisma.zoneAccessLog.count({
        where: { ...where, action: ZoneAccessAction.EXIT },
      }),
    ]);

    // Get unique visitors
    const uniqueVisitors = await this.prisma.zoneAccessLog.groupBy({
      by: ['ticketId'],
      where: { ...where, action: ZoneAccessAction.ENTRY },
    });

    // Get all access logs for detailed analysis
    const allLogs = await this.prisma.zoneAccessLog.findMany({
      where,
      orderBy: { timestamp: 'asc' },
      select: {
        ticketId: true,
        action: true,
        timestamp: true,
      },
    });

    // Calculate peak occupancy
    let currentOcc = 0;
    let peakOccupancy = 0;
    for (const log of allLogs) {
      if (log.action === ZoneAccessAction.ENTRY) {
        currentOcc++;
        if (currentOcc > peakOccupancy) {
          peakOccupancy = currentOcc;
        }
      } else {
        currentOcc = Math.max(0, currentOcc - 1);
      }
    }

    // Calculate average stay duration
    const stayDurations: number[] = [];
    const entryTimes = new Map<string, Date>();

    for (const log of allLogs) {
      if (log.action === ZoneAccessAction.ENTRY) {
        entryTimes.set(log.ticketId, log.timestamp);
      } else if (log.action === ZoneAccessAction.EXIT) {
        const entryTime = entryTimes.get(log.ticketId);
        if (entryTime) {
          const duration = log.timestamp.getTime() - entryTime.getTime();
          stayDurations.push(duration);
          entryTimes.delete(log.ticketId);
        }
      }
    }

    const averageStayDurationMinutes =
      stayDurations.length > 0
        ? stayDurations.reduce((a, b) => a + b, 0) / stayDurations.length / 1000 / 60
        : null;

    // Calculate hourly distribution
    const hourlyData = new Map<number, { entries: number; exits: number }>();
    for (let i = 0; i < 24; i++) {
      hourlyData.set(i, { entries: 0, exits: 0 });
    }

    for (const log of allLogs) {
      const hour = log.timestamp.getHours();
      const hourStats = hourlyData.get(hour)!;
      if (log.action === ZoneAccessAction.ENTRY) {
        hourStats.entries++;
      } else {
        hourStats.exits++;
      }
    }

    const hourlyDistribution = Array.from(hourlyData.entries()).map(([hour, data]) => ({
      hour,
      entries: data.entries,
      exits: data.exits,
    }));

    return {
      zone: {
        id: zone.id,
        name: zone.name,
        capacity: zone.capacity,
        currentOccupancy: zone.currentOccupancy,
      },
      stats: {
        totalEntries: entriesCount,
        totalExits: exitsCount,
        uniqueVisitors: uniqueVisitors.length,
        peakOccupancy,
        averageStayDurationMinutes,
      },
      hourlyDistribution,
    };
  }

  /**
   * Reset zone occupancy to zero (admin only, for sync issues)
   */
  async resetOccupancy(zoneId: string, user: AuthenticatedUser): Promise<Zone> {
    const zone = await this.findOne(zoneId);

    if (user.role !== UserRole.ADMIN) {
      throw new ForbiddenException('Only admins can reset zone occupancy');
    }

    this.logger.warn(
      `Admin ${user.email} is resetting occupancy for zone ${zoneId} from ${zone.currentOccupancy} to 0`
    );

    return this.prisma.zone.update({
      where: { id: zoneId },
      data: { currentOccupancy: 0 },
    });
  }

  /**
   * Manually adjust zone occupancy (admin only, for corrections)
   */
  async adjustOccupancy(
    zoneId: string,
    adjustment: number,
    user: AuthenticatedUser
  ): Promise<Zone> {
    const zone = await this.findOne(zoneId);

    if (user.role !== UserRole.ADMIN && user.role !== UserRole.ORGANIZER) {
      throw new ForbiddenException('Only admins and organizers can adjust zone occupancy');
    }

    const newOccupancy = Math.max(0, zone.currentOccupancy + adjustment);

    this.logger.warn(
      `${user.email} is adjusting occupancy for zone ${zoneId}: ${zone.currentOccupancy} -> ${newOccupancy} (adjustment: ${adjustment})`
    );

    return this.prisma.zone.update({
      where: { id: zoneId },
      data: { currentOccupancy: newOccupancy },
    });
  }
}
