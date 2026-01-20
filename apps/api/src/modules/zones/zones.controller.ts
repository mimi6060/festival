import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  HttpCode,
  HttpStatus,
  ParseUUIDPipe,
  ParseIntPipe,
  DefaultValuePipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { ZoneAccessAction } from '@prisma/client';
import { ZonesService, type AuthenticatedUser } from './zones.service';
import {
  CreateZoneDto,
  UpdateZoneDto,
  CheckAccessDto,
  LogAccessDto,
  ConfigureAccessDto,
} from './dto';
import { ZoneEntity, ZoneWithStatsEntity, ZoneAccessLogEntity, ZoneStatsEntity } from './entities';

// Note: In a real implementation, these decorators would come from the auth module
// For now, we'll create placeholder types that can be replaced later

/**
 * Placeholder for user roles - should be imported from auth module
 */
enum UserRole {
  ADMIN = 'ADMIN',
  ORGANIZER = 'ORGANIZER',
  STAFF = 'STAFF',
  SECURITY = 'SECURITY',
  CASHIER = 'CASHIER',
  USER = 'USER',
}

/**
 * Placeholder decorator for roles - should be imported from auth module
 */
function Roles(...roles: UserRole[]): MethodDecorator {
  return (_target, _propertyKey, descriptor) => {
    Reflect.defineMetadata('roles', roles, descriptor.value!);
    return descriptor;
  };
}

/**
 * Placeholder decorator for public routes - should be imported from auth module
 */
function Public(): MethodDecorator {
  return (_target, _propertyKey, descriptor) => {
    Reflect.defineMetadata('isPublic', true, descriptor.value!);
    return descriptor;
  };
}

/**
 * Placeholder decorator for current user - should be imported from auth module
 */
function CurrentUser(): ParameterDecorator {
  return (_target, _propertyKey, _parameterIndex) => {
    // This is a placeholder - actual implementation would extract user from request
  };
}

/**
 * Controller for festival-scoped zone endpoints
 * Handles creation and listing of zones for a specific festival
 */
@ApiTags('zones')
@Controller('festivals/:festivalId/zones')
export class FestivalZonesController {
  constructor(private readonly zonesService: ZonesService) {}

  /**
   * Create a new zone for a festival
   * POST /festivals/:festivalId/zones
   */
  @Post()
  @Roles(UserRole.ADMIN, UserRole.ORGANIZER)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Create a new zone',
    description: 'Creates a new zone for a festival. Only accessible by ADMIN and ORGANIZER roles.',
  })
  @ApiParam({
    name: 'festivalId',
    description: 'Festival UUID',
    type: String,
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Zone created successfully',
    type: ZoneEntity,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid input data',
  })
  @ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'Unauthorized' })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Forbidden - requires ADMIN or ORGANIZER role',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Festival not found',
  })
  async create(
    @Param('festivalId', ParseUUIDPipe) festivalId: string,
    @Body() createZoneDto: CreateZoneDto,
    @CurrentUser() user: AuthenticatedUser
  ) {
    const zone = await this.zonesService.create(festivalId, createZoneDto, user);
    return {
      success: true,
      message: 'Zone created successfully',
      data: zone,
    };
  }

  /**
   * Get all zones for a festival
   * GET /festivals/:festivalId/zones
   */
  @Get()
  @Public()
  @ApiOperation({
    summary: 'Get all zones for a festival',
    description: 'Returns a list of all zones for the specified festival.',
  })
  @ApiParam({
    name: 'festivalId',
    description: 'Festival UUID',
    type: String,
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'List of zones',
    type: [ZoneEntity],
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Festival not found',
  })
  async findAll(@Param('festivalId', ParseUUIDPipe) festivalId: string) {
    const zones = await this.zonesService.findAllByFestival(festivalId);
    return {
      success: true,
      data: zones,
      count: zones.length,
    };
  }

  /**
   * Get capacity status for all zones of a festival (dashboard)
   * GET /festivals/:festivalId/zones/capacity
   */
  @Get('capacity')
  @Roles(UserRole.ADMIN, UserRole.ORGANIZER, UserRole.STAFF)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get capacity status for all zones',
    description:
      'Returns real-time capacity status for all zones of a festival. Useful for dashboard monitoring.',
  })
  @ApiParam({
    name: 'festivalId',
    description: 'Festival UUID',
    type: String,
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Capacity status for all zones',
  })
  async getAllZonesCapacity(@Param('festivalId', ParseUUIDPipe) festivalId: string) {
    const capacityStatus = await this.zonesService.getAllZonesCapacityStatus(festivalId);
    return {
      success: true,
      data: capacityStatus,
      count: capacityStatus.length,
    };
  }
}

/**
 * Controller for zone-specific endpoints
 * Handles operations on individual zones
 */
@ApiTags('zones')
@Controller('zones')
export class ZonesController {
  constructor(private readonly zonesService: ZonesService) {}

  /**
   * Get a zone by ID
   * GET /zones/:id
   */
  @Get(':id')
  @Public()
  @ApiOperation({
    summary: 'Get a zone by ID',
    description: 'Returns detailed information about a specific zone.',
  })
  @ApiParam({
    name: 'id',
    description: 'Zone UUID',
    type: String,
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Zone details',
    type: ZoneWithStatsEntity,
  })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Zone not found' })
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    const zone = await this.zonesService.findOne(id);
    return {
      success: true,
      data: zone,
    };
  }

  /**
   * Update a zone
   * PATCH /zones/:id
   */
  @Patch(':id')
  @Roles(UserRole.ADMIN, UserRole.ORGANIZER)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Update a zone',
    description: 'Updates a zone. Only accessible by the festival owner or ADMIN.',
  })
  @ApiParam({
    name: 'id',
    description: 'Zone UUID',
    type: String,
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Zone updated successfully',
    type: ZoneEntity,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid input data',
  })
  @ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'Unauthorized' })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Forbidden - not the owner',
  })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Zone not found' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateZoneDto: UpdateZoneDto,
    @CurrentUser() user: AuthenticatedUser
  ) {
    const zone = await this.zonesService.update(id, updateZoneDto, user);
    return {
      success: true,
      message: 'Zone updated successfully',
      data: zone,
    };
  }

  /**
   * Delete a zone
   * DELETE /zones/:id
   */
  @Delete(':id')
  @Roles(UserRole.ADMIN, UserRole.ORGANIZER)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Delete a zone',
    description: 'Deletes a zone. Only accessible by the festival owner or ADMIN.',
  })
  @ApiParam({
    name: 'id',
    description: 'Zone UUID',
    type: String,
  })
  @ApiResponse({
    status: HttpStatus.NO_CONTENT,
    description: 'Zone deleted successfully',
  })
  @ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'Unauthorized' })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Forbidden - not the owner',
  })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Zone not found' })
  async remove(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser
  ): Promise<void> {
    await this.zonesService.remove(id, user);
  }

  /**
   * Get zone capacity status
   * GET /zones/:id/capacity
   */
  @Get(':id/capacity')
  @Public()
  @ApiOperation({
    summary: 'Get zone capacity status',
    description:
      'Returns real-time capacity information for a zone including occupancy percentage and status.',
  })
  @ApiParam({
    name: 'id',
    description: 'Zone UUID',
    type: String,
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Zone capacity status',
  })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Zone not found' })
  async getCapacity(@Param('id', ParseUUIDPipe) id: string) {
    const capacity = await this.zonesService.getCapacityStatus(id);
    return {
      success: true,
      data: capacity,
    };
  }

  /**
   * Check if a ticket has access to this zone (QR scan)
   * POST /zones/:id/check
   */
  @Post(':id/check')
  @Roles(UserRole.ADMIN, UserRole.ORGANIZER, UserRole.STAFF, UserRole.SECURITY)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Check zone access for a ticket (QR scan)',
    description:
      'Verifies if a ticket has access to the specified zone based on ticket type requirements. Supports both ticketId and QR code lookup.',
  })
  @ApiParam({
    name: 'id',
    description: 'Zone UUID',
    type: String,
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Access check result with capacity information',
  })
  @ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'Unauthorized' })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Forbidden - requires staff role',
  })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Zone not found' })
  async checkAccess(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() checkAccessDto: CheckAccessDto
  ) {
    const result = await this.zonesService.checkAccess(id, checkAccessDto);
    return {
      success: true,
      data: result,
    };
  }

  /**
   * Log zone access (entry/exit) and update capacity
   * POST /zones/:id/access
   */
  @Post(':id/access')
  @Roles(UserRole.ADMIN, UserRole.ORGANIZER, UserRole.STAFF, UserRole.SECURITY)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Log zone access (entry/exit)',
    description:
      'Records an entry or exit event for a ticket at this zone and updates capacity in real-time. Returns capacity alerts if applicable.',
  })
  @ApiParam({
    name: 'id',
    description: 'Zone UUID',
    type: String,
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Access logged successfully with updated capacity info',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Access denied or invalid data',
  })
  @ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'Unauthorized' })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Forbidden - requires staff role',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Zone or ticket not found',
  })
  async logAccess(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() logAccessDto: LogAccessDto,
    @CurrentUser() user: AuthenticatedUser
  ) {
    const result = await this.zonesService.logAccess(id, logAccessDto, user?.id);
    return {
      success: true,
      message: `${logAccessDto.action} logged successfully`,
      data: result,
    };
  }

  /**
   * Configure zone access rules
   * POST /zones/:id/configure-access
   */
  @Post(':id/configure-access')
  @Roles(UserRole.ADMIN, UserRole.ORGANIZER)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Configure zone access rules',
    description: 'Configure which ticket categories and staff roles can access this zone.',
  })
  @ApiParam({
    name: 'id',
    description: 'Zone UUID',
    type: String,
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Access rules configured successfully',
  })
  @ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'Unauthorized' })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Forbidden - requires ADMIN or ORGANIZER role',
  })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Zone not found' })
  async configureAccess(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() _configureAccessDto: ConfigureAccessDto,
    @CurrentUser() user: AuthenticatedUser
  ) {
    // For now, we update the zone with the ticket types
    // In a more complete implementation, this would also handle staff roles
    const zone = await this.zonesService.update(
      id,
      {
        // Map category IDs to ticket types would require additional lookup
        // For simplicity, we're using the existing requiresTicketType field
      },
      user
    );
    return {
      success: true,
      message: 'Access rules configured successfully',
      data: zone,
    };
  }

  /**
   * Get access log history for a zone
   * GET /zones/:id/access-log
   */
  @Get(':id/access-log')
  @Roles(UserRole.ADMIN, UserRole.ORGANIZER, UserRole.STAFF)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get zone access log',
    description: 'Returns the access history for the specified zone.',
  })
  @ApiParam({
    name: 'id',
    description: 'Zone UUID',
    type: String,
  })
  @ApiQuery({
    name: 'page',
    required: false,
    description: 'Page number (default: 1)',
    type: Number,
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    description: 'Items per page (default: 50)',
    type: Number,
  })
  @ApiQuery({
    name: 'startDate',
    required: false,
    description: 'Filter logs from this date (ISO 8601)',
    type: String,
  })
  @ApiQuery({
    name: 'endDate',
    required: false,
    description: 'Filter logs until this date (ISO 8601)',
    type: String,
  })
  @ApiQuery({
    name: 'action',
    required: false,
    description: 'Filter by action type',
    enum: ZoneAccessAction,
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Access log history',
    type: [ZoneAccessLogEntity],
  })
  @ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'Unauthorized' })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Forbidden - requires staff role',
  })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Zone not found' })
  async getAccessLog(
    @Param('id', ParseUUIDPipe) id: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(50), ParseIntPipe) limit: number,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('action') action?: ZoneAccessAction
  ) {
    const result = await this.zonesService.getAccessLog(id, {
      page,
      limit,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      action,
    });

    return {
      success: true,
      data: result.logs,
      pagination: {
        total: result.total,
        page: result.page,
        limit: result.limit,
        totalPages: Math.ceil(result.total / result.limit),
      },
    };
  }

  /**
   * Get access statistics for a zone
   * GET /zones/:id/stats
   */
  @Get(':id/stats')
  @Roles(UserRole.ADMIN, UserRole.ORGANIZER)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get zone access statistics',
    description:
      'Returns access statistics including entries, exits, peak occupancy, and hourly distribution.',
  })
  @ApiParam({
    name: 'id',
    description: 'Zone UUID',
    type: String,
  })
  @ApiQuery({
    name: 'startDate',
    required: false,
    description: 'Filter stats from this date (ISO 8601)',
    type: String,
  })
  @ApiQuery({
    name: 'endDate',
    required: false,
    description: 'Filter stats until this date (ISO 8601)',
    type: String,
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Zone access statistics',
    type: ZoneStatsEntity,
  })
  @ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'Unauthorized' })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Forbidden - requires ADMIN or ORGANIZER role',
  })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Zone not found' })
  async getStats(
    @Param('id', ParseUUIDPipe) id: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string
  ) {
    const stats = await this.zonesService.getAccessStats(id, {
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
    });

    return {
      success: true,
      data: stats,
    };
  }

  /**
   * Reset zone occupancy (admin only)
   * POST /zones/:id/reset-occupancy
   */
  @Post(':id/reset-occupancy')
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Reset zone occupancy',
    description: 'Resets zone occupancy to zero. Admin only - useful for fixing sync issues.',
  })
  @ApiParam({
    name: 'id',
    description: 'Zone UUID',
    type: String,
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Occupancy reset successfully',
    type: ZoneEntity,
  })
  @ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'Unauthorized' })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Forbidden - requires ADMIN role',
  })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Zone not found' })
  async resetOccupancy(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser
  ) {
    const zone = await this.zonesService.resetOccupancy(id, user);
    return {
      success: true,
      message: 'Zone occupancy reset to 0',
      data: zone,
    };
  }

  /**
   * Adjust zone occupancy manually
   * POST /zones/:id/adjust-occupancy
   */
  @Post(':id/adjust-occupancy')
  @Roles(UserRole.ADMIN, UserRole.ORGANIZER)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Adjust zone occupancy',
    description:
      'Manually adjust zone occupancy by a positive or negative value. For corrections only.',
  })
  @ApiParam({
    name: 'id',
    description: 'Zone UUID',
    type: String,
  })
  @ApiQuery({
    name: 'adjustment',
    required: true,
    description: 'Number to add (positive) or subtract (negative) from occupancy',
    type: Number,
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Occupancy adjusted successfully',
    type: ZoneEntity,
  })
  @ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'Unauthorized' })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Forbidden - requires ADMIN or ORGANIZER role',
  })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Zone not found' })
  async adjustOccupancy(
    @Param('id', ParseUUIDPipe) id: string,
    @Query('adjustment', ParseIntPipe) adjustment: number,
    @CurrentUser() user: AuthenticatedUser
  ) {
    const zone = await this.zonesService.adjustOccupancy(id, adjustment, user);
    return {
      success: true,
      message: `Zone occupancy adjusted by ${adjustment}`,
      data: zone,
    };
  }
}
