import {
  ApiProperty,
  ApiPropertyOptional,
} from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsDateString,
  IsEnum,
  IsNumber,
  IsBoolean,
  MinLength,
  MaxLength,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';
import { TicketType } from '@prisma/client';

/**
 * DTO for creating a new ticket category
 */
export class CreateTicketCategoryDto {
  @ApiProperty({
    description: 'Category name',
    example: 'VIP Pass',
    minLength: 2,
    maxLength: 100,
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(100)
  name!: string;

  @ApiPropertyOptional({
    description: 'Category description',
    example: 'Access to VIP areas, exclusive lounge, and premium services',
    maxLength: 1000,
  })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;

  @ApiProperty({
    description: 'Ticket type',
    enum: TicketType,
    example: TicketType.VIP,
  })
  @IsEnum(TicketType)
  type!: TicketType;

  @ApiProperty({
    description: 'Price in the festival currency (e.g., euros)',
    example: 149.99,
    minimum: 0,
  })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Type(() => Number)
  price!: number;

  @ApiProperty({
    description: 'Total number of tickets available for this category',
    example: 500,
    minimum: 1,
    maximum: 1000000,
  })
  @IsNumber()
  @Min(1)
  @Max(1000000)
  @Type(() => Number)
  quota!: number;

  @ApiPropertyOptional({
    description: 'Maximum tickets a single user can purchase for this category',
    example: 4,
    minimum: 1,
    maximum: 100,
    default: 4,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(100)
  @Type(() => Number)
  maxPerUser?: number;

  @ApiProperty({
    description: 'Date and time when ticket sales start (ISO 8601)',
    example: '2025-03-01T10:00:00.000Z',
    format: 'date-time',
  })
  @IsDateString()
  saleStartDate!: string;

  @ApiProperty({
    description: 'Date and time when ticket sales end (ISO 8601)',
    example: '2025-07-14T23:59:59.000Z',
    format: 'date-time',
  })
  @IsDateString()
  saleEndDate!: string;

  @ApiPropertyOptional({
    description: 'Whether this category is active and visible',
    example: true,
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
