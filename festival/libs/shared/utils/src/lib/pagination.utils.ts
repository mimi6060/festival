// Pagination utility functions

/**
 * Pagination metadata
 */
export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  nextPage: number | null;
  previousPage: number | null;
}

/**
 * Paginated response
 */
export interface PaginatedResponse<T> {
  data: T[];
  meta: PaginationMeta;
}

/**
 * Pagination query parameters
 */
export interface PaginationParams {
  page: number;
  limit: number;
  offset: number;
}

/**
 * Default pagination values
 */
export const DEFAULT_PAGE = 1;
export const DEFAULT_LIMIT = 20;
export const MAX_LIMIT = 100;

/**
 * Build pagination metadata
 */
export function buildPaginationMeta(
  page: number,
  limit: number,
  total: number
): PaginationMeta {
  const totalPages = Math.ceil(total / limit);
  const hasNextPage = page < totalPages;
  const hasPreviousPage = page > 1;

  return {
    page,
    limit,
    total,
    totalPages,
    hasNextPage,
    hasPreviousPage,
    nextPage: hasNextPage ? page + 1 : null,
    previousPage: hasPreviousPage ? page - 1 : null,
  };
}

/**
 * Parse pagination parameters from query
 */
export function parsePaginationParams(
  query: Record<string, unknown>,
  options?: {
    defaultLimit?: number;
    maxLimit?: number;
  }
): PaginationParams {
  const { defaultLimit = DEFAULT_LIMIT, maxLimit = MAX_LIMIT } = options || {};

  // Parse page
  let page = parseInt(String(query['page'] || ''), 10);
  if (isNaN(page) || page < 1) {
    page = DEFAULT_PAGE;
  }

  // Parse limit
  let limit = parseInt(String(query['limit'] || query['pageSize'] || ''), 10);
  if (isNaN(limit) || limit < 1) {
    limit = defaultLimit;
  }
  if (limit > maxLimit) {
    limit = maxLimit;
  }

  // Calculate offset
  const offset = (page - 1) * limit;

  return { page, limit, offset };
}

/**
 * Create a paginated response
 */
export function createPaginatedResponse<T>(
  data: T[],
  page: number,
  limit: number,
  total: number
): PaginatedResponse<T> {
  return {
    data,
    meta: buildPaginationMeta(page, limit, total),
  };
}

/**
 * Paginate an array in memory
 */
export function paginateArray<T>(
  items: T[],
  page: number,
  limit: number
): PaginatedResponse<T> {
  const total = items.length;
  const offset = (page - 1) * limit;
  const data = items.slice(offset, offset + limit);

  return createPaginatedResponse(data, page, limit, total);
}

/**
 * Calculate skip for database queries (alias for offset)
 */
export function calculateSkip(page: number, limit: number): number {
  return (page - 1) * limit;
}

/**
 * Calculate take for database queries (alias for limit)
 */
export function calculateTake(limit: number, maxLimit: number = MAX_LIMIT): number {
  return Math.min(Math.max(1, limit), maxLimit);
}

/**
 * Get page numbers for pagination UI
 */
export function getPageNumbers(
  currentPage: number,
  totalPages: number,
  maxButtons: number = 7
): (number | 'ellipsis')[] {
  if (totalPages <= maxButtons) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }

  const halfButtons = Math.floor(maxButtons / 2);
  const pages: (number | 'ellipsis')[] = [];

  // Always include first page
  pages.push(1);

  // Calculate start and end of middle section
  let start = Math.max(2, currentPage - halfButtons + 1);
  let end = Math.min(totalPages - 1, currentPage + halfButtons - 1);

  // Adjust if we're near the beginning
  if (currentPage <= halfButtons) {
    end = Math.min(totalPages - 1, maxButtons - 2);
  }

  // Adjust if we're near the end
  if (currentPage > totalPages - halfButtons) {
    start = Math.max(2, totalPages - maxButtons + 3);
  }

  // Add ellipsis before middle section if needed
  if (start > 2) {
    pages.push('ellipsis');
  }

  // Add middle pages
  for (let i = start; i <= end; i++) {
    pages.push(i);
  }

  // Add ellipsis after middle section if needed
  if (end < totalPages - 1) {
    pages.push('ellipsis');
  }

  // Always include last page
  if (totalPages > 1) {
    pages.push(totalPages);
  }

  return pages;
}

/**
 * Validate pagination parameters
 */
export function validatePaginationParams(
  page: number,
  limit: number,
  total?: number
): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!Number.isInteger(page) || page < 1) {
    errors.push('Page must be a positive integer');
  }

  if (!Number.isInteger(limit) || limit < 1) {
    errors.push('Limit must be a positive integer');
  }

  if (limit > MAX_LIMIT) {
    errors.push(`Limit cannot exceed ${MAX_LIMIT}`);
  }

  if (total !== undefined && total >= 0) {
    const maxPage = Math.ceil(total / limit) || 1;
    if (page > maxPage) {
      errors.push(`Page ${page} exceeds maximum page ${maxPage}`);
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Create cursor-based pagination response
 */
export interface CursorPaginationMeta {
  cursor: string | null;
  nextCursor: string | null;
  hasMore: boolean;
  limit: number;
}

export interface CursorPaginatedResponse<T> {
  data: T[];
  meta: CursorPaginationMeta;
}

/**
 * Build cursor pagination metadata
 */
export function buildCursorPaginationMeta(
  lastCursor: string | null,
  hasMore: boolean,
  limit: number
): CursorPaginationMeta {
  return {
    cursor: null, // Current cursor (optional)
    nextCursor: hasMore ? lastCursor : null,
    hasMore,
    limit,
  };
}

/**
 * Encode a cursor (typically an ID or timestamp)
 */
export function encodeCursor(value: string | number | Date): string {
  const stringValue =
    value instanceof Date ? value.toISOString() : String(value);
  return Buffer.from(stringValue).toString('base64url');
}

/**
 * Decode a cursor
 */
export function decodeCursor(cursor: string): string {
  try {
    return Buffer.from(cursor, 'base64url').toString('utf-8');
  } catch {
    return '';
  }
}

/**
 * Parse cursor from query
 */
export function parseCursor(
  query: Record<string, unknown>
): string | undefined {
  const cursor = query['cursor'] || query['after'];
  if (typeof cursor === 'string' && cursor.length > 0) {
    return decodeCursor(cursor);
  }
  return undefined;
}

// ==================== ADVANCED OPTIMIZATION HELPERS ====================

/**
 * Build efficient WHERE clause for time-range queries
 */
export function buildTimeRangeWhere(
  startDate?: string | Date,
  endDate?: string | Date,
  fieldName: string = 'createdAt'
): Record<string, any> {
  const where: Record<string, any> = {};

  if (startDate || endDate) {
    where[fieldName] = {};
    if (startDate) {
      where[fieldName].gte = new Date(startDate);
    }
    if (endDate) {
      where[fieldName].lte = new Date(endDate);
    }
  }

  return where;
}

/**
 * Build search WHERE clause with OR conditions
 */
export function buildSearchWhere(
  search: string | undefined,
  fields: string[],
  mode: 'contains' | 'startsWith' = 'contains'
): Record<string, any> | undefined {
  if (!search || search.trim().length === 0) {
    return undefined;
  }

  const trimmedSearch = search.trim();

  return {
    OR: fields.map((field) => ({
      [field]: {
        [mode]: trimmedSearch,
        mode: 'insensitive',
      },
    })),
  };
}

/**
 * Build sort order from query parameters
 */
export function buildSortOrder(
  sortBy?: string,
  sortOrder?: 'asc' | 'desc',
  defaultSort: { field: string; order: 'asc' | 'desc' } = { field: 'createdAt', order: 'desc' },
  allowedFields: string[] = []
): Record<string, 'asc' | 'desc'> {
  // Validate sort field
  const field =
    sortBy && (allowedFields.length === 0 || allowedFields.includes(sortBy))
      ? sortBy
      : defaultSort.field;

  const order = sortOrder || defaultSort.order;

  return { [field]: order };
}

/**
 * Efficient field selection builder
 * Converts array of field names to Prisma select object
 */
export function buildSelectFields(
  fields?: string[],
  alwaysInclude: string[] = ['id']
): Record<string, boolean> | undefined {
  if (!fields || fields.length === 0) {
    return undefined; // Return all fields
  }

  const select: Record<string, boolean> = {};

  // Always include required fields
  for (const field of alwaysInclude) {
    select[field] = true;
  }

  // Add requested fields
  for (const field of fields) {
    select[field] = true;
  }

  return select;
}

/**
 * Build include with limited depth to prevent N+1 queries
 */
export function buildLimitedInclude(
  include: Record<string, any>,
  maxDepth: number = 2,
  currentDepth: number = 0
): Record<string, any> | undefined {
  if (currentDepth >= maxDepth) {
    return undefined;
  }

  const limitedInclude: Record<string, any> = {};

  for (const [key, value] of Object.entries(include)) {
    if (typeof value === 'boolean') {
      limitedInclude[key] = value;
    } else if (typeof value === 'object') {
      const nested = buildLimitedInclude(value.include || {}, maxDepth, currentDepth + 1);
      limitedInclude[key] = nested ? { ...value, include: nested } : { ...value, include: undefined };
    }
  }

  return limitedInclude;
}

/**
 * Batch fetching helper for resolving relations efficiently
 * Helps prevent N+1 queries by batch loading related entities
 */
export async function batchFetch<T, R>(
  items: T[],
  getKey: (item: T) => string | undefined,
  fetcher: (ids: string[]) => Promise<Map<string, R>>,
  setResult: (item: T, result: R | undefined) => T
): Promise<T[]> {
  const ids = [...new Set(items.map(getKey).filter((id): id is string => Boolean(id)))];

  if (ids.length === 0) {
    return items;
  }

  const relatedItems = await fetcher(ids);

  return items.map((item) => {
    const key = getKey(item);
    return key ? setResult(item, relatedItems.get(key)) : item;
  });
}

/**
 * Optimized count query helper
 * Uses estimation for large tables when exact count is not required
 */
export async function getOptimizedCount(
  countFn: (where: any) => Promise<number>,
  where: any,
  options?: { useEstimate?: boolean; threshold?: number }
): Promise<{ count: number; isEstimate: boolean }> {
  const { useEstimate = false, threshold = 10000 } = options || {};

  if (!useEstimate) {
    const count = await countFn(where);
    return { count, isEstimate: false };
  }

  // For large datasets, use a threshold-based approach
  // This is a simplified version - in production, you might use
  // database-specific estimation techniques
  const count = await countFn(where);

  return {
    count: Math.min(count, threshold),
    isEstimate: count > threshold,
  };
}

/**
 * Create keyset/cursor-based pagination WHERE clause
 * More efficient than offset pagination for large datasets
 */
export function buildKeysetWhere(
  cursor: string | undefined,
  sortField: string = 'createdAt',
  sortOrder: 'asc' | 'desc' = 'desc'
): Record<string, any> {
  if (!cursor) {
    return {};
  }

  try {
    const decoded = decodeCursor(cursor);
    const parsed = JSON.parse(decoded);

    const operator = sortOrder === 'desc' ? 'lt' : 'gt';

    // For compound cursors (id + timestamp)
    if (parsed.timestamp && parsed.id) {
      return {
        OR: [
          { [sortField]: { [operator]: new Date(parsed.timestamp) } },
          {
            AND: [
              { [sortField]: new Date(parsed.timestamp) },
              { id: { [operator]: parsed.id } },
            ],
          },
        ],
      };
    }

    // For simple ID cursor
    return { id: { [operator]: parsed.id || parsed } };
  } catch {
    return {};
  }
}

/**
 * Merge multiple WHERE conditions with AND
 */
export function mergeWhereConditions(
  ...conditions: (Record<string, any> | undefined)[]
): Record<string, any> {
  const validConditions = conditions.filter(
    (c): c is Record<string, any> => c !== undefined && Object.keys(c).length > 0
  );

  if (validConditions.length === 0) {
    return {};
  }

  if (validConditions.length === 1) {
    return validConditions[0];
  }

  return {
    AND: validConditions,
  };
}
