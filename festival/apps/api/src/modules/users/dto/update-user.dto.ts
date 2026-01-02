import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsOptional,
  IsString,
  Length,
  Matches,
  MinLength,
} from 'class-validator';

/**
 * DTO for updating user profile information.
 * Users can update their own profile (limited fields).
 * Admins can update any user's profile.
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
    description: 'User first name',
    example: 'Jean',
    minLength: 2,
    maxLength: 50,
  })
  @IsString()
  @Length(2, 50, { message: 'First name must be between 2 and 50 characters' })
  @IsOptional()
  firstName?: string;

  @ApiPropertyOptional({
    description: 'User last name',
    example: 'Dupont',
    minLength: 2,
    maxLength: 50,
  })
  @IsString()
  @Length(2, 50, { message: 'Last name must be between 2 and 50 characters' })
  @IsOptional()
  lastName?: string;

  @ApiPropertyOptional({
    description: 'User phone number in international format',
    example: '+33612345678',
  })
  @IsString()
  @Matches(/^\+?[1-9]\d{1,14}$/, {
    message: 'Phone number must be a valid international format (E.164)',
  })
  @IsOptional()
  phone?: string;

  @ApiPropertyOptional({
    description: 'New password (minimum 8 characters, must contain uppercase, lowercase, and number)',
    minLength: 8,
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
  })
  @IsString()
  @IsOptional()
  currentPassword?: string;
}
