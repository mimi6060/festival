import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
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

  async findAllProducts(vendorId: string) {
    const vendor = await this.prisma.vendor.findUnique({
      where: { id: vendorId },
    });

    if (!vendor) {
      throw new NotFoundException('Vendor not found');
    }

    return this.prisma.vendorProduct.findMany({
      where: { vendorId },
      orderBy: [{ sortOrder: 'asc' }, { category: 'asc' }, { name: 'asc' }],
    });
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

  async updateProduct(
    vendorId: string,
    productId: string,
    userId: string,
    dto: UpdateProductDto,
  ) {
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
    stock: number | null,
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
          `Insufficient stock for ${product.name}. Available: ${product.stock}`,
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
          `Insufficient cashless balance. Required: ${totalAmount}, Available: ${cashlessAccount.balance}`,
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
    dto: UpdateOrderStatusDto,
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
      throw new BadRequestException(
        `Cannot transition from ${order.status} to ${dto.status}`,
      );
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
    if (!order.cashlessTransactionId) {return;}

    const cashlessAccount = await this.prisma.cashlessAccount.findUnique({
      where: { userId: order.userId },
    });

    if (!cashlessAccount) {return;}

    const vendor = await this.prisma.vendor.findUnique({
      where: { id: order.vendorId },
      select: { festivalId: true, name: true },
    });

    if (!vendor) {return;}

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

  async exportVendorData(vendorId: string, userId: string, startDate: string, endDate: string) {
    await this.verifyVendorOwnership(vendorId, userId);

    const orders = await this.prisma.vendorOrder.findMany({
      where: {
        vendorId,
        createdAt: {
          gte: new Date(startDate),
          lte: new Date(endDate),
        },
      },
      include: {
        items: true,
        user: {
          select: { firstName: true, lastName: true, email: true },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    // Format for export (CSV-ready)
    return orders.map((order) => ({
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
    }));
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

  async findPayouts(vendorId: string, userId: string) {
    await this.verifyVendorOwnership(vendorId, userId);

    return this.prisma.vendorPayout.findMany({
      where: { vendorId },
      orderBy: { createdAt: 'desc' },
    });
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
    const prefix = vendorName.substring(0, 3).toUpperCase().replace(/[^A-Z]/g, 'X');
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = randomBytes(2).toString('hex').toUpperCase();
    return `${prefix}-${timestamp}-${random}`;
  }

  private generatePayoutReference(vendorName: string): string {
    const prefix = vendorName.substring(0, 3).toUpperCase().replace(/[^A-Z]/g, 'X');
    const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const random = randomBytes(4).toString('hex').toUpperCase();
    return `PAY-${prefix}-${date}-${random}`;
  }
}
