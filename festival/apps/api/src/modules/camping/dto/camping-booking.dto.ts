import {
  IsString,
  IsOptional,
  IsUUID,
  IsEnum,
  IsBoolean,
  IsNumber,
  IsInt,
  IsDate,
  Min,
  Max,
  MinLength,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

// Enum matching Prisma schema
export enum BookingStatus {
  PENDING = 'PENDING',
  CONFIRMED = 'CONFIRMED',
  CHECKED_IN = 'CHECKED_IN',
  CHECKED_OUT = 'CHECKED_OUT',
  CANCELLED = 'CANCELLED',
  NO_SHOW = 'NO_SHOW',
}

// ===== Camping Booking DTOs =====

export class CreateCampingBookingDto {
  @ApiProperty({ description: 'Spot ID to book' })
  @IsUUID()
  spotId!: string;

  @ApiProperty({ description: 'Check-in date', example: '2024-07-15' })
  @Type(() => Date)
  @IsDate()
  checkIn!: Date;

  @ApiProperty({ description: 'Check-out date', example: '2024-07-17' })
  @Type(() => Date)
  @IsDate()
  checkOut!: Date;

  @ApiProperty({
    description: 'Number of guests',
    example: 2,
  })
  @IsInt()
  @Min(1)
  @Max(20)
  guestCount!: number;

  @ApiPropertyOptional({
    description: 'Vehicle license plate',
    example: 'AB-123-CD',
  })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  vehiclePlate?: string;

  @ApiPropertyOptional({
    description: 'Vehicle type',
    example: 'car',
    enum: ['car', 'caravan', 'campervan', 'motorcycle', 'none'],
  })
  @IsOptional()
  @IsString()
  vehicleType?: string;

  @ApiPropertyOptional({
    description: 'Additional notes from guest',
    example: 'Arriving late around 22h',
  })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;
}

export class UpdateCampingBookingDto {
  @ApiPropertyOptional({ description: 'Check-in date' })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  checkIn?: Date;

  @ApiPropertyOptional({ description: 'Check-out date' })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  checkOut?: Date;

  @ApiPropertyOptional({ description: 'Number of guests' })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(20)
  guestCount?: number;

  @ApiPropertyOptional({ description: 'Vehicle license plate' })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  vehiclePlate?: string;

  @ApiPropertyOptional({ description: 'Vehicle type' })
  @IsOptional()
  @IsString()
  vehicleType?: string;

  @ApiPropertyOptional({ description: 'Guest notes' })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;

  @ApiPropertyOptional({ description: 'Staff notes' })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  staffNotes?: string;
}

export class ChangeBookingStatusDto {
  @ApiProperty({
    description: 'New booking status',
    enum: BookingStatus,
  })
  @IsEnum(BookingStatus)
  status!: BookingStatus;

  @ApiPropertyOptional({
    description: 'Reason for status change (required for cancellation)',
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}

export class CheckInDto {
  @ApiPropertyOptional({
    description: 'Override vehicle plate at check-in',
    example: 'XY-789-ZZ',
  })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  vehiclePlate?: string;

  @ApiPropertyOptional({
    description: 'Staff notes at check-in',
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;
}

export class CheckOutDto {
  @ApiPropertyOptional({
    description: 'Staff notes at check-out',
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;

  @ApiPropertyOptional({
    description: 'Any issues or damages to report',
  })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  damageReport?: string;
}

export class CancelBookingDto {
  @ApiProperty({
    description: 'Reason for cancellation',
    example: 'Guest requested cancellation',
  })
  @IsString()
  @MinLength(5)
  @MaxLength(500)
  reason!: string;

  @ApiPropertyOptional({
    description: 'Whether to issue a refund',
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  issueRefund?: boolean;
}

export class CampingBookingResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  bookingNumber!: string;

  @ApiProperty()
  spotId!: string;

  @ApiProperty()
  userId!: string;

  @ApiProperty()
  checkIn!: Date;

  @ApiProperty()
  checkOut!: Date;

  @ApiProperty()
  guestCount!: number;

  @ApiProperty({ enum: BookingStatus })
  status!: BookingStatus;

  @ApiProperty()
  totalPrice!: number;

  @ApiProperty()
  paidAmount!: number;

  @ApiPropertyOptional()
  vehiclePlate?: string;

  @ApiPropertyOptional()
  vehicleType?: string;

  @ApiPropertyOptional()
  qrCode?: string;

  @ApiPropertyOptional()
  notes?: string;

  @ApiPropertyOptional()
  staffNotes?: string;

  @ApiPropertyOptional()
  checkedInAt?: Date;

  @ApiPropertyOptional()
  checkedOutAt?: Date;

  @ApiPropertyOptional()
  cancelledAt?: Date;

  @ApiPropertyOptional()
  cancelReason?: string;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;

  // Related data
  @ApiPropertyOptional({ description: 'Spot details' })
  spot?: {
    id: string;
    number: string;
    zone: {
      id: string;
      name: string;
      type: string;
      festivalId: string;
    };
  };

  @ApiPropertyOptional({ description: 'User details' })
  user?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    phone?: string;
  };

  // Computed fields
  @ApiPropertyOptional({ description: 'Number of nights' })
  nights?: number;

  @ApiPropertyOptional({ description: 'Amount remaining to pay' })
  remainingAmount?: number;

  @ApiPropertyOptional({ description: 'Whether booking is paid in full' })
  isPaid?: boolean;
}

export class CampingBookingQueryDto {
  @ApiPropertyOptional({ description: 'Filter by spot ID' })
  @IsOptional()
  @IsUUID()
  spotId?: string;

  @ApiPropertyOptional({ description: 'Filter by zone ID' })
  @IsOptional()
  @IsUUID()
  zoneId?: string;

  @ApiPropertyOptional({ description: 'Filter by festival ID' })
  @IsOptional()
  @IsUUID()
  festivalId?: string;

  @ApiPropertyOptional({ description: 'Filter by user ID' })
  @IsOptional()
  @IsUUID()
  userId?: string;

  @ApiPropertyOptional({
    description: 'Filter by status',
    enum: BookingStatus,
  })
  @IsOptional()
  @IsEnum(BookingStatus)
  status?: BookingStatus;

  @ApiPropertyOptional({ description: 'Filter bookings starting from date' })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  checkInFrom?: Date;

  @ApiPropertyOptional({ description: 'Filter bookings starting until date' })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  checkInTo?: Date;

  @ApiPropertyOptional({ description: 'Search by booking number or vehicle plate' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ description: 'Page number', default: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  page?: number;

  @ApiPropertyOptional({ description: 'Items per page', default: 20 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  @Type(() => Number)
  limit?: number;

  @ApiPropertyOptional({
    description: 'Sort by field',
    example: 'checkIn',
  })
  @IsOptional()
  @IsString()
  sortBy?: string;

  @ApiPropertyOptional({
    description: 'Sort order',
    enum: ['asc', 'desc'],
    default: 'desc',
  })
  @IsOptional()
  @IsString()
  sortOrder?: 'asc' | 'desc';
}

// ===== Payment Integration DTOs =====

export class InitiateBookingPaymentDto {
  @ApiProperty({ description: 'Booking ID' })
  @IsUUID()
  bookingId!: string;

  @ApiPropertyOptional({
    description: 'Amount to pay (default: full amount)',
  })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  @Type(() => Number)
  amount?: number;

  @ApiPropertyOptional({
    description: 'Success redirect URL',
  })
  @IsOptional()
  @IsString()
  successUrl?: string;

  @ApiPropertyOptional({
    description: 'Cancel redirect URL',
  })
  @IsOptional()
  @IsString()
  cancelUrl?: string;
}

export class PaymentResultDto {
  @ApiProperty()
  bookingId!: string;

  @ApiProperty()
  paymentId!: string;

  @ApiProperty()
  status!: 'success' | 'pending' | 'failed';

  @ApiProperty()
  amount!: number;

  @ApiPropertyOptional()
  checkoutUrl?: string;
}

// ===== Map Data DTOs =====

export class CampingMapDto {
  @ApiProperty({ description: 'Festival ID' })
  festivalId!: string;

  @ApiProperty({
    description: 'Zones with their spots for map display',
    type: () => [CampingZoneMapDto],
  })
  zones!: CampingZoneMapDto[];

  @ApiProperty({ description: 'Map bounds' })
  bounds!: {
    north: number;
    south: number;
    east: number;
    west: number;
  };
}

export class CampingZoneMapDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty()
  type!: string;

  @ApiPropertyOptional()
  latitude?: number;

  @ApiPropertyOptional()
  longitude?: number;

  @ApiProperty()
  pricePerNight!: number;

  @ApiProperty({ type: [String] })
  amenities!: string[];

  @ApiProperty({
    description: 'Spots in this zone',
    type: () => [CampingSpotMapDto],
  })
  spots!: CampingSpotMapDto[];

  @ApiProperty({ description: 'Available spots count' })
  availableCount!: number;

  @ApiProperty({ description: 'Total spots count' })
  totalCount!: number;
}

export class CampingSpotMapDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  number!: string;

  @ApiProperty()
  status!: string;

  @ApiPropertyOptional()
  latitude?: number;

  @ApiPropertyOptional()
  longitude?: number;

  @ApiProperty()
  electricityHook!: boolean;

  @ApiProperty()
  waterHook!: boolean;

  @ApiPropertyOptional()
  size?: string;
}

// ===== Statistics DTOs =====

export class CampingStatisticsDto {
  @ApiProperty()
  festivalId!: string;

  @ApiProperty({ description: 'Total zones' })
  totalZones!: number;

  @ApiProperty({ description: 'Total spots' })
  totalSpots!: number;

  @ApiProperty({ description: 'Available spots' })
  availableSpots!: number;

  @ApiProperty({ description: 'Occupied spots' })
  occupiedSpots!: number;

  @ApiProperty({ description: 'Reserved spots' })
  reservedSpots!: number;

  @ApiProperty({ description: 'Total bookings' })
  totalBookings!: number;

  @ApiProperty({ description: 'Active bookings (checked in)' })
  activeBookings!: number;

  @ApiProperty({ description: 'Pending bookings' })
  pendingBookings!: number;

  @ApiProperty({ description: 'Total revenue' })
  totalRevenue!: number;

  @ApiProperty({ description: 'Occupancy rate (percentage)' })
  occupancyRate!: number;

  @ApiProperty({
    description: 'Statistics by zone type',
    type: 'object',
    additionalProperties: true,
  })
  byType!: Record<
    string,
    {
      total: number;
      available: number;
      occupied: number;
      revenue: number;
    }
  >;

  @ApiProperty({
    description: 'Daily occupancy for the last 7 days',
    type: 'array',
  })
  dailyOccupancy!: {
    date: string;
    occupied: number;
    total: number;
    rate: number;
  }[];
}
