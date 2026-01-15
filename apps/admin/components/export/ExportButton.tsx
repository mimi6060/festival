'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { cn } from '../../lib/utils';
import {
  exportToCSV,
  exportToExcel,
  exportToJSON,
  exportTicketsToXlsx,
  exportTransactionsToXlsx,
  exportParticipantsToXlsx,
  pollExportJob,
  downloadExportFile,
  downloadBlobAsFile,
  type ExportColumn,
  type ExportOptions,
  type ExportFilters,
  type ExportResponse,
} from '../../lib/export';

export type ExportFormat = 'csv' | 'excel' | 'json' | 'xlsx-server';
export type ExportType = 'tickets' | 'transactions' | 'participants' | 'custom';

interface ExportButtonProps<T extends Record<string, unknown>> {
  // For client-side exports
  data?: T[];
  columns?: ExportColumn<T>[];
  filename?: string;

  // For server-side exports
  exportType?: ExportType;
  filters?: ExportFilters;

  // Common options
  formats?: ExportFormat[];
  className?: string;
  disabled?: boolean;
  onExportStart?: () => void;
  onExportComplete?: (format: ExportFormat) => void;
  onExportError?: (error: Error) => void;
  onProgress?: (progress: number) => void;
}

export default function ExportButton<T extends Record<string, unknown>>({
  data,
  columns,
  filename = 'export',
  exportType = 'custom',
  filters,
  formats = ['csv', 'excel', 'json'],
  className,
  disabled = false,
  onExportStart,
  onExportComplete,
  onExportError,
  onProgress,
}: ExportButtonProps<T>) {
  const [isOpen, setIsOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const [asyncJobId, setAsyncJobId] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Progress callback
  const handleProgress = useCallback(
    (progress: number) => {
      setExportProgress(progress);
      onProgress?.(progress);
    },
    [onProgress]
  );

  // Handle server-side XLSX export
  const handleServerExport = async () => {
    if (!filters?.festivalId) {
      throw new Error('Festival ID is required for server export');
    }

    let exportFn: (filters: ExportFilters) => Promise<ExportResponse | Blob>;

    switch (exportType) {
      case 'tickets':
        exportFn = exportTicketsToXlsx;
        break;
      case 'transactions':
        exportFn = exportTransactionsToXlsx;
        break;
      case 'participants':
        exportFn = exportParticipantsToXlsx;
        break;
      default:
        throw new Error(`Unsupported export type: ${exportType}`);
    }

    const result = await exportFn(filters);

    // Check if async response
    if (result instanceof Blob) {
      // Sync response - download immediately
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
      downloadBlobAsFile(result, `${filename}_${timestamp}.xlsx`);
      return;
    }

    // Async response - poll for completion
    if (result.async && result.jobId) {
      setAsyncJobId(result.jobId);
      setExportProgress(0);

      const status = await pollExportJob(
        result.jobId,
        handleProgress,
        2000,
        120 // 4 minutes max
      );

      if (status.status === 'completed' && status.result) {
        // Download the file
        const blob = await downloadExportFile(result.jobId);
        downloadBlobAsFile(blob, status.result.filename);
      }

      setAsyncJobId(null);
    }
  };

  const handleExport = async (format: ExportFormat) => {
    const isClientExport = format !== 'xlsx-server';
    const hasClientData = data && data.length > 0 && columns;

    if (disabled || isExporting) {return;}
    if (isClientExport && !hasClientData) {return;}
    if (!isClientExport && !filters?.festivalId) {return;}

    setIsExporting(true);
    setIsOpen(false);
    setExportProgress(0);
    onExportStart?.();

    try {
      if (format === 'xlsx-server') {
        await handleServerExport();
      } else {
        // Client-side export
        const options: Partial<ExportOptions> = {
          filename,
          includeTimestamp: true,
        };

        // Simulate async operation for better UX
        await new Promise((resolve) => setTimeout(resolve, 100));

        switch (format) {
          case 'csv':
            exportToCSV(data!, columns!, options);
            break;
          case 'excel':
            exportToExcel(data!, columns!, options);
            break;
          case 'json':
            exportToJSON(data!, options);
            break;
        }
      }

      onExportComplete?.(format);
    } catch (error) {
      console.error('Export error:', error);
      onExportError?.(error as Error);
    } finally {
      setIsExporting(false);
      setExportProgress(0);
      setAsyncJobId(null);
    }
  };

  const formatLabels: Record<ExportFormat, { label: string; icon: string; description?: string }> =
    {
      csv: { label: 'CSV', icon: 'file-text' },
      excel: { label: 'Excel (XML)', icon: 'file-spreadsheet' },
      json: { label: 'JSON', icon: 'braces' },
      'xlsx-server': {
        label: 'Excel (XLSX)',
        icon: 'file-spreadsheet',
        description: 'Export via serveur',
      },
    };

  const isClientExportDisabled = disabled || (!data || data.length === 0);
  const isServerExportDisabled = disabled || !filters?.festivalId;

  const getIsFormatDisabled = (format: ExportFormat) => {
    if (format === 'xlsx-server') {
      return isServerExportDisabled;
    }
    return isClientExportDisabled;
  };

  const getDataCount = () => {
    if (data && data.length > 0) {
      return data.length;
    }
    return null;
  };

  return (
    <div className={cn('relative', className)} ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        disabled={isExporting}
        className={cn(
          'btn-secondary flex items-center gap-2',
          (isClientExportDisabled && isServerExportDisabled) && 'opacity-50 cursor-not-allowed'
        )}
      >
        {isExporting ? (
          <>
            <svg
              className="w-4 h-4 animate-spin"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
            {asyncJobId ? (
              <span>Export en cours... {exportProgress}%</span>
            ) : (
              <span>Export en cours...</span>
            )}
          </>
        ) : (
          <>
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
              />
            </svg>
            Exporter
            <svg
              className={cn(
                'w-4 h-4 transition-transform',
                isOpen && 'rotate-180'
              )}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 9l-7 7-7-7"
              />
            </svg>
          </>
        )}
      </button>

      {/* Progress bar for async exports */}
      {isExporting && asyncJobId && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded shadow-lg border border-gray-200 p-2">
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-indigo-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${exportProgress}%` }}
            />
          </div>
          <p className="text-xs text-gray-500 mt-1 text-center">
            Traitement en cours... {exportProgress}%
          </p>
        </div>
      )}

      {/* Dropdown Menu */}
      {isOpen && !isExporting && (
        <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50 animate-in fade-in slide-in-from-top-1">
          <div className="px-3 py-2 text-xs font-medium text-gray-500 uppercase tracking-wider border-b border-gray-100">
            Format d'export
          </div>
          {formats.map((format) => {
            const formatInfo = formatLabels[format];
            const isFormatDisabled = getIsFormatDisabled(format);

            return (
              <button
                key={format}
                onClick={() => !isFormatDisabled && handleExport(format)}
                disabled={isFormatDisabled}
                className={cn(
                  'w-full px-4 py-2 text-left text-sm flex items-center gap-3 transition-colors',
                  isFormatDisabled
                    ? 'text-gray-400 cursor-not-allowed'
                    : 'text-gray-700 hover:bg-gray-50'
                )}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  {format === 'json' ? (
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"
                    />
                  ) : (
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                    />
                  )}
                </svg>
                <div className="flex-1">
                  <span>{formatInfo.label}</span>
                  {formatInfo.description && (
                    <span className="block text-xs text-gray-400">
                      {formatInfo.description}
                    </span>
                  )}
                </div>
                <span className="text-xs text-gray-400">
                  .{format === 'excel' ? 'xls' : format === 'xlsx-server' ? 'xlsx' : format}
                </span>
              </button>
            );
          })}
          {getDataCount() !== null && (
            <div className="border-t border-gray-100 mt-1 pt-1 px-3 py-2">
              <p className="text-xs text-gray-500">
                {getDataCount()} enregistrement{(getDataCount() || 0) > 1 ? 's' : ''}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * Server-side export button variant
 * Specialized for large dataset exports
 */
interface ServerExportButtonProps {
  exportType: ExportType;
  filters: ExportFilters;
  filename?: string;
  className?: string;
  disabled?: boolean;
  onExportStart?: () => void;
  onExportComplete?: () => void;
  onExportError?: (error: Error) => void;
  onProgress?: (progress: number) => void;
}

export function ServerExportButton({
  exportType,
  filters,
  filename,
  className,
  disabled,
  onExportStart,
  onExportComplete,
  onExportError,
  onProgress,
}: ServerExportButtonProps) {
  return (
    <ExportButton
      exportType={exportType}
      filters={filters}
      filename={filename || `export_${exportType}`}
      formats={['xlsx-server']}
      className={className}
      disabled={disabled}
      onExportStart={onExportStart}
      onExportComplete={onExportComplete}
      onExportError={onExportError}
      onProgress={onProgress}
    />
  );
}
