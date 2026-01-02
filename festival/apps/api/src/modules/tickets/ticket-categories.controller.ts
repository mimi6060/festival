/**
 * Ticket Categories Controller
 *
 * Handles HTTP requests for ticket category management:
 * - Festival-scoped endpoints for listing and creating categories
 * - Individual category endpoints for CRUD operations
 */

import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
  ParseUUIDPipe,
  ParseBoolPipe,
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
import { UserRole } from '@prisma/client';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Public } from '../auth/decorators/public.decorator';
import { TicketCategoriesService } from './ticket-categories.service';
import { CreateTicketCategoryDto, UpdateTicketCategoryDto } from './dto';

// ============================================================================
// Festival-scoped Controller
// ============================================================================

/**
 * Controller for festival-scoped ticket category endpoints
 * Base path: /festivals/:festivalId/ticket-categories
 */
@ApiTags('Ticket Categories')
@Controller('festivals/:festivalId/ticket-categories')
export class FestivalTicketCategoriesController {
  constructor(
    private readonly ticketCategoriesService: TicketCategoriesService,
  ) {}

  /**
   * Get all ticket categories for a festival
   * GET /festivals/:festivalId/ticket-categories
   */
  @Get()
  @Public()
  @ApiOperation({
    summary: 'Get all ticket categories for a festival',
    description: 'Returns a list of all ticket categories for the specified festival. By default, only active categories are returned.',
  })
  @ApiParam({
    name: 'festivalId',
    description: 'Festival UUID',
    type: String,
  })
  @ApiQuery({
    name: 'includeInactive',
    required: false,
    description: 'Include inactive categories (admin only)',
    type: Boolean,
  })
  @ApiQuery({
    name: 'onlyAvailable',
    required: false,
    description: 'Only return categories currently available for purchase',
    type: Boolean,
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'List of ticket categories',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Festival not found',
  })
  async findAllByFestival(
    @Param('festivalId', ParseUUIDPipe) festivalId: string,
    @Query('includeInactive', new DefaultValuePipe(false), ParseBoolPipe)
    includeInactive: boolean,
    @Query('onlyAvailable', new DefaultValuePipe(false), ParseBoolPipe)
    onlyAvailable: boolean,
  ) {
    const categories = await this.ticketCategoriesService.findAllByFestival(
      festivalId,
      { includeInactive, onlyAvailable },
    );

    return {
      success: true,
      data: categories,
      count: categories.length,
    };
  }

  /**
   * Create a new ticket category for a festival
   * POST /festivals/:festivalId/ticket-categories
   */
  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.ORGANIZER)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Create a new ticket category',
    description: 'Creates a new ticket category for the specified festival. Requires ADMIN or ORGANIZER role.',
  })
  @ApiParam({
    name: 'festivalId',
    description: 'Festival UUID',
    type: String,
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Ticket category created successfully',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid input data',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Unauthorized',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Forbidden - requires ADMIN or ORGANIZER role',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Festival not found',
  })
  @ApiResponse({
    status: HttpStatus.CONFLICT,
    description: 'Category with this name already exists',
  })
  async create(
    @Param('festivalId', ParseUUIDPipe) festivalId: string,
    @Body() createDto: CreateTicketCategoryDto,
  ) {
    const category = await this.ticketCategoriesService.create(
      festivalId,
      createDto,
    );

    return {
      success: true,
      message: 'Ticket category created successfully',
      data: category,
    };
  }
}

// ============================================================================
// Individual Category Controller
// ============================================================================

/**
 * Controller for individual ticket category endpoints
 * Base path: /ticket-categories
 */
@ApiTags('Ticket Categories')
@Controller('ticket-categories')
export class TicketCategoriesController {
  constructor(
    private readonly ticketCategoriesService: TicketCategoriesService,
  ) {}

  /**
   * Get a ticket category by ID
   * GET /ticket-categories/:id
   */
  @Get(':id')
  @Public()
  @ApiOperation({
    summary: 'Get a ticket category by ID',
    description: 'Returns detailed information about a specific ticket category.',
  })
  @ApiParam({
    name: 'id',
    description: 'Ticket category UUID',
    type: String,
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Ticket category details',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Ticket category not found',
  })
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    const category = await this.ticketCategoriesService.findOne(id);

    return {
      success: true,
      data: category,
    };
  }

  /**
   * Update a ticket category
   * PUT /ticket-categories/:id
   */
  @Put(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.ORGANIZER)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Update a ticket category',
    description: 'Updates a ticket category. Requires ADMIN or ORGANIZER role.',
  })
  @ApiParam({
    name: 'id',
    description: 'Ticket category UUID',
    type: String,
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Ticket category updated successfully',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid input data',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Unauthorized',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Forbidden - requires ADMIN or ORGANIZER role',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Ticket category not found',
  })
  @ApiResponse({
    status: HttpStatus.CONFLICT,
    description: 'Category with this name already exists',
  })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateDto: UpdateTicketCategoryDto,
  ) {
    const category = await this.ticketCategoriesService.update(id, updateDto);

    return {
      success: true,
      message: 'Ticket category updated successfully',
      data: category,
    };
  }

  /**
   * Delete a ticket category
   * DELETE /ticket-categories/:id
   */
  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.ORGANIZER)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Delete a ticket category',
    description: 'Deletes a ticket category. Only categories with no sold tickets can be deleted. Requires ADMIN or ORGANIZER role.',
  })
  @ApiParam({
    name: 'id',
    description: 'Ticket category UUID',
    type: String,
  })
  @ApiResponse({
    status: HttpStatus.NO_CONTENT,
    description: 'Ticket category deleted successfully',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Unauthorized',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Forbidden - requires ADMIN or ORGANIZER role',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Ticket category not found',
  })
  @ApiResponse({
    status: HttpStatus.CONFLICT,
    description: 'Cannot delete category with existing tickets',
  })
  async delete(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    await this.ticketCategoriesService.delete(id);
  }

  /**
   * Activate or deactivate a ticket category
   * PATCH /ticket-categories/:id/activate
   */
  @Patch(':id/activate')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.ORGANIZER)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Toggle ticket category active status',
    description: 'Activates or deactivates a ticket category. Inactive categories are not visible to users. Requires ADMIN or ORGANIZER role.',
  })
  @ApiParam({
    name: 'id',
    description: 'Ticket category UUID',
    type: String,
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Ticket category status toggled successfully',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Unauthorized',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Forbidden - requires ADMIN or ORGANIZER role',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Ticket category not found',
  })
  async toggleActive(@Param('id', ParseUUIDPipe) id: string) {
    const category = await this.ticketCategoriesService.toggleActive(id);

    return {
      success: true,
      message: `Ticket category ${category.isActive ? 'activated' : 'deactivated'} successfully`,
      data: category,
    };
  }
}
