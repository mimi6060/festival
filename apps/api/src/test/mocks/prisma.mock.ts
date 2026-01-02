/**
 * Prisma Mock for Unit Testing
 *
 * This module provides a complete mock of the PrismaService for unit tests.
 * It allows mocking database operations without connecting to a real database.
 */

import { PrismaClient } from '@prisma/client';
import { DeepMockProxy, mockDeep, mockReset } from 'jest-mock-extended';

// ============================================================================
// Types
// ============================================================================

export type MockPrismaClient = DeepMockProxy<PrismaClient>;

// ============================================================================
// Mock Instance
// ============================================================================

/**
 * Deep mock of PrismaClient for testing
 */
export const prismaMock: MockPrismaClient = mockDeep<PrismaClient>();

/**
 * Resets all mock implementations and call history
 */
export function resetPrismaMock(): void {
  mockReset(prismaMock);
}

// ============================================================================
// Mock PrismaService
// ============================================================================

/**
 * Mock PrismaService class that can be used as a provider in testing modules
 */
export const mockPrismaService = {
  provide: 'PrismaService',
  useValue: prismaMock,
};

// ============================================================================
// Helper Functions for Common Mock Setups
// ============================================================================

/**
 * Mock helpers for User model
 */
export const mockUserQueries = {
  /**
   * Mock findUnique to return a specific user
   */
  findUnique: (user: Partial<ReturnType<typeof createMockUser>> | null) => {
    prismaMock.user.findUnique.mockResolvedValue(user as any);
  },

  /**
   * Mock findUnique to return null (user not found)
   */
  findUniqueNotFound: () => {
    prismaMock.user.findUnique.mockResolvedValue(null);
  },

  /**
   * Mock findMany to return a list of users
   */
  findMany: (users: Partial<ReturnType<typeof createMockUser>>[]) => {
    prismaMock.user.findMany.mockResolvedValue(users as any);
  },

  /**
   * Mock create to return a newly created user
   */
  create: (user: Partial<ReturnType<typeof createMockUser>>) => {
    prismaMock.user.create.mockResolvedValue(user as any);
  },

  /**
   * Mock update to return an updated user
   */
  update: (user: Partial<ReturnType<typeof createMockUser>>) => {
    prismaMock.user.update.mockResolvedValue(user as any);
  },

  /**
   * Mock count
   */
  count: (count: number) => {
    prismaMock.user.count.mockResolvedValue(count);
  },
};

/**
 * Mock helpers for Festival model
 */
export const mockFestivalQueries = {
  findUnique: (festival: Partial<ReturnType<typeof createMockFestival>> | null) => {
    prismaMock.festival.findUnique.mockResolvedValue(festival as any);
  },

  findUniqueNotFound: () => {
    prismaMock.festival.findUnique.mockResolvedValue(null);
  },

  findMany: (festivals: Partial<ReturnType<typeof createMockFestival>>[]) => {
    prismaMock.festival.findMany.mockResolvedValue(festivals as any);
  },

  create: (festival: Partial<ReturnType<typeof createMockFestival>>) => {
    prismaMock.festival.create.mockResolvedValue(festival as any);
  },

  update: (festival: Partial<ReturnType<typeof createMockFestival>>) => {
    prismaMock.festival.update.mockResolvedValue(festival as any);
  },

  count: (count: number) => {
    prismaMock.festival.count.mockResolvedValue(count);
  },
};

/**
 * Mock helpers for Ticket model
 */
export const mockTicketQueries = {
  findUnique: (ticket: Partial<ReturnType<typeof createMockTicket>> | null) => {
    prismaMock.ticket.findUnique.mockResolvedValue(ticket as any);
  },

  findUniqueNotFound: () => {
    prismaMock.ticket.findUnique.mockResolvedValue(null);
  },

  findMany: (tickets: Partial<ReturnType<typeof createMockTicket>>[]) => {
    prismaMock.ticket.findMany.mockResolvedValue(tickets as any);
  },

  create: (ticket: Partial<ReturnType<typeof createMockTicket>>) => {
    prismaMock.ticket.create.mockResolvedValue(ticket as any);
  },

  update: (ticket: Partial<ReturnType<typeof createMockTicket>>) => {
    prismaMock.ticket.update.mockResolvedValue(ticket as any);
  },

  count: (count: number) => {
    prismaMock.ticket.count.mockResolvedValue(count);
  },
};

/**
 * Mock helpers for TicketCategory model
 */
export const mockTicketCategoryQueries = {
  findUnique: (category: Partial<ReturnType<typeof createMockTicketCategory>> | null) => {
    prismaMock.ticketCategory.findUnique.mockResolvedValue(category as any);
  },

  findUniqueNotFound: () => {
    prismaMock.ticketCategory.findUnique.mockResolvedValue(null);
  },

  findMany: (categories: Partial<ReturnType<typeof createMockTicketCategory>>[]) => {
    prismaMock.ticketCategory.findMany.mockResolvedValue(categories as any);
  },

  create: (category: Partial<ReturnType<typeof createMockTicketCategory>>) => {
    prismaMock.ticketCategory.create.mockResolvedValue(category as any);
  },

  update: (category: Partial<ReturnType<typeof createMockTicketCategory>>) => {
    prismaMock.ticketCategory.update.mockResolvedValue(category as any);
  },

  count: (count: number) => {
    prismaMock.ticketCategory.count.mockResolvedValue(count);
  },
};

/**
 * Mock helpers for Payment model
 */
export const mockPaymentQueries = {
  findUnique: (payment: Partial<ReturnType<typeof createMockPayment>> | null) => {
    prismaMock.payment.findUnique.mockResolvedValue(payment as any);
  },

  findUniqueNotFound: () => {
    prismaMock.payment.findUnique.mockResolvedValue(null);
  },

  findMany: (payments: Partial<ReturnType<typeof createMockPayment>>[]) => {
    prismaMock.payment.findMany.mockResolvedValue(payments as any);
  },

  create: (payment: Partial<ReturnType<typeof createMockPayment>>) => {
    prismaMock.payment.create.mockResolvedValue(payment as any);
  },

  update: (payment: Partial<ReturnType<typeof createMockPayment>>) => {
    prismaMock.payment.update.mockResolvedValue(payment as any);
  },

  count: (count: number) => {
    prismaMock.payment.count.mockResolvedValue(count);
  },
};

/**
 * Mock helpers for CashlessAccount model
 */
export const mockCashlessAccountQueries = {
  findUnique: (account: Partial<ReturnType<typeof createMockCashlessAccount>> | null) => {
    prismaMock.cashlessAccount.findUnique.mockResolvedValue(account as any);
  },

  findUniqueNotFound: () => {
    prismaMock.cashlessAccount.findUnique.mockResolvedValue(null);
  },

  create: (account: Partial<ReturnType<typeof createMockCashlessAccount>>) => {
    prismaMock.cashlessAccount.create.mockResolvedValue(account as any);
  },

  update: (account: Partial<ReturnType<typeof createMockCashlessAccount>>) => {
    prismaMock.cashlessAccount.update.mockResolvedValue(account as any);
  },
};

/**
 * Mock helpers for CashlessTransaction model
 */
export const mockCashlessTransactionQueries = {
  findUnique: (transaction: Partial<ReturnType<typeof createMockCashlessTransaction>> | null) => {
    prismaMock.cashlessTransaction.findUnique.mockResolvedValue(transaction as any);
  },

  findMany: (transactions: Partial<ReturnType<typeof createMockCashlessTransaction>>[]) => {
    prismaMock.cashlessTransaction.findMany.mockResolvedValue(transactions as any);
  },

  create: (transaction: Partial<ReturnType<typeof createMockCashlessTransaction>>) => {
    prismaMock.cashlessTransaction.create.mockResolvedValue(transaction as any);
  },

  count: (count: number) => {
    prismaMock.cashlessTransaction.count.mockResolvedValue(count);
  },
};

/**
 * Mock helpers for AuditLog model
 */
export const mockAuditLogQueries = {
  create: (log: Record<string, unknown> = {}) => {
    prismaMock.auditLog.create.mockResolvedValue(log as any);
  },

  findMany: (logs: Record<string, unknown>[] = []) => {
    prismaMock.auditLog.findMany.mockResolvedValue(logs as any);
  },
};

// ============================================================================
// Mock Data Factories
// ============================================================================

/**
 * Creates a mock user with default values that can be overridden
 */
export function createMockUser(overrides: Record<string, unknown> = {}) {
  return {
    id: 'user-uuid-123',
    email: 'test@example.com',
    passwordHash: '$2b$12$hashedpassword',
    firstName: 'Test',
    lastName: 'User',
    phone: '+33612345678',
    role: 'USER' as const,
    status: 'ACTIVE' as const,
    emailVerified: true,
    refreshToken: null,
    lastLoginAt: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

/**
 * Creates a mock festival with default values
 */
export function createMockFestival(overrides: Record<string, unknown> = {}) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() + 30);
  const endDate = new Date();
  endDate.setDate(endDate.getDate() + 33);

  return {
    id: 'festival-uuid-123',
    organizerId: 'organizer-uuid-123',
    name: 'Test Festival',
    slug: 'test-festival',
    description: 'A test festival for unit testing',
    location: 'Paris, France',
    address: '123 Test Street',
    startDate,
    endDate,
    status: 'DRAFT' as const,
    maxCapacity: 50000,
    currentAttendees: 0,
    logoUrl: null,
    bannerUrl: null,
    websiteUrl: 'https://test-festival.com',
    contactEmail: 'contact@test-festival.com',
    timezone: 'Europe/Paris',
    currency: 'EUR',
    isDeleted: false,
    deletedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

/**
 * Creates a mock ticket category with default values
 */
export function createMockTicketCategory(overrides: Record<string, unknown> = {}) {
  const saleStartDate = new Date();
  const saleEndDate = new Date();
  saleEndDate.setDate(saleEndDate.getDate() + 60);

  return {
    id: 'category-uuid-123',
    festivalId: 'festival-uuid-123',
    name: 'Standard Pass',
    description: 'General admission',
    type: 'STANDARD' as const,
    price: 149.99,
    quota: 30000,
    soldCount: 0,
    maxPerUser: 4,
    saleStartDate,
    saleEndDate,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

/**
 * Creates a mock ticket with default values
 */
export function createMockTicket(overrides: Record<string, unknown> = {}) {
  return {
    id: 'ticket-uuid-123',
    festivalId: 'festival-uuid-123',
    categoryId: 'category-uuid-123',
    userId: 'user-uuid-123',
    qrCode: 'QR-ABC123DEF456',
    qrCodeData: 'signed-qr-data',
    status: 'SOLD' as const,
    purchasePrice: 149.99,
    usedAt: null,
    usedByStaffId: null,
    paymentId: 'payment-uuid-123',
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

/**
 * Creates a mock payment with default values
 */
export function createMockPayment(overrides: Record<string, unknown> = {}) {
  return {
    id: 'payment-uuid-123',
    userId: 'user-uuid-123',
    amount: 149.99,
    currency: 'EUR',
    status: 'PENDING' as const,
    provider: 'STRIPE' as const,
    providerPaymentId: 'pi_test_123456',
    providerData: null,
    description: 'Ticket purchase',
    metadata: null,
    paidAt: null,
    refundedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

/**
 * Creates a mock cashless account with default values
 */
export function createMockCashlessAccount(overrides: Record<string, unknown> = {}) {
  return {
    id: 'cashless-uuid-123',
    userId: 'user-uuid-123',
    balance: 50.0,
    nfcTagId: 'NFC-TAG-123',
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

/**
 * Creates a mock cashless transaction with default values
 */
export function createMockCashlessTransaction(overrides: Record<string, unknown> = {}) {
  return {
    id: 'transaction-uuid-123',
    accountId: 'cashless-uuid-123',
    festivalId: 'festival-uuid-123',
    type: 'TOPUP' as const,
    amount: 50.0,
    balanceBefore: 0,
    balanceAfter: 50.0,
    description: 'Top-up via credit card',
    metadata: null,
    paymentId: 'payment-uuid-123',
    performedById: null,
    createdAt: new Date(),
    ...overrides,
  };
}

/**
 * Creates a mock session with default values
 */
export function createMockSession(overrides: Record<string, unknown> = {}) {
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7);

  return {
    id: 'session-uuid-123',
    userId: 'user-uuid-123',
    token: 'session-token-abc123',
    ipAddress: '127.0.0.1',
    userAgent: 'Jest Test Agent',
    deviceInfo: null,
    isActive: true,
    lastActiveAt: new Date(),
    expiresAt,
    createdAt: new Date(),
    ...overrides,
  };
}

// ============================================================================
// Transaction Mock
// ============================================================================

/**
 * Mocks a Prisma transaction
 */
export function mockTransaction<T>(callback: (tx: MockPrismaClient) => T): void {
  prismaMock.$transaction.mockImplementation(async (fn: any) => {
    if (typeof fn === 'function') {
      return fn(prismaMock);
    }
    return Promise.all(fn);
  });
}

// ============================================================================
// Export for Jest Setup
// ============================================================================

/**
 * Jest beforeEach hook to reset mocks
 */
export function setupPrismaMockReset(): void {
  beforeEach(() => {
    resetPrismaMock();
  });
}
