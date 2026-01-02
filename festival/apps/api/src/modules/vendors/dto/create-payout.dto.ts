import { IsString, IsOptional, IsDateString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreatePayoutDto {
  @ApiProperty({ description: 'Payout period start date' })
  @IsDateString()
  periodStart!: string;

  @ApiProperty({ description: 'Payout period end date' })
  @IsDateString()
  periodEnd!: string;

  @ApiPropertyOptional({ description: 'Bank account (IBAN)' })
  @IsOptional()
  @IsString()
  bankAccount?: string;

  @ApiPropertyOptional({ description: 'Bank name' })
  @IsOptional()
  @IsString()
  bankName?: string;

  @ApiPropertyOptional({ description: 'Additional notes' })
  @IsOptional()
  @IsString()
  notes?: string;
}
