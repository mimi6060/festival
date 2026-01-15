import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Prisma } from '@prisma/client';
import {
  CreateCampingSpotDto,
  UpdateCampingSpotDto,
  BulkCreateSpotsDto,
  CampingSpotQueryDto,
  AvailableSpotsQueryDto,
  CreateCampingBookingDto,
  UpdateCampingBookingDto,
  CheckInDto,
  CheckOutDto,
  CancelBookingDto,
  CampingBookingQueryDto,
} from './dto';

/**
 * Camping Service
 *
 * Handles camping operations:
 * - Camping zone management
 * - Camping spot management
 * - Camping bookings (CRUD, check-in, check-out)
 * - Availability checking
 * - Statistics
 */
@Injectable()
export class CampingService {
  private readonly logger = new Logger(CampingService.name);

  constructor(private readonly prisma: PrismaService) {}

  // ============== Camping Spots ==============

  /**
   * Create a new camping spot
   *
   * Optimized: Fetch zone and existing spot check in parallel.
   */
  async createSpot(dto: CreateCampingSpotDto) {
    // Optimized: Verify zone exists and check for duplicate in parallel
    const [zone, existing] = await Promise.all([
      this.prisma.campingZone.findUnique({
        where: { id: dto.zoneId },
      }),
      this.prisma.campingSpot.findFirst({
        where: { zoneId: dto.zoneId, number: dto.number },
      }),
    ]);

    if (!zone) {
      throw new NotFoundException(`Camping zone with ID ${dto.zoneId} not found`);
    }

    if (existing) {
      throw new ConflictException(
        `Spot number ${dto.number} already exists in this zone`,
      );
    }

    return this.prisma.campingSpot.create({
      data: {
        zoneId: dto.zoneId,
        number: dto.number,
        size: dto.size,
        latitude: dto.latitude,
        longitude: dto.longitude,
        electricityHook: dto.electricityHook ?? false,
        waterHook: dto.waterHook ?? false,
        maxVehicleLength: dto.maxVehicleLength,
        notes: dto.notes,
      },
      include: {
        zone: {
          select: {
            id: true,
            name: true,
            type: true,
            pricePerNight: true,
          },
        },
      },
    });
  }

  /**
   * Bulk create spots in a zone
   */
  async bulkCreateSpots(dto: BulkCreateSpotsDto) {
    // Verify zone exists
    const zone = await this.prisma.campingZone.findUnique({
      where: { id: dto.zoneId },
    });

    if (!zone) {
      throw new NotFoundException(`Camping zone with ID ${dto.zoneId} not found`);
    }

    const startNumber = dto.startNumber ?? 1;
    const spots = [];

    for (let i = 0; i < dto.count; i++) {
      spots.push({
        zoneId: dto.zoneId,
        number: `${dto.prefix}${startNumber + i}`,
        size: dto.size,
        electricityHook: dto.electricityHook ?? false,
        waterHook: dto.waterHook ?? false,
      });
    }

    const created = await this.prisma.campingSpot.createMany({
      data: spots,
      skipDuplicates: true,
    });

    this.logger.log(`Created ${created.count} spots in zone ${dto.zoneId}`);

    return {
      created: created.count,
      requested: dto.count,
    };
  }

  /**
   * Get spots with filters
   */
  async getSpots(query: CampingSpotQueryDto) {
    const { page = 1, limit = 50, ...filters } = query;

    const where: Prisma.CampingSpotWhereInput = {
      ...(filters.zoneId && { zoneId: filters.zoneId }),
      ...(filters.festivalId && { zone: { festivalId: filters.festivalId } }),
      ...(filters.status && { status: filters.status }),
      ...(filters.electricityHook !== undefined && {
        electricityHook: filters.electricityHook,
      }),
      ...(filters.waterHook !== undefined && { waterHook: filters.waterHook }),
      ...(filters.isActive !== undefined && { isActive: filters.isActive }),
    };

    const [spots, total] = await Promise.all([
      this.prisma.campingSpot.findMany({
        where,
        include: {
          zone: {
            select: {
              id: true,
              name: true,
              type: true,
              pricePerNight: true,
            },
          },
        },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: [{ zone: { name: 'asc' } }, { number: 'asc' }],
      }),
      this.prisma.campingSpot.count({ where }),
    ]);

    return {
      items: spots,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Get a spot by ID
   */
  async getSpot(id: string) {
    const spot = await this.prisma.campingSpot.findUnique({
      where: { id },
      include: {
        zone: {
          select: {
            id: true,
            name: true,
            type: true,
            pricePerNight: true,
            festivalId: true,
          },
        },
        bookings: {
          where: {
            OR: [
              { status: 'CONFIRMED' },
              { status: 'CHECKED_IN' },
            ],
          },
          orderBy: { checkIn: 'asc' },
          take: 5,
          select: {
            id: true,
            checkIn: true,
            checkOut: true,
            status: true,
            user: {
              select: {
                firstName: true,
                lastName: true,
              },
            },
          },
        },
      },
    });

    if (!spot) {
      throw new NotFoundException(`Camping spot with ID ${id} not found`);
    }

    return spot;
  }

  /**
   * Update a spot
   */
  async updateSpot(id: string, dto: UpdateCampingSpotDto) {
    const spot = await this.getSpot(id);

    // Check for duplicate number if changing
    if (dto.number && dto.number !== spot.number) {
      const existing = await this.prisma.campingSpot.findFirst({
        where: {
          zoneId: dto.zoneId ?? spot.zoneId,
          number: dto.number,
          NOT: { id },
        },
      });

      if (existing) {
        throw new ConflictException(
          `Spot number ${dto.number} already exists in this zone`,
        );
      }
    }

    return this.prisma.campingSpot.update({
      where: { id },
      data: {
        ...(dto.zoneId && { zoneId: dto.zoneId }),
        ...(dto.number && { number: dto.number }),
        ...(dto.size !== undefined && { size: dto.size }),
        ...(dto.latitude !== undefined && { latitude: dto.latitude }),
        ...(dto.longitude !== undefined && { longitude: dto.longitude }),
        ...(dto.electricityHook !== undefined && {
          electricityHook: dto.electricityHook,
        }),
        ...(dto.waterHook !== undefined && { waterHook: dto.waterHook }),
        ...(dto.maxVehicleLength !== undefined && {
          maxVehicleLength: dto.maxVehicleLength,
        }),
        ...(dto.notes !== undefined && { notes: dto.notes }),
        ...(dto.status && { status: dto.status }),
        ...(dto.isActive !== undefined && { isActive: dto.isActive }),
      },
      include: {
        zone: {
          select: {
            id: true,
            name: true,
            type: true,
            pricePerNight: true,
          },
        },
      },
    });
  }

  /**
   * Delete a spot
   */
  async deleteSpot(id: string) {
    await this.getSpot(id);

    // Check for active bookings
    const activeBookings = await this.prisma.campingBooking.count({
      where: {
        spotId: id,
        status: { in: ['PENDING', 'CONFIRMED', 'CHECKED_IN'] },
      },
    });

    if (activeBookings > 0) {
      throw new BadRequestException(
        'Cannot delete spot with active bookings',
      );
    }

    await this.prisma.campingSpot.delete({ where: { id } });

    return { message: 'Spot deleted successfully' };
  }

  /**
   * Get available spots for a date range
   */
  async getAvailableSpots(query: AvailableSpotsQueryDto) {
    const { festivalId, zoneId, checkIn, checkOut, ...filters } = query;

    // Get spots that don't have conflicting bookings
    const spots = await this.prisma.campingSpot.findMany({
      where: {
        zone: {
          festivalId,
          ...(zoneId && { id: zoneId }),
        },
        isActive: true,
        status: 'AVAILABLE',
        ...(filters.requireElectricity && { electricityHook: true }),
        ...(filters.requireWater && { waterHook: true }),
        ...(filters.vehicleLength && {
          maxVehicleLength: { gte: filters.vehicleLength },
        }),
        bookings: {
          none: {
            status: { in: ['PENDING', 'CONFIRMED', 'CHECKED_IN'] },
            OR: [
              { checkIn: { lt: checkOut }, checkOut: { gt: checkIn } },
            ],
          },
        },
      },
      include: {
        zone: {
          select: {
            id: true,
            name: true,
            type: true,
            pricePerNight: true,
            amenities: true,
          },
        },
      },
      orderBy: [{ zone: { name: 'asc' } }, { number: 'asc' }],
    });

    // Calculate prices for the stay
    const nights = Math.ceil(
      (new Date(checkOut).getTime() - new Date(checkIn).getTime()) /
        (1000 * 60 * 60 * 24),
    );

    return spots.map((spot) => ({
      ...spot,
      nights,
      totalPrice: Number(spot.zone.pricePerNight) * nights,
    }));
  }

  // ============== Camping Bookings ==============

  /**
   * Create a new booking
   */
  async createBooking(dto: CreateCampingBookingDto, userId: string) {
    const spot = await this.getSpot(dto.spotId);

    // Validate dates
    if (dto.checkOut <= dto.checkIn) {
      throw new BadRequestException('Check-out must be after check-in');
    }

    // Check availability
    const conflicting = await this.prisma.campingBooking.findFirst({
      where: {
        spotId: dto.spotId,
        status: { in: ['PENDING', 'CONFIRMED', 'CHECKED_IN'] },
        OR: [
          { checkIn: { lt: dto.checkOut }, checkOut: { gt: dto.checkIn } },
        ],
      },
    });

    if (conflicting) {
      throw new ConflictException('Spot is not available for these dates');
    }

    // Calculate price
    const nights = Math.ceil(
      (new Date(dto.checkOut).getTime() - new Date(dto.checkIn).getTime()) /
        (1000 * 60 * 60 * 24),
    );
    const totalPrice = Number(spot.zone.pricePerNight) * nights;

    // Generate booking number
    const bookingNumber = `CAMP-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

    const booking = await this.prisma.campingBooking.create({
      data: {
        bookingNumber,
        spotId: dto.spotId,
        userId,
        checkIn: dto.checkIn,
        checkOut: dto.checkOut,
        guestCount: dto.guestCount,
        totalPrice,
        vehiclePlate: dto.vehiclePlate,
        vehicleType: dto.vehicleType,
        notes: dto.notes,
        status: 'PENDING',
      },
      include: {
        spot: {
          include: {
            zone: {
              select: {
                id: true,
                name: true,
                type: true,
                festivalId: true,
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
            phone: true,
          },
        },
      },
    });

    this.logger.log(
      `Created camping booking ${bookingNumber} for spot ${spot.number}`,
    );

    return booking;
  }

  /**
   * Get bookings with filters
   */
  async getBookings(query: CampingBookingQueryDto) {
    const {
      page = 1,
      limit = 20,
      sortBy = 'checkIn',
      sortOrder = 'desc',
      ...filters
    } = query;

    const where: Prisma.CampingBookingWhereInput = {
      ...(filters.spotId && { spotId: filters.spotId }),
      ...(filters.zoneId && { spot: { zoneId: filters.zoneId } }),
      ...(filters.festivalId && {
        spot: { zone: { festivalId: filters.festivalId } },
      }),
      ...(filters.userId && { userId: filters.userId }),
      ...(filters.status && { status: filters.status }),
      ...(filters.checkInFrom && { checkIn: { gte: filters.checkInFrom } }),
      ...(filters.checkInTo && { checkIn: { lte: filters.checkInTo } }),
      ...(filters.search && {
        OR: [
          { bookingNumber: { contains: filters.search, mode: 'insensitive' } },
          { vehiclePlate: { contains: filters.search, mode: 'insensitive' } },
        ],
      }),
    };

    const orderBy: Prisma.CampingBookingOrderByWithRelationInput = {
      [sortBy]: sortOrder,
    };

    const [bookings, total] = await Promise.all([
      this.prisma.campingBooking.findMany({
        where,
        include: {
          spot: {
            include: {
              zone: {
                select: {
                  id: true,
                  name: true,
                  type: true,
                  festivalId: true,
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
              phone: true,
            },
          },
        },
        skip: (page - 1) * limit,
        take: limit,
        orderBy,
      }),
      this.prisma.campingBooking.count({ where }),
    ]);

    return {
      items: bookings,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Get a booking by ID
   */
  async getBooking(id: string) {
    const booking = await this.prisma.campingBooking.findUnique({
      where: { id },
      include: {
        spot: {
          include: {
            zone: {
              select: {
                id: true,
                name: true,
                type: true,
                festivalId: true,
                pricePerNight: true,
                amenities: true,
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
            phone: true,
          },
        },
      },
    });

    if (!booking) {
      throw new NotFoundException(`Camping booking with ID ${id} not found`);
    }

    return booking;
  }

  /**
   * Update a booking
   */
  async updateBooking(id: string, dto: UpdateCampingBookingDto) {
    const booking = await this.getBooking(id);

    if (booking.status === 'CANCELLED' || booking.status === 'CHECKED_OUT') {
      throw new BadRequestException('Cannot update a cancelled or completed booking');
    }

    // Validate dates if changing
    if (dto.checkIn || dto.checkOut) {
      const newCheckIn = dto.checkIn ?? booking.checkIn;
      const newCheckOut = dto.checkOut ?? booking.checkOut;

      if (newCheckOut <= newCheckIn) {
        throw new BadRequestException('Check-out must be after check-in');
      }

      // Check for conflicts
      const conflicting = await this.prisma.campingBooking.findFirst({
        where: {
          spotId: booking.spotId,
          id: { not: id },
          status: { in: ['PENDING', 'CONFIRMED', 'CHECKED_IN'] },
          OR: [
            { checkIn: { lt: newCheckOut }, checkOut: { gt: newCheckIn } },
          ],
        },
      });

      if (conflicting) {
        throw new ConflictException('Spot is not available for these dates');
      }

      // Recalculate price
      const nights = Math.ceil(
        (new Date(newCheckOut).getTime() - new Date(newCheckIn).getTime()) /
          (1000 * 60 * 60 * 24),
      );
      const totalPrice = Number(booking.spot.zone.pricePerNight) * nights;

      return this.prisma.campingBooking.update({
        where: { id },
        data: {
          checkIn: newCheckIn,
          checkOut: newCheckOut,
          guestCount: dto.guestCount,
          vehiclePlate: dto.vehiclePlate,
          vehicleType: dto.vehicleType,
          notes: dto.notes,
          staffNotes: dto.staffNotes,
          totalPrice,
        },
      });
    }

    return this.prisma.campingBooking.update({
      where: { id },
      data: {
        ...(dto.guestCount && { guestCount: dto.guestCount }),
        ...(dto.vehiclePlate !== undefined && { vehiclePlate: dto.vehiclePlate }),
        ...(dto.vehicleType !== undefined && { vehicleType: dto.vehicleType }),
        ...(dto.notes !== undefined && { notes: dto.notes }),
        ...(dto.staffNotes !== undefined && { staffNotes: dto.staffNotes }),
      },
    });
  }

  /**
   * Confirm a booking
   */
  async confirmBooking(id: string) {
    const booking = await this.getBooking(id);

    if (booking.status !== 'PENDING') {
      throw new BadRequestException('Only pending bookings can be confirmed');
    }

    return this.prisma.campingBooking.update({
      where: { id },
      data: { status: 'CONFIRMED' },
    });
  }

  /**
   * Check in a guest
   */
  async checkIn(id: string, dto: CheckInDto) {
    const booking = await this.getBooking(id);

    if (booking.status !== 'CONFIRMED') {
      throw new BadRequestException('Only confirmed bookings can be checked in');
    }

    // Update spot status
    await this.prisma.campingSpot.update({
      where: { id: booking.spotId },
      data: { status: 'OCCUPIED' },
    });

    return this.prisma.campingBooking.update({
      where: { id },
      data: {
        status: 'CHECKED_IN',
        checkedInAt: new Date(),
        ...(dto.vehiclePlate && { vehiclePlate: dto.vehiclePlate }),
        ...(dto.notes && { staffNotes: dto.notes }),
      },
    });
  }

  /**
   * Check out a guest
   */
  async checkOut(id: string, dto: CheckOutDto) {
    const booking = await this.getBooking(id);

    if (booking.status !== 'CHECKED_IN') {
      throw new BadRequestException('Only checked-in bookings can be checked out');
    }

    // Update spot status
    await this.prisma.campingSpot.update({
      where: { id: booking.spotId },
      data: { status: 'AVAILABLE' },
    });

    return this.prisma.campingBooking.update({
      where: { id },
      data: {
        status: 'CHECKED_OUT',
        checkedOutAt: new Date(),
        ...(dto.notes && {
          staffNotes: booking.staffNotes
            ? `${booking.staffNotes}\n[Checkout] ${dto.notes}`
            : `[Checkout] ${dto.notes}`,
        }),
        ...(dto.damageReport && { damageReport: dto.damageReport }),
      },
    });
  }

  /**
   * Cancel a booking
   */
  async cancelBooking(id: string, dto: CancelBookingDto) {
    const booking = await this.getBooking(id);

    if (booking.status === 'CHECKED_OUT' || booking.status === 'CANCELLED') {
      throw new BadRequestException('Cannot cancel this booking');
    }

    // If checked in, also update spot status
    if (booking.status === 'CHECKED_IN') {
      await this.prisma.campingSpot.update({
        where: { id: booking.spotId },
        data: { status: 'AVAILABLE' },
      });
    }

    return this.prisma.campingBooking.update({
      where: { id },
      data: {
        status: 'CANCELLED',
        cancelledAt: new Date(),
        cancelReason: dto.reason,
      },
    });
  }

  // ============== Statistics ==============

  /**
   * Get camping statistics for a festival
   */
  async getStatistics(festivalId: string) {
    const zones = await this.prisma.campingZone.findMany({
      where: { festivalId },
      include: {
        spots: {
          include: {
            bookings: {
              where: {
                status: { in: ['CONFIRMED', 'CHECKED_IN', 'CHECKED_OUT'] },
              },
            },
          },
        },
      },
    });

    let totalSpots = 0;
    let availableSpots = 0;
    let occupiedSpots = 0;
    let reservedSpots = 0;
    let totalRevenue = 0;
    const byType: Record<string, any> = {};

    for (const zone of zones) {
      const type = zone.type;
      if (!byType[type]) {
        byType[type] = { total: 0, available: 0, occupied: 0, revenue: 0 };
      }

      for (const spot of zone.spots) {
        totalSpots++;
        byType[type].total++;

        if (spot.status === 'AVAILABLE') {
          availableSpots++;
          byType[type].available++;
        } else if (spot.status === 'OCCUPIED') {
          occupiedSpots++;
          byType[type].occupied++;
        } else if (spot.status === 'RESERVED') {
          reservedSpots++;
        }

        for (const booking of spot.bookings) {
          const revenue = Number(booking.totalPrice);
          totalRevenue += revenue;
          byType[type].revenue += revenue;
        }
      }
    }

    const occupancyRate = totalSpots > 0 ? (occupiedSpots / totalSpots) * 100 : 0;

    // Optimized: Fetch all booking counts in parallel instead of sequential loop
    const dates: { date: Date; nextDate: Date; dateStr: string }[] = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      date.setHours(0, 0, 0, 0);

      const nextDate = new Date(date);
      nextDate.setDate(nextDate.getDate() + 1);

      dates.push({ date, nextDate, dateStr: date.toISOString().split('T')[0] });
    }

    // Optimized: Parallel queries for daily occupancy and booking counts
    const [dailyOccupancyCounts, totalBookings, activeBookings, pendingBookings] = await Promise.all([
      // Batch all daily occupancy queries into Promise.all
      Promise.all(
        dates.map(({ date, nextDate }) =>
          this.prisma.campingBooking.count({
            where: {
              spot: { zone: { festivalId } },
              status: { in: ['CONFIRMED', 'CHECKED_IN'] },
              checkIn: { lte: nextDate },
              checkOut: { gt: date },
            },
          })
        )
      ),
      this.prisma.campingBooking.count({
        where: { spot: { zone: { festivalId } } },
      }),
      this.prisma.campingBooking.count({
        where: {
          spot: { zone: { festivalId } },
          status: 'CHECKED_IN',
        },
      }),
      this.prisma.campingBooking.count({
        where: {
          spot: { zone: { festivalId } },
          status: 'PENDING',
        },
      }),
    ]);

    // Map daily occupancy counts to results
    const dailyOccupancy = dates.map((d, i) => ({
      date: d.dateStr,
      occupied: dailyOccupancyCounts[i],
      total: totalSpots,
      rate: totalSpots > 0 ? (dailyOccupancyCounts[i] / totalSpots) * 100 : 0,
    }));

    return {
      festivalId,
      totalZones: zones.length,
      totalSpots,
      availableSpots,
      occupiedSpots,
      reservedSpots,
      totalBookings,
      activeBookings,
      pendingBookings,
      totalRevenue,
      occupancyRate,
      byType,
      dailyOccupancy,
    };
  }
}
