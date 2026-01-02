import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, MaxLength } from 'class-validator';

/**
 * DTO for password reset request
 *
 * @example
 * {
 *   "email": "user@example.com"
 * }
 */
export class ForgotPasswordDto {
  @ApiProperty({
    description: 'Email address associated with the account',
    example: 'user@example.com',
    format: 'email',
    maxLength: 255,
  })
  @IsEmail({}, { message: 'Invalid email format' })
  @IsNotEmpty({ message: 'Email is required' })
  @MaxLength(255, { message: 'Email must not exceed 255 characters' })
  email: string;
}
