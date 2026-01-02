import { ApiProperty } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsNumber,
  IsString,
  IsUUID,
  Min,
  Max,
  IsUrl,
} from 'class-validator';

/**
 * DTO for topping up cashless balance
 *
 * @example
 * {
 *   "amount": 50,
 *   "festivalId": "550e8400-e29b-41d4-a716-446655440000",
 *   "successUrl": "https://festival.io/topup/success",
 *   "cancelUrl": "https://festival.io/topup/cancel"
 * }
 */
export class TopupDto {
  @ApiProperty({
    description: 'Amount to top up in EUR (1-500)',
    example: 50,
    minimum: 1,
    maximum: 500,
    type: Number,
  })
  @IsNotEmpty()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(1)
  @Max(500)
  amount: number;

  @ApiProperty({
    description: 'Festival UUID for the top-up context',
    example: '550e8400-e29b-41d4-a716-446655440000',
    format: 'uuid',
  })
  @IsNotEmpty()
  @IsUUID()
  festivalId: string;

  @ApiProperty({
    description: 'URL to redirect after successful payment',
    example: 'https://festival.io/topup/success?session_id={CHECKOUT_SESSION_ID}',
    format: 'uri',
  })
  @IsNotEmpty()
  @IsString()
  @IsUrl()
  successUrl: string;

  @ApiProperty({
    description: 'URL to redirect if payment is cancelled',
    example: 'https://festival.io/topup/cancel',
    format: 'uri',
  })
  @IsNotEmpty()
  @IsString()
  @IsUrl()
  cancelUrl: string;
}
