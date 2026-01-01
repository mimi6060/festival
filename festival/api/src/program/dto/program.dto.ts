import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ArtistResponseDto } from './artist.dto';
import { StageResponseDto } from './stage.dto';
import { PerformanceResponseDto } from './performance.dto';

/**
 * Performance with full artist and stage details for program view
 */
export class ProgramPerformanceDto {
  @ApiProperty({ description: 'Performance UUID' })
  id: string;

  @ApiProperty({ description: 'Performance start time' })
  startTime: Date;

  @ApiProperty({ description: 'Performance end time' })
  endTime: Date;

  @ApiPropertyOptional({ description: 'Performance description' })
  description?: string;

  @ApiProperty({ description: 'Whether the performance is cancelled' })
  isCancelled: boolean;

  @ApiProperty({ description: 'Artist details', type: ArtistResponseDto })
  artist: ArtistResponseDto;

  @ApiProperty({ description: 'Stage details', type: StageResponseDto })
  stage: StageResponseDto;
}

/**
 * Full festival program response
 */
export class FestivalProgramDto {
  @ApiProperty({ description: 'Festival UUID' })
  festivalId: string;

  @ApiProperty({ description: 'Festival name' })
  festivalName: string;

  @ApiProperty({ description: 'Festival start date' })
  startDate: Date;

  @ApiProperty({ description: 'Festival end date' })
  endDate: Date;

  @ApiProperty({
    description: 'All stages at the festival',
    type: [StageResponseDto],
  })
  stages: StageResponseDto[];

  @ApiProperty({
    description: 'All performances ordered by start time',
    type: [ProgramPerformanceDto],
  })
  performances: ProgramPerformanceDto[];

  @ApiProperty({ description: 'Total number of performances' })
  totalPerformances: number;

  @ApiProperty({ description: 'Total number of unique artists' })
  totalArtists: number;
}

/**
 * Day schedule for program grouped by day
 */
export class DayScheduleDto {
  @ApiProperty({
    description: 'Date (YYYY-MM-DD)',
    example: '2025-07-15',
  })
  date: string;

  @ApiProperty({
    description: 'Day name',
    example: 'Friday',
  })
  dayName: string;

  @ApiProperty({
    description: 'Performances for this day',
    type: [ProgramPerformanceDto],
  })
  performances: ProgramPerformanceDto[];

  @ApiProperty({ description: 'Number of performances on this day' })
  performanceCount: number;
}

/**
 * Festival program grouped by day
 */
export class ProgramByDayDto {
  @ApiProperty({ description: 'Festival UUID' })
  festivalId: string;

  @ApiProperty({ description: 'Festival name' })
  festivalName: string;

  @ApiProperty({
    description: 'Schedule organized by day',
    type: [DayScheduleDto],
  })
  days: DayScheduleDto[];

  @ApiProperty({ description: 'Total number of festival days' })
  totalDays: number;

  @ApiProperty({ description: 'Total number of performances' })
  totalPerformances: number;
}

/**
 * Stage schedule for program grouped by stage
 */
export class StageScheduleDto {
  @ApiProperty({ description: 'Stage details', type: StageResponseDto })
  stage: StageResponseDto;

  @ApiProperty({
    description: 'Performances on this stage',
    type: [ProgramPerformanceDto],
  })
  performances: ProgramPerformanceDto[];

  @ApiProperty({ description: 'Number of performances on this stage' })
  performanceCount: number;
}

/**
 * Festival program grouped by stage
 */
export class ProgramByStageDto {
  @ApiProperty({ description: 'Festival UUID' })
  festivalId: string;

  @ApiProperty({ description: 'Festival name' })
  festivalName: string;

  @ApiProperty({
    description: 'Schedule organized by stage',
    type: [StageScheduleDto],
  })
  stages: StageScheduleDto[];

  @ApiProperty({ description: 'Total number of stages' })
  totalStages: number;

  @ApiProperty({ description: 'Total number of performances' })
  totalPerformances: number;
}
