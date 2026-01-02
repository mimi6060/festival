import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { IsEnum, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

/**
 * DTO for changing a user's role.
 * Admin only action.
 */
export class ChangeRoleDto {
  @ApiProperty({
    description: 'New role for the user',
    enum: UserRole,
    example: UserRole.ORGANIZER,
  })
  @IsEnum(UserRole, { message: 'Role must be a valid UserRole' })
  @IsNotEmpty({ message: 'Role is required' })
  role!: UserRole;

  @ApiPropertyOptional({
    description: 'Reason for role change (for audit purposes)',
    example: 'Promoted to organizer for Festival 2024',
    maxLength: 500,
  })
  @IsString()
  @MaxLength(500, { message: 'Reason cannot exceed 500 characters' })
  @IsOptional()
  reason?: string;
}

/**
 * DTO for banning a user.
 * Admin only action.
 */
export class BanUserDto {
  @ApiProperty({
    description: 'Reason for banning the user (required for audit)',
    example: 'Violation of terms of service - fraudulent payment attempts',
    maxLength: 500,
  })
  @IsString()
  @IsNotEmpty({ message: 'Ban reason is required' })
  @MaxLength(500, { message: 'Reason cannot exceed 500 characters' })
  reason!: string;
}

/**
 * DTO for unbanning a user.
 * Admin only action.
 */
export class UnbanUserDto {
  @ApiPropertyOptional({
    description: 'Reason for unbanning the user (optional, for audit)',
    example: 'Ban period completed, user agreed to follow guidelines',
    maxLength: 500,
  })
  @IsString()
  @MaxLength(500, { message: 'Reason cannot exceed 500 characters' })
  @IsOptional()
  reason?: string;
}
