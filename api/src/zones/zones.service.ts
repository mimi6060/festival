import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateZoneDto, UpdateZoneDto, CheckAccessDto, LogAccessDto } from './dto';
import {
  Zone,
  ZoneAccessLog,
  ZoneAccessAction,
  TicketStatus,
  UserRole,
  Prisma,
} from '@prisma/client';

interface AuthenticatedUser {
  id: string;
  email: string;
  role: UserRole;
}

interface ZoneWithRelations extends Zone {
  festival: {
    id: string;
    name: string;
    organizerId: string;
  };
  _count?: {
    accessLogs: number;
  };
}

interface AccessLogWithRelations extends ZoneAccessLog {
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

@Injectable()
export class ZonesService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Create a new zone for a festival
   */
  async create(
    festivalId: string,
    createZoneDto: CreateZoneDto,
    user: AuthenticatedUser,
  ): Promise<Zone> {
    // Verify festival exists and user has permission
    const festival = await this.prisma.festival.findUnique({
      where: { id: festivalId },
    });

    if (!festival) {
      throw new NotFoundException(`Festival with ID ${festivalId} not found`);
    }

    // Only organizer or admin can create zones
    if (festival.organizerId !== user.id && user.role !== UserRole.ADMIN) {
      throw new ForbiddenException('You do not have permission to create zones for this festival');
    }

    return this.prisma.zone.create({
      data: {
        festivalId,
        name: createZoneDto.name,
        description: createZoneDto.description,
        capacity: createZoneDto.capacity,
        requiresTicketType: createZoneDto.requiresTicketType || [],
        isActive: createZoneDto.isActive ?? true,
      },
    });
  }

  /**
   * Get all zones for a festival
   */
  async findAllByFestival(festivalId: string): Promise<ZoneWithRelations[]> {
    // Verify festival exists
    const festival = await this.prisma.festival.findUnique({
      where: { id: festivalId },
    });

    if (!festival) {
      throw new NotFoundException(`Festival with ID ${festivalId} not found`);
    }

    return this.prisma.zone.findMany({
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
    }) as unknown as ZoneWithRelations[];
  }

  /**
   * Get a zone by ID
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
   */
  async update(
    id: string,
    updateZoneDto: UpdateZoneDto,
    user: AuthenticatedUser,
  ): Promise<Zone> {
    const zone = await this.findOne(id);

    // Only organizer or admin can update zones
    if (zone.festival.organizerId !== user.id && user.role !== UserRole.ADMIN) {
      throw new ForbiddenException('You do not have permission to update this zone');
    }

    return this.prisma.zone.update({
      where: { id },
      data: {
        ...(updateZoneDto.name && { name: updateZoneDto.name }),
        ...(updateZoneDto.description !== undefined && { description: updateZoneDto.description }),
        ...(updateZoneDto.capacity !== undefined && { capacity: updateZoneDto.capacity }),
        ...(updateZoneDto.requiresTicketType && { requiresTicketType: updateZoneDto.requiresTicketType }),
        ...(updateZoneDto.isActive !== undefined && { isActive: updateZoneDto.isActive }),
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

    await this.prisma.zone.delete({
      where: { id },
    });
  }

  /**
   * Check if a ticket has access to a zone
   */
  async checkAccess(
    zoneId: string,
    checkAccessDto: CheckAccessDto,
  ): Promise<{
    granted: boolean;
    message: string;
    ticketHolder?: {
      name: string;
      ticketType: string;
      ticketStatus: string;
    };
    zone?: {
      name: string;
      currentOccupancy: number;
      capacity: number | null;
    };
  }> {
    // Find zone
    const zone = await this.prisma.zone.findUnique({
      where: { id: zoneId },
    });

    if (!zone) {
      throw new NotFoundException(`Zone with ID ${zoneId} not found`);
    }

    if (!zone.isActive) {
      return {
        granted: false,
        message: 'Zone is not active',
        zone: {
          name: zone.name,
          currentOccupancy: zone.currentOccupancy,
          capacity: zone.capacity,
        },
      };
    }

    // Find ticket
    const ticket = await this.prisma.ticket.findUnique({
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

    if (!ticket) {
      return {
        granted: false,
        message: 'Ticket not found',
      };
    }

    const ticketHolder = {
      name: `${ticket.user.firstName} ${ticket.user.lastName}`,
      ticketType: ticket.category.type,
      ticketStatus: ticket.status,
    };

    const zoneInfo = {
      name: zone.name,
      currentOccupancy: zone.currentOccupancy,
      capacity: zone.capacity,
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
          message: `This zone requires one of the following ticket types: ${zone.requiresTicketType.join(', ')}. Your ticket type is ${ticketType}`,
          ticketHolder,
          zone: zoneInfo,
        };
      }
    }

    // Check capacity
    if (zone.capacity !== null && zone.currentOccupancy >= zone.capacity) {
      return {
        granted: false,
        message: 'Zone is at full capacity',
        ticketHolder,
        zone: zoneInfo,
      };
    }

    return {
      granted: true,
      message: `Access granted - ${ticket.category.type} ticket verified`,
      ticketHolder,
      zone: zoneInfo,
    };
  }

  /**
   * Log zone access (entry or exit)
   */
  async logAccess(
    zoneId: string,
    logAccessDto: LogAccessDto,
    performedById?: string,
  ): Promise<ZoneAccessLog> {
    // Check access first if this is an entry
    if (logAccessDto.action === ZoneAccessAction.ENTRY) {
      const accessCheck = await this.checkAccess(zoneId, { ticketId: logAccessDto.ticketId });
      if (!accessCheck.granted) {
        throw new BadRequestException(accessCheck.message);
      }
    }

    // Find zone for validation
    const zone = await this.prisma.zone.findUnique({
      where: { id: zoneId },
    });

    if (!zone) {
      throw new NotFoundException(`Zone with ID ${zoneId} not found`);
    }

    // Verify ticket exists
    const ticket = await this.prisma.ticket.findUnique({
      where: { id: logAccessDto.ticketId },
    });

    if (!ticket) {
      throw new NotFoundException(`Ticket with ID ${logAccessDto.ticketId} not found`);
    }

    // Use transaction to update occupancy and create log
    return this.prisma.$transaction(async (tx) => {
      // Update zone occupancy
      if (logAccessDto.action === ZoneAccessAction.ENTRY) {
        await tx.zone.update({
          where: { id: zoneId },
          data: { currentOccupancy: { increment: 1 } },
        });
      } else if (logAccessDto.action === ZoneAccessAction.EXIT) {
        // Prevent negative occupancy
        if (zone.currentOccupancy > 0) {
          await tx.zone.update({
            where: { id: zoneId },
            data: { currentOccupancy: { decrement: 1 } },
          });
        }
      }

      // Create access log
      return tx.zoneAccessLog.create({
        data: {
          zoneId,
          ticketId: logAccessDto.ticketId,
          action: logAccessDto.action,
          performedById,
        },
      });
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
    },
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
      ...(startDate && { timestamp: { gte: startDate } }),
      ...(endDate && { timestamp: { lte: endDate } }),
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
    },
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
      averageStayDuration: number | null;
    };
    hourlyDistribution: Array<{
      hour: number;
      entries: number;
      exits: number;
    }>;
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
      ...(startDate && { timestamp: { gte: startDate } }),
      ...(endDate && { timestamp: { lte: endDate } }),
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
    const entryTimes: Map<string, Date> = new Map();

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

    const averageStayDuration = stayDurations.length > 0
      ? stayDurations.reduce((a, b) => a + b, 0) / stayDurations.length / 1000 / 60 // in minutes
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
        averageStayDuration,
      },
      hourlyDistribution,
    };
  }
}
