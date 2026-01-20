/**
 * Camping Controller Unit Tests
 *
 * Comprehensive tests for camping API endpoints including:
 * - CampingSpotsController (CRUD for spots, availability)
 * - CampingBookingsController (CRUD for bookings, check-in/out, cancel)
 * - FestivalCampingController (festival-scoped operations)
 */

import { Test, TestingModule } from '@nestjs/testing';
import {
  CampingSpotsController,
  CampingBookingsController,
  FestivalCampingController,
} from './camping.controller';
import { CampingService } from './camping.service';
import { NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import {
  // Zone fixtures
  tentZone,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  caravanZone,
  // Spot fixtures
  availableSpot,
  occupiedSpot,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  caravanSpot,
  spotWithZone,
  occupiedSpotWithZone,
  caravanSpotWithZone,
  // Booking fixtures
  pendingBooking,
  confirmedBooking,
  checkedInBooking,
  checkedOutBooking,
  cancelledBooking,
  bookingWithRelations,
  checkedInBookingWithRelations,
  // Input fixtures
  validCreateSpotInput,
  validBulkCreateSpotsInput,
  validBookingInput,
  validCheckInInput,
  validCheckOutInput,
  validCancelInput,
  // Enums
  CampingSpotStatus,
  BookingStatus,
  // Users
  regularUser,
  staffUser,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  organizerUser,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  adminUser,
  publishedFestival,
} from '../../test/fixtures';

// ============================================================================
// Mock Setup
// ============================================================================

describe('CampingSpotsController', () => {
  let controller: CampingSpotsController;

  const mockCampingService = {
    createSpot: jest.fn(),
    bulkCreateSpots: jest.fn(),
    getSpots: jest.fn(),
    getAvailableSpots: jest.fn(),
    getSpot: jest.fn(),
    updateSpot: jest.fn(),
    deleteSpot: jest.fn(),
    createBooking: jest.fn(),
    getBookings: jest.fn(),
    getBooking: jest.fn(),
    updateBooking: jest.fn(),
    confirmBooking: jest.fn(),
    checkIn: jest.fn(),
    checkOut: jest.fn(),
    cancelBooking: jest.fn(),
    getStatistics: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [CampingSpotsController],
      providers: [{ provide: CampingService, useValue: mockCampingService }],
    }).compile();

    controller = module.get<CampingSpotsController>(CampingSpotsController);
  });

  // ==========================================================================
  // POST /api/camping/spots Tests
  // ==========================================================================

  describe('POST /api/camping/spots', () => {
    it('should create a spot successfully', async () => {
      // Arrange
      mockCampingService.createSpot.mockResolvedValue(spotWithZone);

      // Act
      const result = await controller.createSpot(validCreateSpotInput);

      // Assert
      expect(result).toEqual(spotWithZone);
      expect(mockCampingService.createSpot).toHaveBeenCalledWith(validCreateSpotInput);
    });

    it('should throw NotFoundException when zone does not exist', async () => {
      // Arrange
      mockCampingService.createSpot.mockRejectedValue(
        new NotFoundException('Camping zone with ID non-existent not found')
      );

      // Act & Assert
      await expect(
        controller.createSpot({ ...validCreateSpotInput, zoneId: 'non-existent' })
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ConflictException when spot number already exists in zone', async () => {
      // Arrange
      mockCampingService.createSpot.mockRejectedValue(
        new ConflictException('Spot number A1 already exists in this zone')
      );

      // Act & Assert
      await expect(
        controller.createSpot({ ...validCreateSpotInput, number: 'A1' })
      ).rejects.toThrow(ConflictException);
    });

    it('should create spot with all optional fields', async () => {
      // Arrange
      const fullSpotInput = {
        ...validCreateSpotInput,
        electricityHook: true,
        waterHook: true,
        maxVehicleLength: 8.5,
        latitude: 48.8566,
        longitude: 2.3522,
        notes: 'Premium spot with shade',
      };
      mockCampingService.createSpot.mockResolvedValue({
        ...caravanSpotWithZone,
        ...fullSpotInput,
      });

      // Act
      const result = await controller.createSpot(fullSpotInput);

      // Assert
      expect(mockCampingService.createSpot).toHaveBeenCalledWith(fullSpotInput);
      expect(result.electricityHook).toBe(true);
      expect(result.waterHook).toBe(true);
    });
  });

  // ==========================================================================
  // POST /api/camping/spots/bulk Tests
  // ==========================================================================

  describe('POST /api/camping/spots/bulk', () => {
    it('should bulk create spots successfully', async () => {
      // Arrange
      const bulkResult = { created: 10, requested: 10 };
      mockCampingService.bulkCreateSpots.mockResolvedValue(bulkResult);

      // Act
      const result = await controller.bulkCreateSpots(validBulkCreateSpotsInput);

      // Assert
      expect(result).toEqual(bulkResult);
      expect(mockCampingService.bulkCreateSpots).toHaveBeenCalledWith(validBulkCreateSpotsInput);
    });

    it('should throw NotFoundException when zone does not exist', async () => {
      // Arrange
      mockCampingService.bulkCreateSpots.mockRejectedValue(
        new NotFoundException('Camping zone with ID non-existent not found')
      );

      // Act & Assert
      await expect(
        controller.bulkCreateSpots({
          ...validBulkCreateSpotsInput,
          zoneId: 'non-existent',
        })
      ).rejects.toThrow(NotFoundException);
    });

    it('should handle partial success when some spots are duplicates', async () => {
      // Arrange
      const partialResult = { created: 7, requested: 10 };
      mockCampingService.bulkCreateSpots.mockResolvedValue(partialResult);

      // Act
      const result = await controller.bulkCreateSpots(validBulkCreateSpotsInput);

      // Assert
      expect(result.created).toBeLessThan(result.requested);
    });
  });

  // ==========================================================================
  // GET /api/camping/spots Tests
  // ==========================================================================

  describe('GET /api/camping/spots', () => {
    it('should return paginated spots', async () => {
      // Arrange
      const paginatedResult = {
        items: [spotWithZone, occupiedSpotWithZone],
        total: 2,
        page: 1,
        limit: 50,
        totalPages: 1,
      };
      mockCampingService.getSpots.mockResolvedValue(paginatedResult);

      // Act
      const result = await controller.getSpots({});

      // Assert
      expect(result).toEqual(paginatedResult);
      expect(mockCampingService.getSpots).toHaveBeenCalledWith({});
    });

    it('should filter by zoneId', async () => {
      // Arrange
      mockCampingService.getSpots.mockResolvedValue({
        items: [spotWithZone],
        total: 1,
        page: 1,
        limit: 50,
        totalPages: 1,
      });

      // Act
      await controller.getSpots({ zoneId: tentZone.id });

      // Assert
      expect(mockCampingService.getSpots).toHaveBeenCalledWith({
        zoneId: tentZone.id,
      });
    });

    it('should filter by status', async () => {
      // Arrange
      mockCampingService.getSpots.mockResolvedValue({
        items: [spotWithZone],
        total: 1,
        page: 1,
        limit: 50,
        totalPages: 1,
      });

      // Act
      await controller.getSpots({ status: CampingSpotStatus.AVAILABLE });

      // Assert
      expect(mockCampingService.getSpots).toHaveBeenCalledWith({
        status: CampingSpotStatus.AVAILABLE,
      });
    });

    it('should filter by electricityHook', async () => {
      // Arrange
      mockCampingService.getSpots.mockResolvedValue({
        items: [caravanSpotWithZone],
        total: 1,
        page: 1,
        limit: 50,
        totalPages: 1,
      });

      // Act
      await controller.getSpots({ electricityHook: true });

      // Assert
      expect(mockCampingService.getSpots).toHaveBeenCalledWith({
        electricityHook: true,
      });
    });

    it('should apply pagination', async () => {
      // Arrange
      mockCampingService.getSpots.mockResolvedValue({
        items: [],
        total: 100,
        page: 3,
        limit: 20,
        totalPages: 5,
      });

      // Act
      await controller.getSpots({ page: 3, limit: 20 });

      // Assert
      expect(mockCampingService.getSpots).toHaveBeenCalledWith({
        page: 3,
        limit: 20,
      });
    });
  });

  // ==========================================================================
  // GET /api/camping/spots/available Tests
  // ==========================================================================

  describe('GET /api/camping/spots/available', () => {
    const availabilityQuery = {
      festivalId: publishedFestival.id,
      checkIn: new Date('2024-07-20T14:00:00Z'),
      checkOut: new Date('2024-07-22T11:00:00Z'),
    };

    it('should return available spots with pricing', async () => {
      // Arrange
      const availableSpotsResult = [
        { ...spotWithZone, nights: 2, totalPrice: 50 },
        { ...caravanSpotWithZone, nights: 2, totalPrice: 90 },
      ];
      mockCampingService.getAvailableSpots.mockResolvedValue(availableSpotsResult);

      // Act
      const result = await controller.getAvailableSpots(availabilityQuery);

      // Assert
      expect(result).toHaveLength(2);
      expect(result[0].nights).toBe(2);
      expect(result[0].totalPrice).toBe(50);
    });

    it('should filter by zoneId', async () => {
      // Arrange
      mockCampingService.getAvailableSpots.mockResolvedValue([
        { ...spotWithZone, nights: 2, totalPrice: 50 },
      ]);

      // Act
      await controller.getAvailableSpots({
        ...availabilityQuery,
        zoneId: tentZone.id,
      });

      // Assert
      expect(mockCampingService.getAvailableSpots).toHaveBeenCalledWith({
        ...availabilityQuery,
        zoneId: tentZone.id,
      });
    });

    it('should filter by electricity requirement', async () => {
      // Arrange
      mockCampingService.getAvailableSpots.mockResolvedValue([
        { ...caravanSpotWithZone, nights: 2, totalPrice: 90 },
      ]);

      // Act
      await controller.getAvailableSpots({
        ...availabilityQuery,
        requireElectricity: true,
      });

      // Assert
      expect(mockCampingService.getAvailableSpots).toHaveBeenCalledWith(
        expect.objectContaining({ requireElectricity: true })
      );
    });

    it('should filter by vehicle length', async () => {
      // Arrange
      mockCampingService.getAvailableSpots.mockResolvedValue([
        { ...caravanSpotWithZone, nights: 2, totalPrice: 90 },
      ]);

      // Act
      await controller.getAvailableSpots({
        ...availabilityQuery,
        vehicleLength: 7.0,
      });

      // Assert
      expect(mockCampingService.getAvailableSpots).toHaveBeenCalledWith(
        expect.objectContaining({ vehicleLength: 7.0 })
      );
    });

    it('should return empty array when no spots available', async () => {
      // Arrange
      mockCampingService.getAvailableSpots.mockResolvedValue([]);

      // Act
      const result = await controller.getAvailableSpots(availabilityQuery);

      // Assert
      expect(result).toEqual([]);
    });
  });

  // ==========================================================================
  // GET /api/camping/spots/:id Tests
  // ==========================================================================

  describe('GET /api/camping/spots/:id', () => {
    it('should return spot by ID', async () => {
      // Arrange
      mockCampingService.getSpot.mockResolvedValue({
        ...spotWithZone,
        bookings: [],
      });

      // Act
      const result = await controller.getSpot(availableSpot.id);

      // Assert
      expect(result.id).toBe(availableSpot.id);
      expect(mockCampingService.getSpot).toHaveBeenCalledWith(availableSpot.id);
    });

    it('should throw NotFoundException when spot does not exist', async () => {
      // Arrange
      mockCampingService.getSpot.mockRejectedValue(
        new NotFoundException('Camping spot with ID non-existent not found')
      );

      // Act & Assert
      await expect(controller.getSpot('non-existent')).rejects.toThrow(NotFoundException);
    });

    it('should return spot with active bookings', async () => {
      // Arrange
      const spotWithBookings = {
        ...occupiedSpotWithZone,
        bookings: [
          {
            id: checkedInBooking.id,
            checkIn: checkedInBooking.checkIn,
            checkOut: checkedInBooking.checkOut,
            status: BookingStatus.CHECKED_IN,
            user: { firstName: 'John', lastName: 'Doe' },
          },
        ],
      };
      mockCampingService.getSpot.mockResolvedValue(spotWithBookings);

      // Act
      const result = await controller.getSpot(occupiedSpot.id);

      // Assert
      expect(result.bookings).toHaveLength(1);
    });
  });

  // ==========================================================================
  // PUT /api/camping/spots/:id Tests
  // ==========================================================================

  describe('PUT /api/camping/spots/:id', () => {
    it('should update spot successfully', async () => {
      // Arrange
      mockCampingService.updateSpot.mockResolvedValue({
        ...spotWithZone,
        notes: 'Updated notes',
      });

      // Act
      const result = await controller.updateSpot(availableSpot.id, {
        notes: 'Updated notes',
      });

      // Assert
      expect(result.notes).toBe('Updated notes');
      expect(mockCampingService.updateSpot).toHaveBeenCalledWith(availableSpot.id, {
        notes: 'Updated notes',
      });
    });

    it('should throw NotFoundException when spot does not exist', async () => {
      // Arrange
      mockCampingService.updateSpot.mockRejectedValue(
        new NotFoundException('Camping spot with ID non-existent not found')
      );

      // Act & Assert
      await expect(controller.updateSpot('non-existent', { notes: 'Test' })).rejects.toThrow(
        NotFoundException
      );
    });

    it('should throw ConflictException when changing to existing number', async () => {
      // Arrange
      mockCampingService.updateSpot.mockRejectedValue(
        new ConflictException('Spot number A2 already exists in this zone')
      );

      // Act & Assert
      await expect(controller.updateSpot(availableSpot.id, { number: 'A2' })).rejects.toThrow(
        ConflictException
      );
    });

    it('should update status to MAINTENANCE', async () => {
      // Arrange
      mockCampingService.updateSpot.mockResolvedValue({
        ...spotWithZone,
        status: CampingSpotStatus.MAINTENANCE,
      });

      // Act
      const result = await controller.updateSpot(availableSpot.id, {
        status: CampingSpotStatus.MAINTENANCE,
      });

      // Assert
      expect(result.status).toBe(CampingSpotStatus.MAINTENANCE);
    });

    it('should update multiple fields at once', async () => {
      // Arrange
      const updateDto = {
        electricityHook: true,
        waterHook: true,
        notes: 'Upgraded spot',
      };
      mockCampingService.updateSpot.mockResolvedValue({
        ...spotWithZone,
        ...updateDto,
      });

      // Act
      const result = await controller.updateSpot(availableSpot.id, updateDto);

      // Assert
      expect(result.electricityHook).toBe(true);
      expect(result.waterHook).toBe(true);
      expect(result.notes).toBe('Upgraded spot');
    });
  });

  // ==========================================================================
  // DELETE /api/camping/spots/:id Tests
  // ==========================================================================

  describe('DELETE /api/camping/spots/:id', () => {
    it('should delete spot successfully', async () => {
      // Arrange
      mockCampingService.deleteSpot.mockResolvedValue({
        message: 'Spot deleted successfully',
      });

      // Act
      const result = await controller.deleteSpot(availableSpot.id);

      // Assert
      expect(result.message).toBe('Spot deleted successfully');
      expect(mockCampingService.deleteSpot).toHaveBeenCalledWith(availableSpot.id);
    });

    it('should throw NotFoundException when spot does not exist', async () => {
      // Arrange
      mockCampingService.deleteSpot.mockRejectedValue(
        new NotFoundException('Camping spot with ID non-existent not found')
      );

      // Act & Assert
      await expect(controller.deleteSpot('non-existent')).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException when spot has active bookings', async () => {
      // Arrange
      mockCampingService.deleteSpot.mockRejectedValue(
        new BadRequestException('Cannot delete spot with active bookings')
      );

      // Act & Assert
      await expect(controller.deleteSpot(occupiedSpot.id)).rejects.toThrow(BadRequestException);
    });
  });
});

// ============================================================================
// CampingBookingsController Tests
// ============================================================================

describe('CampingBookingsController', () => {
  let controller: CampingBookingsController;

  const mockCampingService = {
    createSpot: jest.fn(),
    bulkCreateSpots: jest.fn(),
    getSpots: jest.fn(),
    getAvailableSpots: jest.fn(),
    getSpot: jest.fn(),
    updateSpot: jest.fn(),
    deleteSpot: jest.fn(),
    createBooking: jest.fn(),
    getBookings: jest.fn(),
    getBooking: jest.fn(),
    updateBooking: jest.fn(),
    confirmBooking: jest.fn(),
    checkIn: jest.fn(),
    checkOut: jest.fn(),
    cancelBooking: jest.fn(),
    getStatistics: jest.fn(),
  };

  const mockUser = {
    id: regularUser.id,
    email: regularUser.email,
    role: regularUser.role,
  };

  const _mockStaffUser = {
    id: staffUser.id,
    email: staffUser.email,
    role: staffUser.role,
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [CampingBookingsController],
      providers: [{ provide: CampingService, useValue: mockCampingService }],
    }).compile();

    controller = module.get<CampingBookingsController>(CampingBookingsController);
  });

  // ==========================================================================
  // POST /api/camping/bookings Tests
  // ==========================================================================

  describe('POST /api/camping/bookings', () => {
    it('should create booking successfully', async () => {
      // Arrange
      mockCampingService.createBooking.mockResolvedValue({
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
      const result = await controller.createBooking(validBookingInput, mockUser);

      // Assert
      expect(result.status).toBe(BookingStatus.PENDING);
      expect(mockCampingService.createBooking).toHaveBeenCalledWith(
        validBookingInput,
        regularUser.id
      );
    });

    it('should throw NotFoundException when spot does not exist', async () => {
      // Arrange
      mockCampingService.createBooking.mockRejectedValue(
        new NotFoundException('Camping spot with ID non-existent not found')
      );

      // Act & Assert
      await expect(
        controller.createBooking({ ...validBookingInput, spotId: 'non-existent' }, mockUser)
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException when checkOut before checkIn', async () => {
      // Arrange
      mockCampingService.createBooking.mockRejectedValue(
        new BadRequestException('Check-out must be after check-in')
      );

      // Act & Assert
      await expect(
        controller.createBooking(
          {
            ...validBookingInput,
            checkIn: new Date('2024-07-22T14:00:00Z'),
            checkOut: new Date('2024-07-20T11:00:00Z'),
          },
          mockUser
        )
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw ConflictException when spot not available for dates', async () => {
      // Arrange
      mockCampingService.createBooking.mockRejectedValue(
        new ConflictException('Spot is not available for these dates')
      );

      // Act & Assert
      await expect(
        controller.createBooking(
          {
            ...validBookingInput,
            spotId: occupiedSpot.id,
          },
          mockUser
        )
      ).rejects.toThrow(ConflictException);
    });

    it('should use authenticated user ID for booking', async () => {
      // Arrange
      mockCampingService.createBooking.mockResolvedValue({
        ...pendingBooking,
        userId: regularUser.id,
        spot: spotWithZone,
        user: { id: regularUser.id, firstName: 'Test', lastName: 'User', email: 'test@test.com' },
      });

      // Act
      await controller.createBooking(validBookingInput, mockUser);

      // Assert
      expect(mockCampingService.createBooking).toHaveBeenCalledWith(
        validBookingInput,
        regularUser.id
      );
    });
  });

  // ==========================================================================
  // GET /api/camping/bookings Tests
  // ==========================================================================

  describe('GET /api/camping/bookings', () => {
    it('should return paginated bookings', async () => {
      // Arrange
      const paginatedResult = {
        items: [bookingWithRelations, checkedInBookingWithRelations],
        total: 2,
        page: 1,
        limit: 20,
        totalPages: 1,
      };
      mockCampingService.getBookings.mockResolvedValue(paginatedResult);

      // Act
      const result = await controller.getBookings({});

      // Assert
      expect(result).toEqual(paginatedResult);
      expect(mockCampingService.getBookings).toHaveBeenCalledWith({});
    });

    it('should filter by festivalId', async () => {
      // Arrange
      mockCampingService.getBookings.mockResolvedValue({
        items: [],
        total: 0,
        page: 1,
        limit: 20,
        totalPages: 0,
      });

      // Act
      await controller.getBookings({ festivalId: publishedFestival.id });

      // Assert
      expect(mockCampingService.getBookings).toHaveBeenCalledWith({
        festivalId: publishedFestival.id,
      });
    });

    it('should filter by status', async () => {
      // Arrange
      mockCampingService.getBookings.mockResolvedValue({
        items: [checkedInBookingWithRelations],
        total: 1,
        page: 1,
        limit: 20,
        totalPages: 1,
      });

      // Act
      await controller.getBookings({ status: BookingStatus.CHECKED_IN });

      // Assert
      expect(mockCampingService.getBookings).toHaveBeenCalledWith({
        status: BookingStatus.CHECKED_IN,
      });
    });

    it('should filter by userId', async () => {
      // Arrange
      mockCampingService.getBookings.mockResolvedValue({
        items: [bookingWithRelations],
        total: 1,
        page: 1,
        limit: 20,
        totalPages: 1,
      });

      // Act
      await controller.getBookings({ userId: regularUser.id });

      // Assert
      expect(mockCampingService.getBookings).toHaveBeenCalledWith({
        userId: regularUser.id,
      });
    });

    it('should search by booking number or vehicle plate', async () => {
      // Arrange
      mockCampingService.getBookings.mockResolvedValue({
        items: [bookingWithRelations],
        total: 1,
        page: 1,
        limit: 20,
        totalPages: 1,
      });

      // Act
      await controller.getBookings({ search: 'AB-123' });

      // Assert
      expect(mockCampingService.getBookings).toHaveBeenCalledWith({
        search: 'AB-123',
      });
    });

    it('should apply date range filters', async () => {
      // Arrange
      const checkInFrom = new Date('2024-07-15T00:00:00Z');
      const checkInTo = new Date('2024-07-20T00:00:00Z');
      mockCampingService.getBookings.mockResolvedValue({
        items: [],
        total: 0,
        page: 1,
        limit: 20,
        totalPages: 0,
      });

      // Act
      await controller.getBookings({ checkInFrom, checkInTo });

      // Assert
      expect(mockCampingService.getBookings).toHaveBeenCalledWith({
        checkInFrom,
        checkInTo,
      });
    });

    it('should apply sorting', async () => {
      // Arrange
      mockCampingService.getBookings.mockResolvedValue({
        items: [],
        total: 0,
        page: 1,
        limit: 20,
        totalPages: 0,
      });

      // Act
      await controller.getBookings({ sortBy: 'createdAt', sortOrder: 'asc' });

      // Assert
      expect(mockCampingService.getBookings).toHaveBeenCalledWith({
        sortBy: 'createdAt',
        sortOrder: 'asc',
      });
    });
  });

  // ==========================================================================
  // GET /api/camping/bookings/:id Tests
  // ==========================================================================

  describe('GET /api/camping/bookings/:id', () => {
    it('should return booking by ID', async () => {
      // Arrange
      mockCampingService.getBooking.mockResolvedValue(bookingWithRelations);

      // Act
      const result = await controller.getBooking(confirmedBooking.id);

      // Assert
      expect(result.id).toBe(confirmedBooking.id);
      expect(mockCampingService.getBooking).toHaveBeenCalledWith(confirmedBooking.id);
    });

    it('should throw NotFoundException when booking does not exist', async () => {
      // Arrange
      mockCampingService.getBooking.mockRejectedValue(
        new NotFoundException('Camping booking with ID non-existent not found')
      );

      // Act & Assert
      await expect(controller.getBooking('non-existent')).rejects.toThrow(NotFoundException);
    });

    it('should return booking with spot and user relations', async () => {
      // Arrange
      mockCampingService.getBooking.mockResolvedValue(bookingWithRelations);

      // Act
      const result = await controller.getBooking(confirmedBooking.id);

      // Assert
      expect(result.spot).toBeDefined();
      expect(result.spot.zone).toBeDefined();
      expect(result.user).toBeDefined();
    });
  });

  // ==========================================================================
  // PUT /api/camping/bookings/:id Tests
  // ==========================================================================

  describe('PUT /api/camping/bookings/:id', () => {
    it('should update booking successfully', async () => {
      // Arrange
      mockCampingService.updateBooking.mockResolvedValue({
        ...confirmedBooking,
        notes: 'Updated notes',
      });

      // Act
      const result = await controller.updateBooking(confirmedBooking.id, {
        notes: 'Updated notes',
      });

      // Assert
      expect(result.notes).toBe('Updated notes');
      expect(mockCampingService.updateBooking).toHaveBeenCalledWith(confirmedBooking.id, {
        notes: 'Updated notes',
      });
    });

    it('should throw NotFoundException when booking does not exist', async () => {
      // Arrange
      mockCampingService.updateBooking.mockRejectedValue(
        new NotFoundException('Camping booking with ID non-existent not found')
      );

      // Act & Assert
      await expect(controller.updateBooking('non-existent', { notes: 'Test' })).rejects.toThrow(
        NotFoundException
      );
    });

    it('should throw BadRequestException when updating cancelled booking', async () => {
      // Arrange
      mockCampingService.updateBooking.mockRejectedValue(
        new BadRequestException('Cannot update a cancelled or completed booking')
      );

      // Act & Assert
      await expect(
        controller.updateBooking(cancelledBooking.id, { notes: 'Test' })
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw ConflictException when new dates conflict', async () => {
      // Arrange
      mockCampingService.updateBooking.mockRejectedValue(
        new ConflictException('Spot is not available for these dates')
      );

      // Act & Assert
      await expect(
        controller.updateBooking(confirmedBooking.id, {
          checkIn: new Date('2024-07-15T14:00:00Z'),
          checkOut: new Date('2024-07-19T11:00:00Z'),
        })
      ).rejects.toThrow(ConflictException);
    });

    it('should update vehicle info', async () => {
      // Arrange
      mockCampingService.updateBooking.mockResolvedValue({
        ...confirmedBooking,
        vehiclePlate: 'NEW-PLATE',
        vehicleType: 'caravan',
      });

      // Act
      const result = await controller.updateBooking(confirmedBooking.id, {
        vehiclePlate: 'NEW-PLATE',
        vehicleType: 'caravan',
      });

      // Assert
      expect(result.vehiclePlate).toBe('NEW-PLATE');
      expect(result.vehicleType).toBe('caravan');
    });
  });

  // ==========================================================================
  // POST /api/camping/bookings/:id/confirm Tests
  // ==========================================================================

  describe('POST /api/camping/bookings/:id/confirm', () => {
    it('should confirm pending booking', async () => {
      // Arrange
      mockCampingService.confirmBooking.mockResolvedValue({
        ...pendingBooking,
        status: BookingStatus.CONFIRMED,
      });

      // Act
      const result = await controller.confirmBooking(pendingBooking.id);

      // Assert
      expect(result.status).toBe(BookingStatus.CONFIRMED);
      expect(mockCampingService.confirmBooking).toHaveBeenCalledWith(pendingBooking.id);
    });

    it('should throw NotFoundException when booking does not exist', async () => {
      // Arrange
      mockCampingService.confirmBooking.mockRejectedValue(
        new NotFoundException('Camping booking with ID non-existent not found')
      );

      // Act & Assert
      await expect(controller.confirmBooking('non-existent')).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException when booking is not pending', async () => {
      // Arrange
      mockCampingService.confirmBooking.mockRejectedValue(
        new BadRequestException('Only pending bookings can be confirmed')
      );

      // Act & Assert
      await expect(controller.confirmBooking(confirmedBooking.id)).rejects.toThrow(
        BadRequestException
      );
    });
  });

  // ==========================================================================
  // POST /api/camping/bookings/:id/checkin Tests
  // ==========================================================================

  describe('POST /api/camping/bookings/:id/checkin', () => {
    it('should check in confirmed booking', async () => {
      // Arrange
      mockCampingService.checkIn.mockResolvedValue({
        ...confirmedBooking,
        status: BookingStatus.CHECKED_IN,
        checkedInAt: new Date(),
      });

      // Act
      const result = await controller.checkIn(confirmedBooking.id, validCheckInInput);

      // Assert
      expect(result.status).toBe(BookingStatus.CHECKED_IN);
      expect(result.checkedInAt).toBeDefined();
      expect(mockCampingService.checkIn).toHaveBeenCalledWith(
        confirmedBooking.id,
        validCheckInInput
      );
    });

    it('should throw NotFoundException when booking does not exist', async () => {
      // Arrange
      mockCampingService.checkIn.mockRejectedValue(
        new NotFoundException('Camping booking with ID non-existent not found')
      );

      // Act & Assert
      await expect(controller.checkIn('non-existent', validCheckInInput)).rejects.toThrow(
        NotFoundException
      );
    });

    it('should throw BadRequestException when booking is not confirmed', async () => {
      // Arrange
      mockCampingService.checkIn.mockRejectedValue(
        new BadRequestException('Only confirmed bookings can be checked in')
      );

      // Act & Assert
      await expect(controller.checkIn(pendingBooking.id, validCheckInInput)).rejects.toThrow(
        BadRequestException
      );
    });

    it('should override vehicle plate at check-in', async () => {
      // Arrange
      mockCampingService.checkIn.mockResolvedValue({
        ...confirmedBooking,
        status: BookingStatus.CHECKED_IN,
        vehiclePlate: 'NEW-PLATE',
      });

      // Act
      const result = await controller.checkIn(confirmedBooking.id, {
        vehiclePlate: 'NEW-PLATE',
      });

      // Assert
      expect(result.vehiclePlate).toBe('NEW-PLATE');
    });
  });

  // ==========================================================================
  // POST /api/camping/bookings/:id/checkout Tests
  // ==========================================================================

  describe('POST /api/camping/bookings/:id/checkout', () => {
    it('should check out checked-in booking', async () => {
      // Arrange
      mockCampingService.checkOut.mockResolvedValue({
        ...checkedInBooking,
        status: BookingStatus.CHECKED_OUT,
        checkedOutAt: new Date(),
      });

      // Act
      const result = await controller.checkOut(checkedInBooking.id, validCheckOutInput);

      // Assert
      expect(result.status).toBe(BookingStatus.CHECKED_OUT);
      expect(result.checkedOutAt).toBeDefined();
      expect(mockCampingService.checkOut).toHaveBeenCalledWith(
        checkedInBooking.id,
        validCheckOutInput
      );
    });

    it('should throw NotFoundException when booking does not exist', async () => {
      // Arrange
      mockCampingService.checkOut.mockRejectedValue(
        new NotFoundException('Camping booking with ID non-existent not found')
      );

      // Act & Assert
      await expect(controller.checkOut('non-existent', validCheckOutInput)).rejects.toThrow(
        NotFoundException
      );
    });

    it('should throw BadRequestException when booking is not checked in', async () => {
      // Arrange
      mockCampingService.checkOut.mockRejectedValue(
        new BadRequestException('Only checked-in bookings can be checked out')
      );

      // Act & Assert
      await expect(controller.checkOut(confirmedBooking.id, validCheckOutInput)).rejects.toThrow(
        BadRequestException
      );
    });

    it('should record damage report at checkout', async () => {
      // Arrange
      mockCampingService.checkOut.mockResolvedValue({
        ...checkedInBooking,
        status: BookingStatus.CHECKED_OUT,
        damageReport: 'Minor tent damage',
      });

      // Act
      const result = await controller.checkOut(checkedInBooking.id, {
        notes: 'All good',
        damageReport: 'Minor tent damage',
      });

      // Assert
      expect(result.damageReport).toBe('Minor tent damage');
    });
  });

  // ==========================================================================
  // POST /api/camping/bookings/:id/cancel Tests
  // ==========================================================================

  describe('POST /api/camping/bookings/:id/cancel', () => {
    it('should cancel pending booking', async () => {
      // Arrange
      mockCampingService.cancelBooking.mockResolvedValue({
        ...pendingBooking,
        status: BookingStatus.CANCELLED,
        cancelledAt: new Date(),
        cancelReason: validCancelInput.reason,
      });

      // Act
      const result = await controller.cancelBooking(pendingBooking.id, validCancelInput);

      // Assert
      expect(result.status).toBe(BookingStatus.CANCELLED);
      expect(result.cancelReason).toBe(validCancelInput.reason);
      expect(mockCampingService.cancelBooking).toHaveBeenCalledWith(
        pendingBooking.id,
        validCancelInput
      );
    });

    it('should cancel confirmed booking', async () => {
      // Arrange
      mockCampingService.cancelBooking.mockResolvedValue({
        ...confirmedBooking,
        status: BookingStatus.CANCELLED,
        cancelledAt: new Date(),
      });

      // Act
      const result = await controller.cancelBooking(confirmedBooking.id, validCancelInput);

      // Assert
      expect(result.status).toBe(BookingStatus.CANCELLED);
    });

    it('should cancel checked-in booking', async () => {
      // Arrange
      mockCampingService.cancelBooking.mockResolvedValue({
        ...checkedInBooking,
        status: BookingStatus.CANCELLED,
        cancelledAt: new Date(),
      });

      // Act
      const result = await controller.cancelBooking(checkedInBooking.id, validCancelInput);

      // Assert
      expect(result.status).toBe(BookingStatus.CANCELLED);
    });

    it('should throw NotFoundException when booking does not exist', async () => {
      // Arrange
      mockCampingService.cancelBooking.mockRejectedValue(
        new NotFoundException('Camping booking with ID non-existent not found')
      );

      // Act & Assert
      await expect(controller.cancelBooking('non-existent', validCancelInput)).rejects.toThrow(
        NotFoundException
      );
    });

    it('should throw BadRequestException when booking is already cancelled', async () => {
      // Arrange
      mockCampingService.cancelBooking.mockRejectedValue(
        new BadRequestException('Cannot cancel this booking')
      );

      // Act & Assert
      await expect(controller.cancelBooking(cancelledBooking.id, validCancelInput)).rejects.toThrow(
        BadRequestException
      );
    });

    it('should throw BadRequestException when booking is already checked out', async () => {
      // Arrange
      mockCampingService.cancelBooking.mockRejectedValue(
        new BadRequestException('Cannot cancel this booking')
      );

      // Act & Assert
      await expect(
        controller.cancelBooking(checkedOutBooking.id, validCancelInput)
      ).rejects.toThrow(BadRequestException);
    });
  });
});

// ============================================================================
// FestivalCampingController Tests
// ============================================================================

describe('FestivalCampingController', () => {
  let controller: FestivalCampingController;

  const mockCampingService = {
    createSpot: jest.fn(),
    bulkCreateSpots: jest.fn(),
    getSpots: jest.fn(),
    getAvailableSpots: jest.fn(),
    getSpot: jest.fn(),
    updateSpot: jest.fn(),
    deleteSpot: jest.fn(),
    createBooking: jest.fn(),
    getBookings: jest.fn(),
    getBooking: jest.fn(),
    updateBooking: jest.fn(),
    confirmBooking: jest.fn(),
    checkIn: jest.fn(),
    checkOut: jest.fn(),
    cancelBooking: jest.fn(),
    getStatistics: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [FestivalCampingController],
      providers: [{ provide: CampingService, useValue: mockCampingService }],
    }).compile();

    controller = module.get<FestivalCampingController>(FestivalCampingController);
  });

  // ==========================================================================
  // GET /api/festivals/:festivalId/camping/statistics Tests
  // ==========================================================================

  describe('GET /api/festivals/:festivalId/camping/statistics', () => {
    it('should return camping statistics for festival', async () => {
      // Arrange
      const stats = {
        festivalId: publishedFestival.id,
        totalZones: 3,
        totalSpots: 100,
        availableSpots: 60,
        occupiedSpots: 30,
        reservedSpots: 10,
        totalBookings: 50,
        activeBookings: 30,
        pendingBookings: 5,
        totalRevenue: 5000,
        occupancyRate: 30,
        byType: {
          TENT: { total: 50, available: 30, occupied: 15, revenue: 2000 },
          CARAVAN: { total: 30, available: 20, occupied: 10, revenue: 2500 },
          GLAMPING: { total: 20, available: 10, occupied: 5, revenue: 500 },
        },
        dailyOccupancy: [
          { date: '2024-07-15', occupied: 25, total: 100, rate: 25 },
          { date: '2024-07-16', occupied: 30, total: 100, rate: 30 },
        ],
      };
      mockCampingService.getStatistics.mockResolvedValue(stats);

      // Act
      const result = await controller.getStatistics(publishedFestival.id);

      // Assert
      expect(result).toEqual(stats);
      expect(mockCampingService.getStatistics).toHaveBeenCalledWith(publishedFestival.id);
    });

    it('should return empty statistics for festival with no camping', async () => {
      // Arrange
      const emptyStats = {
        festivalId: publishedFestival.id,
        totalZones: 0,
        totalSpots: 0,
        availableSpots: 0,
        occupiedSpots: 0,
        reservedSpots: 0,
        totalBookings: 0,
        activeBookings: 0,
        pendingBookings: 0,
        totalRevenue: 0,
        occupancyRate: 0,
        byType: {},
        dailyOccupancy: [],
      };
      mockCampingService.getStatistics.mockResolvedValue(emptyStats);

      // Act
      const result = await controller.getStatistics(publishedFestival.id);

      // Assert
      expect(result.totalZones).toBe(0);
      expect(result.occupancyRate).toBe(0);
    });
  });

  // ==========================================================================
  // GET /api/festivals/:festivalId/camping/spots Tests
  // ==========================================================================

  describe('GET /api/festivals/:festivalId/camping/spots', () => {
    it('should return spots for festival', async () => {
      // Arrange
      const paginatedResult = {
        items: [spotWithZone, caravanSpotWithZone],
        total: 2,
        page: 1,
        limit: 50,
        totalPages: 1,
      };
      mockCampingService.getSpots.mockResolvedValue(paginatedResult);

      // Act
      const result = await controller.getSpots(publishedFestival.id, {});

      // Assert
      expect(result).toEqual(paginatedResult);
      expect(mockCampingService.getSpots).toHaveBeenCalledWith({
        festivalId: publishedFestival.id,
      });
    });

    it('should merge festivalId with other filters', async () => {
      // Arrange
      mockCampingService.getSpots.mockResolvedValue({
        items: [spotWithZone],
        total: 1,
        page: 1,
        limit: 50,
        totalPages: 1,
      });

      // Act
      await controller.getSpots(publishedFestival.id, {
        status: CampingSpotStatus.AVAILABLE,
        electricityHook: true,
      });

      // Assert
      expect(mockCampingService.getSpots).toHaveBeenCalledWith({
        festivalId: publishedFestival.id,
        status: CampingSpotStatus.AVAILABLE,
        electricityHook: true,
      });
    });

    it('should apply pagination with festivalId filter', async () => {
      // Arrange
      mockCampingService.getSpots.mockResolvedValue({
        items: [],
        total: 0,
        page: 2,
        limit: 25,
        totalPages: 0,
      });

      // Act
      await controller.getSpots(publishedFestival.id, { page: 2, limit: 25 });

      // Assert
      expect(mockCampingService.getSpots).toHaveBeenCalledWith({
        festivalId: publishedFestival.id,
        page: 2,
        limit: 25,
      });
    });
  });

  // ==========================================================================
  // GET /api/festivals/:festivalId/camping/bookings Tests
  // ==========================================================================

  describe('GET /api/festivals/:festivalId/camping/bookings', () => {
    it('should return bookings for festival', async () => {
      // Arrange
      const paginatedResult = {
        items: [bookingWithRelations, checkedInBookingWithRelations],
        total: 2,
        page: 1,
        limit: 20,
        totalPages: 1,
      };
      mockCampingService.getBookings.mockResolvedValue(paginatedResult);

      // Act
      const result = await controller.getBookings(publishedFestival.id, {});

      // Assert
      expect(result).toEqual(paginatedResult);
      expect(mockCampingService.getBookings).toHaveBeenCalledWith({
        festivalId: publishedFestival.id,
      });
    });

    it('should merge festivalId with status filter', async () => {
      // Arrange
      mockCampingService.getBookings.mockResolvedValue({
        items: [checkedInBookingWithRelations],
        total: 1,
        page: 1,
        limit: 20,
        totalPages: 1,
      });

      // Act
      await controller.getBookings(publishedFestival.id, {
        status: BookingStatus.CHECKED_IN,
      });

      // Assert
      expect(mockCampingService.getBookings).toHaveBeenCalledWith({
        festivalId: publishedFestival.id,
        status: BookingStatus.CHECKED_IN,
      });
    });

    it('should merge festivalId with date filters', async () => {
      // Arrange
      const checkInFrom = new Date('2024-07-15T00:00:00Z');
      const checkInTo = new Date('2024-07-20T00:00:00Z');
      mockCampingService.getBookings.mockResolvedValue({
        items: [],
        total: 0,
        page: 1,
        limit: 20,
        totalPages: 0,
      });

      // Act
      await controller.getBookings(publishedFestival.id, { checkInFrom, checkInTo });

      // Assert
      expect(mockCampingService.getBookings).toHaveBeenCalledWith({
        festivalId: publishedFestival.id,
        checkInFrom,
        checkInTo,
      });
    });

    it('should merge festivalId with search filter', async () => {
      // Arrange
      mockCampingService.getBookings.mockResolvedValue({
        items: [bookingWithRelations],
        total: 1,
        page: 1,
        limit: 20,
        totalPages: 1,
      });

      // Act
      await controller.getBookings(publishedFestival.id, { search: 'CAMP-TEST' });

      // Assert
      expect(mockCampingService.getBookings).toHaveBeenCalledWith({
        festivalId: publishedFestival.id,
        search: 'CAMP-TEST',
      });
    });

    it('should apply sorting with festivalId filter', async () => {
      // Arrange
      mockCampingService.getBookings.mockResolvedValue({
        items: [],
        total: 0,
        page: 1,
        limit: 20,
        totalPages: 0,
      });

      // Act
      await controller.getBookings(publishedFestival.id, {
        sortBy: 'createdAt',
        sortOrder: 'desc',
      });

      // Assert
      expect(mockCampingService.getBookings).toHaveBeenCalledWith({
        festivalId: publishedFestival.id,
        sortBy: 'createdAt',
        sortOrder: 'desc',
      });
    });
  });
});

// ============================================================================
// Error Propagation Tests
// ============================================================================

describe('Error Propagation', () => {
  let spotsController: CampingSpotsController;
  let bookingsController: CampingBookingsController;
  let festivalController: FestivalCampingController;

  const mockCampingService = {
    createSpot: jest.fn(),
    bulkCreateSpots: jest.fn(),
    getSpots: jest.fn(),
    getAvailableSpots: jest.fn(),
    getSpot: jest.fn(),
    updateSpot: jest.fn(),
    deleteSpot: jest.fn(),
    createBooking: jest.fn(),
    getBookings: jest.fn(),
    getBooking: jest.fn(),
    updateBooking: jest.fn(),
    confirmBooking: jest.fn(),
    checkIn: jest.fn(),
    checkOut: jest.fn(),
    cancelBooking: jest.fn(),
    getStatistics: jest.fn(),
  };

  const mockUser = { id: regularUser.id };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [CampingSpotsController, CampingBookingsController, FestivalCampingController],
      providers: [{ provide: CampingService, useValue: mockCampingService }],
    }).compile();

    spotsController = module.get<CampingSpotsController>(CampingSpotsController);
    bookingsController = module.get<CampingBookingsController>(CampingBookingsController);
    festivalController = module.get<FestivalCampingController>(FestivalCampingController);
  });

  it('should propagate NotFoundException from service', async () => {
    // Arrange
    const error = new NotFoundException('Resource not found');
    mockCampingService.getSpot.mockRejectedValue(error);

    // Act & Assert
    await expect(spotsController.getSpot('non-existent')).rejects.toThrow(NotFoundException);
  });

  it('should propagate BadRequestException from service', async () => {
    // Arrange
    const error = new BadRequestException('Invalid input');
    mockCampingService.createBooking.mockRejectedValue(error);

    // Act & Assert
    await expect(bookingsController.createBooking(validBookingInput, mockUser)).rejects.toThrow(
      BadRequestException
    );
  });

  it('should propagate ConflictException from service', async () => {
    // Arrange
    const error = new ConflictException('Resource conflict');
    mockCampingService.createSpot.mockRejectedValue(error);

    // Act & Assert
    await expect(spotsController.createSpot(validCreateSpotInput)).rejects.toThrow(
      ConflictException
    );
  });

  it('should propagate unexpected errors from service', async () => {
    // Arrange
    const error = new Error('Unexpected database error');
    mockCampingService.getStatistics.mockRejectedValue(error);

    // Act & Assert
    await expect(festivalController.getStatistics(publishedFestival.id)).rejects.toThrow(
      'Unexpected database error'
    );
  });
});
