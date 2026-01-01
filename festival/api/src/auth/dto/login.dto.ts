import { ApiProperty } from '@nestjs/swagger';
import {
  IsEmail,
  IsNotEmpty,
  IsString,
  MaxLength,
} from 'class-validator';

/**
 * DTO for user login
 *
 * @example
 * {
 *   "email": "user@example.com",
 *   "password": "SecureP@ss123"
 * }
 */
export class LoginDto {
  @ApiProperty({
    description: 'Registered email address',
    example: 'user@example.com',
    format: 'email',
    maxLength: 255,
  })
  @IsEmail({}, { message: 'Invalid email format' })
  @IsNotEmpty({ message: 'Email is required' })
  @MaxLength(255, { message: 'Email must not exceed 255 characters' })
  email: string;

  @ApiProperty({
    description: 'User password',
    example: 'SecureP@ss123',
    format: 'password',
  })
  @IsString({ message: 'Password must be a string' })
  @IsNotEmpty({ message: 'Password is required' })
  password: string;
}
