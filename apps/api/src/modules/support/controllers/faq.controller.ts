import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { FaqService } from '../services/faq.service';
import {
  CreateFaqCategoryDto,
  UpdateFaqCategoryDto,
  CreateFaqItemDto,
  UpdateFaqItemDto,
  FaqQueryDto,
  FaqCategoryResponseDto,
  FaqItemResponseDto,
} from '../dto/faq.dto';
import { Public } from '../../auth/decorators/public.decorator';
import { Roles } from '../../auth/decorators/roles.decorator';
import { UserRole } from '@prisma/client';

@ApiTags('FAQ')
@Controller()
export class FaqController {
  constructor(private readonly faqService: FaqService) {}

  // ===== Public Endpoints =====

  @Public()
  @Get('faq')
  @ApiOperation({ summary: 'Get public FAQ with all categories and items' })
  @ApiResponse({
    status: 200,
    description: 'FAQ retrieved successfully',
    type: [FaqCategoryResponseDto],
  })
  async getPublicFaq(): Promise<FaqCategoryResponseDto[]> {
    return this.faqService.getPublicFaq();
  }

  @Public()
  @Get('faq/search')
  @ApiOperation({ summary: 'Search FAQ items' })
  @ApiQuery({ name: 'q', description: 'Search term' })
  @ApiResponse({
    status: 200,
    description: 'Search results',
    type: [FaqItemResponseDto],
  })
  async searchFaq(@Query('q') searchTerm: string): Promise<FaqItemResponseDto[]> {
    return this.faqService.searchFaq(searchTerm);
  }

  // ===== Admin Category Endpoints =====

  @ApiBearerAuth()
  @Roles(UserRole.ADMIN, UserRole.ORGANIZER)
  @Post('admin/faq/categories')
  @ApiOperation({ summary: 'Create a new FAQ category' })
  @ApiResponse({
    status: 201,
    description: 'Category created successfully',
    type: FaqCategoryResponseDto,
  })
  async createCategory(
    @Body() dto: CreateFaqCategoryDto,
  ): Promise<FaqCategoryResponseDto> {
    return this.faqService.createCategory(dto);
  }

  @ApiBearerAuth()
  @Roles(UserRole.ADMIN, UserRole.ORGANIZER)
  @Get('admin/faq/categories')
  @ApiOperation({ summary: 'Get all FAQ categories' })
  @ApiQuery({
    name: 'includeItems',
    required: false,
    type: Boolean,
    description: 'Include items in response',
  })
  @ApiResponse({
    status: 200,
    description: 'Categories retrieved successfully',
    type: [FaqCategoryResponseDto],
  })
  async getAllCategories(
    @Query('includeItems') includeItems?: boolean,
  ): Promise<FaqCategoryResponseDto[]> {
    return this.faqService.findAllCategories(includeItems);
  }

  @ApiBearerAuth()
  @Roles(UserRole.ADMIN, UserRole.ORGANIZER)
  @Get('admin/faq/categories/:id')
  @ApiOperation({ summary: 'Get a FAQ category by ID' })
  @ApiParam({ name: 'id', description: 'Category ID' })
  @ApiResponse({
    status: 200,
    description: 'Category retrieved successfully',
    type: FaqCategoryResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Category not found' })
  async getCategoryById(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<FaqCategoryResponseDto> {
    return this.faqService.findCategoryById(id);
  }

  @ApiBearerAuth()
  @Roles(UserRole.ADMIN, UserRole.ORGANIZER)
  @Put('admin/faq/categories/:id')
  @ApiOperation({ summary: 'Update a FAQ category' })
  @ApiParam({ name: 'id', description: 'Category ID' })
  @ApiResponse({
    status: 200,
    description: 'Category updated successfully',
    type: FaqCategoryResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Category not found' })
  async updateCategory(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateFaqCategoryDto,
  ): Promise<FaqCategoryResponseDto> {
    return this.faqService.updateCategory(id, dto);
  }

  @ApiBearerAuth()
  @Roles(UserRole.ADMIN, UserRole.ORGANIZER)
  @Delete('admin/faq/categories/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a FAQ category' })
  @ApiParam({ name: 'id', description: 'Category ID' })
  @ApiResponse({ status: 204, description: 'Category deleted successfully' })
  @ApiResponse({ status: 400, description: 'Category has items' })
  @ApiResponse({ status: 404, description: 'Category not found' })
  async deleteCategory(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    return this.faqService.deleteCategory(id);
  }

  @ApiBearerAuth()
  @Roles(UserRole.ADMIN, UserRole.ORGANIZER)
  @Patch('admin/faq/categories/reorder')
  @ApiOperation({ summary: 'Reorder FAQ categories' })
  @ApiResponse({
    status: 200,
    description: 'Categories reordered successfully',
    type: [FaqCategoryResponseDto],
  })
  async reorderCategories(
    @Body() body: { categoryIds: string[] },
  ): Promise<FaqCategoryResponseDto[]> {
    return this.faqService.reorderCategories(body.categoryIds);
  }

  // ===== Admin Item Endpoints =====

  @ApiBearerAuth()
  @Roles(UserRole.ADMIN, UserRole.ORGANIZER)
  @Post('admin/faq/items')
  @ApiOperation({ summary: 'Create a new FAQ item' })
  @ApiResponse({
    status: 201,
    description: 'Item created successfully',
    type: FaqItemResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Category not found' })
  async createItem(@Body() dto: CreateFaqItemDto): Promise<FaqItemResponseDto> {
    return this.faqService.createItem(dto);
  }

  @ApiBearerAuth()
  @Roles(UserRole.ADMIN, UserRole.ORGANIZER)
  @Get('admin/faq/items')
  @ApiOperation({ summary: 'Get all FAQ items with filters' })
  @ApiResponse({
    status: 200,
    description: 'Items retrieved successfully',
    type: [FaqItemResponseDto],
  })
  async getAllItems(@Query() query: FaqQueryDto): Promise<FaqItemResponseDto[]> {
    return this.faqService.findAllItems(query);
  }

  @ApiBearerAuth()
  @Roles(UserRole.ADMIN, UserRole.ORGANIZER)
  @Get('admin/faq/items/:id')
  @ApiOperation({ summary: 'Get a FAQ item by ID' })
  @ApiParam({ name: 'id', description: 'Item ID' })
  @ApiResponse({
    status: 200,
    description: 'Item retrieved successfully',
    type: FaqItemResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Item not found' })
  async getItemById(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<FaqItemResponseDto> {
    return this.faqService.findItemById(id);
  }

  @ApiBearerAuth()
  @Roles(UserRole.ADMIN, UserRole.ORGANIZER)
  @Put('admin/faq/items/:id')
  @ApiOperation({ summary: 'Update a FAQ item' })
  @ApiParam({ name: 'id', description: 'Item ID' })
  @ApiResponse({
    status: 200,
    description: 'Item updated successfully',
    type: FaqItemResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Item not found' })
  async updateItem(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateFaqItemDto,
  ): Promise<FaqItemResponseDto> {
    return this.faqService.updateItem(id, dto);
  }

  @ApiBearerAuth()
  @Roles(UserRole.ADMIN, UserRole.ORGANIZER)
  @Delete('admin/faq/items/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a FAQ item' })
  @ApiParam({ name: 'id', description: 'Item ID' })
  @ApiResponse({ status: 204, description: 'Item deleted successfully' })
  @ApiResponse({ status: 404, description: 'Item not found' })
  async deleteItem(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    return this.faqService.deleteItem(id);
  }

  @ApiBearerAuth()
  @Roles(UserRole.ADMIN, UserRole.ORGANIZER)
  @Patch('admin/faq/items/:id/toggle')
  @ApiOperation({ summary: 'Toggle FAQ item active status' })
  @ApiParam({ name: 'id', description: 'Item ID' })
  @ApiResponse({
    status: 200,
    description: 'Item status toggled successfully',
    type: FaqItemResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Item not found' })
  async toggleItemActive(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<FaqItemResponseDto> {
    return this.faqService.toggleItemActive(id);
  }

  @ApiBearerAuth()
  @Roles(UserRole.ADMIN, UserRole.ORGANIZER)
  @Patch('admin/faq/categories/:categoryId/items/reorder')
  @ApiOperation({ summary: 'Reorder FAQ items within a category' })
  @ApiParam({ name: 'categoryId', description: 'Category ID' })
  @ApiResponse({
    status: 200,
    description: 'Items reordered successfully',
    type: [FaqItemResponseDto],
  })
  async reorderItems(
    @Param('categoryId', ParseUUIDPipe) categoryId: string,
    @Body() body: { itemIds: string[] },
  ): Promise<FaqItemResponseDto[]> {
    return this.faqService.reorderItems(categoryId, body.itemIds);
  }
}
