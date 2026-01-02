import {
  IsString,
  IsOptional,
  IsUUID,
  IsDateString,
  IsBoolean,
  MaxLength,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdatePerformanceDto {
  @ApiPropertyOptional({ description: 'Artist ID' })
  @IsOptional()
  @IsUUID()
  artistId?: string;

  @ApiPropertyOptional({ description: 'Stage ID' })
  @IsOptional()
  @IsUUID()
  stageId?: string;

  @ApiPropertyOptional({ description: 'Performance start time (ISO 8601)' })
  @IsOptional()
  @IsDateString()
  startTime?: string;

  @ApiPropertyOptional({ description: 'Performance end time (ISO 8601)' })
  @IsOptional()
  @IsDateString()
  endTime?: string;

  @ApiPropertyOptional({ description: 'Performance description or special notes' })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @ApiPropertyOptional({ description: 'Whether the performance is cancelled' })
  @IsOptional()
  @IsBoolean()
  isCancelled?: boolean;
}
