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
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { PoiType, UserRole } from '@prisma/client';
import { PoiService, type AuthenticatedUser } from './poi.service';
import { CreatePoiDto, UpdatePoiDto, PoiQueryDto } from './dto';
import { PoiEntity, PoiWithFestivalEntity, PoiCategoryCountEntity } from './entities';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Public } from '../auth/decorators/public.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

/**
 * Controller for festival-scoped POI endpoints
 * Handles creation and listing of POIs for a specific festival
 */
@ApiTags('poi')
@Controller('festivals/:festivalId/pois')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class FestivalPoiController {
  constructor(private readonly poiService: PoiService) {}

  /**
   * Create a new POI for a festival
   * POST /festivals/:festivalId/pois
   */
  @Post()
  @Roles(UserRole.ADMIN, UserRole.ORGANIZER)
  @ApiOperation({
    summary: 'Create a new POI',
    description:
      'Creates a new Point of Interest for a festival. Only accessible by ADMIN and ORGANIZER roles.',
  })
  @ApiParam({
    name: 'festivalId',
    description: 'Festival UUID',
    type: String,
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'POI created successfully',
    type: PoiEntity,
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
    @Body() createPoiDto: CreatePoiDto,
    @CurrentUser() user: AuthenticatedUser
  ) {
    const poi = await this.poiService.create(festivalId, createPoiDto, user);
    return {
      success: true,
      message: 'POI created successfully',
      data: poi,
    };
  }

  /**
   * Bulk create POIs for a festival
   * POST /festivals/:festivalId/pois/bulk
   */
  @Post('bulk')
  @Roles(UserRole.ADMIN, UserRole.ORGANIZER)
  @ApiOperation({
    summary: 'Bulk create POIs',
    description:
      'Creates multiple Points of Interest for a festival at once. Only accessible by ADMIN and ORGANIZER roles.',
  })
  @ApiParam({
    name: 'festivalId',
    description: 'Festival UUID',
    type: String,
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'POIs created successfully',
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
  async bulkCreate(
    @Param('festivalId', ParseUUIDPipe) festivalId: string,
    @Body() createPoiDtos: CreatePoiDto[],
    @CurrentUser() user: AuthenticatedUser
  ) {
    const result = await this.poiService.bulkCreate(festivalId, createPoiDtos, user);
    return {
      success: true,
      message: `${result.created} POIs created successfully`,
      data: result,
    };
  }

  /**
   * Get all POIs for a festival
   * GET /festivals/:festivalId/pois
   */
  @Get()
  @Public()
  @ApiOperation({
    summary: 'Get all POIs for a festival',
    description:
      'Returns a paginated list of POIs for the specified festival with optional filtering.',
  })
  @ApiParam({
    name: 'festivalId',
    description: 'Festival UUID',
    type: String,
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'List of POIs',
    type: [PoiEntity],
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Festival not found',
  })
  async findAll(
    @Param('festivalId', ParseUUIDPipe) festivalId: string,
    @Query() query: PoiQueryDto
  ) {
    const result = await this.poiService.findAllByFestival(festivalId, query);
    return {
      success: true,
      data: result.pois,
      pagination: {
        total: result.total,
        page: result.page,
        limit: result.limit,
        totalPages: Math.ceil(result.total / result.limit),
      },
    };
  }

  /**
   * Get POI category counts for a festival
   * GET /festivals/:festivalId/pois/categories
   */
  @Get('categories')
  @Public()
  @ApiOperation({
    summary: 'Get POI category counts',
    description: 'Returns the count of active POIs grouped by type for a festival.',
  })
  @ApiParam({
    name: 'festivalId',
    description: 'Festival UUID',
    type: String,
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'POI category counts',
    type: [PoiCategoryCountEntity],
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Festival not found',
  })
  async getCategoryCounts(@Param('festivalId', ParseUUIDPipe) festivalId: string) {
    const counts = await this.poiService.getCategoryCounts(festivalId);
    return {
      success: true,
      data: counts,
    };
  }

  /**
   * Get POIs by type for a festival
   * GET /festivals/:festivalId/pois/type/:type
   */
  @Get('type/:type')
  @Public()
  @ApiOperation({
    summary: 'Get POIs by type',
    description: 'Returns all active POIs of a specific type for a festival.',
  })
  @ApiParam({
    name: 'festivalId',
    description: 'Festival UUID',
    type: String,
  })
  @ApiParam({
    name: 'type',
    description: 'POI type',
    enum: PoiType,
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'List of POIs of the specified type',
    type: [PoiEntity],
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Festival not found',
  })
  async findByType(
    @Param('festivalId', ParseUUIDPipe) festivalId: string,
    @Param('type') type: PoiType
  ) {
    const pois = await this.poiService.findByType(festivalId, type);
    return {
      success: true,
      data: pois,
      count: pois.length,
    };
  }

  /**
   * Find POIs near a location
   * GET /festivals/:festivalId/pois/nearby
   */
  @Get('nearby')
  @Public()
  @ApiOperation({
    summary: 'Find POIs near a location',
    description: 'Returns POIs within a specified radius of a location, sorted by distance.',
  })
  @ApiParam({
    name: 'festivalId',
    description: 'Festival UUID',
    type: String,
  })
  @ApiQuery({
    name: 'latitude',
    description: 'Center latitude',
    type: Number,
    required: true,
  })
  @ApiQuery({
    name: 'longitude',
    description: 'Center longitude',
    type: Number,
    required: true,
  })
  @ApiQuery({
    name: 'radius',
    description: 'Search radius in meters (default: 1000)',
    type: Number,
    required: false,
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'List of nearby POIs with distance',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Festival not found',
  })
  async findNearby(
    @Param('festivalId', ParseUUIDPipe) festivalId: string,
    @Query('latitude') latitude: number,
    @Query('longitude') longitude: number,
    @Query('radius') radius?: number
  ) {
    const pois = await this.poiService.findNearby(
      festivalId,
      Number(latitude),
      Number(longitude),
      radius ? Number(radius) : undefined
    );
    return {
      success: true,
      data: pois,
      count: pois.length,
    };
  }
}

/**
 * Controller for POI-specific endpoints
 * Handles operations on individual POIs
 */
@ApiTags('poi')
@Controller('pois')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class PoiController {
  constructor(private readonly poiService: PoiService) {}

  /**
   * Get a POI by ID
   * GET /pois/:id
   */
  @Get(':id')
  @Public()
  @ApiOperation({
    summary: 'Get a POI by ID',
    description: 'Returns detailed information about a specific POI.',
  })
  @ApiParam({
    name: 'id',
    description: 'POI UUID',
    type: String,
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'POI details',
    type: PoiWithFestivalEntity,
  })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'POI not found' })
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    const poi = await this.poiService.findOne(id);
    return {
      success: true,
      data: poi,
    };
  }

  /**
   * Update a POI
   * PATCH /pois/:id
   */
  @Patch(':id')
  @Roles(UserRole.ADMIN, UserRole.ORGANIZER)
  @ApiOperation({
    summary: 'Update a POI',
    description: 'Updates a POI. Only accessible by the festival owner or ADMIN.',
  })
  @ApiParam({
    name: 'id',
    description: 'POI UUID',
    type: String,
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'POI updated successfully',
    type: PoiEntity,
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
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'POI not found' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updatePoiDto: UpdatePoiDto,
    @CurrentUser() user: AuthenticatedUser
  ) {
    const poi = await this.poiService.update(id, updatePoiDto, user);
    return {
      success: true,
      message: 'POI updated successfully',
      data: poi,
    };
  }

  /**
   * Delete a POI
   * DELETE /pois/:id
   */
  @Delete(':id')
  @Roles(UserRole.ADMIN, UserRole.ORGANIZER)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Delete a POI',
    description: 'Deletes a POI. Only accessible by the festival owner or ADMIN.',
  })
  @ApiParam({
    name: 'id',
    description: 'POI UUID',
    type: String,
  })
  @ApiResponse({
    status: HttpStatus.NO_CONTENT,
    description: 'POI deleted successfully',
  })
  @ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'Unauthorized' })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Forbidden - not the owner',
  })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'POI not found' })
  async remove(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser
  ): Promise<void> {
    await this.poiService.remove(id, user);
  }

  /**
   * Toggle POI active status
   * POST /pois/:id/toggle-active
   */
  @Post(':id/toggle-active')
  @Roles(UserRole.ADMIN, UserRole.ORGANIZER)
  @ApiOperation({
    summary: 'Toggle POI active status',
    description:
      'Toggles the active/inactive status of a POI. Only accessible by the festival owner or ADMIN.',
  })
  @ApiParam({
    name: 'id',
    description: 'POI UUID',
    type: String,
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'POI status toggled successfully',
    type: PoiEntity,
  })
  @ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'Unauthorized' })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Forbidden - not the owner',
  })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'POI not found' })
  async toggleActive(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser
  ) {
    const poi = await this.poiService.toggleActive(id, user);
    return {
      success: true,
      message: `POI is now ${poi.isActive ? 'active' : 'inactive'}`,
      data: poi,
    };
  }
}
