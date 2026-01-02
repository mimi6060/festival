import {
  IsString,
  IsOptional,
  IsUUID,
  IsEnum,
  IsBoolean,
  IsArray,
  MinLength,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * Consent types for GDPR compliance
 */
export enum ConsentType {
  MARKETING = 'MARKETING',
  ANALYTICS = 'ANALYTICS',
  PERSONALIZATION = 'PERSONALIZATION',
  THIRD_PARTY_SHARING = 'THIRD_PARTY_SHARING',
  ESSENTIAL = 'ESSENTIAL',
}

/**
 * Data export formats
 */
export enum ExportFormat {
  JSON = 'JSON',
  CSV = 'CSV',
  PDF = 'PDF',
}

/**
 * Request status for GDPR requests
 */
export enum GdprRequestStatus {
  PENDING = 'PENDING',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  REJECTED = 'REJECTED',
}

/**
 * Request types for GDPR
 */
export enum GdprRequestType {
  DATA_ACCESS = 'DATA_ACCESS',
  DATA_DELETION = 'DATA_DELETION',
  DATA_RECTIFICATION = 'DATA_RECTIFICATION',
  DATA_PORTABILITY = 'DATA_PORTABILITY',
  CONSENT_WITHDRAWAL = 'CONSENT_WITHDRAWAL',
}

// ===== Consent DTOs =====

export class UpdateConsentDto {
  @ApiProperty({
    description: 'Consent type',
    enum: ConsentType,
  })
  @IsEnum(ConsentType)
  type!: ConsentType;

  @ApiProperty({
    description: 'Whether consent is granted',
  })
  @IsBoolean()
  granted!: boolean;
}

export class BulkUpdateConsentsDto {
  @ApiProperty({
    description: 'Array of consent updates',
    type: [UpdateConsentDto],
  })
  @IsArray()
  consents!: UpdateConsentDto[];
}

export class ConsentResponseDto {
  @ApiProperty()
  type!: ConsentType;

  @ApiProperty()
  granted!: boolean;

  @ApiProperty()
  grantedAt!: Date | null;

  @ApiProperty()
  revokedAt!: Date | null;

  @ApiProperty()
  ipAddress!: string | null;

  @ApiProperty()
  userAgent!: string | null;
}

// ===== Data Request DTOs =====

export class CreateDataRequestDto {
  @ApiProperty({
    description: 'Type of GDPR request',
    enum: GdprRequestType,
  })
  @IsEnum(GdprRequestType)
  type!: GdprRequestType;

  @ApiPropertyOptional({
    description: 'Additional details for the request',
    example: 'Please include all payment history',
  })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  details?: string;

  @ApiPropertyOptional({
    description: 'Preferred export format for data access requests',
    enum: ExportFormat,
  })
  @IsOptional()
  @IsEnum(ExportFormat)
  format?: ExportFormat;
}

export class DataRequestResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  userId!: string;

  @ApiProperty({ enum: GdprRequestType })
  type!: GdprRequestType;

  @ApiProperty({ enum: GdprRequestStatus })
  status!: GdprRequestStatus;

  @ApiPropertyOptional()
  details?: string;

  @ApiPropertyOptional({ enum: ExportFormat })
  format?: ExportFormat;

  @ApiPropertyOptional()
  downloadUrl?: string;

  @ApiPropertyOptional()
  expiresAt?: Date;

  @ApiPropertyOptional()
  processedAt?: Date;

  @ApiPropertyOptional()
  processedBy?: string;

  @ApiPropertyOptional()
  rejectionReason?: string;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;
}

// ===== Admin DTOs =====

export class ProcessDataRequestDto {
  @ApiProperty({
    description: 'Action to take on the request',
    enum: ['APPROVE', 'REJECT'],
  })
  @IsString()
  action!: 'APPROVE' | 'REJECT';

  @ApiPropertyOptional({
    description: 'Reason for rejection (required if rejecting)',
  })
  @IsOptional()
  @IsString()
  @MinLength(10)
  @MaxLength(500)
  rejectionReason?: string;
}

export class GdprQueryDto {
  @ApiPropertyOptional({ description: 'Filter by status', enum: GdprRequestStatus })
  @IsOptional()
  @IsEnum(GdprRequestStatus)
  status?: GdprRequestStatus;

  @ApiPropertyOptional({ description: 'Filter by type', enum: GdprRequestType })
  @IsOptional()
  @IsEnum(GdprRequestType)
  type?: GdprRequestType;

  @ApiPropertyOptional({ description: 'Filter by user ID' })
  @IsOptional()
  @IsUUID()
  userId?: string;

  @ApiPropertyOptional({ description: 'Page number', default: 1 })
  @IsOptional()
  page?: number;

  @ApiPropertyOptional({ description: 'Items per page', default: 20 })
  @IsOptional()
  limit?: number;
}

// ===== Data Rectification DTOs =====

export class DataRectificationDto {
  @ApiProperty({
    description: 'Field to correct',
    example: 'firstName',
  })
  @IsString()
  field!: string;

  @ApiProperty({
    description: 'Current incorrect value',
    example: 'John',
  })
  @IsString()
  currentValue!: string;

  @ApiProperty({
    description: 'Correct value',
    example: 'Jean',
  })
  @IsString()
  correctValue!: string;

  @ApiPropertyOptional({
    description: 'Supporting documentation or reason',
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}

export class CreateRectificationRequestDto {
  @ApiProperty({
    description: 'Fields to correct',
    type: [DataRectificationDto],
  })
  @IsArray()
  corrections!: DataRectificationDto[];
}
