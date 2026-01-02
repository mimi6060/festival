import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  Query,
  UseGuards,
  Req,
  ParseUUIDPipe,
  Res,
  StreamableFile,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import type { Response } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { GdprService } from './gdpr.service';
import {
  UpdateConsentDto,
  BulkUpdateConsentsDto,
  CreateDataRequestDto,
  ProcessDataRequestDto,
  GdprQueryDto,
  CreateRectificationRequestDto,
} from './dto';
import { UserRole } from '@prisma/client';

/**
 * GDPR Controller - User endpoints
 *
 * Handles GDPR compliance requests from users:
 * - Consent management
 * - Data access requests
 * - Data deletion requests
 * - Data portability
 */
@ApiTags('GDPR')
@Controller('gdpr')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class GdprController {
  constructor(private readonly gdprService: GdprService) {}

  // ============== Consent Management ==============

  @Get('consents')
  @ApiOperation({ summary: 'Get current user consents' })
  @ApiResponse({ status: 200, description: 'Returns current consent status for all types' })
  async getConsents(@CurrentUser() user: { id: string }) {
    return this.gdprService.getUserConsents(user.id);
  }

  @Put('consents')
  @ApiOperation({ summary: 'Update a single consent' })
  @ApiResponse({ status: 200, description: 'Consent updated successfully' })
  async updateConsent(
    @CurrentUser() user: { id: string },
    @Body() dto: UpdateConsentDto,
    @Req() req: any,
  ) {
    return this.gdprService.updateConsent(user.id, dto, {
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });
  }

  @Put('consents/bulk')
  @ApiOperation({ summary: 'Update multiple consents at once' })
  @ApiResponse({ status: 200, description: 'Consents updated successfully' })
  async updateConsents(
    @CurrentUser() user: { id: string },
    @Body() dto: BulkUpdateConsentsDto,
    @Req() req: any,
  ) {
    return this.gdprService.updateConsents(user.id, dto, {
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });
  }

  // ============== Data Requests ==============

  @Post('requests')
  @ApiOperation({ summary: 'Create a GDPR data request' })
  @ApiResponse({ status: 201, description: 'Request created successfully' })
  @ApiResponse({ status: 400, description: 'Already have a pending request of this type' })
  async createRequest(
    @CurrentUser() user: { id: string },
    @Body() dto: CreateDataRequestDto,
  ) {
    return this.gdprService.createDataRequest(user.id, dto);
  }

  @Get('requests')
  @ApiOperation({ summary: 'Get your GDPR requests' })
  @ApiResponse({ status: 200, description: 'Returns list of your GDPR requests' })
  async getMyRequests(@CurrentUser() user: { id: string }) {
    return this.gdprService.getUserRequests(user.id);
  }

  @Get('requests/:id')
  @ApiOperation({ summary: 'Get a specific GDPR request' })
  @ApiResponse({ status: 200, description: 'Request details' })
  @ApiResponse({ status: 404, description: 'Request not found' })
  async getRequest(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: { id: string },
  ) {
    return this.gdprService.getRequest(id, user.id);
  }

  // ============== Data Export Download ==============

  @Get('download/:token')
  @ApiOperation({ summary: 'Download exported data' })
  @ApiResponse({ status: 200, description: 'Data export file' })
  @ApiResponse({ status: 404, description: 'Export not found or expired' })
  async downloadExport(
    @Param('token') token: string,
    @Res({ passthrough: true }) res: Response,
  ) {
    const export_ = await this.gdprService.downloadExport(token);

    res.set({
      'Content-Type':
        export_.format === 'JSON'
          ? 'application/json'
          : export_.format === 'CSV'
            ? 'text/csv'
            : 'application/octet-stream',
      'Content-Disposition': `attachment; filename="${export_.filename}"`,
    });

    return new StreamableFile(Buffer.from(export_.data ?? '', 'utf-8'));
  }

  // ============== Data Rectification ==============

  @Post('rectification')
  @ApiOperation({ summary: 'Request data rectification' })
  @ApiResponse({ status: 201, description: 'Rectification request created' })
  async createRectificationRequest(
    @CurrentUser() user: { id: string },
    @Body() dto: CreateRectificationRequestDto,
  ) {
    return this.gdprService.createRectificationRequest(user.id, dto);
  }

  // ============== Audit Logs ==============

  @Get('audit-logs')
  @ApiOperation({ summary: 'Get your GDPR audit logs' })
  @ApiResponse({ status: 200, description: 'Returns your GDPR-related audit logs' })
  async getAuditLogs(@CurrentUser() user: { id: string }) {
    return this.gdprService.getAuditLogs(user.id);
  }
}

/**
 * GDPR Admin Controller
 *
 * Admin endpoints for managing GDPR requests
 */
@ApiTags('GDPR Admin')
@Controller('admin/gdpr')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
@ApiBearerAuth()
export class GdprAdminController {
  constructor(private readonly gdprService: GdprService) {}

  @Get('requests')
  @ApiOperation({ summary: 'Get all GDPR requests' })
  @ApiResponse({ status: 200, description: 'Returns paginated list of all GDPR requests' })
  async getAllRequests(@Query() query: GdprQueryDto) {
    return this.gdprService.getAllRequests(query);
  }

  @Get('requests/:id')
  @ApiOperation({ summary: 'Get a specific GDPR request (admin)' })
  @ApiResponse({ status: 200, description: 'Request details' })
  async getRequest(@Param('id', ParseUUIDPipe) id: string) {
    return this.gdprService.getRequest(id);
  }

  @Put('requests/:id/process')
  @ApiOperation({ summary: 'Process a GDPR request (approve/reject)' })
  @ApiResponse({ status: 200, description: 'Request processed successfully' })
  @ApiResponse({ status: 400, description: 'Invalid request or already processed' })
  async processRequest(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ProcessDataRequestDto,
    @CurrentUser() user: { id: string },
  ) {
    return this.gdprService.processRequest(id, dto, user.id);
  }

  @Get('statistics')
  @ApiOperation({ summary: 'Get GDPR statistics' })
  @ApiResponse({ status: 200, description: 'GDPR request statistics' })
  async getStatistics() {
    return this.gdprService.getStatistics();
  }

  @Get('audit-logs/:userId')
  @ApiOperation({ summary: 'Get GDPR audit logs for a user' })
  @ApiResponse({ status: 200, description: 'User GDPR audit logs' })
  async getUserAuditLogs(
    @Param('userId', ParseUUIDPipe) userId: string,
    @CurrentUser() admin: { id: string },
  ) {
    return this.gdprService.getAuditLogs(userId, admin.id);
  }
}
