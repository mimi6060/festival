import { PartialType } from '@nestjs/mapped-types';
import { CreateCampingSpotDto } from './create-camping-spot.dto';
import { IsOptional, IsBoolean } from 'class-validator';

export class UpdateCampingSpotDto extends PartialType(CreateCampingSpotDto) {
  @IsBoolean()
  @IsOptional()
  isAvailable?: boolean;
}
