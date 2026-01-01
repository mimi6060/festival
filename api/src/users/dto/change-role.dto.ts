import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';

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
  role: UserRole;

  @ApiPropertyOptional({
    description: 'Reason for role change (for audit purposes)',
    example: 'Promoted to organizer for Festival 2024',
    maxLength: 500,
  })
  @IsString()
  @MaxLength(500)
  @IsOptional()
  reason?: string;
}

/**
 * DTO for banning a user.
 * Admin only action.
 */
export class BanUserDto {
  @ApiProperty({
    description: 'Reason for banning the user',
    example: 'Violation of terms of service',
    maxLength: 500,
  })
  @IsString()
  @MaxLength(500)
  reason: string;
}

/**
 * DTO for unbanning a user.
 * Admin only action.
 */
export class UnbanUserDto {
  @ApiPropertyOptional({
    description: 'Reason for unbanning the user',
    example: 'Ban period completed, user agreed to follow guidelines',
    maxLength: 500,
  })
  @IsString()
  @MaxLength(500)
  @IsOptional()
  reason?: string;
}
