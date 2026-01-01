import {
  IsString,
  IsOptional,
  IsEnum,
  IsDateString,
  IsBoolean,
} from 'class-validator';
import { UserRole } from '@prisma/client';

/**
 * DTO for updating a staff assignment
 */
export class UpdateAssignmentDto {
  @IsString()
  @IsOptional()
  zoneId?: string;

  @IsEnum(UserRole)
  @IsOptional()
  role?: UserRole;

  @IsDateString()
  @IsOptional()
  startTime?: string;

  @IsDateString()
  @IsOptional()
  endTime?: string;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
