import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEnum,
  IsBoolean,
  IsUrl,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { VendorType } from '@prisma/client';

export class CreateVendorDto {
  @ApiProperty({
    description: 'Vendor name',
    example: 'Le Food Truck Gourmet',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  name: string;

  @ApiProperty({
    description: 'Type of vendor',
    enum: VendorType,
    example: VendorType.FOOD,
  })
  @IsEnum(VendorType)
  type: VendorType;

  @ApiPropertyOptional({
    description: 'Vendor description',
    example: 'Delicious gourmet burgers and fries',
  })
  @IsString()
  @IsOptional()
  @MaxLength(1000)
  description?: string;

  @ApiPropertyOptional({
    description: 'URL of the vendor logo',
    example: 'https://example.com/logo.png',
  })
  @IsUrl()
  @IsOptional()
  logoUrl?: string;

  @ApiPropertyOptional({
    description: 'Location of the vendor within the festival',
    example: 'Zone A, near main stage',
  })
  @IsString()
  @IsOptional()
  @MaxLength(200)
  location?: string;

  @ApiPropertyOptional({
    description: 'Whether the vendor is currently open',
    default: true,
  })
  @IsBoolean()
  @IsOptional()
  isOpen?: boolean = true;
}
