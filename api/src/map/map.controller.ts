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
  ParseEnumPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { UserRole, PoiType } from '@prisma/client';
import { MapService } from './map.service';
import {
  CreatePoiDto,
  UpdatePoiDto,
  NearbyQueryDto,
  MapConfigResponseDto,
  PoiResponseDto,
  NearbyPoiResponseDto,
} from './dto';
import { Roles } from '../auth/decorators/roles.decorator';
import { Public } from '../auth/decorators/public.decorator';
import { CurrentUser, AuthenticatedUser } from '../auth/decorators/current-user.decorator';

/**
 * Map Controller - Festival scoped endpoints
 *
 * Handles all map and POI-related HTTP endpoints for festivals.
 */
@ApiTags('map')
@Controller('festivals/:festivalId/map')
export class MapController {
  constructor(private readonly mapService: MapService) {}

  /**
   * Get all POIs for a festival
   * Public endpoint - anyone can view map POIs
   */
  @Get('pois')
  @Public()
  @ApiOperation({
    summary: 'Get all POIs for a festival',
    description: 'Returns all active Points of Interest for the specified festival.',
  })
  @ApiParam({
    name: 'festivalId',
    description: 'Festival UUID',
    type: String,
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'List of POIs',
    type: [PoiResponseDto],
  })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Festival not found' })
  async getAllPois(
    @Param('festivalId', ParseUUIDPipe) festivalId: string,
  ): Promise<{ success: boolean; data: PoiResponseDto[]; count: number }> {
    const pois = await this.mapService.getAllPois(festivalId);
    return {
      success: true,
      data: pois,
      count: pois.length,
    };
  }

  /**
   * Get POIs by type for a festival
   * Public endpoint
   */
  @Get('pois/type/:type')
  @Public()
  @ApiOperation({
    summary: 'Get POIs by type',
    description: 'Returns all active POIs of a specific type for the festival.',
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
    type: [PoiResponseDto],
  })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Festival not found' })
  @ApiResponse({ status: HttpStatus.BAD_REQUEST, description: 'Invalid POI type' })
  async getPoisByType(
    @Param('festivalId', ParseUUIDPipe) festivalId: string,
    @Param('type', new ParseEnumPipe(PoiType)) type: PoiType,
  ): Promise<{ success: boolean; data: PoiResponseDto[]; count: number }> {
    const pois = await this.mapService.getPoisByType(festivalId, type);
    return {
      success: true,
      data: pois,
      count: pois.length,
    };
  }

  /**
   * Find nearby POIs
   * Public endpoint
   */
  @Get('pois/nearby')
  @Public()
  @ApiOperation({
    summary: 'Find nearby POIs',
    description: 'Returns POIs within a specified radius of given coordinates.',
  })
  @ApiParam({
    name: 'festivalId',
    description: 'Festival UUID',
    type: String,
  })
  @ApiQuery({
    name: 'latitude',
    description: 'Latitude of the center point',
    type: Number,
    required: true,
  })
  @ApiQuery({
    name: 'longitude',
    description: 'Longitude of the center point',
    type: Number,
    required: true,
  })
  @ApiQuery({
    name: 'radius',
    description: 'Search radius in meters (default: 500, max: 5000)',
    type: Number,
    required: false,
  })
  @ApiQuery({
    name: 'type',
    description: 'Filter by POI type',
    enum: PoiType,
    required: false,
  })
  @ApiQuery({
    name: 'limit',
    description: 'Maximum number of results (default: 20, max: 100)',
    type: Number,
    required: false,
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'List of nearby POIs with distances',
    type: [NearbyPoiResponseDto],
  })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Festival not found' })
  async findNearby(
    @Param('festivalId', ParseUUIDPipe) festivalId: string,
    @Query() query: NearbyQueryDto,
  ): Promise<{ success: boolean; data: NearbyPoiResponseDto[]; count: number }> {
    const pois = await this.mapService.findNearby(festivalId, query);
    return {
      success: true,
      data: pois,
      count: pois.length,
    };
  }

  /**
   * Get map configuration for a festival
   * Public endpoint
   */
  @Get('config')
  @Public()
  @ApiOperation({
    summary: 'Get map configuration',
    description: 'Returns map configuration including bounds, zoom levels, and POI counts.',
  })
  @ApiParam({
    name: 'festivalId',
    description: 'Festival UUID',
    type: String,
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Map configuration',
    type: MapConfigResponseDto,
  })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Festival not found' })
  async getMapConfig(
    @Param('festivalId', ParseUUIDPipe) festivalId: string,
  ): Promise<{ success: boolean; data: MapConfigResponseDto }> {
    const config = await this.mapService.getMapConfig(festivalId);
    return {
      success: true,
      data: config,
    };
  }

  /**
   * Create a new POI
   * Only ORGANIZER of the festival or ADMIN can create POIs
   */
  @Post('pois')
  @Roles(UserRole.ADMIN, UserRole.ORGANIZER)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Create a new POI',
    description: 'Creates a new Point of Interest for the festival. Only accessible by the festival organizer or ADMIN.',
  })
  @ApiParam({
    name: 'festivalId',
    description: 'Festival UUID',
    type: String,
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'POI created successfully',
    type: PoiResponseDto,
  })
  @ApiResponse({ status: HttpStatus.BAD_REQUEST, description: 'Invalid input data' })
  @ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'Unauthorized' })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Forbidden - requires ORGANIZER or ADMIN role' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Festival not found' })
  async createPoi(
    @Param('festivalId', ParseUUIDPipe) festivalId: string,
    @Body() createPoiDto: CreatePoiDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<{ success: boolean; message: string; data: PoiResponseDto }> {
    const poi = await this.mapService.createPoi(festivalId, createPoiDto, user);
    return {
      success: true,
      message: 'POI created successfully',
      data: poi,
    };
  }
}

/**
 * POI Controller - Non-festival-scoped endpoints for POI management
 */
@ApiTags('map')
@Controller('map/pois')
export class PoiController {
  constructor(private readonly mapService: MapService) {}

  /**
   * Get a single POI by ID
   * Public endpoint
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
    type: PoiResponseDto,
  })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'POI not found' })
  async getPoiById(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<{ success: boolean; data: PoiResponseDto }> {
    const poi = await this.mapService.getPoiById(id);
    return {
      success: true,
      data: poi,
    };
  }

  /**
   * Update a POI
   * Only the festival organizer or ADMIN can update POIs
   */
  @Patch(':id')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Update a POI',
    description: 'Updates a POI. Only accessible by the festival organizer or ADMIN.',
  })
  @ApiParam({
    name: 'id',
    description: 'POI UUID',
    type: String,
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'POI updated successfully',
    type: PoiResponseDto,
  })
  @ApiResponse({ status: HttpStatus.BAD_REQUEST, description: 'Invalid input data' })
  @ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'Unauthorized' })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Forbidden - not the owner' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'POI not found' })
  async updatePoi(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updatePoiDto: UpdatePoiDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<{ success: boolean; message: string; data: PoiResponseDto }> {
    const poi = await this.mapService.updatePoi(id, updatePoiDto, user);
    return {
      success: true,
      message: 'POI updated successfully',
      data: poi,
    };
  }

  /**
   * Delete a POI
   * Only the festival organizer or ADMIN can delete POIs
   */
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Delete a POI',
    description: 'Deletes a POI. Only accessible by the festival organizer or ADMIN.',
  })
  @ApiParam({
    name: 'id',
    description: 'POI UUID',
    type: String,
  })
  @ApiResponse({ status: HttpStatus.NO_CONTENT, description: 'POI deleted successfully' })
  @ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'Unauthorized' })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Forbidden - not the owner' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'POI not found' })
  async deletePoi(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<void> {
    await this.mapService.deletePoi(id, user);
  }
}
