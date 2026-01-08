/**
 * Prisma Soft Delete Middleware
 *
 * This middleware implements soft delete functionality for Prisma by:
 * 1. Automatically filtering out soft-deleted records in find queries
 * 2. Converting delete operations to soft delete updates (setting isDeleted=true, deletedAt=now())
 * 3. Converting deleteMany operations to updateMany with soft delete
 *
 * Models with soft delete support:
 * - User
 * - Festival
 * - Ticket
 * - TicketCategory
 * - Payment
 * - Artist
 * - Vendor
 * - VendorOrder
 *
 * Usage:
 * - All queries will automatically exclude soft-deleted records unless explicitly requested
 * - Use `includeDeleted: true` in the query args to include soft-deleted records
 * - Use `onlyDeleted: true` to get only soft-deleted records
 * - Use `hardDelete: true` with delete operations to permanently delete
 */

import { Prisma } from '@prisma/client';

/**
 * Models that support soft delete
 */
export const SOFT_DELETE_MODELS = [
  'User',
  'Festival',
  'Ticket',
  'TicketCategory',
  'Payment',
  'Artist',
  'Vendor',
  'VendorOrder',
] as const;

export type SoftDeleteModel = (typeof SOFT_DELETE_MODELS)[number];

/**
 * Check if a model supports soft delete
 */
export function isSoftDeleteModel(model: string): model is SoftDeleteModel {
  return SOFT_DELETE_MODELS.includes(model as SoftDeleteModel);
}

/**
 * Extended query arguments with soft delete options
 */
export interface SoftDeleteQueryArgs {
  includeDeleted?: boolean; // Include soft-deleted records in results
  onlyDeleted?: boolean; // Return only soft-deleted records
}

/**
 * Extended delete arguments with hard delete option
 */
export interface SoftDeleteDeleteArgs {
  hardDelete?: boolean; // Permanently delete instead of soft delete
}

/**
 * Middleware to automatically add soft delete filter to find queries
 * This ensures soft-deleted records are excluded by default
 */
export function createSoftDeleteFindMiddleware(): Prisma.Middleware {
  return async (params, next) => {
    if (!params.model || !isSoftDeleteModel(params.model)) {
      return next(params);
    }

    const isFindOperation = [
      'findUnique',
      'findUniqueOrThrow',
      'findFirst',
      'findFirstOrThrow',
      'findMany',
      'count',
      'aggregate',
      'groupBy',
    ].includes(params.action);

    if (!isFindOperation) {
      return next(params);
    }

    // Check for soft delete options in args
    const args = params.args as SoftDeleteQueryArgs | undefined;
    const includeDeleted = args?.includeDeleted;
    const onlyDeleted = args?.onlyDeleted;

    // Remove custom properties before passing to Prisma
    if (args) {
      delete (args as Record<string, unknown>).includeDeleted;
      delete (args as Record<string, unknown>).onlyDeleted;
    }

    // If includeDeleted is true, don't modify the query
    if (includeDeleted) {
      return next(params);
    }

    // Build the isDeleted filter
    let isDeletedFilter: Record<string, boolean>;
    if (onlyDeleted) {
      isDeletedFilter = { isDeleted: true };
    } else {
      isDeletedFilter = { isDeleted: false };
    }

    // Add filter to the query based on operation type
    if (params.action === 'findUnique' || params.action === 'findUniqueOrThrow') {
      // For unique queries, convert to findFirst with filter
      // This is necessary because findUnique doesn't support arbitrary where clauses
      params.action = params.action === 'findUniqueOrThrow' ? 'findFirstOrThrow' : 'findFirst';
      params.args = {
        ...params.args,
        where: {
          ...params.args?.where,
          ...isDeletedFilter,
        },
      };
    } else {
      // For other find operations, add filter to where clause
      params.args = {
        ...params.args,
        where: {
          ...params.args?.where,
          ...isDeletedFilter,
        },
      };
    }

    return next(params);
  };
}

/**
 * Middleware to convert delete operations to soft delete
 * Sets isDeleted=true and deletedAt=now() instead of actually deleting
 */
export function createSoftDeleteMiddleware(): Prisma.Middleware {
  return async (params, next) => {
    if (!params.model || !isSoftDeleteModel(params.model)) {
      return next(params);
    }

    // Handle single delete
    if (params.action === 'delete') {
      const args = params.args as SoftDeleteDeleteArgs | undefined;
      const hardDelete = args?.hardDelete;

      if (hardDelete) {
        // Remove custom property and proceed with actual delete
        delete (args as Record<string, unknown>)?.hardDelete;
        return next(params);
      }

      // Convert to update with soft delete
      params.action = 'update';
      params.args = {
        ...params.args,
        data: {
          isDeleted: true,
          deletedAt: new Date(),
        },
      };

      return next(params);
    }

    // Handle deleteMany
    if (params.action === 'deleteMany') {
      const args = params.args as SoftDeleteDeleteArgs | undefined;
      const hardDelete = args?.hardDelete;

      if (hardDelete) {
        // Remove custom property and proceed with actual deleteMany
        delete (args as Record<string, unknown>)?.hardDelete;
        return next(params);
      }

      // Convert to updateMany with soft delete
      params.action = 'updateMany';
      params.args = {
        ...params.args,
        data: {
          isDeleted: true,
          deletedAt: new Date(),
        },
      };

      return next(params);
    }

    return next(params);
  };
}

/**
 * Combined soft delete middleware that handles both find and delete operations
 */
export function createCombinedSoftDeleteMiddleware(): Prisma.Middleware {
  const findMiddleware = createSoftDeleteFindMiddleware();
  const deleteMiddleware = createSoftDeleteMiddleware();

  return async (params, next) => {
    // First apply find middleware
    const modifiedParams = await applyMiddleware(findMiddleware, params);
    // Then apply delete middleware
    return deleteMiddleware(modifiedParams, next);
  };
}

/**
 * Helper function to apply middleware and get modified params
 */
async function applyMiddleware(
  middleware: Prisma.Middleware,
  params: Prisma.MiddlewareParams
): Promise<Prisma.MiddlewareParams> {
  let modifiedParams = params;

  await middleware(params, async (p) => {
    modifiedParams = p;
    return {} as never; // Dummy return, we just want the modified params
  });

  return modifiedParams;
}

/**
 * Type-safe restore function helper
 * Call this from your service to restore a soft-deleted record
 */
export interface RestoreResult<T> {
  success: boolean;
  data?: T;
  message: string;
}
