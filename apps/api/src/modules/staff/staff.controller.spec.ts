/**
 * Staff Controller Unit Tests
 *
 * Tests for staff management HTTP endpoints including:
 * - Staff member CRUD endpoints
 * - Shift management endpoints
 * - Check-in/check-out endpoints
 * - Festival staff statistics
 */

import { Test, TestingModule } from '@nestjs/testing';
import { StaffController, FestivalStaffController } from './staff.controller';
import { StaffService, AuthenticatedUser } from './staff.service';
import { UserRole } from '@prisma/client';
import {
  adminUser,
  organizerUser,
  staffUser,
  ongoingFestival,
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
  zone: {
    id: mainStageZone.id,
    name: mainStageZone.name,
  },
  staffMember: mockStaffMember,
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
  shift: mockShift,
  staffMember: mockStaffMember,
};

const mockStaffStats = {
  totalStaff: 50,
  activeStaff: 45,
  byDepartment: [
    { department: StaffDepartment.SECURITY, count: 20 },
    { department: StaffDepartment.TICKETING, count: 15 },
  ],
  shiftsToday: 30,
  currentlyWorking: 25,
};

// ============================================================================
// Test Suite - StaffController
// ============================================================================

describe('StaffController', () => {
  let controller: StaffController;
  let staffService: jest.Mocked<StaffService>;

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

  const staffAuthUser: AuthenticatedUser = {
    id: staffUser.id,
    email: staffUser.email,
    role: UserRole.STAFF,
  };

  beforeEach(async () => {
    const mockStaffService = {
      createStaffMember: jest.fn(),
      getStaffMember: jest.fn(),
      updateStaffMember: jest.fn(),
      deleteStaffMember: jest.fn(),
      createShift: jest.fn(),
      getShifts: jest.fn(),
      updateShift: jest.fn(),
      deleteShift: jest.fn(),
      checkIn: jest.fn(),
      checkOut: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [StaffController],
      providers: [
        { provide: StaffService, useValue: mockStaffService },
      ],
    }).compile();

    controller = module.get<StaffController>(StaffController);
    staffService = module.get(StaffService);
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
    };

    it('should create a staff member', async () => {
      // Arrange
      staffService.createStaffMember.mockResolvedValue(mockStaffMember);

      // Act
      const result = await controller.createStaffMember(createDto, adminAuthUser);

      // Assert
      expect(result).toEqual(mockStaffMember);
      expect(staffService.createStaffMember).toHaveBeenCalledWith(createDto, adminAuthUser);
    });

    it('should pass correct parameters to service', async () => {
      // Arrange
      staffService.createStaffMember.mockResolvedValue(mockStaffMember);

      // Act
      await controller.createStaffMember(createDto, organizerAuthUser);

      // Assert
      expect(staffService.createStaffMember).toHaveBeenCalledWith(createDto, organizerAuthUser);
    });
  });

  // ==========================================================================
  // getStaffMember Tests
  // ==========================================================================

  describe('getStaffMember', () => {
    it('should return a staff member by ID', async () => {
      // Arrange
      staffService.getStaffMember.mockResolvedValue(mockStaffMember);

      // Act
      const result = await controller.getStaffMember(mockStaffMember.id);

      // Assert
      expect(result).toEqual(mockStaffMember);
      expect(staffService.getStaffMember).toHaveBeenCalledWith(mockStaffMember.id);
    });
  });

  // ==========================================================================
  // updateStaffMember Tests
  // ==========================================================================

  describe('updateStaffMember', () => {
    const updateDto = {
      department: StaffDepartment.TICKETING,
      isActive: false,
    };

    it('should update a staff member', async () => {
      // Arrange
      const updatedMember = { ...mockStaffMember, ...updateDto };
      staffService.updateStaffMember.mockResolvedValue(updatedMember);

      // Act
      const result = await controller.updateStaffMember(mockStaffMember.id, updateDto, adminAuthUser);

      // Assert
      expect(result).toEqual(updatedMember);
      expect(staffService.updateStaffMember).toHaveBeenCalledWith(
        mockStaffMember.id,
        updateDto,
        adminAuthUser,
      );
    });
  });

  // ==========================================================================
  // deleteStaffMember Tests
  // ==========================================================================

  describe('deleteStaffMember', () => {
    it('should delete a staff member', async () => {
      // Arrange
      const deleteResult = { message: 'Staff member deleted successfully' };
      staffService.deleteStaffMember.mockResolvedValue(deleteResult);

      // Act
      const result = await controller.deleteStaffMember(mockStaffMember.id, adminAuthUser);

      // Assert
      expect(result).toEqual(deleteResult);
      expect(staffService.deleteStaffMember).toHaveBeenCalledWith(mockStaffMember.id, adminAuthUser);
    });
  });

  // ==========================================================================
  // createShift Tests
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
    };

    it('should create a shift for a staff member', async () => {
      // Arrange
      staffService.createShift.mockResolvedValue(mockShift);

      // Act
      const result = await controller.createShift(mockStaffMember.id, createShiftDto, adminAuthUser);

      // Assert
      expect(result).toEqual(mockShift);
      expect(staffService.createShift).toHaveBeenCalledWith(
        { ...createShiftDto, staffMemberId: mockStaffMember.id },
        adminAuthUser,
      );
    });
  });

  // ==========================================================================
  // getShifts Tests
  // ==========================================================================

  describe('getShifts', () => {
    it('should return shifts for a staff member', async () => {
      // Arrange
      const shifts = [mockShift];
      staffService.getShifts.mockResolvedValue(shifts);

      // Act
      const result = await controller.getShifts(mockStaffMember.id);

      // Assert
      expect(result).toEqual(shifts);
      expect(staffService.getShifts).toHaveBeenCalledWith(mockStaffMember.id, {
        startDate: undefined,
        endDate: undefined,
      });
    });

    it('should pass date filters to service', async () => {
      // Arrange
      const startDate = '2025-06-15';
      const endDate = '2025-06-16';
      staffService.getShifts.mockResolvedValue([mockShift]);

      // Act
      await controller.getShifts(mockStaffMember.id, startDate, endDate);

      // Assert
      expect(staffService.getShifts).toHaveBeenCalledWith(mockStaffMember.id, {
        startDate: new Date(startDate),
        endDate: new Date(endDate),
      });
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

    it('should update a shift', async () => {
      // Arrange
      const updatedShift = { ...mockShift, ...updateShiftDto };
      staffService.updateShift.mockResolvedValue(updatedShift);

      // Act
      const result = await controller.updateShift(mockShift.id, updateShiftDto, adminAuthUser);

      // Assert
      expect(result).toEqual(updatedShift);
      expect(staffService.updateShift).toHaveBeenCalledWith(mockShift.id, updateShiftDto, adminAuthUser);
    });
  });

  // ==========================================================================
  // deleteShift Tests
  // ==========================================================================

  describe('deleteShift', () => {
    it('should delete a shift', async () => {
      // Arrange
      const deleteResult = { message: 'Shift deleted successfully' };
      staffService.deleteShift.mockResolvedValue(deleteResult);

      // Act
      const result = await controller.deleteShift(mockShift.id, adminAuthUser);

      // Assert
      expect(result).toEqual(deleteResult);
      expect(staffService.deleteShift).toHaveBeenCalledWith(mockShift.id, adminAuthUser);
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

    it('should check in a staff member for a shift', async () => {
      // Arrange
      staffService.checkIn.mockResolvedValue(mockCheckIn);

      // Act
      const result = await controller.checkIn(mockShift.id, checkInDto, staffAuthUser);

      // Assert
      expect(result).toEqual(mockCheckIn);
      expect(staffService.checkIn).toHaveBeenCalledWith(mockShift.id, checkInDto, staffAuthUser.id);
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

    it('should check out a staff member from a shift', async () => {
      // Arrange
      const checkOutResult = {
        ...mockCheckIn,
        checkOutTime: new Date('2025-06-15T16:05:00Z'),
      };
      staffService.checkOut.mockResolvedValue(checkOutResult);

      // Act
      const result = await controller.checkOut(mockShift.id, checkOutDto, staffAuthUser);

      // Assert
      expect(result).toEqual(checkOutResult);
      expect(staffService.checkOut).toHaveBeenCalledWith(mockShift.id, checkOutDto, staffAuthUser.id);
    });
  });
});

// ============================================================================
// Test Suite - FestivalStaffController
// ============================================================================

describe('FestivalStaffController', () => {
  let controller: FestivalStaffController;
  let staffService: jest.Mocked<StaffService>;

  beforeEach(async () => {
    const mockStaffService = {
      getStaffMembers: jest.fn(),
      getStaffStats: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [FestivalStaffController],
      providers: [
        { provide: StaffService, useValue: mockStaffService },
      ],
    }).compile();

    controller = module.get<FestivalStaffController>(FestivalStaffController);
    staffService = module.get(StaffService);
  });

  // ==========================================================================
  // getStaffMembers Tests
  // ==========================================================================

  describe('getStaffMembers', () => {
    const paginatedResult = {
      items: [mockStaffMember],
      total: 1,
      page: 1,
      limit: 50,
      totalPages: 1,
    };

    it('should return paginated staff members for a festival', async () => {
      // Arrange
      staffService.getStaffMembers.mockResolvedValue(paginatedResult);

      // Act
      const result = await controller.getStaffMembers(ongoingFestival.id);

      // Assert
      expect(result).toEqual(paginatedResult);
      expect(staffService.getStaffMembers).toHaveBeenCalledWith(ongoingFestival.id, {
        department: undefined,
        role: undefined,
        isActive: undefined,
        page: undefined,
        limit: undefined,
      });
    });

    it('should pass filter parameters to service', async () => {
      // Arrange
      staffService.getStaffMembers.mockResolvedValue(paginatedResult);

      // Act
      await controller.getStaffMembers(
        ongoingFestival.id,
        StaffDepartment.SECURITY,
        'Security Guard',
        'true',
        '2',
        '25',
      );

      // Assert
      expect(staffService.getStaffMembers).toHaveBeenCalledWith(ongoingFestival.id, {
        department: StaffDepartment.SECURITY,
        role: 'Security Guard',
        isActive: true,
        page: 2,
        limit: 25,
      });
    });

    it('should handle isActive=false correctly', async () => {
      // Arrange
      staffService.getStaffMembers.mockResolvedValue({ ...paginatedResult, items: [] });

      // Act
      await controller.getStaffMembers(
        ongoingFestival.id,
        undefined,
        undefined,
        'false',
      );

      // Assert
      expect(staffService.getStaffMembers).toHaveBeenCalledWith(ongoingFestival.id, {
        department: undefined,
        role: undefined,
        isActive: false,
        page: undefined,
        limit: undefined,
      });
    });
  });

  // ==========================================================================
  // getStaffStats Tests
  // ==========================================================================

  describe('getStaffStats', () => {
    it('should return staff statistics for a festival', async () => {
      // Arrange
      staffService.getStaffStats.mockResolvedValue(mockStaffStats);

      // Act
      const result = await controller.getStaffStats(ongoingFestival.id);

      // Assert
      expect(result).toEqual(mockStaffStats);
      expect(staffService.getStaffStats).toHaveBeenCalledWith(ongoingFestival.id);
    });
  });
});
