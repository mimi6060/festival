import {
  Controller,
  Get,
  Query,
  Param,
  Res,
  UseGuards,
  Logger,
  BadRequestException,
  NotFoundException,
  InternalServerErrorException,
} from '@nestjs/common';
import { Response } from 'express';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import * as fs from 'fs';
import * as path from 'path';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { PrismaService } from '../../prisma/prisma.service';
import { ExcelExportService } from '../services/excel-export.service';
import { QueueService } from '../../queue/queue.service';
import { QueueName, JobPriority } from '../../queue/queue.types';

// Threshold for async export (10K rows)
const ASYNC_EXPORT_THRESHOLD = 10000;

/**
 * Admin Export Controller
 *
 * Provides endpoints for exporting admin data to Excel (XLSX).
 * For large exports (>10K rows), uses async job processing with BullMQ.
 */
@ApiTags('Admin Export')
@Controller('admin/export')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class AdminExportController {
  private readonly logger = new Logger(AdminExportController.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly excelExportService: ExcelExportService,
    private readonly queueService: QueueService
  ) {}

  // ============================================
  // Tickets Export
  // ============================================

  @Get('tickets')
  @Roles('ADMIN', 'ORGANIZER')
  @ApiOperation({
    summary: 'Export tickets to XLSX',
    description:
      'Export all tickets for a festival. For large exports (>10K rows), returns a job ID for async processing.',
  })
  @ApiQuery({ name: 'festivalId', required: true, description: 'Festival ID' })
  @ApiQuery({
    name: 'startDate',
    required: false,
    description: 'Start date filter (ISO)',
  })
  @ApiQuery({
    name: 'endDate',
    required: false,
    description: 'End date filter (ISO)',
  })
  @ApiQuery({
    name: 'status',
    required: false,
    description: 'Filter by ticket status (SOLD, USED, CANCELLED, REFUNDED)',
  })
  @ApiQuery({
    name: 'categoryId',
    required: false,
    description: 'Filter by ticket category',
  })
  @ApiResponse({ status: 200, description: 'Excel file or job ID for async export' })
  @ApiResponse({ status: 202, description: 'Async export started, job ID returned' })
  @ApiResponse({ status: 400, description: 'Invalid parameters' })
  @ApiResponse({ status: 404, description: 'Festival not found' })
  async exportTickets(
    @Query('festivalId') festivalId: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('status') status?: string,
    @Query('categoryId') categoryId?: string,
    @CurrentUser() user?: { id: string },
    @Res() res?: Response
  ) {
    // Validate festival exists
    const festival = await this.prisma.festival.findUnique({
      where: { id: festivalId },
      select: { id: true, name: true },
    });

    if (!festival) {
      throw new NotFoundException(`Festival ${festivalId} not found`);
    }

    // Build filter conditions
    const where: Record<string, unknown> = {
      festivalId,
      isDeleted: false,
    };

    if (startDate && endDate) {
      where.createdAt = {
        gte: new Date(startDate),
        lte: new Date(endDate),
      };
    }

    if (status) {
      where.status = status;
    }

    if (categoryId) {
      where.categoryId = categoryId;
    }

    // Count total rows to determine sync vs async
    const totalCount = await this.prisma.ticket.count({ where });

    this.logger.log(
      `Export tickets request: festivalId=${festivalId}, count=${totalCount}, user=${user?.id}`
    );

    // For large exports, use async processing
    if (totalCount > ASYNC_EXPORT_THRESHOLD) {
      const job = await this.queueService.addExportJob(
        {
          entityType: 'tickets',
          format: 'xlsx',
          festivalId,
          userId: user?.id,
          filters: { startDate, endDate, status, categoryId },
        },
        { priority: JobPriority.NORMAL }
      );

      res?.status(202).json({
        async: true,
        jobId: job.id,
        message: `Export started for ${totalCount} tickets. Use GET /admin/export/jobs/:jobId to check status.`,
        totalRows: totalCount,
      });
      return;
    }

    // Synchronous export for smaller datasets
    const tickets = await this.prisma.ticket.findMany({
      where,
      include: {
        category: { select: { name: true, type: true } },
        user: { select: { email: true, firstName: true, lastName: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    const result = await this.excelExportService.exportTickets(
      tickets.map((t) => ({
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
      })),
      festival.name,
      startDate && endDate
        ? { startDate: new Date(startDate), endDate: new Date(endDate) }
        : undefined
    );

    res?.setHeader('Content-Type', result.mimeType);
    res?.setHeader('Content-Disposition', `attachment; filename="${result.filename}"`);
    res?.send(result.data);
  }

  // ============================================
  // Transactions Export
  // ============================================

  @Get('transactions')
  @Roles('ADMIN', 'ORGANIZER')
  @ApiOperation({
    summary: 'Export cashless transactions to XLSX',
    description:
      'Export all cashless transactions for a festival. For large exports (>10K rows), uses async processing.',
  })
  @ApiQuery({ name: 'festivalId', required: true, description: 'Festival ID' })
  @ApiQuery({
    name: 'startDate',
    required: false,
    description: 'Start date filter (ISO)',
  })
  @ApiQuery({
    name: 'endDate',
    required: false,
    description: 'End date filter (ISO)',
  })
  @ApiQuery({
    name: 'type',
    required: false,
    description: 'Filter by transaction type (TOPUP, PAYMENT, REFUND, TRANSFER)',
  })
  @ApiResponse({ status: 200, description: 'Excel file or job ID for async export' })
  @ApiResponse({ status: 202, description: 'Async export started, job ID returned' })
  async exportTransactions(
    @Query('festivalId') festivalId: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('type') type?: string,
    @CurrentUser() user?: { id: string },
    @Res() res?: Response
  ) {
    // Validate festival exists
    const festival = await this.prisma.festival.findUnique({
      where: { id: festivalId },
      select: { id: true, name: true },
    });

    if (!festival) {
      throw new NotFoundException(`Festival ${festivalId} not found`);
    }

    // Build filter conditions
    const where: Record<string, unknown> = { festivalId };

    if (startDate && endDate) {
      where.createdAt = {
        gte: new Date(startDate),
        lte: new Date(endDate),
      };
    }

    if (type) {
      where.type = type;
    }

    // Count total rows
    const totalCount = await this.prisma.cashlessTransaction.count({ where });

    this.logger.log(
      `Export transactions request: festivalId=${festivalId}, count=${totalCount}, user=${user?.id}`
    );

    // For large exports, use async processing
    if (totalCount > ASYNC_EXPORT_THRESHOLD) {
      const job = await this.queueService.addExportJob(
        {
          entityType: 'transactions',
          format: 'xlsx',
          festivalId,
          userId: user?.id,
          filters: { startDate, endDate, type },
        },
        { priority: JobPriority.NORMAL }
      );

      res?.status(202).json({
        async: true,
        jobId: job.id,
        message: `Export started for ${totalCount} transactions. Use GET /admin/export/jobs/:jobId to check status.`,
        totalRows: totalCount,
      });
      return;
    }

    // Synchronous export
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
    });

    const result = await this.excelExportService.exportTransactions(
      transactions.map((t) => ({
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
        vendorName: undefined, // Add vendor if available
        description: t.description || undefined,
        createdAt: t.createdAt,
      })),
      festival.name,
      startDate && endDate
        ? { startDate: new Date(startDate), endDate: new Date(endDate) }
        : undefined
    );

    res?.setHeader('Content-Type', result.mimeType);
    res?.setHeader('Content-Disposition', `attachment; filename="${result.filename}"`);
    res?.send(result.data);
  }

  // ============================================
  // Participants Export
  // ============================================

  @Get('participants')
  @Roles('ADMIN', 'ORGANIZER')
  @ApiOperation({
    summary: 'Export participants to XLSX',
    description:
      'Export all participants (users with tickets) for a festival. Includes ticket counts and spending data.',
  })
  @ApiQuery({ name: 'festivalId', required: true, description: 'Festival ID' })
  @ApiQuery({
    name: 'startDate',
    required: false,
    description: 'Filter by registration date start (ISO)',
  })
  @ApiQuery({
    name: 'endDate',
    required: false,
    description: 'Filter by registration date end (ISO)',
  })
  @ApiQuery({
    name: 'hasTicket',
    required: false,
    description: 'Only include users with tickets (default: true)',
  })
  @ApiQuery({
    name: 'hasCashless',
    required: false,
    description: 'Only include users with cashless accounts',
  })
  @ApiResponse({ status: 200, description: 'Excel file or job ID for async export' })
  @ApiResponse({ status: 202, description: 'Async export started, job ID returned' })
  async exportParticipants(
    @Query('festivalId') festivalId: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('hasTicket') hasTicket?: string,
    @Query('hasCashless') hasCashless?: string,
    @CurrentUser() user?: { id: string },
    @Res() res?: Response
  ) {
    // Validate festival exists
    const festival = await this.prisma.festival.findUnique({
      where: { id: festivalId },
      select: { id: true, name: true },
    });

    if (!festival) {
      throw new NotFoundException(`Festival ${festivalId} not found`);
    }

    // Get participants with tickets for this festival
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
      if (!ticket.user) {
        continue;
      }

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

    const participants = Array.from(userMap.values()).map((p) => ({
      ...p,
      ticketTypes: Array.from(p.ticketTypes),
    }));

    this.logger.log(
      `Export participants request: festivalId=${festivalId}, count=${participants.length}, user=${user?.id}`
    );

    // For large exports, use async processing
    if (participants.length > ASYNC_EXPORT_THRESHOLD) {
      const job = await this.queueService.addExportJob(
        {
          entityType: 'users',
          format: 'xlsx',
          festivalId,
          userId: user?.id,
          filters: { startDate, endDate, hasTicket, hasCashless },
        },
        { priority: JobPriority.NORMAL }
      );

      res?.status(202).json({
        async: true,
        jobId: job.id,
        message: `Export started for ${participants.length} participants. Use GET /admin/export/jobs/:jobId to check status.`,
        totalRows: participants.length,
      });
      return;
    }

    // Synchronous export
    const result = await this.excelExportService.exportParticipants(
      participants,
      festival.name,
      startDate && endDate
        ? { startDate: new Date(startDate), endDate: new Date(endDate) }
        : undefined
    );

    res?.setHeader('Content-Type', result.mimeType);
    res?.setHeader('Content-Disposition', `attachment; filename="${result.filename}"`);
    res?.send(result.data);
  }

  // ============================================
  // Job Status Endpoints
  // ============================================

  @Get('jobs/:jobId')
  @Roles('ADMIN', 'ORGANIZER')
  @ApiOperation({
    summary: 'Get export job status',
    description: 'Check the status of an async export job.',
  })
  @ApiParam({ name: 'jobId', description: 'Job ID returned from async export' })
  @ApiResponse({
    status: 200,
    description: 'Job status and progress',
    schema: {
      type: 'object',
      properties: {
        id: { type: 'string' },
        status: {
          type: 'string',
          enum: ['waiting', 'active', 'completed', 'failed'],
        },
        progress: { type: 'number' },
        result: {
          type: 'object',
          properties: {
            downloadUrl: { type: 'string' },
            filename: { type: 'string' },
          },
        },
        error: { type: 'string' },
      },
    },
  })
  async getJobStatus(@Param('jobId') jobId: string, @Res() res: Response) {
    const job = await this.queueService.getJob(QueueName.EXPORT, jobId);

    if (!job) {
      throw new NotFoundException(`Job ${jobId} not found`);
    }

    const state = await job.getState();
    const progress = job.progress;
    const result = job.returnvalue;
    const failedReason = job.failedReason;

    res.json({
      id: job.id,
      status: state,
      progress: typeof progress === 'number' ? progress : 0,
      result:
        state === 'completed' && result
          ? {
              downloadUrl: `/admin/export/download/${jobId}`,
              filename: (result as Record<string, unknown>).filename,
            }
          : undefined,
      error: state === 'failed' ? failedReason : undefined,
    });
  }

  @Get('download/:jobId')
  @Roles('ADMIN', 'ORGANIZER')
  @ApiOperation({
    summary: 'Download completed export',
    description: 'Download the Excel file for a completed async export job.',
  })
  @ApiParam({ name: 'jobId', description: 'Job ID of completed export' })
  @ApiResponse({ status: 200, description: 'Excel file download' })
  @ApiResponse({ status: 404, description: 'Job not found or not completed' })
  async downloadExport(@Param('jobId') jobId: string, @Res() res: Response) {
    const job = await this.queueService.getJob(QueueName.EXPORT, jobId);

    if (!job) {
      throw new NotFoundException(`Job ${jobId} not found`);
    }

    const state = await job.getState();

    if (state !== 'completed') {
      throw new BadRequestException(`Job ${jobId} is not completed (status: ${state})`);
    }

    const result = job.returnvalue as {
      filename: string;
      mimeType: string;
      filePath: string;
    };

    if (!result?.filePath) {
      throw new NotFoundException('Export file not found');
    }

    // Validate file path to prevent directory traversal attacks
    const normalizedPath = path.normalize(result.filePath);
    const tempDir = path.normalize(path.join(require('os').tmpdir(), 'festival-exports'));

    if (!normalizedPath.startsWith(tempDir)) {
      this.logger.error(`Invalid file path detected: ${normalizedPath}`);
      throw new BadRequestException('Invalid file path');
    }

    // Check if file exists
    if (!fs.existsSync(normalizedPath)) {
      this.logger.warn(`Export file not found on disk: ${normalizedPath}`);
      throw new NotFoundException(
        'Export file has expired or was already downloaded. Please generate a new export.'
      );
    }

    try {
      // Get file stats for Content-Length header
      const stats = fs.statSync(normalizedPath);

      // Set response headers
      res.setHeader('Content-Type', result.mimeType);
      res.setHeader('Content-Disposition', `attachment; filename="${result.filename}"`);
      res.setHeader('Content-Length', stats.size);
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');

      // Stream the file to the response
      const fileStream = fs.createReadStream(normalizedPath);

      fileStream.on('error', (error) => {
        this.logger.error(`Error streaming export file: ${error.message}`);
        if (!res.headersSent) {
          res.status(500).json({ message: 'Error streaming file' });
        }
      });

      fileStream.on('end', () => {
        this.logger.log(`Export file ${result.filename} downloaded for job ${jobId}`);

        // Optionally delete file after download to save space
        // The file will also be cleaned up by the scheduled cleanup in the processor
        // Uncomment the following to delete immediately after download:
        // fs.unlink(normalizedPath, (err) => {
        //   if (err) this.logger.warn(`Failed to cleanup file: ${err.message}`);
        // });
      });

      fileStream.pipe(res);
    } catch (error) {
      this.logger.error(`Failed to stream export file: ${error}`);
      throw new InternalServerErrorException('Failed to download export file');
    }
  }
}
