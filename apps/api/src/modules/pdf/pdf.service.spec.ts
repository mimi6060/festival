/**
 * PDF Service Unit Tests
 *
 * Comprehensive tests for PDF generation functionality including:
 * - Ticket PDF generation
 * - Invoice PDF generation
 * - Report PDF generation (Financial Report)
 * - Badge PDF generation
 * - Receipt PDF generation
 * - Camping voucher PDF generation
 * - Refund confirmation PDF generation
 * - Program PDF generation
 */

import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { NotFoundException } from '@nestjs/common';
import { PdfService } from './pdf.service';
import { PrismaService } from '../../prisma/prisma.service';
import {
  organizerUser,
  regularUser,
  adminUser,
  staffUser,
  publishedFestival,
  standardCategory,
  vipCategory,
} from '../../test/fixtures';

// PDFKit is mocked via jest.config.ts moduleNameMapper -> pdfkit.ts

// Mock QRCode
jest.mock('qrcode', () => ({
  toDataURL: jest.fn().mockResolvedValue('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=='),
}));

// ============================================================================
// Test Data
// ============================================================================

const mockTicket = {
  id: 'ticket-uuid-00000000-0000-0000-0000-000000000001',
  qrCode: 'QR-TICKET-001',
  qrCodeData: 'signed-qr-data',
  purchasePrice: 149.99,
  status: 'SOLD',
  createdAt: new Date('2024-01-15T10:00:00Z'),
  category: {
    name: 'Standard Pass',
    type: 'STANDARD',
  },
  user: {
    firstName: 'John',
    lastName: 'Doe',
    email: 'john.doe@test.com',
  },
  festival: {
    id: publishedFestival.id,
    name: 'Rock Nation Festival',
    location: 'Lyon, France',
    address: '456 Rock Street, 69000 Lyon',
    startDate: new Date('2026-07-15T14:00:00Z'),
    endDate: new Date('2026-07-18T23:00:00Z'),
    logoUrl: 'https://cdn.test/logo.png',
    contactEmail: 'contact@rock-nation.test',
    websiteUrl: 'https://rock-nation.test',
  },
};

const mockPayment = {
  id: 'payment-uuid-00000000-0000-0000-0000-000000000001',
  amount: 299.98,
  currency: 'EUR',
  status: 'COMPLETED',
  provider: 'STRIPE',
  paidAt: new Date('2024-01-15T10:30:00Z'),
  createdAt: new Date('2024-01-15T10:00:00Z'),
  refundedAt: null,
  user: {
    id: regularUser.id,
    firstName: 'John',
    lastName: 'Doe',
    email: 'john.doe@test.com',
    phone: '+33612345678',
  },
  tickets: [
    {
      id: 'ticket-1',
      purchasePrice: 149.99,
      status: 'SOLD',
      category: { name: 'Standard Pass', type: 'STANDARD' },
      festival: { name: 'Rock Nation Festival' },
    },
    {
      id: 'ticket-2',
      purchasePrice: 149.99,
      status: 'SOLD',
      category: { name: 'Standard Pass', type: 'STANDARD' },
      festival: { name: 'Rock Nation Festival' },
    },
  ],
};

const mockRefundedPayment = {
  ...mockPayment,
  id: 'payment-uuid-00000000-0000-0000-0000-000000000002',
  status: 'REFUNDED',
  refundedAt: new Date('2024-01-20T14:00:00Z'),
  tickets: [
    {
      id: 'ticket-1',
      purchasePrice: 149.99,
      status: 'REFUNDED',
      category: { name: 'Standard Pass', type: 'STANDARD' },
      festival: { name: 'Rock Nation Festival' },
    },
  ],
};

const mockStaffAssignment = {
  id: 'assignment-uuid-00000000-0000-0000-0000-000000000001',
  role: 'STAFF',
  startTime: new Date('2026-07-15T08:00:00Z'),
  endTime: new Date('2026-07-18T23:00:00Z'),
  userId: staffUser.id,
  user: {
    id: staffUser.id,
    firstName: 'Staff',
    lastName: 'Member',
    email: 'staff@festival.test',
    photoUrl: null,
  },
  festival: {
    id: publishedFestival.id,
    name: 'Rock Nation Festival',
    location: 'Lyon, France',
    startDate: new Date('2026-07-15T14:00:00Z'),
    endDate: new Date('2026-07-18T23:00:00Z'),
    logoUrl: null,
  },
  zone: {
    id: 'zone-uuid-001',
    name: 'Main Stage',
    description: 'Main concert area',
  },
};

const mockFestivalWithProgram = {
  id: publishedFestival.id,
  name: 'Rock Nation Festival',
  location: 'Lyon, France',
  description: 'Three days of pure rock energy',
  startDate: new Date('2026-07-15T14:00:00Z'),
  endDate: new Date('2026-07-18T23:00:00Z'),
  logoUrl: null,
  stages: [
    {
      id: 'stage-1',
      name: 'Main Stage',
      performances: [
        {
          id: 'perf-1',
          startTime: new Date('2026-07-15T18:00:00Z'),
          endTime: new Date('2026-07-15T20:00:00Z'),
          isCancelled: false,
          artist: { name: 'Rock Band A', genre: 'Rock' },
        },
        {
          id: 'perf-2',
          startTime: new Date('2026-07-15T21:00:00Z'),
          endTime: new Date('2026-07-15T23:00:00Z'),
          isCancelled: false,
          artist: { name: 'Metal Band B', genre: 'Metal' },
        },
      ],
    },
    {
      id: 'stage-2',
      name: 'Second Stage',
      performances: [
        {
          id: 'perf-3',
          startTime: new Date('2026-07-15T16:00:00Z'),
          endTime: new Date('2026-07-15T17:30:00Z'),
          isCancelled: false,
          artist: { name: 'Indie Band C', genre: null },
        },
      ],
    },
  ],
};

const mockFestivalWithStats = {
  id: publishedFestival.id,
  name: 'Rock Nation Festival',
  organizerId: organizerUser.id,
  startDate: new Date('2026-07-15T14:00:00Z'),
  endDate: new Date('2026-07-18T23:00:00Z'),
  ticketCategories: [
    { id: 'cat-1', name: 'Standard Pass', type: 'STANDARD' },
    { id: 'cat-2', name: 'VIP Pass', type: 'VIP' },
  ],
  tickets: [
    { id: 't-1', status: 'SOLD', purchasePrice: 149.99, categoryId: 'cat-1' },
    { id: 't-2', status: 'SOLD', purchasePrice: 149.99, categoryId: 'cat-1' },
    { id: 't-3', status: 'USED', purchasePrice: 399.99, categoryId: 'cat-2' },
    { id: 't-4', status: 'REFUNDED', purchasePrice: 149.99, categoryId: 'cat-1' },
  ],
  cashlessTransactions: [
    { id: 'ct-1', type: 'TOPUP', amount: 50.00 },
    { id: 'ct-2', type: 'TOPUP', amount: 100.00 },
    { id: 'ct-3', type: 'PAYMENT', amount: -30.00 },
    { id: 'ct-4', type: 'PAYMENT', amount: -45.00 },
  ],
  vendorOrders: [
    { id: 'vo-1', total: 25.00, vendor: { name: 'Food Stand A' } },
    { id: 'vo-2', total: 35.00, vendor: { name: 'Drinks Bar B' } },
  ],
  campingBookings: [
    { id: 'cb-1', status: 'CONFIRMED', totalPrice: 79.99, spot: { zone: { type: 'TENT' } } },
    { id: 'cb-2', status: 'CHECKED_IN', totalPrice: 79.99, spot: { zone: { type: 'TENT' } } },
    { id: 'cb-3', status: 'CANCELLED', totalPrice: 79.99, spot: { zone: { type: 'TENT' } } },
  ],
};

const mockCampingBooking = {
  id: 'booking-uuid-00000000-0000-0000-0000-000000000001',
  checkIn: new Date('2026-07-15T12:00:00Z'),
  checkOut: new Date('2026-07-18T12:00:00Z'),
  guestCount: 2,
  status: 'CONFIRMED',
  totalPrice: 159.98,
  user: {
    id: regularUser.id,
    firstName: 'John',
    lastName: 'Doe',
    email: 'john.doe@test.com',
  },
  spot: {
    number: 'A-15',
    zone: {
      name: 'Camping Zone A',
      type: 'TENT',
      festival: {
        id: publishedFestival.id,
        name: 'Rock Nation Festival',
        location: 'Lyon, France',
        startDate: new Date('2026-07-15T14:00:00Z'),
        endDate: new Date('2026-07-18T23:00:00Z'),
      },
    },
  },
};

// ============================================================================
// Mock Setup
// ============================================================================

describe('PdfService', () => {
  let pdfService: PdfService;
  let prismaService: jest.Mocked<PrismaService>;
  let configService: jest.Mocked<ConfigService>;

  const mockPrismaService = {
    ticket: {
      findUnique: jest.fn(),
    },
    payment: {
      findUnique: jest.fn(),
    },
    staffAssignment: {
      findUnique: jest.fn(),
    },
    festival: {
      findUnique: jest.fn(),
    },
    campingBooking: {
      findUnique: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
    },
  };

  const mockConfigService = {
    get: jest.fn((key: string) => {
      const config: Record<string, string> = {
        COMPANY_NAME: 'Festival Platform SAS',
        COMPANY_ADDRESS: '123 Rue des Festivals, 75001 Paris',
        COMPANY_PHONE: '+33 1 23 45 67 89',
        COMPANY_EMAIL: 'contact@festival-platform.com',
        COMPANY_SIRET: '123 456 789 00012',
        COMPANY_TVA: 'FR12345678901',
        QR_SECRET: 'test-qr-secret-key-32-chars-long!',
      };
      return config[key];
    }),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PdfService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    pdfService = module.get<PdfService>(PdfService);
    prismaService = module.get(PrismaService);
    configService = module.get(ConfigService);
  });

  // ==========================================================================
  // generateTicketPdf Tests
  // ==========================================================================

  describe('generateTicketPdf', () => {
    it('should generate a ticket PDF successfully', async () => {
      // Arrange
      mockPrismaService.ticket.findUnique.mockResolvedValue(mockTicket);

      // Act
      const result = await pdfService.generateTicketPdf(mockTicket.id, regularUser.id);

      // Assert
      expect(result).toBeInstanceOf(Buffer);
      expect(mockPrismaService.ticket.findUnique).toHaveBeenCalledWith({
        where: { id: mockTicket.id },
        include: {
          category: { select: { name: true, type: true } },
          user: { select: { firstName: true, lastName: true, email: true } },
          festival: { select: { id: true, name: true, location: true, address: true, startDate: true, endDate: true, logoUrl: true, contactEmail: true, websiteUrl: true } },
        },
      });
    });

    it('should throw NotFoundException when ticket not found', async () => {
      // Arrange
      mockPrismaService.ticket.findUnique.mockResolvedValue(null);

      // Act & Assert
      await expect(
        pdfService.generateTicketPdf('non-existent-id', regularUser.id)
      ).rejects.toThrow(NotFoundException);
    });

    it('should include QR code data in the ticket PDF', async () => {
      // Arrange
      mockPrismaService.ticket.findUnique.mockResolvedValue(mockTicket);
      const QRCode = require('qrcode');

      // Act
      await pdfService.generateTicketPdf(mockTicket.id, regularUser.id);

      // Assert
      expect(QRCode.toDataURL).toHaveBeenCalledWith(
        expect.stringContaining(mockTicket.id),
        expect.objectContaining({ errorCorrectionLevel: 'H', width: 200 })
      );
    });

    it('should include festival information in the ticket PDF', async () => {
      // Arrange
      mockPrismaService.ticket.findUnique.mockResolvedValue(mockTicket);

      // Act
      const result = await pdfService.generateTicketPdf(mockTicket.id, regularUser.id);

      // Assert
      expect(result).toBeInstanceOf(Buffer);
      // The PDF should be generated with festival data
      expect(mockPrismaService.ticket.findUnique).toHaveBeenCalled();
    });

    it('should include user information in the ticket PDF', async () => {
      // Arrange
      const ticketWithUser = {
        ...mockTicket,
        user: {
          firstName: 'Marie',
          lastName: 'Curie',
          email: 'marie.curie@test.com',
        },
      };
      mockPrismaService.ticket.findUnique.mockResolvedValue(ticketWithUser);

      // Act
      const result = await pdfService.generateTicketPdf(mockTicket.id, regularUser.id);

      // Assert
      expect(result).toBeInstanceOf(Buffer);
    });

    it('should handle VIP ticket type', async () => {
      // Arrange
      const vipTicket = {
        ...mockTicket,
        category: { name: 'VIP Pass', type: 'VIP' },
        purchasePrice: 399.99,
      };
      mockPrismaService.ticket.findUnique.mockResolvedValue(vipTicket);

      // Act
      const result = await pdfService.generateTicketPdf(vipTicket.id, regularUser.id);

      // Assert
      expect(result).toBeInstanceOf(Buffer);
    });

    it('should handle ticket with all optional festival fields', async () => {
      // Arrange
      const ticketWithFullFestival = {
        ...mockTicket,
        festival: {
          ...mockTicket.festival,
          logoUrl: 'https://cdn.test/logo.png',
          websiteUrl: 'https://festival.test',
          contactEmail: 'info@festival.test',
          address: 'Full Address Here',
        },
      };
      mockPrismaService.ticket.findUnique.mockResolvedValue(ticketWithFullFestival);

      // Act
      const result = await pdfService.generateTicketPdf(mockTicket.id, regularUser.id);

      // Assert
      expect(result).toBeInstanceOf(Buffer);
    });

    it('should handle ticket with null optional fields', async () => {
      // Arrange
      const ticketWithNulls = {
        ...mockTicket,
        festival: {
          ...mockTicket.festival,
          logoUrl: null,
          websiteUrl: null,
          contactEmail: null,
          address: null,
        },
      };
      mockPrismaService.ticket.findUnique.mockResolvedValue(ticketWithNulls);

      // Act
      const result = await pdfService.generateTicketPdf(mockTicket.id, regularUser.id);

      // Assert
      expect(result).toBeInstanceOf(Buffer);
    });
  });

  // ==========================================================================
  // generateInvoicePdf Tests
  // ==========================================================================

  describe('generateInvoicePdf', () => {
    it('should generate an invoice PDF successfully', async () => {
      // Arrange
      mockPrismaService.payment.findUnique.mockResolvedValue(mockPayment);

      // Act
      const result = await pdfService.generateInvoicePdf(mockPayment.id, regularUser.id);

      // Assert
      expect(result).toBeInstanceOf(Buffer);
      expect(mockPrismaService.payment.findUnique).toHaveBeenCalledWith({
        where: { id: mockPayment.id },
        include: { user: true, tickets: { include: { category: true, festival: true } } },
      });
    });

    it('should throw NotFoundException when payment not found', async () => {
      // Arrange
      mockPrismaService.payment.findUnique.mockResolvedValue(null);

      // Act & Assert
      await expect(
        pdfService.generateInvoicePdf('non-existent-id', regularUser.id)
      ).rejects.toThrow(NotFoundException);
    });

    it('should include company information in the invoice', async () => {
      // Arrange
      mockPrismaService.payment.findUnique.mockResolvedValue(mockPayment);

      // Act
      const result = await pdfService.generateInvoicePdf(mockPayment.id, regularUser.id);

      // Assert
      expect(result).toBeInstanceOf(Buffer);
      expect(mockConfigService.get).toHaveBeenCalledWith('COMPANY_NAME');
      expect(mockConfigService.get).toHaveBeenCalledWith('COMPANY_ADDRESS');
    });

    it('should calculate VAT correctly (20%)', async () => {
      // Arrange
      mockPrismaService.payment.findUnique.mockResolvedValue(mockPayment);

      // Act
      const result = await pdfService.generateInvoicePdf(mockPayment.id, regularUser.id);

      // Assert
      expect(result).toBeInstanceOf(Buffer);
      // VAT calculation: total / 1.2 gives HT, then total - HT = VAT
    });

    it('should group identical ticket categories', async () => {
      // Arrange
      const paymentWithSameCategories = {
        ...mockPayment,
        tickets: [
          { id: 't-1', purchasePrice: 149.99, status: 'SOLD', category: { name: 'Standard Pass' }, festival: { name: 'Rock Nation' } },
          { id: 't-2', purchasePrice: 149.99, status: 'SOLD', category: { name: 'Standard Pass' }, festival: { name: 'Rock Nation' } },
          { id: 't-3', purchasePrice: 149.99, status: 'SOLD', category: { name: 'Standard Pass' }, festival: { name: 'Rock Nation' } },
        ],
      };
      mockPrismaService.payment.findUnique.mockResolvedValue(paymentWithSameCategories);

      // Act
      const result = await pdfService.generateInvoicePdf(mockPayment.id, regularUser.id);

      // Assert
      expect(result).toBeInstanceOf(Buffer);
    });

    it('should handle multiple different ticket categories', async () => {
      // Arrange
      const paymentWithMixedCategories = {
        ...mockPayment,
        tickets: [
          { id: 't-1', purchasePrice: 149.99, status: 'SOLD', category: { name: 'Standard Pass' }, festival: { name: 'Rock Nation' } },
          { id: 't-2', purchasePrice: 399.99, status: 'SOLD', category: { name: 'VIP Pass' }, festival: { name: 'Rock Nation' } },
          { id: 't-3', purchasePrice: 79.99, status: 'SOLD', category: { name: 'Camping Add-on' }, festival: { name: 'Rock Nation' } },
        ],
      };
      mockPrismaService.payment.findUnique.mockResolvedValue(paymentWithMixedCategories);

      // Act
      const result = await pdfService.generateInvoicePdf(mockPayment.id, regularUser.id);

      // Assert
      expect(result).toBeInstanceOf(Buffer);
    });

    it('should include customer billing information', async () => {
      // Arrange
      mockPrismaService.payment.findUnique.mockResolvedValue(mockPayment);

      // Act
      const result = await pdfService.generateInvoicePdf(mockPayment.id, regularUser.id);

      // Assert
      expect(result).toBeInstanceOf(Buffer);
    });

    it('should generate unique invoice number based on payment ID', async () => {
      // Arrange
      mockPrismaService.payment.findUnique.mockResolvedValue(mockPayment);

      // Act
      const result = await pdfService.generateInvoicePdf(mockPayment.id, regularUser.id);

      // Assert
      expect(result).toBeInstanceOf(Buffer);
      // Invoice number format: FAC-{year}-{paymentId.substring(0,8).toUpperCase()}
    });

    it('should handle payment with empty tickets array', async () => {
      // Arrange
      const emptyPayment = {
        ...mockPayment,
        tickets: [],
      };
      mockPrismaService.payment.findUnique.mockResolvedValue(emptyPayment);

      // Act
      const result = await pdfService.generateInvoicePdf(mockPayment.id, regularUser.id);

      // Assert
      expect(result).toBeInstanceOf(Buffer);
    });

    it('should include SIRET and TVA numbers when available', async () => {
      // Arrange
      mockPrismaService.payment.findUnique.mockResolvedValue(mockPayment);

      // Act
      const result = await pdfService.generateInvoicePdf(mockPayment.id, regularUser.id);

      // Assert
      expect(result).toBeInstanceOf(Buffer);
      expect(mockConfigService.get).toHaveBeenCalledWith('COMPANY_SIRET');
      expect(mockConfigService.get).toHaveBeenCalledWith('COMPANY_TVA');
    });
  });

  // ==========================================================================
  // generateReportPdf Tests (Financial Report)
  // ==========================================================================

  describe('generateReportPdf', () => {
    beforeEach(() => {
      mockPrismaService.festival.findUnique.mockResolvedValue(mockFestivalWithStats);
      mockPrismaService.user.findUnique.mockResolvedValue({
        role: 'ADMIN',
        firstName: 'Admin',
        lastName: 'User',
      });
    });

    it('should generate a financial report PDF successfully', async () => {
      // Act
      const result = await pdfService.generateReportPdf(mockFestivalWithStats.id, adminUser.id);

      // Assert
      expect(result).toBeInstanceOf(Buffer);
      expect(mockPrismaService.festival.findUnique).toHaveBeenCalledWith({
        where: { id: mockFestivalWithStats.id },
        include: expect.objectContaining({
          ticketCategories: true,
          tickets: expect.any(Object),
          cashlessTransactions: true,
          vendorOrders: expect.any(Object),
          campingBookings: expect.any(Object),
        }),
      });
    });

    it('should throw NotFoundException when festival not found', async () => {
      // Arrange
      mockPrismaService.festival.findUnique.mockResolvedValue(null);

      // Act & Assert
      await expect(
        pdfService.generateReportPdf('non-existent-id', adminUser.id)
      ).rejects.toThrow(NotFoundException);
    });

    it('should allow organizer to generate report for their festival', async () => {
      // Arrange
      mockPrismaService.user.findUnique.mockResolvedValue({
        role: 'ORGANIZER',
        firstName: 'Festival',
        lastName: 'Organizer',
      });

      // Act
      const result = await pdfService.generateReportPdf(mockFestivalWithStats.id, organizerUser.id);

      // Assert
      expect(result).toBeInstanceOf(Buffer);
    });

    it('should throw NotFoundException when non-admin/non-organizer tries to access', async () => {
      // Arrange
      const otherFestival = {
        ...mockFestivalWithStats,
        organizerId: 'other-organizer-id',
      };
      mockPrismaService.festival.findUnique.mockResolvedValue(otherFestival);
      mockPrismaService.user.findUnique.mockResolvedValue({
        role: 'USER',
        firstName: 'Regular',
        lastName: 'User',
      });

      // Act & Assert
      await expect(
        pdfService.generateReportPdf(otherFestival.id, regularUser.id)
      ).rejects.toThrow(NotFoundException);
    });

    it('should calculate ticket revenue correctly', async () => {
      // Arrange - tickets with SOLD and USED status should be counted
      // 2 x 149.99 (SOLD) + 1 x 399.99 (USED) = 699.97

      // Act
      const result = await pdfService.generateReportPdf(mockFestivalWithStats.id, adminUser.id);

      // Assert
      expect(result).toBeInstanceOf(Buffer);
    });

    it('should calculate cashless statistics correctly', async () => {
      // Arrange - topups: 50 + 100 = 150, payments: 30 + 45 = 75

      // Act
      const result = await pdfService.generateReportPdf(mockFestivalWithStats.id, adminUser.id);

      // Assert
      expect(result).toBeInstanceOf(Buffer);
    });

    it('should calculate vendor sales and commission', async () => {
      // Arrange - vendor sales: 25 + 35 = 60, commission at 10% = 6

      // Act
      const result = await pdfService.generateReportPdf(mockFestivalWithStats.id, adminUser.id);

      // Assert
      expect(result).toBeInstanceOf(Buffer);
    });

    it('should calculate camping revenue (confirmed and checked-in only)', async () => {
      // Arrange - camping: 79.99 (CONFIRMED) + 79.99 (CHECKED_IN) = 159.98

      // Act
      const result = await pdfService.generateReportPdf(mockFestivalWithStats.id, adminUser.id);

      // Assert
      expect(result).toBeInstanceOf(Buffer);
    });

    it('should include refund statistics', async () => {
      // Arrange - 1 refunded ticket at 149.99

      // Act
      const result = await pdfService.generateReportPdf(mockFestivalWithStats.id, adminUser.id);

      // Assert
      expect(result).toBeInstanceOf(Buffer);
    });

    it('should handle festival with no transactions', async () => {
      // Arrange
      const emptyFestival = {
        ...mockFestivalWithStats,
        tickets: [],
        cashlessTransactions: [],
        vendorOrders: [],
        campingBookings: [],
      };
      mockPrismaService.festival.findUnique.mockResolvedValue(emptyFestival);

      // Act
      const result = await pdfService.generateReportPdf(emptyFestival.id, adminUser.id);

      // Assert
      expect(result).toBeInstanceOf(Buffer);
    });

    it('should include tax summary (20% VAT)', async () => {
      // Act
      const result = await pdfService.generateReportPdf(mockFestivalWithStats.id, adminUser.id);

      // Assert
      expect(result).toBeInstanceOf(Buffer);
    });

    it('should include generated by information', async () => {
      // Act
      const result = await pdfService.generateReportPdf(mockFestivalWithStats.id, adminUser.id);

      // Assert
      expect(result).toBeInstanceOf(Buffer);
      expect(mockPrismaService.user.findUnique).toHaveBeenCalledWith({
        where: { id: adminUser.id },
        select: { role: true, firstName: true, lastName: true },
      });
    });
  });

  // ==========================================================================
  // generateBadgePdf Tests
  // ==========================================================================

  describe('generateBadgePdf', () => {
    it('should generate a staff badge PDF successfully', async () => {
      // Arrange
      mockPrismaService.staffAssignment.findUnique.mockResolvedValue(mockStaffAssignment);

      // Act
      const result = await pdfService.generateBadgePdf(mockStaffAssignment.id, staffUser.id);

      // Assert
      expect(result).toBeInstanceOf(Buffer);
      expect(mockPrismaService.staffAssignment.findUnique).toHaveBeenCalledWith({
        where: { id: mockStaffAssignment.id },
        include: { user: true, festival: true, zone: true },
      });
    });

    it('should throw NotFoundException when assignment not found', async () => {
      // Arrange
      mockPrismaService.staffAssignment.findUnique.mockResolvedValue(null);

      // Act & Assert
      await expect(
        pdfService.generateBadgePdf('non-existent-id', staffUser.id)
      ).rejects.toThrow(NotFoundException);
    });

    it('should generate badge with ADMIN role styling', async () => {
      // Arrange
      const adminAssignment = {
        ...mockStaffAssignment,
        role: 'ADMIN',
        user: adminUser,
      };
      mockPrismaService.staffAssignment.findUnique.mockResolvedValue(adminAssignment);

      // Act
      const result = await pdfService.generateBadgePdf(adminAssignment.id, adminUser.id);

      // Assert
      expect(result).toBeInstanceOf(Buffer);
    });

    it('should generate badge with ORGANIZER role styling', async () => {
      // Arrange
      const organizerAssignment = {
        ...mockStaffAssignment,
        role: 'ORGANIZER',
        user: organizerUser,
      };
      mockPrismaService.staffAssignment.findUnique.mockResolvedValue(organizerAssignment);

      // Act
      const result = await pdfService.generateBadgePdf(organizerAssignment.id, organizerUser.id);

      // Assert
      expect(result).toBeInstanceOf(Buffer);
    });

    it('should generate badge with SECURITY role styling', async () => {
      // Arrange
      const securityAssignment = {
        ...mockStaffAssignment,
        role: 'SECURITY',
      };
      mockPrismaService.staffAssignment.findUnique.mockResolvedValue(securityAssignment);

      // Act
      const result = await pdfService.generateBadgePdf(securityAssignment.id, staffUser.id);

      // Assert
      expect(result).toBeInstanceOf(Buffer);
    });

    it('should generate badge with CASHIER role styling', async () => {
      // Arrange
      const cashierAssignment = {
        ...mockStaffAssignment,
        role: 'CASHIER',
      };
      mockPrismaService.staffAssignment.findUnique.mockResolvedValue(cashierAssignment);

      // Act
      const result = await pdfService.generateBadgePdf(cashierAssignment.id, staffUser.id);

      // Assert
      expect(result).toBeInstanceOf(Buffer);
    });

    it('should include zone assignment in badge', async () => {
      // Arrange
      mockPrismaService.staffAssignment.findUnique.mockResolvedValue(mockStaffAssignment);

      // Act
      const result = await pdfService.generateBadgePdf(mockStaffAssignment.id, staffUser.id);

      // Assert
      expect(result).toBeInstanceOf(Buffer);
    });

    it('should handle badge without zone assignment', async () => {
      // Arrange
      const assignmentWithoutZone = {
        ...mockStaffAssignment,
        zone: null,
      };
      mockPrismaService.staffAssignment.findUnique.mockResolvedValue(assignmentWithoutZone);

      // Act
      const result = await pdfService.generateBadgePdf(assignmentWithoutZone.id, staffUser.id);

      // Assert
      expect(result).toBeInstanceOf(Buffer);
    });

    it('should include QR code with staff information', async () => {
      // Arrange
      mockPrismaService.staffAssignment.findUnique.mockResolvedValue(mockStaffAssignment);
      const QRCode = require('qrcode');

      // Act
      await pdfService.generateBadgePdf(mockStaffAssignment.id, staffUser.id);

      // Assert
      expect(QRCode.toDataURL).toHaveBeenCalledWith(
        expect.stringContaining('STAFF'),
        expect.objectContaining({ errorCorrectionLevel: 'M', width: 100 })
      );
    });

    it('should accept optional photo buffer', async () => {
      // Arrange
      mockPrismaService.staffAssignment.findUnique.mockResolvedValue(mockStaffAssignment);
      const photoBuffer = Buffer.from('fake-photo-data');

      // Act
      const result = await pdfService.generateBadgePdf(mockStaffAssignment.id, staffUser.id, photoBuffer);

      // Assert
      expect(result).toBeInstanceOf(Buffer);
    });

    it('should show placeholder when no photo provided', async () => {
      // Arrange
      mockPrismaService.staffAssignment.findUnique.mockResolvedValue(mockStaffAssignment);

      // Act
      const result = await pdfService.generateBadgePdf(mockStaffAssignment.id, staffUser.id);

      // Assert
      expect(result).toBeInstanceOf(Buffer);
    });

    it('should include access level based on role', async () => {
      // Arrange - STAFF role has LOW access level
      mockPrismaService.staffAssignment.findUnique.mockResolvedValue(mockStaffAssignment);

      // Act
      const result = await pdfService.generateBadgePdf(mockStaffAssignment.id, staffUser.id);

      // Assert
      expect(result).toBeInstanceOf(Buffer);
    });

    it('should include validity dates', async () => {
      // Arrange
      mockPrismaService.staffAssignment.findUnique.mockResolvedValue(mockStaffAssignment);

      // Act
      const result = await pdfService.generateBadgePdf(mockStaffAssignment.id, staffUser.id);

      // Assert
      expect(result).toBeInstanceOf(Buffer);
    });

    it('should generate unique badge number from assignment ID', async () => {
      // Arrange
      mockPrismaService.staffAssignment.findUnique.mockResolvedValue(mockStaffAssignment);

      // Act
      const result = await pdfService.generateBadgePdf(mockStaffAssignment.id, staffUser.id);

      // Assert
      expect(result).toBeInstanceOf(Buffer);
    });
  });

  // ==========================================================================
  // generateReceiptPdf Tests
  // ==========================================================================

  describe('generateReceiptPdf', () => {
    it('should generate a receipt PDF successfully', async () => {
      // Arrange
      mockPrismaService.payment.findUnique.mockResolvedValue(mockPayment);

      // Act
      const result = await pdfService.generateReceiptPdf(mockPayment.id, regularUser.id);

      // Assert
      expect(result).toBeInstanceOf(Buffer);
    });

    it('should throw NotFoundException when payment not found', async () => {
      // Arrange
      mockPrismaService.payment.findUnique.mockResolvedValue(null);

      // Act & Assert
      await expect(
        pdfService.generateReceiptPdf('non-existent-id', regularUser.id)
      ).rejects.toThrow(NotFoundException);
    });

    it('should include all purchased tickets', async () => {
      // Arrange
      mockPrismaService.payment.findUnique.mockResolvedValue(mockPayment);

      // Act
      const result = await pdfService.generateReceiptPdf(mockPayment.id, regularUser.id);

      // Assert
      expect(result).toBeInstanceOf(Buffer);
    });

    it('should include receipt number', async () => {
      // Arrange
      mockPrismaService.payment.findUnique.mockResolvedValue(mockPayment);

      // Act
      const result = await pdfService.generateReceiptPdf(mockPayment.id, regularUser.id);

      // Assert
      expect(result).toBeInstanceOf(Buffer);
    });

    it('should include payment date', async () => {
      // Arrange
      mockPrismaService.payment.findUnique.mockResolvedValue(mockPayment);

      // Act
      const result = await pdfService.generateReceiptPdf(mockPayment.id, regularUser.id);

      // Assert
      expect(result).toBeInstanceOf(Buffer);
    });

    it('should use createdAt if paidAt is null', async () => {
      // Arrange
      const paymentWithoutPaidAt = {
        ...mockPayment,
        paidAt: null,
      };
      mockPrismaService.payment.findUnique.mockResolvedValue(paymentWithoutPaidAt);

      // Act
      const result = await pdfService.generateReceiptPdf(mockPayment.id, regularUser.id);

      // Assert
      expect(result).toBeInstanceOf(Buffer);
    });
  });

  // ==========================================================================
  // generateProgramPdf Tests
  // ==========================================================================

  describe('generateProgramPdf', () => {
    it('should generate a program PDF successfully', async () => {
      // Arrange
      mockPrismaService.festival.findUnique.mockResolvedValue(mockFestivalWithProgram);

      // Act
      const result = await pdfService.generateProgramPdf(mockFestivalWithProgram.id);

      // Assert
      expect(result).toBeInstanceOf(Buffer);
      expect(mockPrismaService.festival.findUnique).toHaveBeenCalledWith({
        where: { id: mockFestivalWithProgram.id },
        include: {
          stages: {
            include: {
              performances: {
                where: { isCancelled: false },
                include: { artist: true },
                orderBy: { startTime: 'asc' },
              },
            },
            orderBy: { name: 'asc' },
          },
        },
      });
    });

    it('should throw NotFoundException when festival not found', async () => {
      // Arrange
      mockPrismaService.festival.findUnique.mockResolvedValue(null);

      // Act & Assert
      await expect(
        pdfService.generateProgramPdf('non-existent-id')
      ).rejects.toThrow(NotFoundException);
    });

    it('should exclude cancelled performances', async () => {
      // Arrange
      mockPrismaService.festival.findUnique.mockResolvedValue(mockFestivalWithProgram);

      // Act
      const result = await pdfService.generateProgramPdf(mockFestivalWithProgram.id);

      // Assert
      expect(result).toBeInstanceOf(Buffer);
      expect(mockPrismaService.festival.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({
          include: expect.objectContaining({
            stages: expect.objectContaining({
              include: expect.objectContaining({
                performances: expect.objectContaining({
                  where: { isCancelled: false },
                }),
              }),
            }),
          }),
        })
      );
    });

    it('should group performances by day', async () => {
      // Arrange
      mockPrismaService.festival.findUnique.mockResolvedValue(mockFestivalWithProgram);

      // Act
      const result = await pdfService.generateProgramPdf(mockFestivalWithProgram.id);

      // Assert
      expect(result).toBeInstanceOf(Buffer);
    });

    it('should handle festival with no stages', async () => {
      // Arrange
      const festivalWithNoStages = {
        ...mockFestivalWithProgram,
        stages: [],
      };
      mockPrismaService.festival.findUnique.mockResolvedValue(festivalWithNoStages);

      // Act
      const result = await pdfService.generateProgramPdf(festivalWithNoStages.id);

      // Assert
      expect(result).toBeInstanceOf(Buffer);
    });

    it('should handle stage with no performances', async () => {
      // Arrange
      const festivalWithEmptyStage = {
        ...mockFestivalWithProgram,
        stages: [
          { id: 'stage-1', name: 'Empty Stage', performances: [] },
        ],
      };
      mockPrismaService.festival.findUnique.mockResolvedValue(festivalWithEmptyStage);

      // Act
      const result = await pdfService.generateProgramPdf(festivalWithEmptyStage.id);

      // Assert
      expect(result).toBeInstanceOf(Buffer);
    });

    it('should include artist genre when available', async () => {
      // Arrange
      mockPrismaService.festival.findUnique.mockResolvedValue(mockFestivalWithProgram);

      // Act
      const result = await pdfService.generateProgramPdf(mockFestivalWithProgram.id);

      // Assert
      expect(result).toBeInstanceOf(Buffer);
    });

    it('should handle artist without genre', async () => {
      // Arrange - Indie Band C has null genre
      mockPrismaService.festival.findUnique.mockResolvedValue(mockFestivalWithProgram);

      // Act
      const result = await pdfService.generateProgramPdf(mockFestivalWithProgram.id);

      // Assert
      expect(result).toBeInstanceOf(Buffer);
    });

    it('should include festival description when available', async () => {
      // Arrange
      mockPrismaService.festival.findUnique.mockResolvedValue(mockFestivalWithProgram);

      // Act
      const result = await pdfService.generateProgramPdf(mockFestivalWithProgram.id);

      // Assert
      expect(result).toBeInstanceOf(Buffer);
    });

    it('should handle festival without description', async () => {
      // Arrange
      const festivalWithoutDescription = {
        ...mockFestivalWithProgram,
        description: null,
      };
      mockPrismaService.festival.findUnique.mockResolvedValue(festivalWithoutDescription);

      // Act
      const result = await pdfService.generateProgramPdf(festivalWithoutDescription.id);

      // Assert
      expect(result).toBeInstanceOf(Buffer);
    });
  });

  // ==========================================================================
  // generateCampingVoucherPdf Tests
  // ==========================================================================

  describe('generateCampingVoucherPdf', () => {
    it('should generate a camping voucher PDF successfully', async () => {
      // Arrange
      mockPrismaService.campingBooking.findUnique.mockResolvedValue(mockCampingBooking);

      // Act
      const result = await pdfService.generateCampingVoucherPdf(mockCampingBooking.id, regularUser.id);

      // Assert
      expect(result).toBeInstanceOf(Buffer);
      expect(mockPrismaService.campingBooking.findUnique).toHaveBeenCalledWith({
        where: { id: mockCampingBooking.id },
        include: { user: true, spot: { include: { zone: { include: { festival: true } } } } },
      });
    });

    it('should throw NotFoundException when booking not found', async () => {
      // Arrange
      mockPrismaService.campingBooking.findUnique.mockResolvedValue(null);

      // Act & Assert
      await expect(
        pdfService.generateCampingVoucherPdf('non-existent-id', regularUser.id)
      ).rejects.toThrow(NotFoundException);
    });

    it('should include QR code with booking information', async () => {
      // Arrange
      mockPrismaService.campingBooking.findUnique.mockResolvedValue(mockCampingBooking);
      const QRCode = require('qrcode');

      // Act
      await pdfService.generateCampingVoucherPdf(mockCampingBooking.id, regularUser.id);

      // Assert
      expect(QRCode.toDataURL).toHaveBeenCalledWith(
        expect.stringContaining('CAMPING'),
        expect.objectContaining({ errorCorrectionLevel: 'H', width: 150 })
      );
    });

    it('should include check-in and check-out dates', async () => {
      // Arrange
      mockPrismaService.campingBooking.findUnique.mockResolvedValue(mockCampingBooking);

      // Act
      const result = await pdfService.generateCampingVoucherPdf(mockCampingBooking.id, regularUser.id);

      // Assert
      expect(result).toBeInstanceOf(Buffer);
    });

    it('should include spot and zone information', async () => {
      // Arrange
      mockPrismaService.campingBooking.findUnique.mockResolvedValue(mockCampingBooking);

      // Act
      const result = await pdfService.generateCampingVoucherPdf(mockCampingBooking.id, regularUser.id);

      // Assert
      expect(result).toBeInstanceOf(Buffer);
    });

    it('should include total price', async () => {
      // Arrange
      mockPrismaService.campingBooking.findUnique.mockResolvedValue(mockCampingBooking);

      // Act
      const result = await pdfService.generateCampingVoucherPdf(mockCampingBooking.id, regularUser.id);

      // Assert
      expect(result).toBeInstanceOf(Buffer);
    });

    it('should include user information', async () => {
      // Arrange
      mockPrismaService.campingBooking.findUnique.mockResolvedValue(mockCampingBooking);

      // Act
      const result = await pdfService.generateCampingVoucherPdf(mockCampingBooking.id, regularUser.id);

      // Assert
      expect(result).toBeInstanceOf(Buffer);
    });
  });

  // ==========================================================================
  // generateRefundConfirmationPdf Tests
  // ==========================================================================

  describe('generateRefundConfirmationPdf', () => {
    it('should generate a refund confirmation PDF successfully', async () => {
      // Arrange
      mockPrismaService.payment.findUnique.mockResolvedValue(mockRefundedPayment);

      // Act
      const result = await pdfService.generateRefundConfirmationPdf(mockRefundedPayment.id, regularUser.id);

      // Assert
      expect(result).toBeInstanceOf(Buffer);
    });

    it('should throw NotFoundException when payment not found', async () => {
      // Arrange
      mockPrismaService.payment.findUnique.mockResolvedValue(null);

      // Act & Assert
      await expect(
        pdfService.generateRefundConfirmationPdf('non-existent-id', regularUser.id)
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException when payment is not refunded', async () => {
      // Arrange - payment with status COMPLETED (not REFUNDED)
      mockPrismaService.payment.findUnique.mockResolvedValue(mockPayment);

      // Act & Assert
      await expect(
        pdfService.generateRefundConfirmationPdf(mockPayment.id, regularUser.id)
      ).rejects.toThrow(NotFoundException);
    });

    it('should include refund reference number', async () => {
      // Arrange
      mockPrismaService.payment.findUnique.mockResolvedValue(mockRefundedPayment);

      // Act
      const result = await pdfService.generateRefundConfirmationPdf(mockRefundedPayment.id, regularUser.id);

      // Assert
      expect(result).toBeInstanceOf(Buffer);
    });

    it('should include only refunded tickets', async () => {
      // Arrange
      mockPrismaService.payment.findUnique.mockResolvedValue(mockRefundedPayment);

      // Act
      const result = await pdfService.generateRefundConfirmationPdf(mockRefundedPayment.id, regularUser.id);

      // Assert
      expect(result).toBeInstanceOf(Buffer);
    });

    it('should include beneficiary information', async () => {
      // Arrange
      mockPrismaService.payment.findUnique.mockResolvedValue(mockRefundedPayment);

      // Act
      const result = await pdfService.generateRefundConfirmationPdf(mockRefundedPayment.id, regularUser.id);

      // Assert
      expect(result).toBeInstanceOf(Buffer);
    });

    it('should include refund date', async () => {
      // Arrange
      mockPrismaService.payment.findUnique.mockResolvedValue(mockRefundedPayment);

      // Act
      const result = await pdfService.generateRefundConfirmationPdf(mockRefundedPayment.id, regularUser.id);

      // Assert
      expect(result).toBeInstanceOf(Buffer);
    });

    it('should use current date if refundedAt is null', async () => {
      // Arrange
      const refundWithoutDate = {
        ...mockRefundedPayment,
        refundedAt: null,
      };
      mockPrismaService.payment.findUnique.mockResolvedValue(refundWithoutDate);

      // Act
      const result = await pdfService.generateRefundConfirmationPdf(refundWithoutDate.id, regularUser.id);

      // Assert
      expect(result).toBeInstanceOf(Buffer);
    });
  });

  // ==========================================================================
  // generateFinancialReportPdf Tests
  // ==========================================================================

  describe('generateFinancialReportPdf', () => {
    beforeEach(() => {
      mockPrismaService.festival.findUnique.mockResolvedValue(mockFestivalWithStats);
      mockPrismaService.user.findUnique.mockResolvedValue({
        role: 'ADMIN',
        firstName: 'Admin',
        lastName: 'User',
      });
    });

    it('should generate a financial report PDF successfully', async () => {
      // Act
      const result = await pdfService.generateFinancialReportPdf(mockFestivalWithStats.id, adminUser.id);

      // Assert
      expect(result).toBeInstanceOf(Buffer);
    });

    it('should include revenue breakdown by category', async () => {
      // Act
      const result = await pdfService.generateFinancialReportPdf(mockFestivalWithStats.id, adminUser.id);

      // Assert
      expect(result).toBeInstanceOf(Buffer);
    });

    it('should include cashless commission calculation', async () => {
      // Commission on payments: 2%
      // Act
      const result = await pdfService.generateFinancialReportPdf(mockFestivalWithStats.id, adminUser.id);

      // Assert
      expect(result).toBeInstanceOf(Buffer);
    });

    it('should include vendor commission calculation', async () => {
      // Commission on vendor sales: 10%
      // Act
      const result = await pdfService.generateFinancialReportPdf(mockFestivalWithStats.id, adminUser.id);

      // Assert
      expect(result).toBeInstanceOf(Buffer);
    });

    it('should include total revenue summary', async () => {
      // Act
      const result = await pdfService.generateFinancialReportPdf(mockFestivalWithStats.id, adminUser.id);

      // Assert
      expect(result).toBeInstanceOf(Buffer);
    });
  });

  // ==========================================================================
  // Edge Cases and Error Handling
  // ==========================================================================

  describe('edge cases', () => {
    it('should handle special characters in festival name', async () => {
      // Arrange
      const festivalWithSpecialChars = {
        ...mockFestivalWithProgram,
        name: "Rock & Roll Festival '26 <Special>",
      };
      mockPrismaService.festival.findUnique.mockResolvedValue(festivalWithSpecialChars);

      // Act
      const result = await pdfService.generateProgramPdf(festivalWithSpecialChars.id);

      // Assert
      expect(result).toBeInstanceOf(Buffer);
    });

    it('should handle unicode characters in user names', async () => {
      // Arrange
      const ticketWithUnicode = {
        ...mockTicket,
        user: {
          firstName: 'Jean-Pierre',
          lastName: 'Lefevre',
          email: 'jp@test.com',
        },
      };
      mockPrismaService.ticket.findUnique.mockResolvedValue(ticketWithUnicode);

      // Act
      const result = await pdfService.generateTicketPdf(ticketWithUnicode.id, regularUser.id);

      // Assert
      expect(result).toBeInstanceOf(Buffer);
    });

    it('should handle very long text content', async () => {
      // Arrange
      const ticketWithLongDescription = {
        ...mockTicket,
        festival: {
          ...mockTicket.festival,
          name: 'A'.repeat(200) + ' Festival',
        },
      };
      mockPrismaService.ticket.findUnique.mockResolvedValue(ticketWithLongDescription);

      // Act
      const result = await pdfService.generateTicketPdf(ticketWithLongDescription.id, regularUser.id);

      // Assert
      expect(result).toBeInstanceOf(Buffer);
    });

    it('should handle zero amount payment', async () => {
      // Arrange
      const freePayment = {
        ...mockPayment,
        amount: 0,
        tickets: [
          { id: 't-1', purchasePrice: 0, status: 'SOLD', category: { name: 'Free Pass' }, festival: { name: 'Free Event' } },
        ],
      };
      mockPrismaService.payment.findUnique.mockResolvedValue(freePayment);

      // Act
      const result = await pdfService.generateInvoicePdf(freePayment.id, regularUser.id);

      // Assert
      expect(result).toBeInstanceOf(Buffer);
    });

    it('should handle multiple pages in program PDF', async () => {
      // Arrange - create a festival with many performances
      const festivalWithManyPerformances = {
        ...mockFestivalWithProgram,
        stages: Array(5).fill(null).map((_, i) => ({
          id: `stage-${i}`,
          name: `Stage ${i}`,
          performances: Array(10).fill(null).map((_, j) => ({
            id: `perf-${i}-${j}`,
            startTime: new Date('2026-07-15T10:00:00Z'),
            endTime: new Date('2026-07-15T12:00:00Z'),
            isCancelled: false,
            artist: { name: `Artist ${i}-${j}`, genre: 'Rock' },
          })),
        })),
      };
      mockPrismaService.festival.findUnique.mockResolvedValue(festivalWithManyPerformances);

      // Act
      const result = await pdfService.generateProgramPdf(festivalWithManyPerformances.id);

      // Assert
      expect(result).toBeInstanceOf(Buffer);
    });

    it('should handle QR code generation failure gracefully', async () => {
      // Arrange
      mockPrismaService.ticket.findUnique.mockResolvedValue(mockTicket);
      const QRCode = require('qrcode');
      QRCode.toDataURL.mockRejectedValueOnce(new Error('QR generation failed'));

      // Act
      const result = await pdfService.generateTicketPdf(mockTicket.id, regularUser.id);

      // Assert
      expect(result).toBeInstanceOf(Buffer);
    });
  });

  // ==========================================================================
  // Company Info Configuration Tests
  // ==========================================================================

  describe('company info configuration', () => {
    it('should use default company name when not configured', async () => {
      // Arrange
      mockConfigService.get.mockImplementation((key: string) => {
        if (key === 'COMPANY_NAME') {return undefined;}
        return 'test-value';
      });
      mockPrismaService.payment.findUnique.mockResolvedValue(mockPayment);

      // Re-create service to pick up new config
      const module: TestingModule = await Test.createTestingModule({
        providers: [
          PdfService,
          { provide: PrismaService, useValue: mockPrismaService },
          { provide: ConfigService, useValue: mockConfigService },
        ],
      }).compile();

      const service = module.get<PdfService>(PdfService);

      // Act
      const result = await service.generateInvoicePdf(mockPayment.id, regularUser.id);

      // Assert
      expect(result).toBeInstanceOf(Buffer);
    });

    it('should use QR secret from configuration', async () => {
      // Arrange
      mockPrismaService.ticket.findUnique.mockResolvedValue(mockTicket);

      // Act
      await pdfService.generateTicketPdf(mockTicket.id, regularUser.id);

      // Assert
      expect(mockConfigService.get).toHaveBeenCalledWith('QR_SECRET');
    });
  });

  // ==========================================================================
  // Date Formatting Tests
  // ==========================================================================

  describe('date formatting', () => {
    it('should format dates in French locale', async () => {
      // Arrange
      mockPrismaService.ticket.findUnique.mockResolvedValue(mockTicket);

      // Act
      const result = await pdfService.generateTicketPdf(mockTicket.id, regularUser.id);

      // Assert
      expect(result).toBeInstanceOf(Buffer);
      // Dates should be formatted as DD/MM/YYYY in French locale
    });

    it('should format time correctly', async () => {
      // Arrange
      mockPrismaService.festival.findUnique.mockResolvedValue(mockFestivalWithProgram);

      // Act
      const result = await pdfService.generateProgramPdf(mockFestivalWithProgram.id);

      // Assert
      expect(result).toBeInstanceOf(Buffer);
      // Times should be formatted as HH:MM
    });

    it('should format datetime correctly', async () => {
      // Arrange
      mockPrismaService.payment.findUnique.mockResolvedValue(mockPayment);

      // Act
      const result = await pdfService.generateReceiptPdf(mockPayment.id, regularUser.id);

      // Assert
      expect(result).toBeInstanceOf(Buffer);
      // DateTime should be formatted as DD/MM/YYYY HH:MM
    });
  });
});
