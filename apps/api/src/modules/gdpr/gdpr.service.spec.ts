/**
 * GdprService Unit Tests
 *
 * Comprehensive tests for GDPR compliance functionality including:
 * - Consent management (get, update, bulk update)
 * - Data requests (create, get, process)
 * - Data export (generate, download)
 * - Data deletion (Right to be Forgotten)
 * - Data anonymization
 * - Consent withdrawal
 * - Data rectification
 * - Audit logging
 * - Statistics
 */

import { Test, TestingModule } from '@nestjs/testing';
import { GdprService } from './gdpr.service';
import { PrismaService } from '../../prisma/prisma.service';
import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { ConsentType, GdprRequestType, GdprRequestStatus, ExportFormat } from './dto';
import { regularUser, adminUser } from '../../test/fixtures';

// ============================================================================
// Mock Setup
// ============================================================================

describe('GdprService', () => {
  let gdprService: GdprService;
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  let prismaService: jest.Mocked<PrismaService>;

  const mockUserId = regularUser.id;
  const mockAdminId = adminUser.id;
  const mockRequestId = 'request-uuid-00000000-0000-0000-0000-000000000001';

  const mockPrismaService = {
    userConsent: {
      findMany: jest.fn(),
      upsert: jest.fn(),
      updateMany: jest.fn(),
      deleteMany: jest.fn(),
    },
    gdprRequest: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      count: jest.fn(),
      groupBy: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    ticket: {
      findMany: jest.fn(),
    },
    payment: {
      findMany: jest.fn(),
    },
    cashlessTransaction: {
      findMany: jest.fn(),
    },
    supportTicket: {
      findMany: jest.fn(),
    },
    notification: {
      findMany: jest.fn(),
      deleteMany: jest.fn(),
    },
    pushToken: {
      deleteMany: jest.fn(),
    },
    session: {
      deleteMany: jest.fn(),
    },
    auditLog: {
      create: jest.fn(),
      findMany: jest.fn(),
    },
    $transaction: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [GdprService, { provide: PrismaService, useValue: mockPrismaService }],
    }).compile();

    gdprService = module.get<GdprService>(GdprService);
    prismaService = module.get(PrismaService);
  });

  // ==========================================================================
  // GET USER CONSENTS Tests
  // ==========================================================================

  describe('getUserConsents', () => {
    it('should return all consent types with their status', async () => {
      // Arrange
      mockPrismaService.userConsent.findMany.mockResolvedValue([
        {
          type: ConsentType.MARKETING,
          granted: true,
          grantedAt: new Date('2024-01-01'),
          revokedAt: null,
          ipAddress: '127.0.0.1',
          userAgent: 'TestAgent',
        },
        {
          type: ConsentType.ANALYTICS,
          granted: false,
          grantedAt: null,
          revokedAt: new Date('2024-01-02'),
          ipAddress: '127.0.0.1',
          userAgent: 'TestAgent',
        },
      ]);

      // Act
      const result = await gdprService.getUserConsents(mockUserId);

      // Assert
      expect(result).toHaveLength(Object.values(ConsentType).length);
      expect(result.find((c) => c.type === ConsentType.MARKETING)?.granted).toBe(true);
      expect(result.find((c) => c.type === ConsentType.ANALYTICS)?.granted).toBe(false);
    });

    it('should return default values for missing consents', async () => {
      // Arrange
      mockPrismaService.userConsent.findMany.mockResolvedValue([]);

      // Act
      const result = await gdprService.getUserConsents(mockUserId);

      // Assert
      expect(result).toHaveLength(Object.values(ConsentType).length);
      // Essential consent defaults to true
      expect(result.find((c) => c.type === ConsentType.ESSENTIAL)?.granted).toBe(true);
      // Others default to false
      expect(result.find((c) => c.type === ConsentType.MARKETING)?.granted).toBe(false);
    });

    it('should query consents ordered by type', async () => {
      // Arrange
      mockPrismaService.userConsent.findMany.mockResolvedValue([]);

      // Act
      await gdprService.getUserConsents(mockUserId);

      // Assert
      expect(mockPrismaService.userConsent.findMany).toHaveBeenCalledWith({
        where: { userId: mockUserId },
        orderBy: { type: 'asc' },
      });
    });

    it('should include ipAddress and userAgent in response', async () => {
      // Arrange
      mockPrismaService.userConsent.findMany.mockResolvedValue([
        {
          type: ConsentType.MARKETING,
          granted: true,
          grantedAt: new Date(),
          revokedAt: null,
          ipAddress: '192.168.1.1',
          userAgent: 'Mozilla/5.0',
        },
      ]);

      // Act
      const result = await gdprService.getUserConsents(mockUserId);

      // Assert
      const marketingConsent = result.find((c) => c.type === ConsentType.MARKETING);
      expect(marketingConsent?.ipAddress).toBe('192.168.1.1');
      expect(marketingConsent?.userAgent).toBe('Mozilla/5.0');
    });
  });

  // ==========================================================================
  // UPDATE CONSENT Tests
  // ==========================================================================

  describe('updateConsent', () => {
    const metadata = { ipAddress: '127.0.0.1', userAgent: 'TestAgent' };

    it('should successfully grant a consent', async () => {
      // Arrange
      const dto = { type: ConsentType.MARKETING, granted: true };
      mockPrismaService.userConsent.upsert.mockResolvedValue({
        userId: mockUserId,
        type: ConsentType.MARKETING,
        granted: true,
        grantedAt: new Date(),
        revokedAt: null,
        ipAddress: metadata.ipAddress,
        userAgent: metadata.userAgent,
      });

      // Act
      const result = await gdprService.updateConsent(mockUserId, dto, metadata);

      // Assert
      expect(result.granted).toBe(true);
      expect(mockPrismaService.auditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            action: 'GDPR_CONSENT_UPDATE',
            entityType: 'GDPR',
          }),
        })
      );
    });

    it('should successfully revoke a consent', async () => {
      // Arrange
      const dto = { type: ConsentType.MARKETING, granted: false };
      mockPrismaService.userConsent.upsert.mockResolvedValue({
        userId: mockUserId,
        type: ConsentType.MARKETING,
        granted: false,
        grantedAt: null,
        revokedAt: new Date(),
        ipAddress: metadata.ipAddress,
        userAgent: metadata.userAgent,
      });

      // Act
      const result = await gdprService.updateConsent(mockUserId, dto, metadata);

      // Assert
      expect(result.granted).toBe(false);
      expect(result.revokedAt).not.toBeNull();
    });

    it('should throw BadRequestException when revoking essential consent', async () => {
      // Arrange
      const dto = { type: ConsentType.ESSENTIAL, granted: false };

      // Act & Assert
      await expect(gdprService.updateConsent(mockUserId, dto, metadata)).rejects.toThrow(
        BadRequestException
      );
      await expect(gdprService.updateConsent(mockUserId, dto, metadata)).rejects.toThrow(
        'Essential consent cannot be revoked'
      );
    });

    it('should allow granting essential consent', async () => {
      // Arrange
      const dto = { type: ConsentType.ESSENTIAL, granted: true };
      mockPrismaService.userConsent.upsert.mockResolvedValue({
        userId: mockUserId,
        type: ConsentType.ESSENTIAL,
        granted: true,
        grantedAt: new Date(),
        revokedAt: null,
        ipAddress: metadata.ipAddress,
        userAgent: metadata.userAgent,
      });

      // Act
      const result = await gdprService.updateConsent(mockUserId, dto, metadata);

      // Assert
      expect(result.granted).toBe(true);
    });

    it('should use upsert to create or update consent', async () => {
      // Arrange
      const dto = { type: ConsentType.ANALYTICS, granted: true };
      mockPrismaService.userConsent.upsert.mockResolvedValue({
        userId: mockUserId,
        type: dto.type,
        granted: dto.granted,
        grantedAt: new Date(),
        revokedAt: null,
        ipAddress: metadata.ipAddress,
        userAgent: metadata.userAgent,
      });

      // Act
      await gdprService.updateConsent(mockUserId, dto, metadata);

      // Assert
      expect(mockPrismaService.userConsent.upsert).toHaveBeenCalledWith({
        where: {
          userId_type: {
            userId: mockUserId,
            type: dto.type,
          },
        },
        create: expect.objectContaining({
          userId: mockUserId,
          type: dto.type,
          granted: dto.granted,
        }),
        update: expect.objectContaining({
          granted: dto.granted,
        }),
      });
    });

    it('should log consent changes to audit log', async () => {
      // Arrange
      const dto = { type: ConsentType.PERSONALIZATION, granted: true };
      mockPrismaService.userConsent.upsert.mockResolvedValue({
        userId: mockUserId,
        type: dto.type,
        granted: dto.granted,
        grantedAt: new Date(),
        revokedAt: null,
        ipAddress: metadata.ipAddress,
        userAgent: metadata.userAgent,
      });

      // Act
      await gdprService.updateConsent(mockUserId, dto, metadata);

      // Assert
      expect(mockPrismaService.auditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: mockUserId,
          action: 'GDPR_CONSENT_UPDATE',
          entityType: 'GDPR',
          entityId: mockUserId,
          newValue: { consentType: dto.type, granted: dto.granted },
        }),
      });
    });
  });

  // ==========================================================================
  // UPDATE CONSENTS (BULK) Tests
  // ==========================================================================

  describe('updateConsents', () => {
    const metadata = { ipAddress: '127.0.0.1', userAgent: 'TestAgent' };

    it('should update multiple consents at once', async () => {
      // Arrange
      const dto = {
        consents: [
          { type: ConsentType.MARKETING, granted: true },
          { type: ConsentType.ANALYTICS, granted: false },
        ],
      };
      mockPrismaService.userConsent.upsert.mockResolvedValue({
        userId: mockUserId,
        granted: true,
        grantedAt: new Date(),
        revokedAt: null,
        ipAddress: metadata.ipAddress,
        userAgent: metadata.userAgent,
      });

      // Act
      const result = await gdprService.updateConsents(mockUserId, dto, metadata);

      // Assert
      expect(result).toHaveLength(2);
      expect(mockPrismaService.userConsent.upsert).toHaveBeenCalledTimes(2);
    });

    it('should fail if any consent update is invalid', async () => {
      // Arrange
      const dto = {
        consents: [
          { type: ConsentType.MARKETING, granted: true },
          { type: ConsentType.ESSENTIAL, granted: false }, // Invalid
        ],
      };
      mockPrismaService.userConsent.upsert.mockResolvedValue({
        userId: mockUserId,
        granted: true,
        grantedAt: new Date(),
        revokedAt: null,
        ipAddress: metadata.ipAddress,
        userAgent: metadata.userAgent,
      });

      // Act & Assert
      await expect(gdprService.updateConsents(mockUserId, dto, metadata)).rejects.toThrow(
        BadRequestException
      );
    });
  });

  // ==========================================================================
  // GET CONSENT HISTORY Tests (via audit logs)
  // ==========================================================================

  describe('getConsentHistory (via getAuditLogs)', () => {
    it('should return GDPR audit logs for user', async () => {
      // Arrange
      mockPrismaService.auditLog.findMany.mockResolvedValue([
        {
          id: 'audit-1',
          userId: mockUserId,
          action: 'GDPR_CONSENT_UPDATE',
          entityType: 'GDPR',
          entityId: mockUserId,
          newValue: { consentType: ConsentType.MARKETING, granted: true },
          createdAt: new Date('2024-01-01'),
        },
        {
          id: 'audit-2',
          userId: mockUserId,
          action: 'GDPR_CONSENT_UPDATE',
          entityType: 'GDPR',
          entityId: mockUserId,
          newValue: { consentType: ConsentType.MARKETING, granted: false },
          createdAt: new Date('2024-01-02'),
        },
      ]);

      // Act
      const result = await gdprService.getAuditLogs(mockUserId);

      // Assert
      expect(result).toHaveLength(2);
      expect(mockPrismaService.auditLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            action: { startsWith: 'GDPR_' },
          }),
        })
      );
    });

    it('should order logs by createdAt descending', async () => {
      // Arrange
      mockPrismaService.auditLog.findMany.mockResolvedValue([]);

      // Act
      await gdprService.getAuditLogs(mockUserId);

      // Assert
      expect(mockPrismaService.auditLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: { createdAt: 'desc' },
        })
      );
    });

    it('should limit results to 100', async () => {
      // Arrange
      mockPrismaService.auditLog.findMany.mockResolvedValue([]);

      // Act
      await gdprService.getAuditLogs(mockUserId);

      // Assert
      expect(mockPrismaService.auditLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 100,
        })
      );
    });
  });

  // ==========================================================================
  // CREATE DATA REQUEST Tests
  // ==========================================================================

  describe('createDataRequest', () => {
    it('should create a data access request', async () => {
      // Arrange
      const dto = {
        type: GdprRequestType.DATA_ACCESS,
        details: 'I want to see all my data',
        format: ExportFormat.JSON,
      };
      mockPrismaService.gdprRequest.findFirst.mockResolvedValue(null);
      mockPrismaService.gdprRequest.create.mockResolvedValue({
        id: mockRequestId,
        userId: mockUserId,
        type: dto.type,
        status: GdprRequestStatus.PENDING,
        details: dto.details,
        format: dto.format,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      // Act
      const result = await gdprService.createDataRequest(mockUserId, dto);

      // Assert
      expect(result.id).toBe(mockRequestId);
      expect(result.type).toBe(GdprRequestType.DATA_ACCESS);
      expect(result.status).toBe(GdprRequestStatus.PENDING);
    });

    it('should create a data deletion request', async () => {
      // Arrange
      const dto = {
        type: GdprRequestType.DATA_DELETION,
        details: 'Please delete all my data',
      };
      mockPrismaService.gdprRequest.findFirst.mockResolvedValue(null);
      mockPrismaService.gdprRequest.create.mockResolvedValue({
        id: mockRequestId,
        userId: mockUserId,
        type: dto.type,
        status: GdprRequestStatus.PENDING,
        details: dto.details,
        format: ExportFormat.JSON,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      // Act
      const result = await gdprService.createDataRequest(mockUserId, dto);

      // Assert
      expect(result.type).toBe(GdprRequestType.DATA_DELETION);
    });

    it('should throw BadRequestException when pending request already exists', async () => {
      // Arrange
      const dto = { type: GdprRequestType.DATA_ACCESS };
      mockPrismaService.gdprRequest.findFirst.mockResolvedValue({
        id: 'existing-request',
        userId: mockUserId,
        type: GdprRequestType.DATA_ACCESS,
        status: GdprRequestStatus.PENDING,
      });

      // Act & Assert
      await expect(gdprService.createDataRequest(mockUserId, dto)).rejects.toThrow(
        BadRequestException
      );
      await expect(gdprService.createDataRequest(mockUserId, dto)).rejects.toThrow(
        'You already have a pending DATA_ACCESS request'
      );
    });

    it('should throw BadRequestException when in_progress request exists', async () => {
      // Arrange
      const dto = { type: GdprRequestType.DATA_DELETION };
      mockPrismaService.gdprRequest.findFirst.mockResolvedValue({
        id: 'existing-request',
        userId: mockUserId,
        type: GdprRequestType.DATA_DELETION,
        status: GdprRequestStatus.IN_PROGRESS,
      });

      // Act & Assert
      await expect(gdprService.createDataRequest(mockUserId, dto)).rejects.toThrow(
        BadRequestException
      );
    });

    it('should allow creating request if previous one was completed', async () => {
      // Arrange
      const dto = { type: GdprRequestType.DATA_ACCESS };
      mockPrismaService.gdprRequest.findFirst.mockResolvedValue(null); // No pending request
      mockPrismaService.gdprRequest.create.mockResolvedValue({
        id: mockRequestId,
        userId: mockUserId,
        type: dto.type,
        status: GdprRequestStatus.PENDING,
        details: null,
        format: ExportFormat.JSON,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      // Act
      const result = await gdprService.createDataRequest(mockUserId, dto);

      // Assert
      expect(result).toBeDefined();
    });

    it('should log request creation to audit log', async () => {
      // Arrange
      const dto = { type: GdprRequestType.DATA_PORTABILITY };
      mockPrismaService.gdprRequest.findFirst.mockResolvedValue(null);
      mockPrismaService.gdprRequest.create.mockResolvedValue({
        id: mockRequestId,
        userId: mockUserId,
        type: dto.type,
        status: GdprRequestStatus.PENDING,
        details: null,
        format: ExportFormat.JSON,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      // Act
      await gdprService.createDataRequest(mockUserId, dto);

      // Assert
      expect(mockPrismaService.auditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          action: 'GDPR_DATA_REQUEST_CREATED',
          newValue: expect.objectContaining({
            requestId: mockRequestId,
            type: dto.type,
          }),
        }),
      });
    });

    it('should use default format JSON when not specified', async () => {
      // Arrange
      const dto = { type: GdprRequestType.DATA_ACCESS };
      mockPrismaService.gdprRequest.findFirst.mockResolvedValue(null);
      mockPrismaService.gdprRequest.create.mockResolvedValue({
        id: mockRequestId,
        userId: mockUserId,
        type: dto.type,
        status: GdprRequestStatus.PENDING,
        details: null,
        format: ExportFormat.JSON,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      // Act
      await gdprService.createDataRequest(mockUserId, dto);

      // Assert
      expect(mockPrismaService.gdprRequest.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          format: ExportFormat.JSON,
        }),
      });
    });
  });

  // ==========================================================================
  // GET USER REQUESTS Tests
  // ==========================================================================

  describe('getUserRequests', () => {
    it('should return all requests for user', async () => {
      // Arrange
      mockPrismaService.gdprRequest.findMany.mockResolvedValue([
        {
          id: 'request-1',
          userId: mockUserId,
          type: GdprRequestType.DATA_ACCESS,
          status: GdprRequestStatus.COMPLETED,
          createdAt: new Date('2024-01-01'),
        },
        {
          id: 'request-2',
          userId: mockUserId,
          type: GdprRequestType.DATA_DELETION,
          status: GdprRequestStatus.PENDING,
          createdAt: new Date('2024-01-02'),
        },
      ]);

      // Act
      const result = await gdprService.getUserRequests(mockUserId);

      // Assert
      expect(result).toHaveLength(2);
    });

    it('should order requests by createdAt descending', async () => {
      // Arrange
      mockPrismaService.gdprRequest.findMany.mockResolvedValue([]);

      // Act
      await gdprService.getUserRequests(mockUserId);

      // Assert
      expect(mockPrismaService.gdprRequest.findMany).toHaveBeenCalledWith({
        where: { userId: mockUserId },
        orderBy: { createdAt: 'desc' },
      });
    });

    it('should return empty array when no requests', async () => {
      // Arrange
      mockPrismaService.gdprRequest.findMany.mockResolvedValue([]);

      // Act
      const result = await gdprService.getUserRequests(mockUserId);

      // Assert
      expect(result).toEqual([]);
    });
  });

  // ==========================================================================
  // GET REQUEST Tests
  // ==========================================================================

  describe('getRequest', () => {
    it('should return request when found', async () => {
      // Arrange
      mockPrismaService.gdprRequest.findUnique.mockResolvedValue({
        id: mockRequestId,
        userId: mockUserId,
        type: GdprRequestType.DATA_ACCESS,
        status: GdprRequestStatus.PENDING,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      // Act
      const result = await gdprService.getRequest(mockRequestId);

      // Assert
      expect(result.id).toBe(mockRequestId);
    });

    it('should throw NotFoundException when request not found', async () => {
      // Arrange
      mockPrismaService.gdprRequest.findUnique.mockResolvedValue(null);

      // Act & Assert
      await expect(gdprService.getRequest('non-existent-id')).rejects.toThrow(NotFoundException);
      await expect(gdprService.getRequest('non-existent-id')).rejects.toThrow(
        'Request with ID non-existent-id not found'
      );
    });

    it('should throw ForbiddenException when user accesses other user request', async () => {
      // Arrange
      mockPrismaService.gdprRequest.findUnique.mockResolvedValue({
        id: mockRequestId,
        userId: 'other-user-id',
        type: GdprRequestType.DATA_ACCESS,
        status: GdprRequestStatus.PENDING,
      });

      // Act & Assert
      await expect(gdprService.getRequest(mockRequestId, mockUserId)).rejects.toThrow(
        ForbiddenException
      );
      await expect(gdprService.getRequest(mockRequestId, mockUserId)).rejects.toThrow(
        'You can only access your own requests'
      );
    });

    it('should allow user to access own request', async () => {
      // Arrange
      mockPrismaService.gdprRequest.findUnique.mockResolvedValue({
        id: mockRequestId,
        userId: mockUserId,
        type: GdprRequestType.DATA_ACCESS,
        status: GdprRequestStatus.PENDING,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      // Act
      const result = await gdprService.getRequest(mockRequestId, mockUserId);

      // Assert
      expect(result.id).toBe(mockRequestId);
    });

    it('should allow admin to access any request (without userId param)', async () => {
      // Arrange
      mockPrismaService.gdprRequest.findUnique.mockResolvedValue({
        id: mockRequestId,
        userId: 'other-user-id',
        type: GdprRequestType.DATA_ACCESS,
        status: GdprRequestStatus.PENDING,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      // Act
      const result = await gdprService.getRequest(mockRequestId);

      // Assert
      expect(result.id).toBe(mockRequestId);
    });
  });

  // ==========================================================================
  // GET ALL REQUESTS (Admin) Tests
  // ==========================================================================

  describe('getAllRequests', () => {
    it('should return paginated requests', async () => {
      // Arrange
      mockPrismaService.gdprRequest.findMany.mockResolvedValue([
        { id: 'request-1', type: GdprRequestType.DATA_ACCESS },
        { id: 'request-2', type: GdprRequestType.DATA_DELETION },
      ]);
      mockPrismaService.gdprRequest.count.mockResolvedValue(2);

      // Act
      const result = await gdprService.getAllRequests({ page: 1, limit: 20 });

      // Assert
      expect(result.items).toHaveLength(2);
      expect(result.total).toBe(2);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(20);
      expect(result.totalPages).toBe(1);
    });

    it('should filter by status', async () => {
      // Arrange
      mockPrismaService.gdprRequest.findMany.mockResolvedValue([]);
      mockPrismaService.gdprRequest.count.mockResolvedValue(0);

      // Act
      await gdprService.getAllRequests({ status: GdprRequestStatus.PENDING });

      // Assert
      expect(mockPrismaService.gdprRequest.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: GdprRequestStatus.PENDING,
          }),
        })
      );
    });

    it('should filter by type', async () => {
      // Arrange
      mockPrismaService.gdprRequest.findMany.mockResolvedValue([]);
      mockPrismaService.gdprRequest.count.mockResolvedValue(0);

      // Act
      await gdprService.getAllRequests({ type: GdprRequestType.DATA_DELETION });

      // Assert
      expect(mockPrismaService.gdprRequest.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            type: GdprRequestType.DATA_DELETION,
          }),
        })
      );
    });

    it('should filter by userId', async () => {
      // Arrange
      mockPrismaService.gdprRequest.findMany.mockResolvedValue([]);
      mockPrismaService.gdprRequest.count.mockResolvedValue(0);

      // Act
      await gdprService.getAllRequests({ userId: mockUserId });

      // Assert
      expect(mockPrismaService.gdprRequest.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            userId: mockUserId,
          }),
        })
      );
    });

    it('should calculate correct pagination values', async () => {
      // Arrange
      mockPrismaService.gdprRequest.findMany.mockResolvedValue([]);
      mockPrismaService.gdprRequest.count.mockResolvedValue(45);

      // Act
      const result = await gdprService.getAllRequests({ page: 2, limit: 10 });

      // Assert
      expect(result.page).toBe(2);
      expect(result.limit).toBe(10);
      expect(result.totalPages).toBe(5);
      expect(mockPrismaService.gdprRequest.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 10,
          take: 10,
        })
      );
    });

    it('should use default page and limit', async () => {
      // Arrange
      mockPrismaService.gdprRequest.findMany.mockResolvedValue([]);
      mockPrismaService.gdprRequest.count.mockResolvedValue(0);

      // Act
      const result = await gdprService.getAllRequests({});

      // Assert
      expect(result.page).toBe(1);
      expect(result.limit).toBe(20);
    });
  });

  // ==========================================================================
  // PROCESS REQUEST Tests
  // ==========================================================================

  describe('processRequest', () => {
    it('should approve a data access request', async () => {
      // Arrange
      mockPrismaService.gdprRequest.findUnique.mockResolvedValue({
        id: mockRequestId,
        userId: mockUserId,
        type: GdprRequestType.DATA_ACCESS,
        status: GdprRequestStatus.PENDING,
        format: ExportFormat.JSON,
      });
      mockPrismaService.user.findUnique.mockResolvedValue({
        id: mockUserId,
        email: 'test@test.com',
        firstName: 'Test',
        lastName: 'User',
      });
      mockPrismaService.ticket.findMany.mockResolvedValue([]);
      mockPrismaService.payment.findMany.mockResolvedValue([]);
      mockPrismaService.cashlessTransaction.findMany.mockResolvedValue([]);
      mockPrismaService.supportTicket.findMany.mockResolvedValue([]);
      mockPrismaService.userConsent.findMany.mockResolvedValue([]);
      mockPrismaService.notification.findMany.mockResolvedValue([]);
      mockPrismaService.gdprRequest.update.mockResolvedValue({
        id: mockRequestId,
        status: GdprRequestStatus.COMPLETED,
        processedAt: new Date(),
        processedBy: mockAdminId,
      });

      // Act
      await gdprService.processRequest(mockRequestId, { action: 'APPROVE' }, mockAdminId);

      // Assert
      expect(mockPrismaService.gdprRequest.update).toHaveBeenCalledWith({
        where: { id: mockRequestId },
        data: expect.objectContaining({
          status: GdprRequestStatus.COMPLETED,
          processedBy: mockAdminId,
        }),
      });
    });

    it('should reject a request with reason', async () => {
      // Arrange
      mockPrismaService.gdprRequest.findUnique
        .mockResolvedValueOnce({
          id: mockRequestId,
          userId: mockUserId,
          type: GdprRequestType.DATA_DELETION,
          status: GdprRequestStatus.PENDING,
        })
        .mockResolvedValueOnce({
          id: mockRequestId,
          status: GdprRequestStatus.REJECTED,
          processedAt: new Date(),
          processedBy: mockAdminId,
          rejectionReason: 'Invalid request',
        });
      mockPrismaService.gdprRequest.update.mockResolvedValue({});

      // Act
      await gdprService.processRequest(
        mockRequestId,
        { action: 'REJECT', rejectionReason: 'Invalid request' },
        mockAdminId
      );

      // Assert
      expect(mockPrismaService.gdprRequest.update).toHaveBeenCalledWith({
        where: { id: mockRequestId },
        data: expect.objectContaining({
          status: GdprRequestStatus.REJECTED,
          rejectionReason: 'Invalid request',
        }),
      });
    });

    it('should throw BadRequestException when rejecting without reason', async () => {
      // Arrange
      mockPrismaService.gdprRequest.findUnique.mockResolvedValue({
        id: mockRequestId,
        userId: mockUserId,
        type: GdprRequestType.DATA_DELETION,
        status: GdprRequestStatus.PENDING,
      });

      // Act & Assert
      await expect(
        gdprService.processRequest(mockRequestId, { action: 'REJECT' }, mockAdminId)
      ).rejects.toThrow(BadRequestException);
      await expect(
        gdprService.processRequest(mockRequestId, { action: 'REJECT' }, mockAdminId)
      ).rejects.toThrow('Rejection reason is required');
    });

    it('should throw BadRequestException when processing non-pending request', async () => {
      // Arrange
      mockPrismaService.gdprRequest.findUnique.mockResolvedValue({
        id: mockRequestId,
        userId: mockUserId,
        type: GdprRequestType.DATA_ACCESS,
        status: GdprRequestStatus.COMPLETED,
      });

      // Act & Assert
      await expect(
        gdprService.processRequest(mockRequestId, { action: 'APPROVE' }, mockAdminId)
      ).rejects.toThrow(BadRequestException);
      await expect(
        gdprService.processRequest(mockRequestId, { action: 'APPROVE' }, mockAdminId)
      ).rejects.toThrow('Only pending requests can be processed');
    });

    it('should log request processing to audit log', async () => {
      // Arrange
      mockPrismaService.gdprRequest.findUnique.mockResolvedValue({
        id: mockRequestId,
        userId: mockUserId,
        type: GdprRequestType.DATA_ACCESS,
        status: GdprRequestStatus.PENDING,
        format: ExportFormat.JSON,
      });
      mockPrismaService.user.findUnique.mockResolvedValue({
        id: mockUserId,
        email: 'test@test.com',
        firstName: 'Test',
        lastName: 'User',
      });
      mockPrismaService.ticket.findMany.mockResolvedValue([]);
      mockPrismaService.payment.findMany.mockResolvedValue([]);
      mockPrismaService.cashlessTransaction.findMany.mockResolvedValue([]);
      mockPrismaService.supportTicket.findMany.mockResolvedValue([]);
      mockPrismaService.userConsent.findMany.mockResolvedValue([]);
      mockPrismaService.notification.findMany.mockResolvedValue([]);
      mockPrismaService.gdprRequest.update.mockResolvedValue({
        id: mockRequestId,
        status: GdprRequestStatus.COMPLETED,
      });

      // Act
      await gdprService.processRequest(mockRequestId, { action: 'APPROVE' }, mockAdminId);

      // Assert
      expect(mockPrismaService.auditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          action: 'GDPR_DATA_REQUEST_PROCESSED',
          newValue: expect.objectContaining({
            requestId: mockRequestId,
            action: 'APPROVE',
            processedBy: mockAdminId,
          }),
        }),
      });
    });
  });

  // ==========================================================================
  // EXPORT USER DATA Tests
  // ==========================================================================

  describe('exportUserData (via generateDataExport)', () => {
    it('should generate data export in JSON format', async () => {
      // Arrange
      const mockRequest = {
        id: mockRequestId,
        userId: mockUserId,
        format: ExportFormat.JSON,
      };
      mockPrismaService.user.findUnique.mockResolvedValue({
        id: mockUserId,
        email: 'test@test.com',
        firstName: 'Test',
        lastName: 'User',
        phone: '+33612345678',
        createdAt: new Date(),
        updatedAt: new Date(),
        lastLoginAt: new Date(),
      });
      mockPrismaService.ticket.findMany.mockResolvedValue([
        { id: 'ticket-1', qrCode: 'QR123', status: 'VALID' },
      ]);
      mockPrismaService.payment.findMany.mockResolvedValue([
        { id: 'payment-1', amount: 50, currency: 'EUR', status: 'COMPLETED' },
      ]);
      mockPrismaService.cashlessTransaction.findMany.mockResolvedValue([]);
      mockPrismaService.supportTicket.findMany.mockResolvedValue([]);
      mockPrismaService.userConsent.findMany.mockResolvedValue([]);
      mockPrismaService.notification.findMany.mockResolvedValue([]);
      mockPrismaService.gdprRequest.update.mockResolvedValue({});

      // Act
      const result = await gdprService.generateDataExport(mockRequest);

      // Assert
      expect(result.downloadToken).toBeDefined();
      expect(result.expiresAt).toBeDefined();
      expect(mockPrismaService.gdprRequest.update).toHaveBeenCalledWith({
        where: { id: mockRequestId },
        data: expect.objectContaining({
          downloadUrl: expect.stringContaining('/api/gdpr/download/'),
        }),
      });
    });

    it('should collect all user data for export', async () => {
      // Arrange
      const mockRequest = {
        id: mockRequestId,
        userId: mockUserId,
        format: ExportFormat.JSON,
      };
      mockPrismaService.user.findUnique.mockResolvedValue({
        id: mockUserId,
        email: 'test@test.com',
        firstName: 'Test',
        lastName: 'User',
        phone: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        lastLoginAt: null,
      });
      mockPrismaService.ticket.findMany.mockResolvedValue([]);
      mockPrismaService.payment.findMany.mockResolvedValue([]);
      mockPrismaService.cashlessTransaction.findMany.mockResolvedValue([]);
      mockPrismaService.supportTicket.findMany.mockResolvedValue([]);
      mockPrismaService.userConsent.findMany.mockResolvedValue([]);
      mockPrismaService.notification.findMany.mockResolvedValue([]);
      mockPrismaService.gdprRequest.update.mockResolvedValue({});

      // Act
      await gdprService.generateDataExport(mockRequest);

      // Assert - verify all data sources are queried
      expect(mockPrismaService.user.findUnique).toHaveBeenCalled();
      expect(mockPrismaService.ticket.findMany).toHaveBeenCalled();
      expect(mockPrismaService.payment.findMany).toHaveBeenCalled();
      expect(mockPrismaService.cashlessTransaction.findMany).toHaveBeenCalled();
      expect(mockPrismaService.supportTicket.findMany).toHaveBeenCalled();
      expect(mockPrismaService.userConsent.findMany).toHaveBeenCalled();
      expect(mockPrismaService.notification.findMany).toHaveBeenCalled();
    });

    it('should set download expiration to 7 days', async () => {
      // Arrange
      const mockRequest = {
        id: mockRequestId,
        userId: mockUserId,
        format: ExportFormat.JSON,
      };
      mockPrismaService.user.findUnique.mockResolvedValue({
        id: mockUserId,
        email: 'test@test.com',
        firstName: 'Test',
        lastName: 'User',
        phone: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        lastLoginAt: null,
      });
      mockPrismaService.ticket.findMany.mockResolvedValue([]);
      mockPrismaService.payment.findMany.mockResolvedValue([]);
      mockPrismaService.cashlessTransaction.findMany.mockResolvedValue([]);
      mockPrismaService.supportTicket.findMany.mockResolvedValue([]);
      mockPrismaService.userConsent.findMany.mockResolvedValue([]);
      mockPrismaService.notification.findMany.mockResolvedValue([]);
      mockPrismaService.gdprRequest.update.mockResolvedValue({});

      // Act
      const result = await gdprService.generateDataExport(mockRequest);

      // Assert
      const sevenDaysFromNow = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
      const expiresAt = new Date(result.expiresAt);
      // Allow 1 second tolerance
      expect(Math.abs(expiresAt.getTime() - sevenDaysFromNow.getTime())).toBeLessThan(1000);
    });
  });

  // ==========================================================================
  // DOWNLOAD EXPORT Tests
  // ==========================================================================

  describe('downloadExport', () => {
    it('should return export data when valid token', async () => {
      // Arrange
      const downloadToken = 'valid-token-123';
      mockPrismaService.gdprRequest.findFirst.mockResolvedValue({
        id: mockRequestId,
        userId: mockUserId,
        format: ExportFormat.JSON,
        downloadUrl: `/api/gdpr/download/${downloadToken}`,
        status: GdprRequestStatus.COMPLETED,
        expiresAt: new Date(Date.now() + 86400000), // Tomorrow
      });

      // Act
      const result = await gdprService.downloadExport(downloadToken);

      // Assert
      expect(result.format).toBe(ExportFormat.JSON);
      expect(result.filename).toContain('user-data-export-');
      expect(result.filename).toContain('.json');
    });

    it('should throw NotFoundException when export not found', async () => {
      // Arrange
      mockPrismaService.gdprRequest.findFirst.mockResolvedValue(null);

      // Act & Assert
      await expect(gdprService.downloadExport('invalid-token')).rejects.toThrow(NotFoundException);
      await expect(gdprService.downloadExport('invalid-token')).rejects.toThrow('Export not found');
    });

    it('should throw BadRequestException when export link expired', async () => {
      // Arrange
      const downloadToken = 'expired-token';
      mockPrismaService.gdprRequest.findFirst.mockResolvedValue({
        id: mockRequestId,
        userId: mockUserId,
        format: ExportFormat.JSON,
        downloadUrl: `/api/gdpr/download/${downloadToken}`,
        status: GdprRequestStatus.COMPLETED,
        expiresAt: new Date(Date.now() - 86400000), // Yesterday
      });

      // Act & Assert
      await expect(gdprService.downloadExport(downloadToken)).rejects.toThrow(BadRequestException);
      await expect(gdprService.downloadExport(downloadToken)).rejects.toThrow(
        'Export link has expired'
      );
    });

    it('should generate correct filename based on format', async () => {
      // Arrange - CSV
      const downloadToken = 'csv-token';
      mockPrismaService.gdprRequest.findFirst.mockResolvedValue({
        id: mockRequestId,
        userId: mockUserId,
        format: ExportFormat.CSV,
        downloadUrl: `/api/gdpr/download/${downloadToken}`,
        status: GdprRequestStatus.COMPLETED,
        expiresAt: new Date(Date.now() + 86400000),
      });

      // Act
      const result = await gdprService.downloadExport(downloadToken);

      // Assert
      expect(result.filename).toContain('.csv');
    });
  });

  // ==========================================================================
  // DELETE USER DATA (Right to be Forgotten) Tests
  // ==========================================================================

  describe('deleteUserData (via executeDataDeletion)', () => {
    it('should anonymize user data', async () => {
      // Arrange
      mockPrismaService.$transaction.mockImplementation(async (callback) => {
        const tx = {
          user: {
            update: jest.fn(),
          },
          pushToken: {
            deleteMany: jest.fn(),
          },
          userConsent: {
            deleteMany: jest.fn(),
          },
          notification: {
            deleteMany: jest.fn(),
          },
          session: {
            deleteMany: jest.fn(),
          },
        };
        await callback(tx);
        return tx;
      });

      // Act
      await gdprService.executeDataDeletion(mockUserId);

      // Assert
      expect(mockPrismaService.$transaction).toHaveBeenCalled();
      expect(mockPrismaService.auditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          action: 'GDPR_DATA_DELETED',
          newValue: expect.objectContaining({
            anonymizedEmail: expect.stringContaining('@deleted.local'),
          }),
        }),
      });
    });

    it('should delete push tokens', async () => {
      // Arrange
      const mockTx = {
        user: { update: jest.fn() },
        pushToken: { deleteMany: jest.fn() },
        userConsent: { deleteMany: jest.fn() },
        notification: { deleteMany: jest.fn() },
        session: { deleteMany: jest.fn() },
      };
      mockPrismaService.$transaction.mockImplementation(async (callback) => {
        await callback(mockTx);
        return mockTx;
      });

      // Act
      await gdprService.executeDataDeletion(mockUserId);

      // Assert
      expect(mockTx.pushToken.deleteMany).toHaveBeenCalledWith({
        where: { userId: mockUserId },
      });
    });

    it('should delete user consents', async () => {
      // Arrange
      const mockTx = {
        user: { update: jest.fn() },
        pushToken: { deleteMany: jest.fn() },
        userConsent: { deleteMany: jest.fn() },
        notification: { deleteMany: jest.fn() },
        session: { deleteMany: jest.fn() },
      };
      mockPrismaService.$transaction.mockImplementation(async (callback) => {
        await callback(mockTx);
        return mockTx;
      });

      // Act
      await gdprService.executeDataDeletion(mockUserId);

      // Assert
      expect(mockTx.userConsent.deleteMany).toHaveBeenCalledWith({
        where: { userId: mockUserId },
      });
    });

    it('should delete notifications', async () => {
      // Arrange
      const mockTx = {
        user: { update: jest.fn() },
        pushToken: { deleteMany: jest.fn() },
        userConsent: { deleteMany: jest.fn() },
        notification: { deleteMany: jest.fn() },
        session: { deleteMany: jest.fn() },
      };
      mockPrismaService.$transaction.mockImplementation(async (callback) => {
        await callback(mockTx);
        return mockTx;
      });

      // Act
      await gdprService.executeDataDeletion(mockUserId);

      // Assert
      expect(mockTx.notification.deleteMany).toHaveBeenCalledWith({
        where: { userId: mockUserId },
      });
    });

    it('should delete sessions', async () => {
      // Arrange
      const mockTx = {
        user: { update: jest.fn() },
        pushToken: { deleteMany: jest.fn() },
        userConsent: { deleteMany: jest.fn() },
        notification: { deleteMany: jest.fn() },
        session: { deleteMany: jest.fn() },
      };
      mockPrismaService.$transaction.mockImplementation(async (callback) => {
        await callback(mockTx);
        return mockTx;
      });

      // Act
      await gdprService.executeDataDeletion(mockUserId);

      // Assert
      expect(mockTx.session.deleteMany).toHaveBeenCalledWith({
        where: { userId: mockUserId },
      });
    });

    it('should set user status to INACTIVE', async () => {
      // Arrange
      const mockTx = {
        user: { update: jest.fn() },
        pushToken: { deleteMany: jest.fn() },
        userConsent: { deleteMany: jest.fn() },
        notification: { deleteMany: jest.fn() },
        session: { deleteMany: jest.fn() },
      };
      mockPrismaService.$transaction.mockImplementation(async (callback) => {
        await callback(mockTx);
        return mockTx;
      });

      // Act
      await gdprService.executeDataDeletion(mockUserId);

      // Assert
      expect(mockTx.user.update).toHaveBeenCalledWith({
        where: { id: mockUserId },
        data: expect.objectContaining({
          status: 'INACTIVE',
        }),
      });
    });

    it('should clear password hash', async () => {
      // Arrange
      const mockTx = {
        user: { update: jest.fn() },
        pushToken: { deleteMany: jest.fn() },
        userConsent: { deleteMany: jest.fn() },
        notification: { deleteMany: jest.fn() },
        session: { deleteMany: jest.fn() },
      };
      mockPrismaService.$transaction.mockImplementation(async (callback) => {
        await callback(mockTx);
        return mockTx;
      });

      // Act
      await gdprService.executeDataDeletion(mockUserId);

      // Assert
      expect(mockTx.user.update).toHaveBeenCalledWith({
        where: { id: mockUserId },
        data: expect.objectContaining({
          passwordHash: '',
        }),
      });
    });

    it('should set anonymous email with unique identifier', async () => {
      // Arrange
      const mockTx = {
        user: { update: jest.fn() },
        pushToken: { deleteMany: jest.fn() },
        userConsent: { deleteMany: jest.fn() },
        notification: { deleteMany: jest.fn() },
        session: { deleteMany: jest.fn() },
      };
      mockPrismaService.$transaction.mockImplementation(async (callback) => {
        await callback(mockTx);
        return mockTx;
      });

      // Act
      await gdprService.executeDataDeletion(mockUserId);

      // Assert
      expect(mockTx.user.update).toHaveBeenCalledWith({
        where: { id: mockUserId },
        data: expect.objectContaining({
          email: expect.stringMatching(/^deleted-[a-f0-9]+@deleted\.local$/),
        }),
      });
    });
  });

  // ==========================================================================
  // ANONYMIZE USER Tests
  // ==========================================================================

  describe('anonymizeUser (via executeDataDeletion)', () => {
    it('should replace firstName with "Deleted"', async () => {
      // Arrange
      const mockTx = {
        user: { update: jest.fn() },
        pushToken: { deleteMany: jest.fn() },
        userConsent: { deleteMany: jest.fn() },
        notification: { deleteMany: jest.fn() },
        session: { deleteMany: jest.fn() },
      };
      mockPrismaService.$transaction.mockImplementation(async (callback) => {
        await callback(mockTx);
        return mockTx;
      });

      // Act
      await gdprService.executeDataDeletion(mockUserId);

      // Assert
      expect(mockTx.user.update).toHaveBeenCalledWith({
        where: { id: mockUserId },
        data: expect.objectContaining({
          firstName: 'Deleted',
        }),
      });
    });

    it('should replace lastName with "User"', async () => {
      // Arrange
      const mockTx = {
        user: { update: jest.fn() },
        pushToken: { deleteMany: jest.fn() },
        userConsent: { deleteMany: jest.fn() },
        notification: { deleteMany: jest.fn() },
        session: { deleteMany: jest.fn() },
      };
      mockPrismaService.$transaction.mockImplementation(async (callback) => {
        await callback(mockTx);
        return mockTx;
      });

      // Act
      await gdprService.executeDataDeletion(mockUserId);

      // Assert
      expect(mockTx.user.update).toHaveBeenCalledWith({
        where: { id: mockUserId },
        data: expect.objectContaining({
          lastName: 'User',
        }),
      });
    });

    it('should clear phone number', async () => {
      // Arrange
      const mockTx = {
        user: { update: jest.fn() },
        pushToken: { deleteMany: jest.fn() },
        userConsent: { deleteMany: jest.fn() },
        notification: { deleteMany: jest.fn() },
        session: { deleteMany: jest.fn() },
      };
      mockPrismaService.$transaction.mockImplementation(async (callback) => {
        await callback(mockTx);
        return mockTx;
      });

      // Act
      await gdprService.executeDataDeletion(mockUserId);

      // Assert
      expect(mockTx.user.update).toHaveBeenCalledWith({
        where: { id: mockUserId },
        data: expect.objectContaining({
          phone: null,
        }),
      });
    });
  });

  // ==========================================================================
  // CONSENT WITHDRAWAL Tests
  // ==========================================================================

  describe('executeConsentWithdrawal', () => {
    it('should revoke all non-essential consents', async () => {
      // Arrange
      mockPrismaService.userConsent.updateMany.mockResolvedValue({ count: 4 });

      // Act
      await gdprService.executeConsentWithdrawal(mockUserId);

      // Assert
      expect(mockPrismaService.userConsent.updateMany).toHaveBeenCalledWith({
        where: {
          userId: mockUserId,
          type: { not: ConsentType.ESSENTIAL },
        },
        data: {
          granted: false,
          revokedAt: expect.any(Date),
        },
      });
    });

    it('should not revoke essential consent', async () => {
      // Arrange
      mockPrismaService.userConsent.updateMany.mockResolvedValue({ count: 4 });

      // Act
      await gdprService.executeConsentWithdrawal(mockUserId);

      // Assert
      expect(mockPrismaService.userConsent.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            type: { not: ConsentType.ESSENTIAL },
          }),
        })
      );
    });

    it('should log consent withdrawal to audit log', async () => {
      // Arrange
      mockPrismaService.userConsent.updateMany.mockResolvedValue({ count: 4 });

      // Act
      await gdprService.executeConsentWithdrawal(mockUserId);

      // Assert
      expect(mockPrismaService.auditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          action: 'GDPR_CONSENT_WITHDRAWN',
          newValue: { allNonEssential: true },
        }),
      });
    });
  });

  // ==========================================================================
  // DATA RECTIFICATION REQUEST Tests
  // ==========================================================================

  describe('createRectificationRequest', () => {
    it('should create rectification request', async () => {
      // Arrange
      const dto = {
        corrections: [
          { field: 'firstName', currentValue: 'Jon', correctValue: 'John' },
          { field: 'lastName', currentValue: 'Deo', correctValue: 'Doe' },
        ],
      };
      mockPrismaService.gdprRequest.create.mockResolvedValue({
        id: mockRequestId,
        userId: mockUserId,
        type: GdprRequestType.DATA_RECTIFICATION,
        status: GdprRequestStatus.PENDING,
        details: JSON.stringify(dto.corrections),
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      // Act
      const result = await gdprService.createRectificationRequest(mockUserId, dto);

      // Assert
      expect(result.type).toBe(GdprRequestType.DATA_RECTIFICATION);
      expect(result.status).toBe(GdprRequestStatus.PENDING);
    });

    it('should store corrections in details field as JSON', async () => {
      // Arrange
      const dto = {
        corrections: [
          { field: 'email', currentValue: 'old@test.com', correctValue: 'new@test.com' },
        ],
      };
      mockPrismaService.gdprRequest.create.mockResolvedValue({
        id: mockRequestId,
        userId: mockUserId,
        type: GdprRequestType.DATA_RECTIFICATION,
        status: GdprRequestStatus.PENDING,
        details: JSON.stringify(dto.corrections),
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      // Act
      await gdprService.createRectificationRequest(mockUserId, dto);

      // Assert
      expect(mockPrismaService.gdprRequest.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          details: JSON.stringify(dto.corrections),
        }),
      });
    });

    it('should log rectification request to audit log', async () => {
      // Arrange
      const dto = {
        corrections: [
          { field: 'phone', currentValue: '+33600000000', correctValue: '+33612345678' },
        ],
      };
      mockPrismaService.gdprRequest.create.mockResolvedValue({
        id: mockRequestId,
        userId: mockUserId,
        type: GdprRequestType.DATA_RECTIFICATION,
        status: GdprRequestStatus.PENDING,
        details: JSON.stringify(dto.corrections),
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      // Act
      await gdprService.createRectificationRequest(mockUserId, dto);

      // Assert
      expect(mockPrismaService.auditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          action: 'GDPR_RECTIFICATION_REQUESTED',
          newValue: expect.objectContaining({
            requestId: mockRequestId,
            fields: ['phone'],
          }),
        }),
      });
    });
  });

  // ==========================================================================
  // GET DATA PROCESSING LOG Tests
  // ==========================================================================

  describe('getDataProcessingLog (via getAuditLogs)', () => {
    it('should return all GDPR-related audit entries', async () => {
      // Arrange
      mockPrismaService.auditLog.findMany.mockResolvedValue([
        {
          id: 'log-1',
          action: 'GDPR_CONSENT_UPDATE',
          newValue: { consentType: 'MARKETING', granted: true },
          createdAt: new Date(),
        },
        {
          id: 'log-2',
          action: 'GDPR_DATA_REQUEST_CREATED',
          newValue: { type: 'DATA_ACCESS' },
          createdAt: new Date(),
        },
        {
          id: 'log-3',
          action: 'GDPR_DATA_DELETED',
          newValue: {},
          createdAt: new Date(),
        },
      ]);

      // Act
      const result = await gdprService.getAuditLogs(mockUserId);

      // Assert
      expect(result).toHaveLength(3);
      expect(result.every((log) => log.action.startsWith('GDPR_'))).toBe(true);
    });

    it('should filter by GDPR_ action prefix', async () => {
      // Arrange
      mockPrismaService.auditLog.findMany.mockResolvedValue([]);

      // Act
      await gdprService.getAuditLogs(mockUserId);

      // Assert
      expect(mockPrismaService.auditLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            action: { startsWith: 'GDPR_' },
          }),
        })
      );
    });
  });

  // ==========================================================================
  // GET STATISTICS Tests
  // ==========================================================================

  describe('getStatistics', () => {
    it('should return comprehensive statistics', async () => {
      // Arrange
      mockPrismaService.gdprRequest.count
        .mockResolvedValueOnce(100) // totalRequests
        .mockResolvedValueOnce(10); // pendingRequests
      mockPrismaService.gdprRequest.groupBy
        .mockResolvedValueOnce([
          { type: GdprRequestType.DATA_ACCESS, _count: 50 },
          { type: GdprRequestType.DATA_DELETION, _count: 30 },
          { type: GdprRequestType.DATA_PORTABILITY, _count: 20 },
        ])
        .mockResolvedValueOnce([
          { status: GdprRequestStatus.COMPLETED, _count: 80 },
          { status: GdprRequestStatus.PENDING, _count: 10 },
          { status: GdprRequestStatus.REJECTED, _count: 10 },
        ]);
      mockPrismaService.gdprRequest.findMany.mockResolvedValue([
        { id: 'recent-1', createdAt: new Date() },
        { id: 'recent-2', createdAt: new Date() },
      ]);

      // Act
      const result = await gdprService.getStatistics();

      // Assert
      expect(result.totalRequests).toBe(100);
      expect(result.pendingRequests).toBe(10);
      expect(result.byType).toBeDefined();
      expect(result.byStatus).toBeDefined();
      expect(result.recentRequests).toHaveLength(2);
    });

    it('should return requests by type', async () => {
      // Arrange
      mockPrismaService.gdprRequest.count.mockResolvedValueOnce(100).mockResolvedValueOnce(10);
      mockPrismaService.gdprRequest.groupBy
        .mockResolvedValueOnce([
          { type: GdprRequestType.DATA_ACCESS, _count: 50 },
          { type: GdprRequestType.DATA_DELETION, _count: 30 },
        ])
        .mockResolvedValueOnce([]);
      mockPrismaService.gdprRequest.findMany.mockResolvedValue([]);

      // Act
      const result = await gdprService.getStatistics();

      // Assert
      expect(result.byType[GdprRequestType.DATA_ACCESS]).toBe(50);
      expect(result.byType[GdprRequestType.DATA_DELETION]).toBe(30);
    });

    it('should return requests by status', async () => {
      // Arrange
      mockPrismaService.gdprRequest.count.mockResolvedValueOnce(100).mockResolvedValueOnce(10);
      mockPrismaService.gdprRequest.groupBy.mockResolvedValueOnce([]).mockResolvedValueOnce([
        { status: GdprRequestStatus.COMPLETED, _count: 80 },
        { status: GdprRequestStatus.PENDING, _count: 15 },
        { status: GdprRequestStatus.REJECTED, _count: 5 },
      ]);
      mockPrismaService.gdprRequest.findMany.mockResolvedValue([]);

      // Act
      const result = await gdprService.getStatistics();

      // Assert
      expect(result.byStatus[GdprRequestStatus.COMPLETED]).toBe(80);
      expect(result.byStatus[GdprRequestStatus.PENDING]).toBe(15);
      expect(result.byStatus[GdprRequestStatus.REJECTED]).toBe(5);
    });

    it('should return 10 most recent requests', async () => {
      // Arrange
      mockPrismaService.gdprRequest.count.mockResolvedValueOnce(100).mockResolvedValueOnce(10);
      mockPrismaService.gdprRequest.groupBy.mockResolvedValueOnce([]).mockResolvedValueOnce([]);
      mockPrismaService.gdprRequest.findMany.mockResolvedValue([]);

      // Act
      await gdprService.getStatistics();

      // Assert
      expect(mockPrismaService.gdprRequest.findMany).toHaveBeenCalledWith({
        take: 10,
        orderBy: { createdAt: 'desc' },
      });
    });

    it('should handle zero requests', async () => {
      // Arrange
      mockPrismaService.gdprRequest.count.mockResolvedValueOnce(0).mockResolvedValueOnce(0);
      mockPrismaService.gdprRequest.groupBy.mockResolvedValueOnce([]).mockResolvedValueOnce([]);
      mockPrismaService.gdprRequest.findMany.mockResolvedValue([]);

      // Act
      const result = await gdprService.getStatistics();

      // Assert
      expect(result.totalRequests).toBe(0);
      expect(result.pendingRequests).toBe(0);
      expect(result.byType).toEqual({});
      expect(result.byStatus).toEqual({});
      expect(result.recentRequests).toEqual([]);
    });
  });

  // ==========================================================================
  // DATA EXPORT FORMAT Tests
  // ==========================================================================

  describe('data export format', () => {
    it('should include all required user data fields', async () => {
      // Arrange
      const mockRequest = {
        id: mockRequestId,
        userId: mockUserId,
        format: ExportFormat.JSON,
      };
      mockPrismaService.user.findUnique.mockResolvedValue({
        id: mockUserId,
        email: 'test@test.com',
        firstName: 'Test',
        lastName: 'User',
        phone: '+33612345678',
        createdAt: new Date(),
        updatedAt: new Date(),
        lastLoginAt: new Date(),
      });
      mockPrismaService.ticket.findMany.mockResolvedValue([]);
      mockPrismaService.payment.findMany.mockResolvedValue([]);
      mockPrismaService.cashlessTransaction.findMany.mockResolvedValue([]);
      mockPrismaService.supportTicket.findMany.mockResolvedValue([]);
      mockPrismaService.userConsent.findMany.mockResolvedValue([]);
      mockPrismaService.notification.findMany.mockResolvedValue([]);
      mockPrismaService.gdprRequest.update.mockResolvedValue({});

      // Act
      await gdprService.generateDataExport(mockRequest);

      // Assert - verify user data query includes all personal fields
      expect(mockPrismaService.user.findUnique).toHaveBeenCalledWith({
        where: { id: mockUserId },
        select: expect.objectContaining({
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          phone: true,
          createdAt: true,
          updatedAt: true,
          lastLoginAt: true,
        }),
      });
    });

    it('should include ticket data with festival info', async () => {
      // Arrange
      const mockRequest = {
        id: mockRequestId,
        userId: mockUserId,
        format: ExportFormat.JSON,
      };
      mockPrismaService.user.findUnique.mockResolvedValue({
        id: mockUserId,
        email: 'test@test.com',
        firstName: 'Test',
        lastName: 'User',
        phone: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        lastLoginAt: null,
      });
      mockPrismaService.ticket.findMany.mockResolvedValue([
        {
          id: 'ticket-1',
          qrCode: 'QR123',
          status: 'VALID',
          purchasePrice: 99.99,
          createdAt: new Date(),
          category: { name: 'VIP', type: 'PASS' },
          festival: { name: 'Summer Fest 2024' },
        },
      ]);
      mockPrismaService.payment.findMany.mockResolvedValue([]);
      mockPrismaService.cashlessTransaction.findMany.mockResolvedValue([]);
      mockPrismaService.supportTicket.findMany.mockResolvedValue([]);
      mockPrismaService.userConsent.findMany.mockResolvedValue([]);
      mockPrismaService.notification.findMany.mockResolvedValue([]);
      mockPrismaService.gdprRequest.update.mockResolvedValue({});

      // Act
      await gdprService.generateDataExport(mockRequest);

      // Assert
      expect(mockPrismaService.ticket.findMany).toHaveBeenCalledWith({
        where: { userId: mockUserId },
        select: expect.objectContaining({
          id: true,
          qrCode: true,
          status: true,
          purchasePrice: true,
          createdAt: true,
          category: expect.objectContaining({
            select: expect.objectContaining({
              name: true,
              type: true,
            }),
          }),
          festival: expect.objectContaining({
            select: expect.objectContaining({
              name: true,
            }),
          }),
        }),
      });
    });

    it('should include payment data', async () => {
      // Arrange
      const mockRequest = {
        id: mockRequestId,
        userId: mockUserId,
        format: ExportFormat.JSON,
      };
      mockPrismaService.user.findUnique.mockResolvedValue({
        id: mockUserId,
        email: 'test@test.com',
        firstName: 'Test',
        lastName: 'User',
        phone: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        lastLoginAt: null,
      });
      mockPrismaService.ticket.findMany.mockResolvedValue([]);
      mockPrismaService.payment.findMany.mockResolvedValue([
        {
          id: 'payment-1',
          amount: 99.99,
          currency: 'EUR',
          status: 'COMPLETED',
          provider: 'STRIPE',
          createdAt: new Date(),
        },
      ]);
      mockPrismaService.cashlessTransaction.findMany.mockResolvedValue([]);
      mockPrismaService.supportTicket.findMany.mockResolvedValue([]);
      mockPrismaService.userConsent.findMany.mockResolvedValue([]);
      mockPrismaService.notification.findMany.mockResolvedValue([]);
      mockPrismaService.gdprRequest.update.mockResolvedValue({});

      // Act
      await gdprService.generateDataExport(mockRequest);

      // Assert
      expect(mockPrismaService.payment.findMany).toHaveBeenCalledWith({
        where: { userId: mockUserId },
        select: expect.objectContaining({
          id: true,
          amount: true,
          currency: true,
          status: true,
          provider: true,
          createdAt: true,
        }),
      });
    });
  });

  // ==========================================================================
  // COMPLETE DELETION VERIFICATION Tests
  // ==========================================================================

  describe('complete deletion verification', () => {
    it('should delete all personal data in a transaction', async () => {
      // Arrange
      const deletionCalls: string[] = [];
      const mockTx = {
        user: {
          update: jest.fn().mockImplementation(() => {
            deletionCalls.push('user.update');
          }),
        },
        pushToken: {
          deleteMany: jest.fn().mockImplementation(() => {
            deletionCalls.push('pushToken.deleteMany');
          }),
        },
        userConsent: {
          deleteMany: jest.fn().mockImplementation(() => {
            deletionCalls.push('userConsent.deleteMany');
          }),
        },
        notification: {
          deleteMany: jest.fn().mockImplementation(() => {
            deletionCalls.push('notification.deleteMany');
          }),
        },
        session: {
          deleteMany: jest.fn().mockImplementation(() => {
            deletionCalls.push('session.deleteMany');
          }),
        },
      };
      mockPrismaService.$transaction.mockImplementation(async (callback) => {
        await callback(mockTx);
        return mockTx;
      });

      // Act
      await gdprService.executeDataDeletion(mockUserId);

      // Assert - all deletion operations should be called
      expect(deletionCalls).toContain('user.update');
      expect(deletionCalls).toContain('pushToken.deleteMany');
      expect(deletionCalls).toContain('userConsent.deleteMany');
      expect(deletionCalls).toContain('notification.deleteMany');
      expect(deletionCalls).toContain('session.deleteMany');
    });

    it('should use transaction to ensure atomic deletion', async () => {
      // Arrange
      mockPrismaService.$transaction.mockImplementation(async (callback) => {
        const tx = {
          user: { update: jest.fn() },
          pushToken: { deleteMany: jest.fn() },
          userConsent: { deleteMany: jest.fn() },
          notification: { deleteMany: jest.fn() },
          session: { deleteMany: jest.fn() },
        };
        await callback(tx);
        return tx;
      });

      // Act
      await gdprService.executeDataDeletion(mockUserId);

      // Assert
      expect(mockPrismaService.$transaction).toHaveBeenCalled();
    });

    it('should retain anonymized records for legal compliance', async () => {
      // Arrange
      const mockTx = {
        user: { update: jest.fn() },
        pushToken: { deleteMany: jest.fn() },
        userConsent: { deleteMany: jest.fn() },
        notification: { deleteMany: jest.fn() },
        session: { deleteMany: jest.fn() },
      };
      mockPrismaService.$transaction.mockImplementation(async (callback) => {
        await callback(mockTx);
        return mockTx;
      });

      // Act
      await gdprService.executeDataDeletion(mockUserId);

      // Assert - user should be updated (anonymized), not deleted
      expect(mockTx.user.update).toHaveBeenCalled();
      // Tickets and payments are NOT deleted to maintain legal records
    });
  });

  // ==========================================================================
  // EDGE CASES Tests
  // ==========================================================================

  describe('edge cases', () => {
    it('should handle user with no consents', async () => {
      // Arrange
      mockPrismaService.userConsent.findMany.mockResolvedValue([]);

      // Act
      const result = await gdprService.getUserConsents(mockUserId);

      // Assert
      expect(result).toHaveLength(Object.values(ConsentType).length);
    });

    it('should handle user with no data to export', async () => {
      // Arrange
      const mockRequest = {
        id: mockRequestId,
        userId: mockUserId,
        format: ExportFormat.JSON,
      };
      mockPrismaService.user.findUnique.mockResolvedValue({
        id: mockUserId,
        email: 'test@test.com',
        firstName: 'Test',
        lastName: 'User',
        phone: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        lastLoginAt: null,
      });
      mockPrismaService.ticket.findMany.mockResolvedValue([]);
      mockPrismaService.payment.findMany.mockResolvedValue([]);
      mockPrismaService.cashlessTransaction.findMany.mockResolvedValue([]);
      mockPrismaService.supportTicket.findMany.mockResolvedValue([]);
      mockPrismaService.userConsent.findMany.mockResolvedValue([]);
      mockPrismaService.notification.findMany.mockResolvedValue([]);
      mockPrismaService.gdprRequest.update.mockResolvedValue({});

      // Act
      const result = await gdprService.generateDataExport(mockRequest);

      // Assert
      expect(result.downloadToken).toBeDefined();
    });

    it('should handle multiple pending requests of different types', async () => {
      // Arrange
      mockPrismaService.gdprRequest.findFirst.mockResolvedValue(null); // No pending for DATA_ACCESS
      mockPrismaService.gdprRequest.create.mockResolvedValue({
        id: mockRequestId,
        userId: mockUserId,
        type: GdprRequestType.DATA_ACCESS,
        status: GdprRequestStatus.PENDING,
        format: ExportFormat.JSON,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      // Act - can create DATA_ACCESS even if DATA_DELETION is pending
      const result = await gdprService.createDataRequest(mockUserId, {
        type: GdprRequestType.DATA_ACCESS,
      });

      // Assert
      expect(result.type).toBe(GdprRequestType.DATA_ACCESS);
    });

    it('should handle special characters in user data for export', async () => {
      // Arrange
      const mockRequest = {
        id: mockRequestId,
        userId: mockUserId,
        format: ExportFormat.JSON,
      };
      mockPrismaService.user.findUnique.mockResolvedValue({
        id: mockUserId,
        email: 'test@test.com',
        firstName: 'Jean-Pierre',
        lastName: "O'Connor",
        phone: '+33612345678',
        createdAt: new Date(),
        updatedAt: new Date(),
        lastLoginAt: null,
      });
      mockPrismaService.ticket.findMany.mockResolvedValue([]);
      mockPrismaService.payment.findMany.mockResolvedValue([]);
      mockPrismaService.cashlessTransaction.findMany.mockResolvedValue([]);
      mockPrismaService.supportTicket.findMany.mockResolvedValue([]);
      mockPrismaService.userConsent.findMany.mockResolvedValue([]);
      mockPrismaService.notification.findMany.mockResolvedValue([]);
      mockPrismaService.gdprRequest.update.mockResolvedValue({});

      // Act
      const result = await gdprService.generateDataExport(mockRequest);

      // Assert
      expect(result.downloadToken).toBeDefined();
    });

    it('should handle concurrent consent updates', async () => {
      // Arrange
      const dto = {
        consents: [
          { type: ConsentType.MARKETING, granted: true },
          { type: ConsentType.ANALYTICS, granted: true },
          { type: ConsentType.PERSONALIZATION, granted: false },
        ],
      };
      mockPrismaService.userConsent.upsert.mockResolvedValue({
        userId: mockUserId,
        granted: true,
        grantedAt: new Date(),
        revokedAt: null,
      });

      // Act
      const result = await gdprService.updateConsents(mockUserId, dto, {
        ipAddress: '127.0.0.1',
        userAgent: 'TestAgent',
      });

      // Assert
      expect(result).toHaveLength(3);
    });
  });

  // ==========================================================================
  // EXECUTE REQUEST (Private Method) Tests via processRequest
  // ==========================================================================

  describe('executeRequest (via processRequest)', () => {
    it('should execute DATA_DELETION request', async () => {
      // Arrange
      mockPrismaService.gdprRequest.findUnique.mockResolvedValue({
        id: mockRequestId,
        userId: mockUserId,
        type: GdprRequestType.DATA_DELETION,
        status: GdprRequestStatus.PENDING,
      });
      const mockTx = {
        user: { update: jest.fn() },
        pushToken: { deleteMany: jest.fn() },
        userConsent: { deleteMany: jest.fn() },
        notification: { deleteMany: jest.fn() },
        session: { deleteMany: jest.fn() },
      };
      mockPrismaService.$transaction.mockImplementation(async (callback) => {
        await callback(mockTx);
        return mockTx;
      });
      mockPrismaService.gdprRequest.update.mockResolvedValue({
        id: mockRequestId,
        status: GdprRequestStatus.COMPLETED,
      });

      // Act
      await gdprService.processRequest(mockRequestId, { action: 'APPROVE' }, mockAdminId);

      // Assert
      expect(mockPrismaService.$transaction).toHaveBeenCalled();
      expect(mockTx.user.update).toHaveBeenCalled();
    });

    it('should execute CONSENT_WITHDRAWAL request', async () => {
      // Arrange
      mockPrismaService.gdprRequest.findUnique.mockResolvedValue({
        id: mockRequestId,
        userId: mockUserId,
        type: GdprRequestType.CONSENT_WITHDRAWAL,
        status: GdprRequestStatus.PENDING,
      });
      mockPrismaService.userConsent.updateMany.mockResolvedValue({ count: 4 });
      mockPrismaService.gdprRequest.update.mockResolvedValue({
        id: mockRequestId,
        status: GdprRequestStatus.COMPLETED,
      });

      // Act
      await gdprService.processRequest(mockRequestId, { action: 'APPROVE' }, mockAdminId);

      // Assert
      expect(mockPrismaService.userConsent.updateMany).toHaveBeenCalledWith({
        where: {
          userId: mockUserId,
          type: { not: ConsentType.ESSENTIAL },
        },
        data: {
          granted: false,
          revokedAt: expect.any(Date),
        },
      });
    });

    it('should execute DATA_PORTABILITY request (same as DATA_ACCESS)', async () => {
      // Arrange
      mockPrismaService.gdprRequest.findUnique.mockResolvedValue({
        id: mockRequestId,
        userId: mockUserId,
        type: GdprRequestType.DATA_PORTABILITY,
        status: GdprRequestStatus.PENDING,
        format: ExportFormat.JSON,
      });
      mockPrismaService.user.findUnique.mockResolvedValue({
        id: mockUserId,
        email: 'test@test.com',
        firstName: 'Test',
        lastName: 'User',
        phone: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        lastLoginAt: null,
      });
      mockPrismaService.ticket.findMany.mockResolvedValue([]);
      mockPrismaService.payment.findMany.mockResolvedValue([]);
      mockPrismaService.cashlessTransaction.findMany.mockResolvedValue([]);
      mockPrismaService.supportTicket.findMany.mockResolvedValue([]);
      mockPrismaService.userConsent.findMany.mockResolvedValue([]);
      mockPrismaService.notification.findMany.mockResolvedValue([]);
      mockPrismaService.gdprRequest.update.mockResolvedValue({
        id: mockRequestId,
        status: GdprRequestStatus.COMPLETED,
      });

      // Act
      await gdprService.processRequest(mockRequestId, { action: 'APPROVE' }, mockAdminId);

      // Assert - should have generated export
      expect(mockPrismaService.gdprRequest.update).toHaveBeenCalledWith({
        where: { id: mockRequestId },
        data: expect.objectContaining({
          downloadUrl: expect.stringContaining('/api/gdpr/download/'),
        }),
      });
    });

    it('should handle DATA_RECTIFICATION request (no additional processing)', async () => {
      // Arrange
      mockPrismaService.gdprRequest.findUnique.mockResolvedValue({
        id: mockRequestId,
        userId: mockUserId,
        type: GdprRequestType.DATA_RECTIFICATION,
        status: GdprRequestStatus.PENDING,
        details: JSON.stringify([{ field: 'firstName', currentValue: 'Jon', correctValue: 'John' }]),
      });
      mockPrismaService.gdprRequest.update.mockResolvedValue({
        id: mockRequestId,
        status: GdprRequestStatus.COMPLETED,
      });

      // Act
      await gdprService.processRequest(mockRequestId, { action: 'APPROVE' }, mockAdminId);

      // Assert - should just update status, rectification is handled manually
      expect(mockPrismaService.gdprRequest.update).toHaveBeenCalledWith({
        where: { id: mockRequestId },
        data: expect.objectContaining({
          status: GdprRequestStatus.COMPLETED,
          processedBy: mockAdminId,
        }),
      });
    });
  });

  // ==========================================================================
  // FORMAT EXPORT DATA Tests (via generateDataExport)
  // ==========================================================================

  describe('formatExportData (via generateDataExport)', () => {
    it('should format data as CSV when requested', async () => {
      // Arrange
      const mockRequest = {
        id: mockRequestId,
        userId: mockUserId,
        format: ExportFormat.CSV,
      };
      mockPrismaService.user.findUnique.mockResolvedValue({
        id: mockUserId,
        email: 'test@test.com',
        firstName: 'Test',
        lastName: 'User',
        phone: '+33612345678',
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-02'),
        lastLoginAt: new Date('2024-01-03'),
      });
      mockPrismaService.ticket.findMany.mockResolvedValue([
        { id: 'ticket-1', qrCode: 'QR1', status: 'VALID' },
      ]);
      mockPrismaService.payment.findMany.mockResolvedValue([]);
      mockPrismaService.cashlessTransaction.findMany.mockResolvedValue([]);
      mockPrismaService.supportTicket.findMany.mockResolvedValue([]);
      mockPrismaService.userConsent.findMany.mockResolvedValue([]);
      mockPrismaService.notification.findMany.mockResolvedValue([]);
      mockPrismaService.gdprRequest.update.mockResolvedValue({});

      // Act
      const result = await gdprService.generateDataExport(mockRequest);

      // Assert
      expect(result.downloadToken).toBeDefined();
      expect(result.expiresAt).toBeDefined();
    });

    it('should format data as PDF (falls back to JSON structure)', async () => {
      // Arrange
      const mockRequest = {
        id: mockRequestId,
        userId: mockUserId,
        format: ExportFormat.PDF,
      };
      mockPrismaService.user.findUnique.mockResolvedValue({
        id: mockUserId,
        email: 'test@test.com',
        firstName: 'Test',
        lastName: 'User',
        phone: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        lastLoginAt: null,
      });
      mockPrismaService.ticket.findMany.mockResolvedValue([]);
      mockPrismaService.payment.findMany.mockResolvedValue([]);
      mockPrismaService.cashlessTransaction.findMany.mockResolvedValue([]);
      mockPrismaService.supportTicket.findMany.mockResolvedValue([]);
      mockPrismaService.userConsent.findMany.mockResolvedValue([]);
      mockPrismaService.notification.findMany.mockResolvedValue([]);
      mockPrismaService.gdprRequest.update.mockResolvedValue({});

      // Act
      const result = await gdprService.generateDataExport(mockRequest);

      // Assert
      expect(result.downloadToken).toBeDefined();
    });

    it('should use default JSON format when format is undefined', async () => {
      // Arrange
      const mockRequest = {
        id: mockRequestId,
        userId: mockUserId,
        format: undefined,
      };
      mockPrismaService.user.findUnique.mockResolvedValue({
        id: mockUserId,
        email: 'test@test.com',
        firstName: 'Test',
        lastName: 'User',
        phone: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        lastLoginAt: null,
      });
      mockPrismaService.ticket.findMany.mockResolvedValue([]);
      mockPrismaService.payment.findMany.mockResolvedValue([]);
      mockPrismaService.cashlessTransaction.findMany.mockResolvedValue([]);
      mockPrismaService.supportTicket.findMany.mockResolvedValue([]);
      mockPrismaService.userConsent.findMany.mockResolvedValue([]);
      mockPrismaService.notification.findMany.mockResolvedValue([]);
      mockPrismaService.gdprRequest.update.mockResolvedValue({});

      // Act
      const result = await gdprService.generateDataExport(mockRequest);

      // Assert
      expect(result.downloadToken).toBeDefined();
    });
  });

  // ==========================================================================
  // DOWNLOAD EXPORT EDGE CASES Tests
  // ==========================================================================

  describe('downloadExport edge cases', () => {
    it('should handle export with no expiresAt set', async () => {
      // Arrange
      const downloadToken = 'no-expiry-token';
      mockPrismaService.gdprRequest.findFirst.mockResolvedValue({
        id: mockRequestId,
        userId: mockUserId,
        format: ExportFormat.JSON,
        downloadUrl: `/api/gdpr/download/${downloadToken}`,
        status: GdprRequestStatus.COMPLETED,
        expiresAt: null, // No expiry set
      });

      // Act
      const result = await gdprService.downloadExport(downloadToken);

      // Assert
      expect(result.format).toBe(ExportFormat.JSON);
    });

    it('should handle export with undefined format', async () => {
      // Arrange
      const downloadToken = 'no-format-token';
      mockPrismaService.gdprRequest.findFirst.mockResolvedValue({
        id: mockRequestId,
        userId: mockUserId,
        format: undefined,
        downloadUrl: `/api/gdpr/download/${downloadToken}`,
        status: GdprRequestStatus.COMPLETED,
        expiresAt: new Date(Date.now() + 86400000),
      });

      // Act
      const result = await gdprService.downloadExport(downloadToken);

      // Assert
      expect(result.filename).toContain('.json');
    });
  });

  // ==========================================================================
  // AUDIT LOGS WITH ADMIN USER Tests
  // ==========================================================================

  describe('getAuditLogs with adminUserId', () => {
    it('should return logs for specified user when admin requests', async () => {
      // Arrange
      mockPrismaService.auditLog.findMany.mockResolvedValue([
        {
          id: 'log-1',
          userId: mockUserId,
          action: 'GDPR_CONSENT_UPDATE',
          entityType: 'GDPR',
          createdAt: new Date(),
        },
      ]);

      // Act
      const result = await gdprService.getAuditLogs(mockUserId, mockAdminId);

      // Assert
      expect(result).toHaveLength(1);
      expect(mockPrismaService.auditLog.findMany).toHaveBeenCalled();
    });
  });
});
