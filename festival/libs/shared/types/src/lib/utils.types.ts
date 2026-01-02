/**
 * Utility Types and Helpers
 * Common utility types used across the application
 */

// ============================================================================
// Generic Utility Types
// ============================================================================

/**
 * Make all properties of T optional except K
 */
export type PartialExcept<T, K extends keyof T> = Partial<T> & Pick<T, K>;

/**
 * Make all properties of T required except K
 */
export type RequiredExcept<T, K extends keyof T> = Required<Omit<T, K>> &
  Partial<Pick<T, K>>;

/**
 * Make specific properties K of T optional
 */
export type PartialBy<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

/**
 * Make specific properties K of T required
 */
export type RequiredBy<T, K extends keyof T> = Omit<T, K> &
  Required<Pick<T, K>>;

/**
 * Deep partial - makes all nested properties optional
 */
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

/**
 * Deep required - makes all nested properties required
 */
export type DeepRequired<T> = {
  [P in keyof T]-?: T[P] extends object ? DeepRequired<T[P]> : T[P];
};

/**
 * Deep readonly - makes all nested properties readonly
 */
export type DeepReadonly<T> = {
  readonly [P in keyof T]: T[P] extends object ? DeepReadonly<T[P]> : T[P];
};

/**
 * Extract nullable properties
 */
export type NullableKeys<T> = {
  [K in keyof T]: null extends T[K] ? K : never;
}[keyof T];

/**
 * Remove null/undefined from all properties
 */
export type NonNullableProperties<T> = {
  [K in keyof T]: NonNullable<T[K]>;
};

/**
 * Pick properties of a specific type
 */
export type PickByType<T, Value> = {
  [P in keyof T as T[P] extends Value ? P : never]: T[P];
};

/**
 * Omit properties of a specific type
 */
export type OmitByType<T, Value> = {
  [P in keyof T as T[P] extends Value ? never : P]: T[P];
};

/**
 * Get keys of T that are strings
 */
export type StringKeys<T> = Extract<keyof T, string>;

/**
 * Create a type with optional id for creation DTOs
 */
export type CreateDto<T> = Omit<T, 'id' | 'createdAt' | 'updatedAt'>;

/**
 * Create a type for update DTOs (all optional except id)
 */
export type UpdateDto<T> = Partial<Omit<T, 'id' | 'createdAt' | 'updatedAt'>>;

/**
 * Entity with timestamps
 */
export interface Timestamped {
  createdAt: string;
  updatedAt: string;
}

/**
 * Entity with soft delete
 */
export interface SoftDeletable {
  deletedAt?: string;
  isDeleted: boolean;
}

/**
 * Base entity interface
 */
export interface BaseEntity extends Timestamped {
  id: string;
}

/**
 * Auditable entity (tracks who created/updated)
 */
export interface Auditable extends BaseEntity {
  createdBy?: string;
  updatedBy?: string;
}

// ============================================================================
// Common Value Types
// ============================================================================

/**
 * ISO date string type
 */
export type ISODateString = string;

/**
 * UUID type alias
 */
export type UUID = string;

/**
 * Email type alias
 */
export type Email = string;

/**
 * URL type alias
 */
export type URL = string;

/**
 * Currency code (ISO 4217)
 */
export type CurrencyCode = 'EUR' | 'USD' | 'GBP' | 'CHF' | 'CAD';

/**
 * Language code (ISO 639-1)
 */
export type LanguageCode = 'fr' | 'en' | 'de' | 'es' | 'it' | 'nl' | 'pt';

/**
 * Country code (ISO 3166-1 alpha-2)
 */
export type CountryCode = string;

/**
 * Locale string
 */
export type Locale = `${LanguageCode}-${CountryCode}`;

/**
 * Money amount (in cents)
 */
export interface Money {
  amount: number;
  currency: CurrencyCode;
}

/**
 * Date range
 */
export interface DateRange {
  startDate: ISODateString;
  endDate: ISODateString;
}

/**
 * Time range
 */
export interface TimeRange {
  startTime: string;
  endTime: string;
}

// ============================================================================
// Query & Filter Types
// ============================================================================

/**
 * Sort direction
 */
export type SortDirection = 'asc' | 'desc';

/**
 * Sort configuration
 */
export interface SortConfig<T> {
  field: keyof T;
  direction: SortDirection;
}

/**
 * Filter operator
 */
export type FilterOperator =
  | 'eq'
  | 'neq'
  | 'gt'
  | 'gte'
  | 'lt'
  | 'lte'
  | 'in'
  | 'nin'
  | 'like'
  | 'ilike'
  | 'between';

/**
 * Filter condition
 */
export interface FilterCondition<T = unknown> {
  field: string;
  operator: FilterOperator;
  value: T;
}

/**
 * Query options for list endpoints
 */
export interface QueryOptions<T> {
  page?: number;
  limit?: number;
  sort?: SortConfig<T> | SortConfig<T>[];
  filters?: FilterCondition[];
  search?: string;
  include?: string[];
}

// ============================================================================
// Event Types (for websockets/realtime)
// ============================================================================

/**
 * Base event interface
 */
export interface BaseEvent<T = unknown> {
  type: string;
  payload: T;
  timestamp: string;
  correlationId?: string;
}

/**
 * Entity change event
 */
export interface EntityChangeEvent<T> extends BaseEvent<T> {
  action: 'created' | 'updated' | 'deleted';
  entityType: string;
  entityId: string;
}

// ============================================================================
// Result Types
// ============================================================================

/**
 * Result type for operations that can fail
 */
export type Result<T, E = Error> =
  | { success: true; data: T }
  | { success: false; error: E };

/**
 * Async result type
 */
export type AsyncResult<T, E = Error> = Promise<Result<T, E>>;

/**
 * Create a success result
 */
export function success<T>(data: T): Result<T, never> {
  return { success: true, data };
}

/**
 * Create a failure result
 */
export function failure<E>(error: E): Result<never, E> {
  return { success: false, error };
}

/**
 * Check if result is success
 */
export function isSuccess<T, E>(
  result: Result<T, E>
): result is { success: true; data: T } {
  return result.success === true;
}

/**
 * Check if result is failure
 */
export function isFailure<T, E>(
  result: Result<T, E>
): result is { success: false; error: E } {
  return result.success === false;
}

// ============================================================================
// Type Guards
// ============================================================================

/**
 * Check if value is defined (not null or undefined)
 */
export function isDefined<T>(value: T | null | undefined): value is T {
  return value !== null && value !== undefined;
}

/**
 * Check if value is a non-empty string
 */
export function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

/**
 * Check if value is a non-empty array
 */
export function isNonEmptyArray<T>(value: unknown): value is T[] {
  return Array.isArray(value) && value.length > 0;
}

/**
 * Check if value is a valid UUID
 */
export function isUUID(value: unknown): value is UUID {
  if (typeof value !== 'string') return false;
  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(value);
}

/**
 * Check if value is a valid email
 */
export function isEmail(value: unknown): value is Email {
  if (typeof value !== 'string') return false;
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(value);
}

/**
 * Check if value is a valid ISO date string
 */
export function isISODateString(value: unknown): value is ISODateString {
  if (typeof value !== 'string') return false;
  const date = new Date(value);
  return !isNaN(date.getTime()) && value.includes('-');
}

/**
 * Check if value is a plain object
 */
export function isPlainObject(
  value: unknown
): value is Record<string, unknown> {
  return (
    typeof value === 'object' &&
    value !== null &&
    !Array.isArray(value) &&
    Object.prototype.toString.call(value) === '[object Object]'
  );
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Assert that a condition is true
 */
export function assert(
  condition: boolean,
  message = 'Assertion failed'
): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

/**
 * Assert that a value is defined
 */
export function assertDefined<T>(
  value: T | null | undefined,
  message = 'Value is not defined'
): asserts value is T {
  if (value === null || value === undefined) {
    throw new Error(message);
  }
}

/**
 * Exhaustive check for switch statements
 */
export function exhaustiveCheck(value: never): never {
  throw new Error(`Unhandled value: ${JSON.stringify(value)}`);
}

/**
 * Identity function (useful for type inference)
 */
export function identity<T>(value: T): T {
  return value;
}

/**
 * No-op function
 */
export function noop(): void {
  // Intentionally empty
}

/**
 * Sleep for a specified duration
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Omit keys from an object
 */
export function omit<T extends Record<string, unknown>, K extends keyof T>(
  obj: T,
  keys: K[]
): Omit<T, K> {
  const result = { ...obj };
  for (const key of keys) {
    delete result[key];
  }
  return result as Omit<T, K>;
}

/**
 * Pick keys from an object
 */
export function pick<T extends Record<string, unknown>, K extends keyof T>(
  obj: T,
  keys: K[]
): Pick<T, K> {
  const result = {} as Pick<T, K>;
  for (const key of keys) {
    if (key in obj) {
      result[key] = obj[key];
    }
  }
  return result;
}

/**
 * Group array items by a key
 */
export function groupBy<T, K extends string | number>(
  items: T[],
  keyFn: (item: T) => K
): Record<K, T[]> {
  return items.reduce(
    (acc, item) => {
      const key = keyFn(item);
      if (!acc[key]) {
        acc[key] = [];
      }
      acc[key].push(item);
      return acc;
    },
    {} as Record<K, T[]>
  );
}

/**
 * Remove duplicate items from array
 */
export function unique<T>(items: T[], keyFn?: (item: T) => unknown): T[] {
  if (!keyFn) {
    return [...new Set(items)];
  }
  const seen = new Set();
  return items.filter((item) => {
    const key = keyFn(item);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
