import { Injectable, Logger } from '@nestjs/common';
import * as ExcelJS from 'exceljs';
import { TimeRange, ExportResult } from '../interfaces/analytics.interfaces';

/**
 * Column configuration for Excel export
 */
export interface ExcelColumn {
  key: string;
  header: string;
  width?: number;
  format?: 'text' | 'number' | 'currency' | 'percentage' | 'date' | 'datetime';
  style?: Partial<ExcelJS.Style>;
}

/**
 * Worksheet configuration
 */
export interface WorksheetConfig {
  name: string;
  columns: ExcelColumn[];
  data: Record<string, unknown>[];
  title?: string;
  subtitle?: string;
  includeFilters?: boolean;
  freezeFirstRow?: boolean;
}

/**
 * Workbook configuration
 */
export interface WorkbookConfig {
  title: string;
  author?: string;
  subject?: string;
  worksheets: WorksheetConfig[];
  timeRange?: TimeRange;
}

/**
 * Excel Export Service
 *
 * Generates professional Excel files using ExcelJS library.
 * Supports multiple worksheets, styling, filtering, and proper data formatting.
 */
@Injectable()
export class ExcelExportService {
  private readonly logger = new Logger(ExcelExportService.name);

  /**
   * Create an Excel workbook from configuration
   */
  async createWorkbook(config: WorkbookConfig): Promise<ExportResult> {
    this.logger.log(`Creating Excel workbook: ${config.title}`);

    const workbook = new ExcelJS.Workbook();

    // Set workbook properties
    workbook.creator = config.author || 'Festival Platform';
    workbook.lastModifiedBy = config.author || 'Festival Platform';
    workbook.created = new Date();
    workbook.modified = new Date();
    workbook.subject = config.subject || config.title;
    workbook.title = config.title;

    // Add each worksheet
    for (const wsConfig of config.worksheets) {
      await this.addWorksheet(workbook, wsConfig);
    }

    // Generate buffer
    const buffer = await workbook.xlsx.writeBuffer();

    return {
      filename: `${this.sanitizeFilename(config.title)}_${Date.now()}.xlsx`,
      mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      data: Buffer.from(buffer),
      generatedAt: new Date(),
    };
  }

  /**
   * Add a worksheet to the workbook
   */
  private async addWorksheet(
    workbook: ExcelJS.Workbook,
    config: WorksheetConfig,
  ): Promise<void> {
    const worksheet = workbook.addWorksheet(config.name, {
      views: config.freezeFirstRow !== false ? [{ state: 'frozen', ySplit: 1 }] : undefined,
    });

    // Add title if provided
    let startRow = 1;
    if (config.title) {
      worksheet.mergeCells(1, 1, 1, config.columns.length);
      const titleCell = worksheet.getCell(1, 1);
      titleCell.value = config.title;
      titleCell.font = { bold: true, size: 16 };
      titleCell.alignment = { horizontal: 'center' };
      startRow++;

      if (config.subtitle) {
        worksheet.mergeCells(2, 1, 2, config.columns.length);
        const subtitleCell = worksheet.getCell(2, 1);
        subtitleCell.value = config.subtitle;
        subtitleCell.font = { italic: true, size: 12, color: { argb: 'FF666666' } };
        subtitleCell.alignment = { horizontal: 'center' };
        startRow++;
      }

      // Add empty row for spacing
      startRow++;
    }

    // Set up columns
    worksheet.columns = config.columns.map((col) => ({
      header: col.header,
      key: col.key,
      width: col.width || this.calculateColumnWidth(col),
    }));

    // If we added a title, we need to adjust the header row
    if (config.title) {
      // Clear auto-added header from columns and add it at the right row
      const headerRow = worksheet.getRow(startRow);
      config.columns.forEach((col, index) => {
        headerRow.getCell(index + 1).value = col.header;
      });

      // Style header row
      this.styleHeaderRow(headerRow, config.columns.length);
      startRow++;
    } else {
      // Style the first row (header)
      this.styleHeaderRow(worksheet.getRow(1), config.columns.length);
      startRow = 2;
    }

    // Add data rows
    for (const row of config.data) {
      const dataRow = worksheet.addRow(
        config.columns.map((col) => this.formatValue(row[col.key], col.format)),
      );

      // Apply column-specific formatting
      config.columns.forEach((col, index) => {
        const cell = dataRow.getCell(index + 1);
        this.applyCellFormat(cell, col);
      });
    }

    // Add auto-filter if requested
    if (config.includeFilters !== false && config.data.length > 0) {
      const lastDataRow = config.title ? startRow + config.data.length - 1 : config.data.length + 1;
      const headerRowNum = config.title ? startRow - 1 : 1;
      worksheet.autoFilter = {
        from: { row: headerRowNum, column: 1 },
        to: { row: lastDataRow, column: config.columns.length },
      };
    }

    // Add alternating row colors for better readability
    const dataStartRow = config.title ? startRow : 2;
    for (let i = 0; i < config.data.length; i++) {
      if (i % 2 === 1) {
        const row = worksheet.getRow(dataStartRow + i);
        row.eachCell({ includeEmpty: true }, (cell) => {
          cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFF8F8F8' },
          };
        });
      }
    }
  }

  /**
   * Style the header row
   */
  private styleHeaderRow(row: ExcelJS.Row, columnCount: number): void {
    row.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    row.alignment = { vertical: 'middle', horizontal: 'center' };
    row.height = 25;

    for (let i = 1; i <= columnCount; i++) {
      const cell = row.getCell(i);
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF4F46E5' }, // Indigo color
      };
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' },
      };
    }
  }

  /**
   * Format a value based on its type
   */
  private formatValue(
    value: unknown,
    format?: 'text' | 'number' | 'currency' | 'percentage' | 'date' | 'datetime',
  ): unknown {
    if (value === null || value === undefined) {
      return '';
    }

    switch (format) {
      case 'date':
        if (value instanceof Date) {
          return value;
        }
        if (typeof value === 'string' || typeof value === 'number') {
          return new Date(value);
        }
        return value;

      case 'datetime':
        if (value instanceof Date) {
          return value;
        }
        if (typeof value === 'string' || typeof value === 'number') {
          return new Date(value);
        }
        return value;

      case 'number':
      case 'currency':
      case 'percentage':
        if (typeof value === 'number') {
          return value;
        }
        if (typeof value === 'string') {
          const parsed = parseFloat(value);
          return isNaN(parsed) ? value : parsed;
        }
        return value;

      default:
        return String(value);
    }
  }

  /**
   * Apply cell formatting based on column configuration
   */
  private applyCellFormat(cell: ExcelJS.Cell, column: ExcelColumn): void {
    switch (column.format) {
      case 'currency':
        cell.numFmt = '#,##0.00 "EUR"';
        cell.alignment = { horizontal: 'right' };
        break;

      case 'percentage':
        cell.numFmt = '0.00%';
        cell.alignment = { horizontal: 'right' };
        break;

      case 'number':
        cell.numFmt = '#,##0';
        cell.alignment = { horizontal: 'right' };
        break;

      case 'date':
        cell.numFmt = 'DD/MM/YYYY';
        cell.alignment = { horizontal: 'center' };
        break;

      case 'datetime':
        cell.numFmt = 'DD/MM/YYYY HH:mm';
        cell.alignment = { horizontal: 'center' };
        break;

      default:
        cell.alignment = { horizontal: 'left', wrapText: true };
        break;
    }

    // Apply custom style if provided
    if (column.style) {
      Object.assign(cell, column.style);
    }
  }

  /**
   * Calculate appropriate column width based on content type
   */
  private calculateColumnWidth(column: ExcelColumn): number {
    const headerLength = column.header.length;

    switch (column.format) {
      case 'currency':
        return Math.max(15, headerLength + 2);
      case 'percentage':
        return Math.max(12, headerLength + 2);
      case 'date':
        return Math.max(12, headerLength + 2);
      case 'datetime':
        return Math.max(18, headerLength + 2);
      case 'number':
        return Math.max(12, headerLength + 2);
      default:
        return Math.max(15, Math.min(50, headerLength + 5));
    }
  }

  /**
   * Sanitize filename for safe file system usage
   */
  private sanitizeFilename(name: string): string {
    return name
      .replace(/[^a-zA-Z0-9_-]/g, '_')
      .replace(/_+/g, '_')
      .substring(0, 100);
  }

  // ============================================
  // Pre-defined export configurations for admin
  // ============================================

  /**
   * Export tickets to Excel
   */
  async exportTickets(
    tickets: {
      id: string;
      ticketNumber?: string;
      categoryName: string;
      categoryType: string;
      userEmail?: string;
      userName?: string;
      status: string;
      purchasePrice: number;
      createdAt: Date;
      usedAt?: Date | null;
      festivalName?: string;
    }[],
    festivalName: string,
    timeRange?: TimeRange,
  ): Promise<ExportResult> {
    const subtitle = timeRange
      ? `Du ${timeRange.startDate.toLocaleDateString('fr-FR')} au ${timeRange.endDate.toLocaleDateString('fr-FR')}`
      : `Export du ${new Date().toLocaleDateString('fr-FR')}`;

    return this.createWorkbook({
      title: `Export_Billets_${festivalName}`,
      author: 'Festival Platform',
      subject: 'Export des billets',
      worksheets: [
        {
          name: 'Billets',
          title: `Billets - ${festivalName}`,
          subtitle,
          columns: [
            { key: 'id', header: 'ID', width: 36 },
            { key: 'ticketNumber', header: 'Numero', width: 20 },
            { key: 'categoryName', header: 'Categorie', width: 25 },
            { key: 'categoryType', header: 'Type', width: 15 },
            { key: 'userEmail', header: 'Email', width: 30 },
            { key: 'userName', header: 'Nom', width: 25 },
            { key: 'status', header: 'Statut', width: 15 },
            { key: 'purchasePrice', header: 'Prix', format: 'currency', width: 15 },
            { key: 'createdAt', header: 'Date Achat', format: 'datetime', width: 18 },
            { key: 'usedAt', header: 'Date Utilisation', format: 'datetime', width: 18 },
          ],
          data: tickets.map((t) => ({
            id: t.id,
            ticketNumber: t.ticketNumber || '-',
            categoryName: t.categoryName,
            categoryType: t.categoryType,
            userEmail: t.userEmail || 'Invite',
            userName: t.userName || '-',
            status: t.status,
            purchasePrice: t.purchasePrice,
            createdAt: t.createdAt,
            usedAt: t.usedAt,
          })),
        },
      ],
      timeRange,
    });
  }

  /**
   * Export cashless transactions to Excel
   */
  async exportTransactions(
    transactions: {
      id: string;
      type: string;
      amount: number;
      balanceBefore: number;
      balanceAfter: number;
      userEmail?: string;
      userName?: string;
      vendorName?: string;
      description?: string;
      createdAt: Date;
    }[],
    festivalName: string,
    timeRange?: TimeRange,
  ): Promise<ExportResult> {
    const subtitle = timeRange
      ? `Du ${timeRange.startDate.toLocaleDateString('fr-FR')} au ${timeRange.endDate.toLocaleDateString('fr-FR')}`
      : `Export du ${new Date().toLocaleDateString('fr-FR')}`;

    return this.createWorkbook({
      title: `Export_Transactions_${festivalName}`,
      author: 'Festival Platform',
      subject: 'Export des transactions cashless',
      worksheets: [
        {
          name: 'Transactions',
          title: `Transactions Cashless - ${festivalName}`,
          subtitle,
          columns: [
            { key: 'id', header: 'ID', width: 36 },
            { key: 'type', header: 'Type', width: 15 },
            { key: 'amount', header: 'Montant', format: 'currency', width: 15 },
            { key: 'balanceBefore', header: 'Solde Avant', format: 'currency', width: 15 },
            { key: 'balanceAfter', header: 'Solde Apres', format: 'currency', width: 15 },
            { key: 'userEmail', header: 'Email', width: 30 },
            { key: 'userName', header: 'Utilisateur', width: 25 },
            { key: 'vendorName', header: 'Vendeur', width: 25 },
            { key: 'description', header: 'Description', width: 30 },
            { key: 'createdAt', header: 'Date', format: 'datetime', width: 18 },
          ],
          data: transactions.map((t) => ({
            id: t.id,
            type: t.type,
            amount: t.amount,
            balanceBefore: t.balanceBefore,
            balanceAfter: t.balanceAfter,
            userEmail: t.userEmail || '-',
            userName: t.userName || '-',
            vendorName: t.vendorName || '-',
            description: t.description || '-',
            createdAt: t.createdAt,
          })),
        },
      ],
      timeRange,
    });
  }

  /**
   * Export participants to Excel
   */
  async exportParticipants(
    participants: {
      id: string;
      email: string;
      firstName: string;
      lastName: string;
      phone?: string;
      ticketCount: number;
      ticketTypes: string[];
      totalSpent: number;
      cashlessBalance?: number;
      lastActivity?: Date;
      createdAt: Date;
    }[],
    festivalName: string,
    timeRange?: TimeRange,
  ): Promise<ExportResult> {
    const subtitle = timeRange
      ? `Du ${timeRange.startDate.toLocaleDateString('fr-FR')} au ${timeRange.endDate.toLocaleDateString('fr-FR')}`
      : `Export du ${new Date().toLocaleDateString('fr-FR')}`;

    return this.createWorkbook({
      title: `Export_Participants_${festivalName}`,
      author: 'Festival Platform',
      subject: 'Export des participants',
      worksheets: [
        {
          name: 'Participants',
          title: `Participants - ${festivalName}`,
          subtitle,
          columns: [
            { key: 'id', header: 'ID', width: 36 },
            { key: 'email', header: 'Email', width: 30 },
            { key: 'firstName', header: 'Prenom', width: 20 },
            { key: 'lastName', header: 'Nom', width: 20 },
            { key: 'phone', header: 'Telephone', width: 18 },
            { key: 'ticketCount', header: 'Nb Billets', format: 'number', width: 12 },
            { key: 'ticketTypes', header: 'Types Billets', width: 30 },
            { key: 'totalSpent', header: 'Total Depense', format: 'currency', width: 15 },
            { key: 'cashlessBalance', header: 'Solde Cashless', format: 'currency', width: 15 },
            { key: 'lastActivity', header: 'Derniere Activite', format: 'datetime', width: 18 },
            { key: 'createdAt', header: 'Inscription', format: 'datetime', width: 18 },
          ],
          data: participants.map((p) => ({
            id: p.id,
            email: p.email,
            firstName: p.firstName,
            lastName: p.lastName,
            phone: p.phone || '-',
            ticketCount: p.ticketCount,
            ticketTypes: p.ticketTypes.join(', '),
            totalSpent: p.totalSpent,
            cashlessBalance: p.cashlessBalance ?? 0,
            lastActivity: p.lastActivity,
            createdAt: p.createdAt,
          })),
        },
      ],
      timeRange,
    });
  }

  /**
   * Create a summary/statistics worksheet
   */
  async createSummaryWorksheet(
    stats: Record<string, number | string>,
    title: string,
  ): Promise<WorksheetConfig> {
    const data = Object.entries(stats).map(([key, value]) => ({
      metric: key,
      value: value,
    }));

    return {
      name: 'Resume',
      title,
      columns: [
        { key: 'metric', header: 'Metrique', width: 40 },
        {
          key: 'value',
          header: 'Valeur',
          width: 25,
          format: typeof Object.values(stats)[0] === 'number' ? 'number' : 'text',
        },
      ],
      data,
      includeFilters: false,
    };
  }
}
