/**
 * Analytics Types and Interfaces
 * Defines all data structures for festival analytics
 */

// ============ Overview KPIs ============

export interface OverviewKPIs {
  // Revenue metrics
  totalRevenue: number;
  revenueToday: number;
  revenueGrowth: number; // percentage vs previous period

  // Ticket metrics
  totalTicketsSold: number;
  ticketsSoldToday: number;
  ticketConversionRate: number; // percentage of visitors who bought tickets

  // Attendance metrics
  totalAttendees: number;
  currentAttendees: number; // currently on-site
  peakAttendance: number;
  peakAttendanceTime: Date | null;

  // Cashless metrics
  totalCashlessBalance: number;
  totalCashlessTransactions: number;
  averageTransactionValue: number;

  // General metrics
  averageOrderValue: number;
  refundRate: number;
}

// ============ Time Series Data ============

export interface TimeSeriesDataPoint {
  timestamp: Date;
  value: number;
  label?: string;
}

export interface SalesTimeSeries {
  period: 'hour' | 'day' | 'week' | 'month';
  data: TimeSeriesDataPoint[];
  total: number;
  average: number;
  trend: 'up' | 'down' | 'stable';
  trendPercentage: number;
}

export interface AttendanceTimeSeries {
  period: 'hour' | 'day';
  data: TimeSeriesDataPoint[];
  currentCount: number;
  peakCount: number;
  peakTime: Date | null;
  averageStayDuration: number; // in minutes
}

// ============ Cashless Stats ============

export interface CashlessStats {
  totalTopups: number;
  totalSpent: number;
  totalRefunds: number;
  activeAccounts: number;
  averageBalance: number;
  averageTopupAmount: number;
  averageSpendPerTransaction: number;

  // Top vendors/stands
  topVendors: VendorStats[];

  // Transaction breakdown
  transactionsByType: {
    topup: number;
    payment: number;
    transfer: number;
    refund: number;
  };

  // Time-based metrics
  peakTransactionHour: number; // 0-23
  transactionsPerHour: number[];
}

export interface VendorStats {
  vendorId: string;
  vendorName: string;
  totalRevenue: number;
  transactionCount: number;
  averageTransaction: number;
}

// ============ Zone/Heatmap Data ============

export interface ZoneHeatmapData {
  zoneId: string;
  zoneName: string;
  zoneType: string;
  currentOccupancy: number;
  maxCapacity: number;
  occupancyPercentage: number;
  averageStayDuration: number; // in minutes
  totalVisitors: number;
  peakOccupancy: number;
  peakTime: Date | null;
  coordinates?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

export interface ZoneFrequentation {
  zones: ZoneHeatmapData[];
  totalZones: number;
  overallOccupancy: number;
  mostPopularZone: string;
  leastPopularZone: string;
}

// ============ Query Filters ============

export interface AnalyticsDateRange {
  startDate: Date;
  endDate: Date;
}

export interface SalesQueryParams {
  startDate?: Date;
  endDate?: Date;
  period?: 'hour' | 'day' | 'week' | 'month';
  categoryId?: string;
}

export interface AttendanceQueryParams {
  startDate?: Date;
  endDate?: Date;
  period?: 'hour' | 'day';
  zoneId?: string;
}

export interface CashlessQueryParams {
  startDate?: Date;
  endDate?: Date;
  vendorId?: string;
}

// ============ Export Types ============

export type ExportFormat = 'csv' | 'xlsx' | 'json';

export interface ExportOptions {
  format: ExportFormat;
  sections: ExportSection[];
  dateRange: AnalyticsDateRange;
  includeDetails: boolean;
}

export type ExportSection =
  | 'overview'
  | 'sales'
  | 'attendance'
  | 'cashless'
  | 'zones'
  | 'tickets';

export interface ExportResult {
  fileName: string;
  mimeType: string;
  data: Buffer | string;
  generatedAt: Date;
}

// ============ Real-time Events ============

export interface RealtimeEvent {
  type: RealtimeEventType;
  festivalId: string;
  timestamp: Date;
  data: unknown;
}

export type RealtimeEventType =
  | 'new_sale'
  | 'ticket_validated'
  | 'attendance_update'
  | 'cashless_transaction'
  | 'zone_update'
  | 'alert';

export interface NewSaleEvent {
  type: 'new_sale';
  festivalId: string;
  timestamp: Date;
  data: {
    ticketId: string;
    categoryName: string;
    amount: number;
    userId: string;
  };
}

export interface TicketValidatedEvent {
  type: 'ticket_validated';
  festivalId: string;
  timestamp: Date;
  data: {
    ticketId: string;
    zoneId?: string;
    zoneName?: string;
    userId: string;
  };
}

export interface AttendanceUpdateEvent {
  type: 'attendance_update';
  festivalId: string;
  timestamp: Date;
  data: {
    currentCount: number;
    delta: number; // positive = entry, negative = exit
    zoneId?: string;
  };
}

export interface CashlessTransactionEvent {
  type: 'cashless_transaction';
  festivalId: string;
  timestamp: Date;
  data: {
    transactionId: string;
    transactionType: 'topup' | 'payment' | 'transfer' | 'refund';
    amount: number;
    vendorId?: string;
    vendorName?: string;
  };
}

export interface ZoneUpdateEvent {
  type: 'zone_update';
  festivalId: string;
  timestamp: Date;
  data: {
    zoneId: string;
    zoneName: string;
    currentOccupancy: number;
    maxCapacity: number;
    occupancyPercentage: number;
  };
}

export interface AlertEvent {
  type: 'alert';
  festivalId: string;
  timestamp: Date;
  data: {
    alertType: 'capacity_warning' | 'revenue_milestone' | 'anomaly';
    severity: 'info' | 'warning' | 'critical';
    message: string;
    metadata?: Record<string, unknown>;
  };
}

// ============ Dashboard Summary ============

export interface DashboardSummary {
  overview: OverviewKPIs;
  recentSales: TimeSeriesDataPoint[];
  currentAttendance: number;
  zoneStatus: Pick<ZoneHeatmapData, 'zoneId' | 'zoneName' | 'occupancyPercentage'>[];
  alerts: AlertEvent[];
  lastUpdated: Date;
}

// ============ Comparison Metrics ============

export interface ComparisonMetrics {
  currentPeriod: OverviewKPIs;
  previousPeriod: OverviewKPIs;
  percentageChanges: {
    revenue: number;
    ticketsSold: number;
    attendance: number;
    cashlessTransactions: number;
  };
}
