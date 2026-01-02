import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsUUID,
  IsInt,
  Min,
  Max,
  IsOptional,
} from 'class-validator';

/**
 * DTO for purchasing tickets
 */
export class PurchaseTicketsDto {
  @ApiProperty({
    description: 'Festival ID',
    example: '550e8400-e29b-41d4-a716-446655440000',
    format: 'uuid',
  })
  @IsUUID()
  festivalId!: string;

  @ApiProperty({
    description: 'Ticket category ID',
    example: '550e8400-e29b-41d4-a716-446655440001',
    format: 'uuid',
  })
  @IsUUID()
  categoryId!: string;

  @ApiProperty({
    description: 'Number of tickets to purchase',
    example: 2,
    minimum: 1,
    maximum: 10,
  })
  @IsInt()
  @Min(1)
  @Max(10)
  quantity!: number;
}

/**
 * Response DTO for a single ticket
 */
export class TicketResponseDto {
  @ApiProperty({
    description: 'Ticket ID',
    example: '550e8400-e29b-41d4-a716-446655440002',
    format: 'uuid',
  })
  id!: string;

  @ApiProperty({
    description: 'Festival ID',
    example: '550e8400-e29b-41d4-a716-446655440000',
    format: 'uuid',
  })
  festivalId!: string;

  @ApiProperty({
    description: 'Ticket category ID',
    example: '550e8400-e29b-41d4-a716-446655440001',
    format: 'uuid',
  })
  categoryId!: string;

  @ApiProperty({
    description: 'User ID who owns the ticket',
    example: '550e8400-e29b-41d4-a716-446655440003',
    format: 'uuid',
  })
  userId!: string;

  @ApiProperty({
    description: 'QR code string for the ticket',
    example: 'QR-550E8400-A1B2C3D4E5F6G7H8',
  })
  qrCode!: string;

  @ApiProperty({
    description: 'Ticket status',
    enum: ['RESERVED', 'SOLD', 'USED', 'CANCELLED', 'REFUNDED'],
    example: 'SOLD',
  })
  status!: string;

  @ApiProperty({
    description: 'Purchase price in cents',
    example: 9900,
  })
  purchasePrice!: number;

  @ApiPropertyOptional({
    description: 'When the ticket was used (scanned at entry)',
    example: '2025-07-15T16:30:00.000Z',
    type: Date,
    nullable: true,
  })
  usedAt!: Date | null;

  @ApiProperty({
    description: 'When the ticket was created',
    example: '2025-01-15T10:00:00.000Z',
  })
  createdAt!: Date;

  @ApiProperty({
    description: 'When the ticket was last updated',
    example: '2025-01-15T10:00:00.000Z',
  })
  updatedAt!: Date;

  @ApiPropertyOptional({
    description: 'Festival information',
  })
  festival?: {
    id: string;
    name: string;
    startDate: Date;
    endDate: Date;
  };

  @ApiPropertyOptional({
    description: 'Ticket category information',
  })
  category?: {
    id: string;
    name: string;
    type: string;
  };
}

/**
 * Query parameters for filtering user tickets
 */
export class GetUserTicketsQueryDto {
  @ApiPropertyOptional({
    description: 'Filter by festival ID',
    example: '550e8400-e29b-41d4-a716-446655440000',
    format: 'uuid',
  })
  @IsOptional()
  @IsUUID()
  festivalId?: string;
}
