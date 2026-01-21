import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsEnum,
  IsBoolean,
  IsInt,
  IsUrl,
  IsEmail,
  IsDateString,
  Min,
} from 'class-validator';
import { SponsorTier } from '@prisma/client';

export class CreateSponsorDto {
  @ApiProperty({ description: 'Sponsor name' })
  @IsString()
  name: string;

  @ApiPropertyOptional({ description: 'Sponsor description' })
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

  @ApiPropertyOptional({ enum: SponsorTier, description: 'Sponsor tier level' })
  @IsOptional()
  @IsEnum(SponsorTier)
  tier?: SponsorTier;

  @ApiPropertyOptional({ description: 'Display order (lower = first)' })
  @IsOptional()
  @IsInt()
  @Min(0)
  displayOrder?: number;

  @ApiPropertyOptional({ description: 'Is sponsor active' })
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

  @ApiPropertyOptional({ description: 'Sponsorship start date' })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({ description: 'Sponsorship end date' })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional({ description: 'Internal notes' })
  @IsOptional()
  @IsString()
  notes?: string;
}

export class UpdateSponsorDto extends PartialType(CreateSponsorDto) {}

export class SponsorResponseDto {
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

  @ApiProperty({ enum: SponsorTier })
  tier: SponsorTier;

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
  startDate?: Date;

  @ApiPropertyOptional()
  endDate?: Date;

  @ApiPropertyOptional()
  notes?: string;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}
