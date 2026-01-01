import { ApiPropertyOptional, PartialType, OmitType } from '@nestjs/swagger';
import { CreateFestivalDto } from './create-festival.dto';
import { IsEnum, IsOptional } from 'class-validator';
import { FestivalStatus } from '../entities/festival.entity';

/**
 * DTO for updating an existing festival
 * All fields are optional, excluding status which has its own endpoint
 */
export class UpdateFestivalDto extends PartialType(
  OmitType(CreateFestivalDto, ['status'] as const),
) {
  // All fields from CreateFestivalDto are available and optional
  // Status is managed via dedicated endpoint
}

/**
 * DTO for updating festival status only
 */
export class UpdateFestivalStatusDto {
  @ApiPropertyOptional({
    description: 'New festival status',
    enum: FestivalStatus,
    example: FestivalStatus.PUBLISHED,
  })
  @IsEnum(FestivalStatus)
  status: FestivalStatus;
}
