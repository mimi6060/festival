import {
  IsString,
  IsUUID,
  IsOptional,
  IsEnum,
  IsDateString,
  IsInt,
  Min,
  Max,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum ShiftStatus {
  SCHEDULED = 'SCHEDULED',
  CONFIRMED = 'CONFIRMED',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
  NO_SHOW = 'NO_SHOW',
}

export class CreateShiftDto {
  @ApiProperty({ description: 'Staff member ID' })
  @IsUUID()
  staffMemberId!: string;

  @ApiPropertyOptional({ description: 'Zone ID where the shift takes place' })
  @IsOptional()
  @IsUUID()
  zoneId?: string;

  @ApiPropertyOptional({ description: 'Shift title or description' })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiProperty({ description: 'Shift start time (ISO 8601 format)' })
  @IsDateString()
  startTime!: string;

  @ApiProperty({ description: 'Shift end time (ISO 8601 format)' })
  @IsDateString()
  endTime!: string;

  @ApiPropertyOptional({
    description: 'Break duration in minutes',
    default: 0,
    minimum: 0,
    maximum: 480,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(480)
  breakDuration?: number;

  @ApiPropertyOptional({
    description: 'Shift status',
    enum: ShiftStatus,
    default: ShiftStatus.SCHEDULED,
  })
  @IsOptional()
  @IsEnum(ShiftStatus)
  status?: ShiftStatus;

  @ApiPropertyOptional({ description: 'Additional notes for the shift' })
  @IsOptional()
  @IsString()
  notes?: string;
}
