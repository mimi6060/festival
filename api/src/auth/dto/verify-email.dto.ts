import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

/**
 * DTO for email verification
 *
 * @example
 * {
 *   "token": "abc123def456..."
 * }
 */
export class VerifyEmailDto {
  @ApiProperty({
    description: 'Email verification token received via email during registration',
    example: 'abc123def456ghi789jkl012mno345pqr678stu901vwx234yz',
  })
  @IsString({ message: 'Token must be a string' })
  @IsNotEmpty({ message: 'Token is required' })
  token: string;
}
