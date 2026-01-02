import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEnum,
  IsNumber,
  IsPositive,
  IsInt,
  Min,
  Max,
  IsDateString,
  IsBoolean,
} from 'class-validator';
import { Type } from 'class-transformer';
import { TicketType } from '@prisma/client';

/**
 * DTO for creating a new ticket category
 *
 * @example
 * {
 *   "name": "Pass 3 Jours",
 *   "description": "Acces complet aux 3 jours du festival",
 *   "type": "FULL_PASS",
 *   "price": 89.99,
 *   "quota": 25000,
 *   "maxPerUser": 4,
 *   "saleStartDate": "2025-01-01T00:00:00.000Z",
 *   "saleEndDate": "2025-08-21T23:59:00.000Z"
 * }
 */
export class CreateCategoryDto {
  @ApiProperty({
    description: 'Category display name',
    example: 'Pass 3 Jours',
    minLength: 1,
    maxLength: 100,
  })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional({
    description: 'Detailed description of what the ticket includes',
    example: 'Acces complet aux 3 jours du festival, camping inclus',
    maxLength: 1000,
  })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({
    description: 'Type of ticket',
    enum: TicketType,
    example: 'FULL_PASS',
    enumName: 'TicketType',
  })
  @IsEnum(TicketType)
  type: TicketType;

  @ApiProperty({
    description: 'Ticket price in the festival currency (EUR by default)',
    example: 89.99,
    minimum: 0,
    type: Number,
  })
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  @Type(() => Number)
  price: number;

  @ApiProperty({
    description: 'Total number of tickets available in this category',
    example: 25000,
    minimum: 1,
    type: Number,
  })
  @IsInt()
  @IsPositive()
  quota: number;

  @ApiPropertyOptional({
    description: 'Maximum tickets per user for this category',
    example: 4,
    minimum: 1,
    maximum: 10,
    default: 4,
  })
  @IsInt()
  @Min(1)
  @Max(10)
  @IsOptional()
  maxPerUser?: number = 4;

  @ApiProperty({
    description: 'Date when ticket sales begin (ISO 8601)',
    example: '2025-01-01T00:00:00.000Z',
    format: 'date-time',
  })
  @IsDateString()
  saleStartDate: string;

  @ApiProperty({
    description: 'Date when ticket sales end (ISO 8601)',
    example: '2025-08-21T23:59:00.000Z',
    format: 'date-time',
  })
  @IsDateString()
  saleEndDate: string;

  @ApiPropertyOptional({
    description: 'Whether the category is active and visible for purchase',
    example: true,
    default: true,
  })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean = true;
}
