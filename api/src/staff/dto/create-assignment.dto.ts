import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEnum,
  IsDateString,
  IsBoolean,
} from 'class-validator';
import { UserRole } from '@prisma/client';

/**
 * DTO for creating a staff assignment
 */
export class CreateAssignmentDto {
  @IsString()
  @IsNotEmpty()
  userId: string;

  @IsString()
  @IsOptional()
  zoneId?: string;

  @IsEnum(UserRole)
  role: UserRole;

  @IsDateString()
  startTime: string;

  @IsDateString()
  endTime: string;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
