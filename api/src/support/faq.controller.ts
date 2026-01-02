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
import { FaqService } from './faq.service';
import {
  CreateFaqCategoryDto,
  UpdateFaqCategoryDto,
  CreateFaqItemDto,
  UpdateFaqItemDto,
} from './dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Public } from '../auth/decorators/public.decorator';
import { UserRole } from '@prisma/client';

@Controller('faq')
export class FaqController {
  constructor(private readonly faqService: FaqService) {}

  // ============= Public Endpoints =============

  /**
   * Get all FAQ categories with items (PUBLIC)
   * GET /faq
   */
  @Get()
  @Public()
  async getAllFaqs() {
    const categories = await this.faqService.findAllCategories();

    return {
      success: true,
      data: categories,
    };
  }

  /**
   * Search FAQ items (PUBLIC)
   * GET /faq/search?q=query
   */
  @Get('search')
  @Public()
  async searchFaqs(@Query('q') query: string) {
    if (!query || query.length < 2) {
      return {
        success: true,
        data: [],
        message: 'Query must be at least 2 characters',
      };
    }

    const items = await this.faqService.searchItems(query);

    return {
      success: true,
      data: items,
      count: items.length,
    };
  }

  /**
   * Get FAQ items by category (PUBLIC)
   * GET /faq/category/:categoryId
   */
  @Get('category/:categoryId')
  @Public()
  async getFaqsByCategory(@Param('categoryId') categoryId: string) {
    const category = await this.faqService.findCategoryById(categoryId);

    return {
      success: true,
      data: category,
    };
  }

  /**
   * Get single FAQ item (PUBLIC)
   * GET /faq/item/:id
   */
  @Get('item/:id')
  @Public()
  async getFaqItem(@Param('id') id: string) {
    const item = await this.faqService.findItemById(id);

    return {
      success: true,
      data: item,
    };
  }

  // ============= Admin Endpoints - Categories =============

  /**
   * Create FAQ category (ADMIN only)
   * POST /faq/categories
   */
  @Post('categories')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.CREATED)
  async createCategory(@Body() dto: CreateFaqCategoryDto) {
    const category = await this.faqService.createCategory(dto);

    return {
      success: true,
      message: 'FAQ category created successfully',
      data: category,
    };
  }

  /**
   * Update FAQ category (ADMIN only)
   * PUT /faq/categories/:id
   */
  @Put('categories/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async updateCategory(
    @Param('id') id: string,
    @Body() dto: UpdateFaqCategoryDto,
  ) {
    const category = await this.faqService.updateCategory(id, dto);

    return {
      success: true,
      message: 'FAQ category updated successfully',
      data: category,
    };
  }

  /**
   * Delete FAQ category (ADMIN only)
   * DELETE /faq/categories/:id
   */
  @Delete('categories/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteCategory(@Param('id') id: string) {
    await this.faqService.deleteCategory(id);
  }

  /**
   * Reorder FAQ categories (ADMIN only)
   * POST /faq/categories/reorder
   */
  @Post('categories/reorder')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async reorderCategories(@Body() body: { categoryIds: string[] }) {
    const categories = await this.faqService.reorderCategories(body.categoryIds);

    return {
      success: true,
      message: 'Categories reordered successfully',
      data: categories,
    };
  }

  // ============= Admin Endpoints - Items =============

  /**
   * Create FAQ item (ADMIN only)
   * POST /faq/items
   */
  @Post('items')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.CREATED)
  async createItem(@Body() dto: CreateFaqItemDto) {
    const item = await this.faqService.createItem(dto);

    return {
      success: true,
      message: 'FAQ item created successfully',
      data: item,
    };
  }

  /**
   * Update FAQ item (ADMIN only)
   * PUT /faq/items/:id
   */
  @Put('items/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async updateItem(@Param('id') id: string, @Body() dto: UpdateFaqItemDto) {
    const item = await this.faqService.updateItem(id, dto);

    return {
      success: true,
      message: 'FAQ item updated successfully',
      data: item,
    };
  }

  /**
   * Delete FAQ item (ADMIN only)
   * DELETE /faq/items/:id
   */
  @Delete('items/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteItem(@Param('id') id: string) {
    await this.faqService.deleteItem(id);
  }

  /**
   * Reorder FAQ items within a category (ADMIN only)
   * POST /faq/categories/:categoryId/items/reorder
   */
  @Post('categories/:categoryId/items/reorder')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async reorderItems(
    @Param('categoryId') categoryId: string,
    @Body() body: { itemIds: string[] },
  ) {
    const items = await this.faqService.reorderItems(categoryId, body.itemIds);

    return {
      success: true,
      message: 'Items reordered successfully',
      data: items,
    };
  }
}
