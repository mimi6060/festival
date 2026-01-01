import {
  IsString,
  IsNotEmpty,
  IsEnum,
  IsNumber,
  IsPositive,
  IsInt,
  IsArray,
  IsOptional,
  IsBoolean,
  Min,
} from 'class-validator';
import { AccommodationType } from '@prisma/client';

export class CreateCampingSpotDto {
  @IsString()
  @IsNotEmpty()
  festivalId: string;

  @IsEnum(AccommodationType)
  type: AccommodationType;

  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsNumber()
  @IsPositive()
  price: number;

  @IsInt()
  @IsPositive()
  @Min(1)
  capacity: number;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  amenities?: string[];

  @IsBoolean()
  @IsOptional()
  isAvailable?: boolean;
}
