import {
  IsString,
  IsOptional,
  IsDateString,
  IsEnum,
} from 'class-validator';
import { UserRole } from '@prisma/client';

/**
 * DTO for querying staff schedule
 */
export class ScheduleQueryDto {
  @IsDateString()
  @IsOptional()
  date?: string;

  @IsDateString()
  @IsOptional()
  startDate?: string;

  @IsDateString()
  @IsOptional()
  endDate?: string;

  @IsString()
  @IsOptional()
  zoneId?: string;

  @IsEnum(UserRole)
  @IsOptional()
  role?: UserRole;

  @IsString()
  @IsOptional()
  userId?: string;
}
