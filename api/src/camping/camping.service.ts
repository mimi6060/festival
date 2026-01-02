import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreateCampingSpotDto,
  UpdateCampingSpotDto,
  CreateBookingDto,
  CampingSpotQueryDto,
  BookingQueryDto,
} from './dto';
import {
  CampingSpot,
  CampingBooking,
  BookingStatus,
  Prisma,
  UserRole,
  AccommodationType,
} from '@prisma/client';

interface CampingSpotWithBookings extends CampingSpot {
  bookings: CampingBooking[];
  festival: {
    id: string;
    name: string;
    startDate: Date;
    endDate: Date;
  };
}

interface BookingWithRelations extends CampingBooking {
  spot: CampingSpot & {
    festival: {
      id: string;
      name: string;
      startDate: Date;
      endDate: Date;
    };
  };
  user: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
}

@Injectable()
export class CampingService {
  constructor(private readonly prisma: PrismaService) {}

  // ============ CAMPING SPOTS ============

  /**
   * Create a new camping spot
   */
  async createSpot(createDto: CreateCampingSpotDto): Promise<CampingSpot> {
    // Verify festival exists
    const festival = await this.prisma.festival.findUnique({
      where: { id: createDto.festivalId },
    });

    if (!festival) {
      throw new NotFoundException(`Festival with ID ${createDto.festivalId} not found`);
    }

    return this.prisma.campingSpot.create({
      data: {
        festivalId: createDto.festivalId,
        type: createDto.type,
        name: createDto.name,
        description: createDto.description,
        price: new Prisma.Decimal(createDto.price),
        capacity: createDto.capacity,
        amenities: createDto.amenities || [],
        isAvailable: createDto.isAvailable ?? true,
      },
    });
  }

  /**
   * Get available spots for a festival with optional filters
   */
  async getAvailableSpots(
    festivalId: string,
    query: CampingSpotQueryDto,
  ): Promise<{
    spots: CampingSpotWithBookings[];
    total: number;
    page: number;
    limit: number;
  }> {
    const { type, checkIn, checkOut, minCapacity, onlyAvailable, page = 1, limit = 20 } = query;

    // Build where clause
    const where: Prisma.CampingSpotWhereInput = {
      festivalId,
    };

    if (type) {
      where.type = type;
    }

    if (minCapacity) {
      where.capacity = { gte: minCapacity };
    }

    if (onlyAvailable !== false) {
      where.isAvailable = true;
    }

    // If date range provided, filter out spots with conflicting bookings
    if (checkIn && checkOut) {
      const checkInDate = new Date(checkIn);
      const checkOutDate = new Date(checkOut);

      if (checkInDate >= checkOutDate) {
        throw new BadRequestException('Check-out date must be after check-in date');
      }

      where.bookings = {
        none: {
          status: { in: [BookingStatus.CONFIRMED, BookingStatus.CHECKED_IN] },
          OR: [
            {
              // Existing booking starts during requested period
              checkIn: { gte: checkInDate, lt: checkOutDate },
            },
            {
              // Existing booking ends during requested period
              checkOut: { gt: checkInDate, lte: checkOutDate },
            },
            {
              // Existing booking spans the entire requested period
              checkIn: { lte: checkInDate },
              checkOut: { gte: checkOutDate },
            },
          ],
        },
      };
    }

    const [spots, total] = await Promise.all([
      this.prisma.campingSpot.findMany({
        where,
        include: {
          bookings: {
            where: {
              status: { in: [BookingStatus.CONFIRMED, BookingStatus.CHECKED_IN] },
            },
            orderBy: { checkIn: 'asc' },
          },
          festival: {
            select: {
              id: true,
              name: true,
              startDate: true,
              endDate: true,
            },
          },
        },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: [{ type: 'asc' }, { name: 'asc' }],
      }),
      this.prisma.campingSpot.count({ where }),
    ]);

    return {
      spots: spots as CampingSpotWithBookings[],
      total,
      page,
      limit,
    };
  }

  /**
   * Get a single camping spot by ID
   */
  async getSpotById(spotId: string): Promise<CampingSpotWithBookings> {
    const spot = await this.prisma.campingSpot.findUnique({
      where: { id: spotId },
      include: {
        bookings: {
          where: {
            status: { in: [BookingStatus.CONFIRMED, BookingStatus.CHECKED_IN] },
          },
          orderBy: { checkIn: 'asc' },
        },
        festival: {
          select: {
            id: true,
            name: true,
            startDate: true,
            endDate: true,
          },
        },
      },
    });

    if (!spot) {
      throw new NotFoundException(`Camping spot with ID ${spotId} not found`);
    }

    return spot as CampingSpotWithBookings;
  }

  /**
   * Update a camping spot
   */
  async updateSpot(spotId: string, updateDto: UpdateCampingSpotDto): Promise<CampingSpot> {
    const spot = await this.prisma.campingSpot.findUnique({
      where: { id: spotId },
    });

    if (!spot) {
      throw new NotFoundException(`Camping spot with ID ${spotId} not found`);
    }

    const updateData: Prisma.CampingSpotUpdateInput = {};

    if (updateDto.type !== undefined) updateData.type = updateDto.type;
    if (updateDto.name !== undefined) updateData.name = updateDto.name;
    if (updateDto.description !== undefined) updateData.description = updateDto.description;
    if (updateDto.price !== undefined) updateData.price = new Prisma.Decimal(updateDto.price);
    if (updateDto.capacity !== undefined) updateData.capacity = updateDto.capacity;
    if (updateDto.amenities !== undefined) updateData.amenities = updateDto.amenities;
    if (updateDto.isAvailable !== undefined) updateData.isAvailable = updateDto.isAvailable;

    return this.prisma.campingSpot.update({
      where: { id: spotId },
      data: updateData,
    });
  }

  /**
   * Delete a camping spot
   */
  async deleteSpot(spotId: string): Promise<void> {
    const spot = await this.prisma.campingSpot.findUnique({
      where: { id: spotId },
      include: {
        bookings: {
          where: {
            status: { in: [BookingStatus.CONFIRMED, BookingStatus.CHECKED_IN] },
          },
        },
      },
    });

    if (!spot) {
      throw new NotFoundException(`Camping spot with ID ${spotId} not found`);
    }

    if (spot.bookings.length > 0) {
      throw new BadRequestException('Cannot delete spot with active bookings');
    }

    await this.prisma.campingSpot.delete({
      where: { id: spotId },
    });
  }

  // ============ BOOKINGS ============

  /**
   * Create a new booking
   */
  async createBooking(
    userId: string,
    createDto: CreateBookingDto,
  ): Promise<BookingWithRelations> {
    const { spotId, checkIn, checkOut, guestCount, notes } = createDto;
    const checkInDate = new Date(checkIn);
    const checkOutDate = new Date(checkOut);

    // Validate dates
    if (checkInDate >= checkOutDate) {
      throw new BadRequestException('Check-out date must be after check-in date');
    }

    if (checkInDate < new Date()) {
      throw new BadRequestException('Check-in date cannot be in the past');
    }

    // Get spot and verify it exists
    const spot = await this.prisma.campingSpot.findUnique({
      where: { id: spotId },
      include: {
        festival: true,
      },
    });

    if (!spot) {
      throw new NotFoundException(`Camping spot with ID ${spotId} not found`);
    }

    if (!spot.isAvailable) {
      throw new BadRequestException('This camping spot is not available');
    }

    // Verify guest count doesn't exceed capacity
    if (guestCount > spot.capacity) {
      throw new BadRequestException(
        `Guest count (${guestCount}) exceeds spot capacity (${spot.capacity})`,
      );
    }

    // Verify dates are within festival dates
    if (checkInDate < spot.festival.startDate || checkOutDate > spot.festival.endDate) {
      throw new BadRequestException('Booking dates must be within the festival dates');
    }

    // Check for conflicting bookings
    const conflictingBooking = await this.prisma.campingBooking.findFirst({
      where: {
        spotId,
        status: { in: [BookingStatus.CONFIRMED, BookingStatus.CHECKED_IN] },
        OR: [
          {
            checkIn: { gte: checkInDate, lt: checkOutDate },
          },
          {
            checkOut: { gt: checkInDate, lte: checkOutDate },
          },
          {
            checkIn: { lte: checkInDate },
            checkOut: { gte: checkOutDate },
          },
        ],
      },
    });

    if (conflictingBooking) {
      throw new ConflictException(
        'This spot is already booked for the selected dates',
      );
    }

    // Calculate total price based on number of nights
    const nights = Math.ceil(
      (checkOutDate.getTime() - checkInDate.getTime()) / (1000 * 60 * 60 * 24),
    );
    const totalPrice = Number(spot.price) * nights;

    // Create the booking
    const booking = await this.prisma.campingBooking.create({
      data: {
        spotId,
        userId,
        checkIn: checkInDate,
        checkOut: checkOutDate,
        guestCount,
        status: BookingStatus.CONFIRMED,
        totalPrice: new Prisma.Decimal(totalPrice),
        notes,
      },
      include: {
        spot: {
          include: {
            festival: {
              select: {
                id: true,
                name: true,
                startDate: true,
                endDate: true,
              },
            },
          },
        },
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });

    return booking as BookingWithRelations;
  }

  /**
   * Get user's bookings
   */
  async getMyBookings(userId: string): Promise<BookingWithRelations[]> {
    const bookings = await this.prisma.campingBooking.findMany({
      where: { userId },
      include: {
        spot: {
          include: {
            festival: {
              select: {
                id: true,
                name: true,
                startDate: true,
                endDate: true,
              },
            },
          },
        },
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
      orderBy: { checkIn: 'desc' },
    });

    return bookings as BookingWithRelations[];
  }

  /**
   * Get a single booking by ID
   */
  async getBookingById(
    bookingId: string,
    userId: string,
    userRole: UserRole,
  ): Promise<BookingWithRelations> {
    const booking = await this.prisma.campingBooking.findUnique({
      where: { id: bookingId },
      include: {
        spot: {
          include: {
            festival: {
              select: {
                id: true,
                name: true,
                startDate: true,
                endDate: true,
              },
            },
          },
        },
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });

    if (!booking) {
      throw new NotFoundException(`Booking with ID ${bookingId} not found`);
    }

    // Only owner or staff can view booking
    const staffRoles: UserRole[] = [UserRole.ADMIN, UserRole.STAFF, UserRole.ORGANIZER];
    if (booking.userId !== userId && !staffRoles.includes(userRole)) {
      throw new ForbiddenException('You do not have access to this booking');
    }

    return booking as BookingWithRelations;
  }

  /**
   * Check-in a booking
   */
  async checkIn(
    bookingId: string,
    staffId: string,
    userRole: UserRole,
  ): Promise<BookingWithRelations> {
    const staffRoles: UserRole[] = [UserRole.ADMIN, UserRole.STAFF, UserRole.ORGANIZER];
    if (!staffRoles.includes(userRole)) {
      throw new ForbiddenException('Only staff can perform check-in');
    }

    const booking = await this.prisma.campingBooking.findUnique({
      where: { id: bookingId },
    });

    if (!booking) {
      throw new NotFoundException(`Booking with ID ${bookingId} not found`);
    }

    if (booking.status !== BookingStatus.CONFIRMED) {
      throw new BadRequestException(
        `Cannot check-in a booking with status ${booking.status}`,
      );
    }

    const now = new Date();
    const checkInDate = new Date(booking.checkIn);

    // Allow check-in from the day before to accommodate early arrivals
    const earliestCheckIn = new Date(checkInDate);
    earliestCheckIn.setDate(earliestCheckIn.getDate() - 1);

    if (now < earliestCheckIn) {
      throw new BadRequestException('Check-in is not yet available for this booking');
    }

    const updatedBooking = await this.prisma.campingBooking.update({
      where: { id: bookingId },
      data: {
        status: BookingStatus.CHECKED_IN,
        checkedInAt: now,
      },
      include: {
        spot: {
          include: {
            festival: {
              select: {
                id: true,
                name: true,
                startDate: true,
                endDate: true,
              },
            },
          },
        },
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });

    return updatedBooking as BookingWithRelations;
  }

  /**
   * Check-out a booking
   */
  async checkOut(
    bookingId: string,
    staffId: string,
    userRole: UserRole,
  ): Promise<BookingWithRelations> {
    const staffRoles: UserRole[] = [UserRole.ADMIN, UserRole.STAFF, UserRole.ORGANIZER];
    if (!staffRoles.includes(userRole)) {
      throw new ForbiddenException('Only staff can perform check-out');
    }

    const booking = await this.prisma.campingBooking.findUnique({
      where: { id: bookingId },
    });

    if (!booking) {
      throw new NotFoundException(`Booking with ID ${bookingId} not found`);
    }

    if (booking.status !== BookingStatus.CHECKED_IN) {
      throw new BadRequestException(
        `Cannot check-out a booking with status ${booking.status}`,
      );
    }

    const updatedBooking = await this.prisma.campingBooking.update({
      where: { id: bookingId },
      data: {
        status: BookingStatus.CHECKED_OUT,
        checkedOutAt: new Date(),
      },
      include: {
        spot: {
          include: {
            festival: {
              select: {
                id: true,
                name: true,
                startDate: true,
                endDate: true,
              },
            },
          },
        },
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });

    return updatedBooking as BookingWithRelations;
  }

  /**
   * Cancel a booking
   */
  async cancelBooking(
    bookingId: string,
    userId: string,
    userRole: UserRole,
  ): Promise<{
    booking: BookingWithRelations;
    refundAmount: number;
    refundPercentage: number;
    message: string;
  }> {
    const booking = await this.prisma.campingBooking.findUnique({
      where: { id: bookingId },
      include: {
        spot: {
          include: {
            festival: true,
          },
        },
      },
    });

    if (!booking) {
      throw new NotFoundException(`Booking with ID ${bookingId} not found`);
    }

    // Check authorization
    const isOwner = booking.userId === userId;
    const isAdmin = userRole === UserRole.ADMIN;

    if (!isOwner && !isAdmin) {
      throw new ForbiddenException('You do not have permission to cancel this booking');
    }

    // Check if booking can be cancelled
    if (booking.status === BookingStatus.CHECKED_OUT) {
      throw new BadRequestException('Cannot cancel a completed booking');
    }

    if (booking.status === BookingStatus.CANCELLED) {
      throw new BadRequestException('Booking is already cancelled');
    }

    // Calculate refund based on time until check-in
    const now = new Date();
    const checkInDate = new Date(booking.checkIn);
    const daysUntilCheckIn = Math.ceil(
      (checkInDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
    );

    let refundPercentage: number;
    let message: string;

    if (booking.status === BookingStatus.CHECKED_IN) {
      refundPercentage = 0;
      message = 'No refund - guest has already checked in';
    } else if (daysUntilCheckIn > 14) {
      refundPercentage = 100;
      message = 'Full refund - more than 14 days before check-in';
    } else if (daysUntilCheckIn > 7) {
      refundPercentage = 75;
      message = '75% refund - 7-14 days before check-in';
    } else if (daysUntilCheckIn > 3) {
      refundPercentage = 50;
      message = '50% refund - 3-7 days before check-in';
    } else if (daysUntilCheckIn > 0) {
      refundPercentage = 25;
      message = '25% refund - less than 3 days before check-in';
    } else {
      refundPercentage = 0;
      message = 'No refund - check-in date has passed';
    }

    const refundAmount = (Number(booking.totalPrice) * refundPercentage) / 100;

    // Update booking status
    const updatedBooking = await this.prisma.campingBooking.update({
      where: { id: bookingId },
      data: {
        status: BookingStatus.CANCELLED,
      },
      include: {
        spot: {
          include: {
            festival: {
              select: {
                id: true,
                name: true,
                startDate: true,
                endDate: true,
              },
            },
          },
        },
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });

    return {
      booking: updatedBooking as BookingWithRelations,
      refundAmount,
      refundPercentage,
      message,
    };
  }

  /**
   * Get all bookings for a festival (Admin)
   */
  async getFestivalBookings(
    festivalId: string,
    query: BookingQueryDto,
  ): Promise<{
    bookings: BookingWithRelations[];
    total: number;
    page: number;
    limit: number;
  }> {
    const { status, spotId, page = 1, limit = 50 } = query;

    const where: Prisma.CampingBookingWhereInput = {
      spot: {
        festivalId,
      },
    };

    if (status) {
      where.status = status;
    }

    if (spotId) {
      where.spotId = spotId;
    }

    const [bookings, total] = await Promise.all([
      this.prisma.campingBooking.findMany({
        where,
        include: {
          spot: {
            include: {
              festival: {
                select: {
                  id: true,
                  name: true,
                  startDate: true,
                  endDate: true,
                },
              },
            },
          },
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
        },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { checkIn: 'asc' },
      }),
      this.prisma.campingBooking.count({ where }),
    ]);

    return {
      bookings: bookings as BookingWithRelations[],
      total,
      page,
      limit,
    };
  }

  /**
   * Get camping statistics for a festival
   */
  async getCampingStats(festivalId: string): Promise<{
    totalSpots: number;
    availableSpots: number;
    totalBookings: number;
    activeBookings: number;
    occupancyRate: number;
    revenueTotal: number;
    byType: Array<{
      type: AccommodationType;
      total: number;
      available: number;
      booked: number;
    }>;
    byStatus: Record<BookingStatus, number>;
  }> {
    // Get spots statistics
    const spots = await this.prisma.campingSpot.findMany({
      where: { festivalId },
      include: {
        bookings: {
          where: {
            status: { in: [BookingStatus.CONFIRMED, BookingStatus.CHECKED_IN] },
          },
        },
      },
    });

    // Get booking status counts
    const statusCounts = await this.prisma.campingBooking.groupBy({
      by: ['status'],
      where: {
        spot: { festivalId },
      },
      _count: true,
    });

    // Calculate revenue
    const revenueResult = await this.prisma.campingBooking.aggregate({
      where: {
        spot: { festivalId },
        status: { in: [BookingStatus.CONFIRMED, BookingStatus.CHECKED_IN, BookingStatus.CHECKED_OUT] },
      },
      _sum: {
        totalPrice: true,
      },
    });

    const byStatus: Record<BookingStatus, number> = {
      [BookingStatus.PENDING]: 0,
      [BookingStatus.CONFIRMED]: 0,
      [BookingStatus.CHECKED_IN]: 0,
      [BookingStatus.CHECKED_OUT]: 0,
      [BookingStatus.CANCELLED]: 0,
      [BookingStatus.NO_SHOW]: 0,
    };

    statusCounts.forEach((sc) => {
      byStatus[sc.status] = sc._count;
    });

    // Calculate by type
    const typeStats: Record<AccommodationType, { total: number; available: number; booked: number }> = {
      [AccommodationType.TENT_SPOT]: { total: 0, available: 0, booked: 0 },
      [AccommodationType.CARAVAN_SPOT]: { total: 0, available: 0, booked: 0 },
      [AccommodationType.GLAMPING]: { total: 0, available: 0, booked: 0 },
      [AccommodationType.CABIN]: { total: 0, available: 0, booked: 0 },
    };

    let totalSpots = 0;
    let availableSpots = 0;
    let activeBookings = 0;

    spots.forEach((spot) => {
      totalSpots++;
      typeStats[spot.type].total++;

      if (spot.isAvailable && spot.bookings.length === 0) {
        availableSpots++;
        typeStats[spot.type].available++;
      } else if (spot.bookings.length > 0) {
        typeStats[spot.type].booked++;
        activeBookings += spot.bookings.length;
      }
    });

    const byType = Object.entries(typeStats).map(([type, stats]) => ({
      type: type as AccommodationType,
      ...stats,
    }));

    const totalBookings = Object.values(byStatus).reduce((sum, count) => sum + count, 0);
    const occupancyRate = totalSpots > 0 ? Math.round(((totalSpots - availableSpots) / totalSpots) * 100) : 0;

    return {
      totalSpots,
      availableSpots,
      totalBookings,
      activeBookings,
      occupancyRate,
      revenueTotal: Number(revenueResult._sum.totalPrice) || 0,
      byType,
      byStatus,
    };
  }
}
