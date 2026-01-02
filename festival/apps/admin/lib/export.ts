/**
 * Export utilities for CSV and Excel file generation
 * Supports multiple data formats with proper encoding and formatting
 */

// Types
export interface ExportColumn<T> {
  key: keyof T | string;
  label: string;
  format?: (value: unknown, row: T) => string | number;
}

export interface ExportOptions {
  filename: string;
  sheetName?: string;
  includeTimestamp?: boolean;
  delimiter?: string;
  encoding?: 'utf-8' | 'utf-16le';
}

// Default options
const defaultOptions: ExportOptions = {
  filename: 'export',
  sheetName: 'Data',
  includeTimestamp: true,
  delimiter: ';',
  encoding: 'utf-8',
};

/**
 * Get nested value from object using dot notation
 */
function getNestedValue<T>(obj: T, path: string): unknown {
  return path.split('.').reduce((current: unknown, key) => {
    if (current && typeof current === 'object' && key in current) {
      return (current as Record<string, unknown>)[key];
    }
    return undefined;
  }, obj);
}

/**
 * Escape and format value for CSV
 */
function formatCSVValue(value: unknown, delimiter: string): string {
  if (value === null || value === undefined) {
    return '';
  }

  let stringValue = String(value);

  // Check if value needs quoting (contains delimiter, quotes, or newlines)
  const needsQuoting =
    stringValue.includes(delimiter) ||
    stringValue.includes('"') ||
    stringValue.includes('\n') ||
    stringValue.includes('\r');

  if (needsQuoting) {
    // Escape quotes by doubling them
    stringValue = stringValue.replace(/"/g, '""');
    return `"${stringValue}"`;
  }

  return stringValue;
}

/**
 * Generate timestamp string for filenames
 */
function getTimestamp(): string {
  const now = new Date();
  return now.toISOString().replace(/[:.]/g, '-').slice(0, 19);
}

/**
 * Format date values for export
 */
export function formatDateForExport(date: string | Date): string {
  if (!date) return '';
  const d = new Date(date);
  return d.toLocaleDateString('fr-FR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Format currency values for export
 */
export function formatCurrencyForExport(
  amount: number,
  currency: string = 'EUR'
): string {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency,
  }).format(amount);
}

/**
 * Export data to CSV format
 */
export function exportToCSV<T extends Record<string, unknown>>(
  data: T[],
  columns: ExportColumn<T>[],
  options: Partial<ExportOptions> = {}
): void {
  const opts = { ...defaultOptions, ...options };

  if (data.length === 0) {
    console.warn('No data to export');
    return;
  }

  // Build header row
  const headerRow = columns
    .map((col) => formatCSVValue(col.label, opts.delimiter!))
    .join(opts.delimiter);

  // Build data rows
  const dataRows = data.map((row) => {
    return columns
      .map((col) => {
        const rawValue = getNestedValue(row, col.key as string);
        const formattedValue = col.format
          ? col.format(rawValue, row)
          : rawValue;
        return formatCSVValue(formattedValue, opts.delimiter!);
      })
      .join(opts.delimiter);
  });

  // Combine all rows
  const csvContent = [headerRow, ...dataRows].join('\n');

  // Add BOM for proper Excel UTF-8 handling
  const BOM = '\uFEFF';
  const finalContent = opts.encoding === 'utf-8' ? BOM + csvContent : csvContent;

  // Generate filename
  const timestamp = opts.includeTimestamp ? `_${getTimestamp()}` : '';
  const filename = `${opts.filename}${timestamp}.csv`;

  // Create and trigger download
  const blob = new Blob([finalContent], {
    type: `text/csv;charset=${opts.encoding}`,
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Export data to Excel format (XLSX)
 * Uses a simple XML-based format compatible with Excel
 */
export function exportToExcel<T extends Record<string, unknown>>(
  data: T[],
  columns: ExportColumn<T>[],
  options: Partial<ExportOptions> = {}
): void {
  const opts = { ...defaultOptions, ...options };

  if (data.length === 0) {
    console.warn('No data to export');
    return;
  }

  // Build Excel XML content
  const xmlContent = buildExcelXML(data, columns, opts.sheetName!);

  // Generate filename
  const timestamp = opts.includeTimestamp ? `_${getTimestamp()}` : '';
  const filename = `${opts.filename}${timestamp}.xlsx`;

  // Create and trigger download
  const blob = new Blob([xmlContent], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Build Excel XML content (SpreadsheetML format)
 */
function buildExcelXML<T extends Record<string, unknown>>(
  data: T[],
  columns: ExportColumn<T>[],
  sheetName: string
): string {
  const escapeXML = (str: string): string => {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  };

  // Build header cells
  const headerCells = columns
    .map(
      (col) =>
        `<Cell ss:StyleID="Header"><Data ss:Type="String">${escapeXML(col.label)}</Data></Cell>`
    )
    .join('');

  // Build data rows
  const dataRowsXML = data
    .map((row) => {
      const cells = columns
        .map((col) => {
          const rawValue = getNestedValue(row, col.key as string);
          const formattedValue = col.format
            ? col.format(rawValue, row)
            : rawValue;

          // Determine cell type
          const isNumber =
            typeof formattedValue === 'number' &&
            !isNaN(formattedValue) &&
            isFinite(formattedValue);
          const type = isNumber ? 'Number' : 'String';
          const value = formattedValue ?? '';

          return `<Cell><Data ss:Type="${type}">${escapeXML(String(value))}</Data></Cell>`;
        })
        .join('');
      return `<Row>${cells}</Row>`;
    })
    .join('\n');

  // Complete Excel XML structure
  return `<?xml version="1.0" encoding="UTF-8"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
  xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
  <Styles>
    <Style ss:ID="Header">
      <Font ss:Bold="1"/>
      <Interior ss:Color="#CCCCCC" ss:Pattern="Solid"/>
      <Alignment ss:Horizontal="Center"/>
    </Style>
  </Styles>
  <Worksheet ss:Name="${escapeXML(sheetName)}">
    <Table>
      <Row>${headerCells}</Row>
      ${dataRowsXML}
    </Table>
  </Worksheet>
</Workbook>`;
}

/**
 * Export data to JSON format
 */
export function exportToJSON<T>(
  data: T[],
  options: Partial<ExportOptions> = {}
): void {
  const opts = { ...defaultOptions, ...options };

  if (data.length === 0) {
    console.warn('No data to export');
    return;
  }

  const jsonContent = JSON.stringify(data, null, 2);

  // Generate filename
  const timestamp = opts.includeTimestamp ? `_${getTimestamp()}` : '';
  const filename = `${opts.filename}${timestamp}.json`;

  // Create and trigger download
  const blob = new Blob([jsonContent], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// Pre-defined column configurations for common exports

export const userExportColumns: ExportColumn<Record<string, unknown>>[] = [
  { key: 'id', label: 'ID' },
  { key: 'email', label: 'Email' },
  { key: 'firstName', label: 'Prenom' },
  { key: 'lastName', label: 'Nom' },
  { key: 'role', label: 'Role' },
  {
    key: 'isActive',
    label: 'Actif',
    format: (v) => (v ? 'Oui' : 'Non'),
  },
  {
    key: 'createdAt',
    label: 'Date creation',
    format: (v) => formatDateForExport(v as string),
  },
  {
    key: 'lastLogin',
    label: 'Derniere connexion',
    format: (v) => (v ? formatDateForExport(v as string) : 'Jamais'),
  },
];

export const festivalExportColumns: ExportColumn<Record<string, unknown>>[] = [
  { key: 'id', label: 'ID' },
  { key: 'name', label: 'Nom' },
  { key: 'status', label: 'Statut' },
  { key: 'location.city', label: 'Ville' },
  { key: 'location.country', label: 'Pays' },
  {
    key: 'startDate',
    label: 'Date debut',
    format: (v) => formatDateForExport(v as string),
  },
  {
    key: 'endDate',
    label: 'Date fin',
    format: (v) => formatDateForExport(v as string),
  },
  { key: 'capacity', label: 'Capacite' },
  { key: 'ticketsSold', label: 'Billets vendus' },
  {
    key: 'revenue',
    label: 'Revenus',
    format: (v) => formatCurrencyForExport(v as number),
  },
];

export const ticketExportColumns: ExportColumn<Record<string, unknown>>[] = [
  { key: 'id', label: 'ID' },
  { key: 'ticketNumber', label: 'Numero' },
  { key: 'category.name', label: 'Categorie' },
  { key: 'festival.name', label: 'Festival' },
  { key: 'user.email', label: 'Email acheteur' },
  { key: 'status', label: 'Statut' },
  {
    key: 'purchasedAt',
    label: 'Date achat',
    format: (v) => formatDateForExport(v as string),
  },
  {
    key: 'usedAt',
    label: 'Date utilisation',
    format: (v) => (v ? formatDateForExport(v as string) : '-'),
  },
];

export const orderExportColumns: ExportColumn<Record<string, unknown>>[] = [
  { key: 'id', label: 'ID' },
  { key: 'orderNumber', label: 'Numero commande' },
  { key: 'user.email', label: 'Email client' },
  { key: 'festival.name', label: 'Festival' },
  { key: 'status', label: 'Statut' },
  {
    key: 'subtotal',
    label: 'Sous-total',
    format: (v) => formatCurrencyForExport(v as number),
  },
  {
    key: 'fees',
    label: 'Frais',
    format: (v) => formatCurrencyForExport(v as number),
  },
  {
    key: 'total',
    label: 'Total',
    format: (v) => formatCurrencyForExport(v as number),
  },
  { key: 'paymentMethod', label: 'Methode paiement' },
  {
    key: 'createdAt',
    label: 'Date creation',
    format: (v) => formatDateForExport(v as string),
  },
  {
    key: 'paidAt',
    label: 'Date paiement',
    format: (v) => (v ? formatDateForExport(v as string) : '-'),
  },
];

export const cashlessExportColumns: ExportColumn<Record<string, unknown>>[] = [
  { key: 'id', label: 'ID' },
  { key: 'type', label: 'Type' },
  { key: 'account.user.email', label: 'Email utilisateur' },
  { key: 'festival.name', label: 'Festival' },
  {
    key: 'amount',
    label: 'Montant',
    format: (v) => formatCurrencyForExport(v as number),
  },
  {
    key: 'balanceBefore',
    label: 'Solde avant',
    format: (v) => formatCurrencyForExport(v as number),
  },
  {
    key: 'balanceAfter',
    label: 'Solde apres',
    format: (v) => formatCurrencyForExport(v as number),
  },
  {
    key: 'createdAt',
    label: 'Date',
    format: (v) => formatDateForExport(v as string),
  },
];

export const staffExportColumns: ExportColumn<Record<string, unknown>>[] = [
  { key: 'id', label: 'ID' },
  { key: 'user.firstName', label: 'Prenom' },
  { key: 'user.lastName', label: 'Nom' },
  { key: 'user.email', label: 'Email' },
  { key: 'role', label: 'Role' },
  { key: 'festival.name', label: 'Festival' },
  {
    key: 'isActive',
    label: 'Actif',
    format: (v) => (v ? 'Oui' : 'Non'),
  },
  {
    key: 'assignedAt',
    label: 'Date assignation',
    format: (v) => formatDateForExport(v as string),
  },
];
