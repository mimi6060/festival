import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { CampingService } from './camping.service';
import {
  CreateCampingSpotDto,
  UpdateCampingSpotDto,
  CreateBookingDto,
  CampingSpotQueryDto,
  BookingQueryDto,
} from './dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser, AuthenticatedUser } from '../auth/decorators/current-user.decorator';
import { UserRole } from '@prisma/client';

/**
 * Controller for camping spot management (Admin)
 */
@Controller('festivals/:festivalId/camping')
@UseGuards(JwtAuthGuard)
export class FestivalCampingController {
  constructor(private readonly campingService: CampingService) {}

  /**
   * Get available camping spots for a festival
   * GET /festivals/:festivalId/camping
   */
  @Get()
  async getAvailableSpots(
    @Param('festivalId') festivalId: string,
    @Query() query: CampingSpotQueryDto,
  ) {
    const result = await this.campingService.getAvailableSpots(festivalId, query);

    return {
      success: true,
      data: result.spots,
      pagination: {
        total: result.total,
        page: result.page,
        limit: result.limit,
        totalPages: Math.ceil(result.total / result.limit),
      },
    };
  }

  /**
   * Create a new camping spot (Admin/Organizer)
   * POST /festivals/:festivalId/camping
   */
  @Post()
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.ORGANIZER)
  @HttpCode(HttpStatus.CREATED)
  async createSpot(
    @Param('festivalId') festivalId: string,
    @Body() createDto: CreateCampingSpotDto,
  ) {
    // Override festivalId from params
    const spot = await this.campingService.createSpot({
      ...createDto,
      festivalId,
    });

    return {
      success: true,
      message: 'Camping spot created successfully',
      data: spot,
    };
  }

  /**
   * Get camping statistics for a festival (Admin/Organizer)
   * GET /festivals/:festivalId/camping/stats
   */
  @Get('stats')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.ORGANIZER)
  async getCampingStats(@Param('festivalId') festivalId: string) {
    const stats = await this.campingService.getCampingStats(festivalId);

    return {
      success: true,
      data: stats,
    };
  }

  /**
   * Get all bookings for a festival (Admin/Organizer/Staff)
   * GET /festivals/:festivalId/camping/bookings
   */
  @Get('bookings')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.ORGANIZER, UserRole.STAFF)
  async getFestivalBookings(
    @Param('festivalId') festivalId: string,
    @Query() query: BookingQueryDto,
  ) {
    const result = await this.campingService.getFestivalBookings(festivalId, query);

    return {
      success: true,
      data: result.bookings,
      pagination: {
        total: result.total,
        page: result.page,
        limit: result.limit,
        totalPages: Math.ceil(result.total / result.limit),
      },
    };
  }

  /**
   * Get a specific camping spot
   * GET /festivals/:festivalId/camping/:spotId
   */
  @Get(':spotId')
  async getSpot(@Param('spotId') spotId: string) {
    const spot = await this.campingService.getSpotById(spotId);

    return {
      success: true,
      data: spot,
    };
  }

  /**
   * Update a camping spot (Admin/Organizer)
   * PUT /festivals/:festivalId/camping/:spotId
   */
  @Put(':spotId')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.ORGANIZER)
  async updateSpot(
    @Param('spotId') spotId: string,
    @Body() updateDto: UpdateCampingSpotDto,
  ) {
    const spot = await this.campingService.updateSpot(spotId, updateDto);

    return {
      success: true,
      message: 'Camping spot updated successfully',
      data: spot,
    };
  }

  /**
   * Delete a camping spot (Admin/Organizer)
   * DELETE /festivals/:festivalId/camping/:spotId
   */
  @Delete(':spotId')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.ORGANIZER)
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteSpot(@Param('spotId') spotId: string) {
    await this.campingService.deleteSpot(spotId);
  }
}

/**
 * Controller for camping bookings
 */
@Controller('camping')
@UseGuards(JwtAuthGuard)
export class CampingController {
  constructor(private readonly campingService: CampingService) {}

  /**
   * Create a new booking
   * POST /camping/book
   */
  @Post('book')
  @HttpCode(HttpStatus.CREATED)
  async createBooking(
    @CurrentUser() user: AuthenticatedUser,
    @Body() createDto: CreateBookingDto,
  ) {
    const booking = await this.campingService.createBooking(user.id, createDto);

    return {
      success: true,
      message: 'Booking created successfully',
      data: booking,
    };
  }

  /**
   * Get my bookings
   * GET /camping/me
   */
  @Get('me')
  async getMyBookings(@CurrentUser() user: AuthenticatedUser) {
    const bookings = await this.campingService.getMyBookings(user.id);

    return {
      success: true,
      data: bookings,
      count: bookings.length,
    };
  }

  /**
   * Get a specific booking
   * GET /camping/:bookingId
   */
  @Get(':bookingId')
  async getBooking(
    @Param('bookingId') bookingId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const booking = await this.campingService.getBookingById(
      bookingId,
      user.id,
      user.role,
    );

    return {
      success: true,
      data: booking,
    };
  }

  /**
   * Check-in a booking (Staff only)
   * POST /camping/:bookingId/check-in
   */
  @Post(':bookingId/check-in')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.STAFF, UserRole.ORGANIZER)
  @HttpCode(HttpStatus.OK)
  async checkIn(
    @Param('bookingId') bookingId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const booking = await this.campingService.checkIn(
      bookingId,
      user.id,
      user.role,
    );

    return {
      success: true,
      message: 'Check-in successful',
      data: booking,
    };
  }

  /**
   * Check-out a booking (Staff only)
   * POST /camping/:bookingId/check-out
   */
  @Post(':bookingId/check-out')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.STAFF, UserRole.ORGANIZER)
  @HttpCode(HttpStatus.OK)
  async checkOut(
    @Param('bookingId') bookingId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const booking = await this.campingService.checkOut(
      bookingId,
      user.id,
      user.role,
    );

    return {
      success: true,
      message: 'Check-out successful',
      data: booking,
    };
  }

  /**
   * Cancel a booking
   * DELETE /camping/:bookingId
   */
  @Delete(':bookingId')
  @HttpCode(HttpStatus.OK)
  async cancelBooking(
    @Param('bookingId') bookingId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const result = await this.campingService.cancelBooking(
      bookingId,
      user.id,
      user.role,
    );

    return {
      success: true,
      message: result.message,
      data: {
        booking: {
          id: result.booking.id,
          status: result.booking.status,
        },
        refund: {
          amount: result.refundAmount,
          percentage: result.refundPercentage,
        },
      },
    };
  }
}
