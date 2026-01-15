import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { UserRole, Prisma } from '@prisma/client';
import {
  CreateStaffMemberDto,
  UpdateStaffMemberDto,
  CreateShiftDto,
  UpdateShiftDto,
  CheckInDto,
} from './dto';

/**
 * Interface for authenticated user context
 */
export interface AuthenticatedUser {
  id: string;
  email: string;
  role: UserRole;
}

/**
 * Staff Service
 *
 * Handles staff management operations:
 * - Staff member creation and management
 * - Staff roles and permissions
 * - Shift scheduling
 * - Check-in/check-out tracking
 */
@Injectable()
export class StaffService {
  private readonly logger = new Logger(StaffService.name);

  constructor(private readonly prisma: PrismaService) {}

  // ============== Staff Members ==============

  /**
   * Create a new staff member assignment
   *
   * Optimized: Fetches user and festival in parallel to prevent N+1.
   */
  async createStaffMember(dto: CreateStaffMemberDto, currentUser: AuthenticatedUser) {
    // Optimized: Fetch user and festival in parallel to avoid sequential queries
    const [user, festival] = await Promise.all([
      this.prisma.user.findUnique({
        where: { id: dto.userId },
      }),
      this.prisma.festival.findUnique({
        where: { id: dto.festivalId },
      }),
    ]);

    if (!user) {
      throw new NotFoundException(`User with ID ${dto.userId} not found`);
    }

    if (!festival) {
      throw new NotFoundException(`Festival with ID ${dto.festivalId} not found`);
    }

    // Check permissions
    if (currentUser.role !== UserRole.ADMIN && festival.organizerId !== currentUser.id) {
      throw new ForbiddenException('You do not have permission to add staff to this festival');
    }

    this.logger.log(`Creating staff member for user ${dto.userId} at festival ${dto.festivalId}`);

    return this.prisma.staffMember.create({
      data: {
        userId: dto.userId,
        festivalId: dto.festivalId,
        roleId: dto.roleId,
        department: dto.department,
        employeeCode: dto.employeeCode,
        phone: dto.phone,
        emergencyContact: dto.emergencyContact as unknown as Prisma.InputJsonValue,
        badgeNumber: dto.badgeNumber,
        notes: dto.notes,
        isActive: dto.isActive ?? true,
      },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        festival: {
          select: {
            id: true,
            name: true,
          },
        },
        role: true,
      },
    });
  }

  /**
   * Get all staff members for a festival
   */
  async getStaffMembers(
    festivalId: string,
    options?: {
      department?: string;
      role?: string;
      isActive?: boolean;
      page?: number;
      limit?: number;
    }
  ) {
    const { department, role, isActive, page = 1, limit = 50 } = options || {};

    const where: Prisma.StaffMemberWhereInput = {
      festivalId,
      ...(department && { department: department as Prisma.EnumStaffDepartmentFilter }),
      ...(role && { role: { name: role } }),
      ...(isActive !== undefined && { isActive }),
    };

    const [staffMembers, total] = await Promise.all([
      this.prisma.staffMember.findMany({
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
          role: true,
        },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.staffMember.count({ where }),
    ]);

    return {
      items: staffMembers,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Get a staff member by ID
   */
  async getStaffMember(id: string) {
    const staffMember = await this.prisma.staffMember.findUnique({
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
            location: true,
            startDate: true,
            endDate: true,
          },
        },
        role: true,
        shifts: {
          orderBy: { startTime: 'asc' },
        },
        checkIns: {
          orderBy: { checkInTime: 'desc' },
          take: 10,
        },
      },
    });

    if (!staffMember) {
      throw new NotFoundException(`Staff member with ID ${id} not found`);
    }

    return staffMember;
  }

  /**
   * Update a staff member
   */
  async updateStaffMember(id: string, dto: UpdateStaffMemberDto, currentUser: AuthenticatedUser) {
    const staffMember = await this.getStaffMember(id);

    // Check permissions
    const festival = await this.prisma.festival.findUnique({
      where: { id: staffMember.festivalId },
    });

    if (currentUser.role !== UserRole.ADMIN && festival?.organizerId !== currentUser.id) {
      throw new ForbiddenException('You do not have permission to update this staff member');
    }

    return this.prisma.staffMember.update({
      where: { id },
      data: {
        ...(dto.roleId && { roleId: dto.roleId }),
        ...(dto.department !== undefined && { department: dto.department }),
        ...(dto.phone !== undefined && { phone: dto.phone }),
        ...(dto.emergencyContact !== undefined && {
          emergencyContact: dto.emergencyContact as unknown as Prisma.InputJsonValue,
        }),
        ...(dto.badgeNumber !== undefined && { badgeNumber: dto.badgeNumber }),
        ...(dto.notes !== undefined && { notes: dto.notes }),
        ...(dto.isActive !== undefined && { isActive: dto.isActive }),
      },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        role: true,
      },
    });
  }

  /**
   * Delete a staff member assignment
   */
  async deleteStaffMember(id: string, currentUser: AuthenticatedUser) {
    const staffMember = await this.getStaffMember(id);

    const festival = await this.prisma.festival.findUnique({
      where: { id: staffMember.festivalId },
    });

    if (currentUser.role !== UserRole.ADMIN && festival?.organizerId !== currentUser.id) {
      throw new ForbiddenException('You do not have permission to delete this staff member');
    }

    await this.prisma.staffMember.delete({ where: { id } });

    this.logger.log(`Staff member ${id} deleted by ${currentUser.email}`);

    return { message: 'Staff member deleted successfully' };
  }

  // ============== Shifts ==============

  /**
   * Create a shift for a staff member
   */
  async createShift(
    dto: CreateShiftDto & { staffMemberId: string },
    currentUser: AuthenticatedUser
  ) {
    const staffMember = await this.getStaffMember(dto.staffMemberId);

    // Check permissions
    const festival = await this.prisma.festival.findUnique({
      where: { id: staffMember.festivalId },
    });

    if (currentUser.role !== UserRole.ADMIN && festival?.organizerId !== currentUser.id) {
      throw new ForbiddenException('You do not have permission to create shifts for this festival');
    }

    // Validate shift times
    const startTime = new Date(dto.startTime);
    const endTime = new Date(dto.endTime);
    if (endTime <= startTime) {
      throw new BadRequestException('End time must be after start time');
    }

    return this.prisma.staffShift.create({
      data: {
        staffMemberId: dto.staffMemberId,
        startTime,
        endTime,
        zoneId: dto.zoneId,
        title: dto.title,
        breakDuration: dto.breakDuration,
        status: dto.status,
        notes: dto.notes,
      },
      include: {
        zone: {
          select: {
            id: true,
            name: true,
          },
        },
        staffMember: {
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
              },
            },
          },
        },
      },
    });
  }

  /**
   * Get shifts for a staff member with pagination
   */
  async getShifts(
    staffMemberId: string,
    options?: { startDate?: Date; endDate?: Date; page?: number; limit?: number }
  ) {
    const { startDate, endDate } = options || {};
    const page = options?.page ?? 1;
    const limit = Math.min(options?.limit ?? 20, 100);
    const skip = (page - 1) * limit;

    const where: Prisma.StaffShiftWhereInput = {
      staffMemberId,
      ...(startDate &&
        endDate && {
          startTime: { gte: startDate, lte: endDate },
        }),
    };

    const [shifts, total] = await Promise.all([
      this.prisma.staffShift.findMany({
        where,
        include: {
          zone: {
            select: {
              id: true,
              name: true,
            },
          },
          checkIns: {
            orderBy: { checkInTime: 'desc' },
          },
        },
        orderBy: { startTime: 'asc' },
        skip,
        take: limit,
      }),
      this.prisma.staffShift.count({ where }),
    ]);

    const totalPages = Math.ceil(total / limit);

    return {
      items: shifts,
      total,
      page,
      limit,
      totalPages,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1,
    };
  }

  /**
   * Update a shift
   */
  async updateShift(id: string, dto: UpdateShiftDto, currentUser: AuthenticatedUser) {
    const shift = await this.prisma.staffShift.findUnique({
      where: { id },
      include: {
        staffMember: {
          include: {
            festival: true,
          },
        },
      },
    });

    if (!shift) {
      throw new NotFoundException(`Shift with ID ${id} not found`);
    }

    // Check permissions
    if (
      currentUser.role !== UserRole.ADMIN &&
      shift.staffMember.festival.organizerId !== currentUser.id
    ) {
      throw new ForbiddenException('You do not have permission to update this shift');
    }

    // Validate times if both provided
    const startTime = dto.startTime ? new Date(dto.startTime) : undefined;
    const endTime = dto.endTime ? new Date(dto.endTime) : undefined;
    if (startTime && endTime && endTime <= startTime) {
      throw new BadRequestException('End time must be after start time');
    }

    return this.prisma.staffShift.update({
      where: { id },
      data: {
        ...(startTime && { startTime }),
        ...(endTime && { endTime }),
        ...(dto.zoneId !== undefined && { zoneId: dto.zoneId }),
        ...(dto.title !== undefined && { title: dto.title }),
        ...(dto.breakDuration !== undefined && { breakDuration: dto.breakDuration }),
        ...(dto.status !== undefined && { status: dto.status }),
        ...(dto.notes !== undefined && { notes: dto.notes }),
      },
      include: {
        zone: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });
  }

  /**
   * Delete a shift
   */
  async deleteShift(id: string, currentUser: AuthenticatedUser) {
    const shift = await this.prisma.staffShift.findUnique({
      where: { id },
      include: {
        staffMember: {
          include: {
            festival: true,
          },
        },
      },
    });

    if (!shift) {
      throw new NotFoundException(`Shift with ID ${id} not found`);
    }

    if (
      currentUser.role !== UserRole.ADMIN &&
      shift.staffMember.festival.organizerId !== currentUser.id
    ) {
      throw new ForbiddenException('You do not have permission to delete this shift');
    }

    await this.prisma.staffShift.delete({ where: { id } });

    return { message: 'Shift deleted successfully' };
  }

  // ============== Check-in/Check-out ==============

  /**
   * Staff check-in for a shift
   */
  async checkIn(shiftId: string, dto: CheckInDto, userId: string) {
    const shift = await this.prisma.staffShift.findUnique({
      where: { id: shiftId },
      include: {
        staffMember: true,
        checkIns: {
          where: { checkOutTime: null },
          orderBy: { checkInTime: 'desc' },
          take: 1,
        },
      },
    });

    if (!shift) {
      throw new NotFoundException(`Shift with ID ${shiftId} not found`);
    }

    // Verify the user is the staff member or an admin
    if (shift.staffMember.userId !== userId) {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { role: true },
      });

      if (user?.role !== UserRole.ADMIN && user?.role !== UserRole.ORGANIZER) {
        throw new ForbiddenException('You can only check in for your own shifts');
      }
    }

    // Check if there's already an active check-in (no checkout) for this shift
    if (shift.checkIns.length > 0) {
      throw new BadRequestException('Already checked in for this shift');
    }

    this.logger.log(`Staff check-in for shift ${shiftId}`);

    // Create a new StaffCheckIn record
    return this.prisma.staffCheckIn.create({
      data: {
        staffMemberId: shift.staffMember.id,
        shiftId: shiftId,
        checkInTime: new Date(),
        location: dto.location,
        checkInMethod: dto.checkInMethod,
        notes: dto.notes,
      },
      include: {
        shift: true,
        staffMember: {
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
              },
            },
          },
        },
      },
    });
  }

  /**
   * Staff check-out for a shift
   */
  async checkOut(shiftId: string, dto: CheckInDto, userId: string) {
    const shift = await this.prisma.staffShift.findUnique({
      where: { id: shiftId },
      include: {
        staffMember: true,
        checkIns: {
          where: { checkOutTime: null },
          orderBy: { checkInTime: 'desc' },
          take: 1,
        },
      },
    });

    if (!shift) {
      throw new NotFoundException(`Shift with ID ${shiftId} not found`);
    }

    // Verify the user is the staff member or an admin
    if (shift.staffMember.userId !== userId) {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { role: true },
      });

      if (user?.role !== UserRole.ADMIN && user?.role !== UserRole.ORGANIZER) {
        throw new ForbiddenException('You can only check out for your own shifts');
      }
    }

    // Find the active check-in record
    const activeCheckIn = shift.checkIns[0];
    if (!activeCheckIn) {
      throw new BadRequestException('Must check in before checking out');
    }

    this.logger.log(`Staff check-out for shift ${shiftId}`);

    // Update the StaffCheckIn record with checkout time
    return this.prisma.staffCheckIn.update({
      where: { id: activeCheckIn.id },
      data: {
        checkOutTime: new Date(),
        notes: dto.notes
          ? `${activeCheckIn.notes || ''}\nCheckout: ${dto.notes}`
          : activeCheckIn.notes,
      },
      include: {
        shift: true,
        staffMember: {
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
              },
            },
          },
        },
      },
    });
  }

  // ============== Statistics ==============

  /**
   * Get staff statistics for a festival
   */
  async getStaffStats(festivalId: string) {
    const todayStart = new Date(new Date().setHours(0, 0, 0, 0));
    const todayEnd = new Date(new Date().setHours(23, 59, 59, 999));

    const [totalStaff, activeStaff, byDepartment, shiftsToday] = await Promise.all([
      this.prisma.staffMember.count({ where: { festivalId } }),
      this.prisma.staffMember.count({
        where: { festivalId, isActive: true },
      }),
      this.prisma.staffMember.groupBy({
        by: ['department'],
        where: { festivalId },
        _count: true,
      }),
      this.prisma.staffShift.count({
        where: {
          staffMember: { festivalId },
          startTime: {
            gte: todayStart,
            lt: todayEnd,
          },
        },
      }),
    ]);

    // Count currently working staff (checked in today but not checked out)
    const checkedInToday = await this.prisma.staffCheckIn.count({
      where: {
        staffMember: { festivalId },
        checkInTime: {
          gte: todayStart,
        },
        checkOutTime: null,
      },
    });

    return {
      totalStaff,
      activeStaff,
      byDepartment: byDepartment.map((d) => ({
        department: d.department || 'GENERAL',
        count: d._count,
      })),
      shiftsToday,
      currentlyWorking: checkedInToday,
    };
  }

  // ============== Staff Dashboard ==============

  /**
   * Get staff member's personal dashboard with KPIs
   */
  async getStaffDashboard(userId: string, festivalId: string) {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    // Get staff member
    const staffMember = await this.prisma.staffMember.findFirst({
      where: { userId, festivalId },
      include: {
        zones: { select: { id: true, name: true } },
      },
    });

    if (!staffMember) {
      throw new NotFoundException('Staff member not found for this festival');
    }

    // Get today's validations (tickets scanned by this user)
    const validationsToday = await this.prisma.ticket.count({
      where: {
        usedByStaffId: userId,
        usedAt: {
          gte: todayStart,
          lte: todayEnd,
        },
      },
    });

    // Get total validations
    const validationsTotal = await this.prisma.ticket.count({
      where: {
        usedByStaffId: userId,
        festivalId,
      },
    });

    // Get current shift
    const currentShift = await this.prisma.staffShift.findFirst({
      where: {
        staffMemberId: staffMember.id,
        startTime: { lte: new Date() },
        endTime: { gte: new Date() },
      },
      include: {
        zone: { select: { id: true, name: true } },
      },
      orderBy: { startTime: 'desc' },
    });

    // Get zones with high occupancy as "alerts"
    const assignedZoneIds = staffMember.zones.map((z) => z.id);
    let activeAlerts = 0;
    if (assignedZoneIds.length > 0) {
      const zones = await this.prisma.zone.findMany({
        where: { id: { in: assignedZoneIds } },
        select: { currentOccupancy: true, maxCapacity: true },
      });
      activeAlerts = zones.filter((z) => z.currentOccupancy >= z.maxCapacity * 0.9).length;
    }

    // Calculate average validation time (if tracked)
    // For now, return a mock value - in real app, would track validation durations
    const avgValidationTime = 1.8; // seconds

    return {
      staffMemberId: staffMember.id,
      userId,
      festivalId,
      validationsToday,
      validationsTotal,
      avgValidationTime,
      activeAlerts,
      assignedZones: staffMember.zones,
      currentShift: currentShift
        ? {
            id: currentShift.id,
            startTime: currentShift.startTime,
            endTime: currentShift.endTime,
            zone: currentShift.zone,
            isOnShift: true,
          }
        : null,
    };
  }

  /**
   * Get current active shift for a user
   */
  async getCurrentShift(userId: string, festivalId: string) {
    const staffMember = await this.prisma.staffMember.findFirst({
      where: { userId, festivalId },
    });

    if (!staffMember) {
      return null;
    }

    const now = new Date();

    const currentShift = await this.prisma.staffShift.findFirst({
      where: {
        staffMemberId: staffMember.id,
        startTime: { lte: now },
        endTime: { gte: now },
      },
      include: {
        zone: { select: { id: true, name: true } },
        checkIns: {
          where: {
            checkOutTime: null,
          },
          orderBy: { checkInTime: 'desc' },
          take: 1,
        },
      },
      orderBy: { startTime: 'desc' },
    });

    if (!currentShift) {
      return null;
    }

    const isCheckedIn = currentShift.checkIns.length > 0;
    const checkInTime = isCheckedIn ? currentShift.checkIns[0].checkInTime : null;

    return {
      id: currentShift.id,
      startTime: currentShift.startTime,
      endTime: currentShift.endTime,
      zone: currentShift.zone,
      isCheckedIn,
      checkInTime,
      remainingMinutes: Math.max(
        0,
        Math.floor((currentShift.endTime.getTime() - now.getTime()) / 60000)
      ),
    };
  }
}
