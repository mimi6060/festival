/**
 * PDF Module - Interfaces
 * Defines all TypeScript interfaces for PDF generation
 */

/**
 * Ticket data interface for PDF generation
 */
export interface TicketPdfData {
  id: string;
  qrCode: string;
  qrCodeData: string;
  purchasePrice: number;
  status: string;
  createdAt: Date;
  category: {
    name: string;
    type: string;
  };
  user: {
    firstName: string;
    lastName: string;
    email: string;
  };
  festival: {
    id: string;
    name: string;
    location: string;
    address?: string;
    startDate: Date;
    endDate: Date;
    logoUrl?: string;
    contactEmail?: string;
    websiteUrl?: string;
  };
}

/**
 * Payment data interface for invoice PDF generation
 */
export interface InvoicePdfData {
  id: string;
  invoiceNumber: string;
  amount: number;
  currency: string;
  status: string;
  provider: string;
  description?: string;
  paidAt?: Date;
  createdAt: Date;
  user: {
    firstName: string;
    lastName: string;
    email: string;
    phone?: string;
    address?: string;
  };
  items: InvoiceItem[];
  taxRate: number;
  taxAmount: number;
  subtotal: number;
}

export interface InvoiceItem {
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
  taxRate?: number;
}

/**
 * Receipt data interface for receipt PDF generation
 */
export interface ReceiptPdfData {
  id: string;
  receiptNumber: string;
  amount: number;
  currency: string;
  paymentMethod: string;
  paidAt: Date;
  user: {
    firstName: string;
    lastName: string;
    email: string;
  };
  items: ReceiptItem[];
  festival?: {
    name: string;
    location: string;
  };
}

export interface ReceiptItem {
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

/**
 * Staff badge data interface for badge PDF generation
 */
export interface StaffBadgePdfData {
  id: string;
  badgeNumber: string;
  role: string;
  startTime: Date;
  endTime: Date;
  user: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    photoUrl?: string;
  };
  festival: {
    id: string;
    name: string;
    location: string;
    startDate: Date;
    endDate: Date;
    logoUrl?: string;
  };
  zone?: {
    name: string;
    description?: string;
  };
  permissions: string[];
}

/**
 * Program data interface for festival program PDF generation
 */
export interface ProgramPdfData {
  festival: {
    id: string;
    name: string;
    location: string;
    startDate: Date;
    endDate: Date;
    description?: string;
    logoUrl?: string;
  };
  stages: ProgramStage[];
  generatedAt: Date;
}

export interface ProgramStage {
  id: string;
  name: string;
  description?: string;
  performances: ProgramPerformance[];
}

export interface ProgramPerformance {
  id: string;
  artistName: string;
  artistGenre?: string;
  startTime: Date;
  endTime: Date;
  description?: string;
}

/**
 * Camping voucher data interface for camping voucher PDF generation
 */
export interface CampingVoucherPdfData {
  id: string;
  voucherNumber: string;
  booking: {
    id: string;
    checkIn: Date;
    checkOut: Date;
    guestCount: number;
    status: string;
    totalPrice: number;
  };
  spot: {
    name: string;
    type: string;
    description?: string;
    amenities: string[];
  };
  user: {
    firstName: string;
    lastName: string;
    email: string;
  };
  festival: {
    name: string;
    location: string;
    startDate: Date;
    endDate: Date;
  };
  qrCodeData: string;
}

/**
 * Refund confirmation data interface for refund confirmation PDF generation
 */
export interface RefundConfirmationPdfData {
  id: string;
  refundNumber: string;
  originalPaymentId: string;
  originalAmount: number;
  refundAmount: number;
  currency: string;
  reason?: string;
  refundedAt: Date;
  user: {
    firstName: string;
    lastName: string;
    email: string;
  };
  items: RefundItem[];
  refundMethod: string;
}

export interface RefundItem {
  description: string;
  quantity: number;
  unitPrice: number;
  refundedAmount: number;
}

/**
 * Analytics report data interface for report PDF generation
 */
export interface AnalyticsPdfData {
  festivalId: string;
  festivalName: string;
  generatedAt: Date;
  period: {
    startDate: Date;
    endDate: Date;
  };
  ticketStats: {
    totalSold: number;
    totalRevenue: number;
    byCategory: Array<{
      name: string;
      sold: number;
      revenue: number;
    }>;
    usageRate: number;
  };
  cashlessStats?: {
    totalTransactions: number;
    totalTopups: number;
    totalPayments: number;
    averageTransaction: number;
  };
  attendanceStats?: {
    peak: number;
    average: number;
    byDay: Array<{
      date: string;
      count: number;
    }>;
  };
}

/**
 * Company information for invoices and official documents
 */
export interface CompanyInfo {
  name: string;
  address: string;
  phone: string;
  email: string;
  siret?: string;
  tva?: string;
  logo?: string;
}

/**
 * PDF generation options
 */
export interface PdfOptions {
  size?: 'A4' | 'LETTER' | 'LEGAL' | [number, number];
  margin?: number | { top: number; right: number; bottom: number; left: number };
  orientation?: 'portrait' | 'landscape';
  info?: {
    title?: string;
    author?: string;
    subject?: string;
  };
}

/**
 * PDF template colors based on branding
 */
export interface PdfColors {
  primary: string;
  secondary: string;
  accent: string;
  text: string;
  textLight: string;
  background: string;
  border: string;
  success: string;
  warning: string;
  error: string;
}

/**
 * Default PDF colors
 */
export const DEFAULT_PDF_COLORS: PdfColors = {
  primary: '#1a1a2e',
  secondary: '#16213e',
  accent: '#0f3460',
  text: '#333333',
  textLight: '#666666',
  background: '#ffffff',
  border: '#e0e0e0',
  success: '#10b981',
  warning: '#f59e0b',
  error: '#ef4444',
};
