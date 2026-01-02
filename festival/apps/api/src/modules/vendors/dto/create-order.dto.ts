import {
  IsString,
  IsOptional,
  IsArray,
  ValidateNested,
  IsInt,
  IsEnum,
  IsObject,
  Min,
  IsUUID,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export enum VendorPaymentMethod {
  CASHLESS = 'CASHLESS',
  CARD = 'CARD',
  CASH = 'CASH',
}

export class OrderItemDto {
  @ApiProperty({ description: 'Product ID' })
  @IsUUID()
  productId!: string;

  @ApiProperty({ description: 'Quantity', minimum: 1 })
  @IsInt()
  @Min(1)
  @Type(() => Number)
  quantity!: number;

  @ApiPropertyOptional({
    description: 'Selected options',
    example: { size: 'M', extras: ['cheese'] },
  })
  @IsOptional()
  @IsObject()
  options?: Record<string, string | string[]>;

  @ApiPropertyOptional({ description: 'Special notes for this item' })
  @IsOptional()
  @IsString()
  notes?: string;
}

export class CreateOrderDto {
  @ApiProperty({ type: [OrderItemDto], description: 'Order items' })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OrderItemDto)
  items!: OrderItemDto[];

  @ApiProperty({
    enum: VendorPaymentMethod,
    description: 'Payment method',
    default: VendorPaymentMethod.CASHLESS,
  })
  @IsEnum(VendorPaymentMethod)
  paymentMethod!: VendorPaymentMethod;

  @ApiPropertyOptional({ description: 'Order notes' })
  @IsOptional()
  @IsString()
  notes?: string;
}
