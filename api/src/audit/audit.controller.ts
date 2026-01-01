import {
  Controller,
  Get,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { AuditService } from './audit.service';
import { AuditQueryDto } from './dto';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '@prisma/client';

@ApiTags('Audit')
@ApiBearerAuth('JWT-auth')
@Controller('audit')
@Roles(UserRole.ADMIN) // Only admins can access audit logs
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @Get('logs')
  @ApiOperation({
    summary: 'Get audit logs',
    description: 'Retrieve audit logs with optional filters. Admin only.',
  })
  @ApiResponse({
    status: 200,
    description: 'Returns paginated audit logs',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Admin access required',
  })
  async getAuditLogs(@Query() query: AuditQueryDto) {
    const filters = {
      userId: query.userId,
      action: query.action,
      entityType: query.entityType,
      entityId: query.entityId,
      startDate: query.startDate ? new Date(query.startDate) : undefined,
      endDate: query.endDate ? new Date(query.endDate) : undefined,
    };

    const pagination = {
      limit: query.limit,
      offset: query.offset,
    };

    return this.auditService.getAuditLogs(filters, pagination);
  }

  @Get('users/:id/activity')
  @ApiOperation({
    summary: 'Get user activity',
    description: 'Retrieve all audit logs for a specific user. Admin only.',
  })
  @ApiResponse({
    status: 200,
    description: 'Returns paginated user activity logs',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Admin access required',
  })
  async getUserActivity(
    @Param('id') userId: string,
    @Query() query: AuditQueryDto,
  ) {
    const pagination = {
      limit: query.limit,
      offset: query.offset,
    };

    return this.auditService.getUserActivity(userId, pagination);
  }

  @Get('entities/:type/:id/history')
  @ApiOperation({
    summary: 'Get entity history',
    description: 'Retrieve audit trail for a specific entity. Admin only.',
  })
  @ApiResponse({
    status: 200,
    description: 'Returns paginated entity history',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Admin access required',
  })
  async getEntityHistory(
    @Param('type') entityType: string,
    @Param('id') entityId: string,
    @Query() query: AuditQueryDto,
  ) {
    const pagination = {
      limit: query.limit,
      offset: query.offset,
    };

    return this.auditService.getEntityHistory(entityType, entityId, pagination);
  }
}
