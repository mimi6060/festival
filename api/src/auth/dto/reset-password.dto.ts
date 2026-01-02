import { ApiProperty } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

/**
 * DTO for password reset with token
 *
 * @example
 * {
 *   "token": "abc123def456...",
 *   "password": "NewSecureP@ss123"
 * }
 */
export class ResetPasswordDto {
  @ApiProperty({
    description: 'Password reset token received via email',
    example: 'abc123def456ghi789jkl012mno345pqr678stu901vwx234yz',
  })
  @IsString({ message: 'Token must be a string' })
  @IsNotEmpty({ message: 'Token is required' })
  token: string;

  @ApiProperty({
    description: 'New password. Must contain at least 8 characters, one uppercase letter, one lowercase letter, one number, and one special character (@$!%*?&)',
    example: 'NewSecureP@ss123',
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
}
