import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
} from 'class-validator';

/**
 * DTO for making a cashless payment
 *
 * @example
 * {
 *   "amount": 12.50,
 *   "festivalId": "550e8400-e29b-41d4-a716-446655440000",
 *   "description": "2x Beer, 1x Burger",
 *   "vendorId": "550e8400-e29b-41d4-a716-446655440099"
 * }
 */
export class PayDto {
  @ApiProperty({
    description: 'Payment amount in EUR',
    example: 12.50,
    minimum: 0.01,
    type: Number,
  })
  @IsNotEmpty()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  amount: number;

  @ApiProperty({
    description: 'Festival UUID where the payment is made',
    example: '550e8400-e29b-41d4-a716-446655440000',
    format: 'uuid',
  })
  @IsNotEmpty()
  @IsUUID()
  festivalId: string;

  @ApiPropertyOptional({
    description: 'Description of the purchase',
    example: '2x Beer, 1x Burger',
    maxLength: 255,
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  description?: string;

  @ApiPropertyOptional({
    description: 'Vendor UUID making the charge',
    example: '550e8400-e29b-41d4-a716-446655440099',
    format: 'uuid',
  })
  @IsOptional()
  @IsUUID()
  vendorId?: string;
}
