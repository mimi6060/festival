import {
  IsOptional,
  IsNumber,
  IsString,
  Min,
  Max,
} from 'class-validator';

/**
 * DTO for check-in/check-out operations with optional geolocation
 */
export class CheckInOutDto {
  @IsNumber()
  @Min(-90)
  @Max(90)
  @IsOptional()
  latitude?: number;

  @IsNumber()
  @Min(-180)
  @Max(180)
  @IsOptional()
  longitude?: number;

  @IsString()
  @IsOptional()
  notes?: string;
}
