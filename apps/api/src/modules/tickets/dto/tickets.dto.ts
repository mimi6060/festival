import {
  IsString,
  IsNumber,
  IsEmail,
  IsOptional,
  Min,
  IsNotEmpty,
  IsInt,
  Max,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

/**
 * Query parameters for fetching user tickets with pagination
 */
export class GetUserTicketsDto {
  @ApiPropertyOptional({ description: 'Filter by festival ID' })
  @IsOptional()
  @IsString()
  festivalId?: string;

  @ApiPropertyOptional({
    description: 'Page number (1-indexed)',
    minimum: 1,
    default: 1,
    example: 1,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  page?: number = 1;

  @ApiPropertyOptional({
    description: 'Number of items per page',
    minimum: 1,
    maximum: 100,
    default: 20,
    example: 20,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  @Type(() => Number)
  limit?: number = 20;
}

export class PurchaseTicketsDto {
  @IsString()
  @IsNotEmpty()
  festivalId: string;

  @IsString()
  @IsNotEmpty()
  categoryId: string;

  @IsNumber()
  @Min(1)
  quantity: number;
}

export class GuestPurchaseDto {
  @IsString()
  @IsNotEmpty()
  festivalId: string;

  @IsString()
  @IsNotEmpty()
  categoryId: string;

  @IsNumber()
  @Min(1)
  quantity: number;

  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsString()
  @IsNotEmpty()
  firstName: string;

  @IsString()
  @IsNotEmpty()
  lastName: string;

  @IsString()
  @IsOptional()
  phone?: string;
}

export class ValidateTicketDto {
  @IsString()
  @IsNotEmpty()
  qrCode: string;

  @IsString()
  @IsOptional()
  zoneId?: string;
}

export class TransferTicketDto {
  @IsEmail()
  @IsNotEmpty()
  recipientEmail: string;
}
