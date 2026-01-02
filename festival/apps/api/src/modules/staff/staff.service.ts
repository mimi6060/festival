import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
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
   */
  async createStaffMember(
    dto: CreateStaffMemberDto,
    currentUser: AuthenticatedUser,
  ) {
    // Verify the user exists
    const user = await this.prisma.user.findUnique({
      where: { id: dto.userId },
    });

    if (!user) {
      throw new NotFoundException(`User with ID ${dto.userId} not found`);
    }

    // Verify the festival exists
    const festival = await this.prisma.festival.findUnique({
      where: { id: dto.festivalId },
    });

    if (!festival) {
      throw new NotFoundException(`Festival with ID ${dto.festivalId} not found`);
    }

    // Check permissions
    if (
      currentUser.role !== UserRole.ADMIN &&
      festival.organizerId !== currentUser.id
    ) {
      throw new ForbiddenException(
        'You do not have permission to add staff to this festival',
      );
    }

    this.logger.log(
      `Creating staff member for user ${dto.userId} at festival ${dto.festivalId}`,
    );

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
   * Optimized: Uses select instead of include, enforces max limit
   */
  async getStaffMembers(
    festivalId: string,
    options?: {
      department?: string;
      role?: string;
      isActive?: boolean;
      page?: number;
      limit?: number;
    },
  ) {
    const { department, role, isActive, page = 1, limit = 50 } = options || {};
    const maxLimit = Math.min(limit, 100); // Max 100 items per page
    const skip = (page - 1) * maxLimit;

    const where: Prisma.StaffMemberWhereInput = {
      festivalId,
      ...(department && { department: department as Prisma.EnumStaffDepartmentFilter }),
      ...(role && { role: { name: role } }),
      ...(isActive !== undefined && { isActive }),
    };

    const [staffMembers, total] = await Promise.all([
      this.prisma.staffMember.findMany({
        where,
        select: {
          id: true,
          userId: true,
          festivalId: true,
          roleId: true,
          department: true,
          employeeCode: true,
          phone: true,
          emergencyContact: true,
          badgeNumber: true,
          notes: true,
          isActive: true,
          createdAt: true,
          updatedAt: true,
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              phone: true,
            },
          },
          role: {
            select: {
              id: true,
              name: true,
              permissions: true,
            },
          },
        },
        skip,
        take: maxLimit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.staffMember.count({ where }),
    ]);

    return {
      items: staffMembers,
      total,
      page,
      limit: maxLimit,
      totalPages: Math.ceil(total / maxLimit),
    };
  }

  /**
   * Get a staff member by ID
   * Optimized: Uses select instead of include, limits related data
   */
  async getStaffMember(id: string) {
    const staffMember = await this.prisma.staffMember.findUnique({
      where: { id },
      select: {
        id: true,
        userId: true,
        festivalId: true,
        roleId: true,
        department: true,
        employeeCode: true,
        phone: true,
        emergencyContact: true,
        badgeNumber: true,
        notes: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
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
        role: {
          select: {
            id: true,
            name: true,
            permissions: true,
          },
        },
        shifts: {
          select: {
            id: true,
            startTime: true,
            endTime: true,
            zoneId: true,
            title: true,
            breakDuration: true,
            status: true,
            notes: true,
          },
          orderBy: { startTime: 'asc' },
          take: 50, // Limit shifts to most recent/upcoming 50
        },
        checkIns: {
          select: {
            id: true,
            checkInTime: true,
            checkOutTime: true,
            location: true,
            checkInMethod: true,
            notes: true,
          },
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
   * Optimized: Only fetch needed fields for permission check
   */
  async updateStaffMember(
    id: string,
    dto: UpdateStaffMemberDto,
    currentUser: AuthenticatedUser,
  ) {
    const staffMember = await this.prisma.staffMember.findUnique({
      where: { id },
      select: {
        id: true,
        festivalId: true,
      },
    });

    if (!staffMember) {
      throw new NotFoundException(`Staff member with ID ${id} not found`);
    }

    // Check permissions - only fetch organizerId
    const festival = await this.prisma.festival.findUnique({
      where: { id: staffMember.festivalId },
      select: { organizerId: true },
    });

    if (
      currentUser.role !== UserRole.ADMIN &&
      festival?.organizerId !== currentUser.id
    ) {
      throw new ForbiddenException(
        'You do not have permission to update this staff member',
      );
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
   * Optimized: Only fetch needed fields for permission check
   */
  async deleteStaffMember(id: string, currentUser: AuthenticatedUser) {
    const staffMember = await this.prisma.staffMember.findUnique({
      where: { id },
      select: {
        id: true,
        festivalId: true,
      },
    });

    if (!staffMember) {
      throw new NotFoundException(`Staff member with ID ${id} not found`);
    }

    const festival = await this.prisma.festival.findUnique({
      where: { id: staffMember.festivalId },
      select: { organizerId: true },
    });

    if (
      currentUser.role !== UserRole.ADMIN &&
      festival?.organizerId !== currentUser.id
    ) {
      throw new ForbiddenException(
        'You do not have permission to delete this staff member',
      );
    }

    await this.prisma.staffMember.delete({ where: { id } });

    this.logger.log(`Staff member ${id} deleted by ${currentUser.email}`);

    return { message: 'Staff member deleted successfully' };
  }

  // ============== Shifts ==============

  /**
   * Create a shift for a staff member
   * Optimized: Only fetch needed fields for permission check
   */
  async createShift(dto: CreateShiftDto & { staffMemberId: string }, currentUser: AuthenticatedUser) {
    const staffMember = await this.prisma.staffMember.findUnique({
      where: { id: dto.staffMemberId },
      select: {
        id: true,
        festivalId: true,
      },
    });

    if (!staffMember) {
      throw new NotFoundException(`Staff member with ID ${dto.staffMemberId} not found`);
    }

    // Check permissions - only fetch organizerId
    const festival = await this.prisma.festival.findUnique({
      where: { id: staffMember.festivalId },
      select: { organizerId: true },
    });

    if (
      currentUser.role !== UserRole.ADMIN &&
      festival?.organizerId !== currentUser.id
    ) {
      throw new ForbiddenException(
        'You do not have permission to create shifts for this festival',
      );
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
   * Get shifts for a staff member
   * Optimized: Uses select instead of include, limits check-ins
   */
  async getShifts(
    staffMemberId: string,
    options?: { startDate?: Date; endDate?: Date },
  ) {
    const { startDate, endDate } = options || {};

    const where: Prisma.StaffShiftWhereInput = {
      staffMemberId,
      ...(startDate &&
        endDate && {
          startTime: { gte: startDate, lte: endDate },
        }),
    };

    return this.prisma.staffShift.findMany({
      where,
      select: {
        id: true,
        staffMemberId: true,
        startTime: true,
        endTime: true,
        zoneId: true,
        title: true,
        breakDuration: true,
        status: true,
        notes: true,
        createdAt: true,
        updatedAt: true,
        zone: {
          select: {
            id: true,
            name: true,
          },
        },
        checkIns: {
          select: {
            id: true,
            checkInTime: true,
            checkOutTime: true,
            location: true,
            checkInMethod: true,
            notes: true,
          },
          orderBy: { checkInTime: 'desc' },
          take: 10, // Limit to most recent 10 check-ins per shift
        },
      },
      orderBy: { startTime: 'asc' },
    });
  }

  /**
   * Update a shift
   * Optimized: Only fetch needed fields for permission check
   */
  async updateShift(
    id: string,
    dto: UpdateShiftDto,
    currentUser: AuthenticatedUser,
  ) {
    const shift = await this.prisma.staffShift.findUnique({
      where: { id },
      select: {
        id: true,
        staffMember: {
          select: {
            festivalId: true,
            festival: {
              select: {
                organizerId: true,
              },
            },
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
      throw new ForbiddenException(
        'You do not have permission to update this shift',
      );
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
   * Optimized: Only fetch needed fields for permission check
   */
  async deleteShift(id: string, currentUser: AuthenticatedUser) {
    const shift = await this.prisma.staffShift.findUnique({
      where: { id },
      select: {
        id: true,
        staffMember: {
          select: {
            festival: {
              select: {
                organizerId: true,
              },
            },
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
      throw new ForbiddenException(
        'You do not have permission to delete this shift',
      );
    }

    await this.prisma.staffShift.delete({ where: { id } });

    return { message: 'Shift deleted successfully' };
  }

  // ============== Check-in/Check-out ==============

  /**
   * Staff check-in for a shift
   * Optimized: Use count instead of fetching all check-ins
   */
  async checkIn(shiftId: string, dto: CheckInDto, userId: string) {
    const shift = await this.prisma.staffShift.findUnique({
      where: { id: shiftId },
      select: {
        id: true,
        staffMember: {
          select: {
            id: true,
            userId: true,
          },
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

    // Check if there's already an active check-in (no checkout) for this shift using count
    const activeCheckInCount = await this.prisma.staffCheckIn.count({
      where: {
        shiftId,
        checkOutTime: null,
      },
    });

    if (activeCheckInCount > 0) {
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
   * Optimized: Use findFirst to get active check-in directly
   */
  async checkOut(shiftId: string, dto: CheckInDto, userId: string) {
    const shift = await this.prisma.staffShift.findUnique({
      where: { id: shiftId },
      select: {
        id: true,
        staffMember: {
          select: {
            id: true,
            userId: true,
          },
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

    // Find the active check-in record using findFirst
    const activeCheckIn = await this.prisma.staffCheckIn.findFirst({
      where: {
        shiftId,
        checkOutTime: null,
      },
      orderBy: { checkInTime: 'desc' },
      select: {
        id: true,
        notes: true,
      },
    });

    if (!activeCheckIn) {
      throw new BadRequestException('Must check in before checking out');
    }

    this.logger.log(`Staff check-out for shift ${shiftId}`);

    // Update the StaffCheckIn record with checkout time
    return this.prisma.staffCheckIn.update({
      where: { id: activeCheckIn.id },
      data: {
        checkOutTime: new Date(),
        notes: dto.notes ? `${activeCheckIn.notes || ''}\nCheckout: ${dto.notes}` : activeCheckIn.notes,
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

    const [totalStaff, activeStaff, byDepartment, shiftsToday] =
      await Promise.all([
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
}
