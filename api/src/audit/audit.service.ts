import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditLog } from '@prisma/client';

export interface AuditContext {
  userId?: string;
  ipAddress?: string;
  userAgent?: string;
}

export interface AuditFilters {
  userId?: string;
  action?: string;
  entityType?: string;
  entityId?: string;
  startDate?: Date;
  endDate?: Date;
}

export interface PaginationOptions {
  limit?: number;
  offset?: number;
}

export interface PaginatedAuditLogs {
  logs: AuditLog[];
  total: number;
  hasMore: boolean;
}

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Logs an audit event
   */
  async log(
    action: string,
    entityType: string,
    entityId: string | null,
    oldValue: Record<string, unknown> | null,
    newValue: Record<string, unknown> | null,
    context: AuditContext,
  ): Promise<AuditLog> {
    try {
      const auditLog = await this.prisma.auditLog.create({
        data: {
          userId: context.userId || null,
          action,
          entityType,
          entityId: entityId || null,
          oldValue: oldValue as object,
          newValue: newValue as object,
          ipAddress: context.ipAddress || null,
          userAgent: context.userAgent || null,
        },
      });

      this.logger.debug(
        `Audit log created: ${action} on ${entityType}${entityId ? `:${entityId}` : ''} by user ${context.userId || 'anonymous'}`,
      );

      return auditLog;
    } catch (error) {
      this.logger.error(
        `Failed to create audit log: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Retrieves audit logs with filters and pagination
   */
  async getAuditLogs(
    filters: AuditFilters,
    pagination: PaginationOptions = {},
  ): Promise<PaginatedAuditLogs> {
    const { limit = 50, offset = 0 } = pagination;

    const where: Record<string, unknown> = {};

    if (filters.userId) {
      where.userId = filters.userId;
    }

    if (filters.action) {
      where.action = filters.action;
    }

    if (filters.entityType) {
      where.entityType = filters.entityType;
    }

    if (filters.entityId) {
      where.entityId = filters.entityId;
    }

    if (filters.startDate || filters.endDate) {
      where.createdAt = {};
      if (filters.startDate) {
        (where.createdAt as Record<string, unknown>).gte = filters.startDate;
      }
      if (filters.endDate) {
        (where.createdAt as Record<string, unknown>).lte = filters.endDate;
      }
    }

    const [logs, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      this.prisma.auditLog.count({ where }),
    ]);

    return {
      logs,
      total,
      hasMore: offset + logs.length < total,
    };
  }

  /**
   * Gets all activity for a specific user
   */
  async getUserActivity(
    userId: string,
    pagination: PaginationOptions = {},
  ): Promise<PaginatedAuditLogs> {
    return this.getAuditLogs({ userId }, pagination);
  }

  /**
   * Gets audit logs for a specific entity
   */
  async getEntityHistory(
    entityType: string,
    entityId: string,
    pagination: PaginationOptions = {},
  ): Promise<PaginatedAuditLogs> {
    return this.getAuditLogs({ entityType, entityId }, pagination);
  }

  /**
   * Deletes old audit logs (for retention policy)
   */
  async purgeOldLogs(olderThan: Date): Promise<number> {
    const result = await this.prisma.auditLog.deleteMany({
      where: {
        createdAt: {
          lt: olderThan,
        },
      },
    });

    this.logger.log(`Purged ${result.count} audit logs older than ${olderThan.toISOString()}`);

    return result.count;
  }
}
