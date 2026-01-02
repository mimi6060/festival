import { ApiPropertyOptional } from '@nestjs/swagger';
import { UserRole, UserStatus } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  IsEmail,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min,
} from 'class-validator';

/**
 * Sorting options for user list.
 */
export enum UserSortBy {
  CREATED_AT = 'createdAt',
  UPDATED_AT = 'updatedAt',
  EMAIL = 'email',
  FIRST_NAME = 'firstName',
  LAST_NAME = 'lastName',
  LAST_LOGIN = 'lastLoginAt',
  ROLE = 'role',
  STATUS = 'status',
}

/**
 * Sort order.
 */
export enum SortOrder {
  ASC = 'asc',
  DESC = 'desc',
}

/**
 * DTO for querying users list with filters, pagination and sorting.
 * Admin only endpoint.
 */
export class UserQueryDto {
  @ApiPropertyOptional({
    description: 'Page number (1-based)',
    minimum: 1,
    default: 1,
    example: 1,
  })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  page?: number = 1;

  @ApiPropertyOptional({
    description: 'Number of items per page',
    minimum: 1,
    maximum: 100,
    default: 10,
    example: 10,
  })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  @IsOptional()
  limit?: number = 10;

  @ApiPropertyOptional({
    description: 'Filter by user role',
    enum: UserRole,
    example: UserRole.USER,
  })
  @IsEnum(UserRole, { message: 'role must be a valid UserRole' })
  @IsOptional()
  role?: UserRole;

  @ApiPropertyOptional({
    description: 'Filter by user status',
    enum: UserStatus,
    example: UserStatus.ACTIVE,
  })
  @IsEnum(UserStatus, { message: 'status must be a valid UserStatus' })
  @IsOptional()
  status?: UserStatus;

  @ApiPropertyOptional({
    description: 'Filter by email (partial match, case insensitive)',
    example: 'user@example.com',
  })
  @IsEmail({}, { message: 'email must be a valid email address' })
  @IsOptional()
  email?: string;

  @ApiPropertyOptional({
    description: 'Search query for name or email (partial match, case insensitive)',
    example: 'Jean',
  })
  @IsString()
  @IsOptional()
  search?: string;

  @ApiPropertyOptional({
    description: 'Filter by festival ID (users who have tickets for this festival)',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsUUID('4', { message: 'festivalId must be a valid UUID' })
  @IsOptional()
  festivalId?: string;

  @ApiPropertyOptional({
    description: 'Sort by field',
    enum: UserSortBy,
    default: UserSortBy.CREATED_AT,
    example: UserSortBy.CREATED_AT,
  })
  @IsEnum(UserSortBy, { message: 'sortBy must be a valid field' })
  @IsOptional()
  sortBy?: UserSortBy = UserSortBy.CREATED_AT;

  @ApiPropertyOptional({
    description: 'Sort order',
    enum: SortOrder,
    default: SortOrder.DESC,
    example: SortOrder.DESC,
  })
  @IsEnum(SortOrder, { message: 'sortOrder must be asc or desc' })
  @IsOptional()
  sortOrder?: SortOrder = SortOrder.DESC;

  /**
   * Calculate the number of records to skip for pagination.
   */
  get skip(): number {
    return ((this.page || 1) - 1) * (this.limit || 10);
  }

  /**
   * Get the number of records to take.
   */
  get take(): number {
    return this.limit || 10;
  }
}

/**
 * DTO for searching users by email or name (autocomplete).
 */
export class UserSearchDto {
  @ApiPropertyOptional({
    description: 'Search query (email or name, minimum 2 characters)',
    example: 'jean.dupont@example.com',
    minLength: 2,
  })
  @IsString()
  @IsOptional()
  q?: string;

  @ApiPropertyOptional({
    description: 'Maximum number of results',
    minimum: 1,
    maximum: 50,
    default: 10,
    example: 10,
  })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  @IsOptional()
  limit?: number = 10;
}
