import {
  IsArray,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export enum CheckoutType {
  TICKET = 'ticket',
  CASHLESS = 'cashless',
}

export class CheckoutItemDto {
  @IsUUID()
  @IsNotEmpty()
  itemId: string; // ticketCategoryId for tickets, or festivalId for cashless

  @IsNumber()
  @Min(1)
  quantity: number;

  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  unitPrice?: number; // in cents, for cashless topup amount
}

export class CreateCheckoutDto {
  @IsEnum(CheckoutType)
  @IsNotEmpty()
  type: CheckoutType;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CheckoutItemDto)
  items: CheckoutItemDto[];

  @IsOptional()
  @IsString()
  successUrl?: string;

  @IsOptional()
  @IsString()
  cancelUrl?: string;

  @IsOptional()
  @IsUUID()
  festivalId?: string;

  @IsOptional()
  @IsString()
  currency?: string;
}
