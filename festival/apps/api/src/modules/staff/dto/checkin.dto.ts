import { IsString, IsUUID, IsOptional, IsEnum } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum CheckInMethod {
  QR = 'QR',
  NFC = 'NFC',
  MANUAL = 'MANUAL',
}

export class CheckInDto {
  @ApiProperty({ description: 'Staff member ID' })
  @IsUUID()
  staffMemberId!: string;

  @ApiPropertyOptional({ description: 'Shift ID (optional, will auto-detect if not provided)' })
  @IsOptional()
  @IsUUID()
  shiftId?: string;

  @ApiPropertyOptional({ description: 'Location (GPS coordinates or zone name)' })
  @IsOptional()
  @IsString()
  location?: string;

  @ApiPropertyOptional({
    description: 'Check-in method',
    enum: CheckInMethod,
    default: CheckInMethod.MANUAL,
  })
  @IsOptional()
  @IsEnum(CheckInMethod)
  checkInMethod?: CheckInMethod;

  @ApiPropertyOptional({ description: 'Additional notes' })
  @IsOptional()
  @IsString()
  notes?: string;
}

export class CheckOutDto {
  @ApiProperty({ description: 'Staff member ID' })
  @IsUUID()
  staffMemberId!: string;

  @ApiPropertyOptional({ description: 'Location (GPS coordinates or zone name)' })
  @IsOptional()
  @IsString()
  location?: string;

  @ApiPropertyOptional({ description: 'Additional notes' })
  @IsOptional()
  @IsString()
  notes?: string;
}
