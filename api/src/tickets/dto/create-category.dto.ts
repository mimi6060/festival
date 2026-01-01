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

export class CreateCategoryDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsEnum(TicketType)
  type: TicketType;

  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  @Type(() => Number)
  price: number;

  @IsInt()
  @IsPositive()
  quota: number;

  @IsInt()
  @Min(1)
  @Max(10)
  @IsOptional()
  maxPerUser?: number = 4;

  @IsDateString()
  saleStartDate: string;

  @IsDateString()
  saleEndDate: string;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean = true;
}
