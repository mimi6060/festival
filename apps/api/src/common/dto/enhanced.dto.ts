import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type, Transform } from 'class-transformer';
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEmail,
  IsUUID,
  IsNumber,
  IsBoolean,
  IsEnum,
  IsArray,
  IsDate,
  IsInt,
  Min,
  Max,
  MinLength,
  MaxLength,
  ArrayMinSize,
  ArrayMaxSize,
  ValidateNested,
} from 'class-validator';
import {
  IsPhoneE164,
  IsSlug,
  IsCurrencyCode,
  IsMonetaryAmount,
  IsFutureDate,
  IsAfterDate,
  IsLatitude,
  IsLongitude,
  IsHexColor,
  IsSecureUrl,
  IsNfcTagUid,
  RequiredWith,
} from '../validators/custom.validators';

// ============================================
// Common Base DTOs
// ============================================

/**
 * Base DTO with common timestamp fields
 */
export class TimestampDto {
  @ApiProperty({
    description: 'Creation timestamp',
    example: '2026-01-02T12:00:00.000Z',
  })
  @IsDate()
  @Type(() => Date)
  createdAt!: Date;

  @ApiProperty({
    description: 'Last update timestamp',
    example: '2026-01-02T12:00:00.000Z',
  })
  @IsDate()
  @Type(() => Date)
  updatedAt!: Date;
}

/**
 * Base DTO with ID and timestamps
 */
export class BaseEntityDto extends TimestampDto {
  @ApiProperty({
    description: 'Unique identifier',
    example: '550e8400-e29b-41d4-a716-446655440000',
    format: 'uuid',
  })
  @IsUUID('4')
  id!: string;
}

// ============================================
// Enhanced Festival DTO
// ============================================

export enum FestivalStatus {
  DRAFT = 'DRAFT',
  PUBLISHED = 'PUBLISHED',
  ONGOING = 'ONGOING',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
}

/**
 * Enhanced Festival Creation DTO with comprehensive validations
 */
export class CreateFestivalEnhancedDto {
  @ApiProperty({
    description: 'Festival name',
    example: 'Summer Beats Festival 2026',
    minLength: 3,
    maxLength: 100,
  })
  @IsString()
  @IsNotEmpty({ message: 'Festival name is required' })
  @MinLength(3, { message: 'Festival name must be at least 3 characters' })
  @MaxLength(100, { message: 'Festival name cannot exceed 100 characters' })
  @Transform(({ value }) => value?.trim())
  name!: string;

  @ApiProperty({
    description: 'URL-friendly slug (auto-generated if not provided)',
    example: 'summer-beats-festival-2026',
  })
  @IsSlug()
  @IsOptional()
  slug?: string;

  @ApiProperty({
    description: 'Festival description',
    example: 'The biggest music festival of the summer',
    minLength: 10,
    maxLength: 5000,
  })
  @IsString()
  @MinLength(10, { message: 'Description must be at least 10 characters' })
  @MaxLength(5000, { message: 'Description cannot exceed 5000 characters' })
  description!: string;

  @ApiProperty({
    description: 'Start date of the festival',
    example: '2026-07-15T14:00:00.000Z',
  })
  @IsDate()
  @Type(() => Date)
  @IsFutureDate({ message: 'Start date must be in the future' })
  startDate!: Date;

  @ApiProperty({
    description: 'End date of the festival',
    example: '2026-07-18T02:00:00.000Z',
  })
  @IsDate()
  @Type(() => Date)
  @IsAfterDate('startDate', { message: 'End date must be after start date' })
  endDate!: Date;

  @ApiProperty({
    description: 'Venue/location name',
    example: 'Paris La Defense Arena',
    maxLength: 200,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  location!: string;

  @ApiPropertyOptional({
    description: 'Venue address',
    example: '99 Parvis de la Défense, 92000 Nanterre',
  })
  @IsString()
  @IsOptional()
  @MaxLength(500)
  address?: string;

  @ApiPropertyOptional({
    description: 'Venue latitude coordinate',
    example: 48.8916,
    minimum: -90,
    maximum: 90,
  })
  @IsNumber()
  @IsLatitude()
  @IsOptional()
  @RequiredWith('longitude')
  latitude?: number;

  @ApiPropertyOptional({
    description: 'Venue longitude coordinate',
    example: 2.2363,
    minimum: -180,
    maximum: 180,
  })
  @IsNumber()
  @IsLongitude()
  @IsOptional()
  @RequiredWith('latitude')
  longitude?: number;

  @ApiProperty({
    description: 'Maximum capacity',
    example: 50000,
    minimum: 100,
    maximum: 500000,
  })
  @IsInt()
  @Min(100, { message: 'Capacity must be at least 100' })
  @Max(500000, { message: 'Capacity cannot exceed 500,000' })
  capacity!: number;

  @ApiProperty({
    description: 'Currency for pricing (ISO 4217)',
    example: 'EUR',
  })
  @IsCurrencyCode()
  currency!: string;

  @ApiPropertyOptional({
    description: 'Brand primary color (hex)',
    example: '#FF6B35',
  })
  @IsHexColor()
  @IsOptional()
  brandColor?: string;

  @ApiPropertyOptional({
    description: 'Festival website URL',
    example: 'https://summerbeats.com',
  })
  @IsSecureUrl()
  @IsOptional()
  websiteUrl?: string;

  @ApiPropertyOptional({
    description: 'Support email address',
    example: 'support@summerbeats.com',
  })
  @IsEmail()
  @IsOptional()
  supportEmail?: string;

  @ApiPropertyOptional({
    description: 'Support phone number',
    example: '+33156789012',
  })
  @IsPhoneE164()
  @IsOptional()
  supportPhone?: string;

  @ApiPropertyOptional({
    description: 'Tags/categories',
    example: ['music', 'electronic', 'outdoor'],
    maxItems: 10,
  })
  @IsArray()
  @IsString({ each: true })
  @ArrayMaxSize(10)
  @IsOptional()
  tags?: string[];

  @ApiPropertyOptional({
    description: 'Enable cashless payments',
    default: true,
  })
  @IsBoolean()
  @IsOptional()
  cashlessEnabled?: boolean = true;

  @ApiPropertyOptional({
    description: 'Minimum age required',
    example: 18,
    minimum: 0,
    maximum: 21,
  })
  @IsInt()
  @Min(0)
  @Max(21)
  @IsOptional()
  minimumAge?: number;
}

// ============================================
// Enhanced Ticket DTO
// ============================================

/**
 * Enhanced Ticket Category Creation DTO
 */
export class CreateTicketCategoryEnhancedDto {
  @ApiProperty({
    description: 'Festival ID',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsUUID('4')
  festivalId!: string;

  @ApiProperty({
    description: 'Category name',
    example: 'VIP Pass',
    minLength: 2,
    maxLength: 50,
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(50)
  @Transform(({ value }) => value?.trim())
  name!: string;

  @ApiProperty({
    description: 'Category description',
    example: 'Full access to VIP areas, premium viewing, and exclusive amenities',
    maxLength: 1000,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(1000)
  description!: string;

  @ApiProperty({
    description: 'Ticket price',
    example: 299.99,
    minimum: 0,
    maximum: 10000,
  })
  @IsMonetaryAmount({ min: 0, max: 10000 })
  price!: number;

  @ApiProperty({
    description: 'Available quantity',
    example: 1000,
    minimum: 1,
    maximum: 100000,
  })
  @IsInt()
  @Min(1, { message: 'Quantity must be at least 1' })
  @Max(100000, { message: 'Quantity cannot exceed 100,000' })
  quantity!: number;

  @ApiPropertyOptional({
    description: 'Maximum tickets per user',
    example: 4,
    minimum: 1,
    maximum: 20,
  })
  @IsInt()
  @Min(1)
  @Max(20)
  @IsOptional()
  maxPerUser?: number = 4;

  @ApiPropertyOptional({
    description: 'Sale start date',
    example: '2026-01-15T00:00:00.000Z',
  })
  @IsDate()
  @Type(() => Date)
  @IsOptional()
  saleStartDate?: Date;

  @ApiPropertyOptional({
    description: 'Sale end date',
    example: '2026-07-14T23:59:59.000Z',
  })
  @IsDate()
  @Type(() => Date)
  @IsAfterDate('saleStartDate')
  @IsOptional()
  saleEndDate?: Date;

  @ApiPropertyOptional({
    description: 'Zones this ticket grants access to',
    example: ['main-stage', 'vip-lounge', 'backstage'],
  })
  @IsArray()
  @IsString({ each: true })
  @ArrayMinSize(1)
  @ArrayMaxSize(20)
  @IsOptional()
  accessZones?: string[];

  @ApiPropertyOptional({
    description: 'Category badge color',
    example: '#FFD700',
  })
  @IsHexColor()
  @IsOptional()
  badgeColor?: string;

  @ApiPropertyOptional({
    description: 'Whether ticket is transferable',
    default: true,
  })
  @IsBoolean()
  @IsOptional()
  transferable?: boolean = true;

  @ApiPropertyOptional({
    description: 'Whether ticket is refundable',
    default: false,
  })
  @IsBoolean()
  @IsOptional()
  refundable?: boolean = false;

  @ApiPropertyOptional({
    description: 'Days before event refund is allowed',
    example: 14,
    minimum: 0,
    maximum: 365,
  })
  @IsInt()
  @Min(0)
  @Max(365)
  @IsOptional()
  refundDeadlineDays?: number;
}

// ============================================
// Enhanced Cashless DTO
// ============================================

/**
 * Enhanced Cashless Top-up DTO
 */
export class CashlessTopupEnhancedDto {
  @ApiProperty({
    description: 'Festival ID',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsUUID('4')
  festivalId!: string;

  @ApiProperty({
    description: 'Top-up amount',
    example: 50,
    minimum: 5,
    maximum: 500,
  })
  @IsMonetaryAmount({ min: 5, max: 500 }, { message: 'Top-up must be between 5 and 500' })
  amount!: number;

  @ApiPropertyOptional({
    description: 'Payment method',
    example: 'card',
    enum: ['card', 'cash', 'bank_transfer'],
  })
  @IsEnum(['card', 'cash', 'bank_transfer'])
  @IsOptional()
  paymentMethod?: 'card' | 'cash' | 'bank_transfer' = 'card';
}

/**
 * Enhanced Cashless Payment DTO
 */
export class CashlessPaymentEnhancedDto {
  @ApiProperty({
    description: 'Festival ID',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsUUID('4')
  festivalId!: string;

  @ApiProperty({
    description: 'Vendor ID',
    example: '550e8400-e29b-41d4-a716-446655440001',
  })
  @IsUUID('4')
  vendorId!: string;

  @ApiProperty({
    description: 'Payment amount',
    example: 12.5,
    minimum: 0.01,
    maximum: 1000,
  })
  @IsMonetaryAmount({ min: 0.01, max: 1000 })
  amount!: number;

  @ApiPropertyOptional({
    description: 'Order items for reference',
    type: 'array',
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CashlessOrderItemDto)
  @IsOptional()
  items?: CashlessOrderItemDto[];

  @ApiPropertyOptional({
    description: 'NFC tag UID (for wristband payment)',
    example: '04A1B2C3D4E5F6',
  })
  @IsNfcTagUid()
  @IsOptional()
  nfcTagUid?: string;
}

/**
 * Order item for cashless payment
 */
export class CashlessOrderItemDto {
  @ApiProperty({
    description: 'Product ID',
    example: '550e8400-e29b-41d4-a716-446655440002',
  })
  @IsUUID('4')
  productId!: string;

  @ApiProperty({
    description: 'Quantity',
    example: 2,
    minimum: 1,
    maximum: 99,
  })
  @IsInt()
  @Min(1)
  @Max(99)
  quantity!: number;

  @ApiProperty({
    description: 'Unit price at time of order',
    example: 6.25,
  })
  @IsMonetaryAmount({ min: 0, max: 1000 })
  unitPrice!: number;
}

// ============================================
// Enhanced Zone Access DTO
// ============================================

/**
 * Enhanced Zone Access Check DTO
 */
export class ZoneAccessCheckEnhancedDto {
  @ApiProperty({
    description: 'Zone ID',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsUUID('4')
  zoneId!: string;

  @ApiProperty({
    description: 'Ticket QR code data',
    example: 'FESTIVAL-2026-VIP-A1B2C3D4E5F6',
    minLength: 10,
    maxLength: 200,
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(10)
  @MaxLength(200)
  qrCode!: string;

  @ApiProperty({
    description: 'Access direction',
    example: 'entry',
    enum: ['entry', 'exit'],
  })
  @IsEnum(['entry', 'exit'])
  direction!: 'entry' | 'exit';

  @ApiPropertyOptional({
    description: 'Scanner device ID',
    example: 'SCANNER-GATE-A-001',
  })
  @IsString()
  @MaxLength(50)
  @IsOptional()
  scannerId?: string;

  @ApiPropertyOptional({
    description: 'GPS coordinates of scan location',
  })
  @ValidateNested()
  @Type(() => GpsCoordinatesDto)
  @IsOptional()
  location?: GpsCoordinatesDto;
}

/**
 * GPS Coordinates DTO
 */
export class GpsCoordinatesDto {
  @ApiProperty({
    description: 'Latitude',
    example: 48.8916,
  })
  @IsNumber()
  @IsLatitude()
  latitude!: number;

  @ApiProperty({
    description: 'Longitude',
    example: 2.2363,
  })
  @IsNumber()
  @IsLongitude()
  longitude!: number;

  @ApiPropertyOptional({
    description: 'Accuracy in meters',
    example: 5,
  })
  @IsNumber()
  @Min(0)
  @Max(1000)
  @IsOptional()
  accuracy?: number;
}

// ============================================
// Enhanced Staff DTO
// ============================================

/**
 * Enhanced Staff Member Creation DTO
 */
export class CreateStaffMemberEnhancedDto {
  @ApiProperty({
    description: 'Festival ID',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsUUID('4')
  festivalId!: string;

  @ApiProperty({
    description: 'User ID (existing user)',
    example: '550e8400-e29b-41d4-a716-446655440001',
  })
  @IsUUID('4')
  @IsOptional()
  userId?: string;

  @ApiProperty({
    description: 'Staff email (for new user)',
    example: 'staff@example.com',
  })
  @IsEmail()
  @IsOptional()
  email?: string;

  @ApiProperty({
    description: 'First name',
    example: 'Jean',
    minLength: 2,
    maxLength: 50,
  })
  @IsString()
  @MinLength(2)
  @MaxLength(50)
  firstName!: string;

  @ApiProperty({
    description: 'Last name',
    example: 'Dupont',
    minLength: 2,
    maxLength: 50,
  })
  @IsString()
  @MinLength(2)
  @MaxLength(50)
  lastName!: string;

  @ApiProperty({
    description: 'Phone number',
    example: '+33612345678',
  })
  @IsPhoneE164()
  phone!: string;

  @ApiProperty({
    description: 'Staff role ID',
    example: '550e8400-e29b-41d4-a716-446655440002',
  })
  @IsUUID('4')
  roleId!: string;

  @ApiPropertyOptional({
    description: 'Assigned zones',
    example: ['550e8400-e29b-41d4-a716-446655440003'],
  })
  @IsArray()
  @IsUUID('4', { each: true })
  @ArrayMaxSize(10)
  @IsOptional()
  zoneIds?: string[];

  @ApiPropertyOptional({
    description: 'Emergency contact name',
    example: 'Marie Dupont',
  })
  @IsString()
  @MaxLength(100)
  @IsOptional()
  emergencyContactName?: string;

  @ApiPropertyOptional({
    description: 'Emergency contact phone',
    example: '+33698765432',
  })
  @IsPhoneE164()
  @IsOptional()
  @RequiredWith('emergencyContactName')
  emergencyContactPhone?: string;

  @ApiPropertyOptional({
    description: 'Badge/t-shirt size',
    example: 'M',
    enum: ['XS', 'S', 'M', 'L', 'XL', 'XXL'],
  })
  @IsEnum(['XS', 'S', 'M', 'L', 'XL', 'XXL'])
  @IsOptional()
  tshirtSize?: string;

  @ApiPropertyOptional({
    description: 'Dietary restrictions',
    example: ['vegetarian', 'gluten-free'],
  })
  @IsArray()
  @IsString({ each: true })
  @ArrayMaxSize(5)
  @IsOptional()
  dietaryRestrictions?: string[];

  @ApiPropertyOptional({
    description: 'Internal notes',
    maxLength: 1000,
  })
  @IsString()
  @MaxLength(1000)
  @IsOptional()
  notes?: string;
}
