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
  ApiQuery,
} from '@nestjs/swagger';
import { UserRole, OrderStatus } from '@prisma/client';
import { VendorsService } from './vendors.service';
import {
  CreateVendorDto,
  UpdateVendorDto,
  CreateMenuItemDto,
  UpdateMenuItemDto,
  CreateOrderDto,
  UpdateOrderStatusDto,
  VendorQueryDto,
  VendorResponseDto,
  MenuItemResponseDto,
  OrderResponseDto,
  PaginatedVendorsDto,
  VendorDashboardStatsDto,
} from './dto';
import { Roles } from '../auth/decorators/roles.decorator';
import { Public } from '../auth/decorators/public.decorator';
import { CurrentUser, AuthenticatedUser } from '../auth/decorators/current-user.decorator';

/**
 * Vendors Controller
 *
 * Handles all vendor-related HTTP endpoints including:
 * - Vendor CRUD (ORGANIZER/ADMIN)
 * - Menu items CRUD (ORGANIZER/ADMIN)
 * - Orders (USER)
 * - Vendor dashboard/stats (ORGANIZER/ADMIN)
 */
@ApiTags('vendors')
@Controller()
export class VendorsController {
  constructor(private readonly vendorsService: VendorsService) {}

  // ==================== VENDOR CRUD ====================

  /**
   * Create a new vendor for a festival
   */
  @Post('festivals/:festivalId/vendors')
  @Roles(UserRole.ADMIN, UserRole.ORGANIZER)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Create a new vendor',
    description: 'Creates a new vendor for a festival. Only accessible by ADMIN and ORGANIZER roles.',
  })
  @ApiParam({ name: 'festivalId', description: 'Festival UUID' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Vendor created successfully',
    type: VendorResponseDto,
  })
  @ApiResponse({ status: HttpStatus.BAD_REQUEST, description: 'Invalid input data' })
  @ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'Unauthorized' })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Forbidden - requires ADMIN or ORGANIZER role' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Festival not found' })
  async createVendor(
    @Param('festivalId', ParseUUIDPipe) festivalId: string,
    @Body() createVendorDto: CreateVendorDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<VendorResponseDto> {
    return this.vendorsService.createVendor(festivalId, createVendorDto, user);
  }

  /**
   * Get all vendors for a festival
   */
  @Get('festivals/:festivalId/vendors')
  @Public()
  @ApiOperation({
    summary: 'List all vendors for a festival',
    description: 'Returns a paginated list of vendors for the specified festival.',
  })
  @ApiParam({ name: 'festivalId', description: 'Festival UUID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'List of vendors',
    type: PaginatedVendorsDto,
  })
  async findAllVendors(
    @Param('festivalId', ParseUUIDPipe) festivalId: string,
    @Query() query: VendorQueryDto,
  ): Promise<PaginatedVendorsDto> {
    return this.vendorsService.findAllVendors(festivalId, query);
  }

  /**
   * Get a single vendor by ID
   */
  @Get('vendors/:vendorId')
  @Public()
  @ApiOperation({
    summary: 'Get a vendor by ID',
    description: 'Returns detailed information about a specific vendor including menu items.',
  })
  @ApiParam({ name: 'vendorId', description: 'Vendor UUID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Vendor details',
    type: VendorResponseDto,
  })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Vendor not found' })
  async findOneVendor(
    @Param('vendorId', ParseUUIDPipe) vendorId: string,
  ): Promise<VendorResponseDto> {
    return this.vendorsService.findOneVendor(vendorId);
  }

  /**
   * Update a vendor
   */
  @Patch('vendors/:vendorId')
  @Roles(UserRole.ADMIN, UserRole.ORGANIZER)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Update a vendor',
    description: 'Updates a vendor. Only accessible by ADMIN and ORGANIZER roles.',
  })
  @ApiParam({ name: 'vendorId', description: 'Vendor UUID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Vendor updated successfully',
    type: VendorResponseDto,
  })
  @ApiResponse({ status: HttpStatus.BAD_REQUEST, description: 'Invalid input data' })
  @ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'Unauthorized' })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Forbidden' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Vendor not found' })
  async updateVendor(
    @Param('vendorId', ParseUUIDPipe) vendorId: string,
    @Body() updateVendorDto: UpdateVendorDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<VendorResponseDto> {
    return this.vendorsService.updateVendor(vendorId, updateVendorDto, user);
  }

  /**
   * Delete a vendor
   */
  @Delete('vendors/:vendorId')
  @Roles(UserRole.ADMIN, UserRole.ORGANIZER)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Delete a vendor',
    description: 'Deletes a vendor and all associated menu items and orders.',
  })
  @ApiParam({ name: 'vendorId', description: 'Vendor UUID' })
  @ApiResponse({ status: HttpStatus.NO_CONTENT, description: 'Vendor deleted successfully' })
  @ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'Unauthorized' })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Forbidden' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Vendor not found' })
  async deleteVendor(
    @Param('vendorId', ParseUUIDPipe) vendorId: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<void> {
    return this.vendorsService.deleteVendor(vendorId, user);
  }

  // ==================== MENU ITEMS CRUD ====================

  /**
   * Create a menu item for a vendor
   */
  @Post('vendors/:vendorId/menu-items')
  @Roles(UserRole.ADMIN, UserRole.ORGANIZER)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Create a menu item',
    description: 'Creates a new menu item for a vendor.',
  })
  @ApiParam({ name: 'vendorId', description: 'Vendor UUID' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Menu item created successfully',
    type: MenuItemResponseDto,
  })
  @ApiResponse({ status: HttpStatus.BAD_REQUEST, description: 'Invalid input data' })
  @ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'Unauthorized' })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Forbidden' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Vendor not found' })
  async createMenuItem(
    @Param('vendorId', ParseUUIDPipe) vendorId: string,
    @Body() createMenuItemDto: CreateMenuItemDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<MenuItemResponseDto> {
    return this.vendorsService.createMenuItem(vendorId, createMenuItemDto, user);
  }

  /**
   * Get all menu items for a vendor
   */
  @Get('vendors/:vendorId/menu-items')
  @Public()
  @ApiOperation({
    summary: 'List menu items for a vendor',
    description: 'Returns all menu items for the specified vendor.',
  })
  @ApiParam({ name: 'vendorId', description: 'Vendor UUID' })
  @ApiQuery({ name: 'onlyAvailable', required: false, type: Boolean })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'List of menu items',
    type: [MenuItemResponseDto],
  })
  async findAllMenuItems(
    @Param('vendorId', ParseUUIDPipe) vendorId: string,
    @Query('onlyAvailable') onlyAvailable?: boolean,
  ): Promise<MenuItemResponseDto[]> {
    return this.vendorsService.findAllMenuItems(vendorId, onlyAvailable === true);
  }

  /**
   * Update a menu item
   */
  @Patch('menu-items/:menuItemId')
  @Roles(UserRole.ADMIN, UserRole.ORGANIZER)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Update a menu item',
    description: 'Updates a menu item.',
  })
  @ApiParam({ name: 'menuItemId', description: 'Menu item UUID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Menu item updated successfully',
    type: MenuItemResponseDto,
  })
  @ApiResponse({ status: HttpStatus.BAD_REQUEST, description: 'Invalid input data' })
  @ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'Unauthorized' })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Forbidden' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Menu item not found' })
  async updateMenuItem(
    @Param('menuItemId', ParseUUIDPipe) menuItemId: string,
    @Body() updateMenuItemDto: UpdateMenuItemDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<MenuItemResponseDto> {
    return this.vendorsService.updateMenuItem(menuItemId, updateMenuItemDto, user);
  }

  /**
   * Delete a menu item
   */
  @Delete('menu-items/:menuItemId')
  @Roles(UserRole.ADMIN, UserRole.ORGANIZER)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Delete a menu item',
    description: 'Deletes a menu item.',
  })
  @ApiParam({ name: 'menuItemId', description: 'Menu item UUID' })
  @ApiResponse({ status: HttpStatus.NO_CONTENT, description: 'Menu item deleted successfully' })
  @ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'Unauthorized' })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Forbidden' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Menu item not found' })
  async deleteMenuItem(
    @Param('menuItemId', ParseUUIDPipe) menuItemId: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<void> {
    return this.vendorsService.deleteMenuItem(menuItemId, user);
  }

  // ==================== ORDERS ====================

  /**
   * Create an order
   */
  @Post('orders')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Create an order',
    description: 'Creates a new order for food/drinks from a vendor.',
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Order created successfully',
    type: OrderResponseDto,
  })
  @ApiResponse({ status: HttpStatus.BAD_REQUEST, description: 'Invalid input data or vendor closed' })
  @ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'Unauthorized' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Vendor not found' })
  async createOrder(
    @Body() createOrderDto: CreateOrderDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<OrderResponseDto> {
    return this.vendorsService.createOrder(createOrderDto, user);
  }

  /**
   * Get current user's orders
   */
  @Get('orders/my-orders')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get my orders',
    description: 'Returns all orders for the current user.',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'List of orders',
    type: [OrderResponseDto],
  })
  @ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'Unauthorized' })
  async findMyOrders(
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<OrderResponseDto[]> {
    return this.vendorsService.findUserOrders(user.id);
  }

  /**
   * Get a single order by ID
   */
  @Get('orders/:orderId')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get an order by ID',
    description: 'Returns detailed information about a specific order.',
  })
  @ApiParam({ name: 'orderId', description: 'Order UUID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Order details',
    type: OrderResponseDto,
  })
  @ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'Unauthorized' })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Forbidden' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Order not found' })
  async findOneOrder(
    @Param('orderId', ParseUUIDPipe) orderId: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<OrderResponseDto> {
    return this.vendorsService.findOneOrder(orderId, user);
  }

  /**
   * Get orders for a vendor
   */
  @Get('vendors/:vendorId/orders')
  @Roles(UserRole.ADMIN, UserRole.ORGANIZER)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get orders for a vendor',
    description: 'Returns all orders for a vendor. Only accessible by ADMIN and ORGANIZER roles.',
  })
  @ApiParam({ name: 'vendorId', description: 'Vendor UUID' })
  @ApiQuery({ name: 'status', required: false, enum: OrderStatus })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'List of orders',
    type: [OrderResponseDto],
  })
  @ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'Unauthorized' })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Forbidden' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Vendor not found' })
  async findVendorOrders(
    @Param('vendorId', ParseUUIDPipe) vendorId: string,
    @Query('status') status: OrderStatus | undefined,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<OrderResponseDto[]> {
    return this.vendorsService.findVendorOrders(vendorId, user, status);
  }

  /**
   * Update order status
   */
  @Patch('orders/:orderId/status')
  @Roles(UserRole.ADMIN, UserRole.ORGANIZER)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Update order status',
    description: 'Updates the status of an order. Only accessible by ADMIN and ORGANIZER roles.',
  })
  @ApiParam({ name: 'orderId', description: 'Order UUID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Order status updated successfully',
    type: OrderResponseDto,
  })
  @ApiResponse({ status: HttpStatus.BAD_REQUEST, description: 'Invalid status transition' })
  @ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'Unauthorized' })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Forbidden' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Order not found' })
  async updateOrderStatus(
    @Param('orderId', ParseUUIDPipe) orderId: string,
    @Body() updateOrderStatusDto: UpdateOrderStatusDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<OrderResponseDto> {
    return this.vendorsService.updateOrderStatus(orderId, updateOrderStatusDto, user);
  }

  /**
   * Cancel an order
   */
  @Post('orders/:orderId/cancel')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Cancel an order',
    description: 'Cancels a pending or confirmed order. Users can only cancel their own orders.',
  })
  @ApiParam({ name: 'orderId', description: 'Order UUID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Order cancelled successfully',
    type: OrderResponseDto,
  })
  @ApiResponse({ status: HttpStatus.BAD_REQUEST, description: 'Order cannot be cancelled' })
  @ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'Unauthorized' })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Forbidden' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Order not found' })
  async cancelOrder(
    @Param('orderId', ParseUUIDPipe) orderId: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<OrderResponseDto> {
    return this.vendorsService.cancelOrder(orderId, user);
  }

  // ==================== DASHBOARD ====================

  /**
   * Get vendor dashboard statistics
   */
  @Get('vendors/:vendorId/dashboard')
  @Roles(UserRole.ADMIN, UserRole.ORGANIZER)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get vendor dashboard',
    description: 'Returns sales statistics and analytics for a vendor.',
  })
  @ApiParam({ name: 'vendorId', description: 'Vendor UUID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Vendor dashboard statistics',
    type: VendorDashboardStatsDto,
  })
  @ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'Unauthorized' })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Forbidden' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Vendor not found' })
  async getVendorDashboard(
    @Param('vendorId', ParseUUIDPipe) vendorId: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<VendorDashboardStatsDto> {
    return this.vendorsService.getVendorDashboard(vendorId, user);
  }
}
