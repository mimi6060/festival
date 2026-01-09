/**
 * API Key DTOs
 *
 * Data Transfer Objects for API key operations
 *
 * @module ApiKeyDto
 */

import {
  IsString,
  IsOptional,
  IsEnum,
  IsArray,
  IsDate,
  IsUUID,
  MaxLength,
  MinLength,
  IsIP,
  ArrayMaxSize,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { ClientTier } from '../../../common/rate-limit/rate-limit-tiers';
import { ApiKeyStatus, ApiKeyScope } from '../api-key.entity';

// ============================================================================
// Create API Key DTO
// ============================================================================

export class CreateApiKeyDto {
  @ApiProperty({
    description: 'Friendly name for the API key',
    example: 'Production API Key',
    minLength: 1,
    maxLength: 100,
  })
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  name: string;

  @ApiPropertyOptional({
    description: 'Rate limit tier for the API key',
    enum: ClientTier,
    default: ClientTier.FREE,
  })
  @IsOptional()
  @IsEnum(ClientTier)
  tier?: ClientTier;

  @ApiPropertyOptional({
    description: 'Scopes/permissions for the API key',
    enum: ApiKeyScope,
    isArray: true,
    example: [ApiKeyScope.READ, ApiKeyScope.WRITE],
  })
  @IsOptional()
  @IsArray()
  @IsEnum(ApiKeyScope, { each: true })
  scopes?: ApiKeyScope[];

  @ApiPropertyOptional({
    description: 'Description of what this API key is used for',
    example: 'Used for production mobile app',
    maxLength: 500,
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @ApiPropertyOptional({
    description: 'List of allowed IP addresses (empty = all IPs allowed)',
    example: ['192.168.1.1', '10.0.0.0'],
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(50)
  @IsIP(undefined, { each: true })
  ipWhitelist?: string[];

  @ApiPropertyOptional({
    description: 'Expiration date for the API key (null = never expires)',
    example: '2025-12-31T23:59:59Z',
    type: Date,
  })
  @IsOptional()
  @IsDate()
  @Type(() => Date)
  expiresAt?: Date;

  @ApiPropertyOptional({
    description: 'Festival ID to scope this key to (null = all festivals)',
    example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  })
  @IsOptional()
  @IsUUID()
  festivalId?: string;
}

// ============================================================================
// Update API Key DTO
// ============================================================================

export class UpdateApiKeyDto extends PartialType(CreateApiKeyDto) {
  @ApiPropertyOptional({
    description: 'Status of the API key',
    enum: ApiKeyStatus,
  })
  @IsOptional()
  @IsEnum(ApiKeyStatus)
  status?: ApiKeyStatus;
}

// ============================================================================
// Response DTOs
// ============================================================================

export class ApiKeyResponseDto {
  @ApiProperty({ description: 'Unique identifier' })
  id: string;

  @ApiProperty({ description: 'User ID who owns this key' })
  userId: string;

  @ApiProperty({ description: 'Friendly name for the API key' })
  name: string;

  @ApiProperty({ description: 'Masked API key (only prefix visible)' })
  key: string;

  @ApiProperty({ description: 'Key prefix for identification' })
  keyPrefix: string;

  @ApiProperty({ description: 'Rate limit tier', enum: ClientTier })
  tier: ClientTier;

  @ApiProperty({ description: 'API key status', enum: ApiKeyStatus })
  status: ApiKeyStatus;

  @ApiProperty({ description: 'Granted scopes', enum: ApiKeyScope, isArray: true })
  scopes: ApiKeyScope[];

  @ApiPropertyOptional({ description: 'Description' })
  description?: string;

  @ApiProperty({ description: 'Allowed IP addresses', type: [String] })
  ipWhitelist: string[];

  @ApiPropertyOptional({ description: 'Last used timestamp' })
  lastUsedAt?: Date;

  @ApiPropertyOptional({ description: 'Last used IP address' })
  lastUsedIp?: string;

  @ApiProperty({ description: 'Total usage count' })
  usageCount: number;

  @ApiPropertyOptional({ description: 'Expiration date' })
  expiresAt?: Date;

  @ApiPropertyOptional({ description: 'Scoped festival ID' })
  festivalId?: string;

  @ApiProperty({ description: 'Creation timestamp' })
  createdAt: Date;

  @ApiProperty({ description: 'Last update timestamp' })
  updatedAt: Date;
}

export class CreateApiKeyResponseDto {
  @ApiProperty({
    description: 'The API key details',
    type: ApiKeyResponseDto,
  })
  apiKey: ApiKeyResponseDto;

  @ApiProperty({
    description: 'The plaintext API key (only shown once!)',
    example: 'fst_1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
  })
  plaintextKey: string;
}

export class ApiKeyStatsResponseDto {
  @ApiProperty({ description: 'Total number of API keys' })
  total: number;

  @ApiProperty({ description: 'Number of active API keys' })
  active: number;

  @ApiProperty({ description: 'Number of expired API keys' })
  expired: number;

  @ApiProperty({ description: 'Number of revoked API keys' })
  revoked: number;

  @ApiProperty({
    description: 'Breakdown by tier',
    example: { FREE: 2, STARTER: 1, PRO: 0, ENTERPRISE: 0 },
  })
  tierBreakdown: Record<ClientTier, number>;
}

// ============================================================================
// Query DTOs
// ============================================================================

export class ApiKeyQueryDto {
  @ApiPropertyOptional({
    description: 'Filter by status',
    enum: ApiKeyStatus,
  })
  @IsOptional()
  @IsEnum(ApiKeyStatus)
  status?: ApiKeyStatus;

  @ApiPropertyOptional({
    description: 'Filter by tier',
    enum: ClientTier,
  })
  @IsOptional()
  @IsEnum(ClientTier)
  tier?: ClientTier;

  @ApiPropertyOptional({
    description: 'Filter by festival ID',
  })
  @IsOptional()
  @IsUUID()
  festivalId?: string;
}
