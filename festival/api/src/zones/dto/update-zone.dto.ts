import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsInt,
  IsPositive,
  IsBoolean,
  IsArray,
  IsEnum,
  MaxLength,
  MinLength,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { TicketType } from '@prisma/client';

/**
 * DTO for updating a zone
 */
export class UpdateZoneDto {
  @ApiPropertyOptional({
    description: 'Zone name',
    example: 'VIP Lounge',
    minLength: 2,
    maxLength: 100,
  })
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  @Transform(({ value }) => value?.trim())
  name?: string;

  @ApiPropertyOptional({
    description: 'Zone description',
    example: 'Exclusive area for VIP ticket holders with premium amenities',
    maxLength: 1000,
  })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  @Transform(({ value }) => value?.trim())
  description?: string;

  @ApiPropertyOptional({
    description: 'Maximum capacity of the zone',
    example: 500,
    minimum: 1,
  })
  @IsOptional()
  @IsInt()
  @IsPositive()
  @Type(() => Number)
  capacity?: number;

  @ApiPropertyOptional({
    description: 'List of ticket types that grant access to this zone',
    example: ['VIP', 'BACKSTAGE'],
    isArray: true,
    enum: TicketType,
  })
  @IsOptional()
  @IsArray()
  @IsEnum(TicketType, { each: true })
  requiresTicketType?: TicketType[];

  @ApiPropertyOptional({
    description: 'Whether the zone is active',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  isActive?: boolean;
}
