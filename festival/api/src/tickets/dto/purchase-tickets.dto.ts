import {
  IsString,
  IsNotEmpty,
  IsArray,
  ValidateNested,
  IsInt,
  IsPositive,
  Min,
  Max,
  IsEnum,
  IsOptional,
} from 'class-validator';
import { Type } from 'class-transformer';
import { PaymentProvider } from '@prisma/client';

export class TicketPurchaseItemDto {
  @IsString()
  @IsNotEmpty()
  categoryId: string;

  @IsInt()
  @IsPositive()
  @Min(1)
  @Max(10)
  quantity: number;
}

export class PurchaseTicketsDto {
  @IsString()
  @IsNotEmpty()
  festivalId: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TicketPurchaseItemDto)
  items: TicketPurchaseItemDto[];

  @IsEnum(PaymentProvider)
  paymentProvider: PaymentProvider;

  @IsString()
  @IsOptional()
  paymentToken?: string; // Token from payment provider (e.g., Stripe token)
}
