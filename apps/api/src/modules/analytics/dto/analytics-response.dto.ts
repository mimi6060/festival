import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * Response wrapper for analytics endpoints
 */
export class AnalyticsResponseDto<T> {
  @ApiProperty({ description: 'Whether the request was successful' })
  success!: boolean;

  @ApiProperty({ description: 'Response data' })
  data!: T;

  @ApiProperty({ description: 'Timestamp when the data was generated' })
  generatedAt!: Date;

  @ApiPropertyOptional({ description: 'Cache information' })
  cache?: {
    hit: boolean;
    ttl: number;
    key: string;
  };
}

/**
 * Dashboard KPIs response
 */
export class DashboardResponseDto {
  @ApiProperty({ description: 'Festival ID' })
  festivalId!: string;

  @ApiProperty({ description: 'Festival name' })
  festivalName!: string;

  @ApiProperty({ description: 'Generation timestamp' })
  generatedAt!: Date;

  @ApiProperty({ description: 'Ticketing metrics' })
  ticketing!: {
    totalSold: number;
    totalAvailable: number;
    soldPercentage: number;
    revenueTickets: number;
    ticketsByType: {
      type: string;
      name: string;
      sold: number;
      available: number;
      revenue: number;
    }[];
    salesTrend: {
      timestamp: Date;
      value: number;
      label?: string;
    }[];
  };

  @ApiProperty({ description: 'Revenue metrics' })
  revenue!: {
    totalRevenue: number;
    ticketRevenue: number;
    cashlessRevenue: number;
    vendorRevenue: number;
    currency: string;
  };

  @ApiProperty({ description: 'Attendance metrics' })
  attendance!: {
    currentAttendees: number;
    maxCapacity: number;
    occupancyRate: number;
    peakAttendance: number;
    peakTime: Date | null;
  };

  @ApiProperty({ description: 'Cashless metrics' })
  cashless!: {
    totalTopups: number;
    totalSpent: number;
    averageBalance: number;
    activeAccounts: number;
  };

  @ApiProperty({ description: 'Conversion funnel metrics' })
  conversion!: {
    visitorsToCart: number;
    cartToPurchase: number;
    overallConversion: number;
  };
}

/**
 * Sales analytics response
 */
export class SalesResponseDto {
  @ApiProperty({ description: 'Festival ID' })
  festivalId!: string;

  @ApiProperty({ description: 'Analysis period' })
  period!: {
    startDate: Date;
    endDate: Date;
  };

  @ApiProperty({ description: 'Summary statistics' })
  summary!: {
    totalSales: number;
    totalRevenue: number;
    averageOrderValue: number;
    uniqueCustomers: number;
  };

  @ApiProperty({ description: 'Daily sales breakdown' })
  salesByDay!: {
    date: Date;
    ticketsSold: number;
    revenue: number;
    refunds: number;
  }[];

  @ApiProperty({ description: 'Hourly sales distribution' })
  salesByHour!: {
    hour: number;
    ticketsSold: number;
    revenue: number;
  }[];

  @ApiProperty({ description: 'Sales by category' })
  salesByCategory!: {
    categoryId: string;
    categoryName: string;
    type: string;
    sold: number;
    quota: number;
    revenue: number;
    percentageOfTotal: number;
  }[];

  @ApiProperty({ description: 'Top selling categories' })
  topSellingCategories!: {
    categoryId: string;
    categoryName: string;
    type: string;
    sold: number;
    quota: number;
    revenue: number;
    percentageOfTotal: number;
  }[];

  @ApiPropertyOptional({ description: 'Comparison with previous periods' })
  comparison?: {
    previousPeriod: {
      totalSales: number;
      totalRevenue: number;
      changePercentage: number;
    };
    previousEdition?: {
      totalSales: number;
      totalRevenue: number;
      changePercentage: number;
    };
  };
}

/**
 * Cashless analytics response
 */
export class CashlessResponseDto {
  @ApiProperty({ description: 'Festival ID' })
  festivalId!: string;

  @ApiProperty({ description: 'Analysis period' })
  period!: {
    startDate: Date;
    endDate: Date;
  };

  @ApiProperty({ description: 'Summary statistics' })
  summary!: {
    totalTopups: number;
    totalTopupAmount: number;
    totalPayments: number;
    totalPaymentAmount: number;
    totalTransfers: number;
    totalRefunds: number;
    averageTopupAmount: number;
    averagePaymentAmount: number;
    averageBalance: number;
    totalActiveAccounts: number;
  };

  @ApiProperty({ description: 'Hourly transaction distribution' })
  transactionsByHour!: {
    hour: number;
    topups: number;
    payments: number;
    topupAmount: number;
    paymentAmount: number;
  }[];

  @ApiProperty({ description: 'Transactions by type' })
  transactionsByType!: {
    type: string;
    count: number;
    totalAmount: number;
    averageAmount: number;
  }[];

  @ApiProperty({ description: 'Topup amount distribution' })
  topupDistribution!: {
    range: string;
    min: number;
    max: number;
    count: number;
    percentage: number;
  }[];

  @ApiProperty({ description: 'Balance distribution' })
  balanceDistribution!: {
    range: string;
    min: number;
    max: number;
    count: number;
    percentage: number;
  }[];

  @ApiProperty({ description: 'Vendor cashless statistics' })
  vendorBreakdown!: {
    vendorId: string;
    vendorName: string;
    vendorType: string;
    totalTransactions: number;
    totalAmount: number;
    averageTransaction: number;
  }[];
}

/**
 * Attendance analytics response
 */
export class AttendanceResponseDto {
  @ApiProperty({ description: 'Festival ID' })
  festivalId!: string;

  @ApiProperty({ description: 'Analysis period' })
  period!: {
    startDate: Date;
    endDate: Date;
  };

  @ApiProperty({ description: 'Current attendance state' })
  current!: {
    totalInside: number;
    maxCapacity: number;
    occupancyRate: number;
  };

  @ApiProperty({ description: 'Hourly attendance data' })
  hourlyAttendance!: {
    hour: number;
    date: Date;
    entries: number;
    exits: number;
    netChange: number;
    totalInside: number;
  }[];

  @ApiProperty({ description: 'Daily attendance summary' })
  dailyAttendance!: {
    date: Date;
    uniqueVisitors: number;
    totalEntries: number;
    totalExits: number;
    peakOccupancy: number;
    peakTime: Date;
  }[];

  @ApiProperty({ description: 'Entry/exit flow over time' })
  entryExitFlow!: {
    timestamp: Date;
    entries: number;
    exits: number;
    cumulative: number;
  }[];

  @ApiProperty({ description: 'Peak times' })
  peakTimes!: {
    peak: { time: Date; count: number };
    lowest: { time: Date; count: number };
  };

  @ApiProperty({ description: 'Zone distribution' })
  zoneDistribution!: {
    zoneId: string;
    zoneName: string;
    currentOccupancy: number;
    capacity: number;
    occupancyRate: number;
  }[];
}

/**
 * Zone analytics response
 */
export class ZoneResponseDto {
  @ApiProperty({ description: 'Festival ID' })
  festivalId!: string;

  @ApiProperty({ description: 'Analysis period' })
  period!: {
    startDate: Date;
    endDate: Date;
  };

  @ApiProperty({ description: 'Zone statistics' })
  zones!: {
    zoneId: string;
    zoneName: string;
    capacity: number | null;
    currentOccupancy: number;
    occupancyRate: number;
    totalVisits: number;
    uniqueVisitors: number;
    averageTimeSpent: number;
    peakOccupancy: number;
    peakTime: Date | null;
    hourlyOccupancy: { hour: number; occupancy: number }[];
  }[];

  @ApiPropertyOptional({ description: 'Heatmap data for zones' })
  heatmapData?: {
    zoneId: string;
    zoneName: string;
    data: { hour: number; day: number; value: number }[];
  }[];

  @ApiPropertyOptional({ description: 'Zone transition analysis' })
  zoneTransitions?: {
    fromZone: string;
    toZone: string;
    count: number;
    averageTime: number;
  }[];
}

/**
 * Vendor analytics response
 */
export class VendorResponseDto {
  @ApiProperty({ description: 'Festival ID' })
  festivalId!: string;

  @ApiProperty({ description: 'Analysis period' })
  period!: {
    startDate: Date;
    endDate: Date;
  };

  @ApiProperty({ description: 'Summary statistics' })
  summary!: {
    totalVendors: number;
    totalOrders: number;
    totalRevenue: number;
    averageOrderValue: number;
  };

  @ApiProperty({ description: 'Statistics by vendor type' })
  vendorsByType!: {
    type: string;
    vendorCount: number;
    orderCount: number;
    revenue: number;
    percentageOfTotal: number;
  }[];

  @ApiProperty({ description: 'Top performing vendors' })
  topVendors!: {
    vendorId: string;
    vendorName: string;
    vendorType: string;
    totalOrders: number;
    totalRevenue: number;
    averageOrderValue: number;
    completionRate: number;
  }[];

  @ApiProperty({ description: 'Top selling products' })
  topProducts!: {
    vendorId: string;
    vendorName: string;
    productName: string;
    category: string;
    unitsSold: number;
    revenue: number;
  }[];

  @ApiProperty({ description: 'Hourly order distribution' })
  hourlyOrders!: {
    hour: number;
    orderCount: number;
    revenue: number;
    averageOrderValue: number;
  }[];

  @ApiProperty({ description: 'Order status breakdown' })
  orderStatusBreakdown!: {
    status: string;
    count: number;
    percentage: number;
  }[];
}

/**
 * Realtime analytics response
 */
export class RealtimeResponseDto {
  @ApiProperty({ description: 'Festival ID' })
  festivalId!: string;

  @ApiProperty({ description: 'Data timestamp' })
  timestamp!: Date;

  @ApiProperty({ description: 'Live metrics' })
  live!: {
    currentAttendees: number;
    lastHourEntries: number;
    lastHourExits: number;
    activeZones: {
      zoneId: string;
      zoneName: string;
      currentOccupancy: number;
      capacity: number;
      occupancyRate: number;
    }[];
  };

  @ApiProperty({ description: 'Last hour metrics' })
  lastHour!: {
    ticketsSold: number;
    ticketRevenue: number;
    cashlessTopups: number;
    cashlessPayments: number;
    vendorOrders: number;
  };

  @ApiProperty({ description: 'Active alerts' })
  alerts!: {
    id: string;
    type: string;
    severity: string;
    message: string;
    zone?: string;
    value: number;
    threshold: number;
    timestamp: Date;
  }[];
}

/**
 * Export result response
 */
export class ExportResponseDto {
  @ApiProperty({ description: 'Generated filename' })
  filename!: string;

  @ApiProperty({ description: 'File MIME type' })
  mimeType!: string;

  @ApiProperty({ description: 'File size in bytes' })
  size!: number;

  @ApiProperty({ description: 'Download URL (valid for limited time)' })
  downloadUrl!: string;

  @ApiProperty({ description: 'Generation timestamp' })
  generatedAt!: Date;

  @ApiProperty({ description: 'URL expiration time' })
  expiresAt!: Date;
}

/**
 * Alert notification for WebSocket
 */
export class AlertNotificationDto {
  @ApiProperty({ description: 'Alert ID' })
  id!: string;

  @ApiProperty({ description: 'Alert type' })
  type!: 'CAPACITY_WARNING' | 'CAPACITY_CRITICAL' | 'SALES_SPIKE' | 'SALES_DROP' | 'ZONE_OVERCROWDED' | 'PAYMENT_ISSUE';

  @ApiProperty({ description: 'Alert severity' })
  severity!: 'INFO' | 'WARNING' | 'CRITICAL';

  @ApiProperty({ description: 'Human-readable message' })
  message!: string;

  @ApiPropertyOptional({ description: 'Related zone' })
  zone?: string;

  @ApiProperty({ description: 'Current value that triggered the alert' })
  value!: number;

  @ApiProperty({ description: 'Threshold that was exceeded' })
  threshold!: number;

  @ApiProperty({ description: 'Alert timestamp' })
  timestamp!: Date;

  @ApiProperty({ description: 'Festival ID' })
  festivalId!: string;
}
