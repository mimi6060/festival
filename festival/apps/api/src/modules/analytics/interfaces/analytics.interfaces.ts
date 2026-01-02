/**
 * Analytics Module - Interfaces
 * Defines all TypeScript interfaces for analytics data structures
 */

// Time range for analytics queries
export interface TimeRange {
  startDate: Date;
  endDate: Date;
}

// Dashboard KPIs
export interface DashboardKPIs {
  festivalId: string;
  festivalName: string;
  generatedAt: Date;

  // Ticket metrics
  ticketing: {
    totalSold: number;
    totalAvailable: number;
    soldPercentage: number;
    revenueTickets: number;
    ticketsByType: TicketsByType[];
    salesTrend: TrendData[];
  };

  // Financial metrics
  revenue: {
    totalRevenue: number;
    ticketRevenue: number;
    cashlessRevenue: number;
    vendorRevenue: number;
    currency: string;
  };

  // Attendance metrics
  attendance: {
    currentAttendees: number;
    maxCapacity: number;
    occupancyRate: number;
    peakAttendance: number;
    peakTime: Date | null;
  };

  // Cashless metrics
  cashless: {
    totalTopups: number;
    totalSpent: number;
    averageBalance: number;
    activeAccounts: number;
  };

  // Conversion funnel
  conversion: {
    visitorsToCart: number;
    cartToPurchase: number;
    overallConversion: number;
  };
}

export interface TicketsByType {
  type: string;
  name: string;
  sold: number;
  available: number;
  revenue: number;
}

export interface TrendData {
  timestamp: Date;
  value: number;
  label?: string;
}

// Sales Analytics
export interface SalesAnalytics {
  festivalId: string;
  period: TimeRange;

  summary: {
    totalSales: number;
    totalRevenue: number;
    averageOrderValue: number;
    uniqueCustomers: number;
  };

  salesByDay: DailySales[];
  salesByHour: HourlySales[];
  salesByCategory: CategorySales[];
  topSellingCategories: CategorySales[];

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

export interface DailySales {
  date: Date;
  ticketsSold: number;
  revenue: number;
  refunds: number;
}

export interface HourlySales {
  hour: number;
  ticketsSold: number;
  revenue: number;
}

export interface CategorySales {
  categoryId: string;
  categoryName: string;
  type: string;
  sold: number;
  quota: number;
  revenue: number;
  percentageOfTotal: number;
}

// Cashless Analytics
export interface CashlessAnalytics {
  festivalId: string;
  period: TimeRange;

  summary: {
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

  transactionsByHour: HourlyTransactions[];
  transactionsByType: TransactionsByType[];
  topupDistribution: AmountDistribution[];
  balanceDistribution: AmountDistribution[];

  vendorBreakdown: VendorCashlessStats[];
}

export interface HourlyTransactions {
  hour: number;
  topups: number;
  payments: number;
  topupAmount: number;
  paymentAmount: number;
}

export interface TransactionsByType {
  type: string;
  count: number;
  totalAmount: number;
  averageAmount: number;
}

export interface AmountDistribution {
  range: string;
  min: number;
  max: number;
  count: number;
  percentage: number;
}

export interface VendorCashlessStats {
  vendorId: string;
  vendorName: string;
  vendorType: string;
  totalTransactions: number;
  totalAmount: number;
  averageTransaction: number;
}

// Attendance Analytics
export interface AttendanceAnalytics {
  festivalId: string;
  period: TimeRange;

  current: {
    totalInside: number;
    maxCapacity: number;
    occupancyRate: number;
  };

  hourlyAttendance: HourlyAttendance[];
  dailyAttendance: DailyAttendance[];
  entryExitFlow: EntryExitFlow[];

  peakTimes: {
    peak: { time: Date; count: number };
    lowest: { time: Date; count: number };
  };

  zoneDistribution: ZoneAttendance[];
}

export interface HourlyAttendance {
  hour: number;
  date: Date;
  entries: number;
  exits: number;
  netChange: number;
  totalInside: number;
}

export interface DailyAttendance {
  date: Date;
  uniqueVisitors: number;
  totalEntries: number;
  totalExits: number;
  peakOccupancy: number;
  peakTime: Date;
}

export interface EntryExitFlow {
  timestamp: Date;
  entries: number;
  exits: number;
  cumulative: number;
}

// Zone Analytics
export interface ZoneAnalytics {
  festivalId: string;
  period: TimeRange;

  zones: ZoneStats[];
  heatmapData: ZoneHeatmapData[];
  zoneTransitions: ZoneTransition[];
}

export interface ZoneAttendance {
  zoneId: string;
  zoneName: string;
  currentOccupancy: number;
  capacity: number;
  occupancyRate: number;
}

export interface ZoneStats {
  zoneId: string;
  zoneName: string;
  capacity: number | null;
  currentOccupancy: number;
  occupancyRate: number;
  totalVisits: number;
  uniqueVisitors: number;
  averageTimeSpent: number; // in minutes
  peakOccupancy: number;
  peakTime: Date | null;
  hourlyOccupancy: { hour: number; occupancy: number }[];
}

export interface ZoneHeatmapData {
  zoneId: string;
  zoneName: string;
  data: { hour: number; day: number; value: number }[];
}

export interface ZoneTransition {
  fromZone: string;
  toZone: string;
  count: number;
  averageTime: number;
}

// Vendor Analytics
export interface VendorAnalytics {
  festivalId: string;
  period: TimeRange;

  summary: {
    totalVendors: number;
    totalOrders: number;
    totalRevenue: number;
    averageOrderValue: number;
  };

  vendorsByType: VendorTypeStats[];
  topVendors: VendorStats[];
  topProducts: ProductStats[];
  hourlyOrders: HourlyVendorOrders[];
  orderStatusBreakdown: OrderStatusStats[];
}

export interface VendorTypeStats {
  type: string;
  vendorCount: number;
  orderCount: number;
  revenue: number;
  percentageOfTotal: number;
}

export interface VendorStats {
  vendorId: string;
  vendorName: string;
  vendorType: string;
  totalOrders: number;
  totalRevenue: number;
  averageOrderValue: number;
  completionRate: number;
}

export interface ProductStats {
  vendorId: string;
  vendorName: string;
  productName: string;
  category: string;
  unitsSold: number;
  revenue: number;
}

export interface HourlyVendorOrders {
  hour: number;
  orderCount: number;
  revenue: number;
  averageOrderValue: number;
}

export interface OrderStatusStats {
  status: string;
  count: number;
  percentage: number;
}

// Real-time Analytics
export interface RealtimeAnalytics {
  festivalId: string;
  timestamp: Date;

  live: {
    currentAttendees: number;
    lastHourEntries: number;
    lastHourExits: number;
    activeZones: ZoneAttendance[];
  };

  lastHour: {
    ticketsSold: number;
    ticketRevenue: number;
    cashlessTopups: number;
    cashlessPayments: number;
    vendorOrders: number;
  };

  alerts: AnalyticsAlert[];
}

export interface AnalyticsAlert {
  id: string;
  type: 'CAPACITY_WARNING' | 'CAPACITY_CRITICAL' | 'SALES_SPIKE' | 'SALES_DROP' | 'ZONE_OVERCROWDED' | 'PAYMENT_ISSUE';
  severity: 'INFO' | 'WARNING' | 'CRITICAL';
  message: string;
  zone?: string;
  value: number;
  threshold: number;
  timestamp: Date;
}

// Export options
export interface ExportOptions {
  format: 'csv' | 'pdf';
  dataType: 'dashboard' | 'sales' | 'cashless' | 'attendance' | 'zones' | 'vendors';
  festivalId: string;
  timeRange?: TimeRange;
  includeCharts?: boolean;
}

export interface ExportResult {
  filename: string;
  mimeType: string;
  data: Buffer;
  generatedAt: Date;
}

// Comparison data
export interface ComparisonPeriod {
  type: 'previous_day' | 'previous_week' | 'previous_edition';
  startDate: Date;
  endDate: Date;
}

// Alert threshold configuration
export interface AlertThresholds {
  capacityWarning: number; // percentage (e.g., 80)
  capacityCritical: number; // percentage (e.g., 95)
  zoneCapacityWarning: number;
  salesDropThreshold: number; // percentage drop from average
  salesSpikeThreshold: number; // percentage increase from average
}
