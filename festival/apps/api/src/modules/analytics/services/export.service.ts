import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CacheService } from '../../cache/cache.service';
import { AnalyticsService } from './analytics.service';
import { AdvancedMetricsService } from './advanced-metrics.service';
import {
  ExportResult,
  TimeRange,
} from '../interfaces/analytics.interfaces';
import { ExportConfig, ComprehensiveAnalytics } from '../interfaces/advanced-metrics.interfaces';
 
const PDFDocument = require('pdfkit');
import { Decimal } from '@prisma/client/runtime/library';

interface ExportData {
  title: string;
  generatedAt: Date;
  period: TimeRange;
  sections: ExportSection[];
}

interface ExportSection {
  name: string;
  data: Record<string, unknown>[];
  columns: { key: string; label: string; format?: 'number' | 'currency' | 'percentage' | 'date' }[];
}

@Injectable()
export class ExportService {
  private readonly logger = new Logger(ExportService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly cacheService: CacheService,
    private readonly analyticsService: AnalyticsService,
    private readonly advancedMetricsService: AdvancedMetricsService,
  ) {}

  /**
   * Export analytics data in the specified format
   */
  async exportData(
    festivalId: string,
    config: ExportConfig,
  ): Promise<ExportResult> {
    this.logger.log(`Exporting analytics for festival ${festivalId} in ${config.format} format`);

    // Gather data based on requested metrics
    const exportData = await this.gatherExportData(festivalId, config);

    let result: ExportResult;

    switch (config.format) {
      case 'csv':
        result = await this.exportToCsv(exportData, config);
        break;
      case 'json':
        result = await this.exportToJson(exportData);
        break;
      case 'pdf':
        result = await this.exportToPdf(exportData, config);
        break;
      case 'xlsx':
        result = await this.exportToXlsx(exportData, config);
        break;
      default:
        throw new BadRequestException(`Unsupported export format: ${config.format}`);
    }

    return result;
  }

  /**
   * Export comprehensive analytics report
   */
  async exportComprehensiveReport(
    festivalId: string,
    timeRange: TimeRange,
    format: 'pdf' | 'xlsx' = 'pdf',
  ): Promise<ExportResult> {
    const analytics = await this.advancedMetricsService.getComprehensiveAnalytics(
      festivalId,
      timeRange.startDate,
      timeRange.endDate,
    );

    const exportData = this.transformComprehensiveToExport(analytics);

    if (format === 'pdf') {
      return this.exportToPdf(exportData, {
        format: 'pdf',
        metrics: ['comprehensive'],
        timeRange,
        includeRawData: true,
        includeCharts: true,
      });
    } else {
      return this.exportToXlsx(exportData, {
        format: 'xlsx',
        metrics: ['comprehensive'],
        timeRange,
        includeRawData: true,
        includeCharts: false,
      });
    }
  }

  /**
   * Export sales data
   */
  async exportSalesData(
    festivalId: string,
    timeRange: TimeRange,
    format: 'csv' | 'xlsx' = 'csv',
  ): Promise<ExportResult> {
    const tickets = await this.prisma.ticket.findMany({
      where: {
        festivalId,
        createdAt: { gte: timeRange.startDate, lte: timeRange.endDate },
      },
      include: {
        category: true,
        user: { select: { email: true } },
        payment: { select: { status: true, provider: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    const sections: ExportSection[] = [
      {
        name: 'Sales',
        columns: [
          { key: 'id', label: 'Ticket ID' },
          { key: 'purchaseDate', label: 'Purchase Date', format: 'date' },
          { key: 'category', label: 'Category' },
          { key: 'type', label: 'Type' },
          { key: 'price', label: 'Price', format: 'currency' },
          { key: 'status', label: 'Status' },
          { key: 'email', label: 'Customer Email' },
          { key: 'paymentStatus', label: 'Payment Status' },
          { key: 'paymentProvider', label: 'Payment Provider' },
        ],
        data: tickets.map(t => ({
          id: t.id,
          purchaseDate: t.createdAt,
          category: t.category.name,
          type: t.category.type,
          price: Number(t.purchasePrice),
          status: t.status,
          email: t.user.email,
          paymentStatus: t.payment?.status || 'N/A',
          paymentProvider: t.payment?.provider || 'N/A',
        })),
      },
    ];

    const exportData: ExportData = {
      title: 'Sales Export',
      generatedAt: new Date(),
      period: timeRange,
      sections,
    };

    return format === 'csv'
      ? this.exportToCsv(exportData, { format, metrics: ['sales'], timeRange, includeRawData: true, includeCharts: false })
      : this.exportToXlsx(exportData, { format, metrics: ['sales'], timeRange, includeRawData: true, includeCharts: false });
  }

  /**
   * Export cashless transactions
   */
  async exportCashlessData(
    festivalId: string,
    timeRange: TimeRange,
    format: 'csv' | 'xlsx' = 'csv',
  ): Promise<ExportResult> {
    const transactions = await this.prisma.cashlessTransaction.findMany({
      where: {
        festivalId,
        createdAt: { gte: timeRange.startDate, lte: timeRange.endDate },
      },
      include: {
        account: { include: { user: { select: { email: true } } } },
      },
      orderBy: { createdAt: 'desc' },
    });

    const sections: ExportSection[] = [
      {
        name: 'Cashless Transactions',
        columns: [
          { key: 'id', label: 'Transaction ID' },
          { key: 'date', label: 'Date', format: 'date' },
          { key: 'type', label: 'Type' },
          { key: 'amount', label: 'Amount', format: 'currency' },
          { key: 'balanceBefore', label: 'Balance Before', format: 'currency' },
          { key: 'balanceAfter', label: 'Balance After', format: 'currency' },
          { key: 'email', label: 'Account Email' },
          { key: 'description', label: 'Description' },
        ],
        data: transactions.map(t => ({
          id: t.id,
          date: t.createdAt,
          type: t.type,
          amount: Number(t.amount),
          balanceBefore: Number(t.balanceBefore),
          balanceAfter: Number(t.balanceAfter),
          email: t.account.user?.email || 'N/A',
          description: t.description || '',
        })),
      },
    ];

    const exportData: ExportData = {
      title: 'Cashless Transactions Export',
      generatedAt: new Date(),
      period: timeRange,
      sections,
    };

    return format === 'csv'
      ? this.exportToCsv(exportData, { format, metrics: ['cashless'], timeRange, includeRawData: true, includeCharts: false })
      : this.exportToXlsx(exportData, { format, metrics: ['cashless'], timeRange, includeRawData: true, includeCharts: false });
  }

  /**
   * Export attendance data
   */
  async exportAttendanceData(
    festivalId: string,
    timeRange: TimeRange,
    format: 'csv' | 'xlsx' = 'csv',
  ): Promise<ExportResult> {
    const accessLogs = await this.prisma.zoneAccessLog.findMany({
      where: {
        zone: { festivalId },
        timestamp: { gte: timeRange.startDate, lte: timeRange.endDate },
      },
      include: {
        zone: { select: { name: true } },
        ticket: {
          include: {
            user: { select: { email: true } },
            category: { select: { name: true } },
          },
        },
      },
      orderBy: { timestamp: 'desc' },
    });

    const sections: ExportSection[] = [
      {
        name: 'Attendance Log',
        columns: [
          { key: 'timestamp', label: 'Timestamp', format: 'date' },
          { key: 'zone', label: 'Zone' },
          { key: 'action', label: 'Action' },
          { key: 'ticketId', label: 'Ticket ID' },
          { key: 'ticketType', label: 'Ticket Type' },
          { key: 'email', label: 'Email' },
        ],
        data: accessLogs.map(log => ({
          timestamp: log.timestamp,
          zone: log.zone.name,
          action: log.action,
          ticketId: log.ticketId,
          ticketType: log.ticket.category.name,
          email: log.ticket.user.email,
        })),
      },
    ];

    const exportData: ExportData = {
      title: 'Attendance Export',
      generatedAt: new Date(),
      period: timeRange,
      sections,
    };

    return format === 'csv'
      ? this.exportToCsv(exportData, { format, metrics: ['attendance'], timeRange, includeRawData: true, includeCharts: false })
      : this.exportToXlsx(exportData, { format, metrics: ['attendance'], timeRange, includeRawData: true, includeCharts: false });
  }

  /**
   * Export vendor data
   */
  async exportVendorData(
    festivalId: string,
    timeRange: TimeRange,
    format: 'csv' | 'xlsx' = 'csv',
  ): Promise<ExportResult> {
    const orders = await this.prisma.vendorOrder.findMany({
      where: {
        vendor: { festivalId },
        createdAt: { gte: timeRange.startDate, lte: timeRange.endDate },
      },
      include: {
        vendor: { select: { name: true, type: true } },
        user: { select: { email: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    const sections: ExportSection[] = [
      {
        name: 'Vendor Orders',
        columns: [
          { key: 'id', label: 'Order ID' },
          { key: 'date', label: 'Date', format: 'date' },
          { key: 'vendor', label: 'Vendor' },
          { key: 'vendorType', label: 'Vendor Type' },
          { key: 'amount', label: 'Amount', format: 'currency' },
          { key: 'commission', label: 'Commission', format: 'currency' },
          { key: 'status', label: 'Status' },
          { key: 'email', label: 'Customer Email' },
        ],
        data: orders.map(o => ({
          id: o.id,
          date: o.createdAt,
          vendor: o.vendor.name,
          vendorType: o.vendor.type,
          amount: Number(o.totalAmount),
          commission: Number(o.commission),
          status: o.status,
          email: o.user?.email || 'N/A',
        })),
      },
    ];

    const exportData: ExportData = {
      title: 'Vendor Orders Export',
      generatedAt: new Date(),
      period: timeRange,
      sections,
    };

    return format === 'csv'
      ? this.exportToCsv(exportData, { format, metrics: ['vendors'], timeRange, includeRawData: true, includeCharts: false })
      : this.exportToXlsx(exportData, { format, metrics: ['vendors'], timeRange, includeRawData: true, includeCharts: false });
  }

  /**
   * Export financial summary for accounting
   */
  async exportFinancialSummary(
    festivalId: string,
    timeRange: TimeRange,
    format: 'pdf' | 'xlsx' = 'pdf',
  ): Promise<ExportResult> {
    const revenueMetrics = await this.advancedMetricsService.getRevenueMetrics(
      festivalId,
      timeRange.startDate,
      timeRange.endDate,
    );

    const sections: ExportSection[] = [
      {
        name: 'Revenue Summary',
        columns: [
          { key: 'category', label: 'Category' },
          { key: 'amount', label: 'Amount', format: 'currency' },
          { key: 'percentage', label: 'Percentage', format: 'percentage' },
        ],
        data: [
          { category: 'Tickets', amount: revenueMetrics.breakdown.tickets.amount, percentage: revenueMetrics.breakdown.tickets.percentage },
          { category: 'Cashless Topups', amount: revenueMetrics.breakdown.cashless.amount, percentage: revenueMetrics.breakdown.cashless.percentage },
          { category: 'Vendor Revenue', amount: revenueMetrics.breakdown.vendors.amount, percentage: revenueMetrics.breakdown.vendors.percentage },
          { category: 'Camping', amount: revenueMetrics.breakdown.camping.amount, percentage: revenueMetrics.breakdown.camping.percentage },
          { category: 'Gross Total', amount: revenueMetrics.grossRevenue, percentage: 100 },
          { category: 'Refunds', amount: -revenueMetrics.refundedAmount, percentage: 0 },
          { category: 'Net Revenue', amount: revenueMetrics.netRevenue, percentage: 0 },
          { category: 'Platform Fees', amount: revenueMetrics.platformFees, percentage: 0 },
        ],
      },
      {
        name: 'Key Metrics',
        columns: [
          { key: 'metric', label: 'Metric' },
          { key: 'value', label: 'Value' },
        ],
        data: [
          { metric: 'Total Tickets Sold', value: revenueMetrics.breakdown.tickets.count },
          { metric: 'Refund Count', value: revenueMetrics.refundCount },
          { metric: 'Profit Margin', value: `${revenueMetrics.profitMargin.toFixed(2)}%` },
          { metric: 'Average Revenue Per Attendee', value: `${revenueMetrics.averageRevenuePerAttendee.toFixed(2)}` },
        ],
      },
    ];

    const exportData: ExportData = {
      title: 'Financial Summary Report',
      generatedAt: new Date(),
      period: timeRange,
      sections,
    };

    if (format === 'pdf') {
      return this.exportToPdf(exportData, {
        format: 'pdf',
        metrics: ['revenue'],
        timeRange,
        includeRawData: true,
        includeCharts: true,
      });
    } else {
      return this.exportToXlsx(exportData, {
        format: 'xlsx',
        metrics: ['revenue'],
        timeRange,
        includeRawData: true,
        includeCharts: false,
      });
    }
  }

  // Private export methods

  private async gatherExportData(
    festivalId: string,
    config: ExportConfig,
  ): Promise<ExportData> {
    const sections: ExportSection[] = [];

    for (const metric of config.metrics) {
      try {
        const section = await this.getMetricSection(festivalId, metric, config.timeRange);
        if (section) {
          sections.push(section);
        }
      } catch (error) {
        this.logger.warn(`Failed to get data for metric ${metric}`);
      }
    }

    return {
      title: `Analytics Export - ${config.metrics.join(', ')}`,
      generatedAt: new Date(),
      period: config.timeRange,
      sections,
    };
  }

  private async getMetricSection(
    festivalId: string,
    metric: string,
    timeRange: TimeRange,
  ): Promise<ExportSection | null> {
    switch (metric) {
      case 'dashboard':
        const dashboard = await this.analyticsService.getDashboardKPIs(festivalId, {
          startDate: timeRange.startDate.toISOString(),
          endDate: timeRange.endDate.toISOString(),
        });
        return {
          name: 'Dashboard KPIs',
          columns: [
            { key: 'metric', label: 'Metric' },
            { key: 'value', label: 'Value' },
          ],
          data: [
            { metric: 'Total Tickets Sold', value: dashboard.ticketing.totalSold },
            { metric: 'Total Revenue', value: dashboard.revenue.totalRevenue },
            { metric: 'Current Attendance', value: dashboard.attendance.currentAttendees },
            { metric: 'Occupancy Rate', value: `${dashboard.attendance.occupancyRate.toFixed(1)}%` },
            { metric: 'Active Cashless Accounts', value: dashboard.cashless.activeAccounts },
          ],
        };

      case 'sales':
        const sales = await this.analyticsService.getSalesAnalytics(festivalId, {
          startDate: timeRange.startDate.toISOString(),
          endDate: timeRange.endDate.toISOString(),
        });
        return {
          name: 'Sales Summary',
          columns: [
            { key: 'date', label: 'Date', format: 'date' },
            { key: 'ticketsSold', label: 'Tickets Sold', format: 'number' },
            { key: 'revenue', label: 'Revenue', format: 'currency' },
            { key: 'refunds', label: 'Refunds', format: 'number' },
          ],
          data: sales.salesByDay.map(d => ({
            date: d.date,
            ticketsSold: d.ticketsSold,
            revenue: d.revenue,
            refunds: d.refunds,
          })),
        };

      default:
        return null;
    }
  }

  private async exportToCsv(
    data: ExportData,
    _config: ExportConfig,
  ): Promise<ExportResult> {
    const lines: string[] = [];

    // Add header
    lines.push(`# ${data.title}`);
    lines.push(`# Generated: ${data.generatedAt.toISOString()}`);
    lines.push(`# Period: ${data.period.startDate.toISOString()} to ${data.period.endDate.toISOString()}`);
    lines.push('');

    for (const section of data.sections) {
      lines.push(`## ${section.name}`);

      // Header row
      lines.push(section.columns.map(c => c.label).join(','));

      // Data rows
      for (const row of section.data) {
        const values = section.columns.map(col => {
          const value = row[col.key];
          return this.formatCsvValue(value, col.format);
        });
        lines.push(values.join(','));
      }

      lines.push('');
    }

    const content = lines.join('\n');
    const buffer = Buffer.from(content, 'utf-8');

    return {
      filename: `analytics_export_${Date.now()}.csv`,
      mimeType: 'text/csv',
      data: buffer,
      generatedAt: new Date(),
    };
  }

  private async exportToJson(data: ExportData): Promise<ExportResult> {
    const jsonContent = JSON.stringify(data, null, 2);
    const buffer = Buffer.from(jsonContent, 'utf-8');

    return {
      filename: `analytics_export_${Date.now()}.json`,
      mimeType: 'application/json',
      data: buffer,
      generatedAt: new Date(),
    };
  }

  private async exportToPdf(
    data: ExportData,
    config: ExportConfig,
  ): Promise<ExportResult> {
    return new Promise((resolve, reject) => {
      try {
        const chunks: Buffer[] = [];
        const doc = new PDFDocument({ margin: 50 });

        doc.on('data', (chunk: Buffer) => chunks.push(chunk));
        doc.on('end', () => {
          const buffer = Buffer.concat(chunks);
          resolve({
            filename: `analytics_report_${Date.now()}.pdf`,
            mimeType: 'application/pdf',
            data: buffer,
            generatedAt: new Date(),
          });
        });
        doc.on('error', reject);

        // Title page
        doc.fontSize(24).text(data.title, { align: 'center' });
        doc.moveDown();
        doc.fontSize(12).text(`Generated: ${data.generatedAt.toISOString()}`, { align: 'center' });
        doc.text(`Period: ${data.period.startDate.toISOString().split('T')[0]} to ${data.period.endDate.toISOString().split('T')[0]}`, { align: 'center' });
        doc.moveDown(2);

        // Content sections
        for (const section of data.sections) {
          // Check if we need a new page
          if (doc.y > 700) {
            doc.addPage();
          }

          doc.fontSize(16).text(section.name);
          doc.moveDown(0.5);

          // Draw table
          this.drawPdfTable(doc, section);
          doc.moveDown(2);
        }

        doc.end();
      } catch (error) {
        reject(error);
      }
    });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private drawPdfTable(doc: any, section: ExportSection): void {
    const startX = 50;
    const startY = doc.y;
    const colWidth = (doc.page.width - 100) / section.columns.length;
    const rowHeight = 20;

    // Header row
    doc.fontSize(10).font('Helvetica-Bold');
    section.columns.forEach((col, i) => {
      doc.text(col.label, startX + i * colWidth, startY, {
        width: colWidth - 5,
        align: 'left',
      });
    });

    doc.font('Helvetica').fontSize(9);

    // Data rows
    let currentY = startY + rowHeight;
    const maxRows = Math.min(section.data.length, 30); // Limit rows per page

    for (let rowIdx = 0; rowIdx < maxRows; rowIdx++) {
      const row = section.data[rowIdx];

      // Check for page break
      if (currentY > 750) {
        doc.addPage();
        currentY = 50;
      }

      section.columns.forEach((col, colIdx) => {
        const value = row[col.key];
        const formatted = this.formatPdfValue(value, col.format);
        doc.text(String(formatted), startX + colIdx * colWidth, currentY, {
          width: colWidth - 5,
          align: 'left',
        });
      });

      currentY += rowHeight;
    }

    if (section.data.length > maxRows) {
      doc.text(`... and ${section.data.length - maxRows} more rows`, startX, currentY);
      currentY += rowHeight;
    }

    doc.y = currentY;
  }

  private async exportToXlsx(
    data: ExportData,
    _config: ExportConfig,
  ): Promise<ExportResult> {
    // Create a simple XML-based xlsx (simplified implementation)
    // In production, use a library like exceljs

    const worksheets: string[] = [];

    for (const section of data.sections) {
      let ws = `<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">`;
      ws += '<sheetData>';

      // Header row
      ws += '<row>';
      section.columns.forEach((col, i) => {
        ws += `<c t="inlineStr"><is><t>${this.escapeXml(col.label)}</t></is></c>`;
      });
      ws += '</row>';

      // Data rows
      for (const row of section.data) {
        ws += '<row>';
        section.columns.forEach((col) => {
          const value = row[col.key];
          const formatted = this.formatXlsxValue(value, col.format);
          ws += `<c t="inlineStr"><is><t>${this.escapeXml(String(formatted))}</t></is></c>`;
        });
        ws += '</row>';
      }

      ws += '</sheetData></worksheet>';
      worksheets.push(ws);
    }

    // Create a simple CSV as fallback since full XLSX generation is complex
    // In production, use exceljs library
    return this.exportToCsv(data, _config);
  }

  private transformComprehensiveToExport(
    analytics: ComprehensiveAnalytics,
  ): ExportData {
    return {
      title: 'Comprehensive Analytics Report',
      generatedAt: analytics.generatedAt,
      period: analytics.period,
      sections: [
        {
          name: 'Revenue Overview',
          columns: [
            { key: 'metric', label: 'Metric' },
            { key: 'value', label: 'Value', format: 'currency' },
          ],
          data: [
            { metric: 'Gross Revenue', value: analytics.revenue.grossRevenue },
            { metric: 'Net Revenue', value: analytics.revenue.netRevenue },
            { metric: 'Refunded', value: analytics.revenue.refundedAmount },
            { metric: 'Platform Fees', value: analytics.revenue.platformFees },
          ],
        },
        {
          name: 'Customer Metrics',
          columns: [
            { key: 'metric', label: 'Metric' },
            { key: 'value', label: 'Value' },
          ],
          data: [
            { metric: 'Total Customers', value: analytics.customers.totalUniqueCustomers },
            { metric: 'New Customers', value: analytics.customers.newCustomers },
            { metric: 'Returning Customers', value: analytics.customers.returningCustomers },
            { metric: 'Repeat Purchase Rate', value: `${analytics.customers.repeatPurchaseRate.toFixed(1)}%` },
            { metric: 'Avg Spending', value: analytics.customers.averageSpendingPerCustomer.toFixed(2) },
            { metric: 'Customer LTV', value: analytics.customers.customerLifetimeValue.toFixed(2) },
          ],
        },
        {
          name: 'Performance Metrics',
          columns: [
            { key: 'metric', label: 'Metric' },
            { key: 'value', label: 'Value' },
          ],
          data: [
            { metric: 'Ticket Scan Throughput', value: analytics.performance.ticketScanThroughput },
            { metric: 'Avg Order Fulfillment (min)', value: analytics.performance.averageOrderFulfillmentTime.toFixed(1) },
            { metric: 'Cashless Success Rate', value: `${analytics.performance.cashlessSuccessRate}%` },
            { metric: 'Support Resolution Time (h)', value: analytics.performance.supportTicketResolutionTime.toFixed(1) },
            { metric: 'System Uptime', value: `${analytics.performance.systemUptime}%` },
          ],
        },
        {
          name: 'Growth Metrics',
          columns: [
            { key: 'metric', label: 'Metric' },
            { key: 'value', label: 'Value' },
          ],
          data: [
            { metric: 'Sales Growth', value: `${analytics.growth.salesGrowth.toFixed(1)}%` },
            { metric: 'Revenue Growth', value: `${analytics.growth.revenueGrowth.toFixed(1)}%` },
            { metric: 'Customer Growth', value: `${analytics.growth.customerGrowth.toFixed(1)}%` },
            { metric: 'Projected Revenue', value: analytics.growth.projectedRevenue.toFixed(2) },
            { metric: 'Projected Attendance', value: analytics.growth.projectedAttendance },
          ],
        },
        {
          name: 'Staff Metrics',
          columns: [
            { key: 'metric', label: 'Metric' },
            { key: 'value', label: 'Value' },
          ],
          data: [
            { metric: 'Total Staff', value: analytics.staff.totalStaff },
            { metric: 'Active Staff', value: analytics.staff.activeStaff },
            { metric: 'Attendance Rate', value: `${analytics.staff.attendanceRate.toFixed(1)}%` },
            { metric: 'Total Scheduled Hours', value: analytics.staff.totalScheduledHours.toFixed(1) },
            { metric: 'Total Worked Hours', value: analytics.staff.totalWorkedHours.toFixed(1) },
            { metric: 'Overtime Hours', value: analytics.staff.overtimeHours.toFixed(1) },
          ],
        },
        {
          name: 'Security Metrics',
          columns: [
            { key: 'metric', label: 'Metric' },
            { key: 'value', label: 'Value' },
          ],
          data: [
            { metric: 'Access Denials', value: analytics.security.totalAccessDenials },
            { metric: 'Security Incidents', value: analytics.security.securityIncidents },
            { metric: 'Security Staff', value: analytics.security.securityStaffCount },
            { metric: 'Staff:Attendee Ratio', value: `1:${analytics.security.securityToAttendeeRatio.toFixed(0)}` },
            { metric: 'Emergency Readiness', value: `${analytics.security.emergencyResponseReadiness}%` },
          ],
        },
        {
          name: 'Environmental Metrics',
          columns: [
            { key: 'metric', label: 'Metric' },
            { key: 'value', label: 'Value' },
          ],
          data: [
            { metric: 'Carbon Footprint (kg CO2)', value: analytics.environmental.estimatedCarbonFootprint.toFixed(0) },
            { metric: 'Per Attendee (kg CO2)', value: analytics.environmental.carbonPerAttendee.toFixed(1) },
            { metric: 'Digital Ticket Rate', value: `${analytics.environmental.digitalTicketRate.toFixed(1)}%` },
            { metric: 'Paper Saved (kg)', value: analytics.environmental.paperSaved.toFixed(2) },
            { metric: 'Sustainability Score', value: analytics.environmental.sustainabilityScore },
          ],
        },
      ],
    };
  }

  // Formatting helpers

  private formatCsvValue(
    value: unknown,
    format?: 'number' | 'currency' | 'percentage' | 'date',
  ): string {
    if (value === null || value === undefined) {return '';}

    switch (format) {
      case 'currency':
        return typeof value === 'number' ? value.toFixed(2) : String(value);
      case 'percentage':
        return typeof value === 'number' ? `${value.toFixed(2)}%` : String(value);
      case 'date':
        if (value instanceof Date) {
          return value.toISOString();
        }
        return String(value);
      case 'number':
        return typeof value === 'number' ? String(value) : String(value);
      default:
        // Escape commas and quotes
        const str = String(value);
        if (str.includes(',') || str.includes('"')) {
          return `"${str.replace(/"/g, '""')}"`;
        }
        return str;
    }
  }

  private formatPdfValue(
    value: unknown,
    format?: 'number' | 'currency' | 'percentage' | 'date',
  ): string {
    if (value === null || value === undefined) {return '-';}

    switch (format) {
      case 'currency':
        return typeof value === 'number' ? `$${value.toFixed(2)}` : String(value);
      case 'percentage':
        return typeof value === 'number' ? `${value.toFixed(1)}%` : String(value);
      case 'date':
        if (value instanceof Date) {
          return value.toLocaleDateString();
        }
        return String(value);
      case 'number':
        return typeof value === 'number' ? value.toLocaleString() : String(value);
      default:
        return String(value);
    }
  }

  private formatXlsxValue(
    value: unknown,
    format?: 'number' | 'currency' | 'percentage' | 'date',
  ): string {
    return this.formatCsvValue(value, format);
  }

  private escapeXml(str: string): string {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }

  private decimalToNumber(value: Decimal | null): number {
    return value ? Number(value) : 0;
  }
}
