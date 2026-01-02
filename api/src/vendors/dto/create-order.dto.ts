import {
  IsArray,
  IsNotEmpty,
  IsUUID,
  IsInt,
  IsPositive,
  ValidateNested,
  ArrayMinSize,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class OrderItemDto {
  @ApiProperty({
    description: 'Menu item ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsUUID()
  @IsNotEmpty()
  menuItemId: string;

  @ApiProperty({
    description: 'Quantity of the item',
    example: 2,
    minimum: 1,
  })
  @IsInt()
  @IsPositive()
  quantity: number;
}

export class CreateOrderDto {
  @ApiProperty({
    description: 'Vendor ID to order from',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsUUID()
  @IsNotEmpty()
  vendorId: string;

  @ApiProperty({
    description: 'List of items to order',
    type: [OrderItemDto],
  })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => OrderItemDto)
  items: OrderItemDto[];
}
