import {
  IsString,
  IsOptional,
  IsUUID,
  IsEnum,
  MinLength,
  MaxLength,
  IsInt,
  Min,
  Max,
  IsUrl,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { Type } from 'class-transformer';

// Enum matching Prisma schema
export enum LostItemStatus {
  REPORTED = 'REPORTED',
  FOUND = 'FOUND',
  RETURNED = 'RETURNED',
  UNCLAIMED = 'UNCLAIMED',
}

// ===== Lost Item DTOs =====

export class CreateLostItemDto {
  @ApiProperty({ description: 'Festival ID' })
  @IsUUID()
  festivalId!: string;

  @ApiProperty({
    description: 'Item description',
    example: 'Portefeuille noir en cuir avec initiales J.D.',
  })
  @IsString()
  @MinLength(10)
  @MaxLength(2000)
  description!: string;

  @ApiPropertyOptional({
    description: 'Location where item was lost/found',
    example: 'Pres de la scene principale, cote gauche',
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  location?: string;

  @ApiPropertyOptional({
    description: 'Contact information',
    example: 'email@example.com ou 06 12 34 56 78',
  })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  contactInfo?: string;

  @ApiPropertyOptional({ description: 'Image URL of the item' })
  @IsOptional()
  @IsUrl()
  imageUrl?: string;
}

export class UpdateLostItemDto extends PartialType(CreateLostItemDto) {
  @ApiPropertyOptional({
    description: 'Item status',
    enum: LostItemStatus,
  })
  @IsOptional()
  @IsEnum(LostItemStatus)
  status?: LostItemStatus;

  @ApiPropertyOptional({ description: 'ID of staff who found the item' })
  @IsOptional()
  @IsUUID()
  foundBy?: string;
}

export class ClaimLostItemDto {
  @ApiProperty({
    description: 'Proof of ownership or identification',
    example: 'Le portefeuille contient une carte avec mon nom...',
  })
  @IsString()
  @MinLength(20)
  @MaxLength(1000)
  proofOfOwnership!: string;

  @ApiPropertyOptional({
    description: 'Contact information for pickup',
    example: 'Disponible pour recuperation au stand info',
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  contactInfo?: string;
}

export class MarkAsFoundDto {
  @ApiProperty({
    description: 'Location where item was found',
    example: 'Trouve au stand restauration zone B',
  })
  @IsString()
  @MaxLength(500)
  foundLocation!: string;

  @ApiPropertyOptional({ description: 'Additional notes' })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;
}

export class LostItemResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  festivalId!: string;

  @ApiProperty()
  reportedBy!: string;

  @ApiProperty()
  description!: string;

  @ApiPropertyOptional()
  location?: string;

  @ApiProperty({ enum: LostItemStatus })
  status!: LostItemStatus;

  @ApiPropertyOptional()
  foundBy?: string;

  @ApiPropertyOptional()
  contactInfo?: string;

  @ApiPropertyOptional()
  imageUrl?: string;

  @ApiPropertyOptional()
  claimedAt?: Date;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;

  @ApiPropertyOptional({ description: 'Reporter details' })
  reporter?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };

  @ApiPropertyOptional({ description: 'Finder details (staff)' })
  finder?: {
    id: string;
    firstName: string;
    lastName: string;
  };
}

// ===== Query DTOs =====

export class LostItemQueryDto {
  @ApiPropertyOptional({ description: 'Filter by festival ID' })
  @IsOptional()
  @IsUUID()
  festivalId?: string;

  @ApiPropertyOptional({
    description: 'Filter by status',
    enum: LostItemStatus,
  })
  @IsOptional()
  @IsEnum(LostItemStatus)
  status?: LostItemStatus;

  @ApiPropertyOptional({ description: 'Search in description' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ description: 'Show my reported items only' })
  @IsOptional()
  @Type(() => Boolean)
  myItemsOnly?: boolean;

  @ApiPropertyOptional({ description: 'Page number', default: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  page?: number;

  @ApiPropertyOptional({ description: 'Items per page', default: 20 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  @Type(() => Number)
  limit?: number;

  @ApiPropertyOptional({
    description: 'Sort order',
    enum: ['asc', 'desc'],
    default: 'desc',
  })
  @IsOptional()
  @IsString()
  sortOrder?: 'asc' | 'desc';
}

// ===== Statistics DTOs =====

export class LostItemStatisticsDto {
  @ApiProperty()
  totalReported!: number;

  @ApiProperty()
  totalFound!: number;

  @ApiProperty()
  totalReturned!: number;

  @ApiProperty()
  totalUnclaimed!: number;

  @ApiProperty()
  returnRate!: number; // percentage

  @ApiProperty({ type: Object })
  byFestival!: Array<{
    festivalId: string;
    festivalName: string;
    reported: number;
    found: number;
    returned: number;
  }>;
}
