import type { InvoiceStatus } from '@prisma/client';

/**
 * Response DTO for invoice items
 */
export interface InvoiceItemResponseDto {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
  taxRate?: number;
  taxAmount?: number;
  itemType?: string;
  itemId?: string;
  metadata?: Record<string, unknown>;
  sortOrder: number;
  createdAt: Date;
}

/**
 * Response DTO for invoices
 */
export interface InvoiceResponseDto {
  id: string;
  invoiceNumber: string;
  festivalId: string;
  userId: string;
  currency: string;
  subtotal: number;
  taxAmount: number;
  taxRate: number;
  total: number;
  originalCurrency?: string;
  originalSubtotal?: number;
  originalTax?: number;
  originalTotal?: number;
  exchangeRate?: number;
  status: InvoiceStatus;
  issueDate: Date;
  dueDate: Date;
  paidAt?: Date;
  sentAt?: Date;
  cancelledAt?: Date;
  customerName: string;
  customerEmail: string;
  customerAddress?: string;
  customerPhone?: string;
  customerVatNumber?: string;
  companyName: string;
  companyAddress: string;
  companyVatNumber?: string;
  companyEmail?: string;
  companyPhone?: string;
  taxExempt: boolean;
  reverseCharge: boolean;
  taxCountry?: string;
  paymentId?: string;
  notes?: string;
  pdfUrl?: string;
  locale: string;
  items: InvoiceItemResponseDto[];
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Formatted price display
 */
export interface FormattedPriceDto {
  amount: number;
  currency: string;
  formatted: string;
}

/**
 * Extended invoice response with formatted prices
 */
export interface InvoiceDetailResponseDto extends InvoiceResponseDto {
  formattedSubtotal: FormattedPriceDto;
  formattedTax: FormattedPriceDto;
  formattedTotal: FormattedPriceDto;
  formattedOriginalTotal?: FormattedPriceDto;
  isOverdue: boolean;
  daysUntilDue: number;
}
