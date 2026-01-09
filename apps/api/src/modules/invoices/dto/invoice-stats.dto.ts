/**
 * Status breakdown stats
 */
export interface StatusBreakdownDto {
  draft: number;
  sent: number;
  paid: number;
  overdue: number;
  cancelled: number;
}

/**
 * Currency breakdown stats
 */
export interface CurrencyBreakdownDto {
  currency: string;
  count: number;
  total: number;
  paidAmount: number;
  outstandingAmount: number;
}

/**
 * Monthly stats
 */
export interface MonthlyStatsDto {
  month: string;
  invoiceCount: number;
  totalAmount: number;
  paidAmount: number;
  averageAmount: number;
}

/**
 * Tax summary stats
 */
export interface TaxSummaryDto {
  taxableBase: number;
  totalTax: number;
  byRate: { rate: number; base: number; tax: number }[];
}

/**
 * Response DTO for invoice statistics
 */
export interface InvoiceStatsDto {
  totalInvoices: number;
  totalAmount: number;
  totalPaid: number;
  totalOutstanding: number;
  totalOverdue: number;
  averageInvoiceAmount: number;
  averagePaymentTime: number;
  byStatus: StatusBreakdownDto;
  byCurrency: CurrencyBreakdownDto[];
  monthly?: MonthlyStatsDto[];
  taxSummary?: TaxSummaryDto;
  baseCurrency: string;
  generatedAt: Date;
}
