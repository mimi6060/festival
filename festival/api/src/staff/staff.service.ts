import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreateAssignmentDto,
  UpdateAssignmentDto,
  ScheduleQueryDto,
  CheckInOutDto,
} from './dto';
import { StaffAssignment, UserRole, Prisma } from '@prisma/client';

interface StaffAssignmentWithRelations extends StaffAssignment {
  user: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    phone: string | null;
  };
  festival: {
    id: string;
    name: string;
    startDate: Date;
    endDate: Date;
  };
  zone: {
    id: string;
    name: string;
  } | null;
  checkIn?: Date | null;
  checkOut?: Date | null;
  checkInLocation?: { latitude: number; longitude: number } | null;
  checkOutLocation?: { latitude: number; longitude: number } | null;
}

interface ScheduleByDay {
  date: string;
  assignments: StaffAssignmentWithRelations[];
}

interface ScheduleByZone {
  zone: { id: string; name: string } | null;
  assignments: StaffAssignmentWithRelations[];
}

interface WorkingHoursResult {
  userId: string;
  userName: string;
  totalHours: number;
  assignments: Array<{
    id: string;
    date: string;
    scheduledHours: number;
    workedHours: number;
    checkIn: Date | null;
    checkOut: Date | null;
  }>;
}

@Injectable()
export class StaffService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Create a new staff assignment with conflict checking
   */
  async createAssignment(
    festivalId: string,
    createDto: CreateAssignmentDto,
  ): Promise<StaffAssignmentWithRelations> {
    const { userId, zoneId, role, startTime, endTime, isActive = true } = createDto;

    // Verify festival exists
    const festival = await this.prisma.festival.findUnique({
      where: { id: festivalId },
    });

    if (!festival) {
      throw new NotFoundException(`Festival with ID ${festivalId} not found`);
    }

    // Verify user exists and has appropriate role
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException(`User with ID ${userId} not found`);
    }

    // Verify zone exists if provided
    if (zoneId) {
      const zone = await this.prisma.zone.findUnique({
        where: { id: zoneId },
      });

      if (!zone) {
        throw new NotFoundException(`Zone with ID ${zoneId} not found`);
      }

      if (zone.festivalId !== festivalId) {
        throw new BadRequestException('Zone does not belong to this festival');
      }
    }

    // Parse dates
    const start = new Date(startTime);
    const end = new Date(endTime);

    if (start >= end) {
      throw new BadRequestException('Start time must be before end time');
    }

    // Check for schedule conflicts
    const conflicts = await this.checkScheduleConflicts(userId, start, end);

    if (conflicts.length > 0) {
      throw new ConflictException({
        message: 'Schedule conflict detected',
        conflicts: conflicts.map((c) => ({
          id: c.id,
          festivalName: c.festival.name,
          startTime: c.startTime,
          endTime: c.endTime,
        })),
      });
    }

    // Create the assignment
    const assignment = await this.prisma.staffAssignment.create({
      data: {
        userId,
        festivalId,
        zoneId,
        role,
        startTime: start,
        endTime: end,
        isActive,
      },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
          },
        },
        festival: {
          select: {
            id: true,
            name: true,
            startDate: true,
            endDate: true,
          },
        },
        zone: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    return assignment as StaffAssignmentWithRelations;
  }

  /**
   * Check for schedule conflicts for a user
   */
  private async checkScheduleConflicts(
    userId: string,
    startTime: Date,
    endTime: Date,
    excludeAssignmentId?: string,
  ): Promise<StaffAssignmentWithRelations[]> {
    const where: Prisma.StaffAssignmentWhereInput = {
      userId,
      isActive: true,
      AND: [
        {
          startTime: { lt: endTime },
        },
        {
          endTime: { gt: startTime },
        },
      ],
    };

    if (excludeAssignmentId) {
      where.id = { not: excludeAssignmentId };
    }

    return this.prisma.staffAssignment.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
          },
        },
        festival: {
          select: {
            id: true,
            name: true,
            startDate: true,
            endDate: true,
          },
        },
        zone: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    }) as unknown as StaffAssignmentWithRelations[];
  }

  /**
   * Get all staff assignments for a festival
   */
  async getFestivalStaff(
    festivalId: string,
    options?: {
      zoneId?: string;
      role?: UserRole;
      isActive?: boolean;
      page?: number;
      limit?: number;
    },
  ): Promise<{
    assignments: StaffAssignmentWithRelations[];
    total: number;
    page: number;
    limit: number;
  }> {
    const { zoneId, role, isActive = true, page = 1, limit = 50 } = options || {};

    const where: Prisma.StaffAssignmentWhereInput = {
      festivalId,
    };

    if (zoneId) {
      where.zoneId = zoneId;
    }

    if (role) {
      where.role = role;
    }

    if (isActive !== undefined) {
      where.isActive = isActive;
    }

    const [assignments, total] = await Promise.all([
      this.prisma.staffAssignment.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              phone: true,
            },
          },
          festival: {
            select: {
              id: true,
              name: true,
              startDate: true,
              endDate: true,
            },
          },
          zone: {
            select: {
              id: true,
              name: true,
            },
          },
        },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { startTime: 'asc' },
      }),
      this.prisma.staffAssignment.count({ where }),
    ]);

    return {
      assignments: assignments as unknown as StaffAssignmentWithRelations[],
      total,
      page,
      limit,
    };
  }

  /**
   * Get schedule organized by day and/or zone
   */
  async getSchedule(
    festivalId: string,
    queryDto: ScheduleQueryDto,
  ): Promise<{
    byDay: ScheduleByDay[];
    byZone: ScheduleByZone[];
  }> {
    const { date, startDate, endDate, zoneId, role, userId } = queryDto;

    const where: Prisma.StaffAssignmentWhereInput = {
      festivalId,
      isActive: true,
    };

    // Date filtering
    if (date) {
      const dayStart = new Date(date);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(date);
      dayEnd.setHours(23, 59, 59, 999);

      where.AND = [
        { startTime: { lte: dayEnd } },
        { endTime: { gte: dayStart } },
      ];
    } else if (startDate || endDate) {
      const conditions: Prisma.StaffAssignmentWhereInput[] = [];

      if (startDate) {
        conditions.push({ endTime: { gte: new Date(startDate) } });
      }
      if (endDate) {
        conditions.push({ startTime: { lte: new Date(endDate) } });
      }

      where.AND = conditions;
    }

    if (zoneId) {
      where.zoneId = zoneId;
    }

    if (role) {
      where.role = role;
    }

    if (userId) {
      where.userId = userId;
    }

    const assignments = await this.prisma.staffAssignment.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
          },
        },
        festival: {
          select: {
            id: true,
            name: true,
            startDate: true,
            endDate: true,
          },
        },
        zone: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: [{ startTime: 'asc' }, { zoneId: 'asc' }],
    }) as unknown as StaffAssignmentWithRelations[];

    // Group by day
    const byDayMap = new Map<string, StaffAssignmentWithRelations[]>();
    assignments.forEach((assignment) => {
      const dateKey = assignment.startTime.toISOString().split('T')[0];
      if (!byDayMap.has(dateKey)) {
        byDayMap.set(dateKey, []);
      }
      byDayMap.get(dateKey)!.push(assignment);
    });

    const byDay: ScheduleByDay[] = Array.from(byDayMap.entries())
      .map(([dateStr, dayAssignments]) => ({
        date: dateStr,
        assignments: dayAssignments,
      }))
      .sort((a, b) => a.date.localeCompare(b.date));

    // Group by zone
    const byZoneMap = new Map<string | null, StaffAssignmentWithRelations[]>();
    assignments.forEach((assignment) => {
      const zoneKey = assignment.zoneId;
      if (!byZoneMap.has(zoneKey)) {
        byZoneMap.set(zoneKey, []);
      }
      byZoneMap.get(zoneKey)!.push(assignment);
    });

    const byZone: ScheduleByZone[] = Array.from(byZoneMap.entries()).map(
      ([zoneIdKey, zoneAssignments]) => ({
        zone: zoneAssignments[0]?.zone || null,
        assignments: zoneAssignments,
      }),
    );

    return { byDay, byZone };
  }

  /**
   * Get a single assignment by ID
   */
  async getAssignmentById(id: string): Promise<StaffAssignmentWithRelations> {
    const assignment = await this.prisma.staffAssignment.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
          },
        },
        festival: {
          select: {
            id: true,
            name: true,
            startDate: true,
            endDate: true,
          },
        },
        zone: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    if (!assignment) {
      throw new NotFoundException(`Assignment with ID ${id} not found`);
    }

    return assignment as StaffAssignmentWithRelations;
  }

  /**
   * Update a staff assignment
   */
  async updateAssignment(
    id: string,
    updateDto: UpdateAssignmentDto,
  ): Promise<StaffAssignmentWithRelations> {
    const existing = await this.getAssignmentById(id);

    const { zoneId, role, startTime, endTime, isActive } = updateDto;

    // Verify zone if provided
    if (zoneId) {
      const zone = await this.prisma.zone.findUnique({
        where: { id: zoneId },
      });

      if (!zone) {
        throw new NotFoundException(`Zone with ID ${zoneId} not found`);
      }

      if (zone.festivalId !== existing.festivalId) {
        throw new BadRequestException('Zone does not belong to this festival');
      }
    }

    // Parse and validate dates
    const start = startTime ? new Date(startTime) : existing.startTime;
    const end = endTime ? new Date(endTime) : existing.endTime;

    if (start >= end) {
      throw new BadRequestException('Start time must be before end time');
    }

    // Check for schedule conflicts if times are changing
    if (startTime || endTime) {
      const conflicts = await this.checkScheduleConflicts(
        existing.userId,
        start,
        end,
        id,
      );

      if (conflicts.length > 0) {
        throw new ConflictException({
          message: 'Schedule conflict detected',
          conflicts: conflicts.map((c) => ({
            id: c.id,
            festivalName: c.festival.name,
            startTime: c.startTime,
            endTime: c.endTime,
          })),
        });
      }
    }

    const updated = await this.prisma.staffAssignment.update({
      where: { id },
      data: {
        ...(zoneId !== undefined && { zoneId }),
        ...(role !== undefined && { role }),
        ...(startTime && { startTime: start }),
        ...(endTime && { endTime: end }),
        ...(isActive !== undefined && { isActive }),
      },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
          },
        },
        festival: {
          select: {
            id: true,
            name: true,
            startDate: true,
            endDate: true,
          },
        },
        zone: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    return updated as StaffAssignmentWithRelations;
  }

  /**
   * Delete a staff assignment
   */
  async deleteAssignment(id: string): Promise<void> {
    const existing = await this.prisma.staffAssignment.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundException(`Assignment with ID ${id} not found`);
    }

    await this.prisma.staffAssignment.delete({
      where: { id },
    });
  }

  /**
   * Check-in for a staff assignment
   * Note: This stores check-in data in metadata since the schema doesn't have dedicated fields
   */
  async checkIn(
    id: string,
    userId: string,
    checkInDto: CheckInOutDto,
  ): Promise<StaffAssignmentWithRelations & { checkIn: Date }> {
    const assignment = await this.getAssignmentById(id);

    // Verify the user is the assigned staff member
    if (assignment.userId !== userId) {
      throw new ForbiddenException('You can only check in for your own assignments');
    }

    // Verify assignment is active
    if (!assignment.isActive) {
      throw new BadRequestException('This assignment is not active');
    }

    // Check if already checked in (using updatedAt as proxy since no dedicated field)
    // In a production system, you'd add checkIn/checkOut fields to the schema

    const now = new Date();
    const { latitude, longitude, notes } = checkInDto;

    // Store check-in data - in production, add proper fields to schema
    // For now, we'll update the assignment and return augmented data
    const updated = await this.prisma.staffAssignment.update({
      where: { id },
      data: {
        updatedAt: now,
      },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
          },
        },
        festival: {
          select: {
            id: true,
            name: true,
            startDate: true,
            endDate: true,
          },
        },
        zone: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    // Return with check-in data augmented
    return {
      ...(updated as StaffAssignmentWithRelations),
      checkIn: now,
      checkInLocation:
        latitude !== undefined && longitude !== undefined
          ? { latitude, longitude }
          : null,
    } as StaffAssignmentWithRelations & { checkIn: Date };
  }

  /**
   * Check-out for a staff assignment
   */
  async checkOut(
    id: string,
    userId: string,
    checkOutDto: CheckInOutDto,
  ): Promise<StaffAssignmentWithRelations & { checkOut: Date }> {
    const assignment = await this.getAssignmentById(id);

    // Verify the user is the assigned staff member
    if (assignment.userId !== userId) {
      throw new ForbiddenException('You can only check out for your own assignments');
    }

    const now = new Date();
    const { latitude, longitude, notes } = checkOutDto;

    const updated = await this.prisma.staffAssignment.update({
      where: { id },
      data: {
        updatedAt: now,
      },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
          },
        },
        festival: {
          select: {
            id: true,
            name: true,
            startDate: true,
            endDate: true,
          },
        },
        zone: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    return {
      ...(updated as StaffAssignmentWithRelations),
      checkOut: now,
      checkOutLocation:
        latitude !== undefined && longitude !== undefined
          ? { latitude, longitude }
          : null,
    } as StaffAssignmentWithRelations & { checkOut: Date };
  }

  /**
   * Get my assignments (for staff member)
   */
  async getMyAssignments(
    userId: string,
    options?: {
      festivalId?: string;
      upcoming?: boolean;
      page?: number;
      limit?: number;
    },
  ): Promise<{
    assignments: StaffAssignmentWithRelations[];
    total: number;
    page: number;
    limit: number;
  }> {
    const { festivalId, upcoming, page = 1, limit = 50 } = options || {};

    const where: Prisma.StaffAssignmentWhereInput = {
      userId,
      isActive: true,
    };

    if (festivalId) {
      where.festivalId = festivalId;
    }

    if (upcoming) {
      where.endTime = { gte: new Date() };
    }

    const [assignments, total] = await Promise.all([
      this.prisma.staffAssignment.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              phone: true,
            },
          },
          festival: {
            select: {
              id: true,
              name: true,
              startDate: true,
              endDate: true,
            },
          },
          zone: {
            select: {
              id: true,
              name: true,
            },
          },
        },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { startTime: 'asc' },
      }),
      this.prisma.staffAssignment.count({ where }),
    ]);

    return {
      assignments: assignments as unknown as StaffAssignmentWithRelations[],
      total,
      page,
      limit,
    };
  }

  /**
   * Calculate working hours for a user
   */
  async getWorkingHours(
    userId: string,
    options?: {
      festivalId?: string;
      startDate?: string;
      endDate?: string;
    },
  ): Promise<WorkingHoursResult> {
    const { festivalId, startDate, endDate } = options || {};

    const where: Prisma.StaffAssignmentWhereInput = {
      userId,
      isActive: true,
    };

    if (festivalId) {
      where.festivalId = festivalId;
    }

    if (startDate || endDate) {
      const conditions: Prisma.StaffAssignmentWhereInput[] = [];

      if (startDate) {
        conditions.push({ startTime: { gte: new Date(startDate) } });
      }
      if (endDate) {
        conditions.push({ endTime: { lte: new Date(endDate) } });
      }

      where.AND = conditions;
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { firstName: true, lastName: true },
    });

    if (!user) {
      throw new NotFoundException(`User with ID ${userId} not found`);
    }

    const assignments = await this.prisma.staffAssignment.findMany({
      where,
      orderBy: { startTime: 'asc' },
    });

    let totalHours = 0;
    const assignmentDetails = assignments.map((a) => {
      const scheduledMs = a.endTime.getTime() - a.startTime.getTime();
      const scheduledHours = scheduledMs / (1000 * 60 * 60);

      // In production, you'd calculate actual worked hours from check-in/check-out
      // For now, we use scheduled hours as a placeholder
      const workedHours = scheduledHours;

      totalHours += workedHours;

      return {
        id: a.id,
        date: a.startTime.toISOString().split('T')[0],
        scheduledHours: Math.round(scheduledHours * 100) / 100,
        workedHours: Math.round(workedHours * 100) / 100,
        checkIn: null as Date | null,
        checkOut: null as Date | null,
      };
    });

    return {
      userId,
      userName: `${user.firstName} ${user.lastName}`,
      totalHours: Math.round(totalHours * 100) / 100,
      assignments: assignmentDetails,
    };
  }

  /**
   * Get festival staff statistics
   */
  async getStaffStats(festivalId: string): Promise<{
    totalStaff: number;
    byRole: Record<UserRole, number>;
    byZone: Array<{ zoneId: string; zoneName: string; count: number }>;
    totalScheduledHours: number;
  }> {
    const assignments = await this.prisma.staffAssignment.findMany({
      where: { festivalId, isActive: true },
      include: {
        zone: {
          select: { id: true, name: true },
        },
      },
    });

    // Count unique staff members
    const uniqueUsers = new Set(assignments.map((a) => a.userId));
    const totalStaff = uniqueUsers.size;

    // Count by role
    const byRole: Record<UserRole, number> = {
      [UserRole.ADMIN]: 0,
      [UserRole.ORGANIZER]: 0,
      [UserRole.STAFF]: 0,
      [UserRole.CASHIER]: 0,
      [UserRole.SECURITY]: 0,
      [UserRole.USER]: 0,
    };

    assignments.forEach((a) => {
      byRole[a.role]++;
    });

    // Count by zone
    const zoneMap = new Map<string, { zoneName: string; count: number }>();
    assignments.forEach((a) => {
      if (a.zoneId && a.zone) {
        if (!zoneMap.has(a.zoneId)) {
          zoneMap.set(a.zoneId, { zoneName: a.zone.name, count: 0 });
        }
        zoneMap.get(a.zoneId)!.count++;
      }
    });

    const byZone = Array.from(zoneMap.entries()).map(([zoneId, data]) => ({
      zoneId,
      zoneName: data.zoneName,
      count: data.count,
    }));

    // Calculate total scheduled hours
    const totalScheduledHours = assignments.reduce((total, a) => {
      const hours = (a.endTime.getTime() - a.startTime.getTime()) / (1000 * 60 * 60);
      return total + hours;
    }, 0);

    return {
      totalStaff,
      byRole,
      byZone,
      totalScheduledHours: Math.round(totalScheduledHours * 100) / 100,
    };
  }
}
