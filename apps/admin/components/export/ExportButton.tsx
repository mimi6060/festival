'use client';

import { useState, useRef, useEffect } from 'react';
import { cn } from '../../lib/utils';
import type { ExportColumn, ExportOptions } from '../../lib/export';
import { exportToCSV, exportToExcel, exportToJSON } from '../../lib/export';

export type ExportFormat = 'csv' | 'excel' | 'json';

interface ExportButtonProps<T extends Record<string, unknown>> {
  data: T[];
  columns: ExportColumn<T>[];
  filename: string;
  formats?: ExportFormat[];
  className?: string;
  disabled?: boolean;
  onExportStart?: () => void;
  onExportComplete?: (format: ExportFormat) => void;
  onExportError?: (error: Error) => void;
}

export default function ExportButton<T extends Record<string, unknown>>({
  data,
  columns,
  filename,
  formats = ['csv', 'excel', 'json'],
  className,
  disabled = false,
  onExportStart,
  onExportComplete,
  onExportError,
}: ExportButtonProps<T>) {
  const [isOpen, setIsOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
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

  const handleExport = async (format: ExportFormat) => {
    if (disabled || isExporting || data.length === 0) return;

    setIsExporting(true);
    setIsOpen(false);
    onExportStart?.();

    try {
      const options: Partial<ExportOptions> = {
        filename,
        includeTimestamp: true,
      };

      // Simulate async operation for better UX
      await new Promise((resolve) => setTimeout(resolve, 100));

      switch (format) {
        case 'csv':
          exportToCSV(data, columns, options);
          break;
        case 'excel':
          exportToExcel(data, columns, options);
          break;
        case 'json':
          exportToJSON(data, options);
          break;
      }

      onExportComplete?.(format);
    } catch (error) {
      console.error('Export error:', error);
      onExportError?.(error as Error);
    } finally {
      setIsExporting(false);
    }
  };

  const formatLabels: Record<ExportFormat, { label: string; icon: string }> = {
    csv: { label: 'CSV', icon: '📄' },
    excel: { label: 'Excel', icon: '📊' },
    json: { label: 'JSON', icon: '{ }' },
  };

  const isDisabled = disabled || data.length === 0;

  return (
    <div className={cn('relative', className)} ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        disabled={isDisabled || isExporting}
        className={cn(
          'btn-secondary flex items-center gap-2',
          isDisabled && 'opacity-50 cursor-not-allowed'
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
            Export en cours...
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

      {/* Dropdown Menu */}
      {isOpen && !isExporting && (
        <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50 animate-in fade-in slide-in-from-top-1">
          <div className="px-3 py-2 text-xs font-medium text-gray-500 uppercase tracking-wider border-b border-gray-100">
            Format d'export
          </div>
          {formats.map((format) => (
            <button
              key={format}
              onClick={() => handleExport(format)}
              className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-3 transition-colors"
            >
              <span className="text-base">{formatLabels[format].icon}</span>
              <span>{formatLabels[format].label}</span>
              <span className="ml-auto text-xs text-gray-400">
                .{format === 'excel' ? 'xlsx' : format}
              </span>
            </button>
          ))}
          <div className="border-t border-gray-100 mt-1 pt-1 px-3 py-2">
            <p className="text-xs text-gray-500">
              {data.length} enregistrement{data.length > 1 ? 's' : ''}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
