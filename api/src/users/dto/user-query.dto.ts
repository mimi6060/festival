import { ApiPropertyOptional } from '@nestjs/swagger';
import { UserRole, UserStatus } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  IsEmail,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';

/**
 * Sorting options for user list.
 */
export enum UserSortBy {
  CREATED_AT = 'createdAt',
  EMAIL = 'email',
  FIRST_NAME = 'firstName',
  LAST_NAME = 'lastName',
  LAST_LOGIN = 'lastLoginAt',
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
  })
  @IsEnum(UserRole)
  @IsOptional()
  role?: UserRole;

  @ApiPropertyOptional({
    description: 'Filter by user status',
    enum: UserStatus,
  })
  @IsEnum(UserStatus)
  @IsOptional()
  status?: UserStatus;

  @ApiPropertyOptional({
    description: 'Search by email (partial match)',
    example: 'user@example.com',
  })
  @IsEmail()
  @IsOptional()
  email?: string;

  @ApiPropertyOptional({
    description: 'Search query for name or email',
    example: 'Jean',
  })
  @IsString()
  @IsOptional()
  search?: string;

  @ApiPropertyOptional({
    description: 'Sort by field',
    enum: UserSortBy,
    default: UserSortBy.CREATED_AT,
  })
  @IsEnum(UserSortBy)
  @IsOptional()
  sortBy?: UserSortBy = UserSortBy.CREATED_AT;

  @ApiPropertyOptional({
    description: 'Sort order',
    enum: SortOrder,
    default: SortOrder.DESC,
  })
  @IsEnum(SortOrder)
  @IsOptional()
  sortOrder?: SortOrder = SortOrder.DESC;

  get skip(): number {
    return ((this.page || 1) - 1) * (this.limit || 10);
  }

  get take(): number {
    return this.limit || 10;
  }
}

/**
 * DTO for searching users by email or name.
 */
export class UserSearchDto {
  @ApiPropertyOptional({
    description: 'Search query (email or name)',
    example: 'jean.dupont@example.com',
  })
  @IsString()
  @IsOptional()
  q?: string;

  @ApiPropertyOptional({
    description: 'Maximum number of results',
    minimum: 1,
    maximum: 50,
    default: 10,
  })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  @IsOptional()
  limit?: number = 10;
}
