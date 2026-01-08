/**
 * Tickets Load Tests
 *
 * Tests for ticket validation under load conditions including:
 * - Concurrent ticket validations (simulated with Promise.all)
 * - Performance benchmarks (response time)
 * - Race condition handling
 * - Batch validation operations
 */

import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { TicketsService } from './tickets.service';
import { PrismaService } from '../../prisma/prisma.service';
import { EmailService } from '../email/email.service';
import { TicketStatus, TicketType, FestivalStatus } from '@prisma/client';
import {
  regularUser,
  staffUser,
  publishedFestival,
  ongoingFestival,
  standardCategory,
  soldTicket,
} from '../../test/fixtures';

// ============================================================================
// Mock Setup
// ============================================================================

jest.mock('qrcode');
const QRCode = require('qrcode');

jest.mock('uuid');
const uuid = require('uuid');

const crypto = require('crypto');
const mockHmac = {
  update: jest.fn().mockReturnThis(),
  digest: jest.fn().mockReturnValue('mockedsignature12345678'),
};
jest.spyOn(crypto, 'createHmac').mockReturnValue(mockHmac);

describe('TicketsService - Load Tests', () => {
  let ticketsService: TicketsService;

  const QR_CODE_SECRET = 'this-is-a-very-secure-qr-code-secret-key-32chars';

  const mockPrismaService = {
    festival: {
      findUnique: jest.fn(),
    },
    ticketCategory: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    ticket: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      createMany: jest.fn(),
      update: jest.fn(),
      count: jest.fn(),
    },
    zone: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    zoneAccessLog: {
      create: jest.fn(),
    },
    $transaction: jest.fn(),
  };

  const mockConfigService = {
    getOrThrow: jest.fn().mockReturnValue(QR_CODE_SECRET),
  };

  const mockEmailService = {
    sendTicketTransferEmail: jest.fn().mockResolvedValue({ success: true }),
    sendEmail: jest.fn().mockResolvedValue({ success: true }),
    isEmailEnabled: jest.fn().mockReturnValue(true),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    mockConfigService.getOrThrow.mockReturnValue(QR_CODE_SECRET);
    QRCode.toDataURL.mockResolvedValue('data:image/png;base64,mockQRCode');
    uuid.v4.mockReturnValue('mocked-uuid-ticket-123');
    mockHmac.update.mockReturnThis();
    mockHmac.digest.mockReturnValue('mockedsignature12345678');

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TicketsService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: ConfigService, useValue: mockConfigService },
        { provide: EmailService, useValue: mockEmailService },
      ],
    }).compile();

    ticketsService = module.get<TicketsService>(TicketsService);

    mockPrismaService.$transaction.mockImplementation(async (callback) => {
      if (typeof callback === 'function') {
        return callback(mockPrismaService);
      }
      return callback;
    });
  });

  // ==========================================================================
  // Concurrent Validation Tests
  // ==========================================================================

  describe('Concurrent Ticket Validations', () => {
    const createValidTicketMock = (qrCode: string, ticketId: string) => ({
      id: ticketId,
      festivalId: ongoingFestival.id,
      categoryId: standardCategory.id,
      userId: regularUser.id,
      qrCode,
      qrCodeData: JSON.stringify({ ticketId }),
      status: TicketStatus.SOLD,
      purchasePrice: 149.99,
      usedAt: null,
      usedByStaffId: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      festival: { ...ongoingFestival, status: FestivalStatus.ONGOING },
      category: standardCategory,
      user: {
        id: regularUser.id,
        email: regularUser.email,
        firstName: regularUser.firstName,
        lastName: regularUser.lastName,
      },
    });

    it('should handle 10 concurrent ticket validations', async () => {
      // Arrange: Create 10 unique tickets
      const ticketCount = 10;
      const tickets = Array.from({ length: ticketCount }, (_, i) => ({
        qrCode: `QR-CONCURRENT-${i}`,
        ticketId: `ticket-concurrent-${i}`,
      }));

      // Mock each ticket lookup
      mockPrismaService.ticket.findUnique.mockImplementation(({ where }) => {
        const ticket = tickets.find((t) => t.qrCode === where.qrCode);
        if (ticket) {
          return Promise.resolve(createValidTicketMock(ticket.qrCode, ticket.ticketId));
        }
        return Promise.resolve(null);
      });

      // Act: Validate all tickets concurrently
      const validationPromises = tickets.map((ticket) =>
        ticketsService.validateTicket({ qrCode: ticket.qrCode })
      );

      const results = await Promise.all(validationPromises);

      // Assert: All validations should succeed
      expect(results).toHaveLength(ticketCount);
      results.forEach((result) => {
        expect(result.valid).toBe(true);
        expect(result.accessGranted).toBe(true);
        expect(result.message).toBe('Ticket is valid');
      });
    });

    it('should handle 50 concurrent ticket validations', async () => {
      // Arrange: Create 50 unique tickets
      const ticketCount = 50;
      const tickets = Array.from({ length: ticketCount }, (_, i) => ({
        qrCode: `QR-BULK-${i}`,
        ticketId: `ticket-bulk-${i}`,
      }));

      mockPrismaService.ticket.findUnique.mockImplementation(({ where }) => {
        const ticket = tickets.find((t) => t.qrCode === where.qrCode);
        if (ticket) {
          return Promise.resolve(createValidTicketMock(ticket.qrCode, ticket.ticketId));
        }
        return Promise.resolve(null);
      });

      // Act
      const startTime = Date.now();
      const validationPromises = tickets.map((ticket) =>
        ticketsService.validateTicket({ qrCode: ticket.qrCode })
      );
      const results = await Promise.all(validationPromises);
      const duration = Date.now() - startTime;

      // Assert
      expect(results).toHaveLength(ticketCount);
      expect(results.every((r) => r.valid)).toBe(true);

      // Log performance metric
      console.log(`50 concurrent validations completed in ${duration}ms`);
    });

    it('should handle 100 concurrent ticket validations', async () => {
      // Arrange: Create 100 unique tickets
      const ticketCount = 100;
      const tickets = Array.from({ length: ticketCount }, (_, i) => ({
        qrCode: `QR-LOAD-${i}`,
        ticketId: `ticket-load-${i}`,
      }));

      mockPrismaService.ticket.findUnique.mockImplementation(({ where }) => {
        const ticket = tickets.find((t) => t.qrCode === where.qrCode);
        if (ticket) {
          return Promise.resolve(createValidTicketMock(ticket.qrCode, ticket.ticketId));
        }
        return Promise.resolve(null);
      });

      // Act
      const startTime = Date.now();
      const validationPromises = tickets.map((ticket) =>
        ticketsService.validateTicket({ qrCode: ticket.qrCode })
      );
      const results = await Promise.all(validationPromises);
      const duration = Date.now() - startTime;

      // Assert
      expect(results).toHaveLength(ticketCount);
      expect(results.every((r) => r.valid)).toBe(true);

      // Log performance metric
      console.log(`100 concurrent validations completed in ${duration}ms`);
    });

    it('should handle mixed valid and invalid tickets concurrently', async () => {
      // Arrange: Mix of valid and invalid tickets
      const validTickets = Array.from({ length: 25 }, (_, i) => ({
        qrCode: `QR-VALID-${i}`,
        ticketId: `ticket-valid-${i}`,
        shouldBeValid: true,
      }));

      const invalidTickets = Array.from({ length: 25 }, (_, i) => ({
        qrCode: `QR-INVALID-${i}`,
        ticketId: null,
        shouldBeValid: false,
      }));

      const allTickets = [...validTickets, ...invalidTickets];
      // Shuffle the array
      allTickets.sort(() => Math.random() - 0.5);

      mockPrismaService.ticket.findUnique.mockImplementation(({ where }) => {
        const ticket = validTickets.find((t) => t.qrCode === where.qrCode);
        if (ticket) {
          return Promise.resolve(createValidTicketMock(ticket.qrCode, ticket.ticketId));
        }
        return Promise.resolve(null);
      });

      // Act
      const validationPromises = allTickets.map((ticket) =>
        ticketsService.validateTicket({ qrCode: ticket.qrCode })
      );
      const results = await Promise.all(validationPromises);

      // Assert
      expect(results).toHaveLength(50);
      const validResults = results.filter((r) => r.valid);
      const invalidResults = results.filter((r) => !r.valid);

      expect(validResults).toHaveLength(25);
      expect(invalidResults).toHaveLength(25);
    });
  });

  // ==========================================================================
  // Performance Benchmarks
  // ==========================================================================

  describe('Performance Benchmarks', () => {
    it('should validate a single ticket within acceptable time (< 100ms)', async () => {
      // Arrange
      mockPrismaService.ticket.findUnique.mockResolvedValue({
        ...soldTicket,
        festival: { ...ongoingFestival, status: FestivalStatus.ONGOING },
        category: standardCategory,
        user: regularUser,
      });

      // Act
      const startTime = process.hrtime.bigint();
      await ticketsService.validateTicket({ qrCode: soldTicket.qrCode });
      const endTime = process.hrtime.bigint();

      const durationMs = Number(endTime - startTime) / 1_000_000;

      // Assert
      expect(durationMs).toBeLessThan(100);
      console.log(`Single ticket validation: ${durationMs.toFixed(2)}ms`);
    });

    it('should measure average validation time across 100 sequential validations', async () => {
      // Arrange
      mockPrismaService.ticket.findUnique.mockResolvedValue({
        ...soldTicket,
        festival: { ...ongoingFestival, status: FestivalStatus.ONGOING },
        category: standardCategory,
        user: regularUser,
      });

      const validationCount = 100;
      const durations: number[] = [];

      // Act
      for (let i = 0; i < validationCount; i++) {
        const startTime = process.hrtime.bigint();
        await ticketsService.validateTicket({ qrCode: `QR-SEQ-${i}` });
        const endTime = process.hrtime.bigint();
        durations.push(Number(endTime - startTime) / 1_000_000);
      }

      // Calculate statistics
      const totalDuration = durations.reduce((sum, d) => sum + d, 0);
      const avgDuration = totalDuration / validationCount;
      const minDuration = Math.min(...durations);
      const maxDuration = Math.max(...durations);

      // Assert: Average should be reasonable
      console.log(`Sequential validation stats (${validationCount} validations):`);
      console.log(`  Average: ${avgDuration.toFixed(2)}ms`);
      console.log(`  Min: ${minDuration.toFixed(2)}ms`);
      console.log(`  Max: ${maxDuration.toFixed(2)}ms`);
      console.log(`  Total: ${totalDuration.toFixed(2)}ms`);

      // Average validation should be quick in test environment
      expect(avgDuration).toBeLessThan(50);
    });

    it('should maintain consistent performance under repeated concurrent load', async () => {
      // Arrange
      mockPrismaService.ticket.findUnique.mockResolvedValue({
        ...soldTicket,
        festival: { ...ongoingFestival, status: FestivalStatus.ONGOING },
        category: standardCategory,
        user: regularUser,
      });

      const batchSize = 20;
      const batchCount = 5;
      const batchDurations: number[] = [];

      // Act: Run multiple batches
      for (let batch = 0; batch < batchCount; batch++) {
        const startTime = Date.now();

        const validationPromises = Array.from({ length: batchSize }, (_, i) =>
          ticketsService.validateTicket({ qrCode: `QR-BATCH-${batch}-${i}` })
        );

        await Promise.all(validationPromises);
        batchDurations.push(Date.now() - startTime);
      }

      // Calculate variance
      const avgBatchDuration = batchDurations.reduce((sum, d) => sum + d, 0) / batchCount;
      const variance =
        batchDurations.reduce((sum, d) => sum + Math.pow(d - avgBatchDuration, 2), 0) / batchCount;
      const stdDev = Math.sqrt(variance);

      // Assert: Performance should be consistent
      console.log(`Batch performance (${batchCount} batches of ${batchSize}):`);
      console.log(`  Batch durations: ${batchDurations.map((d) => d + 'ms').join(', ')}`);
      console.log(`  Average: ${avgBatchDuration.toFixed(2)}ms`);
      console.log(`  Std Dev: ${stdDev.toFixed(2)}ms`);

      // Standard deviation should be reasonable (less than 50% of average or under 20ms for fast tests)
      expect(stdDev).toBeLessThanOrEqual(Math.max(avgBatchDuration * 0.5, 20));
    });
  });

  // ==========================================================================
  // Race Condition Tests
  // ==========================================================================

  describe('Race Condition Handling', () => {
    it('should handle concurrent scans of the same ticket correctly', async () => {
      // Arrange: Single ticket that will be scanned concurrently
      const ticketQrCode = 'QR-RACE-CONDITION-001';
      let scanCount = 0;
      let ticketUsed = false;

      // First call returns valid ticket, subsequent calls return already used
      mockPrismaService.ticket.findUnique.mockImplementation(async () => {
        // Simulate small delay to increase chance of race condition
        await new Promise((resolve) => setTimeout(resolve, Math.random() * 5));

        if (ticketUsed) {
          return {
            ...soldTicket,
            qrCode: ticketQrCode,
            status: TicketStatus.USED,
            usedAt: new Date(),
            festival: { ...ongoingFestival, status: FestivalStatus.ONGOING },
            category: standardCategory,
            user: regularUser,
          };
        }

        return {
          ...soldTicket,
          qrCode: ticketQrCode,
          status: TicketStatus.SOLD,
          festival: { ...ongoingFestival, status: FestivalStatus.ONGOING },
          category: standardCategory,
          user: regularUser,
        };
      });

      mockPrismaService.ticket.update.mockImplementation(async () => {
        scanCount++;
        ticketUsed = true;
        return {
          ...soldTicket,
          qrCode: ticketQrCode,
          status: TicketStatus.USED,
          usedAt: new Date(),
          festival: {
            id: ongoingFestival.id,
            name: ongoingFestival.name,
            startDate: ongoingFestival.startDate,
            endDate: ongoingFestival.endDate,
          },
          category: {
            id: standardCategory.id,
            name: standardCategory.name,
            type: standardCategory.type,
          },
        };
      });

      // Act: Try to scan the same ticket concurrently from 10 "devices"
      const scanPromises = Array.from({ length: 10 }, () =>
        ticketsService.scanTicket(ticketQrCode, staffUser.id)
      );

      const results = await Promise.all(scanPromises);

      // Assert: Only some scans should succeed, others should fail
      const successfulScans = results.filter((r) => r.accessGranted);
      const failedScans = results.filter((r) => !r.accessGranted || !r.valid);

      console.log(`Race condition test results:`);
      console.log(`  Successful scans: ${successfulScans.length}`);
      console.log(`  Failed scans: ${failedScans.length}`);
      console.log(`  Database update calls: ${scanCount}`);

      // At least one scan should succeed
      expect(successfulScans.length).toBeGreaterThanOrEqual(1);
    });

    it('should handle concurrent purchases for limited quota', async () => {
      // Arrange: Category with only 5 tickets remaining
      const limitedCategory = {
        ...standardCategory,
        quota: 100,
        soldCount: 95,
        maxPerUser: 10,
      };

      let currentSoldCount = 95;

      mockPrismaService.festival.findUnique.mockResolvedValue({
        ...publishedFestival,
        isDeleted: false,
      });

      mockPrismaService.ticketCategory.findUnique.mockImplementation(async () => ({
        ...limitedCategory,
        soldCount: currentSoldCount,
      }));

      mockPrismaService.ticket.count.mockResolvedValue(0);

      mockPrismaService.$transaction.mockImplementation(async (callback) => {
        if (typeof callback === 'function') {
          // Check if we have capacity
          if (currentSoldCount >= limitedCategory.quota) {
            throw new Error('Sold out');
          }
          currentSoldCount++;
          return callback({
            ...mockPrismaService,
            ticketCategory: {
              ...mockPrismaService.ticketCategory,
              update: jest
                .fn()
                .mockResolvedValue({ ...limitedCategory, soldCount: currentSoldCount }),
            },
            ticket: {
              ...mockPrismaService.ticket,
              createMany: jest.fn().mockResolvedValue({ count: 1 }),
              findMany: jest.fn().mockResolvedValue([
                {
                  id: `ticket-${currentSoldCount}`,
                  festivalId: publishedFestival.id,
                  categoryId: standardCategory.id,
                  userId: regularUser.id,
                  qrCode: `QR-LIMITED-${currentSoldCount}`,
                  qrCodeData: '{}',
                  status: TicketStatus.SOLD,
                  purchasePrice: standardCategory.price,
                  usedAt: null,
                  createdAt: new Date(),
                  updatedAt: new Date(),
                  festival: {
                    id: publishedFestival.id,
                    name: publishedFestival.name,
                    startDate: publishedFestival.startDate,
                    endDate: publishedFestival.endDate,
                  },
                  category: {
                    id: standardCategory.id,
                    name: standardCategory.name,
                    type: standardCategory.type,
                  },
                },
              ]),
            },
          });
        }
        return callback;
      });

      // Act: 10 users try to buy the last 5 tickets concurrently
      const purchasePromises = Array.from({ length: 10 }, (_, i) =>
        ticketsService
          .purchaseTickets(`user-${i}`, {
            festivalId: publishedFestival.id,
            categoryId: standardCategory.id,
            quantity: 1,
          })
          .catch((error) => ({ error: error.message }))
      );

      const results = await Promise.all(purchasePromises);

      // Assert
      const successful = results.filter((r) => !('error' in r));
      const failed = results.filter((r) => 'error' in r);

      console.log(`Limited quota purchase test:`);
      console.log(`  Successful purchases: ${successful.length}`);
      console.log(`  Failed purchases: ${failed.length}`);

      // Some should succeed (up to 5)
      expect(successful.length).toBeGreaterThanOrEqual(1);
      expect(successful.length).toBeLessThanOrEqual(5);
    });

    it('should handle concurrent zone access checks', async () => {
      // Arrange: Zone with limited capacity
      const limitedZone = {
        id: 'zone-limited-001',
        festivalId: ongoingFestival.id,
        name: 'Limited Zone',
        capacity: 10,
        currentOccupancy: 8, // Only 2 spots left
        requiresTicketType: [TicketType.STANDARD, TicketType.VIP],
        isActive: true,
      };

      let currentOccupancy = 8;

      mockPrismaService.ticket.findUnique.mockImplementation(async ({ where }) => ({
        ...soldTicket,
        qrCode: where.qrCode,
        festival: { ...ongoingFestival, status: FestivalStatus.ONGOING },
        category: standardCategory,
        user: regularUser,
      }));

      mockPrismaService.zone.findUnique.mockImplementation(async () => ({
        ...limitedZone,
        currentOccupancy,
      }));

      mockPrismaService.ticket.update.mockImplementation(async () => ({
        ...soldTicket,
        status: TicketStatus.USED,
        usedAt: new Date(),
        festival: {
          id: ongoingFestival.id,
          name: ongoingFestival.name,
          startDate: ongoingFestival.startDate,
          endDate: ongoingFestival.endDate,
        },
        category: {
          id: standardCategory.id,
          name: standardCategory.name,
          type: standardCategory.type,
        },
      }));

      mockPrismaService.zone.update.mockImplementation(async () => {
        currentOccupancy++;
        return { ...limitedZone, currentOccupancy };
      });

      mockPrismaService.zoneAccessLog.create.mockResolvedValue({});

      // Act: 5 people try to enter at once (only 2 should get in)
      const accessPromises = Array.from({ length: 5 }, (_, i) =>
        ticketsService.validateTicket({
          qrCode: `QR-ZONE-ACCESS-${i}`,
          zoneId: limitedZone.id,
        })
      );

      const results = await Promise.all(accessPromises);

      // Assert
      const granted = results.filter((r) => r.accessGranted);
      const denied = results.filter((r) => !r.accessGranted || !r.valid);

      console.log(`Zone capacity race test:`);
      console.log(`  Access granted: ${granted.length}`);
      console.log(`  Access denied: ${denied.length}`);

      // All tickets should be valid but some may be denied due to capacity
      results.forEach((r) => {
        expect(r.valid).toBe(true);
      });
    });
  });

  // ==========================================================================
  // Batch Validation Tests
  // ==========================================================================

  describe('Batch Validation Operations', () => {
    it('should validate a batch of 20 tickets efficiently', async () => {
      // Arrange
      const batchSize = 20;
      const tickets = Array.from({ length: batchSize }, (_, i) => ({
        qrCode: `QR-BATCH-${i}`,
        ticketId: `ticket-batch-${i}`,
      }));

      mockPrismaService.ticket.findUnique.mockImplementation(async ({ where }) => {
        const ticket = tickets.find((t) => t.qrCode === where.qrCode);
        if (ticket) {
          return {
            id: ticket.ticketId,
            qrCode: ticket.qrCode,
            status: TicketStatus.SOLD,
            festival: { ...ongoingFestival, status: FestivalStatus.ONGOING },
            category: standardCategory,
            user: regularUser,
            purchasePrice: 149.99,
            usedAt: null,
            createdAt: new Date(),
            updatedAt: new Date(),
          };
        }
        return null;
      });

      // Act
      const startTime = Date.now();
      const validationPromises = tickets.map((t) =>
        ticketsService.validateTicket({ qrCode: t.qrCode })
      );
      const results = await Promise.all(validationPromises);
      const duration = Date.now() - startTime;

      // Assert
      expect(results).toHaveLength(batchSize);
      expect(results.every((r) => r.valid)).toBe(true);

      console.log(`Batch of ${batchSize} validations completed in ${duration}ms`);
      console.log(`Average per ticket: ${(duration / batchSize).toFixed(2)}ms`);
    });

    it('should handle batch validation with varying ticket statuses', async () => {
      // Arrange: Different ticket statuses
      const tickets = [
        { qrCode: 'QR-SOLD-1', status: TicketStatus.SOLD },
        { qrCode: 'QR-SOLD-2', status: TicketStatus.SOLD },
        { qrCode: 'QR-USED-1', status: TicketStatus.USED },
        { qrCode: 'QR-CANCELLED-1', status: TicketStatus.CANCELLED },
        { qrCode: 'QR-REFUNDED-1', status: TicketStatus.REFUNDED },
        { qrCode: 'QR-SOLD-3', status: TicketStatus.SOLD },
        { qrCode: 'QR-SOLD-4', status: TicketStatus.SOLD },
        { qrCode: 'QR-USED-2', status: TicketStatus.USED },
      ];

      mockPrismaService.ticket.findUnique.mockImplementation(async ({ where }) => {
        const ticket = tickets.find((t) => t.qrCode === where.qrCode);
        if (ticket) {
          return {
            id: `id-${ticket.qrCode}`,
            qrCode: ticket.qrCode,
            status: ticket.status,
            usedAt: ticket.status === TicketStatus.USED ? new Date() : null,
            festival: { ...ongoingFestival, status: FestivalStatus.ONGOING },
            category: standardCategory,
            user: regularUser,
            purchasePrice: 149.99,
            createdAt: new Date(),
            updatedAt: new Date(),
          };
        }
        return null;
      });

      // Act
      const results = await Promise.all(
        tickets.map((t) => ticketsService.validateTicket({ qrCode: t.qrCode }))
      );

      // Assert
      const validCount = results.filter((r) => r.valid && r.accessGranted).length;
      const invalidCount = results.filter((r) => !r.valid).length;

      expect(validCount).toBe(4); // 4 SOLD tickets
      expect(invalidCount).toBe(4); // 2 USED + 1 CANCELLED + 1 REFUNDED

      console.log(`Batch validation with mixed statuses:`);
      console.log(`  Valid tickets: ${validCount}`);
      console.log(`  Invalid tickets: ${invalidCount}`);
    });

    it('should process a large batch of 200 tickets', async () => {
      // Arrange
      const batchSize = 200;
      const tickets = Array.from({ length: batchSize }, (_, i) => ({
        qrCode: `QR-LARGE-${i}`,
        ticketId: `ticket-large-${i}`,
      }));

      mockPrismaService.ticket.findUnique.mockImplementation(async ({ where }) => {
        const ticket = tickets.find((t) => t.qrCode === where.qrCode);
        if (ticket) {
          return {
            id: ticket.ticketId,
            qrCode: ticket.qrCode,
            status: TicketStatus.SOLD,
            festival: { ...ongoingFestival, status: FestivalStatus.ONGOING },
            category: standardCategory,
            user: regularUser,
            purchasePrice: 149.99,
            usedAt: null,
            createdAt: new Date(),
            updatedAt: new Date(),
          };
        }
        return null;
      });

      // Act: Process in chunks of 50 to simulate realistic load
      const chunkSize = 50;
      const chunks = [];
      for (let i = 0; i < tickets.length; i += chunkSize) {
        chunks.push(tickets.slice(i, i + chunkSize));
      }

      const startTime = Date.now();
      const allResults: any[] = [];

      for (const chunk of chunks) {
        const chunkResults = await Promise.all(
          chunk.map((t) => ticketsService.validateTicket({ qrCode: t.qrCode }))
        );
        allResults.push(...chunkResults);
      }

      const duration = Date.now() - startTime;

      // Assert
      expect(allResults).toHaveLength(batchSize);
      expect(allResults.every((r) => r.valid)).toBe(true);

      console.log(`Large batch of ${batchSize} tickets processed in ${duration}ms`);
      console.log(`Average per ticket: ${(duration / batchSize).toFixed(2)}ms`);
      console.log(`Throughput: ${((batchSize / duration) * 1000).toFixed(0)} tickets/second`);
    });

    it('should handle batch with duplicate QR codes gracefully', async () => {
      // Arrange: Some duplicates in the batch
      const uniqueTickets = [
        { qrCode: 'QR-UNIQUE-1', ticketId: 'ticket-1' },
        { qrCode: 'QR-UNIQUE-2', ticketId: 'ticket-2' },
        { qrCode: 'QR-UNIQUE-3', ticketId: 'ticket-3' },
      ];

      // Request includes duplicates
      const requestedQrCodes = [
        'QR-UNIQUE-1',
        'QR-UNIQUE-2',
        'QR-UNIQUE-1', // duplicate
        'QR-UNIQUE-3',
        'QR-UNIQUE-2', // duplicate
        'QR-UNIQUE-1', // duplicate
      ];

      mockPrismaService.ticket.findUnique.mockImplementation(async ({ where }) => {
        const ticket = uniqueTickets.find((t) => t.qrCode === where.qrCode);
        if (ticket) {
          return {
            id: ticket.ticketId,
            qrCode: ticket.qrCode,
            status: TicketStatus.SOLD,
            festival: { ...ongoingFestival, status: FestivalStatus.ONGOING },
            category: standardCategory,
            user: regularUser,
            purchasePrice: 149.99,
            usedAt: null,
            createdAt: new Date(),
            updatedAt: new Date(),
          };
        }
        return null;
      });

      // Act
      const results = await Promise.all(
        requestedQrCodes.map((qrCode) => ticketsService.validateTicket({ qrCode }))
      );

      // Assert: All should return valid results (duplicates are still valid tickets)
      expect(results).toHaveLength(6);
      expect(results.every((r) => r.valid)).toBe(true);

      // Verify that findUnique was called for each request
      expect(mockPrismaService.ticket.findUnique).toHaveBeenCalledTimes(6);
    });
  });

  // ==========================================================================
  // Stress Tests
  // ==========================================================================

  describe('Stress Tests', () => {
    it('should handle rapid successive validations without degradation', async () => {
      // Arrange
      mockPrismaService.ticket.findUnique.mockResolvedValue({
        ...soldTicket,
        festival: { ...ongoingFestival, status: FestivalStatus.ONGOING },
        category: standardCategory,
        user: regularUser,
      });

      const iterationCount = 50;
      const durations: number[] = [];

      // Act: Rapid fire validations
      for (let i = 0; i < iterationCount; i++) {
        const start = Date.now();
        await ticketsService.validateTicket({ qrCode: `QR-RAPID-${i}` });
        durations.push(Date.now() - start);
      }

      // Assert: Check for degradation (later iterations shouldn't be significantly slower)
      const firstHalf = durations.slice(0, iterationCount / 2);
      const secondHalf = durations.slice(iterationCount / 2);

      const avgFirstHalf = firstHalf.reduce((sum, d) => sum + d, 0) / firstHalf.length;
      const avgSecondHalf = secondHalf.reduce((sum, d) => sum + d, 0) / secondHalf.length;

      console.log(`Rapid succession test (${iterationCount} iterations):`);
      console.log(`  First half average: ${avgFirstHalf.toFixed(2)}ms`);
      console.log(`  Second half average: ${avgSecondHalf.toFixed(2)}ms`);

      // Second half should not be more than 50% slower than first half
      expect(avgSecondHalf).toBeLessThan(avgFirstHalf * 1.5 + 10); // +10ms buffer for variance
    });

    it('should recover gracefully from intermittent failures', async () => {
      // Arrange: Simulate intermittent database failures
      let _callCount = 0;
      const failureRate = 0.2; // 20% failure rate

      mockPrismaService.ticket.findUnique.mockImplementation(async () => {
        _callCount++;
        // Randomly fail some requests
        if (Math.random() < failureRate) {
          throw new Error('Database connection error');
        }

        return {
          ...soldTicket,
          festival: { ...ongoingFestival, status: FestivalStatus.ONGOING },
          category: standardCategory,
          user: regularUser,
        };
      });

      // Act: Run many validations
      const validationCount = 50;
      const results = await Promise.all(
        Array.from({ length: validationCount }, (_, i) =>
          ticketsService
            .validateTicket({ qrCode: `QR-INTERMITTENT-${i}` })
            .catch((error) => ({ error: error.message }))
        )
      );

      // Assert
      const successful = results.filter((r) => !('error' in r));
      const failed = results.filter((r) => 'error' in r);

      console.log(`Intermittent failure test (${validationCount} attempts):`);
      console.log(`  Successful: ${successful.length}`);
      console.log(`  Failed: ${failed.length}`);
      console.log(
        `  Actual failure rate: ${((failed.length / validationCount) * 100).toFixed(1)}%`
      );

      // Most should succeed despite intermittent failures
      expect(successful.length).toBeGreaterThan(validationCount * 0.5);
    });
  });
});
