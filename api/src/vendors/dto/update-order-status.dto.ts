import { IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { OrderStatus } from '@prisma/client';

export class UpdateOrderStatusDto {
  @ApiProperty({
    description: 'New status for the order',
    enum: OrderStatus,
    example: OrderStatus.PREPARING,
  })
  @IsEnum(OrderStatus)
  status: OrderStatus;
}
