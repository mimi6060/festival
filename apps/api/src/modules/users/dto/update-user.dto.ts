import { ApiPropertyOptional } from '@nestjs/swagger';
import { UserRole, UserStatus } from '@prisma/client';
import {
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
  Length,
  Matches,
  MinLength,
  IsNotEmpty,
} from 'class-validator';

/**
 * DTO for updating user profile information.
 * Users can update their own profile (limited fields: firstName, lastName, phone).
 * Admins can update any user's profile including role and status.
 *
 * Field restrictions:
 * - email: Can be updated by user (requires verification) or admin
 * - firstName, lastName, phone: Can be updated by user or admin
 * - role: Admin only - cannot be updated through this DTO for non-admin users
 * - status: Admin only
 * - password: Separate endpoint recommended, but supported here with currentPassword validation
 */
export class UpdateUserDto {
  @ApiPropertyOptional({
    description: 'User email address',
    example: 'user@example.com',
  })
  @IsEmail({}, { message: 'Please provide a valid email address' })
  @IsOptional()
  email?: string;

  @ApiPropertyOptional({
    description: 'User first name (required for profile)',
    example: 'Jean',
    minLength: 2,
    maxLength: 50,
  })
  @IsString()
  @Length(2, 50, { message: 'First name must be between 2 and 50 characters' })
  @IsNotEmpty({ message: 'First name cannot be empty' })
  @IsOptional()
  firstName?: string;

  @ApiPropertyOptional({
    description: 'User last name (required for profile)',
    example: 'Dupont',
    minLength: 2,
    maxLength: 50,
  })
  @IsString()
  @Length(2, 50, { message: 'Last name must be between 2 and 50 characters' })
  @IsNotEmpty({ message: 'Last name cannot be empty' })
  @IsOptional()
  lastName?: string;

  @ApiPropertyOptional({
    description: 'User phone number in international format (E.164)',
    example: '+33612345678',
  })
  @IsString()
  @Matches(/^\+?[1-9]\d{1,14}$/, {
    message: 'Phone number must be a valid international format (E.164)',
  })
  @IsOptional()
  phone?: string;

  @ApiPropertyOptional({
    description: 'User role (Admin only - cannot be changed by the user themselves)',
    enum: UserRole,
    example: UserRole.USER,
  })
  @IsEnum(UserRole, { message: 'Role must be a valid UserRole' })
  @IsOptional()
  role?: UserRole;

  @ApiPropertyOptional({
    description: 'User status (Admin only)',
    enum: UserStatus,
    example: UserStatus.ACTIVE,
  })
  @IsEnum(UserStatus, { message: 'Status must be a valid UserStatus' })
  @IsOptional()
  status?: UserStatus;

  @ApiPropertyOptional({
    description:
      'New password (minimum 8 characters, must contain uppercase, lowercase, and number). Use separate /auth/change-password endpoint instead.',
    minLength: 8,
    deprecated: true,
  })
  @IsString()
  @MinLength(8, { message: 'Password must be at least 8 characters long' })
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, {
    message:
      'Password must contain at least one uppercase letter, one lowercase letter, and one number',
  })
  @IsOptional()
  password?: string;

  @ApiPropertyOptional({
    description: 'Current password (required when changing password as non-admin)',
    minLength: 8,
    deprecated: true,
  })
  @IsString()
  @IsOptional()
  currentPassword?: string;
}
