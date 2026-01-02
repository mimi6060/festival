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
import { VendorsService } from './vendors.service';
import {
  CreateVendorDto,
  UpdateVendorDto,
  CreateProductDto,
  UpdateProductDto,
  CreateOrderDto,
  UpdateOrderStatusDto,
  CreatePayoutDto,
  QueryVendorsDto,
  QueryOrdersDto,
  QueryStatsDto,
} from './dto';

// Placeholder for auth decorators - will be integrated with auth module
// import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
// import { RolesGuard } from '../auth/guards/roles.guard';
// import { Roles } from '../auth/decorators/roles.decorator';
// import { CurrentUser } from '../auth/decorators/current-user.decorator';

// Temporary decorator for development
const CurrentUser = () => (_target: object, _key: string, _index: number) => {};

@ApiTags('Vendors')
@Controller('vendors')
export class VendorsController {
  constructor(private readonly vendorsService: VendorsService) {}

  // ==================== VENDOR CRUD ====================

  @Post()
  @ApiOperation({ summary: 'Create a new vendor' })
  @ApiResponse({ status: 201, description: 'Vendor created successfully' })
  @ApiResponse({ status: 400, description: 'Invalid input' })
  @ApiResponse({ status: 404, description: 'Festival not found' })
  @ApiBearerAuth()
  async create(
    @Body() dto: CreateVendorDto,
    @CurrentUser() user: { id: string },
  ) {
    // In production, get user from JWT token
    const userId = user?.id || 'dev-user-id';
    return this.vendorsService.createVendor(userId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'List all vendors with filters' })
  @ApiResponse({ status: 200, description: 'List of vendors' })
  async findAll(@Query() query: QueryVendorsDto) {
    return this.vendorsService.findAllVendors(query);
  }

  @Get('menu/:qrCode')
  @ApiOperation({ summary: 'Get vendor menu by QR code (public)' })
  @ApiParam({ name: 'qrCode', description: 'Vendor QR menu code' })
  @ApiResponse({ status: 200, description: 'Vendor menu' })
  @ApiResponse({ status: 404, description: 'Vendor not found' })
  async getMenuByQrCode(@Param('qrCode') qrCode: string) {
    return this.vendorsService.findVendorByQrCode(qrCode);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get vendor by ID' })
  @ApiParam({ name: 'id', description: 'Vendor ID' })
  @ApiResponse({ status: 200, description: 'Vendor details' })
  @ApiResponse({ status: 404, description: 'Vendor not found' })
  async findOne(@Param('id') id: string) {
    return this.vendorsService.findVendorById(id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update vendor' })
  @ApiParam({ name: 'id', description: 'Vendor ID' })
  @ApiResponse({ status: 200, description: 'Vendor updated' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Vendor not found' })
  @ApiBearerAuth()
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateVendorDto,
    @CurrentUser() user: { id: string },
  ) {
    const userId = user?.id || 'dev-user-id';
    return this.vendorsService.updateVendor(id, userId, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete vendor (soft delete)' })
  @ApiParam({ name: 'id', description: 'Vendor ID' })
  @ApiResponse({ status: 204, description: 'Vendor deleted' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Vendor not found' })
  @ApiBearerAuth()
  async remove(
    @Param('id') id: string,
    @CurrentUser() user: { id: string },
  ) {
    const userId = user?.id || 'dev-user-id';
    await this.vendorsService.deleteVendor(id, userId);
  }

  @Post(':id/regenerate-qr')
  @ApiOperation({ summary: 'Regenerate vendor QR menu code' })
  @ApiParam({ name: 'id', description: 'Vendor ID' })
  @ApiResponse({ status: 200, description: 'QR code regenerated' })
  @ApiBearerAuth()
  async regenerateQrCode(
    @Param('id') id: string,
    @CurrentUser() user: { id: string },
  ) {
    const userId = user?.id || 'dev-user-id';
    return this.vendorsService.regenerateQrMenuCode(id, userId);
  }

  // ==================== PRODUCTS ====================

  @Post(':id/products')
  @ApiOperation({ summary: 'Add a product to vendor' })
  @ApiParam({ name: 'id', description: 'Vendor ID' })
  @ApiResponse({ status: 201, description: 'Product created' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Vendor not found' })
  @ApiBearerAuth()
  async createProduct(
    @Param('id') vendorId: string,
    @Body() dto: CreateProductDto,
    @CurrentUser() user: { id: string },
  ) {
    const userId = user?.id || 'dev-user-id';
    return this.vendorsService.createProduct(vendorId, userId, dto);
  }

  @Get(':id/products')
  @ApiOperation({ summary: 'Get all products for a vendor' })
  @ApiParam({ name: 'id', description: 'Vendor ID' })
  @ApiResponse({ status: 200, description: 'List of products' })
  @ApiResponse({ status: 404, description: 'Vendor not found' })
  async findAllProducts(@Param('id') vendorId: string) {
    return this.vendorsService.findAllProducts(vendorId);
  }

  @Get(':id/products/:productId')
  @ApiOperation({ summary: 'Get a specific product' })
  @ApiParam({ name: 'id', description: 'Vendor ID' })
  @ApiParam({ name: 'productId', description: 'Product ID' })
  @ApiResponse({ status: 200, description: 'Product details' })
  @ApiResponse({ status: 404, description: 'Product not found' })
  async findProduct(
    @Param('id') vendorId: string,
    @Param('productId') productId: string,
  ) {
    return this.vendorsService.findProductById(vendorId, productId);
  }

  @Put(':id/products/:productId')
  @ApiOperation({ summary: 'Update a product' })
  @ApiParam({ name: 'id', description: 'Vendor ID' })
  @ApiParam({ name: 'productId', description: 'Product ID' })
  @ApiResponse({ status: 200, description: 'Product updated' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Product not found' })
  @ApiBearerAuth()
  async updateProduct(
    @Param('id') vendorId: string,
    @Param('productId') productId: string,
    @Body() dto: UpdateProductDto,
    @CurrentUser() user: { id: string },
  ) {
    const userId = user?.id || 'dev-user-id';
    return this.vendorsService.updateProduct(vendorId, productId, userId, dto);
  }

  @Delete(':id/products/:productId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a product' })
  @ApiParam({ name: 'id', description: 'Vendor ID' })
  @ApiParam({ name: 'productId', description: 'Product ID' })
  @ApiResponse({ status: 204, description: 'Product deleted' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Product not found' })
  @ApiBearerAuth()
  async deleteProduct(
    @Param('id') vendorId: string,
    @Param('productId') productId: string,
    @CurrentUser() user: { id: string },
  ) {
    const userId = user?.id || 'dev-user-id';
    await this.vendorsService.deleteProduct(vendorId, productId, userId);
  }

  @Patch(':id/products/:productId/stock')
  @ApiOperation({ summary: 'Update product stock' })
  @ApiParam({ name: 'id', description: 'Vendor ID' })
  @ApiParam({ name: 'productId', description: 'Product ID' })
  @ApiResponse({ status: 200, description: 'Stock updated' })
  @ApiBearerAuth()
  async updateStock(
    @Param('id') vendorId: string,
    @Param('productId') productId: string,
    @Body() body: { stock: number | null },
    @CurrentUser() user: { id: string },
  ) {
    const userId = user?.id || 'dev-user-id';
    return this.vendorsService.updateProductStock(vendorId, productId, userId, body.stock);
  }

  // ==================== ORDERS ====================

  @Post(':id/orders')
  @ApiOperation({ summary: 'Create an order' })
  @ApiParam({ name: 'id', description: 'Vendor ID' })
  @ApiResponse({ status: 201, description: 'Order created' })
  @ApiResponse({ status: 400, description: 'Invalid order or insufficient balance' })
  @ApiResponse({ status: 404, description: 'Vendor not found' })
  @ApiBearerAuth()
  async createOrder(
    @Param('id') vendorId: string,
    @Body() dto: CreateOrderDto,
    @CurrentUser() user: { id: string },
  ) {
    const userId = user?.id || 'dev-user-id';
    return this.vendorsService.createOrder(vendorId, userId, dto);
  }

  @Get(':id/orders')
  @ApiOperation({ summary: 'Get orders for a vendor (vendor owner only)' })
  @ApiParam({ name: 'id', description: 'Vendor ID' })
  @ApiResponse({ status: 200, description: 'List of orders' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiBearerAuth()
  async findVendorOrders(
    @Param('id') vendorId: string,
    @Query() query: QueryOrdersDto,
    @CurrentUser() user: { id: string },
  ) {
    const userId = user?.id || 'dev-user-id';
    return this.vendorsService.findOrdersByVendor(vendorId, userId, query);
  }

  @Get(':id/orders/:orderId')
  @ApiOperation({ summary: 'Get order details' })
  @ApiParam({ name: 'id', description: 'Vendor ID' })
  @ApiParam({ name: 'orderId', description: 'Order ID' })
  @ApiResponse({ status: 200, description: 'Order details' })
  @ApiResponse({ status: 404, description: 'Order not found' })
  @ApiBearerAuth()
  async findOrder(
    @Param('id') vendorId: string,
    @Param('orderId') orderId: string,
  ) {
    return this.vendorsService.findOrderById(vendorId, orderId);
  }

  @Patch(':id/orders/:orderId/status')
  @ApiOperation({ summary: 'Update order status' })
  @ApiParam({ name: 'id', description: 'Vendor ID' })
  @ApiParam({ name: 'orderId', description: 'Order ID' })
  @ApiResponse({ status: 200, description: 'Status updated' })
  @ApiResponse({ status: 400, description: 'Invalid status transition' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Order not found' })
  @ApiBearerAuth()
  async updateOrderStatus(
    @Param('id') vendorId: string,
    @Param('orderId') orderId: string,
    @Body() dto: UpdateOrderStatusDto,
    @CurrentUser() user: { id: string },
  ) {
    const userId = user?.id || 'dev-user-id';
    return this.vendorsService.updateOrderStatus(vendorId, orderId, userId, dto);
  }

  // ==================== STATISTICS ====================

  @Get(':id/stats')
  @ApiOperation({ summary: 'Get vendor statistics' })
  @ApiParam({ name: 'id', description: 'Vendor ID' })
  @ApiQuery({ name: 'startDate', required: false })
  @ApiQuery({ name: 'endDate', required: false })
  @ApiResponse({ status: 200, description: 'Vendor statistics' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiBearerAuth()
  async getStats(
    @Param('id') vendorId: string,
    @Query() query: QueryStatsDto,
    @CurrentUser() user: { id: string },
  ) {
    const userId = user?.id || 'dev-user-id';
    return this.vendorsService.getVendorStats(vendorId, userId, query);
  }

  @Get(':id/export')
  @ApiOperation({ summary: 'Export vendor data for accounting' })
  @ApiParam({ name: 'id', description: 'Vendor ID' })
  @ApiQuery({ name: 'startDate', required: true })
  @ApiQuery({ name: 'endDate', required: true })
  @ApiResponse({ status: 200, description: 'Exported data' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiBearerAuth()
  async exportData(
    @Param('id') vendorId: string,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
    @CurrentUser() user: { id: string },
  ) {
    const userId = user?.id || 'dev-user-id';
    return this.vendorsService.exportVendorData(vendorId, userId, startDate, endDate);
  }

  // ==================== PAYOUTS ====================

  @Post(':id/payouts')
  @ApiOperation({ summary: 'Request a payout' })
  @ApiParam({ name: 'id', description: 'Vendor ID' })
  @ApiResponse({ status: 201, description: 'Payout request created' })
  @ApiResponse({ status: 400, description: 'No orders for period' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 409, description: 'Payout already exists for period' })
  @ApiBearerAuth()
  async createPayout(
    @Param('id') vendorId: string,
    @Body() dto: CreatePayoutDto,
    @CurrentUser() user: { id: string },
  ) {
    const userId = user?.id || 'dev-user-id';
    return this.vendorsService.createPayout(vendorId, userId, dto);
  }

  @Get(':id/payouts')
  @ApiOperation({ summary: 'Get vendor payouts' })
  @ApiParam({ name: 'id', description: 'Vendor ID' })
  @ApiResponse({ status: 200, description: 'List of payouts' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiBearerAuth()
  async findPayouts(
    @Param('id') vendorId: string,
    @CurrentUser() user: { id: string },
  ) {
    const userId = user?.id || 'dev-user-id';
    return this.vendorsService.findPayouts(vendorId, userId);
  }

  @Get(':id/payouts/:payoutId')
  @ApiOperation({ summary: 'Get payout details' })
  @ApiParam({ name: 'id', description: 'Vendor ID' })
  @ApiParam({ name: 'payoutId', description: 'Payout ID' })
  @ApiResponse({ status: 200, description: 'Payout details' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Payout not found' })
  @ApiBearerAuth()
  async findPayout(
    @Param('id') vendorId: string,
    @Param('payoutId') payoutId: string,
    @CurrentUser() user: { id: string },
  ) {
    const userId = user?.id || 'dev-user-id';
    return this.vendorsService.findPayoutById(vendorId, payoutId, userId);
  }
}

// ==================== USER ORDERS CONTROLLER ====================

@ApiTags('User Orders')
@Controller('my-orders')
export class UserOrdersController {
  constructor(private readonly vendorsService: VendorsService) {}

  @Get()
  @ApiOperation({ summary: 'Get current user orders' })
  @ApiResponse({ status: 200, description: 'List of user orders' })
  @ApiBearerAuth()
  async findMyOrders(
    @Query() query: QueryOrdersDto,
    @CurrentUser() user: { id: string },
  ) {
    const userId = user?.id || 'dev-user-id';
    return this.vendorsService.findUserOrders(userId, query);
  }
}
