import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { LostItemsService } from './lost-items.service';
import {
  CreateLostItemDto,
  UpdateLostItemDto,
  LostItemQueryDto,
  ClaimLostItemDto,
} from './dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Public } from '../auth/decorators/public.decorator';
import { CurrentUser, AuthenticatedUser } from '../auth/decorators/current-user.decorator';
import { UserRole } from '@prisma/client';

@Controller('support/lost-items')
export class LostItemsController {
  constructor(private readonly lostItemsService: LostItemsService) {}

  /**
   * Report a lost item
   * POST /support/lost-items
   */
  @Post()
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.CREATED)
  async reportLostItem(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateLostItemDto,
  ) {
    const item = await this.lostItemsService.reportLostItem(user.id, dto);

    return {
      success: true,
      message: 'Lost item reported successfully',
      data: item,
    };
  }

  /**
   * Get all lost items (PUBLIC - to help find items)
   * GET /support/lost-items
   */
  @Get()
  @Public()
  async getLostItems(@Query() query: LostItemQueryDto) {
    const result = await this.lostItemsService.findAll(query);

    return {
      success: true,
      data: result.items,
      pagination: {
        total: result.total,
        page: result.page,
        limit: result.limit,
        totalPages: Math.ceil(result.total / result.limit),
      },
    };
  }

  /**
   * Get my reported lost items
   * GET /support/lost-items/me
   */
  @Get('me')
  @UseGuards(JwtAuthGuard)
  async getMyLostItems(@CurrentUser() user: AuthenticatedUser) {
    const items = await this.lostItemsService.findByUser(user.id);

    return {
      success: true,
      data: items,
      count: items.length,
    };
  }

  /**
   * Get statistics for a festival (STAFF only)
   * GET /support/lost-items/stats/:festivalId
   */
  @Get('stats/:festivalId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.STAFF, UserRole.ORGANIZER)
  async getStats(@Param('festivalId') festivalId: string) {
    const stats = await this.lostItemsService.getStats(festivalId);

    return {
      success: true,
      data: stats,
    };
  }

  /**
   * Get a single lost item by ID
   * GET /support/lost-items/:id
   */
  @Get(':id')
  @Public()
  async getLostItem(@Param('id') id: string) {
    const item = await this.lostItemsService.findById(id);

    return {
      success: true,
      data: item,
    };
  }

  /**
   * Update a lost item
   * PUT /support/lost-items/:id
   */
  @Put(':id')
  @UseGuards(JwtAuthGuard)
  async updateLostItem(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpdateLostItemDto,
  ) {
    const item = await this.lostItemsService.updateLostItem(id, user, dto);

    return {
      success: true,
      message: 'Lost item updated successfully',
      data: item,
    };
  }

  /**
   * Mark an item as found (STAFF only)
   * POST /support/lost-items/:id/found
   */
  @Post(':id/found')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.STAFF, UserRole.SECURITY)
  @HttpCode(HttpStatus.OK)
  async markAsFound(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: { foundBy?: string },
  ) {
    const item = await this.lostItemsService.markAsFound(
      id,
      user,
      body.foundBy,
    );

    return {
      success: true,
      message: 'Item marked as found',
      data: item,
    };
  }

  /**
   * Process claim for a found item (STAFF only)
   * POST /support/lost-items/:id/claim
   */
  @Post(':id/claim')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.STAFF, UserRole.SECURITY)
  @HttpCode(HttpStatus.OK)
  async claimItem(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: ClaimLostItemDto,
  ) {
    const item = await this.lostItemsService.claimItem(id, user, dto);

    return {
      success: true,
      message: 'Item claimed and returned successfully',
      data: item,
    };
  }

  /**
   * Mark all unclaimed items for a festival (ADMIN/ORGANIZER only)
   * POST /support/lost-items/unclaimed/:festivalId
   */
  @Post('unclaimed/:festivalId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.ORGANIZER)
  @HttpCode(HttpStatus.OK)
  async markUnclaimed(
    @Param('festivalId') festivalId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const count = await this.lostItemsService.markUnclaimed(festivalId, user);

    return {
      success: true,
      message: `${count} items marked as unclaimed`,
      data: { count },
    };
  }

  /**
   * Delete a lost item report
   * DELETE /support/lost-items/:id
   */
  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteLostItem(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    await this.lostItemsService.deleteLostItem(id, user);
  }
}
