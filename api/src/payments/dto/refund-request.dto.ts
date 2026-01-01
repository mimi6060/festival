import {
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';

export enum RefundReason {
  DUPLICATE = 'duplicate',
  FRAUDULENT = 'fraudulent',
  REQUESTED_BY_CUSTOMER = 'requested_by_customer',
  EVENT_CANCELLED = 'event_cancelled',
  OTHER = 'other',
}

export class RefundRequestDto {
  @IsOptional()
  @IsNumber()
  @Min(1)
  amount?: number; // in cents, optional for partial refund

  @IsEnum(RefundReason)
  @IsNotEmpty()
  reason: RefundReason;

  @IsOptional()
  @IsString()
  @Max(500)
  description?: string;
}
