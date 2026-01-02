import {
  IsString,
  IsOptional,
  IsEnum,
  IsBoolean,
  IsArray,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum StaffAccessLevel {
  BASIC = 'BASIC',
  STANDARD = 'STANDARD',
  ELEVATED = 'ELEVATED',
  FULL = 'FULL',
  ADMIN = 'ADMIN',
}

export class CreateStaffRoleDto {
  @ApiProperty({ description: 'Role name (must be unique)' })
  @IsString()
  name!: string;

  @ApiPropertyOptional({ description: 'Role description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({
    description: 'Array of permission keys',
    example: ['staff.view', 'staff.checkin', 'zones.access'],
  })
  @IsArray()
  @IsString({ each: true })
  permissions!: string[];

  @ApiPropertyOptional({
    description: 'Access level for this role',
    enum: StaffAccessLevel,
    default: StaffAccessLevel.STANDARD,
  })
  @IsOptional()
  @IsEnum(StaffAccessLevel)
  accessLevel?: StaffAccessLevel;

  @ApiPropertyOptional({ description: 'Whether the role is active', default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
