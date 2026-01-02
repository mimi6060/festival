import {
  IsOptional,
  IsEnum,
  IsBoolean,
  IsString,
  IsInt,
  Min,
  Max,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { VendorType } from '@prisma/client';

export class VendorQueryDto {
  @ApiPropertyOptional({
    description: 'Page number',
    default: 1,
    minimum: 1,
  })
  @IsInt()
  @Min(1)
  @IsOptional()
  @Type(() => Number)
  page?: number = 1;

  @ApiPropertyOptional({
    description: 'Items per page',
    default: 10,
    minimum: 1,
    maximum: 100,
  })
  @IsInt()
  @Min(1)
  @Max(100)
  @IsOptional()
  @Type(() => Number)
  limit?: number = 10;

  @ApiPropertyOptional({
    description: 'Filter by vendor type',
    enum: VendorType,
  })
  @IsEnum(VendorType)
  @IsOptional()
  type?: VendorType;

  @ApiPropertyOptional({
    description: 'Filter by open status',
  })
  @IsBoolean()
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  isOpen?: boolean;

  @ApiPropertyOptional({
    description: 'Search by name',
  })
  @IsString()
  @IsOptional()
  search?: string;
}
