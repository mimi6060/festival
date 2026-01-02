/**
 * Advanced Analytics Metrics Interfaces
 * Extended metrics for comprehensive festival analytics
 */

import { TimeRange } from './analytics.interfaces';

// Revenue Metrics
export interface RevenueMetrics {
  grossRevenue: number;
  netRevenue: number;
  refundedAmount: number;
  refundCount: number;
  platformFees: number;
  breakdown: {
    tickets: {
      amount: number;
      percentage: number;
      count: number;
    };
    cashless: {
      amount: number;
      percentage: number;
    };
    vendors: {
      amount: number;
      percentage: number;
      commission: number;
    };
    camping: {
      amount: number;
      percentage: number;
    };
  };
  averageRevenuePerAttendee: number;
  profitMargin: number;
}

// Customer Metrics
export interface CustomerMetrics {
  totalUniqueCustomers: number;
  newCustomers: number;
  returningCustomers: number;
  repeatPurchaseRate: number;
  averageSpendingPerCustomer: number;
  averageTicketsPerCustomer: number;
  averageCashlessSpending: number;
  customerLifetimeValue: number;
  segmentation: {
    vip: number;
    standard: number;
    earlyBird: number;
  };
  acquisitionChannels: {
    channel: string;
    count: number;
    percentage: number;
  }[];
}

// Performance Metrics
export interface PerformanceMetrics {
  ticketScanThroughput: number;
  averageOrderFulfillmentTime: number; // minutes
  cashlessSuccessRate: number;
  supportTicketResolutionTime: number; // hours
  supportTicketsByPriority: {
    HIGH: number;
    MEDIUM: number;
    LOW: number;
  };
  averageQueueTime: number; // minutes
  peakQueueTime: number; // minutes
  systemUptime: number; // percentage
  errorRate: number; // percentage
}

// Fraud Detection Metrics
export interface FraudMetrics {
  duplicateScanAttempts: number;
  suspiciousTransactions: number;
  suspiciousTransactionAmount: number;
  chargebackCount: number;
  chargebackRate: number;
  blockedUsers: number;
  riskScore: number; // 0-100
  fraudIndicators: string[];
}

// Growth Metrics
export interface GrowthMetrics {
  salesGrowth: number; // percentage
  revenueGrowth: number; // percentage
  customerGrowth: number; // percentage
  dailyGrowthRate: {
    date: Date;
    growthRate: number;
  }[];
  weeklyTrends: {
    week: number;
    sales: number;
    revenue: number;
  }[];
  projectedRevenue: number;
  projectedAttendance: number;
}

// Forecast Metrics
export interface ForecastMetrics {
  predictedSales: number[];
  predictedRevenue: number[];
  predictedAttendance: number[];
  confidenceLevel: number;
  peakDayPrediction: Date;
  demandForecast: {
    date: Date;
    predictedDemand: number;
    confidence: number;
  }[];
  staffingRecommendation: {
    date: Date;
    recommendedStaff: number;
  }[];
}

// Staff Metrics
export interface StaffMetrics {
  totalStaff: number;
  activeStaff: number;
  totalScheduledHours: number;
  totalWorkedHours: number;
  attendanceRate: number;
  averageHoursPerStaff: number;
  overtimeHours: number;
  staffByRole: {
    role: string;
    count: number;
  }[];
  performanceByZone: {
    zoneName: string;
    staffCount: number;
    avgHoursWorked: number;
  }[];
}

// Environmental/Sustainability Metrics
export interface EnvironmentalMetrics {
  estimatedCarbonFootprint: number; // kg CO2
  carbonPerAttendee: number;
  digitalTicketRate: number; // percentage
  paperSaved: number; // kg
  cashlessRate: number; // percentage
  wasteEstimate: number; // kg
  sustainabilityScore: number; // 0-100
}

// Security Metrics
export interface SecurityMetrics {
  totalAccessDenials: number;
  securityIncidents: number;
  incidentResponseTime: number; // minutes
  evacuationDrillCount: number;
  securityStaffCount: number;
  securityToAttendeeRatio: number;
  zoneViolations: number;
  emergencyResponseReadiness: number; // percentage
}

// Comprehensive Analytics combining all metrics
export interface ComprehensiveAnalytics {
  festivalId: string;
  generatedAt: Date;
  period: TimeRange;
  revenue: RevenueMetrics;
  customers: CustomerMetrics;
  performance: PerformanceMetrics;
  fraud: FraudMetrics;
  growth: GrowthMetrics;
  staff: StaffMetrics;
  environmental: EnvironmentalMetrics;
  security: SecurityMetrics;
}

// Custom Report Configuration
export interface CustomReportConfig {
  id: string;
  name: string;
  description?: string;
  festivalId: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
  metrics: string[]; // List of metric keys to include
  filters: ReportFilter[];
  schedule?: ReportSchedule;
  format: 'json' | 'csv' | 'pdf' | 'xlsx';
  recipients?: string[]; // Email addresses
}

export interface ReportFilter {
  field: string;
  operator: 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte' | 'in' | 'nin' | 'contains';
  value: string | number | boolean | string[] | number[];
}

export interface ReportSchedule {
  frequency: 'daily' | 'weekly' | 'monthly' | 'once';
  time: string; // HH:mm format
  dayOfWeek?: number; // 0-6 for weekly
  dayOfMonth?: number; // 1-31 for monthly
  timezone: string;
}

// Dashboard Configuration
export interface DashboardConfig {
  id: string;
  name: string;
  description?: string;
  festivalId: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
  isDefault: boolean;
  layout: DashboardLayout;
  widgets: DashboardWidget[];
  refreshInterval: number; // seconds
  theme: 'light' | 'dark' | 'auto';
}

export interface DashboardLayout {
  type: 'grid' | 'freeform';
  columns: number;
  rowHeight: number;
}

export interface DashboardWidget {
  id: string;
  type: WidgetType;
  title: string;
  metric: string;
  position: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  config: WidgetConfig;
}

export type WidgetType =
  | 'kpi'
  | 'line_chart'
  | 'bar_chart'
  | 'pie_chart'
  | 'heatmap'
  | 'table'
  | 'gauge'
  | 'map'
  | 'timeline'
  | 'alert_list';

export interface WidgetConfig {
  showTrend?: boolean;
  trendPeriod?: 'hour' | 'day' | 'week';
  comparisonType?: 'previous_period' | 'previous_year';
  colors?: string[];
  thresholds?: {
    warning: number;
    critical: number;
  };
  aggregation?: 'sum' | 'avg' | 'min' | 'max' | 'count';
  groupBy?: string;
  sortBy?: string;
  limit?: number;
}

// Real-time aggregation
export interface RealtimeAggregation {
  metric: string;
  value: number;
  timestamp: Date;
  windowSize: number; // seconds
  aggregationType: 'sum' | 'avg' | 'min' | 'max' | 'count';
}

export interface StreamingMetric {
  name: string;
  value: number;
  timestamp: Date;
  tags: Record<string, string>;
}

// Export configuration
export interface ExportConfig {
  format: 'csv' | 'pdf' | 'xlsx' | 'json';
  metrics: string[];
  filters?: ReportFilter[];
  timeRange: TimeRange;
  includeRawData: boolean;
  includeCharts: boolean;
  chartOptions?: {
    width: number;
    height: number;
    theme: 'light' | 'dark';
  };
  compression?: 'none' | 'gzip' | 'zip';
}

// Comparison analytics
export interface ComparisonAnalytics {
  currentPeriod: TimeRange;
  comparisonPeriod: TimeRange;
  metrics: {
    name: string;
    current: number;
    previous: number;
    change: number;
    changePercentage: number;
    trend: 'up' | 'down' | 'stable';
  }[];
}

// Cohort analysis
export interface CohortAnalysis {
  cohortType: 'acquisition_date' | 'ticket_type' | 'first_purchase';
  cohorts: {
    name: string;
    size: number;
    retention: number[];
    revenue: number[];
    avgSpending: number;
  }[];
  periods: string[];
}

// Funnel analysis
export interface FunnelAnalysis {
  name: string;
  steps: {
    name: string;
    count: number;
    percentage: number;
    dropoff: number;
    avgTimeToNext?: number; // seconds
  }[];
  overallConversion: number;
}

// Anomaly detection
export interface AnomalyDetection {
  metric: string;
  timestamp: Date;
  expectedValue: number;
  actualValue: number;
  deviation: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
  possibleCauses: string[];
}

// Benchmark data
export interface BenchmarkData {
  metric: string;
  festivalValue: number;
  industryAverage: number;
  percentile: number;
  recommendation?: string;
}
