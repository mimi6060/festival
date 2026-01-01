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
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { FestivalService } from './festival.service';
import { CreateFestivalDto } from './dto/create-festival.dto';
import { UpdateFestivalDto, UpdateFestivalStatusDto } from './dto/update-festival.dto';
import { FestivalQueryDto } from './dto/festival-query.dto';
import {
  FestivalResponseDto,
  FestivalStatsDto,
  PaginatedFestivalsDto,
} from './dto/festival-response.dto';
import { Roles } from '../auth/decorators/roles.decorator';
import { Public } from '../auth/decorators/public.decorator';
import { CurrentUser, AuthenticatedUser } from '../auth/decorators/current-user.decorator';

/**
 * Festival Controller
 *
 * Handles all festival-related HTTP endpoints.
 * Uses global guards (JwtAuthGuard, RolesGuard) configured in AppModule.
 */
@ApiTags('festivals')
@Controller('festivals')
export class FestivalController {
  constructor(private readonly festivalService: FestivalService) {}

  /**
   * Create a new festival
   * Only ADMIN and ORGANIZER roles can create festivals
   */
  @Post()
  @Roles(UserRole.ADMIN, UserRole.ORGANIZER)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Create a new festival',
    description: 'Creates a new festival. Only accessible by ADMIN and ORGANIZER roles.',
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Festival created successfully',
    type: FestivalResponseDto,
  })
  @ApiResponse({ status: HttpStatus.BAD_REQUEST, description: 'Invalid input data' })
  @ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'Unauthorized' })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Forbidden - requires ADMIN or ORGANIZER role' })
  @ApiResponse({ status: HttpStatus.CONFLICT, description: 'Festival with this slug already exists' })
  async create(
    @Body() createFestivalDto: CreateFestivalDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<FestivalResponseDto> {
    const festival = await this.festivalService.create(createFestivalDto, user.id);
    return this.festivalService.findOne(festival.id, user);
  }

  /**
   * Get all festivals with filters and pagination
   * Public endpoint - anyone can view published festivals
   */
  @Get()
  @Public()
  @ApiOperation({
    summary: 'List all festivals',
    description: 'Returns a paginated list of festivals. Public users see only published/ongoing festivals.',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'List of festivals',
    type: PaginatedFestivalsDto,
  })
  async findAll(
    @Query() query: FestivalQueryDto,
    @CurrentUser() user?: AuthenticatedUser,
  ): Promise<PaginatedFestivalsDto> {
    return this.festivalService.findAll(query, user);
  }

  /**
   * Get a festival by ID
   * Public endpoint - anyone can view published festivals
   */
  @Get(':id')
  @Public()
  @ApiOperation({
    summary: 'Get a festival by ID',
    description: 'Returns detailed information about a specific festival.',
  })
  @ApiParam({
    name: 'id',
    description: 'Festival UUID',
    type: String,
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Festival details',
    type: FestivalResponseDto,
  })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Festival not found' })
  async findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user?: AuthenticatedUser,
  ): Promise<FestivalResponseDto> {
    return this.festivalService.findOne(id, user);
  }

  /**
   * Get a festival by slug
   * Public endpoint - anyone can view published festivals
   */
  @Get('slug/:slug')
  @Public()
  @ApiOperation({
    summary: 'Get a festival by slug',
    description: 'Returns detailed information about a specific festival using its URL slug.',
  })
  @ApiParam({
    name: 'slug',
    description: 'Festival URL slug',
    example: 'rock-en-seine-2025',
    type: String,
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Festival details',
    type: FestivalResponseDto,
  })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Festival not found' })
  async findBySlug(
    @Param('slug') slug: string,
    @CurrentUser() user?: AuthenticatedUser,
  ): Promise<FestivalResponseDto> {
    return this.festivalService.findBySlug(slug, user);
  }

  /**
   * Update a festival
   * Only the owner or ADMIN can update a festival
   */
  @Patch(':id')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Update a festival',
    description: 'Updates a festival. Only accessible by the festival owner or ADMIN.',
  })
  @ApiParam({
    name: 'id',
    description: 'Festival UUID',
    type: String,
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Festival updated successfully',
    type: FestivalResponseDto,
  })
  @ApiResponse({ status: HttpStatus.BAD_REQUEST, description: 'Invalid input data' })
  @ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'Unauthorized' })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Forbidden - not the owner' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Festival not found' })
  @ApiResponse({ status: HttpStatus.CONFLICT, description: 'Slug already taken' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateFestivalDto: UpdateFestivalDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<FestivalResponseDto> {
    return this.festivalService.update(id, updateFestivalDto, user);
  }

  /**
   * Delete a festival (soft delete)
   * Only ADMIN can delete festivals
   */
  @Delete(':id')
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Delete a festival',
    description: 'Soft deletes a festival. Only accessible by ADMIN.',
  })
  @ApiParam({
    name: 'id',
    description: 'Festival UUID',
    type: String,
  })
  @ApiResponse({ status: HttpStatus.NO_CONTENT, description: 'Festival deleted successfully' })
  @ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'Unauthorized' })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Forbidden - requires ADMIN role' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Festival not found' })
  async remove(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<void> {
    return this.festivalService.remove(id, user);
  }

  /**
   * Update festival status
   * Only the owner or ADMIN can change status
   */
  @Patch(':id/status')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Update festival status',
    description: 'Changes the festival status. Validates allowed status transitions.',
  })
  @ApiParam({
    name: 'id',
    description: 'Festival UUID',
    type: String,
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Festival status updated successfully',
    type: FestivalResponseDto,
  })
  @ApiResponse({ status: HttpStatus.BAD_REQUEST, description: 'Invalid status transition' })
  @ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'Unauthorized' })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Forbidden - not the owner' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Festival not found' })
  async updateStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateStatusDto: UpdateFestivalStatusDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<FestivalResponseDto> {
    return this.festivalService.updateStatus(id, updateStatusDto, user);
  }

  /**
   * Publish a festival
   * Shortcut endpoint to change status from DRAFT to PUBLISHED
   */
  @Post(':id/publish')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Publish a festival',
    description: 'Publishes a festival (changes status from DRAFT to PUBLISHED). Only the owner or ADMIN can publish.',
  })
  @ApiParam({
    name: 'id',
    description: 'Festival UUID',
    type: String,
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Festival published successfully',
    type: FestivalResponseDto,
  })
  @ApiResponse({ status: HttpStatus.BAD_REQUEST, description: 'Festival is not in DRAFT status' })
  @ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'Unauthorized' })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Forbidden - not the owner' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Festival not found' })
  async publish(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<FestivalResponseDto> {
    return this.festivalService.publish(id, user);
  }

  /**
   * Get festival statistics
   * Only the owner or ADMIN can view statistics
   */
  @Get(':id/stats')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get festival statistics',
    description: 'Returns detailed statistics for a festival including ticket sales, revenue, etc. Only accessible by the owner or ADMIN.',
  })
  @ApiParam({
    name: 'id',
    description: 'Festival UUID',
    type: String,
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Festival statistics',
    type: FestivalStatsDto,
  })
  @ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'Unauthorized' })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Forbidden - not the owner' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Festival not found' })
  async getStats(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<FestivalStatsDto> {
    return this.festivalService.getStats(id, user);
  }
}
