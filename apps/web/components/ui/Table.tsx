'use client';

import React from 'react';

/**
 * Table size options
 */
export type TableSize = 'sm' | 'md' | 'lg';

/**
 * Table variant styles
 */
export type TableVariant = 'default' | 'striped' | 'bordered';

/**
 * Props for the Table component
 */
export interface TableProps {
  /** Table size */
  size?: TableSize;
  /** Visual style variant */
  variant?: TableVariant;
  /** Whether rows are hoverable */
  hoverable?: boolean;
  /** Table content */
  children: React.ReactNode;
  /** Additional CSS classes */
  className?: string;
}

const sizeStyles: Record<TableSize, string> = {
  sm: 'text-sm',
  md: 'text-base',
  lg: 'text-lg',
};

/**
 * Table component for displaying data in rows and columns.
 *
 * @example
 * ```tsx
 * <Table>
 *   <TableHeader>
 *     <TableRow>
 *       <TableHead>Name</TableHead>
 *       <TableHead>Status</TableHead>
 *     </TableRow>
 *   </TableHeader>
 *   <TableBody>
 *     <TableRow>
 *       <TableCell>John</TableCell>
 *       <TableCell>Active</TableCell>
 *     </TableRow>
 *   </TableBody>
 * </Table>
 * ```
 */
export function Table({
  size = 'md',
  variant = 'default',
  hoverable = true,
  children,
  className = '',
}: TableProps) {
  return (
    <div
      className={`
        w-full
        bg-white/5
        border border-white/10
        rounded-2xl
        overflow-hidden
        ${className}
      `}
    >
      <table
        className={`
          w-full
          ${sizeStyles[size]}
          ${variant === 'bordered' ? 'border-collapse' : ''}
        `}
        data-variant={variant}
        data-hoverable={hoverable}
      >
        {children}
      </table>
    </div>
  );
}

/**
 * Props for TableHeader
 */
export interface TableHeaderProps {
  children: React.ReactNode;
  className?: string;
}

/**
 * Table header section
 */
export function TableHeader({ children, className = '' }: TableHeaderProps) {
  return <thead className={`bg-white/5 ${className}`}>{children}</thead>;
}

/**
 * Props for TableBody
 */
export interface TableBodyProps {
  children: React.ReactNode;
  className?: string;
}

/**
 * Table body section
 */
export function TableBody({ children, className = '' }: TableBodyProps) {
  return <tbody className={`divide-y divide-white/5 ${className}`}>{children}</tbody>;
}

/**
 * Props for TableRow
 */
export interface TableRowProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
  selected?: boolean;
}

/**
 * Table row component
 */
export function TableRow({ children, className = '', onClick, selected = false }: TableRowProps) {
  return (
    <tr
      onClick={onClick}
      className={`
        transition-colors duration-150
        ${onClick ? 'cursor-pointer' : ''}
        ${selected ? 'bg-primary-500/10' : ''}
        hover:bg-white/5
        ${className}
      `}
    >
      {children}
    </tr>
  );
}

/**
 * Props for TableHead
 */
export interface TableHeadProps {
  children: React.ReactNode;
  className?: string;
  align?: 'left' | 'center' | 'right';
  sortable?: boolean;
  sorted?: 'asc' | 'desc' | null;
  onSort?: () => void;
}

const alignStyles: Record<string, string> = {
  left: 'text-left',
  center: 'text-center',
  right: 'text-right',
};

/**
 * Table header cell component
 */
export function TableHead({
  children,
  className = '',
  align = 'left',
  sortable = false,
  sorted = null,
  onSort,
}: TableHeadProps) {
  return (
    <th
      className={`
        px-6 py-4
        font-semibold
        text-white/80
        ${alignStyles[align]}
        ${sortable ? 'cursor-pointer select-none hover:text-white' : ''}
        ${className}
      `}
      onClick={sortable ? onSort : undefined}
    >
      <div className="flex items-center gap-2">
        {children}
        {sortable && (
          <span className="flex flex-col">
            <svg
              className={`w-3 h-3 ${sorted === 'asc' ? 'text-primary-500' : 'text-white/30'}`}
              fill="currentColor"
              viewBox="0 0 24 24"
            >
              <path d="M12 8l-6 6h12z" />
            </svg>
            <svg
              className={`w-3 h-3 -mt-1 ${sorted === 'desc' ? 'text-primary-500' : 'text-white/30'}`}
              fill="currentColor"
              viewBox="0 0 24 24"
            >
              <path d="M12 16l-6-6h12z" />
            </svg>
          </span>
        )}
      </div>
    </th>
  );
}

/**
 * Props for TableCell
 */
export interface TableCellProps {
  children: React.ReactNode;
  className?: string;
  align?: 'left' | 'center' | 'right';
  colSpan?: number;
}

/**
 * Table data cell component
 */
export function TableCell({ children, className = '', align = 'left', colSpan }: TableCellProps) {
  return (
    <td
      className={`
        px-6 py-4
        text-white/70
        ${alignStyles[align]}
        ${className}
      `}
      colSpan={colSpan}
    >
      {children}
    </td>
  );
}

/**
 * Props for TableFooter
 */
export interface TableFooterProps {
  children: React.ReactNode;
  className?: string;
}

/**
 * Table footer section
 */
export function TableFooter({ children, className = '' }: TableFooterProps) {
  return <tfoot className={`bg-white/5 border-t border-white/10 ${className}`}>{children}</tfoot>;
}

/**
 * Empty state component for tables
 *
 * Uses standardized empty state styling:
 * - Icon: text-white/20 w-16 h-16
 * - Title: text-xl font-semibold text-white/70
 * - Description: text-white/50 text-center
 * - Container: flex flex-col items-center py-12
 */
export interface TableEmptyProps {
  message?: string;
  description?: string;
  icon?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}

export function TableEmpty({
  message = 'No data available',
  description,
  icon,
  action,
  className = '',
}: TableEmptyProps) {
  return (
    <tr>
      <td colSpan={100} className={className}>
        <div className="flex flex-col items-center py-12">
          {icon && (
            <div className="text-white/20 w-16 h-16 mb-4 flex items-center justify-center">
              {icon}
            </div>
          )}
          <h3 className="text-xl font-semibold text-white/70 mb-2">{message}</h3>
          {description && <p className="text-white/50 text-center max-w-md">{description}</p>}
          {action && <div className="mt-6">{action}</div>}
        </div>
      </td>
    </tr>
  );
}

Table.displayName = 'Table';
TableHeader.displayName = 'TableHeader';
TableBody.displayName = 'TableBody';
TableRow.displayName = 'TableRow';
TableHead.displayName = 'TableHead';
TableCell.displayName = 'TableCell';
TableFooter.displayName = 'TableFooter';
TableEmpty.displayName = 'TableEmpty';
