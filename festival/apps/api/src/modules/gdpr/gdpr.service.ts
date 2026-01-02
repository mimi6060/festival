import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '@prisma/client';
import * as crypto from 'crypto';
import {
  ConsentType,
  GdprRequestType,
  GdprRequestStatus,
  ExportFormat,
  UpdateConsentDto,
  BulkUpdateConsentsDto,
  CreateDataRequestDto,
  ProcessDataRequestDto,
  GdprQueryDto,
  CreateRectificationRequestDto,
} from './dto';

/**
 * GDPR Service
 *
 * Handles all GDPR compliance operations:
 * - Consent management
 * - Data access requests (Right to Access)
 * - Data deletion requests (Right to be Forgotten)
 * - Data rectification requests
 * - Data portability (export)
 * - Audit logging
 */
@Injectable()
export class GdprService {
  private readonly logger = new Logger(GdprService.name);

  constructor(private readonly prisma: PrismaService) {}

  // ============== Consent Management ==============

  /**
   * Get user's current consents
   */
  async getUserConsents(userId: string) {
    const consents = await this.prisma.userConsent.findMany({
      where: { userId },
      orderBy: { type: 'asc' },
    });

    // Return all consent types with their status
    return Object.values(ConsentType).map((type) => {
      const consent = consents.find((c) => c.type === type);
      return {
        type,
        granted: consent?.granted ?? (type === ConsentType.ESSENTIAL),
        grantedAt: consent?.grantedAt ?? null,
        revokedAt: consent?.revokedAt ?? null,
        ipAddress: consent?.ipAddress ?? null,
        userAgent: consent?.userAgent ?? null,
      };
    });
  }

  /**
   * Update a single consent
   */
  async updateConsent(
    userId: string,
    dto: UpdateConsentDto,
    metadata: { ipAddress?: string; userAgent?: string },
  ) {
    // Essential consent cannot be revoked
    if (dto.type === ConsentType.ESSENTIAL && !dto.granted) {
      throw new BadRequestException('Essential consent cannot be revoked');
    }

    const consent = await this.prisma.userConsent.upsert({
      where: {
        userId_type: {
          userId,
          type: dto.type,
        },
      },
      create: {
        userId,
        type: dto.type,
        granted: dto.granted,
        grantedAt: dto.granted ? new Date() : null,
        revokedAt: dto.granted ? null : new Date(),
        ipAddress: metadata.ipAddress,
        userAgent: metadata.userAgent,
      },
      update: {
        granted: dto.granted,
        grantedAt: dto.granted ? new Date() : undefined,
        revokedAt: dto.granted ? null : new Date(),
        ipAddress: metadata.ipAddress,
        userAgent: metadata.userAgent,
      },
    });

    // Log consent change
    await this.logGdprAction(userId, 'CONSENT_UPDATE', {
      consentType: dto.type,
      granted: dto.granted,
    });

    this.logger.log(
      `User ${userId} ${dto.granted ? 'granted' : 'revoked'} consent for ${dto.type}`,
    );

    return consent;
  }

  /**
   * Update multiple consents at once
   */
  async updateConsents(
    userId: string,
    dto: BulkUpdateConsentsDto,
    metadata: { ipAddress?: string; userAgent?: string },
  ) {
    const results = await Promise.all(
      dto.consents.map((consent) =>
        this.updateConsent(userId, consent, metadata),
      ),
    );

    return results;
  }

  // ============== Data Access Request ==============

  /**
   * Create a GDPR data request
   */
  async createDataRequest(userId: string, dto: CreateDataRequestDto) {
    // Check for pending requests of the same type
    const existingRequest = await this.prisma.gdprRequest.findFirst({
      where: {
        userId,
        type: dto.type,
        status: { in: ['PENDING', 'IN_PROGRESS'] },
      },
    });

    if (existingRequest) {
      throw new BadRequestException(
        `You already have a pending ${dto.type} request`,
      );
    }

    const request = await this.prisma.gdprRequest.create({
      data: {
        userId,
        type: dto.type,
        status: GdprRequestStatus.PENDING,
        details: dto.details,
        format: dto.format || ExportFormat.JSON,
      },
    });

    await this.logGdprAction(userId, 'DATA_REQUEST_CREATED', {
      requestId: request.id,
      type: dto.type,
    });

    this.logger.log(`User ${userId} created ${dto.type} request ${request.id}`);

    return request;
  }

  /**
   * Get user's GDPR requests
   */
  async getUserRequests(userId: string) {
    return this.prisma.gdprRequest.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Get a specific GDPR request
   */
  async getRequest(requestId: string, userId?: string) {
    const request = await this.prisma.gdprRequest.findUnique({
      where: { id: requestId },
    });

    if (!request) {
      throw new NotFoundException(`Request with ID ${requestId} not found`);
    }

    // Non-admin users can only access their own requests
    if (userId && request.userId !== userId) {
      throw new ForbiddenException('You can only access your own requests');
    }

    return request;
  }

  /**
   * Get all GDPR requests (admin only)
   */
  async getAllRequests(query: GdprQueryDto) {
    const { page = 1, limit = 20, ...filters } = query;

    const where: Prisma.GdprRequestWhereInput = {
      ...(filters.status && { status: filters.status }),
      ...(filters.type && { type: filters.type }),
      ...(filters.userId && { userId: filters.userId }),
    };

    const [requests, total] = await Promise.all([
      this.prisma.gdprRequest.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.gdprRequest.count({ where }),
    ]);

    return {
      items: requests,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Process a GDPR request (admin only)
   */
  async processRequest(
    requestId: string,
    dto: ProcessDataRequestDto,
    adminId: string,
  ) {
    const request = await this.getRequest(requestId);

    if (request.status !== GdprRequestStatus.PENDING) {
      throw new BadRequestException('Only pending requests can be processed');
    }

    if (dto.action === 'REJECT' && !dto.rejectionReason) {
      throw new BadRequestException('Rejection reason is required');
    }

    if (dto.action === 'APPROVE') {
      // Process based on request type
      await this.executeRequest(request);

      await this.prisma.gdprRequest.update({
        where: { id: requestId },
        data: {
          status: GdprRequestStatus.COMPLETED,
          processedAt: new Date(),
          processedBy: adminId,
        },
      });
    } else {
      await this.prisma.gdprRequest.update({
        where: { id: requestId },
        data: {
          status: GdprRequestStatus.REJECTED,
          processedAt: new Date(),
          processedBy: adminId,
          rejectionReason: dto.rejectionReason,
        },
      });
    }

    await this.logGdprAction(request.userId, 'DATA_REQUEST_PROCESSED', {
      requestId,
      action: dto.action,
      processedBy: adminId,
    });

    return this.getRequest(requestId);
  }

  /**
   * Execute a GDPR request based on type
   */
  private async executeRequest(request: any) {
    switch (request.type) {
      case GdprRequestType.DATA_ACCESS:
      case GdprRequestType.DATA_PORTABILITY:
        await this.generateDataExport(request);
        break;

      case GdprRequestType.DATA_DELETION:
        await this.executeDataDeletion(request.userId);
        break;

      case GdprRequestType.CONSENT_WITHDRAWAL:
        await this.executeConsentWithdrawal(request.userId);
        break;

      case GdprRequestType.DATA_RECTIFICATION:
        // Rectification is handled separately with specific fields
        break;
    }
  }

  // ============== Data Export ==============

  /**
   * Generate a data export for the user
   */
  async generateDataExport(request: any) {
    const userId = request.userId;
    const format = request.format || ExportFormat.JSON;

    // Collect all user data
    const userData = await this.collectUserData(userId);

    // Generate export file (would typically upload to S3/storage)
    // Note: formatExportData would be called when actually serving the download
    this.formatExportData(userData, format);

    // Store export reference
    const downloadToken = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    await this.prisma.gdprRequest.update({
      where: { id: request.id },
      data: {
        downloadUrl: `/api/gdpr/download/${downloadToken}`,
        expiresAt,
        // Note: exportData would need to be stored in external storage (S3, etc.)
        // as the GdprRequest model doesn't have an exportData field
      },
    });

    this.logger.log(`Generated data export for user ${userId}`);

    return { downloadToken, expiresAt };
  }

  /**
   * Collect all user data for export
   */
  private async collectUserData(userId: string) {
    const [
      user,
      tickets,
      payments,
      cashlessTransactions,
      supportTickets,
      consents,
      notifications,
    ] = await Promise.all([
      this.prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          phone: true,
          createdAt: true,
          updatedAt: true,
          lastLoginAt: true,
        },
      }),
      this.prisma.ticket.findMany({
        where: { userId },
        select: {
          id: true,
          qrCode: true,
          status: true,
          purchasePrice: true,
          createdAt: true,
          category: {
            select: { name: true, type: true },
          },
          festival: {
            select: { name: true },
          },
        },
      }),
      this.prisma.payment.findMany({
        where: { userId },
        select: {
          id: true,
          amount: true,
          currency: true,
          status: true,
          provider: true,
          createdAt: true,
        },
      }),
      this.prisma.cashlessTransaction.findMany({
        where: { account: { userId } },
        select: {
          id: true,
          type: true,
          amount: true,
          description: true,
          createdAt: true,
        },
      }),
      this.prisma.supportTicket.findMany({
        where: { userId },
        select: {
          id: true,
          subject: true,
          status: true,
          createdAt: true,
        },
      }),
      this.prisma.userConsent.findMany({
        where: { userId },
        select: {
          type: true,
          granted: true,
          grantedAt: true,
          revokedAt: true,
        },
      }),
      this.prisma.notification.findMany({
        where: { userId },
        select: {
          id: true,
          title: true,
          type: true,
          createdAt: true,
          isRead: true,
        },
      }),
    ]);

    return {
      exportDate: new Date().toISOString(),
      user,
      tickets,
      payments,
      cashlessTransactions,
      supportTickets,
      consents,
      notifications,
    };
  }

  /**
   * Format export data based on requested format
   */
  private formatExportData(data: any, format: ExportFormat): string {
    switch (format) {
      case ExportFormat.JSON:
        return JSON.stringify(data, null, 2);

      case ExportFormat.CSV:
        // Simple CSV conversion for user data
        const rows: string[] = [];
        rows.push('Section,Field,Value');

        const flattenObject = (obj: any, prefix = ''): void => {
          for (const [key, value] of Object.entries(obj)) {
            const fullKey = prefix ? `${prefix}.${key}` : key;
            if (value && typeof value === 'object' && !Array.isArray(value)) {
              flattenObject(value, fullKey);
            } else if (Array.isArray(value)) {
              rows.push(`${fullKey},count,${value.length}`);
            } else {
              rows.push(`${fullKey},,${value}`);
            }
          }
        };

        flattenObject(data);
        return rows.join('\n');

      case ExportFormat.PDF:
        // PDF generation would require a PDF library
        // Return JSON for now, actual PDF would be generated separately
        return JSON.stringify(data, null, 2);

      default:
        return JSON.stringify(data, null, 2);
    }
  }

  /**
   * Download exported data
   */
  async downloadExport(downloadToken: string) {
    // Look up by downloadUrl since downloadToken field doesn't exist
    const downloadUrl = `/api/gdpr/download/${downloadToken}`;
    const request = await this.prisma.gdprRequest.findFirst({
      where: {
        downloadUrl,
        status: GdprRequestStatus.COMPLETED,
      },
    });

    if (!request) {
      throw new NotFoundException('Export not found');
    }

    if (request.expiresAt && request.expiresAt < new Date()) {
      throw new BadRequestException('Export link has expired');
    }

    // Note: In a real implementation, exportData would be fetched from external storage
    // The GdprRequest model doesn't have an exportData field
    return {
      data: null, // Would be fetched from S3/storage using request.downloadUrl
      format: request.format,
      filename: `user-data-export-${request.userId.substring(0, 8)}.${request.format?.toLowerCase() || 'json'}`,
    };
  }

  // ============== Data Deletion ==============

  /**
   * Execute data deletion (Right to be Forgotten)
   */
  async executeDataDeletion(userId: string) {
    this.logger.log(`Starting data deletion for user ${userId}`);

    // Anonymize user data instead of hard delete (for legal reasons)
    const anonymousEmail = `deleted-${crypto.randomBytes(8).toString('hex')}@deleted.local`;

    await this.prisma.$transaction(async (tx) => {
      // Anonymize user
      await tx.user.update({
        where: { id: userId },
        data: {
          email: anonymousEmail,
          firstName: 'Deleted',
          lastName: 'User',
          phone: null,
          status: 'INACTIVE',
          passwordHash: '',
        },
      });

      // Delete sensitive data
      await tx.pushToken.deleteMany({ where: { userId } });
      await tx.userConsent.deleteMany({ where: { userId } });
      await tx.notification.deleteMany({ where: { userId } });
      await tx.session.deleteMany({ where: { userId } });

      // Keep anonymized records for legal/financial compliance
      // Tickets, payments, etc. are retained but user is anonymized
    });

    await this.logGdprAction(userId, 'DATA_DELETED', {
      anonymizedEmail: anonymousEmail,
    });

    this.logger.log(`Completed data deletion for user ${userId}`);
  }

  // ============== Consent Withdrawal ==============

  /**
   * Execute consent withdrawal
   */
  async executeConsentWithdrawal(userId: string) {
    await this.prisma.userConsent.updateMany({
      where: {
        userId,
        type: { not: ConsentType.ESSENTIAL },
      },
      data: {
        granted: false,
        revokedAt: new Date(),
      },
    });

    await this.logGdprAction(userId, 'CONSENT_WITHDRAWN', {
      allNonEssential: true,
    });

    this.logger.log(`Withdrawn all non-essential consents for user ${userId}`);
  }

  // ============== Data Rectification ==============

  /**
   * Create a data rectification request
   */
  async createRectificationRequest(
    userId: string,
    dto: CreateRectificationRequestDto,
  ) {
    const request = await this.prisma.gdprRequest.create({
      data: {
        userId,
        type: GdprRequestType.DATA_RECTIFICATION,
        status: GdprRequestStatus.PENDING,
        details: JSON.stringify(dto.corrections),
      },
    });

    await this.logGdprAction(userId, 'RECTIFICATION_REQUESTED', {
      requestId: request.id,
      fields: dto.corrections.map((c) => c.field),
    });

    return request;
  }

  // ============== Audit Logging ==============

  /**
   * Log a GDPR action for audit purposes
   */
  private async logGdprAction(
    userId: string,
    action: string,
    details: Record<string, unknown>,
  ) {
    await this.prisma.auditLog.create({
      data: {
        userId,
        action: `GDPR_${action}`,
        entityType: 'GDPR',
        entityId: userId,
        newValue: details as Prisma.InputJsonValue,
        ipAddress: null, // Would be passed from controller
        userAgent: null,
      },
    });
  }

  /**
   * Get GDPR audit logs for a user
   */
  async getAuditLogs(userId: string, adminUserId?: string) {
    // Non-admin users can only see their own logs
    const targetUserId = adminUserId ? userId : adminUserId;

    return this.prisma.auditLog.findMany({
      where: {
        userId: targetUserId || userId,
        action: { startsWith: 'GDPR_' },
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
  }

  // ============== Statistics ==============

  /**
   * Get GDPR statistics (admin only)
   */
  async getStatistics() {
    const [
      totalRequests,
      pendingRequests,
      byType,
      byStatus,
      recentRequests,
    ] = await Promise.all([
      this.prisma.gdprRequest.count(),
      this.prisma.gdprRequest.count({
        where: { status: GdprRequestStatus.PENDING },
      }),
      this.prisma.gdprRequest.groupBy({
        by: ['type'],
        _count: true,
      }),
      this.prisma.gdprRequest.groupBy({
        by: ['status'],
        _count: true,
      }),
      this.prisma.gdprRequest.findMany({
        take: 10,
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    return {
      totalRequests,
      pendingRequests,
      byType: byType.reduce(
        (acc, t) => ({ ...acc, [t.type]: t._count }),
        {},
      ),
      byStatus: byStatus.reduce(
        (acc, s) => ({ ...acc, [s.status]: s._count }),
        {},
      ),
      recentRequests,
    };
  }
}
