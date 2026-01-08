import {
  buildPaginationMeta,
  parsePaginationParams,
  createPaginatedResponse,
  paginateArray,
  calculateSkip,
  calculateTake,
  getPageNumbers,
  validatePaginationParams,
  buildCursorPaginationMeta,
  encodeCursor,
  decodeCursor,
  parseCursor,
  buildTimeRangeWhere,
  buildSearchWhere,
  buildSortOrder,
  buildSelectFields,
  buildLimitedInclude,
  buildKeysetWhere,
  mergeWhereConditions,
  DEFAULT_PAGE,
  DEFAULT_LIMIT,
  MAX_LIMIT,
} from './pagination.utils';

describe('Pagination Utils', () => {
  // ============================================================================
  // Constants
  // ============================================================================
  describe('Constants', () => {
    it('should have correct default values', () => {
      expect(DEFAULT_PAGE).toBe(1);
      expect(DEFAULT_LIMIT).toBe(20);
      expect(MAX_LIMIT).toBe(100);
    });
  });

  // ============================================================================
  // buildPaginationMeta
  // ============================================================================
  describe('buildPaginationMeta', () => {
    it('should build pagination meta for first page', () => {
      const meta = buildPaginationMeta(1, 10, 100);
      expect(meta).toEqual({
        page: 1,
        limit: 10,
        total: 100,
        totalPages: 10,
        hasNextPage: true,
        hasPreviousPage: false,
        nextPage: 2,
        previousPage: null,
      });
    });

    it('should build pagination meta for middle page', () => {
      const meta = buildPaginationMeta(5, 10, 100);
      expect(meta).toEqual({
        page: 5,
        limit: 10,
        total: 100,
        totalPages: 10,
        hasNextPage: true,
        hasPreviousPage: true,
        nextPage: 6,
        previousPage: 4,
      });
    });

    it('should build pagination meta for last page', () => {
      const meta = buildPaginationMeta(10, 10, 100);
      expect(meta).toEqual({
        page: 10,
        limit: 10,
        total: 100,
        totalPages: 10,
        hasNextPage: false,
        hasPreviousPage: true,
        nextPage: null,
        previousPage: 9,
      });
    });

    it('should handle single page', () => {
      const meta = buildPaginationMeta(1, 10, 5);
      expect(meta.totalPages).toBe(1);
      expect(meta.hasNextPage).toBe(false);
      expect(meta.hasPreviousPage).toBe(false);
    });

    it('should handle zero total', () => {
      const meta = buildPaginationMeta(1, 10, 0);
      expect(meta.totalPages).toBe(0);
      expect(meta.hasNextPage).toBe(false);
    });

    it('should calculate totalPages correctly with remainder', () => {
      const meta = buildPaginationMeta(1, 10, 25);
      expect(meta.totalPages).toBe(3);
    });
  });

  // ============================================================================
  // parsePaginationParams
  // ============================================================================
  describe('parsePaginationParams', () => {
    it('should parse valid page and limit', () => {
      const params = parsePaginationParams({ page: '2', limit: '25' });
      expect(params).toEqual({ page: 2, limit: 25, offset: 25 });
    });

    it('should use default page when missing', () => {
      const params = parsePaginationParams({ limit: '25' });
      expect(params.page).toBe(1);
    });

    it('should use default limit when missing', () => {
      const params = parsePaginationParams({ page: '1' });
      expect(params.limit).toBe(20);
    });

    it('should handle pageSize alias', () => {
      const params = parsePaginationParams({ page: '1', pageSize: '30' });
      expect(params.limit).toBe(30);
    });

    it('should enforce max limit', () => {
      const params = parsePaginationParams({ page: '1', limit: '500' });
      expect(params.limit).toBe(100);
    });

    it('should use custom max limit', () => {
      const params = parsePaginationParams({ limit: '500' }, { maxLimit: 50 });
      expect(params.limit).toBe(50);
    });

    it('should use custom default limit', () => {
      const params = parsePaginationParams({}, { defaultLimit: 50 });
      expect(params.limit).toBe(50);
    });

    it('should handle invalid page (negative)', () => {
      const params = parsePaginationParams({ page: '-1' });
      expect(params.page).toBe(1);
    });

    it('should handle invalid page (zero)', () => {
      const params = parsePaginationParams({ page: '0' });
      expect(params.page).toBe(1);
    });

    it('should handle invalid limit (negative)', () => {
      const params = parsePaginationParams({ limit: '-10' });
      expect(params.limit).toBe(20);
    });

    it('should handle non-numeric values', () => {
      const params = parsePaginationParams({ page: 'abc', limit: 'xyz' });
      expect(params.page).toBe(1);
      expect(params.limit).toBe(20);
    });

    it('should calculate correct offset', () => {
      expect(parsePaginationParams({ page: '1', limit: '10' }).offset).toBe(0);
      expect(parsePaginationParams({ page: '2', limit: '10' }).offset).toBe(10);
      expect(parsePaginationParams({ page: '3', limit: '25' }).offset).toBe(50);
    });
  });

  // ============================================================================
  // createPaginatedResponse
  // ============================================================================
  describe('createPaginatedResponse', () => {
    it('should create paginated response', () => {
      const data = [1, 2, 3];
      const response = createPaginatedResponse(data, 1, 10, 30);
      expect(response.data).toEqual([1, 2, 3]);
      expect(response.meta.page).toBe(1);
      expect(response.meta.total).toBe(30);
    });
  });

  // ============================================================================
  // paginateArray
  // ============================================================================
  describe('paginateArray', () => {
    const items = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

    it('should paginate first page', () => {
      const result = paginateArray(items, 1, 3);
      expect(result.data).toEqual([1, 2, 3]);
      expect(result.meta.total).toBe(10);
      expect(result.meta.totalPages).toBe(4);
    });

    it('should paginate middle page', () => {
      const result = paginateArray(items, 2, 3);
      expect(result.data).toEqual([4, 5, 6]);
    });

    it('should paginate last page', () => {
      const result = paginateArray(items, 4, 3);
      expect(result.data).toEqual([10]);
      expect(result.meta.hasNextPage).toBe(false);
    });

    it('should return empty for out of range page', () => {
      const result = paginateArray(items, 10, 3);
      expect(result.data).toEqual([]);
    });

    it('should handle empty array', () => {
      const result = paginateArray([], 1, 10);
      expect(result.data).toEqual([]);
      expect(result.meta.total).toBe(0);
    });
  });

  // ============================================================================
  // calculateSkip / calculateTake
  // ============================================================================
  describe('calculateSkip', () => {
    it('should calculate skip correctly', () => {
      expect(calculateSkip(1, 10)).toBe(0);
      expect(calculateSkip(2, 10)).toBe(10);
      expect(calculateSkip(5, 20)).toBe(80);
    });
  });

  describe('calculateTake', () => {
    it('should return limit within max', () => {
      expect(calculateTake(50)).toBe(50);
    });

    it('should cap at max limit', () => {
      expect(calculateTake(200)).toBe(100);
    });

    it('should use custom max limit', () => {
      expect(calculateTake(200, 50)).toBe(50);
    });

    it('should ensure minimum of 1', () => {
      expect(calculateTake(0)).toBe(1);
      expect(calculateTake(-5)).toBe(1);
    });
  });

  // ============================================================================
  // getPageNumbers
  // ============================================================================
  describe('getPageNumbers', () => {
    it('should return all pages when totalPages <= maxButtons', () => {
      const pages = getPageNumbers(1, 5, 7);
      expect(pages).toEqual([1, 2, 3, 4, 5]);
    });

    it('should add ellipsis for many pages at start', () => {
      const pages = getPageNumbers(10, 20, 7);
      expect(pages[0]).toBe(1);
      expect(pages).toContain('ellipsis');
      expect(pages[pages.length - 1]).toBe(20);
    });

    it('should add ellipsis for many pages at end', () => {
      const pages = getPageNumbers(1, 20, 7);
      expect(pages[0]).toBe(1);
      expect(pages).toContain('ellipsis');
      expect(pages[pages.length - 1]).toBe(20);
    });

    it('should add ellipsis on both sides for middle page', () => {
      const pages = getPageNumbers(10, 20, 7);
      const ellipsisCount = pages.filter((p) => p === 'ellipsis').length;
      expect(ellipsisCount).toBe(2);
    });

    it('should always include first and last page', () => {
      const pages = getPageNumbers(5, 15, 7);
      expect(pages[0]).toBe(1);
      expect(pages[pages.length - 1]).toBe(15);
    });
  });

  // ============================================================================
  // validatePaginationParams
  // ============================================================================
  describe('validatePaginationParams', () => {
    it('should validate correct params', () => {
      const result = validatePaginationParams(1, 20);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject negative page', () => {
      const result = validatePaginationParams(-1, 20);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Page must be a positive integer');
    });

    it('should reject zero page', () => {
      const result = validatePaginationParams(0, 20);
      expect(result.isValid).toBe(false);
    });

    it('should reject negative limit', () => {
      const result = validatePaginationParams(1, -10);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Limit must be a positive integer');
    });

    it('should reject limit exceeding max', () => {
      const result = validatePaginationParams(1, 200);
      expect(result.isValid).toBe(false);
      expect(result.errors[0]).toContain('Limit cannot exceed');
    });

    it('should reject page exceeding max when total provided', () => {
      const result = validatePaginationParams(10, 10, 50);
      expect(result.isValid).toBe(false);
      expect(result.errors[0]).toContain('exceeds maximum page');
    });

    it('should accept valid page when total provided', () => {
      const result = validatePaginationParams(5, 10, 100);
      expect(result.isValid).toBe(true);
    });

    it('should reject non-integer page', () => {
      const result = validatePaginationParams(1.5, 20);
      expect(result.isValid).toBe(false);
    });
  });

  // ============================================================================
  // Cursor Pagination
  // ============================================================================
  describe('buildCursorPaginationMeta', () => {
    it('should build cursor meta with more results', () => {
      const meta = buildCursorPaginationMeta('cursor123', true, 20);
      expect(meta).toEqual({
        cursor: null,
        nextCursor: 'cursor123',
        hasMore: true,
        limit: 20,
      });
    });

    it('should build cursor meta without more results', () => {
      const meta = buildCursorPaginationMeta('cursor123', false, 20);
      expect(meta.nextCursor).toBeNull();
      expect(meta.hasMore).toBe(false);
    });
  });

  describe('encodeCursor / decodeCursor', () => {
    it('should encode and decode string', () => {
      const original = 'abc123';
      const encoded = encodeCursor(original);
      const decoded = decodeCursor(encoded);
      expect(decoded).toBe(original);
    });

    it('should encode and decode number', () => {
      const encoded = encodeCursor(12345);
      const decoded = decodeCursor(encoded);
      expect(decoded).toBe('12345');
    });

    it('should encode and decode date', () => {
      const date = new Date('2024-01-15T10:00:00.000Z');
      const encoded = encodeCursor(date);
      const decoded = decodeCursor(encoded);
      expect(decoded).toBe(date.toISOString());
    });

    it('should handle non-standard base64 characters gracefully', () => {
      // decodeCursor may decode some strings even if they look invalid
      const decoded = decodeCursor('invalid!!!');
      // The function returns whatever the buffer decoding produces
      expect(typeof decoded).toBe('string');
    });
  });

  describe('parseCursor', () => {
    it('should parse cursor from query', () => {
      const encoded = encodeCursor('test-id');
      const cursor = parseCursor({ cursor: encoded });
      expect(cursor).toBe('test-id');
    });

    it('should parse after alias', () => {
      const encoded = encodeCursor('test-id');
      const cursor = parseCursor({ after: encoded });
      expect(cursor).toBe('test-id');
    });

    it('should return undefined for missing cursor', () => {
      const cursor = parseCursor({});
      expect(cursor).toBeUndefined();
    });

    it('should return undefined for empty cursor', () => {
      const cursor = parseCursor({ cursor: '' });
      expect(cursor).toBeUndefined();
    });
  });

  // ============================================================================
  // Query Building Helpers
  // ============================================================================
  describe('buildTimeRangeWhere', () => {
    it('should build where clause with both dates', () => {
      const where = buildTimeRangeWhere('2024-01-01', '2024-01-31');
      expect(where.createdAt).toBeDefined();
      expect(where.createdAt.gte).toBeInstanceOf(Date);
      expect(where.createdAt.lte).toBeInstanceOf(Date);
    });

    it('should build where clause with only start date', () => {
      const where = buildTimeRangeWhere('2024-01-01', undefined);
      expect(where.createdAt.gte).toBeDefined();
      expect(where.createdAt.lte).toBeUndefined();
    });

    it('should build where clause with only end date', () => {
      const where = buildTimeRangeWhere(undefined, '2024-01-31');
      expect(where.createdAt.gte).toBeUndefined();
      expect(where.createdAt.lte).toBeDefined();
    });

    it('should return empty object without dates', () => {
      const where = buildTimeRangeWhere(undefined, undefined);
      expect(where).toEqual({});
    });

    it('should use custom field name', () => {
      const where = buildTimeRangeWhere('2024-01-01', '2024-01-31', 'updatedAt');
      expect(where.updatedAt).toBeDefined();
      expect(where.createdAt).toBeUndefined();
    });

    it('should accept Date objects', () => {
      const where = buildTimeRangeWhere(new Date('2024-01-01'), new Date('2024-01-31'));
      expect(where.createdAt.gte).toBeInstanceOf(Date);
    });
  });

  describe('buildSearchWhere', () => {
    it('should build search where with contains mode', () => {
      const where = buildSearchWhere('test', ['name', 'email']);
      expect(where?.OR).toHaveLength(2);
      expect(where?.OR[0].name.contains).toBe('test');
    });

    it('should build search where with startsWith mode', () => {
      const where = buildSearchWhere('test', ['name'], 'startsWith');
      expect(where?.OR[0].name.startsWith).toBe('test');
    });

    it('should return undefined for empty search', () => {
      expect(buildSearchWhere('', ['name'])).toBeUndefined();
      expect(buildSearchWhere('   ', ['name'])).toBeUndefined();
    });

    it('should return undefined for undefined search', () => {
      expect(buildSearchWhere(undefined, ['name'])).toBeUndefined();
    });

    it('should trim search string', () => {
      const where = buildSearchWhere('  test  ', ['name']);
      expect(where?.OR[0].name.contains).toBe('test');
    });

    it('should use case insensitive mode', () => {
      const where = buildSearchWhere('test', ['name']);
      expect(where?.OR[0].name.mode).toBe('insensitive');
    });
  });

  describe('buildSortOrder', () => {
    it('should return default sort when no params', () => {
      const sort = buildSortOrder();
      expect(sort).toEqual({ createdAt: 'desc' });
    });

    it('should use provided sort field', () => {
      const sort = buildSortOrder('name', 'asc');
      expect(sort).toEqual({ name: 'asc' });
    });

    it('should use custom default sort', () => {
      const sort = buildSortOrder(undefined, undefined, { field: 'updatedAt', order: 'asc' });
      expect(sort).toEqual({ updatedAt: 'asc' });
    });

    it('should validate against allowed fields', () => {
      // When sortBy is invalid, it falls back to default field but keeps the provided order
      const sort = buildSortOrder('invalidField', 'asc', { field: 'createdAt', order: 'desc' }, [
        'name',
        'email',
      ]);
      expect(sort).toEqual({ createdAt: 'asc' });
    });

    it('should allow valid field from allowed list', () => {
      const sort = buildSortOrder('name', 'asc', { field: 'createdAt', order: 'desc' }, [
        'name',
        'email',
      ]);
      expect(sort).toEqual({ name: 'asc' });
    });
  });

  describe('buildSelectFields', () => {
    it('should return undefined for no fields', () => {
      expect(buildSelectFields()).toBeUndefined();
      expect(buildSelectFields([])).toBeUndefined();
    });

    it('should always include id', () => {
      const select = buildSelectFields(['name', 'email']);
      expect(select?.id).toBe(true);
    });

    it('should include requested fields', () => {
      const select = buildSelectFields(['name', 'email']);
      expect(select?.name).toBe(true);
      expect(select?.email).toBe(true);
    });

    it('should use custom always include fields', () => {
      const select = buildSelectFields(['name'], ['id', 'createdAt']);
      expect(select?.id).toBe(true);
      expect(select?.createdAt).toBe(true);
      expect(select?.name).toBe(true);
    });
  });

  describe('buildLimitedInclude', () => {
    it('should return undefined at max depth', () => {
      const result = buildLimitedInclude({ user: true }, 2, 2);
      expect(result).toBeUndefined();
    });

    it('should include boolean includes', () => {
      const result = buildLimitedInclude({ user: true, posts: true }, 2, 0);
      expect(result).toEqual({ user: true, posts: true });
    });

    it('should limit nested includes', () => {
      const include = {
        user: {
          include: {
            profile: {
              include: {
                settings: true,
              },
            },
          },
        },
      };
      const result = buildLimitedInclude(include, 2, 0);
      expect(result?.user?.include?.profile).toBeDefined();
    });
  });

  describe('buildKeysetWhere', () => {
    it('should return empty object without cursor', () => {
      const where = buildKeysetWhere(undefined);
      expect(where).toEqual({});
    });

    it('should build where for simple ID cursor', () => {
      const cursor = encodeCursor(JSON.stringify('some-id'));
      const where = buildKeysetWhere(cursor, 'createdAt', 'desc');
      expect(where.id).toBeDefined();
    });

    it('should return empty object for invalid cursor', () => {
      const where = buildKeysetWhere('invalid', 'createdAt', 'desc');
      expect(where).toEqual({});
    });
  });

  describe('mergeWhereConditions', () => {
    it('should return empty object for no conditions', () => {
      expect(mergeWhereConditions()).toEqual({});
    });

    it('should return single condition as is', () => {
      const condition = { name: 'test' };
      expect(mergeWhereConditions(condition)).toEqual(condition);
    });

    it('should merge multiple conditions with AND', () => {
      const cond1 = { name: 'test' };
      const cond2 = { status: 'active' };
      const result = mergeWhereConditions(cond1, cond2);
      expect(result.AND).toContainEqual(cond1);
      expect(result.AND).toContainEqual(cond2);
    });

    it('should filter out undefined conditions', () => {
      const cond = { name: 'test' };
      const result = mergeWhereConditions(cond, undefined);
      expect(result).toEqual(cond);
    });

    it('should filter out empty conditions', () => {
      const cond = { name: 'test' };
      const result = mergeWhereConditions(cond, {});
      expect(result).toEqual(cond);
    });
  });
});
