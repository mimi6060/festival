import {
  IsString,
  IsNotEmpty,
  IsInt,
  IsPositive,
  IsDateString,
  IsOptional,
  Min,
  Max,
} from 'class-validator';

export class CreateBookingDto {
  @IsString()
  @IsNotEmpty()
  spotId: string;

  @IsDateString()
  checkIn: string;

  @IsDateString()
  checkOut: string;

  @IsInt()
  @IsPositive()
  @Min(1)
  @Max(20)
  guestCount: number;

  @IsString()
  @IsOptional()
  notes?: string;
}
