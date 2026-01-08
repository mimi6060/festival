/**
 * GdprController & GdprAdminController Unit Tests
 *
 * Comprehensive tests for GDPR controller endpoints including:
 * - Consent management endpoints
 * - Data request endpoints
 * - Data export download
 * - Data rectification
 * - Audit logs
 * - Admin endpoints for request management
 */

import { Test, TestingModule } from '@nestjs/testing';
import { StreamableFile } from '@nestjs/common';
import { GdprController, GdprAdminController } from './gdpr.controller';
import { GdprService } from './gdpr.service';
import {
  ConsentType,
  GdprRequestType,
  GdprRequestStatus,
  ExportFormat,
} from './dto';
import { regularUser, adminUser } from '../../test/fixtures';

// ============================================================================
// Mock Setup
// ============================================================================

describe('GdprController', () => {
  let controller: GdprController;
  let gdprService: jest.Mocked<GdprService>;

  const mockUserId = regularUser.id;
  const mockRequestId = 'request-uuid-00000000-0000-0000-0000-000000000001';

  const mockGdprService = {
    getUserConsents: jest.fn(),
    updateConsent: jest.fn(),
    updateConsents: jest.fn(),
    createDataRequest: jest.fn(),
    getUserRequests: jest.fn(),
    getRequest: jest.fn(),
    downloadExport: jest.fn(),
    createRectificationRequest: jest.fn(),
    getAuditLogs: jest.fn(),
  };

  const mockRequest = {
    ip: '127.0.0.1',
    headers: {
      'user-agent': 'TestAgent/1.0',
    },
  };

  const mockResponse = {
    set: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [GdprController],
      providers: [{ provide: GdprService, useValue: mockGdprService }],
    }).compile();

    controller = module.get<GdprController>(GdprController);
    gdprService = module.get(GdprService);
  });

  // ==========================================================================
  // GET CONSENTS Tests
  // ==========================================================================

  describe('getConsents', () => {
    it('should return user consents', async () => {
      // Arrange
      const mockConsents = [
        {
          type: ConsentType.MARKETING,
          granted: true,
          grantedAt: new Date(),
          revokedAt: null,
          ipAddress: '127.0.0.1',
          userAgent: 'TestAgent',
        },
        {
          type: ConsentType.ANALYTICS,
          granted: false,
          grantedAt: null,
          revokedAt: new Date(),
          ipAddress: '127.0.0.1',
          userAgent: 'TestAgent',
        },
      ];
      mockGdprService.getUserConsents.mockResolvedValue(mockConsents);

      // Act
      const result = await controller.getConsents({ id: mockUserId });

      // Assert
      expect(result).toEqual(mockConsents);
      expect(gdprService.getUserConsents).toHaveBeenCalledWith(mockUserId);
    });

    it('should call service with correct user ID', async () => {
      // Arrange
      mockGdprService.getUserConsents.mockResolvedValue([]);

      // Act
      await controller.getConsents({ id: 'specific-user-id' });

      // Assert
      expect(gdprService.getUserConsents).toHaveBeenCalledWith('specific-user-id');
    });
  });

  // ==========================================================================
  // UPDATE CONSENT Tests
  // ==========================================================================

  describe('updateConsent', () => {
    it('should update a single consent', async () => {
      // Arrange
      const dto = { type: ConsentType.MARKETING, granted: true };
      const mockUpdatedConsent = {
        userId: mockUserId,
        type: ConsentType.MARKETING,
        granted: true,
        grantedAt: new Date(),
        revokedAt: null,
        ipAddress: '127.0.0.1',
        userAgent: 'TestAgent/1.0',
      };
      mockGdprService.updateConsent.mockResolvedValue(mockUpdatedConsent);

      // Act
      const result = await controller.updateConsent(
        { id: mockUserId },
        dto,
        mockRequest,
      );

      // Assert
      expect(result).toEqual(mockUpdatedConsent);
      expect(gdprService.updateConsent).toHaveBeenCalledWith(mockUserId, dto, {
        ipAddress: mockRequest.ip,
        userAgent: mockRequest.headers['user-agent'],
      });
    });

    it('should pass metadata from request', async () => {
      // Arrange
      const dto = { type: ConsentType.ANALYTICS, granted: false };
      mockGdprService.updateConsent.mockResolvedValue({});

      // Act
      await controller.updateConsent({ id: mockUserId }, dto, {
        ip: '192.168.1.1',
        headers: { 'user-agent': 'Mozilla/5.0' },
      });

      // Assert
      expect(gdprService.updateConsent).toHaveBeenCalledWith(
        mockUserId,
        dto,
        {
          ipAddress: '192.168.1.1',
          userAgent: 'Mozilla/5.0',
        },
      );
    });

    it('should handle missing user-agent header', async () => {
      // Arrange
      const dto = { type: ConsentType.PERSONALIZATION, granted: true };
      mockGdprService.updateConsent.mockResolvedValue({});

      // Act
      await controller.updateConsent({ id: mockUserId }, dto, {
        ip: '127.0.0.1',
        headers: {},
      });

      // Assert
      expect(gdprService.updateConsent).toHaveBeenCalledWith(
        mockUserId,
        dto,
        {
          ipAddress: '127.0.0.1',
          userAgent: undefined,
        },
      );
    });
  });

  // ==========================================================================
  // UPDATE CONSENTS (BULK) Tests
  // ==========================================================================

  describe('updateConsents', () => {
    it('should update multiple consents at once', async () => {
      // Arrange
      const dto = {
        consents: [
          { type: ConsentType.MARKETING, granted: true },
          { type: ConsentType.ANALYTICS, granted: false },
        ],
      };
      const mockResults = [
        { type: ConsentType.MARKETING, granted: true },
        { type: ConsentType.ANALYTICS, granted: false },
      ];
      mockGdprService.updateConsents.mockResolvedValue(mockResults);

      // Act
      const result = await controller.updateConsents(
        { id: mockUserId },
        dto,
        mockRequest,
      );

      // Assert
      expect(result).toEqual(mockResults);
      expect(gdprService.updateConsents).toHaveBeenCalledWith(mockUserId, dto, {
        ipAddress: mockRequest.ip,
        userAgent: mockRequest.headers['user-agent'],
      });
    });

    it('should pass correct metadata for bulk update', async () => {
      // Arrange
      const dto = {
        consents: [{ type: ConsentType.THIRD_PARTY_SHARING, granted: false }],
      };
      mockGdprService.updateConsents.mockResolvedValue([]);

      // Act
      await controller.updateConsents({ id: mockUserId }, dto, {
        ip: '10.0.0.1',
        headers: { 'user-agent': 'CustomBrowser/2.0' },
      });

      // Assert
      expect(gdprService.updateConsents).toHaveBeenCalledWith(
        mockUserId,
        dto,
        {
          ipAddress: '10.0.0.1',
          userAgent: 'CustomBrowser/2.0',
        },
      );
    });
  });

  // ==========================================================================
  // CREATE REQUEST Tests
  // ==========================================================================

  describe('createRequest', () => {
    it('should create a data access request', async () => {
      // Arrange
      const dto = {
        type: GdprRequestType.DATA_ACCESS,
        details: 'I want all my data',
        format: ExportFormat.JSON,
      };
      const mockCreatedRequest = {
        id: mockRequestId,
        userId: mockUserId,
        type: dto.type,
        status: GdprRequestStatus.PENDING,
        details: dto.details,
        format: dto.format,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      mockGdprService.createDataRequest.mockResolvedValue(mockCreatedRequest);

      // Act
      const result = await controller.createRequest({ id: mockUserId }, dto);

      // Assert
      expect(result).toEqual(mockCreatedRequest);
      expect(gdprService.createDataRequest).toHaveBeenCalledWith(mockUserId, dto);
    });

    it('should create a data deletion request', async () => {
      // Arrange
      const dto = {
        type: GdprRequestType.DATA_DELETION,
        details: 'Please delete all my data',
      };
      const mockCreatedRequest = {
        id: mockRequestId,
        userId: mockUserId,
        type: dto.type,
        status: GdprRequestStatus.PENDING,
        details: dto.details,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      mockGdprService.createDataRequest.mockResolvedValue(mockCreatedRequest);

      // Act
      const result = await controller.createRequest({ id: mockUserId }, dto);

      // Assert
      expect(result.type).toBe(GdprRequestType.DATA_DELETION);
    });

    it('should create a data portability request', async () => {
      // Arrange
      const dto = {
        type: GdprRequestType.DATA_PORTABILITY,
        format: ExportFormat.CSV,
      };
      mockGdprService.createDataRequest.mockResolvedValue({
        id: mockRequestId,
        type: dto.type,
        format: dto.format,
      });

      // Act
      const result = await controller.createRequest({ id: mockUserId }, dto);

      // Assert
      expect(result.type).toBe(GdprRequestType.DATA_PORTABILITY);
      expect(result.format).toBe(ExportFormat.CSV);
    });

    it('should create a consent withdrawal request', async () => {
      // Arrange
      const dto = {
        type: GdprRequestType.CONSENT_WITHDRAWAL,
      };
      mockGdprService.createDataRequest.mockResolvedValue({
        id: mockRequestId,
        type: dto.type,
        status: GdprRequestStatus.PENDING,
      });

      // Act
      const result = await controller.createRequest({ id: mockUserId }, dto);

      // Assert
      expect(result.type).toBe(GdprRequestType.CONSENT_WITHDRAWAL);
    });
  });

  // ==========================================================================
  // GET MY REQUESTS Tests
  // ==========================================================================

  describe('getMyRequests', () => {
    it('should return user requests', async () => {
      // Arrange
      const mockRequests = [
        {
          id: 'request-1',
          userId: mockUserId,
          type: GdprRequestType.DATA_ACCESS,
          status: GdprRequestStatus.COMPLETED,
          createdAt: new Date(),
        },
        {
          id: 'request-2',
          userId: mockUserId,
          type: GdprRequestType.DATA_DELETION,
          status: GdprRequestStatus.PENDING,
          createdAt: new Date(),
        },
      ];
      mockGdprService.getUserRequests.mockResolvedValue(mockRequests);

      // Act
      const result = await controller.getMyRequests({ id: mockUserId });

      // Assert
      expect(result).toEqual(mockRequests);
      expect(gdprService.getUserRequests).toHaveBeenCalledWith(mockUserId);
    });

    it('should return empty array when no requests exist', async () => {
      // Arrange
      mockGdprService.getUserRequests.mockResolvedValue([]);

      // Act
      const result = await controller.getMyRequests({ id: mockUserId });

      // Assert
      expect(result).toEqual([]);
    });
  });

  // ==========================================================================
  // GET REQUEST Tests
  // ==========================================================================

  describe('getRequest', () => {
    it('should return a specific request', async () => {
      // Arrange
      const mockRequestData = {
        id: mockRequestId,
        userId: mockUserId,
        type: GdprRequestType.DATA_ACCESS,
        status: GdprRequestStatus.PENDING,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      mockGdprService.getRequest.mockResolvedValue(mockRequestData);

      // Act
      const result = await controller.getRequest(mockRequestId, { id: mockUserId });

      // Assert
      expect(result).toEqual(mockRequestData);
      expect(gdprService.getRequest).toHaveBeenCalledWith(mockRequestId, mockUserId);
    });

    it('should pass user ID to enforce ownership check', async () => {
      // Arrange
      mockGdprService.getRequest.mockResolvedValue({});

      // Act
      await controller.getRequest('some-request-id', { id: 'some-user-id' });

      // Assert
      expect(gdprService.getRequest).toHaveBeenCalledWith('some-request-id', 'some-user-id');
    });
  });

  // ==========================================================================
  // DOWNLOAD EXPORT Tests
  // ==========================================================================

  describe('downloadExport', () => {
    it('should download JSON export', async () => {
      // Arrange
      const downloadToken = 'valid-download-token';
      const mockExport = {
        data: '{"user": {"email": "test@test.com"}}',
        format: 'JSON',
        filename: 'user-data-export-abc12345.json',
      };
      mockGdprService.downloadExport.mockResolvedValue(mockExport);

      // Act
      const result = await controller.downloadExport(downloadToken, mockResponse as any);

      // Assert
      expect(mockResponse.set).toHaveBeenCalledWith({
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="${mockExport.filename}"`,
      });
      expect(result).toBeInstanceOf(StreamableFile);
    });

    it('should download CSV export', async () => {
      // Arrange
      const downloadToken = 'csv-download-token';
      const mockExport = {
        data: 'Section,Field,Value\nuser,email,test@test.com',
        format: 'CSV',
        filename: 'user-data-export-abc12345.csv',
      };
      mockGdprService.downloadExport.mockResolvedValue(mockExport);

      // Act
      const result = await controller.downloadExport(downloadToken, mockResponse as any);

      // Assert
      expect(mockResponse.set).toHaveBeenCalledWith({
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="${mockExport.filename}"`,
      });
      expect(result).toBeInstanceOf(StreamableFile);
    });

    it('should download PDF export as octet-stream', async () => {
      // Arrange
      const downloadToken = 'pdf-download-token';
      const mockExport = {
        data: 'PDF content here',
        format: 'PDF',
        filename: 'user-data-export-abc12345.pdf',
      };
      mockGdprService.downloadExport.mockResolvedValue(mockExport);

      // Act
      const result = await controller.downloadExport(downloadToken, mockResponse as any);

      // Assert
      expect(mockResponse.set).toHaveBeenCalledWith({
        'Content-Type': 'application/octet-stream',
        'Content-Disposition': `attachment; filename="${mockExport.filename}"`,
      });
      expect(result).toBeInstanceOf(StreamableFile);
    });

    it('should handle null data in export', async () => {
      // Arrange
      const downloadToken = 'empty-download-token';
      const mockExport = {
        data: null,
        format: 'JSON',
        filename: 'user-data-export-abc12345.json',
      };
      mockGdprService.downloadExport.mockResolvedValue(mockExport);

      // Act
      const result = await controller.downloadExport(downloadToken, mockResponse as any);

      // Assert
      expect(result).toBeInstanceOf(StreamableFile);
    });
  });

  // ==========================================================================
  // CREATE RECTIFICATION REQUEST Tests
  // ==========================================================================

  describe('createRectificationRequest', () => {
    it('should create a rectification request', async () => {
      // Arrange
      const dto = {
        corrections: [
          { field: 'firstName', currentValue: 'Jon', correctValue: 'John' },
        ],
      };
      const mockCreatedRequest = {
        id: mockRequestId,
        userId: mockUserId,
        type: GdprRequestType.DATA_RECTIFICATION,
        status: GdprRequestStatus.PENDING,
        details: JSON.stringify(dto.corrections),
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      mockGdprService.createRectificationRequest.mockResolvedValue(mockCreatedRequest);

      // Act
      const result = await controller.createRectificationRequest(
        { id: mockUserId },
        dto,
      );

      // Assert
      expect(result).toEqual(mockCreatedRequest);
      expect(gdprService.createRectificationRequest).toHaveBeenCalledWith(
        mockUserId,
        dto,
      );
    });

    it('should handle multiple corrections', async () => {
      // Arrange
      const dto = {
        corrections: [
          { field: 'firstName', currentValue: 'Jon', correctValue: 'John' },
          { field: 'lastName', currentValue: 'Deo', correctValue: 'Doe' },
          { field: 'phone', currentValue: '+33600000000', correctValue: '+33612345678' },
        ],
      };
      mockGdprService.createRectificationRequest.mockResolvedValue({
        id: mockRequestId,
        type: GdprRequestType.DATA_RECTIFICATION,
      });

      // Act
      const result = await controller.createRectificationRequest(
        { id: mockUserId },
        dto,
      );

      // Assert
      expect(result.type).toBe(GdprRequestType.DATA_RECTIFICATION);
      expect(gdprService.createRectificationRequest).toHaveBeenCalledWith(
        mockUserId,
        dto,
      );
    });
  });

  // ==========================================================================
  // GET AUDIT LOGS Tests
  // ==========================================================================

  describe('getAuditLogs', () => {
    it('should return user audit logs', async () => {
      // Arrange
      const mockLogs = [
        {
          id: 'log-1',
          userId: mockUserId,
          action: 'GDPR_CONSENT_UPDATE',
          entityType: 'GDPR',
          entityId: mockUserId,
          newValue: { consentType: 'MARKETING', granted: true },
          createdAt: new Date(),
        },
        {
          id: 'log-2',
          userId: mockUserId,
          action: 'GDPR_DATA_REQUEST_CREATED',
          entityType: 'GDPR',
          entityId: mockUserId,
          newValue: { requestId: mockRequestId, type: 'DATA_ACCESS' },
          createdAt: new Date(),
        },
      ];
      mockGdprService.getAuditLogs.mockResolvedValue(mockLogs);

      // Act
      const result = await controller.getAuditLogs({ id: mockUserId });

      // Assert
      expect(result).toEqual(mockLogs);
      expect(gdprService.getAuditLogs).toHaveBeenCalledWith(mockUserId);
    });

    it('should return empty array when no logs exist', async () => {
      // Arrange
      mockGdprService.getAuditLogs.mockResolvedValue([]);

      // Act
      const result = await controller.getAuditLogs({ id: mockUserId });

      // Assert
      expect(result).toEqual([]);
    });
  });
});

// ============================================================================
// Admin Controller Tests
// ============================================================================

describe('GdprAdminController', () => {
  let controller: GdprAdminController;
  let gdprService: jest.Mocked<GdprService>;

  const mockAdminId = adminUser.id;
  const mockUserId = regularUser.id;
  const mockRequestId = 'request-uuid-00000000-0000-0000-0000-000000000001';

  const mockGdprService = {
    getAllRequests: jest.fn(),
    getRequest: jest.fn(),
    processRequest: jest.fn(),
    getStatistics: jest.fn(),
    getAuditLogs: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [GdprAdminController],
      providers: [{ provide: GdprService, useValue: mockGdprService }],
    }).compile();

    controller = module.get<GdprAdminController>(GdprAdminController);
    gdprService = module.get(GdprService);
  });

  // ==========================================================================
  // GET ALL REQUESTS Tests
  // ==========================================================================

  describe('getAllRequests', () => {
    it('should return paginated requests', async () => {
      // Arrange
      const query = { page: 1, limit: 20 };
      const mockResponse = {
        items: [
          { id: 'request-1', type: GdprRequestType.DATA_ACCESS },
          { id: 'request-2', type: GdprRequestType.DATA_DELETION },
        ],
        total: 2,
        page: 1,
        limit: 20,
        totalPages: 1,
      };
      mockGdprService.getAllRequests.mockResolvedValue(mockResponse);

      // Act
      const result = await controller.getAllRequests(query);

      // Assert
      expect(result).toEqual(mockResponse);
      expect(gdprService.getAllRequests).toHaveBeenCalledWith(query);
    });

    it('should filter by status', async () => {
      // Arrange
      const query = { status: GdprRequestStatus.PENDING };
      mockGdprService.getAllRequests.mockResolvedValue({
        items: [],
        total: 0,
        page: 1,
        limit: 20,
        totalPages: 0,
      });

      // Act
      await controller.getAllRequests(query);

      // Assert
      expect(gdprService.getAllRequests).toHaveBeenCalledWith(query);
    });

    it('should filter by type', async () => {
      // Arrange
      const query = { type: GdprRequestType.DATA_DELETION };
      mockGdprService.getAllRequests.mockResolvedValue({
        items: [],
        total: 0,
        page: 1,
        limit: 20,
        totalPages: 0,
      });

      // Act
      await controller.getAllRequests(query);

      // Assert
      expect(gdprService.getAllRequests).toHaveBeenCalledWith(query);
    });

    it('should filter by userId', async () => {
      // Arrange
      const query = { userId: mockUserId };
      mockGdprService.getAllRequests.mockResolvedValue({
        items: [],
        total: 0,
        page: 1,
        limit: 20,
        totalPages: 0,
      });

      // Act
      await controller.getAllRequests(query);

      // Assert
      expect(gdprService.getAllRequests).toHaveBeenCalledWith(query);
    });

    it('should handle combined filters', async () => {
      // Arrange
      const query = {
        status: GdprRequestStatus.PENDING,
        type: GdprRequestType.DATA_ACCESS,
        page: 2,
        limit: 10,
      };
      mockGdprService.getAllRequests.mockResolvedValue({
        items: [],
        total: 0,
        page: 2,
        limit: 10,
        totalPages: 0,
      });

      // Act
      await controller.getAllRequests(query);

      // Assert
      expect(gdprService.getAllRequests).toHaveBeenCalledWith(query);
    });
  });

  // ==========================================================================
  // GET REQUEST (Admin) Tests
  // ==========================================================================

  describe('getRequest', () => {
    it('should return any request without ownership check', async () => {
      // Arrange
      const mockRequestData = {
        id: mockRequestId,
        userId: mockUserId,
        type: GdprRequestType.DATA_ACCESS,
        status: GdprRequestStatus.PENDING,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      mockGdprService.getRequest.mockResolvedValue(mockRequestData);

      // Act
      const result = await controller.getRequest(mockRequestId);

      // Assert
      expect(result).toEqual(mockRequestData);
      expect(gdprService.getRequest).toHaveBeenCalledWith(mockRequestId);
    });

    it('should not pass userId for admin access', async () => {
      // Arrange
      mockGdprService.getRequest.mockResolvedValue({});

      // Act
      await controller.getRequest('any-request-id');

      // Assert
      expect(gdprService.getRequest).toHaveBeenCalledWith('any-request-id');
      expect(gdprService.getRequest).not.toHaveBeenCalledWith('any-request-id', expect.anything());
    });
  });

  // ==========================================================================
  // PROCESS REQUEST Tests
  // ==========================================================================

  describe('processRequest', () => {
    it('should approve a request', async () => {
      // Arrange
      const dto = { action: 'APPROVE' as const };
      const mockProcessedRequest = {
        id: mockRequestId,
        status: GdprRequestStatus.COMPLETED,
        processedAt: new Date(),
        processedBy: mockAdminId,
      };
      mockGdprService.processRequest.mockResolvedValue(mockProcessedRequest);

      // Act
      const result = await controller.processRequest(
        mockRequestId,
        dto,
        { id: mockAdminId },
      );

      // Assert
      expect(result).toEqual(mockProcessedRequest);
      expect(gdprService.processRequest).toHaveBeenCalledWith(
        mockRequestId,
        dto,
        mockAdminId,
      );
    });

    it('should reject a request with reason', async () => {
      // Arrange
      const dto = {
        action: 'REJECT' as const,
        rejectionReason: 'Invalid request - insufficient information provided',
      };
      const mockProcessedRequest = {
        id: mockRequestId,
        status: GdprRequestStatus.REJECTED,
        processedAt: new Date(),
        processedBy: mockAdminId,
        rejectionReason: dto.rejectionReason,
      };
      mockGdprService.processRequest.mockResolvedValue(mockProcessedRequest);

      // Act
      const result = await controller.processRequest(
        mockRequestId,
        dto,
        { id: mockAdminId },
      );

      // Assert
      expect(result).toEqual(mockProcessedRequest);
      expect(result.rejectionReason).toBe(dto.rejectionReason);
    });

    it('should pass admin ID to service', async () => {
      // Arrange
      const dto = { action: 'APPROVE' as const };
      mockGdprService.processRequest.mockResolvedValue({});

      // Act
      await controller.processRequest(
        mockRequestId,
        dto,
        { id: 'specific-admin-id' },
      );

      // Assert
      expect(gdprService.processRequest).toHaveBeenCalledWith(
        mockRequestId,
        dto,
        'specific-admin-id',
      );
    });
  });

  // ==========================================================================
  // GET STATISTICS Tests
  // ==========================================================================

  describe('getStatistics', () => {
    it('should return GDPR statistics', async () => {
      // Arrange
      const mockStats = {
        totalRequests: 100,
        pendingRequests: 10,
        byType: {
          [GdprRequestType.DATA_ACCESS]: 50,
          [GdprRequestType.DATA_DELETION]: 30,
          [GdprRequestType.DATA_PORTABILITY]: 20,
        },
        byStatus: {
          [GdprRequestStatus.COMPLETED]: 80,
          [GdprRequestStatus.PENDING]: 10,
          [GdprRequestStatus.REJECTED]: 10,
        },
        recentRequests: [
          { id: 'recent-1', createdAt: new Date() },
          { id: 'recent-2', createdAt: new Date() },
        ],
      };
      mockGdprService.getStatistics.mockResolvedValue(mockStats);

      // Act
      const result = await controller.getStatistics();

      // Assert
      expect(result).toEqual(mockStats);
      expect(gdprService.getStatistics).toHaveBeenCalled();
    });

    it('should handle zero statistics', async () => {
      // Arrange
      const mockStats = {
        totalRequests: 0,
        pendingRequests: 0,
        byType: {},
        byStatus: {},
        recentRequests: [],
      };
      mockGdprService.getStatistics.mockResolvedValue(mockStats);

      // Act
      const result = await controller.getStatistics();

      // Assert
      expect(result.totalRequests).toBe(0);
      expect(result.recentRequests).toEqual([]);
    });
  });

  // ==========================================================================
  // GET USER AUDIT LOGS (Admin) Tests
  // ==========================================================================

  describe('getUserAuditLogs', () => {
    it('should return audit logs for specified user', async () => {
      // Arrange
      const mockLogs = [
        {
          id: 'log-1',
          userId: mockUserId,
          action: 'GDPR_CONSENT_UPDATE',
          entityType: 'GDPR',
          newValue: { consentType: 'MARKETING', granted: true },
          createdAt: new Date(),
        },
      ];
      mockGdprService.getAuditLogs.mockResolvedValue(mockLogs);

      // Act
      const result = await controller.getUserAuditLogs(mockUserId, { id: mockAdminId });

      // Assert
      expect(result).toEqual(mockLogs);
      expect(gdprService.getAuditLogs).toHaveBeenCalledWith(mockUserId, mockAdminId);
    });

    it('should pass both userId and adminId to service', async () => {
      // Arrange
      mockGdprService.getAuditLogs.mockResolvedValue([]);

      // Act
      await controller.getUserAuditLogs('target-user-id', { id: 'admin-user-id' });

      // Assert
      expect(gdprService.getAuditLogs).toHaveBeenCalledWith('target-user-id', 'admin-user-id');
    });
  });
});
