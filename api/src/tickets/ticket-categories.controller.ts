import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { TicketCategoriesService } from './ticket-categories.service';
import { CreateCategoryDto, UpdateCategoryDto } from './dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '@prisma/client';

@Controller()
@UseGuards(JwtAuthGuard)
export class TicketCategoriesController {
  constructor(private readonly categoriesService: TicketCategoriesService) {}

  /**
   * Create a new ticket category for a festival
   * POST /festivals/:festivalId/ticket-categories
   */
  @Post('festivals/:festivalId/ticket-categories')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.ORGANIZER)
  async create(
    @Param('festivalId') festivalId: string,
    @Body() createCategoryDto: CreateCategoryDto,
  ) {
    const category = await this.categoriesService.create(
      festivalId,
      createCategoryDto,
    );

    return {
      success: true,
      message: 'Ticket category created successfully',
      data: category,
    };
  }

  /**
   * Get all ticket categories for a festival
   * GET /festivals/:festivalId/ticket-categories
   */
  @Get('festivals/:festivalId/ticket-categories')
  async findAll(
    @Param('festivalId') festivalId: string,
    @Query('includeInactive') includeInactive?: string,
  ) {
    const categories = await this.categoriesService.findAllByFestival(
      festivalId,
      includeInactive === 'true',
    );

    return {
      success: true,
      data: categories,
      count: categories.length,
    };
  }

  /**
   * Get a single ticket category
   * GET /ticket-categories/:id
   */
  @Get('ticket-categories/:id')
  async findOne(@Param('id') id: string) {
    const category = await this.categoriesService.findOne(id);

    return {
      success: true,
      data: category,
    };
  }

  /**
   * Get category availability info
   * GET /ticket-categories/:id/availability
   */
  @Get('ticket-categories/:id/availability')
  async getAvailability(@Param('id') id: string) {
    const availability = await this.categoriesService.getAvailability(id);

    return {
      success: true,
      data: availability,
    };
  }

  /**
   * Update a ticket category
   * PATCH /ticket-categories/:id
   */
  @Patch('ticket-categories/:id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.ORGANIZER)
  async update(
    @Param('id') id: string,
    @Body() updateCategoryDto: UpdateCategoryDto,
  ) {
    const category = await this.categoriesService.update(id, updateCategoryDto);

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
  @Delete('ticket-categories/:id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.ORGANIZER)
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id') id: string) {
    await this.categoriesService.remove(id);
  }
}
