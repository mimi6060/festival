import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CacheService } from '../../cache/cache.service';
import {
  DashboardConfig,
  DashboardWidget,
  DashboardLayout,
  WidgetType,
} from '../interfaces/advanced-metrics.interfaces';

interface DashboardTemplate {
  id: string;
  name: string;
  description: string;
  category: 'executive' | 'operations' | 'finance' | 'security' | 'marketing';
  widgets: DashboardWidget[];
  layout: DashboardLayout;
}

@Injectable()
export class DashboardConfigService {
  private readonly logger = new Logger(DashboardConfigService.name);
  private dashboardConfigs = new Map<string, DashboardConfig>();

  private readonly templates: DashboardTemplate[] = [
    this.createExecutiveDashboard(),
    this.createOperationsDashboard(),
    this.createFinanceDashboard(),
    this.createSecurityDashboard(),
    this.createMarketingDashboard(),
    this.createRealtimeDashboard(),
    this.createVendorDashboard(),
    this.createStaffDashboard(),
    this.createAttendanceDashboard(),
    this.createCashlessDashboard(),
  ];

  constructor(
    private readonly prisma: PrismaService,
    private readonly cacheService: CacheService,
  ) {}

  getTemplates(): DashboardTemplate[] {
    return this.templates;
  }

  getTemplate(templateId: string): DashboardTemplate {
    const template = this.templates.find(t => t.id === templateId);
    if (!template) {
      throw new NotFoundException(`Template ${templateId} not found`);
    }
    return template;
  }

  async createFromTemplate(
    festivalId: string,
    userId: string,
    templateId: string,
    customName?: string,
  ): Promise<DashboardConfig> {
    const template = this.getTemplate(templateId);
    const config: DashboardConfig = {
      id: `dashboard_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name: customName || template.name,
      description: template.description,
      festivalId,
      createdBy: userId,
      createdAt: new Date(),
      updatedAt: new Date(),
      isDefault: false,
      layout: { ...template.layout },
      widgets: template.widgets.map(w => ({ ...w, id: `widget_${Date.now()}_${Math.random().toString(36).substr(2, 9)}` })),
      refreshInterval: 30,
      theme: 'auto',
    };
    this.dashboardConfigs.set(config.id, config);
    return config;
  }

  async createDashboard(
    festivalId: string,
    userId: string,
    data: { name: string; description?: string },
  ): Promise<DashboardConfig> {
    const config: DashboardConfig = {
      id: `dashboard_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name: data.name,
      description: data.description,
      festivalId,
      createdBy: userId,
      createdAt: new Date(),
      updatedAt: new Date(),
      isDefault: false,
      layout: { type: 'grid', columns: 12, rowHeight: 60 },
      widgets: [],
      refreshInterval: 30,
      theme: 'auto',
    };
    this.dashboardConfigs.set(config.id, config);
    return config;
  }

  async getDashboards(festivalId: string): Promise<DashboardConfig[]> {
    return Array.from(this.dashboardConfigs.values()).filter(d => d.festivalId === festivalId);
  }

  async getDashboard(dashboardId: string): Promise<DashboardConfig> {
    const dashboard = this.dashboardConfigs.get(dashboardId);
    if (!dashboard) {throw new NotFoundException(`Dashboard ${dashboardId} not found`);}
    return dashboard;
  }

  async updateDashboard(
    dashboardId: string,
    updates: Partial<Omit<DashboardConfig, 'id' | 'createdAt' | 'createdBy'>>,
  ): Promise<DashboardConfig> {
    const existing = await this.getDashboard(dashboardId);
    const updated = { ...existing, ...updates, updatedAt: new Date() };
    this.dashboardConfigs.set(dashboardId, updated);
    return updated;
  }

  async deleteDashboard(dashboardId: string): Promise<void> {
    if (!this.dashboardConfigs.has(dashboardId)) {
      throw new NotFoundException(`Dashboard ${dashboardId} not found`);
    }
    this.dashboardConfigs.delete(dashboardId);
  }

  async addWidget(dashboardId: string, widget: Omit<DashboardWidget, 'id'>): Promise<DashboardConfig> {
    const dashboard = await this.getDashboard(dashboardId);
    const newWidget: DashboardWidget = {
      ...widget,
      id: `widget_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    };
    dashboard.widgets.push(newWidget);
    dashboard.updatedAt = new Date();
    return dashboard;
  }

  async updateWidget(dashboardId: string, widgetId: string, updates: Partial<Omit<DashboardWidget, 'id'>>): Promise<DashboardConfig> {
    const dashboard = await this.getDashboard(dashboardId);
    const idx = dashboard.widgets.findIndex(w => w.id === widgetId);
    if (idx === -1) {throw new NotFoundException(`Widget ${widgetId} not found`);}
    dashboard.widgets[idx] = { ...dashboard.widgets[idx], ...updates };
    dashboard.updatedAt = new Date();
    return dashboard;
  }

  async removeWidget(dashboardId: string, widgetId: string): Promise<DashboardConfig> {
    const dashboard = await this.getDashboard(dashboardId);
    const idx = dashboard.widgets.findIndex(w => w.id === widgetId);
    if (idx === -1) {throw new NotFoundException(`Widget ${widgetId} not found`);}
    dashboard.widgets.splice(idx, 1);
    dashboard.updatedAt = new Date();
    return dashboard;
  }

  async setDefault(dashboardId: string): Promise<DashboardConfig> {
    const dashboard = await this.getDashboard(dashboardId);
    for (const d of this.dashboardConfigs.values()) {
      if (d.festivalId === dashboard.festivalId) {d.isDefault = false;}
    }
    dashboard.isDefault = true;
    dashboard.updatedAt = new Date();
    return dashboard;
  }

  async cloneDashboard(dashboardId: string, newName: string, targetFestivalId?: string): Promise<DashboardConfig> {
    const source = await this.getDashboard(dashboardId);
    const cloned: DashboardConfig = {
      ...source,
      id: `dashboard_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name: newName,
      festivalId: targetFestivalId || source.festivalId,
      createdAt: new Date(),
      updatedAt: new Date(),
      isDefault: false,
      widgets: source.widgets.map(w => ({ ...w, id: `widget_${Date.now()}_${Math.random().toString(36).substr(2, 9)}` })),
    };
    this.dashboardConfigs.set(cloned.id, cloned);
    return cloned;
  }

  getWidgetTypes(): { type: WidgetType; name: string; description: string; supportedMetrics: string[] }[] {
    return [
      { type: 'kpi', name: 'KPI Card', description: 'Single metric with trend', supportedMetrics: ['*'] },
      { type: 'line_chart', name: 'Line Chart', description: 'Time series data', supportedMetrics: ['sales_trend', 'attendance_trend', 'revenue_trend'] },
      { type: 'bar_chart', name: 'Bar Chart', description: 'Category comparison', supportedMetrics: ['sales_by_category', 'revenue_by_vendor'] },
      { type: 'pie_chart', name: 'Pie Chart', description: 'Distribution', supportedMetrics: ['revenue_breakdown', 'ticket_distribution'] },
      { type: 'heatmap', name: 'Heatmap', description: 'Intensity visualization', supportedMetrics: ['zone_occupancy', 'hourly_activity'] },
      { type: 'table', name: 'Data Table', description: 'Tabular data', supportedMetrics: ['top_vendors', 'top_products'] },
      { type: 'gauge', name: 'Gauge', description: 'Progress indicator', supportedMetrics: ['occupancy_rate', 'sales_target'] },
      { type: 'map', name: 'Festival Map', description: 'Zone map with occupancy', supportedMetrics: ['zone_map'] },
      { type: 'timeline', name: 'Timeline', description: 'Event timeline', supportedMetrics: ['activities', 'incidents'] },
      { type: 'alert_list', name: 'Alert List', description: 'Active alerts', supportedMetrics: ['active_alerts'] },
    ];
  }

  getAvailableMetrics(): { id: string; name: string; category: string; unit?: string }[] {
    return [
      { id: 'total_revenue', name: 'Total Revenue', category: 'revenue', unit: 'currency' },
      { id: 'ticket_revenue', name: 'Ticket Revenue', category: 'revenue', unit: 'currency' },
      { id: 'tickets_sold', name: 'Tickets Sold', category: 'tickets', unit: 'count' },
      { id: 'current_attendance', name: 'Current Attendance', category: 'attendance', unit: 'count' },
      { id: 'occupancy_rate', name: 'Occupancy Rate', category: 'attendance', unit: 'percentage' },
      { id: 'cashless_accounts', name: 'Active Accounts', category: 'cashless', unit: 'count' },
      { id: 'total_topups', name: 'Total Top-ups', category: 'cashless', unit: 'currency' },
      { id: 'vendor_orders', name: 'Vendor Orders', category: 'vendors', unit: 'count' },
      { id: 'active_staff', name: 'Active Staff', category: 'staff', unit: 'count' },
      { id: 'security_incidents', name: 'Security Incidents', category: 'security', unit: 'count' },
    ];
  }

  private createWidget(type: WidgetType, title: string, metric: string, x: number, y: number, w: number, h: number, config: Record<string, unknown> = {}): DashboardWidget {
    return { id: `w_${Math.random().toString(36).substr(2, 6)}`, type, title, metric, position: { x, y, width: w, height: h }, config };
  }

  private createExecutiveDashboard(): DashboardTemplate {
    return {
      id: 'executive', name: 'Executive Dashboard', description: 'High-level overview for executives', category: 'executive',
      layout: { type: 'grid', columns: 12, rowHeight: 80 },
      widgets: [
        this.createWidget('kpi', 'Total Revenue', 'total_revenue', 0, 0, 3, 2, { showTrend: true }),
        this.createWidget('kpi', 'Tickets Sold', 'tickets_sold', 3, 0, 3, 2, { showTrend: true }),
        this.createWidget('kpi', 'Attendance', 'current_attendance', 6, 0, 3, 2, { showTrend: true }),
        this.createWidget('gauge', 'Occupancy', 'occupancy_rate', 9, 0, 3, 2, { thresholds: { warning: 80, critical: 95 } }),
        this.createWidget('line_chart', 'Revenue Trend', 'revenue_trend', 0, 2, 6, 4),
        this.createWidget('pie_chart', 'Revenue Breakdown', 'revenue_breakdown', 6, 2, 6, 4),
        this.createWidget('table', 'Top Vendors', 'top_vendors', 0, 6, 12, 3, { limit: 10 }),
      ],
    };
  }

  private createOperationsDashboard(): DashboardTemplate {
    return {
      id: 'operations', name: 'Operations Dashboard', description: 'Real-time operations monitoring', category: 'operations',
      layout: { type: 'grid', columns: 12, rowHeight: 80 },
      widgets: [
        this.createWidget('gauge', 'Occupancy', 'occupancy_rate', 0, 0, 4, 2, { thresholds: { warning: 80, critical: 95 } }),
        this.createWidget('kpi', 'Entry Rate', 'entry_rate', 4, 0, 4, 2),
        this.createWidget('kpi', 'Exit Rate', 'exit_rate', 8, 0, 4, 2),
        this.createWidget('heatmap', 'Zone Occupancy', 'zone_occupancy', 0, 2, 8, 4),
        this.createWidget('alert_list', 'Active Alerts', 'active_alerts', 8, 2, 4, 4, { limit: 10 }),
        this.createWidget('line_chart', 'Attendance Flow', 'attendance_trend', 0, 6, 12, 3),
      ],
    };
  }

  private createFinanceDashboard(): DashboardTemplate {
    return {
      id: 'finance', name: 'Finance Dashboard', description: 'Financial metrics and reporting', category: 'finance',
      layout: { type: 'grid', columns: 12, rowHeight: 80 },
      widgets: [
        this.createWidget('kpi', 'Gross Revenue', 'total_revenue', 0, 0, 3, 2),
        this.createWidget('kpi', 'Net Revenue', 'net_revenue', 3, 0, 3, 2),
        this.createWidget('kpi', 'Refunds', 'total_refunds', 6, 0, 3, 2),
        this.createWidget('kpi', 'Fees', 'platform_fees', 9, 0, 3, 2),
        this.createWidget('line_chart', 'Revenue Timeline', 'revenue_trend', 0, 2, 8, 4),
        this.createWidget('pie_chart', 'Revenue Sources', 'revenue_breakdown', 8, 2, 4, 4),
        this.createWidget('bar_chart', 'Vendor Performance', 'revenue_by_vendor', 0, 6, 12, 3),
      ],
    };
  }

  private createSecurityDashboard(): DashboardTemplate {
    return {
      id: 'security', name: 'Security Dashboard', description: 'Security monitoring', category: 'security',
      layout: { type: 'grid', columns: 12, rowHeight: 80 },
      widgets: [
        this.createWidget('kpi', 'Security Staff', 'active_security_staff', 0, 0, 3, 2),
        this.createWidget('kpi', 'Incidents', 'security_incidents', 3, 0, 3, 2),
        this.createWidget('kpi', 'Access Denials', 'access_denials', 6, 0, 3, 2),
        this.createWidget('gauge', 'Emergency Readiness', 'emergency_readiness', 9, 0, 3, 2),
        this.createWidget('map', 'Zone Status', 'zone_map', 0, 2, 8, 4),
        this.createWidget('alert_list', 'Security Alerts', 'security_alerts', 8, 2, 4, 4),
      ],
    };
  }

  private createMarketingDashboard(): DashboardTemplate {
    return {
      id: 'marketing', name: 'Marketing Dashboard', description: 'Customer acquisition metrics', category: 'marketing',
      layout: { type: 'grid', columns: 12, rowHeight: 80 },
      widgets: [
        this.createWidget('kpi', 'Total Customers', 'total_customers', 0, 0, 3, 2),
        this.createWidget('kpi', 'New Customers', 'new_customers', 3, 0, 3, 2),
        this.createWidget('kpi', 'Repeat Rate', 'repeat_purchase_rate', 6, 0, 3, 2),
        this.createWidget('kpi', 'Customer LTV', 'customer_ltv', 9, 0, 3, 2),
        this.createWidget('pie_chart', 'Acquisition Channels', 'acquisition_channels', 0, 2, 4, 4),
        this.createWidget('line_chart', 'Sales Trend', 'sales_trend', 4, 2, 8, 4),
      ],
    };
  }

  private createRealtimeDashboard(): DashboardTemplate {
    return {
      id: 'realtime', name: 'Realtime Dashboard', description: 'Live metrics', category: 'operations',
      layout: { type: 'grid', columns: 12, rowHeight: 80 },
      widgets: [
        this.createWidget('gauge', 'Current Occupancy', 'occupancy_rate', 0, 0, 4, 3, { thresholds: { warning: 80, critical: 95 } }),
        this.createWidget('kpi', 'Last Hour Sales', 'last_hour_sales', 4, 0, 4, 2),
        this.createWidget('kpi', 'Last Hour Revenue', 'last_hour_revenue', 8, 0, 4, 2),
        this.createWidget('line_chart', 'Live Entry Flow', 'realtime_entry_flow', 0, 3, 12, 3),
        this.createWidget('heatmap', 'Zone Heatmap', 'zone_occupancy', 0, 6, 8, 3),
        this.createWidget('alert_list', 'Live Alerts', 'active_alerts', 8, 6, 4, 3),
      ],
    };
  }

  private createVendorDashboard(): DashboardTemplate {
    return {
      id: 'vendor', name: 'Vendor Dashboard', description: 'Vendor performance', category: 'operations',
      layout: { type: 'grid', columns: 12, rowHeight: 80 },
      widgets: [
        this.createWidget('kpi', 'Total Orders', 'vendor_orders', 0, 0, 3, 2),
        this.createWidget('kpi', 'Vendor Revenue', 'vendor_revenue', 3, 0, 3, 2),
        this.createWidget('kpi', 'Avg Fulfillment', 'avg_fulfillment_time', 6, 0, 3, 2),
        this.createWidget('kpi', 'Completion Rate', 'vendor_fulfillment_rate', 9, 0, 3, 2),
        this.createWidget('bar_chart', 'Revenue by Vendor', 'revenue_by_vendor', 0, 2, 6, 4),
        this.createWidget('pie_chart', 'Orders by Type', 'vendor_types', 6, 2, 6, 4),
      ],
    };
  }

  private createStaffDashboard(): DashboardTemplate {
    return {
      id: 'staff', name: 'Staff Dashboard', description: 'Staff management', category: 'operations',
      layout: { type: 'grid', columns: 12, rowHeight: 80 },
      widgets: [
        this.createWidget('kpi', 'Total Staff', 'total_staff', 0, 0, 3, 2),
        this.createWidget('kpi', 'Active Staff', 'active_staff', 3, 0, 3, 2),
        this.createWidget('kpi', 'Attendance Rate', 'staff_attendance', 6, 0, 3, 2),
        this.createWidget('kpi', 'Overtime Hours', 'overtime_hours', 9, 0, 3, 2),
        this.createWidget('bar_chart', 'Staff by Role', 'staff_by_role', 0, 2, 6, 4),
        this.createWidget('bar_chart', 'Staff by Zone', 'staff_by_zone', 6, 2, 6, 4),
      ],
    };
  }

  private createAttendanceDashboard(): DashboardTemplate {
    return {
      id: 'attendance', name: 'Attendance Dashboard', description: 'Flow analytics', category: 'operations',
      layout: { type: 'grid', columns: 12, rowHeight: 80 },
      widgets: [
        this.createWidget('gauge', 'Occupancy', 'occupancy_rate', 0, 0, 3, 2, { thresholds: { warning: 80, critical: 95 } }),
        this.createWidget('kpi', 'Inside Now', 'current_attendance', 3, 0, 3, 2),
        this.createWidget('kpi', 'Today Entries', 'today_entries', 6, 0, 3, 2),
        this.createWidget('kpi', 'Peak Today', 'peak_attendance', 9, 0, 3, 2),
        this.createWidget('line_chart', 'Hourly Attendance', 'attendance_trend', 0, 2, 8, 4),
        this.createWidget('bar_chart', 'Zone Distribution', 'attendance_by_zone', 8, 2, 4, 4),
      ],
    };
  }

  private createCashlessDashboard(): DashboardTemplate {
    return {
      id: 'cashless', name: 'Cashless Dashboard', description: 'Payment system analytics', category: 'finance',
      layout: { type: 'grid', columns: 12, rowHeight: 80 },
      widgets: [
        this.createWidget('kpi', 'Active Accounts', 'cashless_accounts', 0, 0, 3, 2),
        this.createWidget('kpi', 'Total Top-ups', 'total_topups', 3, 0, 3, 2),
        this.createWidget('kpi', 'Total Spent', 'total_spending', 6, 0, 3, 2),
        this.createWidget('kpi', 'Avg Balance', 'avg_balance', 9, 0, 3, 2),
        this.createWidget('line_chart', 'Transaction Volume', 'cashless_trend', 0, 2, 6, 4),
        this.createWidget('pie_chart', 'Transaction Types', 'transaction_types', 6, 2, 6, 4),
      ],
    };
  }
}
