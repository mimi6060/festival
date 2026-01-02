import {
  IsString,
  IsOptional,
  IsUUID,
  IsDateString,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreatePerformanceDto {
  @ApiProperty({ description: 'Artist ID' })
  @IsUUID()
  artistId!: string;

  @ApiProperty({ description: 'Stage ID' })
  @IsUUID()
  stageId!: string;

  @ApiProperty({ description: 'Performance start time (ISO 8601)' })
  @IsDateString()
  startTime!: string;

  @ApiProperty({ description: 'Performance end time (ISO 8601)' })
  @IsDateString()
  endTime!: string;

  @ApiPropertyOptional({ description: 'Performance description or special notes' })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;
}
