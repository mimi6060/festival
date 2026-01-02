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
  ParseUUIDPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { CampingService } from './camping.service';
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
import { UserRole } from '@prisma/client';

// ============== Camping Spots Controller ==============

@ApiTags('Camping Spots')
@Controller('camping/spots')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class CampingSpotsController {
  constructor(private readonly campingService: CampingService) {}

  @Post()
  @Roles(UserRole.ADMIN, UserRole.ORGANIZER)
  @ApiOperation({ summary: 'Create a new camping spot' })
  @ApiResponse({ status: 201, description: 'Spot created successfully' })
  async createSpot(@Body() dto: CreateCampingSpotDto) {
    return this.campingService.createSpot(dto);
  }

  @Post('bulk')
  @Roles(UserRole.ADMIN, UserRole.ORGANIZER)
  @ApiOperation({ summary: 'Bulk create camping spots' })
  @ApiResponse({ status: 201, description: 'Spots created successfully' })
  async bulkCreateSpots(@Body() dto: BulkCreateSpotsDto) {
    return this.campingService.bulkCreateSpots(dto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all camping spots with filters' })
  async getSpots(@Query() query: CampingSpotQueryDto) {
    return this.campingService.getSpots(query);
  }

  @Get('available')
  @ApiOperation({ summary: 'Get available spots for a date range' })
  async getAvailableSpots(@Query() query: AvailableSpotsQueryDto) {
    return this.campingService.getAvailableSpots(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a camping spot by ID' })
  @ApiResponse({ status: 200, description: 'Spot details' })
  @ApiResponse({ status: 404, description: 'Spot not found' })
  async getSpot(@Param('id', ParseUUIDPipe) id: string) {
    return this.campingService.getSpot(id);
  }

  @Put(':id')
  @Roles(UserRole.ADMIN, UserRole.ORGANIZER)
  @ApiOperation({ summary: 'Update a camping spot' })
  @ApiResponse({ status: 200, description: 'Spot updated successfully' })
  async updateSpot(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateCampingSpotDto,
  ) {
    return this.campingService.updateSpot(id, dto);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN, UserRole.ORGANIZER)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a camping spot' })
  @ApiResponse({ status: 204, description: 'Spot deleted successfully' })
  async deleteSpot(@Param('id', ParseUUIDPipe) id: string) {
    return this.campingService.deleteSpot(id);
  }
}

// ============== Camping Bookings Controller ==============

@ApiTags('Camping Bookings')
@Controller('camping/bookings')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class CampingBookingsController {
  constructor(private readonly campingService: CampingService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new camping booking' })
  @ApiResponse({ status: 201, description: 'Booking created successfully' })
  async createBooking(
    @Body() dto: CreateCampingBookingDto,
    @CurrentUser() user: { id: string },
  ) {
    return this.campingService.createBooking(dto, user.id);
  }

  @Get()
  @ApiOperation({ summary: 'Get all camping bookings with filters' })
  async getBookings(@Query() query: CampingBookingQueryDto) {
    return this.campingService.getBookings(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a camping booking by ID' })
  @ApiResponse({ status: 200, description: 'Booking details' })
  @ApiResponse({ status: 404, description: 'Booking not found' })
  async getBooking(@Param('id', ParseUUIDPipe) id: string) {
    return this.campingService.getBooking(id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update a camping booking' })
  @ApiResponse({ status: 200, description: 'Booking updated successfully' })
  async updateBooking(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateCampingBookingDto,
  ) {
    return this.campingService.updateBooking(id, dto);
  }

  @Post(':id/confirm')
  @Roles(UserRole.ADMIN, UserRole.ORGANIZER, UserRole.STAFF)
  @ApiOperation({ summary: 'Confirm a pending booking' })
  @ApiResponse({ status: 200, description: 'Booking confirmed' })
  async confirmBooking(@Param('id', ParseUUIDPipe) id: string) {
    return this.campingService.confirmBooking(id);
  }

  @Post(':id/checkin')
  @Roles(UserRole.ADMIN, UserRole.ORGANIZER, UserRole.STAFF)
  @ApiOperation({ summary: 'Check in a guest' })
  @ApiResponse({ status: 200, description: 'Guest checked in' })
  async checkIn(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CheckInDto,
  ) {
    return this.campingService.checkIn(id, dto);
  }

  @Post(':id/checkout')
  @Roles(UserRole.ADMIN, UserRole.ORGANIZER, UserRole.STAFF)
  @ApiOperation({ summary: 'Check out a guest' })
  @ApiResponse({ status: 200, description: 'Guest checked out' })
  async checkOut(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CheckOutDto,
  ) {
    return this.campingService.checkOut(id, dto);
  }

  @Post(':id/cancel')
  @ApiOperation({ summary: 'Cancel a booking' })
  @ApiResponse({ status: 200, description: 'Booking cancelled' })
  async cancelBooking(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CancelBookingDto,
  ) {
    return this.campingService.cancelBooking(id, dto);
  }
}

// ============== Festival Camping Controller ==============

@ApiTags('Festival Camping')
@Controller('festivals/:festivalId/camping')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class FestivalCampingController {
  constructor(private readonly campingService: CampingService) {}

  @Get('statistics')
  @Roles(UserRole.ADMIN, UserRole.ORGANIZER)
  @ApiOperation({ summary: 'Get camping statistics for a festival' })
  async getStatistics(
    @Param('festivalId', ParseUUIDPipe) festivalId: string,
  ) {
    return this.campingService.getStatistics(festivalId);
  }

  @Get('spots')
  @ApiOperation({ summary: 'Get all camping spots for a festival' })
  async getSpots(
    @Param('festivalId', ParseUUIDPipe) festivalId: string,
    @Query() query: CampingSpotQueryDto,
  ) {
    return this.campingService.getSpots({ ...query, festivalId });
  }

  @Get('bookings')
  @ApiOperation({ summary: 'Get all camping bookings for a festival' })
  async getBookings(
    @Param('festivalId', ParseUUIDPipe) festivalId: string,
    @Query() query: CampingBookingQueryDto,
  ) {
    return this.campingService.getBookings({ ...query, festivalId });
  }
}
