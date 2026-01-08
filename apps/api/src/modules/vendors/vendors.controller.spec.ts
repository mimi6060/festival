/**
 * Vendors Controller Unit Tests
 *
 * Comprehensive tests for vendor controller endpoints including:
 * - Vendor CRUD operations
 * - Product management
 * - Order management
 * - Statistics and exports
 * - Payout management
 * - User orders
 */

import { Test, TestingModule } from '@nestjs/testing';
import { VendorsController, UserOrdersController } from './vendors.controller';
import { VendorsService } from './vendors.service';
import { VendorType, VendorPaymentMethod, OrderStatus } from './dto';
import { Prisma } from '@prisma/client';
import {
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  ConflictException,
} from '@nestjs/common';

// ============================================================================
// Test Fixtures
// ============================================================================

const mockUser = { id: 'user-uuid-00000000-0000-0000-0000-000000000001' };
const _mockAdminUser = { id: 'admin-uuid-00000000-0000-0000-0000-000000000002' };

const mockFestival = {
  id: 'festival-uuid-00000000-0000-0000-0000-000000000001',
  name: 'Test Festival',
  slug: 'test-festival',
  currency: 'EUR',
};

const mockVendor = {
  id: 'vendor-uuid-00000000-0000-0000-0000-000000000001',
  festivalId: mockFestival.id,
  ownerId: mockUser.id,
  name: 'Burger Palace',
  type: VendorType.FOOD,
  description: 'Best burgers in town',
  qrMenuCode: 'VND-ABC12345',
  commissionRate: new Prisma.Decimal(10),
  isOpen: true,
  isActive: true,
  festival: { id: mockFestival.id, name: mockFestival.name, slug: mockFestival.slug },
  createdAt: new Date('2026-01-01'),
  updatedAt: new Date('2026-01-01'),
};

const mockProduct = {
  id: 'product-uuid-00000000-0000-0000-0000-000000000001',
  vendorId: mockVendor.id,
  name: 'Classic Burger',
  description: 'Juicy beef burger',
  price: new Prisma.Decimal(12.5),
  category: 'Burgers',
  stock: 100,
  isAvailable: true,
  sortOrder: 1,
  soldCount: 25,
  allergens: ['gluten', 'dairy'],
  createdAt: new Date('2026-01-01'),
  updatedAt: new Date('2026-01-01'),
};

const mockOrder = {
  id: 'order-uuid-00000000-0000-0000-0000-000000000001',
  orderNumber: 'BUR-ABC123-XY',
  vendorId: mockVendor.id,
  userId: mockUser.id,
  subtotal: new Prisma.Decimal(25),
  commission: new Prisma.Decimal(2.5),
  totalAmount: new Prisma.Decimal(25),
  paymentMethod: VendorPaymentMethod.CASHLESS,
  status: OrderStatus.PENDING,
  items: [],
  vendor: { id: mockVendor.id, name: mockVendor.name },
  createdAt: new Date('2026-07-01T12:00:00'),
  updatedAt: new Date('2026-07-01T12:00:00'),
};

const mockPayout = {
  id: 'payout-uuid-00000000-0000-0000-0000-000000000001',
  vendorId: mockVendor.id,
  amount: new Prisma.Decimal(1000),
  commission: new Prisma.Decimal(100),
  netAmount: new Prisma.Decimal(900),
  periodStart: new Date('2026-06-01'),
  periodEnd: new Date('2026-06-30'),
  orderCount: 50,
  status: 'PENDING',
  bankAccount: 'FR7612345678901234567890123',
  bankName: 'BNP Paribas',
  reference: 'PAY-BUR-20260701-ABCD1234',
  createdAt: new Date('2026-07-01'),
};

const mockStats = {
  summary: {
    totalOrders: 200,
    totalRevenue: new Prisma.Decimal(5000),
    totalCommission: new Prisma.Decimal(500),
    netRevenue: new Prisma.Decimal(4500),
    averageOrderValue: new Prisma.Decimal(25),
  },
  topProducts: [
    { productId: mockProduct.id, productName: mockProduct.name, quantitySold: 100, revenue: 1250 },
  ],
  revenueByPaymentMethod: [{ paymentMethod: 'CASHLESS', revenue: 4000, orderCount: 160 }],
  ordersByStatus: [{ status: 'DELIVERED', count: 180 }],
};

const mockPaginatedVendors = {
  data: [mockVendor],
  meta: { total: 1, page: 1, limit: 20, totalPages: 1 },
};

const mockPaginatedOrders = {
  data: [mockOrder],
  meta: { total: 1, page: 1, limit: 20, totalPages: 1 },
};

// ============================================================================
// VendorsController Tests
// ============================================================================

describe('VendorsController', () => {
  let controller: VendorsController;
  let vendorsService: jest.Mocked<VendorsService>;

  const mockVendorsService = {
    createVendor: jest.fn(),
    findAllVendors: jest.fn(),
    findVendorById: jest.fn(),
    findVendorByQrCode: jest.fn(),
    updateVendor: jest.fn(),
    deleteVendor: jest.fn(),
    regenerateQrMenuCode: jest.fn(),
    createProduct: jest.fn(),
    findAllProducts: jest.fn(),
    findProductById: jest.fn(),
    updateProduct: jest.fn(),
    deleteProduct: jest.fn(),
    updateProductStock: jest.fn(),
    createOrder: jest.fn(),
    findOrdersByVendor: jest.fn(),
    findOrderById: jest.fn(),
    findUserOrders: jest.fn(),
    updateOrderStatus: jest.fn(),
    getVendorStats: jest.fn(),
    exportVendorData: jest.fn(),
    createPayout: jest.fn(),
    findPayouts: jest.fn(),
    findPayoutById: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [VendorsController],
      providers: [{ provide: VendorsService, useValue: mockVendorsService }],
    }).compile();

    controller = module.get<VendorsController>(VendorsController);
    vendorsService = module.get(VendorsService);
  });

  // ==========================================================================
  // Controller instantiation
  // ==========================================================================

  describe('constructor', () => {
    it('should be defined', () => {
      expect(controller).toBeDefined();
    });
  });

  // ==========================================================================
  // Vendor CRUD endpoints
  // ==========================================================================

  describe('create (POST /vendors)', () => {
    const createVendorDto = {
      festivalId: mockFestival.id,
      name: 'New Vendor',
      type: VendorType.FOOD,
      description: 'New vendor description',
    };

    it('should create a vendor successfully', async () => {
      mockVendorsService.createVendor.mockResolvedValue(mockVendor);

      const result = await controller.create(createVendorDto, mockUser);

      expect(result).toEqual(mockVendor);
      expect(vendorsService.createVendor).toHaveBeenCalledWith(mockUser.id, createVendorDto);
    });

    it('should use dev-user-id when user is undefined', async () => {
      mockVendorsService.createVendor.mockResolvedValue(mockVendor);

      await controller.create(createVendorDto, undefined as unknown as { id: string });

      expect(vendorsService.createVendor).toHaveBeenCalledWith('dev-user-id', createVendorDto);
    });

    it('should propagate NotFoundException from service', async () => {
      mockVendorsService.createVendor.mockRejectedValue(
        new NotFoundException('Festival not found')
      );

      await expect(controller.create(createVendorDto, mockUser)).rejects.toThrow(NotFoundException);
    });
  });

  describe('findAll (GET /vendors)', () => {
    it('should return paginated vendors', async () => {
      mockVendorsService.findAllVendors.mockResolvedValue(mockPaginatedVendors);

      const result = await controller.findAll({ page: 1, limit: 20 });

      expect(result).toEqual(mockPaginatedVendors);
      expect(vendorsService.findAllVendors).toHaveBeenCalledWith({ page: 1, limit: 20 });
    });

    it('should pass all query filters to service', async () => {
      mockVendorsService.findAllVendors.mockResolvedValue(mockPaginatedVendors);
      const query = {
        festivalId: mockFestival.id,
        type: VendorType.FOOD,
        isOpen: true,
        search: 'burger',
        page: 2,
        limit: 10,
      };

      await controller.findAll(query);

      expect(vendorsService.findAllVendors).toHaveBeenCalledWith(query);
    });

    it('should return empty data when no vendors match', async () => {
      mockVendorsService.findAllVendors.mockResolvedValue({
        data: [],
        meta: { total: 0, page: 1, limit: 20, totalPages: 0 },
      });

      const result = await controller.findAll({});

      expect(result.data).toHaveLength(0);
      expect(result.meta.total).toBe(0);
    });
  });

  describe('getMenuByQrCode (GET /vendors/menu/:qrCode)', () => {
    it('should return vendor by QR code', async () => {
      mockVendorsService.findVendorByQrCode.mockResolvedValue(mockVendor);

      const result = await controller.getMenuByQrCode('VND-ABC12345');

      expect(result).toEqual(mockVendor);
      expect(vendorsService.findVendorByQrCode).toHaveBeenCalledWith('VND-ABC12345');
    });

    it('should propagate NotFoundException when QR code not found', async () => {
      mockVendorsService.findVendorByQrCode.mockRejectedValue(
        new NotFoundException('Vendor not found')
      );

      await expect(controller.getMenuByQrCode('INVALID')).rejects.toThrow(NotFoundException);
    });
  });

  describe('findOne (GET /vendors/:id)', () => {
    it('should return vendor by ID', async () => {
      mockVendorsService.findVendorById.mockResolvedValue(mockVendor);

      const result = await controller.findOne(mockVendor.id);

      expect(result).toEqual(mockVendor);
      expect(vendorsService.findVendorById).toHaveBeenCalledWith(mockVendor.id);
    });

    it('should propagate NotFoundException when vendor not found', async () => {
      mockVendorsService.findVendorById.mockRejectedValue(
        new NotFoundException('Vendor not found')
      );

      await expect(controller.findOne('non-existent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('update (PUT /vendors/:id)', () => {
    const updateDto = { name: 'Updated Vendor', isOpen: false };

    it('should update vendor successfully', async () => {
      mockVendorsService.updateVendor.mockResolvedValue({ ...mockVendor, ...updateDto });

      const result = await controller.update(mockVendor.id, updateDto, mockUser);

      expect(result.name).toBe(updateDto.name);
      expect(vendorsService.updateVendor).toHaveBeenCalledWith(
        mockVendor.id,
        mockUser.id,
        updateDto
      );
    });

    it('should use dev-user-id when user is undefined', async () => {
      mockVendorsService.updateVendor.mockResolvedValue({ ...mockVendor, ...updateDto });

      await controller.update(mockVendor.id, updateDto, undefined as unknown as { id: string });

      expect(vendorsService.updateVendor).toHaveBeenCalledWith(
        mockVendor.id,
        'dev-user-id',
        updateDto
      );
    });

    it('should propagate ForbiddenException for unauthorized user', async () => {
      mockVendorsService.updateVendor.mockRejectedValue(new ForbiddenException('Not authorized'));

      await expect(controller.update(mockVendor.id, updateDto, mockUser)).rejects.toThrow(
        ForbiddenException
      );
    });
  });

  describe('remove (DELETE /vendors/:id)', () => {
    it('should delete vendor successfully', async () => {
      mockVendorsService.deleteVendor.mockResolvedValue({ ...mockVendor, isActive: false });

      await controller.remove(mockVendor.id, mockUser);

      expect(vendorsService.deleteVendor).toHaveBeenCalledWith(mockVendor.id, mockUser.id);
    });

    it('should use dev-user-id when user is undefined', async () => {
      mockVendorsService.deleteVendor.mockResolvedValue({ ...mockVendor, isActive: false });

      await controller.remove(mockVendor.id, undefined as unknown as { id: string });

      expect(vendorsService.deleteVendor).toHaveBeenCalledWith(mockVendor.id, 'dev-user-id');
    });

    it('should propagate ForbiddenException', async () => {
      mockVendorsService.deleteVendor.mockRejectedValue(new ForbiddenException('Not authorized'));

      await expect(controller.remove(mockVendor.id, mockUser)).rejects.toThrow(ForbiddenException);
    });
  });

  describe('regenerateQrCode (POST /vendors/:id/regenerate-qr)', () => {
    it('should regenerate QR code', async () => {
      const newQr = { id: mockVendor.id, qrMenuCode: 'VND-NEWCODE123' };
      mockVendorsService.regenerateQrMenuCode.mockResolvedValue(newQr);

      const result = await controller.regenerateQrCode(mockVendor.id, mockUser);

      expect(result.qrMenuCode).toBe('VND-NEWCODE123');
      expect(vendorsService.regenerateQrMenuCode).toHaveBeenCalledWith(mockVendor.id, mockUser.id);
    });

    it('should use dev-user-id when user is undefined', async () => {
      mockVendorsService.regenerateQrMenuCode.mockResolvedValue({
        id: mockVendor.id,
        qrMenuCode: 'NEW',
      });

      await controller.regenerateQrCode(mockVendor.id, undefined as unknown as { id: string });

      expect(vendorsService.regenerateQrMenuCode).toHaveBeenCalledWith(
        mockVendor.id,
        'dev-user-id'
      );
    });
  });

  // ==========================================================================
  // Product endpoints
  // ==========================================================================

  describe('createProduct (POST /vendors/:id/products)', () => {
    const createProductDto = {
      name: 'New Product',
      price: 15.0,
      category: 'Burgers',
    };

    it('should create product successfully', async () => {
      mockVendorsService.createProduct.mockResolvedValue(mockProduct);

      const result = await controller.createProduct(mockVendor.id, createProductDto, mockUser);

      expect(result).toEqual(mockProduct);
      expect(vendorsService.createProduct).toHaveBeenCalledWith(
        mockVendor.id,
        mockUser.id,
        createProductDto
      );
    });

    it('should use dev-user-id when user is undefined', async () => {
      mockVendorsService.createProduct.mockResolvedValue(mockProduct);

      await controller.createProduct(
        mockVendor.id,
        createProductDto,
        undefined as unknown as { id: string }
      );

      expect(vendorsService.createProduct).toHaveBeenCalledWith(
        mockVendor.id,
        'dev-user-id',
        createProductDto
      );
    });

    it('should propagate NotFoundException when vendor not found', async () => {
      mockVendorsService.createProduct.mockRejectedValue(new NotFoundException('Vendor not found'));

      await expect(
        controller.createProduct('non-existent', createProductDto, mockUser)
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('findAllProducts (GET /vendors/:id/products)', () => {
    it('should return all products for vendor', async () => {
      const paginatedResponse = {
        data: [mockProduct],
        meta: {
          total: 1,
          page: 1,
          limit: 20,
          totalPages: 1,
          hasNextPage: false,
          hasPrevPage: false,
        },
      };
      mockVendorsService.findAllProducts.mockResolvedValue(paginatedResponse);

      const result = await controller.findAllProducts(mockVendor.id, {});

      expect(result.data).toHaveLength(1);
      expect(vendorsService.findAllProducts).toHaveBeenCalledWith(mockVendor.id, {
        page: undefined,
        limit: undefined,
      });
    });

    it('should return empty array when no products', async () => {
      const paginatedResponse = {
        data: [],
        meta: {
          total: 0,
          page: 1,
          limit: 20,
          totalPages: 0,
          hasNextPage: false,
          hasPrevPage: false,
        },
      };
      mockVendorsService.findAllProducts.mockResolvedValue(paginatedResponse);

      const result = await controller.findAllProducts(mockVendor.id, {});

      expect(result.data).toHaveLength(0);
    });
  });

  describe('findProduct (GET /vendors/:id/products/:productId)', () => {
    it('should return product by ID', async () => {
      mockVendorsService.findProductById.mockResolvedValue(mockProduct);

      const result = await controller.findProduct(mockVendor.id, mockProduct.id);

      expect(result).toEqual(mockProduct);
      expect(vendorsService.findProductById).toHaveBeenCalledWith(mockVendor.id, mockProduct.id);
    });

    it('should propagate NotFoundException', async () => {
      mockVendorsService.findProductById.mockRejectedValue(
        new NotFoundException('Product not found')
      );

      await expect(controller.findProduct(mockVendor.id, 'non-existent')).rejects.toThrow(
        NotFoundException
      );
    });
  });

  describe('updateProduct (PUT /vendors/:id/products/:productId)', () => {
    const updateDto = { name: 'Updated Product', price: 18.0 };

    it('should update product successfully', async () => {
      mockVendorsService.updateProduct.mockResolvedValue({ ...mockProduct, ...updateDto });

      const result = await controller.updateProduct(
        mockVendor.id,
        mockProduct.id,
        updateDto,
        mockUser
      );

      expect(result.name).toBe(updateDto.name);
      expect(vendorsService.updateProduct).toHaveBeenCalledWith(
        mockVendor.id,
        mockProduct.id,
        mockUser.id,
        updateDto
      );
    });

    it('should use dev-user-id when user is undefined', async () => {
      mockVendorsService.updateProduct.mockResolvedValue({ ...mockProduct, ...updateDto });

      await controller.updateProduct(
        mockVendor.id,
        mockProduct.id,
        updateDto,
        undefined as unknown as { id: string }
      );

      expect(vendorsService.updateProduct).toHaveBeenCalledWith(
        mockVendor.id,
        mockProduct.id,
        'dev-user-id',
        updateDto
      );
    });
  });

  describe('deleteProduct (DELETE /vendors/:id/products/:productId)', () => {
    it('should delete product successfully', async () => {
      mockVendorsService.deleteProduct.mockResolvedValue(mockProduct);

      await controller.deleteProduct(mockVendor.id, mockProduct.id, mockUser);

      expect(vendorsService.deleteProduct).toHaveBeenCalledWith(
        mockVendor.id,
        mockProduct.id,
        mockUser.id
      );
    });

    it('should use dev-user-id when user is undefined', async () => {
      mockVendorsService.deleteProduct.mockResolvedValue(mockProduct);

      await controller.deleteProduct(
        mockVendor.id,
        mockProduct.id,
        undefined as unknown as { id: string }
      );

      expect(vendorsService.deleteProduct).toHaveBeenCalledWith(
        mockVendor.id,
        mockProduct.id,
        'dev-user-id'
      );
    });
  });

  describe('updateStock (PATCH /vendors/:id/products/:productId/stock)', () => {
    it('should update product stock', async () => {
      mockVendorsService.updateProductStock.mockResolvedValue({ ...mockProduct, stock: 200 });

      const result = await controller.updateStock(
        mockVendor.id,
        mockProduct.id,
        { stock: 200 },
        mockUser
      );

      expect(result.stock).toBe(200);
      expect(vendorsService.updateProductStock).toHaveBeenCalledWith(
        mockVendor.id,
        mockProduct.id,
        mockUser.id,
        200
      );
    });

    it('should set stock to null for unlimited', async () => {
      mockVendorsService.updateProductStock.mockResolvedValue({ ...mockProduct, stock: null });

      const result = await controller.updateStock(
        mockVendor.id,
        mockProduct.id,
        { stock: null },
        mockUser
      );

      expect(result.stock).toBeNull();
      expect(vendorsService.updateProductStock).toHaveBeenCalledWith(
        mockVendor.id,
        mockProduct.id,
        mockUser.id,
        null
      );
    });

    it('should use dev-user-id when user is undefined', async () => {
      mockVendorsService.updateProductStock.mockResolvedValue({ ...mockProduct, stock: 50 });

      await controller.updateStock(
        mockVendor.id,
        mockProduct.id,
        { stock: 50 },
        undefined as unknown as { id: string }
      );

      expect(vendorsService.updateProductStock).toHaveBeenCalledWith(
        mockVendor.id,
        mockProduct.id,
        'dev-user-id',
        50
      );
    });
  });

  // ==========================================================================
  // Order endpoints
  // ==========================================================================

  describe('createOrder (POST /vendors/:id/orders)', () => {
    const createOrderDto = {
      items: [{ productId: mockProduct.id, quantity: 2 }],
      paymentMethod: VendorPaymentMethod.CASHLESS,
    };

    it('should create order successfully', async () => {
      mockVendorsService.createOrder.mockResolvedValue(mockOrder);

      const result = await controller.createOrder(mockVendor.id, createOrderDto, mockUser);

      expect(result).toEqual(mockOrder);
      expect(vendorsService.createOrder).toHaveBeenCalledWith(
        mockVendor.id,
        mockUser.id,
        createOrderDto
      );
    });

    it('should use dev-user-id when user is undefined', async () => {
      mockVendorsService.createOrder.mockResolvedValue(mockOrder);

      await controller.createOrder(
        mockVendor.id,
        createOrderDto,
        undefined as unknown as { id: string }
      );

      expect(vendorsService.createOrder).toHaveBeenCalledWith(
        mockVendor.id,
        'dev-user-id',
        createOrderDto
      );
    });

    it('should propagate BadRequestException when vendor is closed', async () => {
      mockVendorsService.createOrder.mockRejectedValue(
        new BadRequestException('Vendor is currently closed')
      );

      await expect(controller.createOrder(mockVendor.id, createOrderDto, mockUser)).rejects.toThrow(
        BadRequestException
      );
    });

    it('should propagate BadRequestException when insufficient balance', async () => {
      mockVendorsService.createOrder.mockRejectedValue(
        new BadRequestException('Insufficient cashless balance')
      );

      await expect(controller.createOrder(mockVendor.id, createOrderDto, mockUser)).rejects.toThrow(
        BadRequestException
      );
    });
  });

  describe('findVendorOrders (GET /vendors/:id/orders)', () => {
    it('should return paginated orders for vendor', async () => {
      mockVendorsService.findOrdersByVendor.mockResolvedValue(mockPaginatedOrders);

      const result = await controller.findVendorOrders(
        mockVendor.id,
        { page: 1, limit: 20 },
        mockUser
      );

      expect(result).toEqual(mockPaginatedOrders);
      expect(vendorsService.findOrdersByVendor).toHaveBeenCalledWith(mockVendor.id, mockUser.id, {
        page: 1,
        limit: 20,
      });
    });

    it('should pass all query filters to service', async () => {
      mockVendorsService.findOrdersByVendor.mockResolvedValue(mockPaginatedOrders);
      const query = {
        status: OrderStatus.PENDING,
        userId: mockUser.id,
        startDate: '2026-06-01',
        endDate: '2026-06-30',
        page: 1,
        limit: 10,
      };

      await controller.findVendorOrders(mockVendor.id, query, mockUser);

      expect(vendorsService.findOrdersByVendor).toHaveBeenCalledWith(
        mockVendor.id,
        mockUser.id,
        query
      );
    });

    it('should use dev-user-id when user is undefined', async () => {
      mockVendorsService.findOrdersByVendor.mockResolvedValue(mockPaginatedOrders);

      await controller.findVendorOrders(mockVendor.id, {}, undefined as unknown as { id: string });

      expect(vendorsService.findOrdersByVendor).toHaveBeenCalledWith(
        mockVendor.id,
        'dev-user-id',
        {}
      );
    });
  });

  describe('findOrder (GET /vendors/:id/orders/:orderId)', () => {
    it('should return order by ID', async () => {
      mockVendorsService.findOrderById.mockResolvedValue(mockOrder);

      const result = await controller.findOrder(mockVendor.id, mockOrder.id);

      expect(result).toEqual(mockOrder);
      expect(vendorsService.findOrderById).toHaveBeenCalledWith(mockVendor.id, mockOrder.id);
    });

    it('should propagate NotFoundException', async () => {
      mockVendorsService.findOrderById.mockRejectedValue(new NotFoundException('Order not found'));

      await expect(controller.findOrder(mockVendor.id, 'non-existent')).rejects.toThrow(
        NotFoundException
      );
    });
  });

  describe('updateOrderStatus (PATCH /vendors/:id/orders/:orderId/status)', () => {
    it('should update order status to CONFIRMED', async () => {
      const dto = { status: OrderStatus.CONFIRMED };
      mockVendorsService.updateOrderStatus.mockResolvedValue({
        ...mockOrder,
        status: OrderStatus.CONFIRMED,
      });

      const result = await controller.updateOrderStatus(mockVendor.id, mockOrder.id, dto, mockUser);

      expect(result.status).toBe(OrderStatus.CONFIRMED);
      expect(vendorsService.updateOrderStatus).toHaveBeenCalledWith(
        mockVendor.id,
        mockOrder.id,
        mockUser.id,
        dto
      );
    });

    it('should update order status with estimatedReadyAt', async () => {
      const dto = {
        status: OrderStatus.CONFIRMED,
        estimatedReadyAt: '2026-07-01T12:30:00Z',
      };
      mockVendorsService.updateOrderStatus.mockResolvedValue({
        ...mockOrder,
        status: OrderStatus.CONFIRMED,
        estimatedReadyAt: new Date(dto.estimatedReadyAt),
      });

      const result = await controller.updateOrderStatus(mockVendor.id, mockOrder.id, dto, mockUser);

      expect(result.status).toBe(OrderStatus.CONFIRMED);
    });

    it('should update order status to CANCELLED with reason', async () => {
      const dto = { status: OrderStatus.CANCELLED, cancelReason: 'Out of stock' };
      mockVendorsService.updateOrderStatus.mockResolvedValue({
        ...mockOrder,
        status: OrderStatus.CANCELLED,
        cancelledAt: new Date(),
        cancelReason: 'Out of stock',
      });

      const result = await controller.updateOrderStatus(mockVendor.id, mockOrder.id, dto, mockUser);

      expect(result.status).toBe(OrderStatus.CANCELLED);
    });

    it('should use dev-user-id when user is undefined', async () => {
      mockVendorsService.updateOrderStatus.mockResolvedValue(mockOrder);

      await controller.updateOrderStatus(
        mockVendor.id,
        mockOrder.id,
        { status: OrderStatus.CONFIRMED },
        undefined as unknown as { id: string }
      );

      expect(vendorsService.updateOrderStatus).toHaveBeenCalledWith(
        mockVendor.id,
        mockOrder.id,
        'dev-user-id',
        { status: OrderStatus.CONFIRMED }
      );
    });

    it('should propagate BadRequestException for invalid transition', async () => {
      mockVendorsService.updateOrderStatus.mockRejectedValue(
        new BadRequestException('Cannot transition from PENDING to DELIVERED')
      );

      await expect(
        controller.updateOrderStatus(
          mockVendor.id,
          mockOrder.id,
          { status: OrderStatus.DELIVERED },
          mockUser
        )
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ==========================================================================
  // Statistics and exports
  // ==========================================================================

  describe('getStats (GET /vendors/:id/stats)', () => {
    it('should return vendor statistics', async () => {
      mockVendorsService.getVendorStats.mockResolvedValue(mockStats);

      const result = await controller.getStats(mockVendor.id, {}, mockUser);

      expect(result).toEqual(mockStats);
      expect(vendorsService.getVendorStats).toHaveBeenCalledWith(mockVendor.id, mockUser.id, {});
    });

    it('should pass date range to service', async () => {
      mockVendorsService.getVendorStats.mockResolvedValue(mockStats);
      const query = { startDate: '2026-06-01', endDate: '2026-06-30' };

      await controller.getStats(mockVendor.id, query, mockUser);

      expect(vendorsService.getVendorStats).toHaveBeenCalledWith(mockVendor.id, mockUser.id, query);
    });

    it('should use dev-user-id when user is undefined', async () => {
      mockVendorsService.getVendorStats.mockResolvedValue(mockStats);

      await controller.getStats(mockVendor.id, {}, undefined as unknown as { id: string });

      expect(vendorsService.getVendorStats).toHaveBeenCalledWith(mockVendor.id, 'dev-user-id', {});
    });

    it('should propagate ForbiddenException', async () => {
      mockVendorsService.getVendorStats.mockRejectedValue(new ForbiddenException('Not authorized'));

      await expect(controller.getStats(mockVendor.id, {}, mockUser)).rejects.toThrow(
        ForbiddenException
      );
    });
  });

  describe('exportData (GET /vendors/:id/export)', () => {
    const exportResult = {
      data: [
        {
          orderNumber: mockOrder.orderNumber,
          date: mockOrder.createdAt.toISOString(),
          customerName: 'John Doe',
          customerEmail: 'john@example.com',
          status: mockOrder.status,
          paymentMethod: mockOrder.paymentMethod,
          itemCount: 2,
          subtotal: 25,
          commission: 2.5,
          total: 25,
          items: [],
        },
      ],
      meta: {
        total: 1,
        page: 1,
        limit: 100,
        totalPages: 1,
        hasNextPage: false,
        hasPrevPage: false,
        dateRange: { startDate: '2026-06-01', endDate: '2026-06-30' },
      },
    };

    it('should export vendor data for date range', async () => {
      mockVendorsService.exportVendorData.mockResolvedValue(exportResult);

      const result = await controller.exportData(
        mockVendor.id,
        { startDate: '2026-06-01', endDate: '2026-06-30' },
        mockUser
      );

      expect(result).toEqual(exportResult);
      expect(vendorsService.exportVendorData).toHaveBeenCalledWith(
        mockVendor.id,
        mockUser.id,
        '2026-06-01',
        '2026-06-30',
        { page: undefined, limit: undefined }
      );
    });

    it('should use dev-user-id when user is undefined', async () => {
      mockVendorsService.exportVendorData.mockResolvedValue(exportResult);

      await controller.exportData(
        mockVendor.id,
        { startDate: '2026-06-01', endDate: '2026-06-30' },
        undefined as unknown as { id: string }
      );

      expect(vendorsService.exportVendorData).toHaveBeenCalledWith(
        mockVendor.id,
        'dev-user-id',
        '2026-06-01',
        '2026-06-30',
        { page: undefined, limit: undefined }
      );
    });
  });

  // ==========================================================================
  // Payout endpoints
  // ==========================================================================

  describe('createPayout (POST /vendors/:id/payouts)', () => {
    const createPayoutDto = {
      periodStart: '2026-06-01',
      periodEnd: '2026-06-30',
      bankAccount: 'FR7612345678901234567890123',
      bankName: 'BNP Paribas',
    };

    it('should create payout successfully', async () => {
      mockVendorsService.createPayout.mockResolvedValue(mockPayout);

      const result = await controller.createPayout(mockVendor.id, createPayoutDto, mockUser);

      expect(result).toEqual(mockPayout);
      expect(vendorsService.createPayout).toHaveBeenCalledWith(
        mockVendor.id,
        mockUser.id,
        createPayoutDto
      );
    });

    it('should use dev-user-id when user is undefined', async () => {
      mockVendorsService.createPayout.mockResolvedValue(mockPayout);

      await controller.createPayout(
        mockVendor.id,
        createPayoutDto,
        undefined as unknown as { id: string }
      );

      expect(vendorsService.createPayout).toHaveBeenCalledWith(
        mockVendor.id,
        'dev-user-id',
        createPayoutDto
      );
    });

    it('should propagate ConflictException for overlapping period', async () => {
      mockVendorsService.createPayout.mockRejectedValue(
        new ConflictException('A payout already exists for this period')
      );

      await expect(
        controller.createPayout(mockVendor.id, createPayoutDto, mockUser)
      ).rejects.toThrow(ConflictException);
    });

    it('should propagate BadRequestException when no orders for period', async () => {
      mockVendorsService.createPayout.mockRejectedValue(
        new BadRequestException('No completed orders for this period')
      );

      await expect(
        controller.createPayout(mockVendor.id, createPayoutDto, mockUser)
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('findPayouts (GET /vendors/:id/payouts)', () => {
    it('should return list of payouts', async () => {
      const paginatedResponse = {
        data: [mockPayout],
        meta: {
          total: 1,
          page: 1,
          limit: 20,
          totalPages: 1,
          hasNextPage: false,
          hasPrevPage: false,
        },
      };
      mockVendorsService.findPayouts.mockResolvedValue(paginatedResponse);

      const result = await controller.findPayouts(mockVendor.id, {}, mockUser);

      expect(result.data).toHaveLength(1);
      expect(vendorsService.findPayouts).toHaveBeenCalledWith(mockVendor.id, mockUser.id, {
        page: undefined,
        limit: undefined,
      });
    });

    it('should use dev-user-id when user is undefined', async () => {
      const paginatedResponse = {
        data: [mockPayout],
        meta: {
          total: 1,
          page: 1,
          limit: 20,
          totalPages: 1,
          hasNextPage: false,
          hasPrevPage: false,
        },
      };
      mockVendorsService.findPayouts.mockResolvedValue(paginatedResponse);

      await controller.findPayouts(mockVendor.id, {}, undefined as unknown as { id: string });

      expect(vendorsService.findPayouts).toHaveBeenCalledWith(mockVendor.id, 'dev-user-id', {
        page: undefined,
        limit: undefined,
      });
    });
  });

  describe('findPayout (GET /vendors/:id/payouts/:payoutId)', () => {
    it('should return payout by ID', async () => {
      mockVendorsService.findPayoutById.mockResolvedValue(mockPayout);

      const result = await controller.findPayout(mockVendor.id, mockPayout.id, mockUser);

      expect(result).toEqual(mockPayout);
      expect(vendorsService.findPayoutById).toHaveBeenCalledWith(
        mockVendor.id,
        mockPayout.id,
        mockUser.id
      );
    });

    it('should use dev-user-id when user is undefined', async () => {
      mockVendorsService.findPayoutById.mockResolvedValue(mockPayout);

      await controller.findPayout(
        mockVendor.id,
        mockPayout.id,
        undefined as unknown as { id: string }
      );

      expect(vendorsService.findPayoutById).toHaveBeenCalledWith(
        mockVendor.id,
        mockPayout.id,
        'dev-user-id'
      );
    });

    it('should propagate NotFoundException', async () => {
      mockVendorsService.findPayoutById.mockRejectedValue(
        new NotFoundException('Payout not found')
      );

      await expect(controller.findPayout(mockVendor.id, 'non-existent', mockUser)).rejects.toThrow(
        NotFoundException
      );
    });
  });
});

// ============================================================================
// UserOrdersController Tests
// ============================================================================

describe('UserOrdersController', () => {
  let controller: UserOrdersController;
  let vendorsService: jest.Mocked<VendorsService>;

  const mockVendorsService = {
    findUserOrders: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [UserOrdersController],
      providers: [{ provide: VendorsService, useValue: mockVendorsService }],
    }).compile();

    controller = module.get<UserOrdersController>(UserOrdersController);
    vendorsService = module.get(VendorsService);
  });

  describe('constructor', () => {
    it('should be defined', () => {
      expect(controller).toBeDefined();
    });
  });

  describe('findMyOrders (GET /my-orders)', () => {
    it('should return paginated user orders', async () => {
      mockVendorsService.findUserOrders.mockResolvedValue(mockPaginatedOrders);

      const result = await controller.findMyOrders({ page: 1, limit: 20 }, mockUser);

      expect(result).toEqual(mockPaginatedOrders);
      expect(vendorsService.findUserOrders).toHaveBeenCalledWith(mockUser.id, {
        page: 1,
        limit: 20,
      });
    });

    it('should pass all query filters to service', async () => {
      mockVendorsService.findUserOrders.mockResolvedValue(mockPaginatedOrders);
      const query = {
        status: OrderStatus.DELIVERED,
        startDate: '2026-06-01',
        endDate: '2026-06-30',
        page: 2,
        limit: 10,
      };

      await controller.findMyOrders(query, mockUser);

      expect(vendorsService.findUserOrders).toHaveBeenCalledWith(mockUser.id, query);
    });

    it('should use dev-user-id when user is undefined', async () => {
      mockVendorsService.findUserOrders.mockResolvedValue(mockPaginatedOrders);

      await controller.findMyOrders({}, undefined as unknown as { id: string });

      expect(vendorsService.findUserOrders).toHaveBeenCalledWith('dev-user-id', {});
    });

    it('should return empty data when no orders', async () => {
      mockVendorsService.findUserOrders.mockResolvedValue({
        data: [],
        meta: { total: 0, page: 1, limit: 20, totalPages: 0 },
      });

      const result = await controller.findMyOrders({}, mockUser);

      expect(result.data).toHaveLength(0);
      expect(result.meta.total).toBe(0);
    });
  });
});
