import {
  IsString,
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

export class UpdateCategoryDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsEnum(TicketType)
  @IsOptional()
  type?: TicketType;

  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  @Type(() => Number)
  @IsOptional()
  price?: number;

  @IsInt()
  @IsPositive()
  @IsOptional()
  quota?: number;

  @IsInt()
  @Min(1)
  @Max(10)
  @IsOptional()
  maxPerUser?: number;

  @IsDateString()
  @IsOptional()
  saleStartDate?: string;

  @IsDateString()
  @IsOptional()
  saleEndDate?: string;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
