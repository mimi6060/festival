import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEnum,
  IsUUID,
} from 'class-validator';
import { LostItemStatus } from '@prisma/client';

// ============= Lost Item DTOs =============

export class CreateLostItemDto {
  @IsUUID()
  @IsNotEmpty()
  festivalId: string;

  @IsString()
  @IsNotEmpty()
  description: string;

  @IsString()
  @IsOptional()
  location?: string;

  @IsString()
  @IsOptional()
  contactInfo?: string;

  @IsString()
  @IsOptional()
  imageUrl?: string;
}

export class UpdateLostItemDto {
  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  location?: string;

  @IsEnum(LostItemStatus)
  @IsOptional()
  status?: LostItemStatus;

  @IsString()
  @IsOptional()
  foundBy?: string;

  @IsString()
  @IsOptional()
  contactInfo?: string;

  @IsString()
  @IsOptional()
  imageUrl?: string;
}

export class LostItemQueryDto {
  @IsUUID()
  @IsOptional()
  festivalId?: string;

  @IsEnum(LostItemStatus)
  @IsOptional()
  status?: LostItemStatus;

  @IsString()
  @IsOptional()
  page?: string;

  @IsString()
  @IsOptional()
  limit?: string;
}

export class ClaimLostItemDto {
  @IsString()
  @IsNotEmpty()
  claimantName: string;

  @IsString()
  @IsNotEmpty()
  claimantContact: string;

  @IsString()
  @IsOptional()
  description?: string;
}
