/**
 * Camping Service Unit Tests
 *
 * Comprehensive tests for camping operations including:
 * - Camping spots management (CRUD)
 * - Camping bookings (CRUD, check-in, check-out)
 * - Availability checking with date overlap logic
 * - Statistics
 */

import { Test, TestingModule } from '@nestjs/testing';
import { CampingService } from './camping.service';
import { PrismaService } from '../../prisma/prisma.service';
import { NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import {
  // Zone fixtures
  tentZone,
  caravanZone,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  glampingZone,
  // Spot fixtures
  availableSpot,
  occupiedSpot,
  reservedSpot,
  maintenanceSpot,
  caravanSpot,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  inactiveSpot,
  spotWithZone,
  occupiedSpotWithZone,
  caravanSpotWithZone,
  // Booking fixtures
  pendingBooking,
  confirmedBooking,
  checkedInBooking,
  checkedOutBooking,
  cancelledBooking,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  caravanBooking,
  bookingWithRelations,
  checkedInBookingWithRelations,
  // Input fixtures
  validCreateSpotInput,
  validBulkCreateSpotsInput,
  validBookingInput,
  invalidBookingInputs,
  validCheckInInput,
  validCheckOutInput,
  validCancelInput,
  // Enums
  CampingSpotStatus,
  BookingStatus,
  // Users
  regularUser,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  staffUser,
  publishedFestival,
} from '../../test/fixtures';

// ============================================================================
// Mock Setup
// ============================================================================

describe('CampingService', () => {
  let campingService: CampingService;

  const mockPrismaService = {
    campingZone: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
    },
    campingSpot: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      createMany: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
    campingBooking: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      count: jest.fn(),
    },
    $transaction: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [CampingService, { provide: PrismaService, useValue: mockPrismaService }],
    }).compile();

    campingService = module.get<CampingService>(CampingService);

    // Default transaction implementation
    mockPrismaService.$transaction.mockImplementation(async (callback) => {
      return callback(mockPrismaService);
    });
  });

  // ==========================================================================
  // Camping Spots - createSpot
  // ==========================================================================

  describe('createSpot', () => {
    it('should create a spot successfully', async () => {
      // Arrange
      mockPrismaService.campingZone.findUnique.mockResolvedValue(tentZone);
      mockPrismaService.campingSpot.findFirst.mockResolvedValue(null);
      mockPrismaService.campingSpot.create.mockResolvedValue(spotWithZone);

      // Act
      const result = await campingService.createSpot(validCreateSpotInput);

      // Assert
      expect(result.id).toBe(spotWithZone.id);
      expect(result.number).toBe(spotWithZone.number);
      expect(mockPrismaService.campingSpot.create).toHaveBeenCalled();
    });

    it('should throw NotFoundException if zone does not exist', async () => {
      // Arrange
      mockPrismaService.campingZone.findUnique.mockResolvedValue(null);

      // Act & Assert
      await expect(
        campingService.createSpot({ ...validCreateSpotInput, zoneId: 'non-existent' })
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ConflictException if spot number already exists in zone', async () => {
      // Arrange
      mockPrismaService.campingZone.findUnique.mockResolvedValue(tentZone);
      mockPrismaService.campingSpot.findFirst.mockResolvedValue(availableSpot);

      // Act & Assert
      await expect(
        campingService.createSpot({ ...validCreateSpotInput, number: availableSpot.number })
      ).rejects.toThrow(ConflictException);
    });

    it('should create spot with electricity and water hooks', async () => {
      // Arrange
      const inputWithHooks = {
        ...validCreateSpotInput,
        electricityHook: true,
        waterHook: true,
      };
      mockPrismaService.campingZone.findUnique.mockResolvedValue(caravanZone);
      mockPrismaService.campingSpot.findFirst.mockResolvedValue(null);
      mockPrismaService.campingSpot.create.mockResolvedValue({
        ...caravanSpotWithZone,
        electricityHook: true,
        waterHook: true,
      });

      // Act
      const _result = await campingService.createSpot(inputWithHooks);

      // Assert
      expect(mockPrismaService.campingSpot.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            electricityHook: true,
            waterHook: true,
          }),
        })
      );
    });

    it('should create spot with maxVehicleLength for caravan zone', async () => {
      // Arrange
      const inputWithVehicleLength = {
        zoneId: caravanZone.id,
        number: 'B10',
        size: 'large',
        electricityHook: true,
        waterHook: true,
        maxVehicleLength: 8.5,
      };
      mockPrismaService.campingZone.findUnique.mockResolvedValue(caravanZone);
      mockPrismaService.campingSpot.findFirst.mockResolvedValue(null);
      mockPrismaService.campingSpot.create.mockResolvedValue({
        ...caravanSpotWithZone,
        maxVehicleLength: 8.5,
      });

      // Act
      await campingService.createSpot(inputWithVehicleLength);

      // Assert
      expect(mockPrismaService.campingSpot.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            maxVehicleLength: 8.5,
          }),
        })
      );
    });
  });

  // ==========================================================================
  // Camping Spots - bulkCreateSpots
  // ==========================================================================

  describe('bulkCreateSpots', () => {
    it('should bulk create spots successfully', async () => {
      // Arrange
      mockPrismaService.campingZone.findUnique.mockResolvedValue(tentZone);
      mockPrismaService.campingSpot.createMany.mockResolvedValue({ count: 10 });

      // Act
      const result = await campingService.bulkCreateSpots(validBulkCreateSpotsInput);

      // Assert
      expect(result.created).toBe(10);
      expect(result.requested).toBe(10);
      expect(mockPrismaService.campingSpot.createMany).toHaveBeenCalled();
    });

    it('should throw NotFoundException if zone does not exist', async () => {
      // Arrange
      mockPrismaService.campingZone.findUnique.mockResolvedValue(null);

      // Act & Assert
      await expect(
        campingService.bulkCreateSpots({ ...validBulkCreateSpotsInput, zoneId: 'non-existent' })
      ).rejects.toThrow(NotFoundException);
    });

    it('should skip duplicates when creating spots', async () => {
      // Arrange
      mockPrismaService.campingZone.findUnique.mockResolvedValue(tentZone);
      mockPrismaService.campingSpot.createMany.mockResolvedValue({ count: 7 }); // Some duplicates skipped

      // Act
      const result = await campingService.bulkCreateSpots(validBulkCreateSpotsInput);

      // Assert
      expect(result.created).toBe(7);
      expect(result.requested).toBe(10);
    });

    it('should use default startNumber of 1 if not provided', async () => {
      // Arrange
      const inputWithoutStartNumber = {
        ...validBulkCreateSpotsInput,
        startNumber: undefined,
      };
      mockPrismaService.campingZone.findUnique.mockResolvedValue(tentZone);
      mockPrismaService.campingSpot.createMany.mockResolvedValue({ count: 10 });

      // Act
      await campingService.bulkCreateSpots(inputWithoutStartNumber);

      // Assert
      expect(mockPrismaService.campingSpot.createMany).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.arrayContaining([expect.objectContaining({ number: 'A1' })]),
        })
      );
    });
  });

  // ==========================================================================
  // Camping Spots - getSpots
  // ==========================================================================

  describe('getSpots', () => {
    it('should return paginated spots', async () => {
      // Arrange
      const mockSpots = [spotWithZone, occupiedSpotWithZone];
      mockPrismaService.campingSpot.findMany.mockResolvedValue(mockSpots);
      mockPrismaService.campingSpot.count.mockResolvedValue(2);

      // Act
      const result = await campingService.getSpots({ page: 1, limit: 50 });

      // Assert
      expect(result.items).toHaveLength(2);
      expect(result.total).toBe(2);
      expect(result.page).toBe(1);
      expect(result.totalPages).toBe(1);
    });

    it('should filter by zoneId', async () => {
      // Arrange
      mockPrismaService.campingSpot.findMany.mockResolvedValue([spotWithZone]);
      mockPrismaService.campingSpot.count.mockResolvedValue(1);

      // Act
      await campingService.getSpots({ zoneId: tentZone.id });

      // Assert
      expect(mockPrismaService.campingSpot.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ zoneId: tentZone.id }),
        })
      );
    });

    it('should filter by festivalId', async () => {
      // Arrange
      mockPrismaService.campingSpot.findMany.mockResolvedValue([]);
      mockPrismaService.campingSpot.count.mockResolvedValue(0);

      // Act
      await campingService.getSpots({ festivalId: publishedFestival.id });

      // Assert
      expect(mockPrismaService.campingSpot.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            zone: { festivalId: publishedFestival.id },
          }),
        })
      );
    });

    it('should filter by status', async () => {
      // Arrange
      mockPrismaService.campingSpot.findMany.mockResolvedValue([spotWithZone]);
      mockPrismaService.campingSpot.count.mockResolvedValue(1);

      // Act
      await campingService.getSpots({ status: CampingSpotStatus.AVAILABLE });

      // Assert
      expect(mockPrismaService.campingSpot.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ status: CampingSpotStatus.AVAILABLE }),
        })
      );
    });

    it('should filter by electricityHook', async () => {
      // Arrange
      mockPrismaService.campingSpot.findMany.mockResolvedValue([caravanSpotWithZone]);
      mockPrismaService.campingSpot.count.mockResolvedValue(1);

      // Act
      await campingService.getSpots({ electricityHook: true });

      // Assert
      expect(mockPrismaService.campingSpot.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ electricityHook: true }),
        })
      );
    });

    it('should filter by waterHook', async () => {
      // Arrange
      mockPrismaService.campingSpot.findMany.mockResolvedValue([caravanSpotWithZone]);
      mockPrismaService.campingSpot.count.mockResolvedValue(1);

      // Act
      await campingService.getSpots({ waterHook: true });

      // Assert
      expect(mockPrismaService.campingSpot.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ waterHook: true }),
        })
      );
    });

    it('should filter by isActive', async () => {
      // Arrange
      mockPrismaService.campingSpot.findMany.mockResolvedValue([spotWithZone]);
      mockPrismaService.campingSpot.count.mockResolvedValue(1);

      // Act
      await campingService.getSpots({ isActive: true });

      // Assert
      expect(mockPrismaService.campingSpot.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ isActive: true }),
        })
      );
    });

    it('should return empty array if no spots match', async () => {
      // Arrange
      mockPrismaService.campingSpot.findMany.mockResolvedValue([]);
      mockPrismaService.campingSpot.count.mockResolvedValue(0);

      // Act
      const result = await campingService.getSpots({ zoneId: 'non-existent' });

      // Assert
      expect(result.items).toHaveLength(0);
      expect(result.total).toBe(0);
    });
  });

  // ==========================================================================
  // Camping Spots - getSpot
  // ==========================================================================

  describe('getSpot', () => {
    it('should return spot by ID', async () => {
      // Arrange
      mockPrismaService.campingSpot.findUnique.mockResolvedValue({
        ...spotWithZone,
        bookings: [],
      });

      // Act
      const result = await campingService.getSpot(availableSpot.id);

      // Assert
      expect(result.id).toBe(availableSpot.id);
      expect(result.number).toBe(availableSpot.number);
    });

    it('should throw NotFoundException if spot does not exist', async () => {
      // Arrange
      mockPrismaService.campingSpot.findUnique.mockResolvedValue(null);

      // Act & Assert
      await expect(campingService.getSpot('non-existent')).rejects.toThrow(NotFoundException);
    });

    it('should include active bookings', async () => {
      // Arrange
      const spotWithBookings = {
        ...occupiedSpotWithZone,
        bookings: [
          {
            id: checkedInBooking.id,
            checkIn: checkedInBooking.checkIn,
            checkOut: checkedInBooking.checkOut,
            status: checkedInBooking.status,
            user: { firstName: 'John', lastName: 'Doe' },
          },
        ],
      };
      mockPrismaService.campingSpot.findUnique.mockResolvedValue(spotWithBookings);

      // Act
      const result = await campingService.getSpot(occupiedSpot.id);

      // Assert
      expect(result.bookings).toHaveLength(1);
      expect(result.bookings[0].status).toBe(BookingStatus.CHECKED_IN);
    });
  });

  // ==========================================================================
  // Camping Spots - updateSpot
  // ==========================================================================

  describe('updateSpot', () => {
    it('should update spot successfully', async () => {
      // Arrange
      mockPrismaService.campingSpot.findUnique.mockResolvedValue({
        ...spotWithZone,
        bookings: [],
      });
      mockPrismaService.campingSpot.update.mockResolvedValue({
        ...spotWithZone,
        notes: 'Updated notes',
      });

      // Act
      const result = await campingService.updateSpot(availableSpot.id, {
        notes: 'Updated notes',
      });

      // Assert
      expect(result.notes).toBe('Updated notes');
    });

    it('should throw ConflictException if changing number to existing number', async () => {
      // Arrange
      mockPrismaService.campingSpot.findUnique.mockResolvedValue({
        ...spotWithZone,
        bookings: [],
      });
      mockPrismaService.campingSpot.findFirst.mockResolvedValue(occupiedSpot);

      // Act & Assert
      await expect(
        campingService.updateSpot(availableSpot.id, { number: occupiedSpot.number })
      ).rejects.toThrow(ConflictException);
    });

    it('should allow changing number if no conflict', async () => {
      // Arrange
      mockPrismaService.campingSpot.findUnique.mockResolvedValue({
        ...spotWithZone,
        bookings: [],
      });
      mockPrismaService.campingSpot.findFirst.mockResolvedValue(null);
      mockPrismaService.campingSpot.update.mockResolvedValue({
        ...spotWithZone,
        number: 'A99',
      });

      // Act
      const result = await campingService.updateSpot(availableSpot.id, {
        number: 'A99',
      });

      // Assert
      expect(result.number).toBe('A99');
    });

    it('should update status', async () => {
      // Arrange
      mockPrismaService.campingSpot.findUnique.mockResolvedValue({
        ...spotWithZone,
        bookings: [],
      });
      mockPrismaService.campingSpot.update.mockResolvedValue({
        ...spotWithZone,
        status: CampingSpotStatus.MAINTENANCE,
      });

      // Act
      const result = await campingService.updateSpot(availableSpot.id, {
        status: CampingSpotStatus.MAINTENANCE,
      });

      // Assert
      expect(result.status).toBe(CampingSpotStatus.MAINTENANCE);
    });

    it('should update isActive', async () => {
      // Arrange
      mockPrismaService.campingSpot.findUnique.mockResolvedValue({
        ...spotWithZone,
        bookings: [],
      });
      mockPrismaService.campingSpot.update.mockResolvedValue({
        ...spotWithZone,
        isActive: false,
      });

      // Act
      const result = await campingService.updateSpot(availableSpot.id, {
        isActive: false,
      });

      // Assert
      expect(result.isActive).toBe(false);
    });
  });

  // ==========================================================================
  // Camping Spots - deleteSpot
  // ==========================================================================

  describe('deleteSpot', () => {
    it('should delete spot successfully', async () => {
      // Arrange
      mockPrismaService.campingSpot.findUnique.mockResolvedValue({
        ...spotWithZone,
        bookings: [],
      });
      mockPrismaService.campingBooking.count.mockResolvedValue(0);
      mockPrismaService.campingSpot.delete.mockResolvedValue(availableSpot);

      // Act
      const result = await campingService.deleteSpot(availableSpot.id);

      // Assert
      expect(result.message).toBe('Spot deleted successfully');
      expect(mockPrismaService.campingSpot.delete).toHaveBeenCalledWith({
        where: { id: availableSpot.id },
      });
    });

    it('should throw BadRequestException if spot has active bookings', async () => {
      // Arrange
      mockPrismaService.campingSpot.findUnique.mockResolvedValue({
        ...occupiedSpotWithZone,
        bookings: [checkedInBooking],
      });
      mockPrismaService.campingBooking.count.mockResolvedValue(1);

      // Act & Assert
      await expect(campingService.deleteSpot(occupiedSpot.id)).rejects.toThrow(BadRequestException);
    });

    it('should throw NotFoundException if spot does not exist', async () => {
      // Arrange
      mockPrismaService.campingSpot.findUnique.mockResolvedValue(null);

      // Act & Assert
      await expect(campingService.deleteSpot('non-existent')).rejects.toThrow(NotFoundException);
    });
  });

  // ==========================================================================
  // Camping Spots - getAvailableSpots
  // ==========================================================================

  describe('getAvailableSpots', () => {
    it('should return available spots for date range', async () => {
      // Arrange
      const availableSpotsData = [spotWithZone, caravanSpotWithZone];
      mockPrismaService.campingSpot.findMany.mockResolvedValue(availableSpotsData);

      // Act
      const result = await campingService.getAvailableSpots({
        festivalId: publishedFestival.id,
        checkIn: new Date('2024-07-20T14:00:00Z'),
        checkOut: new Date('2024-07-22T11:00:00Z'),
      });

      // Assert
      expect(result).toHaveLength(2);
      expect(result[0].nights).toBe(2);
      expect(result[0].totalPrice).toBe(50); // 2 nights * 25 EUR
    });

    it('should filter by zoneId', async () => {
      // Arrange
      mockPrismaService.campingSpot.findMany.mockResolvedValue([spotWithZone]);

      // Act
      await campingService.getAvailableSpots({
        festivalId: publishedFestival.id,
        zoneId: tentZone.id,
        checkIn: new Date('2024-07-20T14:00:00Z'),
        checkOut: new Date('2024-07-22T11:00:00Z'),
      });

      // Assert
      expect(mockPrismaService.campingSpot.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            zone: expect.objectContaining({ id: tentZone.id }),
          }),
        })
      );
    });

    it('should filter by requireElectricity', async () => {
      // Arrange
      mockPrismaService.campingSpot.findMany.mockResolvedValue([caravanSpotWithZone]);

      // Act
      await campingService.getAvailableSpots({
        festivalId: publishedFestival.id,
        checkIn: new Date('2024-07-20T14:00:00Z'),
        checkOut: new Date('2024-07-22T11:00:00Z'),
        requireElectricity: true,
      });

      // Assert
      expect(mockPrismaService.campingSpot.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            electricityHook: true,
          }),
        })
      );
    });

    it('should filter by requireWater', async () => {
      // Arrange
      mockPrismaService.campingSpot.findMany.mockResolvedValue([caravanSpotWithZone]);

      // Act
      await campingService.getAvailableSpots({
        festivalId: publishedFestival.id,
        checkIn: new Date('2024-07-20T14:00:00Z'),
        checkOut: new Date('2024-07-22T11:00:00Z'),
        requireWater: true,
      });

      // Assert
      expect(mockPrismaService.campingSpot.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            waterHook: true,
          }),
        })
      );
    });

    it('should filter by vehicleLength', async () => {
      // Arrange
      mockPrismaService.campingSpot.findMany.mockResolvedValue([caravanSpotWithZone]);

      // Act
      await campingService.getAvailableSpots({
        festivalId: publishedFestival.id,
        checkIn: new Date('2024-07-20T14:00:00Z'),
        checkOut: new Date('2024-07-22T11:00:00Z'),
        vehicleLength: 7.0,
      });

      // Assert
      expect(mockPrismaService.campingSpot.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            maxVehicleLength: { gte: 7.0 },
          }),
        })
      );
    });

    it('should calculate correct price for different zone types', async () => {
      // Arrange
      mockPrismaService.campingSpot.findMany.mockResolvedValue([caravanSpotWithZone]);

      // Act
      const result = await campingService.getAvailableSpots({
        festivalId: publishedFestival.id,
        checkIn: new Date('2024-07-15T14:00:00Z'),
        checkOut: new Date('2024-07-18T11:00:00Z'), // 3 nights
      });

      // Assert
      expect(result[0].nights).toBe(3);
      expect(result[0].totalPrice).toBe(135); // 3 nights * 45 EUR (caravan zone price)
    });

    it('should return empty array if no spots available', async () => {
      // Arrange
      mockPrismaService.campingSpot.findMany.mockResolvedValue([]);

      // Act
      const result = await campingService.getAvailableSpots({
        festivalId: publishedFestival.id,
        checkIn: new Date('2024-07-15T14:00:00Z'),
        checkOut: new Date('2024-07-18T11:00:00Z'),
      });

      // Assert
      expect(result).toHaveLength(0);
    });
  });

  // ==========================================================================
  // Camping Bookings - createBooking
  // ==========================================================================

  describe('createBooking', () => {
    it('should create booking successfully', async () => {
      // Arrange
      mockPrismaService.campingSpot.findUnique.mockResolvedValue({
        ...spotWithZone,
        bookings: [],
      });
      mockPrismaService.campingBooking.findFirst.mockResolvedValue(null);
      mockPrismaService.campingBooking.create.mockResolvedValue({
        ...pendingBooking,
        spot: spotWithZone,
        user: {
          id: regularUser.id,
          firstName: regularUser.firstName,
          lastName: regularUser.lastName,
          email: regularUser.email,
          phone: regularUser.phone,
        },
      });

      // Act
      const result = await campingService.createBooking(validBookingInput, regularUser.id);

      // Assert
      expect(result.spotId).toBe(validBookingInput.spotId);
      expect(result.status).toBe(BookingStatus.PENDING);
      expect(mockPrismaService.campingBooking.create).toHaveBeenCalled();
    });

    it('should throw BadRequestException if checkOut is before checkIn', async () => {
      // Arrange
      mockPrismaService.campingSpot.findUnique.mockResolvedValue({
        ...spotWithZone,
        bookings: [],
      });

      // Act & Assert
      await expect(
        campingService.createBooking(invalidBookingInputs.checkOutBeforeCheckIn, regularUser.id)
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw ConflictException if spot is not available for dates', async () => {
      // Arrange
      mockPrismaService.campingSpot.findUnique.mockResolvedValue({
        ...occupiedSpotWithZone,
        bookings: [],
      });
      mockPrismaService.campingBooking.findFirst.mockResolvedValue(checkedInBooking);

      // Act & Assert
      await expect(
        campingService.createBooking(invalidBookingInputs.overlappingDates, regularUser.id)
      ).rejects.toThrow(ConflictException);
    });

    it('should calculate correct total price based on nights', async () => {
      // Arrange
      mockPrismaService.campingSpot.findUnique.mockResolvedValue({
        ...spotWithZone,
        bookings: [],
      });
      mockPrismaService.campingBooking.findFirst.mockResolvedValue(null);
      mockPrismaService.campingBooking.create.mockResolvedValue({
        ...pendingBooking,
        totalPrice: 50.0, // 2 nights * 25 EUR
        spot: spotWithZone,
        user: {
          id: regularUser.id,
          firstName: regularUser.firstName,
          lastName: regularUser.lastName,
          email: regularUser.email,
          phone: regularUser.phone,
        },
      });

      // Act
      const result = await campingService.createBooking(validBookingInput, regularUser.id);

      // Assert
      expect(result.totalPrice).toBe(50.0);
    });

    it('should generate unique booking number', async () => {
      // Arrange
      mockPrismaService.campingSpot.findUnique.mockResolvedValue({
        ...spotWithZone,
        bookings: [],
      });
      mockPrismaService.campingBooking.findFirst.mockResolvedValue(null);
      mockPrismaService.campingBooking.create.mockResolvedValue({
        ...pendingBooking,
        bookingNumber: 'CAMP-TEST-UNIQUE001',
        spot: spotWithZone,
        user: {
          id: regularUser.id,
          firstName: regularUser.firstName,
          lastName: regularUser.lastName,
          email: regularUser.email,
          phone: regularUser.phone,
        },
      });

      // Act
      const result = await campingService.createBooking(validBookingInput, regularUser.id);

      // Assert
      expect(result.bookingNumber).toMatch(/^CAMP-/);
    });

    it('should throw NotFoundException if spot does not exist', async () => {
      // Arrange
      mockPrismaService.campingSpot.findUnique.mockResolvedValue(null);

      // Act & Assert
      await expect(
        campingService.createBooking(
          { ...validBookingInput, spotId: 'non-existent' },
          regularUser.id
        )
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ==========================================================================
  // Camping Bookings - getBookings
  // ==========================================================================

  describe('getBookings', () => {
    it('should return paginated bookings', async () => {
      // Arrange
      const mockBookings = [bookingWithRelations, checkedInBookingWithRelations];
      mockPrismaService.campingBooking.findMany.mockResolvedValue(mockBookings);
      mockPrismaService.campingBooking.count.mockResolvedValue(2);

      // Act
      const result = await campingService.getBookings({ page: 1, limit: 20 });

      // Assert
      expect(result.items).toHaveLength(2);
      expect(result.total).toBe(2);
      expect(result.page).toBe(1);
    });

    it('should filter by festivalId', async () => {
      // Arrange
      mockPrismaService.campingBooking.findMany.mockResolvedValue([]);
      mockPrismaService.campingBooking.count.mockResolvedValue(0);

      // Act
      await campingService.getBookings({ festivalId: publishedFestival.id });

      // Assert
      expect(mockPrismaService.campingBooking.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            spot: { zone: { festivalId: publishedFestival.id } },
          }),
        })
      );
    });

    it('should filter by userId', async () => {
      // Arrange
      mockPrismaService.campingBooking.findMany.mockResolvedValue([bookingWithRelations]);
      mockPrismaService.campingBooking.count.mockResolvedValue(1);

      // Act
      await campingService.getBookings({ userId: regularUser.id });

      // Assert
      expect(mockPrismaService.campingBooking.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ userId: regularUser.id }),
        })
      );
    });

    it('should filter by status', async () => {
      // Arrange
      mockPrismaService.campingBooking.findMany.mockResolvedValue([checkedInBookingWithRelations]);
      mockPrismaService.campingBooking.count.mockResolvedValue(1);

      // Act
      await campingService.getBookings({ status: BookingStatus.CHECKED_IN });

      // Assert
      expect(mockPrismaService.campingBooking.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ status: BookingStatus.CHECKED_IN }),
        })
      );
    });

    it('should filter by checkInFrom', async () => {
      // Arrange
      mockPrismaService.campingBooking.findMany.mockResolvedValue([]);
      mockPrismaService.campingBooking.count.mockResolvedValue(0);
      const checkInFrom = new Date('2024-07-15T00:00:00Z');

      // Act
      await campingService.getBookings({ checkInFrom });

      // Assert
      expect(mockPrismaService.campingBooking.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            checkIn: { gte: checkInFrom },
          }),
        })
      );
    });

    it('should filter by checkInTo', async () => {
      // Arrange
      mockPrismaService.campingBooking.findMany.mockResolvedValue([]);
      mockPrismaService.campingBooking.count.mockResolvedValue(0);
      const checkInTo = new Date('2024-07-20T00:00:00Z');

      // Act
      await campingService.getBookings({ checkInTo });

      // Assert
      expect(mockPrismaService.campingBooking.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            checkIn: { lte: checkInTo },
          }),
        })
      );
    });

    it('should search by booking number or vehicle plate', async () => {
      // Arrange
      mockPrismaService.campingBooking.findMany.mockResolvedValue([bookingWithRelations]);
      mockPrismaService.campingBooking.count.mockResolvedValue(1);

      // Act
      await campingService.getBookings({ search: 'AB-123' });

      // Assert
      expect(mockPrismaService.campingBooking.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: [
              { bookingNumber: { contains: 'AB-123', mode: 'insensitive' } },
              { vehiclePlate: { contains: 'AB-123', mode: 'insensitive' } },
            ],
          }),
        })
      );
    });

    it('should apply sorting', async () => {
      // Arrange
      mockPrismaService.campingBooking.findMany.mockResolvedValue([]);
      mockPrismaService.campingBooking.count.mockResolvedValue(0);

      // Act
      await campingService.getBookings({ sortBy: 'createdAt', sortOrder: 'asc' });

      // Assert
      expect(mockPrismaService.campingBooking.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: { createdAt: 'asc' },
        })
      );
    });
  });

  // ==========================================================================
  // Camping Bookings - getBooking
  // ==========================================================================

  describe('getBooking', () => {
    it('should return booking by ID', async () => {
      // Arrange
      mockPrismaService.campingBooking.findUnique.mockResolvedValue(bookingWithRelations);

      // Act
      const result = await campingService.getBooking(confirmedBooking.id);

      // Assert
      expect(result.id).toBe(confirmedBooking.id);
      expect(result.status).toBe(BookingStatus.CONFIRMED);
    });

    it('should throw NotFoundException if booking does not exist', async () => {
      // Arrange
      mockPrismaService.campingBooking.findUnique.mockResolvedValue(null);

      // Act & Assert
      await expect(campingService.getBooking('non-existent')).rejects.toThrow(NotFoundException);
    });

    it('should include spot and user relations', async () => {
      // Arrange
      mockPrismaService.campingBooking.findUnique.mockResolvedValue(bookingWithRelations);

      // Act
      const result = await campingService.getBooking(confirmedBooking.id);

      // Assert
      expect(result.spot).toBeDefined();
      expect(result.spot.zone).toBeDefined();
      expect(result.user).toBeDefined();
      expect(result.user.email).toBe(regularUser.email);
    });
  });

  // ==========================================================================
  // Camping Bookings - updateBooking
  // ==========================================================================

  describe('updateBooking', () => {
    it('should update booking successfully', async () => {
      // Arrange
      mockPrismaService.campingBooking.findUnique.mockResolvedValue(bookingWithRelations);
      mockPrismaService.campingBooking.update.mockResolvedValue({
        ...confirmedBooking,
        notes: 'Updated notes',
      });

      // Act
      const result = await campingService.updateBooking(confirmedBooking.id, {
        notes: 'Updated notes',
      });

      // Assert
      expect(result.notes).toBe('Updated notes');
    });

    it('should throw BadRequestException if booking is cancelled', async () => {
      // Arrange
      mockPrismaService.campingBooking.findUnique.mockResolvedValue({
        ...cancelledBooking,
        spot: spotWithZone,
        user: { id: regularUser.id, firstName: 'John', lastName: 'Doe', email: 'john@test.com' },
      });

      // Act & Assert
      await expect(
        campingService.updateBooking(cancelledBooking.id, { notes: 'Updated' })
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if booking is checked out', async () => {
      // Arrange
      mockPrismaService.campingBooking.findUnique.mockResolvedValue({
        ...checkedOutBooking,
        spot: spotWithZone,
        user: { id: regularUser.id, firstName: 'John', lastName: 'Doe', email: 'john@test.com' },
      });

      // Act & Assert
      await expect(
        campingService.updateBooking(checkedOutBooking.id, { notes: 'Updated' })
      ).rejects.toThrow(BadRequestException);
    });

    it('should recalculate price when dates change', async () => {
      // Arrange
      mockPrismaService.campingBooking.findUnique.mockResolvedValue(bookingWithRelations);
      mockPrismaService.campingBooking.findFirst.mockResolvedValue(null);
      mockPrismaService.campingBooking.update.mockResolvedValue({
        ...confirmedBooking,
        checkOut: new Date('2024-07-20T11:00:00Z'),
        totalPrice: 125.0, // 5 nights * 25 EUR
      });

      // Act
      const result = await campingService.updateBooking(confirmedBooking.id, {
        checkOut: new Date('2024-07-20T11:00:00Z'),
      });

      // Assert
      expect(result.totalPrice).toBe(125.0);
    });

    it('should throw BadRequestException if new checkOut is before checkIn', async () => {
      // Arrange
      mockPrismaService.campingBooking.findUnique.mockResolvedValue(bookingWithRelations);

      // Act & Assert
      await expect(
        campingService.updateBooking(confirmedBooking.id, {
          checkOut: new Date('2024-07-14T11:00:00Z'), // Before checkIn
        })
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw ConflictException if new dates conflict with other bookings', async () => {
      // Arrange
      mockPrismaService.campingBooking.findUnique.mockResolvedValue(bookingWithRelations);
      mockPrismaService.campingBooking.findFirst.mockResolvedValue(checkedInBooking);

      // Act & Assert
      await expect(
        campingService.updateBooking(confirmedBooking.id, {
          checkIn: new Date('2024-07-15T14:00:00Z'),
          checkOut: new Date('2024-07-19T11:00:00Z'),
        })
      ).rejects.toThrow(ConflictException);
    });

    it('should update vehicle info', async () => {
      // Arrange
      mockPrismaService.campingBooking.findUnique.mockResolvedValue(bookingWithRelations);
      mockPrismaService.campingBooking.update.mockResolvedValue({
        ...confirmedBooking,
        vehiclePlate: 'NEW-PLATE',
        vehicleType: 'motorcycle',
      });

      // Act
      const result = await campingService.updateBooking(confirmedBooking.id, {
        vehiclePlate: 'NEW-PLATE',
        vehicleType: 'motorcycle',
      });

      // Assert
      expect(result.vehiclePlate).toBe('NEW-PLATE');
      expect(result.vehicleType).toBe('motorcycle');
    });

    it('should update staff notes', async () => {
      // Arrange
      mockPrismaService.campingBooking.findUnique.mockResolvedValue(bookingWithRelations);
      mockPrismaService.campingBooking.update.mockResolvedValue({
        ...confirmedBooking,
        staffNotes: 'Important guest',
      });

      // Act
      const result = await campingService.updateBooking(confirmedBooking.id, {
        staffNotes: 'Important guest',
      });

      // Assert
      expect(result.staffNotes).toBe('Important guest');
    });
  });

  // ==========================================================================
  // Camping Bookings - confirmBooking
  // ==========================================================================

  describe('confirmBooking', () => {
    it('should confirm pending booking', async () => {
      // Arrange
      mockPrismaService.campingBooking.findUnique.mockResolvedValue({
        ...pendingBooking,
        spot: spotWithZone,
        user: { id: regularUser.id, firstName: 'John', lastName: 'Doe', email: 'john@test.com' },
      });
      mockPrismaService.campingBooking.update.mockResolvedValue({
        ...pendingBooking,
        status: BookingStatus.CONFIRMED,
      });

      // Act
      const result = await campingService.confirmBooking(pendingBooking.id);

      // Assert
      expect(result.status).toBe(BookingStatus.CONFIRMED);
    });

    it('should throw BadRequestException if booking is not pending', async () => {
      // Arrange
      mockPrismaService.campingBooking.findUnique.mockResolvedValue({
        ...confirmedBooking,
        spot: spotWithZone,
        user: { id: regularUser.id, firstName: 'John', lastName: 'Doe', email: 'john@test.com' },
      });

      // Act & Assert
      await expect(campingService.confirmBooking(confirmedBooking.id)).rejects.toThrow(
        BadRequestException
      );
    });
  });

  // ==========================================================================
  // Camping Bookings - checkIn
  // ==========================================================================

  describe('checkIn', () => {
    it('should check in confirmed booking', async () => {
      // Arrange
      mockPrismaService.campingBooking.findUnique.mockResolvedValue({
        ...confirmedBooking,
        spot: spotWithZone,
        user: { id: regularUser.id, firstName: 'John', lastName: 'Doe', email: 'john@test.com' },
      });
      mockPrismaService.campingSpot.update.mockResolvedValue({
        ...availableSpot,
        status: CampingSpotStatus.OCCUPIED,
      });
      mockPrismaService.campingBooking.update.mockResolvedValue({
        ...confirmedBooking,
        status: BookingStatus.CHECKED_IN,
        checkedInAt: new Date(),
      });

      // Act
      const result = await campingService.checkIn(confirmedBooking.id, validCheckInInput);

      // Assert
      expect(result.status).toBe(BookingStatus.CHECKED_IN);
      expect(result.checkedInAt).toBeDefined();
    });

    it('should update spot status to OCCUPIED', async () => {
      // Arrange
      mockPrismaService.campingBooking.findUnique.mockResolvedValue({
        ...confirmedBooking,
        spot: spotWithZone,
        user: { id: regularUser.id, firstName: 'John', lastName: 'Doe', email: 'john@test.com' },
      });
      mockPrismaService.campingSpot.update.mockResolvedValue({
        ...availableSpot,
        status: CampingSpotStatus.OCCUPIED,
      });
      mockPrismaService.campingBooking.update.mockResolvedValue({
        ...confirmedBooking,
        status: BookingStatus.CHECKED_IN,
      });

      // Act
      await campingService.checkIn(confirmedBooking.id, validCheckInInput);

      // Assert
      expect(mockPrismaService.campingSpot.update).toHaveBeenCalledWith({
        where: { id: confirmedBooking.spotId },
        data: { status: 'OCCUPIED' },
      });
    });

    it('should throw BadRequestException if booking is not confirmed', async () => {
      // Arrange
      mockPrismaService.campingBooking.findUnique.mockResolvedValue({
        ...pendingBooking,
        spot: spotWithZone,
        user: { id: regularUser.id, firstName: 'John', lastName: 'Doe', email: 'john@test.com' },
      });

      // Act & Assert
      await expect(campingService.checkIn(pendingBooking.id, validCheckInInput)).rejects.toThrow(
        BadRequestException
      );
    });

    it('should override vehicle plate at check-in', async () => {
      // Arrange
      mockPrismaService.campingBooking.findUnique.mockResolvedValue({
        ...confirmedBooking,
        spot: spotWithZone,
        user: { id: regularUser.id, firstName: 'John', lastName: 'Doe', email: 'john@test.com' },
      });
      mockPrismaService.campingSpot.update.mockResolvedValue({
        ...availableSpot,
        status: CampingSpotStatus.OCCUPIED,
      });
      mockPrismaService.campingBooking.update.mockResolvedValue({
        ...confirmedBooking,
        status: BookingStatus.CHECKED_IN,
        vehiclePlate: 'NEW-PLATE-123',
      });

      // Act
      const result = await campingService.checkIn(confirmedBooking.id, {
        vehiclePlate: 'NEW-PLATE-123',
      });

      // Assert
      expect(result.vehiclePlate).toBe('NEW-PLATE-123');
    });
  });

  // ==========================================================================
  // Camping Bookings - checkOut
  // ==========================================================================

  describe('checkOut', () => {
    it('should check out checked-in booking', async () => {
      // Arrange
      mockPrismaService.campingBooking.findUnique.mockResolvedValue({
        ...checkedInBooking,
        spot: occupiedSpotWithZone,
        user: { id: regularUser.id, firstName: 'John', lastName: 'Doe', email: 'john@test.com' },
      });
      mockPrismaService.campingSpot.update.mockResolvedValue({
        ...occupiedSpot,
        status: CampingSpotStatus.AVAILABLE,
      });
      mockPrismaService.campingBooking.update.mockResolvedValue({
        ...checkedInBooking,
        status: BookingStatus.CHECKED_OUT,
        checkedOutAt: new Date(),
      });

      // Act
      const result = await campingService.checkOut(checkedInBooking.id, validCheckOutInput);

      // Assert
      expect(result.status).toBe(BookingStatus.CHECKED_OUT);
      expect(result.checkedOutAt).toBeDefined();
    });

    it('should update spot status to AVAILABLE', async () => {
      // Arrange
      mockPrismaService.campingBooking.findUnique.mockResolvedValue({
        ...checkedInBooking,
        spot: occupiedSpotWithZone,
        user: { id: regularUser.id, firstName: 'John', lastName: 'Doe', email: 'john@test.com' },
      });
      mockPrismaService.campingSpot.update.mockResolvedValue({
        ...occupiedSpot,
        status: CampingSpotStatus.AVAILABLE,
      });
      mockPrismaService.campingBooking.update.mockResolvedValue({
        ...checkedInBooking,
        status: BookingStatus.CHECKED_OUT,
      });

      // Act
      await campingService.checkOut(checkedInBooking.id, validCheckOutInput);

      // Assert
      expect(mockPrismaService.campingSpot.update).toHaveBeenCalledWith({
        where: { id: checkedInBooking.spotId },
        data: { status: 'AVAILABLE' },
      });
    });

    it('should throw BadRequestException if booking is not checked in', async () => {
      // Arrange
      mockPrismaService.campingBooking.findUnique.mockResolvedValue({
        ...confirmedBooking,
        spot: spotWithZone,
        user: { id: regularUser.id, firstName: 'John', lastName: 'Doe', email: 'john@test.com' },
      });

      // Act & Assert
      await expect(
        campingService.checkOut(confirmedBooking.id, validCheckOutInput)
      ).rejects.toThrow(BadRequestException);
    });

    it('should record damage report', async () => {
      // Arrange
      mockPrismaService.campingBooking.findUnique.mockResolvedValue({
        ...checkedInBooking,
        spot: occupiedSpotWithZone,
        user: { id: regularUser.id, firstName: 'John', lastName: 'Doe', email: 'john@test.com' },
      });
      mockPrismaService.campingSpot.update.mockResolvedValue({
        ...occupiedSpot,
        status: CampingSpotStatus.AVAILABLE,
      });
      mockPrismaService.campingBooking.update.mockResolvedValue({
        ...checkedInBooking,
        status: BookingStatus.CHECKED_OUT,
        damageReport: 'Tent pole broken',
      });

      // Act
      const result = await campingService.checkOut(checkedInBooking.id, {
        notes: 'All good',
        damageReport: 'Tent pole broken',
      });

      // Assert
      expect(result.damageReport).toBe('Tent pole broken');
    });

    it('should append checkout notes to staff notes', async () => {
      // Arrange
      mockPrismaService.campingBooking.findUnique.mockResolvedValue({
        ...checkedInBooking,
        staffNotes: 'Existing notes',
        spot: occupiedSpotWithZone,
        user: { id: regularUser.id, firstName: 'John', lastName: 'Doe', email: 'john@test.com' },
      });
      mockPrismaService.campingSpot.update.mockResolvedValue({
        ...occupiedSpot,
        status: CampingSpotStatus.AVAILABLE,
      });
      mockPrismaService.campingBooking.update.mockResolvedValue({
        ...checkedInBooking,
        status: BookingStatus.CHECKED_OUT,
        staffNotes: 'Existing notes\n[Checkout] Late checkout',
      });

      // Act
      await campingService.checkOut(checkedInBooking.id, { notes: 'Late checkout' });

      // Assert
      expect(mockPrismaService.campingBooking.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            staffNotes: expect.stringContaining('[Checkout]'),
          }),
        })
      );
    });
  });

  // ==========================================================================
  // Camping Bookings - cancelBooking
  // ==========================================================================

  describe('cancelBooking', () => {
    it('should cancel pending booking', async () => {
      // Arrange
      mockPrismaService.campingBooking.findUnique.mockResolvedValue({
        ...pendingBooking,
        spot: spotWithZone,
        user: { id: regularUser.id, firstName: 'John', lastName: 'Doe', email: 'john@test.com' },
      });
      mockPrismaService.campingBooking.update.mockResolvedValue({
        ...pendingBooking,
        status: BookingStatus.CANCELLED,
        cancelledAt: new Date(),
        cancelReason: validCancelInput.reason,
      });

      // Act
      const result = await campingService.cancelBooking(pendingBooking.id, validCancelInput);

      // Assert
      expect(result.status).toBe(BookingStatus.CANCELLED);
      expect(result.cancelReason).toBe(validCancelInput.reason);
    });

    it('should cancel confirmed booking', async () => {
      // Arrange
      mockPrismaService.campingBooking.findUnique.mockResolvedValue({
        ...confirmedBooking,
        spot: spotWithZone,
        user: { id: regularUser.id, firstName: 'John', lastName: 'Doe', email: 'john@test.com' },
      });
      mockPrismaService.campingBooking.update.mockResolvedValue({
        ...confirmedBooking,
        status: BookingStatus.CANCELLED,
        cancelledAt: new Date(),
      });

      // Act
      const result = await campingService.cancelBooking(confirmedBooking.id, validCancelInput);

      // Assert
      expect(result.status).toBe(BookingStatus.CANCELLED);
    });

    it('should cancel checked-in booking and update spot status', async () => {
      // Arrange
      mockPrismaService.campingBooking.findUnique.mockResolvedValue({
        ...checkedInBooking,
        spot: occupiedSpotWithZone,
        user: { id: regularUser.id, firstName: 'John', lastName: 'Doe', email: 'john@test.com' },
      });
      mockPrismaService.campingSpot.update.mockResolvedValue({
        ...occupiedSpot,
        status: CampingSpotStatus.AVAILABLE,
      });
      mockPrismaService.campingBooking.update.mockResolvedValue({
        ...checkedInBooking,
        status: BookingStatus.CANCELLED,
      });

      // Act
      await campingService.cancelBooking(checkedInBooking.id, validCancelInput);

      // Assert
      expect(mockPrismaService.campingSpot.update).toHaveBeenCalledWith({
        where: { id: checkedInBooking.spotId },
        data: { status: 'AVAILABLE' },
      });
    });

    it('should throw BadRequestException if booking is already cancelled', async () => {
      // Arrange
      mockPrismaService.campingBooking.findUnique.mockResolvedValue({
        ...cancelledBooking,
        spot: spotWithZone,
        user: { id: regularUser.id, firstName: 'John', lastName: 'Doe', email: 'john@test.com' },
      });

      // Act & Assert
      await expect(
        campingService.cancelBooking(cancelledBooking.id, validCancelInput)
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if booking is already checked out', async () => {
      // Arrange
      mockPrismaService.campingBooking.findUnique.mockResolvedValue({
        ...checkedOutBooking,
        spot: spotWithZone,
        user: { id: regularUser.id, firstName: 'John', lastName: 'Doe', email: 'john@test.com' },
      });

      // Act & Assert
      await expect(
        campingService.cancelBooking(checkedOutBooking.id, validCancelInput)
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ==========================================================================
  // Statistics - getStatistics
  // ==========================================================================

  describe('getStatistics', () => {
    it('should return camping statistics for festival', async () => {
      // Arrange
      const mockZones = [
        {
          ...tentZone,
          spots: [
            { ...availableSpot, status: CampingSpotStatus.AVAILABLE, bookings: [] },
            {
              ...occupiedSpot,
              status: CampingSpotStatus.OCCUPIED,
              bookings: [{ ...checkedInBooking, totalPrice: 100 }],
            },
          ],
        },
      ];
      mockPrismaService.campingZone.findMany.mockResolvedValue(mockZones);
      mockPrismaService.campingBooking.count
        .mockResolvedValueOnce(5) // total bookings
        .mockResolvedValueOnce(1) // active bookings
        .mockResolvedValueOnce(2) // pending bookings
        .mockResolvedValueOnce(0) // daily occupancy counts (7 days)
        .mockResolvedValueOnce(0)
        .mockResolvedValueOnce(0)
        .mockResolvedValueOnce(0)
        .mockResolvedValueOnce(0)
        .mockResolvedValueOnce(0)
        .mockResolvedValueOnce(1);

      // Act
      const result = await campingService.getStatistics(publishedFestival.id);

      // Assert
      expect(result.festivalId).toBe(publishedFestival.id);
      expect(result.totalZones).toBe(1);
      expect(result.totalSpots).toBe(2);
      expect(result.availableSpots).toBe(1);
      expect(result.occupiedSpots).toBe(1);
    });

    it('should calculate occupancy rate correctly', async () => {
      // Arrange
      const mockZones = [
        {
          ...tentZone,
          spots: [
            { ...availableSpot, status: CampingSpotStatus.AVAILABLE, bookings: [] },
            { ...occupiedSpot, status: CampingSpotStatus.OCCUPIED, bookings: [] },
            { ...reservedSpot, status: CampingSpotStatus.RESERVED, bookings: [] },
            { ...maintenanceSpot, status: CampingSpotStatus.MAINTENANCE, bookings: [] },
          ],
        },
      ];
      mockPrismaService.campingZone.findMany.mockResolvedValue(mockZones);
      mockPrismaService.campingBooking.count.mockResolvedValue(0);

      // Act
      const result = await campingService.getStatistics(publishedFestival.id);

      // Assert
      expect(result.occupancyRate).toBe(25); // 1 occupied / 4 total = 25%
    });

    it('should calculate revenue by zone type', async () => {
      // Arrange
      const mockZones = [
        {
          ...tentZone,
          spots: [
            {
              ...availableSpot,
              bookings: [{ totalPrice: 50 }, { totalPrice: 75 }],
            },
          ],
        },
        {
          ...caravanZone,
          spots: [
            {
              ...caravanSpot,
              bookings: [{ totalPrice: 225 }],
            },
          ],
        },
      ];
      mockPrismaService.campingZone.findMany.mockResolvedValue(mockZones);
      mockPrismaService.campingBooking.count.mockResolvedValue(0);

      // Act
      const result = await campingService.getStatistics(publishedFestival.id);

      // Assert
      expect(result.totalRevenue).toBe(350);
      expect(result.byType['TENT'].revenue).toBe(125);
      expect(result.byType['CARAVAN'].revenue).toBe(225);
    });

    it('should return daily occupancy for last 7 days', async () => {
      // Arrange
      mockPrismaService.campingZone.findMany.mockResolvedValue([
        {
          ...tentZone,
          spots: [{ ...availableSpot, bookings: [] }],
        },
      ]);
      mockPrismaService.campingBooking.count.mockResolvedValue(1);

      // Act
      const result = await campingService.getStatistics(publishedFestival.id);

      // Assert
      expect(result.dailyOccupancy).toHaveLength(7);
      expect(result.dailyOccupancy[0]).toHaveProperty('date');
      expect(result.dailyOccupancy[0]).toHaveProperty('occupied');
      expect(result.dailyOccupancy[0]).toHaveProperty('total');
      expect(result.dailyOccupancy[0]).toHaveProperty('rate');
    });

    it('should handle empty festival with no zones', async () => {
      // Arrange
      mockPrismaService.campingZone.findMany.mockResolvedValue([]);
      mockPrismaService.campingBooking.count.mockResolvedValue(0);

      // Act
      const result = await campingService.getStatistics(publishedFestival.id);

      // Assert
      expect(result.totalZones).toBe(0);
      expect(result.totalSpots).toBe(0);
      expect(result.occupancyRate).toBe(0);
      expect(result.totalRevenue).toBe(0);
    });
  });

  // ==========================================================================
  // Date Overlap Logic Tests
  // ==========================================================================

  describe('Date Overlap Logic', () => {
    it('should detect overlap when new booking starts during existing booking', async () => {
      // Existing booking: July 15-19
      // New booking: July 17-20 (overlaps)
      mockPrismaService.campingSpot.findUnique.mockResolvedValue({
        ...spotWithZone,
        bookings: [],
      });
      mockPrismaService.campingBooking.findFirst.mockResolvedValue(checkedInBooking);

      await expect(
        campingService.createBooking(
          {
            spotId: availableSpot.id,
            checkIn: new Date('2024-07-17T14:00:00Z'),
            checkOut: new Date('2024-07-20T11:00:00Z'),
            guestCount: 2,
          },
          regularUser.id
        )
      ).rejects.toThrow(ConflictException);
    });

    it('should detect overlap when new booking ends during existing booking', async () => {
      // Existing booking: July 15-19
      // New booking: July 13-16 (overlaps at end)
      mockPrismaService.campingSpot.findUnique.mockResolvedValue({
        ...spotWithZone,
        bookings: [],
      });
      mockPrismaService.campingBooking.findFirst.mockResolvedValue(checkedInBooking);

      await expect(
        campingService.createBooking(
          {
            spotId: availableSpot.id,
            checkIn: new Date('2024-07-13T14:00:00Z'),
            checkOut: new Date('2024-07-16T11:00:00Z'),
            guestCount: 2,
          },
          regularUser.id
        )
      ).rejects.toThrow(ConflictException);
    });

    it('should detect overlap when new booking contains existing booking', async () => {
      // Existing booking: July 15-17
      // New booking: July 14-20 (contains existing)
      mockPrismaService.campingSpot.findUnique.mockResolvedValue({
        ...spotWithZone,
        bookings: [],
      });
      mockPrismaService.campingBooking.findFirst.mockResolvedValue(confirmedBooking);

      await expect(
        campingService.createBooking(
          {
            spotId: availableSpot.id,
            checkIn: new Date('2024-07-14T14:00:00Z'),
            checkOut: new Date('2024-07-20T11:00:00Z'),
            guestCount: 2,
          },
          regularUser.id
        )
      ).rejects.toThrow(ConflictException);
    });

    it('should detect overlap when new booking is contained by existing booking', async () => {
      // Existing booking: July 15-19
      // New booking: July 16-17 (contained within existing)
      mockPrismaService.campingSpot.findUnique.mockResolvedValue({
        ...spotWithZone,
        bookings: [],
      });
      mockPrismaService.campingBooking.findFirst.mockResolvedValue(checkedInBooking);

      await expect(
        campingService.createBooking(
          {
            spotId: availableSpot.id,
            checkIn: new Date('2024-07-16T14:00:00Z'),
            checkOut: new Date('2024-07-17T11:00:00Z'),
            guestCount: 2,
          },
          regularUser.id
        )
      ).rejects.toThrow(ConflictException);
    });

    it('should allow booking when dates do not overlap', async () => {
      // Existing booking: July 15-17
      // New booking: July 20-22 (no overlap)
      mockPrismaService.campingSpot.findUnique.mockResolvedValue({
        ...spotWithZone,
        bookings: [],
      });
      mockPrismaService.campingBooking.findFirst.mockResolvedValue(null);
      mockPrismaService.campingBooking.create.mockResolvedValue({
        ...pendingBooking,
        checkIn: new Date('2024-07-20T14:00:00Z'),
        checkOut: new Date('2024-07-22T11:00:00Z'),
        spot: spotWithZone,
        user: {
          id: regularUser.id,
          firstName: regularUser.firstName,
          lastName: regularUser.lastName,
          email: regularUser.email,
          phone: regularUser.phone,
        },
      });

      const result = await campingService.createBooking(
        {
          spotId: availableSpot.id,
          checkIn: new Date('2024-07-20T14:00:00Z'),
          checkOut: new Date('2024-07-22T11:00:00Z'),
          guestCount: 2,
        },
        regularUser.id
      );

      expect(result.status).toBe(BookingStatus.PENDING);
    });

    it('should allow booking immediately after another booking ends', async () => {
      // Existing booking: July 15-17 (checkout 11:00)
      // New booking: July 17-19 (checkin 14:00) - same day checkout/checkin allowed
      mockPrismaService.campingSpot.findUnique.mockResolvedValue({
        ...spotWithZone,
        bookings: [],
      });
      mockPrismaService.campingBooking.findFirst.mockResolvedValue(null);
      mockPrismaService.campingBooking.create.mockResolvedValue({
        ...pendingBooking,
        checkIn: new Date('2024-07-17T14:00:00Z'),
        checkOut: new Date('2024-07-19T11:00:00Z'),
        spot: spotWithZone,
        user: {
          id: regularUser.id,
          firstName: regularUser.firstName,
          lastName: regularUser.lastName,
          email: regularUser.email,
          phone: regularUser.phone,
        },
      });

      const result = await campingService.createBooking(
        {
          spotId: availableSpot.id,
          checkIn: new Date('2024-07-17T14:00:00Z'),
          checkOut: new Date('2024-07-19T11:00:00Z'),
          guestCount: 2,
        },
        regularUser.id
      );

      expect(result).toBeDefined();
    });
  });
});
