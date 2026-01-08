import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Prisma } from '@prisma/client';
import { randomBytes } from 'crypto';
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
  VendorPaymentMethod,
  OrderStatus,
} from './dto';

@Injectable()
export class VendorsService {
  constructor(private readonly prisma: PrismaService) {}

  // ==================== VENDOR CRUD ====================

  async createVendor(ownerId: string, dto: CreateVendorDto) {
    // Verify festival exists
    const festival = await this.prisma.festival.findUnique({
      where: { id: dto.festivalId },
    });

    if (!festival) {
      throw new NotFoundException('Festival not found');
    }

    // Generate unique QR menu code
    const qrMenuCode = this.generateQrMenuCode();

    return this.prisma.vendor.create({
      data: {
        ...dto,
        ownerId,
        qrMenuCode,
        commissionRate: dto.commissionRate ?? 10,
      },
      include: {
        festival: {
          select: { id: true, name: true, slug: true },
        },
      },
    });
  }

  async findAllVendors(query: QueryVendorsDto) {
    const { festivalId, type, isOpen, search, page = 1, limit = 20 } = query;
    const skip = (page - 1) * limit;

    const where: Prisma.VendorWhereInput = {
      isActive: true,
      ...(festivalId && { festivalId }),
      ...(type && { type }),
      ...(isOpen !== undefined && { isOpen }),
      ...(search && {
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { description: { contains: search, mode: 'insensitive' } },
        ],
      }),
    };

    const [vendors, total] = await Promise.all([
      this.prisma.vendor.findMany({
        where,
        skip,
        take: limit,
        include: {
          festival: {
            select: { id: true, name: true, slug: true },
          },
          _count: {
            select: { products: true, orders: true },
          },
        },
        orderBy: { name: 'asc' },
      }),
      this.prisma.vendor.count({ where }),
    ]);

    return {
      data: vendors,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findVendorById(id: string) {
    const vendor = await this.prisma.vendor.findUnique({
      where: { id },
      include: {
        festival: {
          select: { id: true, name: true, slug: true, currency: true },
        },
        products: {
          where: { isAvailable: true },
          orderBy: [{ sortOrder: 'asc' }, { category: 'asc' }, { name: 'asc' }],
        },
        _count: {
          select: { orders: true, payouts: true },
        },
      },
    });

    if (!vendor) {
      throw new NotFoundException('Vendor not found');
    }

    return vendor;
  }

  async findVendorByQrCode(qrMenuCode: string) {
    const vendor = await this.prisma.vendor.findUnique({
      where: { qrMenuCode },
      include: {
        festival: {
          select: { id: true, name: true, slug: true, currency: true },
        },
        products: {
          where: { isAvailable: true },
          orderBy: [{ sortOrder: 'asc' }, { category: 'asc' }, { name: 'asc' }],
        },
      },
    });

    if (!vendor) {
      throw new NotFoundException('Vendor not found');
    }

    return vendor;
  }

  async updateVendor(id: string, userId: string, dto: UpdateVendorDto) {
    await this.verifyVendorOwnership(id, userId);

    return this.prisma.vendor.update({
      where: { id },
      data: dto,
      include: {
        festival: {
          select: { id: true, name: true, slug: true },
        },
      },
    });
  }

  async deleteVendor(id: string, userId: string) {
    await this.verifyVendorOwnership(id, userId);

    // Soft delete
    return this.prisma.vendor.update({
      where: { id },
      data: { isActive: false },
    });
  }

  async regenerateQrMenuCode(id: string, userId: string) {
    await this.verifyVendorOwnership(id, userId);

    const qrMenuCode = this.generateQrMenuCode();

    return this.prisma.vendor.update({
      where: { id },
      data: { qrMenuCode },
      select: { id: true, qrMenuCode: true },
    });
  }

  // ==================== PRODUCT CRUD ====================

  async createProduct(vendorId: string, userId: string, dto: CreateProductDto) {
    await this.verifyVendorOwnership(vendorId, userId);

    return this.prisma.vendorProduct.create({
      data: {
        vendorId,
        ...dto,
        allergens: dto.allergens ?? [],
      },
    });
  }

  async findAllProducts(vendorId: string, options?: { page?: number; limit?: number }) {
    const vendor = await this.prisma.vendor.findUnique({
      where: { id: vendorId },
    });

    if (!vendor) {
      throw new NotFoundException('Vendor not found');
    }

    const page = options?.page ?? 1;
    const limit = Math.min(options?.limit ?? 20, 100);
    const skip = (page - 1) * limit;

    const [products, total] = await Promise.all([
      this.prisma.vendorProduct.findMany({
        where: { vendorId },
        orderBy: [{ sortOrder: 'asc' }, { category: 'asc' }, { name: 'asc' }],
        skip,
        take: limit,
      }),
      this.prisma.vendorProduct.count({ where: { vendorId } }),
    ]);

    const totalPages = Math.ceil(total / limit);

    return {
      data: products,
      meta: {
        total,
        page,
        limit,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      },
    };
  }

  async findProductById(vendorId: string, productId: string) {
    const product = await this.prisma.vendorProduct.findFirst({
      where: { id: productId, vendorId },
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    return product;
  }

  async updateProduct(vendorId: string, productId: string, userId: string, dto: UpdateProductDto) {
    await this.verifyVendorOwnership(vendorId, userId);

    const product = await this.prisma.vendorProduct.findFirst({
      where: { id: productId, vendorId },
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    return this.prisma.vendorProduct.update({
      where: { id: productId },
      data: dto,
    });
  }

  async deleteProduct(vendorId: string, productId: string, userId: string) {
    await this.verifyVendorOwnership(vendorId, userId);

    const product = await this.prisma.vendorProduct.findFirst({
      where: { id: productId, vendorId },
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    return this.prisma.vendorProduct.delete({
      where: { id: productId },
    });
  }

  async updateProductStock(
    vendorId: string,
    productId: string,
    userId: string,
    stock: number | null
  ) {
    await this.verifyVendorOwnership(vendorId, userId);

    return this.prisma.vendorProduct.update({
      where: { id: productId },
      data: { stock },
    });
  }

  // ==================== ORDER MANAGEMENT ====================

  async createOrder(vendorId: string, userId: string, dto: CreateOrderDto) {
    const vendor = await this.prisma.vendor.findUnique({
      where: { id: vendorId },
      include: {
        festival: true,
      },
    });

    if (!vendor) {
      throw new NotFoundException('Vendor not found');
    }

    if (!vendor.isOpen) {
      throw new BadRequestException('Vendor is currently closed');
    }

    // Fetch all products and validate
    const productIds = dto.items.map((item) => item.productId);
    const products = await this.prisma.vendorProduct.findMany({
      where: {
        id: { in: productIds },
        vendorId,
        isAvailable: true,
      },
    });

    if (products.length !== productIds.length) {
      throw new BadRequestException('One or more products are not available');
    }

    // Calculate totals and validate stock
    let subtotal = 0;
    const orderItems: {
      productId: string;
      productName: string;
      quantity: number;
      unitPrice: number;
      totalPrice: number;
      options?: Record<string, unknown>;
      notes?: string;
    }[] = [];

    for (const item of dto.items) {
      const product = products.find((p) => p.id === item.productId);
      if (!product) {
        throw new BadRequestException(`Product ${item.productId} not found`);
      }

      // Check stock
      if (product.stock !== null && product.stock < item.quantity) {
        throw new BadRequestException(
          `Insufficient stock for ${product.name}. Available: ${product.stock}`
        );
      }

      const unitPrice = Number(product.price);
      const totalPrice = unitPrice * item.quantity;
      subtotal += totalPrice;

      orderItems.push({
        productId: product.id,
        productName: product.name,
        quantity: item.quantity,
        unitPrice,
        totalPrice,
        options: item.options,
        notes: item.notes,
      });
    }

    // Calculate commission
    const commissionRate = Number(vendor.commissionRate) / 100;
    const commission = subtotal * commissionRate;
    const totalAmount = subtotal;

    // Process cashless payment if needed
    let cashlessTransactionId: string | undefined;

    if (dto.paymentMethod === VendorPaymentMethod.CASHLESS) {
      // Get user's cashless account
      const cashlessAccount = await this.prisma.cashlessAccount.findUnique({
        where: { userId },
      });

      if (!cashlessAccount) {
        throw new BadRequestException('No cashless account found. Please top up first.');
      }

      if (Number(cashlessAccount.balance) < totalAmount) {
        throw new BadRequestException(
          `Insufficient cashless balance. Required: ${totalAmount}, Available: ${cashlessAccount.balance}`
        );
      }

      // Deduct from cashless account and create transaction
      const transaction = await this.prisma.$transaction(async (tx) => {
        const balanceBefore = Number(cashlessAccount.balance);
        const balanceAfter = balanceBefore - totalAmount;

        // Update balance
        await tx.cashlessAccount.update({
          where: { id: cashlessAccount.id },
          data: { balance: balanceAfter },
        });

        // Create transaction record
        const txRecord = await tx.cashlessTransaction.create({
          data: {
            accountId: cashlessAccount.id,
            festivalId: vendor.festivalId,
            type: 'PAYMENT',
            amount: -totalAmount,
            balanceBefore,
            balanceAfter,
            description: `Vendor order: ${vendor.name}`,
            metadata: { vendorId, orderItems: orderItems.length },
          },
        });

        return txRecord;
      });

      cashlessTransactionId = transaction.id;
    }

    // Generate order number
    const orderNumber = this.generateOrderNumber(vendor.name);

    // Create order with items
    const order = await this.prisma.$transaction(async (tx) => {
      // Create order
      const newOrder = await tx.vendorOrder.create({
        data: {
          orderNumber,
          vendorId,
          userId,
          subtotal,
          commission,
          totalAmount,
          paymentMethod: dto.paymentMethod,
          cashlessTransactionId,
          notes: dto.notes,
          items: {
            create: orderItems.map((item) => ({
              productId: item.productId,
              productName: item.productName,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              totalPrice: item.totalPrice,
              options: item.options as Prisma.InputJsonValue,
              notes: item.notes,
            })),
          },
        },
        include: {
          items: true,
          vendor: {
            select: { id: true, name: true },
          },
        },
      });

      // Update product stock and sold count
      for (const item of orderItems) {
        await tx.vendorProduct.update({
          where: { id: item.productId },
          data: {
            soldCount: { increment: item.quantity },
            ...(products.find((p) => p.id === item.productId)?.stock !== null && {
              stock: { decrement: item.quantity },
            }),
          },
        });
      }

      return newOrder;
    });

    return order;
  }

  async findOrdersByVendor(vendorId: string, userId: string, query: QueryOrdersDto) {
    await this.verifyVendorOwnership(vendorId, userId);

    const { status, userId: filterUserId, startDate, endDate, page = 1, limit = 20 } = query;
    const skip = (page - 1) * limit;

    const where: Prisma.VendorOrderWhereInput = {
      vendorId,
      ...(status && { status: status as Prisma.EnumOrderStatusFilter }),
      ...(filterUserId && { userId: filterUserId }),
      ...(startDate && { createdAt: { gte: new Date(startDate) } }),
      ...(endDate && { createdAt: { lte: new Date(endDate) } }),
    };

    const [orders, total] = await Promise.all([
      this.prisma.vendorOrder.findMany({
        where,
        skip,
        take: limit,
        include: {
          items: true,
          user: {
            select: { id: true, firstName: true, lastName: true },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.vendorOrder.count({ where }),
    ]);

    return {
      data: orders,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findUserOrders(userId: string, query: QueryOrdersDto) {
    const { status, startDate, endDate, page = 1, limit = 20 } = query;
    const skip = (page - 1) * limit;

    const where: Prisma.VendorOrderWhereInput = {
      userId,
      ...(status && { status: status as Prisma.EnumOrderStatusFilter }),
      ...(startDate && { createdAt: { gte: new Date(startDate) } }),
      ...(endDate && { createdAt: { lte: new Date(endDate) } }),
    };

    const [orders, total] = await Promise.all([
      this.prisma.vendorOrder.findMany({
        where,
        skip,
        take: limit,
        include: {
          items: true,
          vendor: {
            select: { id: true, name: true, location: true },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.vendorOrder.count({ where }),
    ]);

    return {
      data: orders,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOrderById(vendorId: string, orderId: string) {
    const order = await this.prisma.vendorOrder.findFirst({
      where: { id: orderId, vendorId },
      include: {
        items: {
          include: {
            product: true,
          },
        },
        user: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
        vendor: {
          select: { id: true, name: true, location: true },
        },
      },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    return order;
  }

  async updateOrderStatus(
    vendorId: string,
    orderId: string,
    userId: string,
    dto: UpdateOrderStatusDto
  ) {
    await this.verifyVendorOwnership(vendorId, userId);

    const order = await this.prisma.vendorOrder.findFirst({
      where: { id: orderId, vendorId },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    // Validate status transitions
    const validTransitions: Record<string, string[]> = {
      PENDING: ['CONFIRMED', 'CANCELLED'],
      CONFIRMED: ['PREPARING', 'CANCELLED'],
      PREPARING: ['READY', 'CANCELLED'],
      READY: ['DELIVERED', 'CANCELLED'],
      DELIVERED: [],
      CANCELLED: [],
    };

    if (!validTransitions[order.status]?.includes(dto.status)) {
      throw new BadRequestException(`Cannot transition from ${order.status} to ${dto.status}`);
    }

    const updateData: Prisma.VendorOrderUpdateInput = {
      status: dto.status,
    };

    if (dto.status === OrderStatus.CONFIRMED && dto.estimatedReadyAt) {
      updateData.estimatedReadyAt = new Date(dto.estimatedReadyAt);
    }

    if (dto.status === OrderStatus.READY) {
      updateData.readyAt = new Date();
    }

    if (dto.status === OrderStatus.DELIVERED) {
      updateData.deliveredAt = new Date();
    }

    if (dto.status === OrderStatus.CANCELLED) {
      updateData.cancelledAt = new Date();
      updateData.cancelReason = dto.cancelReason;

      // Refund cashless payment if applicable
      if (order.cashlessTransactionId) {
        await this.refundCashlessPayment(order);
      }
    }

    return this.prisma.vendorOrder.update({
      where: { id: orderId },
      data: updateData,
      include: {
        items: true,
      },
    });
  }

  private async refundCashlessPayment(order: {
    id: string;
    userId: string;
    totalAmount: Prisma.Decimal;
    cashlessTransactionId: string | null;
    vendorId: string;
  }) {
    if (!order.cashlessTransactionId) {
      return;
    }

    const cashlessAccount = await this.prisma.cashlessAccount.findUnique({
      where: { userId: order.userId },
    });

    if (!cashlessAccount) {
      return;
    }

    const vendor = await this.prisma.vendor.findUnique({
      where: { id: order.vendorId },
      select: { festivalId: true, name: true },
    });

    if (!vendor) {
      return;
    }

    const refundAmount = Number(order.totalAmount);
    const balanceBefore = Number(cashlessAccount.balance);
    const balanceAfter = balanceBefore + refundAmount;

    await this.prisma.$transaction([
      this.prisma.cashlessAccount.update({
        where: { id: cashlessAccount.id },
        data: { balance: balanceAfter },
      }),
      this.prisma.cashlessTransaction.create({
        data: {
          accountId: cashlessAccount.id,
          festivalId: vendor.festivalId,
          type: 'REFUND',
          amount: refundAmount,
          balanceBefore,
          balanceAfter,
          description: `Refund: ${vendor.name} order cancelled`,
          metadata: { orderId: order.id },
        },
      }),
    ]);
  }

  // ==================== STATISTICS ====================

  async getVendorStats(vendorId: string, userId: string, query: QueryStatsDto) {
    await this.verifyVendorOwnership(vendorId, userId);

    const { startDate, endDate } = query;

    const dateFilter: Prisma.VendorOrderWhereInput = {
      vendorId,
      status: { not: 'CANCELLED' },
      ...(startDate && { createdAt: { gte: new Date(startDate) } }),
      ...(endDate && { createdAt: { lte: new Date(endDate) } }),
    };

    // Get basic stats
    const [orderStats, topProducts, revenueByPaymentMethod] = await Promise.all([
      // Order aggregates
      this.prisma.vendorOrder.aggregate({
        where: dateFilter,
        _sum: {
          totalAmount: true,
          commission: true,
          subtotal: true,
        },
        _count: {
          id: true,
        },
        _avg: {
          totalAmount: true,
        },
      }),

      // Top selling products
      this.prisma.vendorOrderItem.groupBy({
        by: ['productId', 'productName'],
        where: {
          order: dateFilter,
        },
        _sum: {
          quantity: true,
          totalPrice: true,
        },
        orderBy: {
          _sum: {
            quantity: 'desc',
          },
        },
        take: 10,
      }),

      // Revenue by payment method
      this.prisma.vendorOrder.groupBy({
        by: ['paymentMethod'],
        where: dateFilter,
        _sum: {
          totalAmount: true,
        },
        _count: {
          id: true,
        },
      }),
    ]);

    // Get order status breakdown
    const ordersByStatus = await this.prisma.vendorOrder.groupBy({
      by: ['status'],
      where: {
        vendorId,
        ...(startDate && { createdAt: { gte: new Date(startDate) } }),
        ...(endDate && { createdAt: { lte: new Date(endDate) } }),
      },
      _count: {
        id: true,
      },
    });

    return {
      summary: {
        totalOrders: orderStats._count.id,
        totalRevenue: orderStats._sum.totalAmount ?? 0,
        totalCommission: orderStats._sum.commission ?? 0,
        netRevenue: orderStats._sum.subtotal ?? 0,
        averageOrderValue: orderStats._avg.totalAmount ?? 0,
      },
      topProducts: topProducts.map((p) => ({
        productId: p.productId,
        productName: p.productName,
        quantitySold: p._sum.quantity ?? 0,
        revenue: p._sum.totalPrice ?? 0,
      })),
      revenueByPaymentMethod: revenueByPaymentMethod.map((r) => ({
        paymentMethod: r.paymentMethod,
        revenue: r._sum.totalAmount ?? 0,
        orderCount: r._count.id,
      })),
      ordersByStatus: ordersByStatus.map((s) => ({
        status: s.status,
        count: s._count.id,
      })),
    };
  }

  async exportVendorData(
    vendorId: string,
    userId: string,
    startDate: string,
    endDate: string,
    options?: { page?: number; limit?: number }
  ) {
    await this.verifyVendorOwnership(vendorId, userId);

    const page = options?.page ?? 1;
    // Export can have higher limit (1000) for bulk data export
    const limit = Math.min(options?.limit ?? 100, 1000);
    const skip = (page - 1) * limit;

    const where = {
      vendorId,
      createdAt: {
        gte: new Date(startDate),
        lte: new Date(endDate),
      },
    };

    const [orders, total] = await Promise.all([
      this.prisma.vendorOrder.findMany({
        where,
        include: {
          items: true,
          user: {
            select: { firstName: true, lastName: true, email: true },
          },
        },
        orderBy: { createdAt: 'asc' },
        skip,
        take: limit,
      }),
      this.prisma.vendorOrder.count({ where }),
    ]);

    const totalPages = Math.ceil(total / limit);

    // Format for export (CSV-ready)
    return {
      data: orders.map((order) => ({
        orderNumber: order.orderNumber,
        date: order.createdAt.toISOString(),
        customerName: `${order.user.firstName} ${order.user.lastName}`,
        customerEmail: order.user.email,
        status: order.status,
        paymentMethod: order.paymentMethod,
        itemCount: order.items.length,
        subtotal: Number(order.subtotal),
        commission: Number(order.commission),
        total: Number(order.totalAmount),
        items: order.items.map((item) => ({
          product: item.productName,
          quantity: item.quantity,
          unitPrice: Number(item.unitPrice),
          total: Number(item.totalPrice),
        })),
      })),
      meta: {
        total,
        page,
        limit,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
        dateRange: { startDate, endDate },
      },
    };
  }

  // ==================== PAYOUTS ====================

  async createPayout(vendorId: string, userId: string, dto: CreatePayoutDto) {
    await this.verifyVendorOwnership(vendorId, userId);

    const vendor = await this.prisma.vendor.findUnique({
      where: { id: vendorId },
    });

    if (!vendor) {
      throw new NotFoundException('Vendor not found');
    }

    const periodStart = new Date(dto.periodStart);
    const periodEnd = new Date(dto.periodEnd);

    // Check for overlapping payouts
    const existingPayout = await this.prisma.vendorPayout.findFirst({
      where: {
        vendorId,
        status: { in: ['PENDING', 'PROCESSING', 'COMPLETED'] },
        OR: [
          {
            periodStart: { lte: periodEnd },
            periodEnd: { gte: periodStart },
          },
        ],
      },
    });

    if (existingPayout) {
      throw new ConflictException('A payout already exists for this period');
    }

    // Calculate payout amount from completed orders
    const orderStats = await this.prisma.vendorOrder.aggregate({
      where: {
        vendorId,
        status: 'DELIVERED',
        createdAt: {
          gte: periodStart,
          lte: periodEnd,
        },
      },
      _sum: {
        subtotal: true,
        commission: true,
      },
      _count: {
        id: true,
      },
    });

    const amount = Number(orderStats._sum.subtotal ?? 0);
    const commission = Number(orderStats._sum.commission ?? 0);
    const netAmount = amount - commission;
    const orderCount = orderStats._count.id;

    if (netAmount <= 0) {
      throw new BadRequestException('No completed orders for this period');
    }

    // Generate payout reference
    const reference = this.generatePayoutReference(vendor.name);

    return this.prisma.vendorPayout.create({
      data: {
        vendorId,
        amount,
        commission,
        netAmount,
        periodStart,
        periodEnd,
        orderCount,
        bankAccount: dto.bankAccount,
        bankName: dto.bankName,
        reference,
        notes: dto.notes,
      },
    });
  }

  async findPayouts(vendorId: string, userId: string, options?: { page?: number; limit?: number }) {
    await this.verifyVendorOwnership(vendorId, userId);

    const page = options?.page ?? 1;
    const limit = Math.min(options?.limit ?? 20, 100);
    const skip = (page - 1) * limit;

    const [payouts, total] = await Promise.all([
      this.prisma.vendorPayout.findMany({
        where: { vendorId },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.vendorPayout.count({ where: { vendorId } }),
    ]);

    const totalPages = Math.ceil(total / limit);

    return {
      data: payouts,
      meta: {
        total,
        page,
        limit,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      },
    };
  }

  async findPayoutById(vendorId: string, payoutId: string, userId: string) {
    await this.verifyVendorOwnership(vendorId, userId);

    const payout = await this.prisma.vendorPayout.findFirst({
      where: { id: payoutId, vendorId },
    });

    if (!payout) {
      throw new NotFoundException('Payout not found');
    }

    return payout;
  }

  // ==================== INVENTORY MANAGEMENT ====================

  /**
   * Default low stock threshold when not specified per product
   */
  private readonly DEFAULT_LOW_STOCK_THRESHOLD = 10;

  /**
   * Check stock availability for a product
   * @param productId - The product ID
   * @param quantity - The requested quantity
   * @returns Object with availability status, available stock, and product info
   */
  async checkStockAvailability(
    productId: string,
    quantity: number
  ): Promise<{
    available: boolean;
    currentStock: number | null;
    requestedQuantity: number;
    product: { id: string; name: string; vendorId: string };
    isUnlimitedStock: boolean;
  }> {
    const product = await this.prisma.vendorProduct.findUnique({
      where: { id: productId },
      select: { id: true, name: true, stock: true, vendorId: true, isAvailable: true },
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    if (!product.isAvailable) {
      throw new BadRequestException(`Product ${product.name} is not available`);
    }

    // null stock means unlimited
    const isUnlimitedStock = product.stock === null;
    const available = isUnlimitedStock || (product.stock !== null && product.stock >= quantity);

    return {
      available,
      currentStock: product.stock,
      requestedQuantity: quantity,
      product: { id: product.id, name: product.name, vendorId: product.vendorId },
      isUnlimitedStock,
    };
  }

  /**
   * Decrement stock for a product after a successful purchase
   * @param productId - The product ID
   * @param quantity - The quantity to decrement
   * @returns Updated product with new stock level and low stock alert info
   */
  async decrementStock(
    productId: string,
    quantity: number
  ): Promise<{
    product: { id: string; name: string; stock: number | null; vendorId: string };
    previousStock: number | null;
    newStock: number | null;
    lowStockAlert: boolean;
    lowStockThreshold: number;
  }> {
    const product = await this.prisma.vendorProduct.findUnique({
      where: { id: productId },
      select: { id: true, name: true, stock: true, vendorId: true, isAvailable: true },
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    // Unlimited stock - no decrement needed
    if (product.stock === null) {
      return {
        product: { id: product.id, name: product.name, stock: null, vendorId: product.vendorId },
        previousStock: null,
        newStock: null,
        lowStockAlert: false,
        lowStockThreshold: this.DEFAULT_LOW_STOCK_THRESHOLD,
      };
    }

    // Check if sufficient stock
    if (product.stock < quantity) {
      throw new BadRequestException(
        `Insufficient stock for ${product.name}. Available: ${product.stock}, Requested: ${quantity}`
      );
    }

    const previousStock = product.stock;
    const newStock = previousStock - quantity;

    // Update stock
    const updatedProduct = await this.prisma.vendorProduct.update({
      where: { id: productId },
      data: {
        stock: newStock,
        soldCount: { increment: quantity },
      },
      select: { id: true, name: true, stock: true, vendorId: true },
    });

    const lowStockAlert = newStock <= this.DEFAULT_LOW_STOCK_THRESHOLD && newStock > 0;

    return {
      product: updatedProduct,
      previousStock,
      newStock,
      lowStockAlert,
      lowStockThreshold: this.DEFAULT_LOW_STOCK_THRESHOLD,
    };
  }

  /**
   * Bulk check stock availability for multiple products (used in order creation)
   * @param items - Array of product IDs and quantities
   * @returns Validation result with detailed stock info per product
   */
  async validateOrderStock(items: { productId: string; quantity: number }[]): Promise<{
    valid: boolean;
    errors: {
      productId: string;
      productName: string;
      requestedQuantity: number;
      availableStock: number | null;
      reason: 'OUT_OF_STOCK' | 'INSUFFICIENT_STOCK' | 'NOT_AVAILABLE' | 'NOT_FOUND';
    }[];
    validItems: {
      productId: string;
      productName: string;
      quantity: number;
      currentStock: number | null;
    }[];
  }> {
    const errors: {
      productId: string;
      productName: string;
      requestedQuantity: number;
      availableStock: number | null;
      reason: 'OUT_OF_STOCK' | 'INSUFFICIENT_STOCK' | 'NOT_AVAILABLE' | 'NOT_FOUND';
    }[] = [];

    const validItems: {
      productId: string;
      productName: string;
      quantity: number;
      currentStock: number | null;
    }[] = [];

    // Fetch all products in one query
    const productIds = items.map((item) => item.productId);
    const products = await this.prisma.vendorProduct.findMany({
      where: { id: { in: productIds } },
      select: { id: true, name: true, stock: true, isAvailable: true },
    });

    const productMap = new Map(products.map((p) => [p.id, p]));

    for (const item of items) {
      const product = productMap.get(item.productId);

      if (!product) {
        errors.push({
          productId: item.productId,
          productName: 'Unknown',
          requestedQuantity: item.quantity,
          availableStock: null,
          reason: 'NOT_FOUND',
        });
        continue;
      }

      if (!product.isAvailable) {
        errors.push({
          productId: item.productId,
          productName: product.name,
          requestedQuantity: item.quantity,
          availableStock: product.stock,
          reason: 'NOT_AVAILABLE',
        });
        continue;
      }

      // Unlimited stock
      if (product.stock === null) {
        validItems.push({
          productId: product.id,
          productName: product.name,
          quantity: item.quantity,
          currentStock: null,
        });
        continue;
      }

      // Out of stock
      if (product.stock === 0) {
        errors.push({
          productId: item.productId,
          productName: product.name,
          requestedQuantity: item.quantity,
          availableStock: 0,
          reason: 'OUT_OF_STOCK',
        });
        continue;
      }

      // Insufficient stock
      if (product.stock < item.quantity) {
        errors.push({
          productId: item.productId,
          productName: product.name,
          requestedQuantity: item.quantity,
          availableStock: product.stock,
          reason: 'INSUFFICIENT_STOCK',
        });
        continue;
      }

      // Valid item
      validItems.push({
        productId: product.id,
        productName: product.name,
        quantity: item.quantity,
        currentStock: product.stock,
      });
    }

    return {
      valid: errors.length === 0,
      errors,
      validItems,
    };
  }

  /**
   * Get products with low stock for a vendor
   * @param vendorId - The vendor ID
   * @param threshold - Stock threshold (defaults to DEFAULT_LOW_STOCK_THRESHOLD)
   * @returns Array of products with stock at or below threshold
   */
  async getLowStockProducts(
    vendorId: string,
    threshold?: number
  ): Promise<
    {
      id: string;
      name: string;
      stock: number;
      threshold: number;
      percentRemaining: number;
      category: string | null;
    }[]
  > {
    const stockThreshold = threshold ?? this.DEFAULT_LOW_STOCK_THRESHOLD;

    const products = await this.prisma.vendorProduct.findMany({
      where: {
        vendorId,
        isAvailable: true,
        stock: {
          not: null,
          lte: stockThreshold,
        },
      },
      select: {
        id: true,
        name: true,
        stock: true,
        category: true,
        soldCount: true,
      },
      orderBy: { stock: 'asc' },
    });

    return products.map((product) => ({
      id: product.id,
      name: product.name,
      stock: product.stock!,
      threshold: stockThreshold,
      percentRemaining: Math.round(((product.stock ?? 0) / stockThreshold) * 100),
      category: product.category,
    }));
  }

  /**
   * Get all out of stock products for a vendor
   * @param vendorId - The vendor ID
   * @returns Array of out of stock products
   */
  async getOutOfStockProducts(vendorId: string): Promise<
    {
      id: string;
      name: string;
      category: string | null;
      soldCount: number;
    }[]
  > {
    const products = await this.prisma.vendorProduct.findMany({
      where: {
        vendorId,
        isAvailable: true,
        stock: 0,
      },
      select: {
        id: true,
        name: true,
        category: true,
        soldCount: true,
      },
      orderBy: { name: 'asc' },
    });

    return products;
  }

  /**
   * Restore stock for a product (e.g., after order cancellation)
   * @param productId - The product ID
   * @param quantity - The quantity to restore
   * @returns Updated product with new stock level
   */
  async restoreStock(
    productId: string,
    quantity: number
  ): Promise<{
    product: { id: string; name: string; stock: number | null };
    previousStock: number | null;
    newStock: number | null;
  }> {
    const product = await this.prisma.vendorProduct.findUnique({
      where: { id: productId },
      select: { id: true, name: true, stock: true },
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    // Unlimited stock - no restore needed
    if (product.stock === null) {
      return {
        product: { id: product.id, name: product.name, stock: null },
        previousStock: null,
        newStock: null,
      };
    }

    const previousStock = product.stock;
    const newStock = previousStock + quantity;

    const updatedProduct = await this.prisma.vendorProduct.update({
      where: { id: productId },
      data: {
        stock: newStock,
        soldCount: { decrement: quantity },
      },
      select: { id: true, name: true, stock: true },
    });

    return {
      product: updatedProduct,
      previousStock,
      newStock,
    };
  }

  /**
   * Set stock level for a product (manual inventory update)
   * @param productId - The product ID
   * @param stock - New stock level (null for unlimited)
   * @returns Updated product
   */
  async setStock(
    vendorId: string,
    productId: string,
    userId: string,
    stock: number | null
  ): Promise<{
    product: { id: string; name: string; stock: number | null };
    previousStock: number | null;
    lowStockAlert: boolean;
  }> {
    await this.verifyVendorOwnership(vendorId, userId);

    const product = await this.prisma.vendorProduct.findFirst({
      where: { id: productId, vendorId },
      select: { id: true, name: true, stock: true },
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    const previousStock = product.stock;

    const updatedProduct = await this.prisma.vendorProduct.update({
      where: { id: productId },
      data: { stock },
      select: { id: true, name: true, stock: true },
    });

    const lowStockAlert = stock !== null && stock <= this.DEFAULT_LOW_STOCK_THRESHOLD && stock > 0;

    return {
      product: updatedProduct,
      previousStock,
      lowStockAlert,
    };
  }

  /**
   * Get inventory summary for a vendor
   * @param vendorId - The vendor ID
   * @returns Inventory summary statistics
   */
  async getInventorySummary(vendorId: string): Promise<{
    totalProducts: number;
    productsWithStock: number;
    productsWithUnlimitedStock: number;
    outOfStockCount: number;
    lowStockCount: number;
    totalStockValue: number;
    lowStockThreshold: number;
  }> {
    const vendor = await this.prisma.vendor.findUnique({
      where: { id: vendorId },
    });

    if (!vendor) {
      throw new NotFoundException('Vendor not found');
    }

    const [totalProducts, outOfStock, lowStock, unlimitedStock, stockedProducts] =
      await Promise.all([
        this.prisma.vendorProduct.count({
          where: { vendorId, isAvailable: true },
        }),
        this.prisma.vendorProduct.count({
          where: { vendorId, isAvailable: true, stock: 0 },
        }),
        this.prisma.vendorProduct.count({
          where: {
            vendorId,
            isAvailable: true,
            stock: { not: null, gt: 0, lte: this.DEFAULT_LOW_STOCK_THRESHOLD },
          },
        }),
        this.prisma.vendorProduct.count({
          where: { vendorId, isAvailable: true, stock: null },
        }),
        this.prisma.vendorProduct.findMany({
          where: { vendorId, isAvailable: true, stock: { not: null } },
          select: { stock: true, price: true },
        }),
      ]);

    const totalStockValue = stockedProducts.reduce((sum, p) => {
      return sum + (p.stock ?? 0) * Number(p.price);
    }, 0);

    return {
      totalProducts,
      productsWithStock: totalProducts - unlimitedStock,
      productsWithUnlimitedStock: unlimitedStock,
      outOfStockCount: outOfStock,
      lowStockCount: lowStock,
      totalStockValue: Math.round(totalStockValue * 100) / 100,
      lowStockThreshold: this.DEFAULT_LOW_STOCK_THRESHOLD,
    };
  }

  // ==================== HELPERS ====================

  private async verifyVendorOwnership(vendorId: string, userId: string) {
    const vendor = await this.prisma.vendor.findUnique({
      where: { id: vendorId },
    });

    if (!vendor) {
      throw new NotFoundException('Vendor not found');
    }

    // Check if user is owner or admin
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (vendor.ownerId !== userId && user.role !== 'ADMIN' && user.role !== 'ORGANIZER') {
      throw new ForbiddenException('You do not have permission to manage this vendor');
    }

    return vendor;
  }

  private generateQrMenuCode(): string {
    return `VND-${randomBytes(8).toString('hex').toUpperCase()}`;
  }

  private generateOrderNumber(vendorName: string): string {
    const prefix = vendorName
      .substring(0, 3)
      .toUpperCase()
      .replace(/[^A-Z]/g, 'X');
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = randomBytes(2).toString('hex').toUpperCase();
    return `${prefix}-${timestamp}-${random}`;
  }

  private generatePayoutReference(vendorName: string): string {
    const prefix = vendorName
      .substring(0, 3)
      .toUpperCase()
      .replace(/[^A-Z]/g, 'X');
    const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const random = randomBytes(4).toString('hex').toUpperCase();
    return `PAY-${prefix}-${date}-${random}`;
  }
}
