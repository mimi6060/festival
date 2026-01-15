import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsUUID,
  IsNumber,
  IsOptional,
  IsArray,
  ValidateNested,
  IsEmail,
  IsBoolean,
  IsDateString,
  Min,
  Max,
  MaxLength,
} from 'class-validator';
import { Type } from 'class-transformer';

/**
 * DTO for creating invoice items
 */
export class CreateInvoiceItemDto {
  @ApiProperty({
    description: 'Item description',
    example: 'Festival Pass - VIP',
  })
  @IsString()
  @MaxLength(500)
  description!: string;

  @ApiProperty({
    description: 'Quantity of items',
    example: 2,
    minimum: 1,
  })
  @IsNumber()
  @Min(1)
  quantity!: number;

  @ApiProperty({
    description: 'Unit price (excluding tax)',
    example: 149.99,
    minimum: 0,
  })
  @IsNumber()
  @Min(0)
  unitPrice!: number;

  @ApiPropertyOptional({
    description: 'Tax rate for this specific item (overrides invoice default)',
    example: 20,
    minimum: 0,
    maximum: 100,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  taxRate?: number;

  @ApiPropertyOptional({
    description: 'Type of item (for tracking)',
    example: 'TICKET',
    enum: ['TICKET', 'VENDOR_ORDER', 'CASHLESS', 'CAMPING', 'SERVICE', 'OTHER'],
  })
  @IsOptional()
  @IsString()
  itemType?: string;

  @ApiPropertyOptional({
    description: 'Reference ID for the item',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsOptional()
  @IsString()
  itemId?: string;

  @ApiPropertyOptional({
    description: 'Additional metadata for the item',
  })
  @IsOptional()
  metadata?: Record<string, unknown>;

  @ApiPropertyOptional({
    description: 'Sort order for display',
    example: 0,
  })
  @IsOptional()
  @IsNumber()
  sortOrder?: number;
}

/**
 * DTO for creating a new invoice
 */
export class CreateInvoiceDto {
  @ApiProperty({
    description: 'Festival ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsUUID()
  festivalId!: string;

  @ApiProperty({
    description: 'User ID (invoice recipient)',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsUUID()
  userId!: string;

  @ApiProperty({
    description: 'Invoice currency (ISO code)',
    example: 'EUR',
    default: 'EUR',
  })
  @IsString()
  @MaxLength(3)
  currency = 'EUR';

  @ApiPropertyOptional({
    description: 'Original currency (if different from invoice currency)',
    example: 'USD',
  })
  @IsOptional()
  @IsString()
  @MaxLength(3)
  originalCurrency?: string;

  @ApiProperty({
    description: 'Invoice items',
    type: [CreateInvoiceItemDto],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateInvoiceItemDto)
  items!: CreateInvoiceItemDto[];

  @ApiPropertyOptional({
    description: 'Tax rate (percentage)',
    example: 20,
    default: 20,
    minimum: 0,
    maximum: 100,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  taxRate?: number = 20;

  @ApiProperty({
    description: 'Due date for payment',
    example: '2025-02-15',
  })
  @IsDateString()
  dueDate!: string;

  @ApiPropertyOptional({
    description: 'Issue date (defaults to now)',
    example: '2025-01-15',
  })
  @IsOptional()
  @IsDateString()
  issueDate?: string;

  @ApiProperty({
    description: 'Customer name',
    example: 'John Doe',
  })
  @IsString()
  @MaxLength(255)
  customerName!: string;

  @ApiProperty({
    description: 'Customer email',
    example: 'john@example.com',
  })
  @IsEmail()
  customerEmail!: string;

  @ApiPropertyOptional({
    description: 'Customer address',
    example: '123 Main St, Paris 75001, France',
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  customerAddress?: string;

  @ApiPropertyOptional({
    description: 'Customer phone',
    example: '+33 1 23 45 67 89',
  })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  customerPhone?: string;

  @ApiPropertyOptional({
    description: 'Customer VAT number (for B2B)',
    example: 'FR12345678901',
  })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  customerVatNumber?: string;

  @ApiPropertyOptional({
    description: 'Whether the invoice is tax exempt',
    example: false,
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  taxExempt?: boolean = false;

  @ApiPropertyOptional({
    description: 'Whether to apply reverse charge (B2B EU)',
    example: false,
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  reverseCharge?: boolean = false;

  @ApiPropertyOptional({
    description: 'Country for tax calculation',
    example: 'FR',
  })
  @IsOptional()
  @IsString()
  @MaxLength(2)
  taxCountry?: string;

  @ApiPropertyOptional({
    description: 'Reference to a payment',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsOptional()
  @IsUUID()
  paymentId?: string;

  @ApiPropertyOptional({
    description: 'Notes visible to customer',
    example: 'Thank you for your purchase!',
  })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;

  @ApiPropertyOptional({
    description: 'Internal notes (not visible to customer)',
    example: 'VIP customer - priority handling',
  })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  internalNotes?: string;

  @ApiPropertyOptional({
    description: 'Terms and conditions',
  })
  @IsOptional()
  @IsString()
  termsAndConditions?: string;

  @ApiPropertyOptional({
    description: 'Invoice locale/language',
    example: 'fr',
    default: 'fr',
  })
  @IsOptional()
  @IsString()
  @MaxLength(5)
  locale?: string = 'fr';

  @ApiPropertyOptional({
    description: 'Additional metadata',
  })
  @IsOptional()
  metadata?: Record<string, unknown>;
}
