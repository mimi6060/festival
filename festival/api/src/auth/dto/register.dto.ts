import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

/**
 * DTO for user registration
 *
 * @example
 * {
 *   "email": "user@example.com",
 *   "password": "SecureP@ss123",
 *   "firstName": "Jean",
 *   "lastName": "Dupont",
 *   "phone": "+33612345678"
 * }
 */
export class RegisterDto {
  @ApiProperty({
    description: 'User email address (must be unique)',
    example: 'user@example.com',
    format: 'email',
    maxLength: 255,
  })
  @IsEmail({}, { message: 'Invalid email format' })
  @IsNotEmpty({ message: 'Email is required' })
  @MaxLength(255, { message: 'Email must not exceed 255 characters' })
  email: string;

  @ApiProperty({
    description: 'User password. Must contain at least 8 characters, one uppercase letter, one lowercase letter, one number, and one special character (@$!%*?&)',
    example: 'SecureP@ss123',
    minLength: 8,
    maxLength: 128,
    format: 'password',
  })
  @IsString({ message: 'Password must be a string' })
  @IsNotEmpty({ message: 'Password is required' })
  @MinLength(8, { message: 'Password must be at least 8 characters long' })
  @MaxLength(128, { message: 'Password must not exceed 128 characters' })
  @Matches(
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/,
    {
      message:
        'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character (@$!%*?&)',
    },
  )
  password: string;

  @ApiProperty({
    description: 'User first name',
    example: 'Jean',
    minLength: 1,
    maxLength: 100,
  })
  @IsString({ message: 'First name must be a string' })
  @IsNotEmpty({ message: 'First name is required' })
  @MinLength(1, { message: 'First name must be at least 1 character long' })
  @MaxLength(100, { message: 'First name must not exceed 100 characters' })
  @Matches(/^[a-zA-ZÀ-ÿ\s'-]+$/, {
    message: 'First name can only contain letters, spaces, hyphens, and apostrophes',
  })
  firstName: string;

  @ApiProperty({
    description: 'User last name',
    example: 'Dupont',
    minLength: 1,
    maxLength: 100,
  })
  @IsString({ message: 'Last name must be a string' })
  @IsNotEmpty({ message: 'Last name is required' })
  @MinLength(1, { message: 'Last name must be at least 1 character long' })
  @MaxLength(100, { message: 'Last name must not exceed 100 characters' })
  @Matches(/^[a-zA-ZÀ-ÿ\s'-]+$/, {
    message: 'Last name can only contain letters, spaces, hyphens, and apostrophes',
  })
  lastName: string;

  @ApiPropertyOptional({
    description: 'User phone number in E.164 international format',
    example: '+33612345678',
    pattern: '^\\+?[1-9]\\d{1,14}$',
  })
  @IsOptional()
  @IsString({ message: 'Phone must be a string' })
  @Matches(/^\+?[1-9]\d{1,14}$/, {
    message: 'Phone must be a valid international phone number (E.164 format)',
  })
  phone?: string;
}
