import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNumber,
  IsOptional,
  IsBoolean,
  IsDateString,
  IsEnum,
  Min,
  Max,
  MaxLength,
  IsEmail,
} from 'class-validator';
import { InvoiceStatus } from '@prisma/client';

/**
 * DTO for updating an existing invoice
 */
export class UpdateInvoiceDto {
  @ApiPropertyOptional({
    description: 'Invoice status',
    enum: InvoiceStatus,
    example: 'SENT',
  })
  @IsOptional()
  @IsEnum(InvoiceStatus)
  status?: InvoiceStatus;

  @ApiPropertyOptional({
    description: 'Due date for payment',
    example: '2025-02-15',
  })
  @IsOptional()
  @IsDateString()
  dueDate?: string;

  @ApiPropertyOptional({
    description: 'Customer name',
    example: 'John Doe',
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  customerName?: string;

  @ApiPropertyOptional({
    description: 'Customer email',
    example: 'john@example.com',
  })
  @IsOptional()
  @IsEmail()
  customerEmail?: string;

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
    description: 'Tax rate (percentage)',
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
    description: 'Whether the invoice is tax exempt',
    example: false,
  })
  @IsOptional()
  @IsBoolean()
  taxExempt?: boolean;

  @ApiPropertyOptional({
    description: 'Whether to apply reverse charge (B2B EU)',
    example: false,
  })
  @IsOptional()
  @IsBoolean()
  reverseCharge?: boolean;

  @ApiPropertyOptional({
    description: 'Country for tax calculation',
    example: 'FR',
  })
  @IsOptional()
  @IsString()
  @MaxLength(2)
  taxCountry?: string;

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
    description: 'Additional metadata',
  })
  @IsOptional()
  metadata?: Record<string, unknown>;
}
