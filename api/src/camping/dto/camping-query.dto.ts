import {
  IsString,
  IsOptional,
  IsEnum,
  IsDateString,
  IsInt,
  IsPositive,
  IsBoolean,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { AccommodationType, BookingStatus } from '@prisma/client';

export class CampingSpotQueryDto {
  @IsEnum(AccommodationType)
  @IsOptional()
  type?: AccommodationType;

  @IsDateString()
  @IsOptional()
  checkIn?: string;

  @IsDateString()
  @IsOptional()
  checkOut?: string;

  @IsInt()
  @IsPositive()
  @IsOptional()
  @Type(() => Number)
  minCapacity?: number;

  @Transform(({ value }) => value === 'true')
  @IsBoolean()
  @IsOptional()
  onlyAvailable?: boolean;

  @IsInt()
  @IsOptional()
  @Type(() => Number)
  page?: number;

  @IsInt()
  @IsOptional()
  @Type(() => Number)
  limit?: number;
}

export class BookingQueryDto {
  @IsEnum(BookingStatus)
  @IsOptional()
  status?: BookingStatus;

  @IsString()
  @IsOptional()
  spotId?: string;

  @IsInt()
  @IsOptional()
  @Type(() => Number)
  page?: number;

  @IsInt()
  @IsOptional()
  @Type(() => Number)
  limit?: number;
}
