import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import {
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  Length,
  Matches,
  MinLength,
} from 'class-validator';

/**
 * DTO for creating a new user.
 * Admin only - regular users should use the auth/register endpoint.
 */
export class CreateUserDto {
  @ApiProperty({
    description: 'User email address (must be unique)',
    example: 'jean.dupont@example.com',
  })
  @IsEmail({}, { message: 'Please provide a valid email address' })
  @IsNotEmpty({ message: 'Email is required' })
  email!: string;

  @ApiProperty({
    description: 'User password (min 8 chars, must contain uppercase, lowercase, and number)',
    example: 'SecureP@ss123',
    minLength: 8,
  })
  @IsString()
  @MinLength(8, { message: 'Password must be at least 8 characters long' })
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, {
    message:
      'Password must contain at least one uppercase letter, one lowercase letter, and one number',
  })
  @IsNotEmpty({ message: 'Password is required' })
  password!: string;

  @ApiProperty({
    description: 'User first name',
    example: 'Jean',
    minLength: 2,
    maxLength: 50,
  })
  @IsString()
  @Length(2, 50, { message: 'First name must be between 2 and 50 characters' })
  @IsNotEmpty({ message: 'First name is required' })
  firstName!: string;

  @ApiProperty({
    description: 'User last name',
    example: 'Dupont',
    minLength: 2,
    maxLength: 50,
  })
  @IsString()
  @Length(2, 50, { message: 'Last name must be between 2 and 50 characters' })
  @IsNotEmpty({ message: 'Last name is required' })
  lastName!: string;

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
    description: 'User role (defaults to USER)',
    enum: UserRole,
    default: UserRole.USER,
    example: UserRole.USER,
  })
  @IsEnum(UserRole, { message: 'Role must be a valid UserRole' })
  @IsOptional()
  role?: UserRole = UserRole.USER;

  @ApiPropertyOptional({
    description: 'Skip email verification (admin only, use with caution)',
    default: false,
    example: false,
  })
  @IsOptional()
  skipEmailVerification?: boolean = false;
}
