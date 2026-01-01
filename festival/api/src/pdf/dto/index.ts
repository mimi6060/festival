/**
 * PDF DTOs - Type definitions for PDF generation
 *
 * These interfaces define the data structures used for PDF generation.
 * They are also exported from the pdf.service.ts file.
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

export interface PaymentPdfData {
  id: string;
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
  };
  items: Array<{
    description: string;
    quantity: number;
    unitPrice: number;
    total: number;
  }>;
}

export interface StaffBadgePdfData {
  id: string;
  role: string;
  startTime: Date;
  endTime: Date;
  user: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
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
}

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
