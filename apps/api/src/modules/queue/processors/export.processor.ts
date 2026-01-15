import { Injectable, Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { QueueName, ExportJobData, JobResult } from '../queue.types';
import { QueueService } from '../queue.service';
import { PrismaService } from '../../prisma/prisma.service';
import { ExcelExportService } from '../../analytics/services/excel-export.service';

/**
 * Export Processor
 *
 * Handles async export jobs for large datasets.
 * Processes exports in batches and saves to temporary storage.
 */
@Injectable()
export class ExportProcessor {
  private readonly logger = new Logger(ExportProcessor.name);
  private readonly tempDir: string;
  private readonly BATCH_SIZE = 1000;

  constructor(
    private readonly queueService: QueueService,
    private readonly prisma: PrismaService,
    private readonly excelExportService: ExcelExportService,
  ) {
    // Create temp directory for exports
    this.tempDir = path.join(os.tmpdir(), 'festival-exports');
    if (!fs.existsSync(this.tempDir)) {
      fs.mkdirSync(this.tempDir, { recursive: true });
    }
  }

  /**
   * Register the processor with the queue service
   */
  register(): void {
    this.queueService.registerWorker<ExportJobData>(
      QueueName.EXPORT,
      async (job) => this.process(job),
      { concurrency: 2 },
    );
    this.logger.log('Export processor registered');
  }

  /**
   * Process an export job
   */
  private async process(job: Job<ExportJobData>): Promise<JobResult> {
    const { data } = job;
    this.logger.log(`Processing export job ${job.id}: ${data.entityType} format=${data.format}`);

    try {
      await job.updateProgress(5);

      let result: JobResult;

      switch (data.entityType) {
        case 'tickets':
          result = await this.processTicketsExport(job, data);
          break;
        case 'transactions':
          result = await this.processTransactionsExport(job, data);
          break;
        case 'users':
          result = await this.processParticipantsExport(job, data);
          break;
        default:
          throw new Error(`Unsupported entity type: ${data.entityType}`);
      }

      await job.updateProgress(100);
      return result;
    } catch (error) {
      this.logger.error(`Export job ${job.id} failed: ${error}`);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Process tickets export
   */
  private async processTicketsExport(
    job: Job<ExportJobData>,
    data: ExportJobData,
  ): Promise<JobResult> {
    const festivalId = data.festivalId;
    const filters = data.filters as Record<string, string> || {};

    // Get festival name
    const festival = await this.prisma.festival.findUnique({
      where: { id: festivalId },
      select: { name: true },
    });

    if (!festival) {
      throw new Error(`Festival ${festivalId} not found`);
    }

    // Build filter conditions
    const where: Record<string, unknown> = {
      festivalId,
      isDeleted: false,
    };

    if (filters.startDate && filters.endDate) {
      where.createdAt = {
        gte: new Date(filters.startDate),
        lte: new Date(filters.endDate),
      };
    }

    if (filters.status) {
      where.status = filters.status;
    }

    if (filters.categoryId) {
      where.categoryId = filters.categoryId;
    }

    await job.updateProgress(10);

    // Count total for progress tracking
    const totalCount = await this.prisma.ticket.count({ where });
    let processedCount = 0;
    const allTickets: {
      id: string;
      ticketNumber: string;
      categoryName: string;
      categoryType: string;
      userEmail?: string;
      userName?: string;
      status: string;
      purchasePrice: number;
      createdAt: Date;
      usedAt?: Date | null;
    }[] = [];

    // Process in batches
    let skip = 0;
    while (skip < totalCount) {
      const tickets = await this.prisma.ticket.findMany({
        where,
        include: {
          category: { select: { name: true, type: true } },
          user: { select: { email: true, firstName: true, lastName: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: this.BATCH_SIZE,
      });

      for (const t of tickets) {
        allTickets.push({
          id: t.id,
          ticketNumber: t.qrCode.substring(0, 16),
          categoryName: t.category.name,
          categoryType: t.category.type,
          userEmail: t.user?.email || t.guestEmail || undefined,
          userName:
            t.user?.firstName && t.user?.lastName
              ? `${t.user.firstName} ${t.user.lastName}`
              : t.guestFirstName && t.guestLastName
                ? `${t.guestFirstName} ${t.guestLastName}`
                : undefined,
          status: t.status,
          purchasePrice: Number(t.purchasePrice),
          createdAt: t.createdAt,
          usedAt: t.usedAt,
        });
      }

      processedCount += tickets.length;
      skip += this.BATCH_SIZE;

      // Update progress (10-80% for data fetching)
      const fetchProgress = 10 + Math.floor((processedCount / totalCount) * 70);
      await job.updateProgress(fetchProgress);
    }

    await job.updateProgress(85);

    // Generate Excel file
    const timeRange =
      filters.startDate && filters.endDate
        ? { startDate: new Date(filters.startDate), endDate: new Date(filters.endDate) }
        : undefined;

    const excelResult = await this.excelExportService.exportTickets(
      allTickets,
      festival.name,
      timeRange,
    );

    await job.updateProgress(95);

    // Save to temp file
    const filePath = path.join(this.tempDir, excelResult.filename);
    fs.writeFileSync(filePath, excelResult.data);

    // Schedule cleanup after 24 hours
    setTimeout(
      () => {
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
          this.logger.log(`Cleaned up export file: ${filePath}`);
        }
      },
      24 * 60 * 60 * 1000,
    );

    return {
      success: true,
      data: {
        filename: excelResult.filename,
        mimeType: excelResult.mimeType,
        filePath,
        totalRows: allTickets.length,
        generatedAt: excelResult.generatedAt,
      },
    };
  }

  /**
   * Process transactions export
   */
  private async processTransactionsExport(
    job: Job<ExportJobData>,
    data: ExportJobData,
  ): Promise<JobResult> {
    const festivalId = data.festivalId;
    const filters = data.filters as Record<string, string> || {};

    // Get festival name
    const festival = await this.prisma.festival.findUnique({
      where: { id: festivalId },
      select: { name: true },
    });

    if (!festival) {
      throw new Error(`Festival ${festivalId} not found`);
    }

    // Build filter conditions
    const where: Record<string, unknown> = { festivalId };

    if (filters.startDate && filters.endDate) {
      where.createdAt = {
        gte: new Date(filters.startDate),
        lte: new Date(filters.endDate),
      };
    }

    if (filters.type) {
      where.type = filters.type;
    }

    await job.updateProgress(10);

    // Count total
    const totalCount = await this.prisma.cashlessTransaction.count({ where });
    let processedCount = 0;
    const allTransactions: {
      id: string;
      type: string;
      amount: number;
      balanceBefore: number;
      balanceAfter: number;
      userEmail?: string;
      userName?: string;
      vendorName?: string;
      description?: string;
      createdAt: Date;
    }[] = [];

    // Process in batches
    let skip = 0;
    while (skip < totalCount) {
      const transactions = await this.prisma.cashlessTransaction.findMany({
        where,
        include: {
          account: {
            include: {
              user: { select: { email: true, firstName: true, lastName: true } },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: this.BATCH_SIZE,
      });

      for (const t of transactions) {
        allTransactions.push({
          id: t.id,
          type: t.type,
          amount: Number(t.amount),
          balanceBefore: Number(t.balanceBefore),
          balanceAfter: Number(t.balanceAfter),
          userEmail: t.account.user?.email,
          userName:
            t.account.user?.firstName && t.account.user?.lastName
              ? `${t.account.user.firstName} ${t.account.user.lastName}`
              : undefined,
          description: t.description || undefined,
          createdAt: t.createdAt,
        });
      }

      processedCount += transactions.length;
      skip += this.BATCH_SIZE;

      const fetchProgress = 10 + Math.floor((processedCount / totalCount) * 70);
      await job.updateProgress(fetchProgress);
    }

    await job.updateProgress(85);

    // Generate Excel file
    const timeRange =
      filters.startDate && filters.endDate
        ? { startDate: new Date(filters.startDate), endDate: new Date(filters.endDate) }
        : undefined;

    const excelResult = await this.excelExportService.exportTransactions(
      allTransactions,
      festival.name,
      timeRange,
    );

    await job.updateProgress(95);

    // Save to temp file
    const filePath = path.join(this.tempDir, excelResult.filename);
    fs.writeFileSync(filePath, excelResult.data);

    // Schedule cleanup after 24 hours
    setTimeout(
      () => {
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      },
      24 * 60 * 60 * 1000,
    );

    return {
      success: true,
      data: {
        filename: excelResult.filename,
        mimeType: excelResult.mimeType,
        filePath,
        totalRows: allTransactions.length,
        generatedAt: excelResult.generatedAt,
      },
    };
  }

  /**
   * Process participants export
   */
  private async processParticipantsExport(
    job: Job<ExportJobData>,
    data: ExportJobData,
  ): Promise<JobResult> {
    const festivalId = data.festivalId;

    // Get festival name
    const festival = await this.prisma.festival.findUnique({
      where: { id: festivalId },
      select: { name: true },
    });

    if (!festival) {
      throw new Error(`Festival ${festivalId} not found`);
    }

    await job.updateProgress(10);

    // Get all ticket holders for this festival
    const ticketHolders = await this.prisma.ticket.findMany({
      where: {
        festivalId,
        isDeleted: false,
        userId: { not: null },
      },
      select: {
        userId: true,
        category: { select: { type: true } },
        purchasePrice: true,
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            phone: true,
            createdAt: true,
            cashlessAccount: {
              select: { balance: true, lastTransactionAt: true },
            },
          },
        },
      },
    });

    await job.updateProgress(50);

    // Aggregate by user
    const userMap = new Map<
      string,
      {
        id: string;
        email: string;
        firstName: string;
        lastName: string;
        phone?: string;
        ticketCount: number;
        ticketTypes: Set<string>;
        totalSpent: number;
        cashlessBalance?: number;
        lastActivity?: Date;
        createdAt: Date;
      }
    >();

    for (const ticket of ticketHolders) {
      if (!ticket.user) {continue;}

      const userId = ticket.user.id;
      const existing = userMap.get(userId);

      if (existing) {
        existing.ticketCount++;
        existing.ticketTypes.add(ticket.category.type);
        existing.totalSpent += Number(ticket.purchasePrice);
        if (
          ticket.user.cashlessAccount?.lastTransactionAt &&
          (!existing.lastActivity ||
            ticket.user.cashlessAccount.lastTransactionAt > existing.lastActivity)
        ) {
          existing.lastActivity = ticket.user.cashlessAccount.lastTransactionAt;
        }
      } else {
        userMap.set(userId, {
          id: userId,
          email: ticket.user.email,
          firstName: ticket.user.firstName,
          lastName: ticket.user.lastName,
          phone: ticket.user.phone || undefined,
          ticketCount: 1,
          ticketTypes: new Set([ticket.category.type]),
          totalSpent: Number(ticket.purchasePrice),
          cashlessBalance: ticket.user.cashlessAccount
            ? Number(ticket.user.cashlessAccount.balance)
            : undefined,
          lastActivity: ticket.user.cashlessAccount?.lastTransactionAt || undefined,
          createdAt: ticket.user.createdAt,
        });
      }
    }

    await job.updateProgress(70);

    const participants = Array.from(userMap.values()).map((p) => ({
      ...p,
      ticketTypes: Array.from(p.ticketTypes),
    }));

    await job.updateProgress(85);

    // Generate Excel file
    const excelResult = await this.excelExportService.exportParticipants(
      participants,
      festival.name,
    );

    await job.updateProgress(95);

    // Save to temp file
    const filePath = path.join(this.tempDir, excelResult.filename);
    fs.writeFileSync(filePath, excelResult.data);

    // Schedule cleanup after 24 hours
    setTimeout(
      () => {
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      },
      24 * 60 * 60 * 1000,
    );

    return {
      success: true,
      data: {
        filename: excelResult.filename,
        mimeType: excelResult.mimeType,
        filePath,
        totalRows: participants.length,
        generatedAt: excelResult.generatedAt,
      },
    };
  }
}
