import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  Prisma,
  Vendor,
  MenuItem,
  VendorOrder,
  OrderStatus,
  UserRole,
} from '@prisma/client';
import { CreateVendorDto } from './dto/create-vendor.dto';
import { UpdateVendorDto } from './dto/update-vendor.dto';
import { CreateMenuItemDto } from './dto/create-menu-item.dto';
import { UpdateMenuItemDto } from './dto/update-menu-item.dto';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';
import { VendorQueryDto } from './dto/vendor-query.dto';
import {
  VendorResponseDto,
  MenuItemResponseDto,
  OrderResponseDto,
  PaginatedVendorsDto,
  VendorDashboardStatsDto,
  OrderItemDetailDto,
} from './dto/vendor-response.dto';
import { AuthenticatedUser } from '../auth/decorators/current-user.decorator';

@Injectable()
export class VendorsService {
  private readonly logger = new Logger(VendorsService.name);

  constructor(private readonly prisma: PrismaService) {}

  // ==================== VENDOR CRUD (ORGANIZER) ====================

  /**
   * Create a new vendor for a festival
   */
  async createVendor(
    festivalId: string,
    createVendorDto: CreateVendorDto,
    user: AuthenticatedUser,
  ): Promise<VendorResponseDto> {
    // Verify festival exists and user is organizer
    await this.verifyFestivalAccess(festivalId, user);

    const vendor = await this.prisma.vendor.create({
      data: {
        festivalId,
        name: createVendorDto.name,
        type: createVendorDto.type,
        description: createVendorDto.description,
        logoUrl: createVendorDto.logoUrl,
        location: createVendorDto.location,
        isOpen: createVendorDto.isOpen ?? true,
      },
    });

    this.logger.log(`Vendor ${vendor.id} created for festival ${festivalId}`);
    return this.toVendorResponseDto(vendor);
  }

  /**
   * Get all vendors for a festival with filtering and pagination
   */
  async findAllVendors(
    festivalId: string,
    query: VendorQueryDto,
  ): Promise<PaginatedVendorsDto> {
    const { page = 1, limit = 10, type, isOpen, search } = query;

    const where: Prisma.VendorWhereInput = { festivalId };

    if (type) {
      where.type = type;
    }

    if (isOpen !== undefined) {
      where.isOpen = isOpen;
    }

    if (search) {
      where.name = { contains: search, mode: 'insensitive' };
    }

    const skip = (page - 1) * limit;

    const [vendors, total] = await Promise.all([
      this.prisma.vendor.findMany({
        where,
        skip,
        take: limit,
        orderBy: { name: 'asc' },
        include: {
          menuItems: {
            where: { isAvailable: true },
            orderBy: { category: 'asc' },
          },
        },
      }),
      this.prisma.vendor.count({ where }),
    ]);

    const totalPages = Math.ceil(total / limit);

    return {
      data: vendors.map((v) => this.toVendorResponseDto(v)),
      meta: {
        total,
        page,
        limit,
        totalPages,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
      },
    };
  }

  /**
   * Get a single vendor by ID
   */
  async findOneVendor(vendorId: string): Promise<VendorResponseDto> {
    const vendor = await this.prisma.vendor.findUnique({
      where: { id: vendorId },
      include: {
        menuItems: {
          orderBy: [{ category: 'asc' }, { name: 'asc' }],
        },
      },
    });

    if (!vendor) {
      throw new NotFoundException(`Vendor with ID "${vendorId}" not found`);
    }

    return this.toVendorResponseDto(vendor);
  }

  /**
   * Update a vendor
   */
  async updateVendor(
    vendorId: string,
    updateVendorDto: UpdateVendorDto,
    user: AuthenticatedUser,
  ): Promise<VendorResponseDto> {
    const vendor = await this.prisma.vendor.findUnique({
      where: { id: vendorId },
      include: { festival: true },
    });

    if (!vendor) {
      throw new NotFoundException(`Vendor with ID "${vendorId}" not found`);
    }

    // Verify user has access to the festival
    await this.verifyFestivalAccess(vendor.festivalId, user);

    const updatedVendor = await this.prisma.vendor.update({
      where: { id: vendorId },
      data: {
        name: updateVendorDto.name,
        type: updateVendorDto.type,
        description: updateVendorDto.description,
        logoUrl: updateVendorDto.logoUrl,
        location: updateVendorDto.location,
        isOpen: updateVendorDto.isOpen,
      },
      include: {
        menuItems: true,
      },
    });

    this.logger.log(`Vendor ${vendorId} updated`);
    return this.toVendorResponseDto(updatedVendor);
  }

  /**
   * Delete a vendor
   */
  async deleteVendor(vendorId: string, user: AuthenticatedUser): Promise<void> {
    const vendor = await this.prisma.vendor.findUnique({
      where: { id: vendorId },
    });

    if (!vendor) {
      throw new NotFoundException(`Vendor with ID "${vendorId}" not found`);
    }

    await this.verifyFestivalAccess(vendor.festivalId, user);

    await this.prisma.vendor.delete({
      where: { id: vendorId },
    });

    this.logger.log(`Vendor ${vendorId} deleted`);
  }

  // ==================== MENU ITEMS CRUD ====================

  /**
   * Create a menu item for a vendor
   */
  async createMenuItem(
    vendorId: string,
    createMenuItemDto: CreateMenuItemDto,
    user: AuthenticatedUser,
  ): Promise<MenuItemResponseDto> {
    const vendor = await this.prisma.vendor.findUnique({
      where: { id: vendorId },
    });

    if (!vendor) {
      throw new NotFoundException(`Vendor with ID "${vendorId}" not found`);
    }

    await this.verifyFestivalAccess(vendor.festivalId, user);

    const menuItem = await this.prisma.menuItem.create({
      data: {
        vendorId,
        name: createMenuItemDto.name,
        description: createMenuItemDto.description,
        price: createMenuItemDto.price,
        category: createMenuItemDto.category,
        imageUrl: createMenuItemDto.imageUrl,
        isAvailable: createMenuItemDto.isAvailable ?? true,
      },
    });

    this.logger.log(`Menu item ${menuItem.id} created for vendor ${vendorId}`);
    return this.toMenuItemResponseDto(menuItem);
  }

  /**
   * Get all menu items for a vendor
   */
  async findAllMenuItems(
    vendorId: string,
    onlyAvailable: boolean = false,
  ): Promise<MenuItemResponseDto[]> {
    const where: Prisma.MenuItemWhereInput = { vendorId };

    if (onlyAvailable) {
      where.isAvailable = true;
    }

    const menuItems = await this.prisma.menuItem.findMany({
      where,
      orderBy: [{ category: 'asc' }, { name: 'asc' }],
    });

    return menuItems.map((item) => this.toMenuItemResponseDto(item));
  }

  /**
   * Update a menu item
   */
  async updateMenuItem(
    menuItemId: string,
    updateMenuItemDto: UpdateMenuItemDto,
    user: AuthenticatedUser,
  ): Promise<MenuItemResponseDto> {
    const menuItem = await this.prisma.menuItem.findUnique({
      where: { id: menuItemId },
      include: { vendor: true },
    });

    if (!menuItem) {
      throw new NotFoundException(`Menu item with ID "${menuItemId}" not found`);
    }

    await this.verifyFestivalAccess(menuItem.vendor.festivalId, user);

    const updatedMenuItem = await this.prisma.menuItem.update({
      where: { id: menuItemId },
      data: {
        name: updateMenuItemDto.name,
        description: updateMenuItemDto.description,
        price: updateMenuItemDto.price,
        category: updateMenuItemDto.category,
        imageUrl: updateMenuItemDto.imageUrl,
        isAvailable: updateMenuItemDto.isAvailable,
      },
    });

    this.logger.log(`Menu item ${menuItemId} updated`);
    return this.toMenuItemResponseDto(updatedMenuItem);
  }

  /**
   * Delete a menu item
   */
  async deleteMenuItem(menuItemId: string, user: AuthenticatedUser): Promise<void> {
    const menuItem = await this.prisma.menuItem.findUnique({
      where: { id: menuItemId },
      include: { vendor: true },
    });

    if (!menuItem) {
      throw new NotFoundException(`Menu item with ID "${menuItemId}" not found`);
    }

    await this.verifyFestivalAccess(menuItem.vendor.festivalId, user);

    await this.prisma.menuItem.delete({
      where: { id: menuItemId },
    });

    this.logger.log(`Menu item ${menuItemId} deleted`);
  }

  // ==================== ORDERS (USER) ====================

  /**
   * Create an order
   */
  async createOrder(
    createOrderDto: CreateOrderDto,
    user: AuthenticatedUser,
  ): Promise<OrderResponseDto> {
    const { vendorId, items } = createOrderDto;

    // Verify vendor exists and is open
    const vendor = await this.prisma.vendor.findUnique({
      where: { id: vendorId },
    });

    if (!vendor) {
      throw new NotFoundException(`Vendor with ID "${vendorId}" not found`);
    }

    if (!vendor.isOpen) {
      throw new BadRequestException('This vendor is currently closed');
    }

    // Get all menu items for validation
    const menuItemIds = items.map((item) => item.menuItemId);
    const menuItems = await this.prisma.menuItem.findMany({
      where: {
        id: { in: menuItemIds },
        vendorId,
        isAvailable: true,
      },
    });

    if (menuItems.length !== menuItemIds.length) {
      throw new BadRequestException('One or more items are not available');
    }

    // Calculate total and build order items
    const orderItems: OrderItemDetailDto[] = [];
    let totalAmount = 0;

    for (const orderItem of items) {
      const menuItem = menuItems.find((m) => m.id === orderItem.menuItemId);
      if (!menuItem) {
        throw new BadRequestException(`Menu item ${orderItem.menuItemId} not found`);
      }

      const subtotal = Number(menuItem.price) * orderItem.quantity;
      totalAmount += subtotal;

      orderItems.push({
        menuItemId: menuItem.id,
        menuItemName: menuItem.name,
        quantity: orderItem.quantity,
        unitPrice: Number(menuItem.price),
        subtotal,
      });
    }

    // Create the order
    const order = await this.prisma.vendorOrder.create({
      data: {
        vendorId,
        userId: user.id,
        items: orderItems,
        totalAmount,
        status: OrderStatus.PENDING,
      },
      include: {
        vendor: true,
      },
    });

    this.logger.log(`Order ${order.id} created by user ${user.id}`);
    return this.toOrderResponseDto(order);
  }

  /**
   * Get orders for the current user
   */
  async findUserOrders(userId: string): Promise<OrderResponseDto[]> {
    const orders = await this.prisma.vendorOrder.findMany({
      where: { userId },
      include: { vendor: true },
      orderBy: { createdAt: 'desc' },
    });

    return orders.map((order) => this.toOrderResponseDto(order));
  }

  /**
   * Get a single order by ID
   */
  async findOneOrder(orderId: string, user: AuthenticatedUser): Promise<OrderResponseDto> {
    const order = await this.prisma.vendorOrder.findUnique({
      where: { id: orderId },
      include: { vendor: true },
    });

    if (!order) {
      throw new NotFoundException(`Order with ID "${orderId}" not found`);
    }

    // User can only view their own orders unless they are admin/organizer
    if (order.userId !== user.id && user.role === UserRole.USER) {
      throw new ForbiddenException('You can only view your own orders');
    }

    return this.toOrderResponseDto(order);
  }

  /**
   * Get orders for a vendor
   */
  async findVendorOrders(
    vendorId: string,
    user: AuthenticatedUser,
    status?: OrderStatus,
  ): Promise<OrderResponseDto[]> {
    const vendor = await this.prisma.vendor.findUnique({
      where: { id: vendorId },
    });

    if (!vendor) {
      throw new NotFoundException(`Vendor with ID "${vendorId}" not found`);
    }

    await this.verifyFestivalAccess(vendor.festivalId, user);

    const where: Prisma.VendorOrderWhereInput = { vendorId };
    if (status) {
      where.status = status;
    }

    const orders = await this.prisma.vendorOrder.findMany({
      where,
      include: { vendor: true },
      orderBy: { createdAt: 'desc' },
    });

    return orders.map((order) => this.toOrderResponseDto(order));
  }

  /**
   * Update order status
   */
  async updateOrderStatus(
    orderId: string,
    updateOrderStatusDto: UpdateOrderStatusDto,
    user: AuthenticatedUser,
  ): Promise<OrderResponseDto> {
    const order = await this.prisma.vendorOrder.findUnique({
      where: { id: orderId },
      include: { vendor: true },
    });

    if (!order) {
      throw new NotFoundException(`Order with ID "${orderId}" not found`);
    }

    await this.verifyFestivalAccess(order.vendor.festivalId, user);

    // Validate status transitions
    this.validateOrderStatusTransition(order.status, updateOrderStatusDto.status);

    const updatedOrder = await this.prisma.vendorOrder.update({
      where: { id: orderId },
      data: { status: updateOrderStatusDto.status },
      include: { vendor: true },
    });

    this.logger.log(`Order ${orderId} status updated to ${updateOrderStatusDto.status}`);
    return this.toOrderResponseDto(updatedOrder);
  }

  /**
   * Cancel an order (user can cancel their own pending orders)
   */
  async cancelOrder(orderId: string, user: AuthenticatedUser): Promise<OrderResponseDto> {
    const order = await this.prisma.vendorOrder.findUnique({
      where: { id: orderId },
      include: { vendor: true },
    });

    if (!order) {
      throw new NotFoundException(`Order with ID "${orderId}" not found`);
    }

    // User can only cancel their own pending orders
    if (order.userId !== user.id && user.role === UserRole.USER) {
      throw new ForbiddenException('You can only cancel your own orders');
    }

    if (order.status !== OrderStatus.PENDING && order.status !== OrderStatus.CONFIRMED) {
      throw new BadRequestException('Only pending or confirmed orders can be cancelled');
    }

    const cancelledOrder = await this.prisma.vendorOrder.update({
      where: { id: orderId },
      data: { status: OrderStatus.CANCELLED },
      include: { vendor: true },
    });

    this.logger.log(`Order ${orderId} cancelled by user ${user.id}`);
    return this.toOrderResponseDto(cancelledOrder);
  }

  // ==================== DASHBOARD STATS ====================

  /**
   * Get vendor dashboard statistics
   */
  async getVendorDashboard(
    vendorId: string,
    user: AuthenticatedUser,
  ): Promise<VendorDashboardStatsDto> {
    const vendor = await this.prisma.vendor.findUnique({
      where: { id: vendorId },
      include: { festival: true },
    });

    if (!vendor) {
      throw new NotFoundException(`Vendor with ID "${vendorId}" not found`);
    }

    await this.verifyFestivalAccess(vendor.festivalId, user);

    // Get all orders for this vendor
    const orders = await this.prisma.vendorOrder.findMany({
      where: { vendorId },
    });

    // Calculate basic stats
    const totalOrders = orders.length;
    const pendingOrders = orders.filter((o) => o.status === OrderStatus.PENDING).length;
    const preparingOrders = orders.filter((o) => o.status === OrderStatus.PREPARING).length;
    const readyOrders = orders.filter((o) => o.status === OrderStatus.READY).length;
    const deliveredOrders = orders.filter((o) => o.status === OrderStatus.DELIVERED).length;
    const cancelledOrders = orders.filter((o) => o.status === OrderStatus.CANCELLED).length;

    // Calculate revenue (only from delivered orders)
    const completedOrders = orders.filter((o) => o.status === OrderStatus.DELIVERED);
    const totalRevenue = completedOrders.reduce(
      (sum, o) => sum + Number(o.totalAmount),
      0,
    );
    const averageOrderValue =
      completedOrders.length > 0 ? totalRevenue / completedOrders.length : 0;

    // Calculate top selling items
    const itemSales = new Map<
      string,
      { menuItemId: string; menuItemName: string; quantitySold: number; revenue: number }
    >();

    for (const order of completedOrders) {
      const items = order.items as OrderItemDetailDto[];
      for (const item of items) {
        const existing = itemSales.get(item.menuItemId) || {
          menuItemId: item.menuItemId,
          menuItemName: item.menuItemName,
          quantitySold: 0,
          revenue: 0,
        };
        existing.quantitySold += item.quantity;
        existing.revenue += item.subtotal;
        itemSales.set(item.menuItemId, existing);
      }
    }

    const topSellingItems = Array.from(itemSales.values())
      .sort((a, b) => b.quantitySold - a.quantitySold)
      .slice(0, 10);

    // Calculate sales by hour
    const salesByHour: Map<number, { orderCount: number; revenue: number }> = new Map();
    for (let i = 0; i < 24; i++) {
      salesByHour.set(i, { orderCount: 0, revenue: 0 });
    }

    for (const order of completedOrders) {
      const hour = new Date(order.createdAt).getHours();
      const hourData = salesByHour.get(hour)!;
      hourData.orderCount++;
      hourData.revenue += Number(order.totalAmount);
    }

    const salesByHourArray = Array.from(salesByHour.entries()).map(([hour, data]) => ({
      hour,
      orderCount: data.orderCount,
      revenue: data.revenue,
    }));

    return {
      vendorId,
      vendorName: vendor.name,
      totalOrders,
      pendingOrders,
      preparingOrders,
      readyOrders,
      deliveredOrders,
      cancelledOrders,
      totalRevenue,
      averageOrderValue,
      currency: vendor.festival.currency,
      topSellingItems,
      salesByHour: salesByHourArray,
    };
  }

  // ==================== HELPER METHODS ====================

  /**
   * Verify that the user has access to the festival (is organizer or admin)
   */
  private async verifyFestivalAccess(
    festivalId: string,
    user: AuthenticatedUser,
  ): Promise<void> {
    if (user.role === UserRole.ADMIN) {
      return; // Admin has access to everything
    }

    const festival = await this.prisma.festival.findUnique({
      where: { id: festivalId },
    });

    if (!festival) {
      throw new NotFoundException(`Festival with ID "${festivalId}" not found`);
    }

    if (festival.organizerId !== user.id && user.role !== UserRole.ORGANIZER) {
      throw new ForbiddenException('You do not have access to this festival');
    }
  }

  /**
   * Validate order status transitions
   */
  private validateOrderStatusTransition(
    currentStatus: OrderStatus,
    newStatus: OrderStatus,
  ): void {
    const validTransitions: Record<OrderStatus, OrderStatus[]> = {
      [OrderStatus.PENDING]: [OrderStatus.CONFIRMED, OrderStatus.CANCELLED],
      [OrderStatus.CONFIRMED]: [OrderStatus.PREPARING, OrderStatus.CANCELLED],
      [OrderStatus.PREPARING]: [OrderStatus.READY, OrderStatus.CANCELLED],
      [OrderStatus.READY]: [OrderStatus.DELIVERED],
      [OrderStatus.DELIVERED]: [],
      [OrderStatus.CANCELLED]: [],
    };

    const allowed = validTransitions[currentStatus];
    if (!allowed.includes(newStatus)) {
      throw new BadRequestException(
        `Cannot transition from ${currentStatus} to ${newStatus}. ` +
          `Allowed transitions: ${allowed.length > 0 ? allowed.join(', ') : 'none'}`,
      );
    }
  }

  /**
   * Transform Vendor entity to response DTO
   */
  private toVendorResponseDto(
    vendor: Vendor & { menuItems?: MenuItem[] },
  ): VendorResponseDto {
    return {
      id: vendor.id,
      festivalId: vendor.festivalId,
      name: vendor.name,
      type: vendor.type,
      description: vendor.description ?? undefined,
      logoUrl: vendor.logoUrl ?? undefined,
      location: vendor.location ?? undefined,
      isOpen: vendor.isOpen,
      createdAt: vendor.createdAt,
      updatedAt: vendor.updatedAt,
      menuItems: vendor.menuItems?.map((item) => this.toMenuItemResponseDto(item)),
    };
  }

  /**
   * Transform MenuItem entity to response DTO
   */
  private toMenuItemResponseDto(menuItem: MenuItem): MenuItemResponseDto {
    return {
      id: menuItem.id,
      vendorId: menuItem.vendorId,
      name: menuItem.name,
      description: menuItem.description ?? undefined,
      price: Number(menuItem.price),
      category: menuItem.category ?? undefined,
      imageUrl: menuItem.imageUrl ?? undefined,
      isAvailable: menuItem.isAvailable,
      createdAt: menuItem.createdAt,
      updatedAt: menuItem.updatedAt,
    };
  }

  /**
   * Transform VendorOrder entity to response DTO
   */
  private toOrderResponseDto(
    order: VendorOrder & { vendor?: Vendor },
  ): OrderResponseDto {
    return {
      id: order.id,
      vendorId: order.vendorId,
      userId: order.userId,
      items: order.items as OrderItemDetailDto[],
      totalAmount: Number(order.totalAmount),
      status: order.status,
      createdAt: order.createdAt,
      updatedAt: order.updatedAt,
      vendor: order.vendor ? this.toVendorResponseDto(order.vendor) : undefined,
    };
  }
}
