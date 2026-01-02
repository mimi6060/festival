import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { VendorType, OrderStatus } from '@prisma/client';

export class MenuItemResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  vendorId: string;

  @ApiProperty()
  name: string;

  @ApiPropertyOptional()
  description?: string;

  @ApiProperty()
  price: number;

  @ApiPropertyOptional()
  category?: string;

  @ApiPropertyOptional()
  imageUrl?: string;

  @ApiProperty()
  isAvailable: boolean;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}

export class VendorResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  festivalId: string;

  @ApiProperty()
  name: string;

  @ApiProperty({ enum: VendorType })
  type: VendorType;

  @ApiPropertyOptional()
  description?: string;

  @ApiPropertyOptional()
  logoUrl?: string;

  @ApiPropertyOptional()
  location?: string;

  @ApiProperty()
  isOpen: boolean;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;

  @ApiPropertyOptional({ type: [MenuItemResponseDto] })
  menuItems?: MenuItemResponseDto[];
}

export class OrderItemDetailDto {
  @ApiProperty()
  menuItemId: string;

  @ApiProperty()
  menuItemName: string;

  @ApiProperty()
  quantity: number;

  @ApiProperty()
  unitPrice: number;

  @ApiProperty()
  subtotal: number;
}

export class OrderResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  vendorId: string;

  @ApiProperty()
  userId: string;

  @ApiProperty({ type: [OrderItemDetailDto] })
  items: OrderItemDetailDto[];

  @ApiProperty()
  totalAmount: number;

  @ApiProperty({ enum: OrderStatus })
  status: OrderStatus;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;

  @ApiPropertyOptional()
  vendor?: VendorResponseDto;
}

export class PaginatedVendorsDto {
  @ApiProperty({ type: [VendorResponseDto] })
  data: VendorResponseDto[];

  @ApiProperty()
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
}

export class VendorDashboardStatsDto {
  @ApiProperty()
  vendorId: string;

  @ApiProperty()
  vendorName: string;

  @ApiProperty()
  totalOrders: number;

  @ApiProperty()
  pendingOrders: number;

  @ApiProperty()
  preparingOrders: number;

  @ApiProperty()
  readyOrders: number;

  @ApiProperty()
  deliveredOrders: number;

  @ApiProperty()
  cancelledOrders: number;

  @ApiProperty()
  totalRevenue: number;

  @ApiProperty()
  averageOrderValue: number;

  @ApiProperty()
  currency: string;

  @ApiProperty({ type: [Object] })
  topSellingItems: {
    menuItemId: string;
    menuItemName: string;
    quantitySold: number;
    revenue: number;
  }[];

  @ApiProperty({ type: [Object] })
  salesByHour: {
    hour: number;
    orderCount: number;
    revenue: number;
  }[];
}
