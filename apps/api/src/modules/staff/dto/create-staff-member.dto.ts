import {
  IsString,
  IsUUID,
  IsOptional,
  IsEnum,
  IsBoolean,
  ValidateNested,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum StaffDepartment {
  SECURITY = 'SECURITY',
  TICKETING = 'TICKETING',
  CASHLESS = 'CASHLESS',
  FOOD_BEVERAGE = 'FOOD_BEVERAGE',
  TECHNICAL = 'TECHNICAL',
  MEDICAL = 'MEDICAL',
  CLEANING = 'CLEANING',
  LOGISTICS = 'LOGISTICS',
  ARTIST_RELATIONS = 'ARTIST_RELATIONS',
  COMMUNICATIONS = 'COMMUNICATIONS',
  VOLUNTEER_COORDINATION = 'VOLUNTEER_COORDINATION',
  GENERAL = 'GENERAL',
}

export class EmergencyContactDto {
  @ApiProperty({ description: 'Emergency contact name' })
  @IsString()
  name!: string;

  @ApiProperty({ description: 'Emergency contact phone' })
  @IsString()
  phone!: string;

  @ApiPropertyOptional({ description: 'Relationship to staff member' })
  @IsOptional()
  @IsString()
  relation?: string;
}

export class CreateStaffMemberDto {
  @ApiProperty({ description: 'User ID to associate with staff member' })
  @IsUUID()
  userId!: string;

  @ApiProperty({ description: 'Festival ID where staff will work' })
  @IsUUID()
  festivalId!: string;

  @ApiProperty({ description: 'Staff role ID' })
  @IsUUID()
  roleId!: string;

  @ApiPropertyOptional({
    description: 'Department assignment',
    enum: StaffDepartment,
    default: StaffDepartment.GENERAL,
  })
  @IsOptional()
  @IsEnum(StaffDepartment)
  department?: StaffDepartment;

  @ApiPropertyOptional({
    description: 'Internal employee code',
    example: 'SEC001',
  })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(50)
  employeeCode?: string;

  @ApiPropertyOptional({
    description: 'Contact phone number in international format',
    example: '+33612345678',
  })
  @IsOptional()
  @IsString()
  @Matches(/^\+?[1-9]\d{6,14}$/, {
    message: 'Phone number must be valid international format (e.g., +33612345678)',
  })
  phone?: string;

  @ApiPropertyOptional({ description: 'Emergency contact information' })
  @IsOptional()
  @ValidateNested()
  @Type(() => EmergencyContactDto)
  emergencyContact?: EmergencyContactDto;

  @ApiPropertyOptional({
    description: 'Badge number for access control (unique within festival)',
    example: 'BADGE001',
  })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(50)
  badgeNumber?: string;

  @ApiPropertyOptional({ description: 'Additional notes about the staff member' })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({ description: 'Whether the staff member is active', default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
