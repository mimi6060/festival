import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsEnum,
  IsBoolean,
  IsInt,
  IsUrl,
  IsEmail,
  Min,
} from 'class-validator';
import { PartnerType } from '@prisma/client';

export class CreatePartnerDto {
  @ApiProperty({ description: 'Partner name' })
  @IsString()
  name: string;

  @ApiPropertyOptional({ description: 'Partner description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'Logo URL' })
  @IsOptional()
  @IsUrl()
  logoUrl?: string;

  @ApiPropertyOptional({ description: 'Website URL' })
  @IsOptional()
  @IsUrl()
  websiteUrl?: string;

  @ApiPropertyOptional({ enum: PartnerType, description: 'Partner type' })
  @IsOptional()
  @IsEnum(PartnerType)
  type?: PartnerType;

  @ApiPropertyOptional({ description: 'Display order (lower = first)' })
  @IsOptional()
  @IsInt()
  @Min(0)
  displayOrder?: number;

  @ApiPropertyOptional({ description: 'Is partner active' })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ description: 'Contact person name' })
  @IsOptional()
  @IsString()
  contactName?: string;

  @ApiPropertyOptional({ description: 'Contact email' })
  @IsOptional()
  @IsEmail()
  contactEmail?: string;

  @ApiPropertyOptional({ description: 'Contact phone' })
  @IsOptional()
  @IsString()
  contactPhone?: string;

  @ApiPropertyOptional({ description: 'Services provided by the partner' })
  @IsOptional()
  @IsString()
  servicesProvided?: string;

  @ApiPropertyOptional({ description: 'Internal notes' })
  @IsOptional()
  @IsString()
  notes?: string;
}

export class UpdatePartnerDto extends PartialType(CreatePartnerDto) {}

export class PartnerResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  festivalId: string;

  @ApiProperty()
  name: string;

  @ApiPropertyOptional()
  description?: string;

  @ApiPropertyOptional()
  logoUrl?: string;

  @ApiPropertyOptional()
  websiteUrl?: string;

  @ApiProperty({ enum: PartnerType })
  type: PartnerType;

  @ApiProperty()
  displayOrder: number;

  @ApiProperty()
  isActive: boolean;

  @ApiPropertyOptional()
  contactName?: string;

  @ApiPropertyOptional()
  contactEmail?: string;

  @ApiPropertyOptional()
  contactPhone?: string;

  @ApiPropertyOptional()
  servicesProvided?: string;

  @ApiPropertyOptional()
  notes?: string;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}
