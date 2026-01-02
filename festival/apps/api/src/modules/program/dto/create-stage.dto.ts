import {
  IsString,
  IsOptional,
  IsInt,
  IsPositive,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class CreateStageDto {
  @ApiProperty({ description: 'Stage name' })
  @IsString()
  @MaxLength(255)
  name!: string;

  @ApiPropertyOptional({ description: 'Stage description' })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @ApiPropertyOptional({ description: 'Maximum capacity' })
  @IsOptional()
  @IsInt()
  @IsPositive()
  @Type(() => Number)
  capacity?: number;

  @ApiPropertyOptional({ description: 'Location within the festival grounds' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  location?: string;
}
