import {
  IsString,
  IsEnum,
  IsOptional,
  IsNumber,
  IsBoolean,
  IsUUID,
  Min,
  Max,
  IsObject,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export enum VendorType {
  FOOD = 'FOOD',
  DRINK = 'DRINK',
  BAR = 'BAR',
  MERCHANDISE = 'MERCHANDISE',
}

export class CreateVendorDto {
  @ApiProperty({ description: 'Festival ID this vendor belongs to' })
  @IsUUID()
  festivalId!: string;

  @ApiProperty({ description: 'Vendor name' })
  @IsString()
  name!: string;

  @ApiProperty({ enum: VendorType, description: 'Type of vendor' })
  @IsEnum(VendorType)
  type!: VendorType;

  @ApiPropertyOptional({ description: 'Vendor description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'Logo URL' })
  @IsOptional()
  @IsString()
  logoUrl?: string;

  @ApiPropertyOptional({ description: 'Physical location description' })
  @IsOptional()
  @IsString()
  location?: string;

  @ApiPropertyOptional({ description: 'Latitude coordinate' })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  latitude?: number;

  @ApiPropertyOptional({ description: 'Longitude coordinate' })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  longitude?: number;

  @ApiPropertyOptional({
    description: 'Platform commission rate (percentage)',
    minimum: 0,
    maximum: 100,
    default: 10,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  @Type(() => Number)
  commissionRate?: number;

  @ApiPropertyOptional({ description: 'Opening hours configuration' })
  @IsOptional()
  @IsObject()
  openingHours?: Record<string, { open: string; close: string }>;

  @ApiPropertyOptional({ description: 'Is vendor currently open', default: true })
  @IsOptional()
  @IsBoolean()
  isOpen?: boolean;
}
