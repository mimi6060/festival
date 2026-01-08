/**
 * Staff Service Unit Tests
 *
 * Comprehensive tests for staff management functionality including:
 * - Staff member CRUD operations
 * - Shift scheduling and management
 * - Check-in/check-out tracking
 * - Statistics
 */

import { Test, TestingModule } from '@nestjs/testing';
import { StaffService, AuthenticatedUser } from './staff.service';
import { PrismaService } from '../../prisma/prisma.service';
import { UserRole } from '@prisma/client';
import {
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import {
  adminUser,
  organizerUser,
  regularUser,
  staffUser,
  ongoingFestival,
  publishedFestival,
  mainStageZone,
} from '../../test/fixtures';
import { StaffDepartment } from './dto/create-staff-member.dto';
import { ShiftStatus } from './dto/create-shift.dto';
import { CheckInMethod } from './dto/checkin.dto';

// ============================================================================
// Mock Data
// ============================================================================

const mockStaffRole = {
  id: 'role-uuid-00000000-0000-0000-0000-000000000001',
  festivalId: ongoingFestival.id,
  name: 'Security Guard',
  permissions: ['access_zones', 'check_tickets'],
  createdAt: new Date(),
  updatedAt: new Date(),
};

const mockStaffMember = {
  id: 'staff-member-uuid-00000000-0000-0000-0000-000000000001',
  userId: staffUser.id,
  festivalId: ongoingFestival.id,
  roleId: mockStaffRole.id,
  department: StaffDepartment.SECURITY,
  employeeCode: 'SEC001',
  phone: '+33612345678',
  emergencyContact: { name: 'Emergency Contact', phone: '+33699999999' },
  badgeNumber: 'BADGE001',
  notes: 'Experienced security personnel',
  isActive: true,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const mockStaffMemberWithRelations = {
  ...mockStaffMember,
  user: {
    id: staffUser.id,
    firstName: staffUser.firstName,
    lastName: staffUser.lastName,
    email: staffUser.email,
    phone: staffUser.phone,
  },
  festival: {
    id: ongoingFestival.id,
    name: ongoingFestival.name,
    location: ongoingFestival.location,
    startDate: ongoingFestival.startDate,
    endDate: ongoingFestival.endDate,
  },
  role: mockStaffRole,
  shifts: [],
  checkIns: [],
};

const mockShift = {
  id: 'shift-uuid-00000000-0000-0000-0000-000000000001',
  staffMemberId: mockStaffMember.id,
  zoneId: mainStageZone.id,
  title: 'Morning Shift',
  startTime: new Date('2025-06-15T08:00:00Z'),
  endTime: new Date('2025-06-15T16:00:00Z'),
  breakDuration: 30,
  status: ShiftStatus.SCHEDULED,
  notes: 'Main entrance security',
  createdAt: new Date(),
  updatedAt: new Date(),
};

const mockShiftWithRelations = {
  ...mockShift,
  zone: {
    id: mainStageZone.id,
    name: mainStageZone.name,
  },
  staffMember: {
    ...mockStaffMember,
    user: {
      id: staffUser.id,
      firstName: staffUser.firstName,
      lastName: staffUser.lastName,
    },
    festival: {
      ...ongoingFestival,
      organizerId: organizerUser.id,
    },
  },
  checkIns: [],
};

const mockCheckIn = {
  id: 'checkin-uuid-00000000-0000-0000-0000-000000000001',
  staffMemberId: mockStaffMember.id,
  shiftId: mockShift.id,
  checkInTime: new Date('2025-06-15T07:55:00Z'),
  checkOutTime: null,
  location: 'Main Entrance',
  checkInMethod: CheckInMethod.QR,
  notes: 'On time',
  createdAt: new Date(),
  updatedAt: new Date(),
};

// ============================================================================
// Test Suite
// ============================================================================

describe('StaffService', () => {
  let staffService: StaffService;
  let prismaService: jest.Mocked<PrismaService>;

  const mockPrismaService = {
    user: {
      findUnique: jest.fn(),
    },
    festival: {
      findUnique: jest.fn(),
    },
    staffMember: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
      groupBy: jest.fn(),
    },
    staffShift: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
    staffCheckIn: {
      create: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      count: jest.fn(),
    },
  };

  const adminAuthUser: AuthenticatedUser = {
    id: adminUser.id,
    email: adminUser.email,
    role: UserRole.ADMIN,
  };

  const organizerAuthUser: AuthenticatedUser = {
    id: organizerUser.id,
    email: organizerUser.email,
    role: UserRole.ORGANIZER,
  };

  const regularAuthUser: AuthenticatedUser = {
    id: regularUser.id,
    email: regularUser.email,
    role: UserRole.USER,
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StaffService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    staffService = module.get<StaffService>(StaffService);
    prismaService = module.get(PrismaService);
  });

  // ==========================================================================
  // createStaffMember Tests
  // ==========================================================================

  describe('createStaffMember', () => {
    const createDto = {
      userId: staffUser.id,
      festivalId: ongoingFestival.id,
      roleId: mockStaffRole.id,
      department: StaffDepartment.SECURITY,
      employeeCode: 'SEC001',
      phone: '+33612345678',
      emergencyContact: { name: 'Emergency Contact', phone: '+33699999999' },
      badgeNumber: 'BADGE001',
      notes: 'Experienced security personnel',
      isActive: true,
    };

    it('should create a staff member successfully as admin', async () => {
      // Arrange
      mockPrismaService.user.findUnique.mockResolvedValue(staffUser);
      mockPrismaService.festival.findUnique.mockResolvedValue(ongoingFestival);
      mockPrismaService.staffMember.create.mockResolvedValue(mockStaffMemberWithRelations);

      // Act
      const result = await staffService.createStaffMember(createDto, adminAuthUser);

      // Assert
      expect(result).toEqual(mockStaffMemberWithRelations);
      expect(mockPrismaService.user.findUnique).toHaveBeenCalledWith({
        where: { id: createDto.userId },
      });
      expect(mockPrismaService.festival.findUnique).toHaveBeenCalledWith({
        where: { id: createDto.festivalId },
      });
      expect(mockPrismaService.staffMember.create).toHaveBeenCalled();
    });

    it('should create a staff member successfully as festival organizer', async () => {
      // Arrange
      const festivalWithOrganizer = { ...ongoingFestival, organizerId: organizerUser.id };
      mockPrismaService.user.findUnique.mockResolvedValue(staffUser);
      mockPrismaService.festival.findUnique.mockResolvedValue(festivalWithOrganizer);
      mockPrismaService.staffMember.create.mockResolvedValue(mockStaffMemberWithRelations);

      // Act
      const result = await staffService.createStaffMember(createDto, organizerAuthUser);

      // Assert
      expect(result).toEqual(mockStaffMemberWithRelations);
    });

    it('should throw NotFoundException if user does not exist', async () => {
      // Arrange
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      // Act & Assert
      await expect(staffService.createStaffMember(createDto, adminAuthUser))
        .rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException if festival does not exist', async () => {
      // Arrange
      mockPrismaService.user.findUnique.mockResolvedValue(staffUser);
      mockPrismaService.festival.findUnique.mockResolvedValue(null);

      // Act & Assert
      await expect(staffService.createStaffMember(createDto, adminAuthUser))
        .rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException if user is not admin or organizer', async () => {
      // Arrange
      const festivalWithDifferentOrganizer = { ...ongoingFestival, organizerId: 'different-user-id' };
      mockPrismaService.user.findUnique.mockResolvedValue(staffUser);
      mockPrismaService.festival.findUnique.mockResolvedValue(festivalWithDifferentOrganizer);

      // Act & Assert
      await expect(staffService.createStaffMember(createDto, regularAuthUser))
        .rejects.toThrow(ForbiddenException);
    });

    it('should create staff member with minimal required fields', async () => {
      // Arrange
      const minimalDto = {
        userId: staffUser.id,
        festivalId: ongoingFestival.id,
        roleId: mockStaffRole.id,
      };
      mockPrismaService.user.findUnique.mockResolvedValue(staffUser);
      mockPrismaService.festival.findUnique.mockResolvedValue(ongoingFestival);
      mockPrismaService.staffMember.create.mockResolvedValue(mockStaffMemberWithRelations);

      // Act
      await staffService.createStaffMember(minimalDto, adminAuthUser);

      // Assert
      expect(mockPrismaService.staffMember.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            userId: minimalDto.userId,
            festivalId: minimalDto.festivalId,
            roleId: minimalDto.roleId,
            isActive: true,
          }),
        }),
      );
    });
  });

  // ==========================================================================
  // getStaffMembers Tests
  // ==========================================================================

  describe('getStaffMembers', () => {
    it('should return paginated staff members for a festival', async () => {
      // Arrange
      const staffMembers = [mockStaffMemberWithRelations];
      mockPrismaService.staffMember.findMany.mockResolvedValue(staffMembers);
      mockPrismaService.staffMember.count.mockResolvedValue(1);

      // Act
      const result = await staffService.getStaffMembers(ongoingFestival.id);

      // Assert
      expect(result).toEqual({
        items: staffMembers,
        total: 1,
        page: 1,
        limit: 50,
        totalPages: 1,
      });
    });

    it('should filter by department', async () => {
      // Arrange
      mockPrismaService.staffMember.findMany.mockResolvedValue([mockStaffMemberWithRelations]);
      mockPrismaService.staffMember.count.mockResolvedValue(1);

      // Act
      await staffService.getStaffMembers(ongoingFestival.id, { department: StaffDepartment.SECURITY });

      // Assert
      expect(mockPrismaService.staffMember.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            festivalId: ongoingFestival.id,
            department: StaffDepartment.SECURITY,
          }),
        }),
      );
    });

    it('should filter by active status', async () => {
      // Arrange
      mockPrismaService.staffMember.findMany.mockResolvedValue([mockStaffMemberWithRelations]);
      mockPrismaService.staffMember.count.mockResolvedValue(1);

      // Act
      await staffService.getStaffMembers(ongoingFestival.id, { isActive: true });

      // Assert
      expect(mockPrismaService.staffMember.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            festivalId: ongoingFestival.id,
            isActive: true,
          }),
        }),
      );
    });

    it('should apply pagination correctly', async () => {
      // Arrange
      mockPrismaService.staffMember.findMany.mockResolvedValue([]);
      mockPrismaService.staffMember.count.mockResolvedValue(100);

      // Act
      const result = await staffService.getStaffMembers(ongoingFestival.id, { page: 3, limit: 10 });

      // Assert
      expect(mockPrismaService.staffMember.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 20, // (3-1) * 10
          take: 10,
        }),
      );
      expect(result.totalPages).toBe(10);
    });

    it('should return empty list when no staff members exist', async () => {
      // Arrange
      mockPrismaService.staffMember.findMany.mockResolvedValue([]);
      mockPrismaService.staffMember.count.mockResolvedValue(0);

      // Act
      const result = await staffService.getStaffMembers(ongoingFestival.id);

      // Assert
      expect(result.items).toEqual([]);
      expect(result.total).toBe(0);
    });
  });

  // ==========================================================================
  // getStaffMember Tests
  // ==========================================================================

  describe('getStaffMember', () => {
    it('should return staff member by ID', async () => {
      // Arrange
      mockPrismaService.staffMember.findUnique.mockResolvedValue(mockStaffMemberWithRelations);

      // Act
      const result = await staffService.getStaffMember(mockStaffMember.id);

      // Assert
      expect(result).toEqual(mockStaffMemberWithRelations);
      expect(mockPrismaService.staffMember.findUnique).toHaveBeenCalledWith({
        where: { id: mockStaffMember.id },
        include: expect.objectContaining({
          user: expect.any(Object),
          festival: expect.any(Object),
          role: true,
          shifts: expect.any(Object),
          checkIns: expect.any(Object),
        }),
      });
    });

    it('should throw NotFoundException if staff member not found', async () => {
      // Arrange
      mockPrismaService.staffMember.findUnique.mockResolvedValue(null);

      // Act & Assert
      await expect(staffService.getStaffMember('non-existent-id'))
        .rejects.toThrow(NotFoundException);
    });
  });

  // ==========================================================================
  // updateStaffMember Tests
  // ==========================================================================

  describe('updateStaffMember', () => {
    const updateDto = {
      department: StaffDepartment.TICKETING,
      phone: '+33699999999',
      isActive: false,
    };

    it('should update staff member successfully as admin', async () => {
      // Arrange
      const festivalWithOrganizer = { ...ongoingFestival, organizerId: organizerUser.id };
      mockPrismaService.staffMember.findUnique.mockResolvedValue(mockStaffMemberWithRelations);
      mockPrismaService.festival.findUnique.mockResolvedValue(festivalWithOrganizer);
      mockPrismaService.staffMember.update.mockResolvedValue({
        ...mockStaffMemberWithRelations,
        ...updateDto,
      });

      // Act
      const result = await staffService.updateStaffMember(mockStaffMember.id, updateDto, adminAuthUser);

      // Assert
      expect(result.department).toBe(updateDto.department);
      expect(result.phone).toBe(updateDto.phone);
      expect(result.isActive).toBe(updateDto.isActive);
    });

    it('should throw ForbiddenException if user is not admin or organizer', async () => {
      // Arrange
      const festivalWithDifferentOrganizer = { ...ongoingFestival, organizerId: 'different-user-id' };
      mockPrismaService.staffMember.findUnique.mockResolvedValue(mockStaffMemberWithRelations);
      mockPrismaService.festival.findUnique.mockResolvedValue(festivalWithDifferentOrganizer);

      // Act & Assert
      await expect(staffService.updateStaffMember(mockStaffMember.id, updateDto, regularAuthUser))
        .rejects.toThrow(ForbiddenException);
    });

    it('should allow organizer to update their festival staff', async () => {
      // Arrange
      const festivalWithOrganizer = { ...ongoingFestival, organizerId: organizerUser.id };
      mockPrismaService.staffMember.findUnique.mockResolvedValue(mockStaffMemberWithRelations);
      mockPrismaService.festival.findUnique.mockResolvedValue(festivalWithOrganizer);
      mockPrismaService.staffMember.update.mockResolvedValue({
        ...mockStaffMemberWithRelations,
        ...updateDto,
      });

      // Act
      const result = await staffService.updateStaffMember(mockStaffMember.id, updateDto, organizerAuthUser);

      // Assert
      expect(result).toBeDefined();
      expect(mockPrismaService.staffMember.update).toHaveBeenCalled();
    });
  });

  // ==========================================================================
  // deleteStaffMember Tests
  // ==========================================================================

  describe('deleteStaffMember', () => {
    it('should delete staff member successfully as admin', async () => {
      // Arrange
      const festivalWithOrganizer = { ...ongoingFestival, organizerId: organizerUser.id };
      mockPrismaService.staffMember.findUnique.mockResolvedValue(mockStaffMemberWithRelations);
      mockPrismaService.festival.findUnique.mockResolvedValue(festivalWithOrganizer);
      mockPrismaService.staffMember.delete.mockResolvedValue(mockStaffMember);

      // Act
      const result = await staffService.deleteStaffMember(mockStaffMember.id, adminAuthUser);

      // Assert
      expect(result).toEqual({ message: 'Staff member deleted successfully' });
      expect(mockPrismaService.staffMember.delete).toHaveBeenCalledWith({
        where: { id: mockStaffMember.id },
      });
    });

    it('should throw ForbiddenException if user is not admin or organizer', async () => {
      // Arrange
      const festivalWithDifferentOrganizer = { ...ongoingFestival, organizerId: 'different-user-id' };
      mockPrismaService.staffMember.findUnique.mockResolvedValue(mockStaffMemberWithRelations);
      mockPrismaService.festival.findUnique.mockResolvedValue(festivalWithDifferentOrganizer);

      // Act & Assert
      await expect(staffService.deleteStaffMember(mockStaffMember.id, regularAuthUser))
        .rejects.toThrow(ForbiddenException);
    });

    it('should throw NotFoundException if staff member not found', async () => {
      // Arrange
      mockPrismaService.staffMember.findUnique.mockResolvedValue(null);

      // Act & Assert
      await expect(staffService.deleteStaffMember('non-existent-id', adminAuthUser))
        .rejects.toThrow(NotFoundException);
    });
  });

  // ==========================================================================
  // createShift Tests (assignShift)
  // ==========================================================================

  describe('createShift', () => {
    const createShiftDto = {
      staffMemberId: mockStaffMember.id,
      zoneId: mainStageZone.id,
      title: 'Morning Shift',
      startTime: '2025-06-15T08:00:00Z',
      endTime: '2025-06-15T16:00:00Z',
      breakDuration: 30,
      status: ShiftStatus.SCHEDULED,
      notes: 'Main entrance security',
    };

    it('should create a shift successfully', async () => {
      // Arrange
      const festivalWithOrganizer = { ...ongoingFestival, organizerId: organizerUser.id };
      mockPrismaService.staffMember.findUnique.mockResolvedValue(mockStaffMemberWithRelations);
      mockPrismaService.festival.findUnique.mockResolvedValue(festivalWithOrganizer);
      mockPrismaService.staffShift.create.mockResolvedValue(mockShiftWithRelations);

      // Act
      const result = await staffService.createShift(createShiftDto, adminAuthUser);

      // Assert
      expect(result).toEqual(mockShiftWithRelations);
      expect(mockPrismaService.staffShift.create).toHaveBeenCalled();
    });

    it('should throw BadRequestException if end time is before start time', async () => {
      // Arrange
      const invalidDto = {
        ...createShiftDto,
        startTime: '2025-06-15T16:00:00Z',
        endTime: '2025-06-15T08:00:00Z', // End before start
      };
      const festivalWithOrganizer = { ...ongoingFestival, organizerId: organizerUser.id };
      mockPrismaService.staffMember.findUnique.mockResolvedValue(mockStaffMemberWithRelations);
      mockPrismaService.festival.findUnique.mockResolvedValue(festivalWithOrganizer);

      // Act & Assert
      await expect(staffService.createShift(invalidDto, adminAuthUser))
        .rejects.toThrow(BadRequestException);
    });

    it('should throw ForbiddenException if user is not admin or organizer', async () => {
      // Arrange
      const festivalWithDifferentOrganizer = { ...ongoingFestival, organizerId: 'different-user-id' };
      mockPrismaService.staffMember.findUnique.mockResolvedValue(mockStaffMemberWithRelations);
      mockPrismaService.festival.findUnique.mockResolvedValue(festivalWithDifferentOrganizer);

      // Act & Assert
      await expect(staffService.createShift(createShiftDto, regularAuthUser))
        .rejects.toThrow(ForbiddenException);
    });

    it('should throw NotFoundException if staff member not found', async () => {
      // Arrange
      mockPrismaService.staffMember.findUnique.mockResolvedValue(null);

      // Act & Assert
      await expect(staffService.createShift(createShiftDto, adminAuthUser))
        .rejects.toThrow(NotFoundException);
    });
  });

  // ==========================================================================
  // getShifts Tests (getShiftSchedule)
  // ==========================================================================

  describe('getShifts', () => {
    it('should return all shifts for a staff member', async () => {
      // Arrange
      const shifts = [mockShiftWithRelations];
      mockPrismaService.staffShift.findMany.mockResolvedValue(shifts);

      // Act
      const result = await staffService.getShifts(mockStaffMember.id);

      // Assert
      expect(result).toEqual(shifts);
      expect(mockPrismaService.staffShift.findMany).toHaveBeenCalledWith({
        where: { staffMemberId: mockStaffMember.id },
        include: expect.any(Object),
        orderBy: { startTime: 'asc' },
      });
    });

    it('should filter shifts by date range', async () => {
      // Arrange
      const startDate = new Date('2025-06-15T00:00:00Z');
      const endDate = new Date('2025-06-16T23:59:59Z');
      mockPrismaService.staffShift.findMany.mockResolvedValue([mockShiftWithRelations]);

      // Act
      await staffService.getShifts(mockStaffMember.id, { startDate, endDate });

      // Assert
      expect(mockPrismaService.staffShift.findMany).toHaveBeenCalledWith({
        where: {
          staffMemberId: mockStaffMember.id,
          startTime: { gte: startDate, lte: endDate },
        },
        include: expect.any(Object),
        orderBy: { startTime: 'asc' },
      });
    });

    it('should return empty array when no shifts exist', async () => {
      // Arrange
      mockPrismaService.staffShift.findMany.mockResolvedValue([]);

      // Act
      const result = await staffService.getShifts(mockStaffMember.id);

      // Assert
      expect(result).toEqual([]);
    });
  });

  // ==========================================================================
  // updateShift Tests
  // ==========================================================================

  describe('updateShift', () => {
    const updateShiftDto = {
      title: 'Updated Shift',
      status: ShiftStatus.CONFIRMED,
    };

    it('should update shift successfully', async () => {
      // Arrange
      mockPrismaService.staffShift.findUnique.mockResolvedValue(mockShiftWithRelations);
      mockPrismaService.staffShift.update.mockResolvedValue({
        ...mockShiftWithRelations,
        ...updateShiftDto,
      });

      // Act
      const result = await staffService.updateShift(mockShift.id, updateShiftDto, adminAuthUser);

      // Assert
      expect(result.title).toBe(updateShiftDto.title);
      expect(result.status).toBe(updateShiftDto.status);
    });

    it('should throw NotFoundException if shift not found', async () => {
      // Arrange
      mockPrismaService.staffShift.findUnique.mockResolvedValue(null);

      // Act & Assert
      await expect(staffService.updateShift('non-existent-id', updateShiftDto, adminAuthUser))
        .rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if updated times are invalid', async () => {
      // Arrange
      const invalidTimeUpdate = {
        startTime: '2025-06-15T16:00:00Z',
        endTime: '2025-06-15T08:00:00Z',
      };
      mockPrismaService.staffShift.findUnique.mockResolvedValue(mockShiftWithRelations);

      // Act & Assert
      await expect(staffService.updateShift(mockShift.id, invalidTimeUpdate, adminAuthUser))
        .rejects.toThrow(BadRequestException);
    });

    it('should throw ForbiddenException for non-authorized user', async () => {
      // Arrange
      const shiftWithDifferentOrganizer = {
        ...mockShiftWithRelations,
        staffMember: {
          ...mockShiftWithRelations.staffMember,
          festival: { ...ongoingFestival, organizerId: 'different-user-id' },
        },
      };
      mockPrismaService.staffShift.findUnique.mockResolvedValue(shiftWithDifferentOrganizer);

      // Act & Assert
      await expect(staffService.updateShift(mockShift.id, updateShiftDto, regularAuthUser))
        .rejects.toThrow(ForbiddenException);
    });
  });

  // ==========================================================================
  // deleteShift Tests
  // ==========================================================================

  describe('deleteShift', () => {
    it('should delete shift successfully', async () => {
      // Arrange
      mockPrismaService.staffShift.findUnique.mockResolvedValue(mockShiftWithRelations);
      mockPrismaService.staffShift.delete.mockResolvedValue(mockShift);

      // Act
      const result = await staffService.deleteShift(mockShift.id, adminAuthUser);

      // Assert
      expect(result).toEqual({ message: 'Shift deleted successfully' });
      expect(mockPrismaService.staffShift.delete).toHaveBeenCalledWith({
        where: { id: mockShift.id },
      });
    });

    it('should throw NotFoundException if shift not found', async () => {
      // Arrange
      mockPrismaService.staffShift.findUnique.mockResolvedValue(null);

      // Act & Assert
      await expect(staffService.deleteShift('non-existent-id', adminAuthUser))
        .rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException for non-authorized user', async () => {
      // Arrange
      const shiftWithDifferentOrganizer = {
        ...mockShiftWithRelations,
        staffMember: {
          ...mockShiftWithRelations.staffMember,
          festival: { ...ongoingFestival, organizerId: 'different-user-id' },
        },
      };
      mockPrismaService.staffShift.findUnique.mockResolvedValue(shiftWithDifferentOrganizer);

      // Act & Assert
      await expect(staffService.deleteShift(mockShift.id, regularAuthUser))
        .rejects.toThrow(ForbiddenException);
    });
  });

  // ==========================================================================
  // checkIn Tests
  // ==========================================================================

  describe('checkIn', () => {
    const checkInDto = {
      staffMemberId: mockStaffMember.id,
      location: 'Main Entrance',
      checkInMethod: CheckInMethod.QR,
      notes: 'On time',
    };

    it('should check in staff member for their own shift', async () => {
      // Arrange
      const shiftWithNoActiveCheckIn = {
        ...mockShiftWithRelations,
        staffMember: { ...mockStaffMember, userId: staffUser.id },
        checkIns: [],
      };
      mockPrismaService.staffShift.findUnique.mockResolvedValue(shiftWithNoActiveCheckIn);
      mockPrismaService.staffCheckIn.create.mockResolvedValue({
        ...mockCheckIn,
        shift: mockShift,
        staffMember: mockStaffMemberWithRelations,
      });

      // Act
      const result = await staffService.checkIn(mockShift.id, checkInDto, staffUser.id);

      // Assert
      expect(result).toBeDefined();
      expect(mockPrismaService.staffCheckIn.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            staffMemberId: mockStaffMember.id,
            shiftId: mockShift.id,
            location: checkInDto.location,
            checkInMethod: checkInDto.checkInMethod,
          }),
        }),
      );
    });

    it('should allow admin to check in for any shift', async () => {
      // Arrange
      const shiftWithNoActiveCheckIn = {
        ...mockShiftWithRelations,
        staffMember: { ...mockStaffMember, userId: 'different-user-id' },
        checkIns: [],
      };
      mockPrismaService.staffShift.findUnique.mockResolvedValue(shiftWithNoActiveCheckIn);
      mockPrismaService.user.findUnique.mockResolvedValue({ ...adminUser, role: UserRole.ADMIN });
      mockPrismaService.staffCheckIn.create.mockResolvedValue({
        ...mockCheckIn,
        shift: mockShift,
        staffMember: mockStaffMemberWithRelations,
      });

      // Act
      const result = await staffService.checkIn(mockShift.id, checkInDto, adminUser.id);

      // Assert
      expect(result).toBeDefined();
    });

    it('should throw NotFoundException if shift not found', async () => {
      // Arrange
      mockPrismaService.staffShift.findUnique.mockResolvedValue(null);

      // Act & Assert
      await expect(staffService.checkIn('non-existent-id', checkInDto, staffUser.id))
        .rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if already checked in', async () => {
      // Arrange
      const shiftWithActiveCheckIn = {
        ...mockShiftWithRelations,
        staffMember: { ...mockStaffMember, userId: staffUser.id },
        checkIns: [{ ...mockCheckIn, checkOutTime: null }],
      };
      mockPrismaService.staffShift.findUnique.mockResolvedValue(shiftWithActiveCheckIn);

      // Act & Assert
      await expect(staffService.checkIn(mockShift.id, checkInDto, staffUser.id))
        .rejects.toThrow(BadRequestException);
    });

    it('should throw ForbiddenException if non-staff user tries to check in for others shift', async () => {
      // Arrange
      const shiftWithDifferentUser = {
        ...mockShiftWithRelations,
        staffMember: { ...mockStaffMember, userId: 'different-user-id' },
        checkIns: [],
      };
      mockPrismaService.staffShift.findUnique.mockResolvedValue(shiftWithDifferentUser);
      mockPrismaService.user.findUnique.mockResolvedValue({ ...regularUser, role: UserRole.USER });

      // Act & Assert
      await expect(staffService.checkIn(mockShift.id, checkInDto, regularUser.id))
        .rejects.toThrow(ForbiddenException);
    });
  });

  // ==========================================================================
  // checkOut Tests
  // ==========================================================================

  describe('checkOut', () => {
    const checkOutDto = {
      staffMemberId: mockStaffMember.id,
      notes: 'Shift completed',
    };

    it('should check out staff member from their shift', async () => {
      // Arrange
      const shiftWithActiveCheckIn = {
        ...mockShiftWithRelations,
        staffMember: { ...mockStaffMember, userId: staffUser.id },
        checkIns: [{ ...mockCheckIn, checkOutTime: null }],
      };
      mockPrismaService.staffShift.findUnique.mockResolvedValue(shiftWithActiveCheckIn);
      mockPrismaService.staffCheckIn.update.mockResolvedValue({
        ...mockCheckIn,
        checkOutTime: new Date(),
        shift: mockShift,
        staffMember: mockStaffMemberWithRelations,
      });

      // Act
      const result = await staffService.checkOut(mockShift.id, checkOutDto, staffUser.id);

      // Assert
      expect(result).toBeDefined();
      expect(mockPrismaService.staffCheckIn.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: mockCheckIn.id },
          data: expect.objectContaining({
            checkOutTime: expect.any(Date),
          }),
        }),
      );
    });

    it('should throw NotFoundException if shift not found', async () => {
      // Arrange
      mockPrismaService.staffShift.findUnique.mockResolvedValue(null);

      // Act & Assert
      await expect(staffService.checkOut('non-existent-id', checkOutDto, staffUser.id))
        .rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if not checked in', async () => {
      // Arrange
      const shiftWithNoActiveCheckIn = {
        ...mockShiftWithRelations,
        staffMember: { ...mockStaffMember, userId: staffUser.id },
        checkIns: [],
      };
      mockPrismaService.staffShift.findUnique.mockResolvedValue(shiftWithNoActiveCheckIn);

      // Act & Assert
      await expect(staffService.checkOut(mockShift.id, checkOutDto, staffUser.id))
        .rejects.toThrow(BadRequestException);
    });

    it('should throw ForbiddenException if non-staff user tries to check out for others shift', async () => {
      // Arrange
      const shiftWithDifferentUser = {
        ...mockShiftWithRelations,
        staffMember: { ...mockStaffMember, userId: 'different-user-id' },
        checkIns: [mockCheckIn],
      };
      mockPrismaService.staffShift.findUnique.mockResolvedValue(shiftWithDifferentUser);
      mockPrismaService.user.findUnique.mockResolvedValue({ ...regularUser, role: UserRole.USER });

      // Act & Assert
      await expect(staffService.checkOut(mockShift.id, checkOutDto, regularUser.id))
        .rejects.toThrow(ForbiddenException);
    });

    it('should allow admin to check out for any shift', async () => {
      // Arrange
      const shiftWithActiveCheckIn = {
        ...mockShiftWithRelations,
        staffMember: { ...mockStaffMember, userId: 'different-user-id' },
        checkIns: [{ ...mockCheckIn, checkOutTime: null }],
      };
      mockPrismaService.staffShift.findUnique.mockResolvedValue(shiftWithActiveCheckIn);
      mockPrismaService.user.findUnique.mockResolvedValue({ ...adminUser, role: UserRole.ADMIN });
      mockPrismaService.staffCheckIn.update.mockResolvedValue({
        ...mockCheckIn,
        checkOutTime: new Date(),
        shift: mockShift,
        staffMember: mockStaffMemberWithRelations,
      });

      // Act
      const result = await staffService.checkOut(mockShift.id, checkOutDto, adminUser.id);

      // Assert
      expect(result).toBeDefined();
    });
  });

  // ==========================================================================
  // getStaffStats Tests
  // ==========================================================================

  describe('getStaffStats', () => {
    it('should return staff statistics for a festival', async () => {
      // Arrange
      mockPrismaService.staffMember.count
        .mockResolvedValueOnce(50) // totalStaff
        .mockResolvedValueOnce(45); // activeStaff
      mockPrismaService.staffMember.groupBy.mockResolvedValue([
        { department: StaffDepartment.SECURITY, _count: 20 },
        { department: StaffDepartment.TICKETING, _count: 15 },
        { department: StaffDepartment.FOOD_BEVERAGE, _count: 15 },
      ]);
      mockPrismaService.staffShift.count.mockResolvedValue(30); // shiftsToday
      mockPrismaService.staffCheckIn.count.mockResolvedValue(25); // currentlyWorking

      // Act
      const result = await staffService.getStaffStats(ongoingFestival.id);

      // Assert
      expect(result).toEqual({
        totalStaff: 50,
        activeStaff: 45,
        byDepartment: [
          { department: StaffDepartment.SECURITY, count: 20 },
          { department: StaffDepartment.TICKETING, count: 15 },
          { department: StaffDepartment.FOOD_BEVERAGE, count: 15 },
        ],
        shiftsToday: 30,
        currentlyWorking: 25,
      });
    });

    it('should return zero values for empty festival', async () => {
      // Arrange
      mockPrismaService.staffMember.count.mockResolvedValue(0);
      mockPrismaService.staffMember.groupBy.mockResolvedValue([]);
      mockPrismaService.staffShift.count.mockResolvedValue(0);
      mockPrismaService.staffCheckIn.count.mockResolvedValue(0);

      // Act
      const result = await staffService.getStaffStats(publishedFestival.id);

      // Assert
      expect(result).toEqual({
        totalStaff: 0,
        activeStaff: 0,
        byDepartment: [],
        shiftsToday: 0,
        currentlyWorking: 0,
      });
    });

    it('should handle null department in groupBy results', async () => {
      // Arrange
      mockPrismaService.staffMember.count.mockResolvedValue(10);
      mockPrismaService.staffMember.groupBy.mockResolvedValue([
        { department: null, _count: 5 },
        { department: StaffDepartment.SECURITY, _count: 5 },
      ]);
      mockPrismaService.staffShift.count.mockResolvedValue(0);
      mockPrismaService.staffCheckIn.count.mockResolvedValue(0);

      // Act
      const result = await staffService.getStaffStats(ongoingFestival.id);

      // Assert
      expect(result.byDepartment).toContainEqual({ department: 'GENERAL', count: 5 });
    });
  });
});
