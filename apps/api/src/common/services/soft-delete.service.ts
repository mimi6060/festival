/**
 * Soft Delete Service
 *
 * Provides common soft delete and restore operations that can be used
 * by any service that manages soft-deletable entities.
 */

import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { SOFT_DELETE_MODELS, SoftDeleteModel } from '../../prisma/soft-delete.middleware';

export interface SoftDeleteResult {
  success: boolean;
  id: string;
  deletedAt: Date;
  message: string;
}

export interface RestoreResult {
  success: boolean;
  id: string;
  restoredAt: Date;
  message: string;
}

export interface SoftDeletedCount {
  model: string;
  count: number;
}

@Injectable()
export class SoftDeleteService {
  private readonly logger = new Logger(SoftDeleteService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Check if a model supports soft delete
   */
  isSoftDeleteModel(model: string): boolean {
    return SOFT_DELETE_MODELS.includes(model as SoftDeleteModel);
  }

  /**
   * Soft delete a record by ID
   * This sets isDeleted=true and deletedAt=now()
   */
  async softDelete(model: SoftDeleteModel, id: string): Promise<SoftDeleteResult> {
    if (!this.isSoftDeleteModel(model)) {
      throw new BadRequestException(`Model ${model} does not support soft delete`);
    }

    const modelDelegate = this.getModelDelegate(model);
    const now = new Date();

    try {
      // First check if record exists and is not already deleted
      const existing = await modelDelegate.findFirst({
        where: { id },
        includeDeleted: true,
      });

      if (!existing) {
        throw new NotFoundException(`${model} with ID ${id} not found`);
      }

      if (existing.isDeleted) {
        throw new BadRequestException(`${model} with ID ${id} is already deleted`);
      }

      // Perform soft delete
      await modelDelegate.update({
        where: { id },
        data: {
          isDeleted: true,
          deletedAt: now,
        },
      });

      this.logger.log(`Soft deleted ${model} with ID ${id}`);

      return {
        success: true,
        id,
        deletedAt: now,
        message: `${model} with ID ${id} has been soft deleted`,
      };
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof BadRequestException) {
        throw error;
      }
      this.logger.error(`Failed to soft delete ${model} with ID ${id}: ${error}`);
      throw error;
    }
  }

  /**
   * Restore a soft-deleted record by ID
   * This sets isDeleted=false and deletedAt=null
   */
  async restore(model: SoftDeleteModel, id: string): Promise<RestoreResult> {
    if (!this.isSoftDeleteModel(model)) {
      throw new BadRequestException(`Model ${model} does not support soft delete`);
    }

    const modelDelegate = this.getModelDelegate(model);
    const now = new Date();

    try {
      // Find the soft-deleted record
      const existing = await modelDelegate.findFirst({
        where: { id },
        includeDeleted: true,
      });

      if (!existing) {
        throw new NotFoundException(`${model} with ID ${id} not found`);
      }

      if (!existing.isDeleted) {
        throw new BadRequestException(`${model} with ID ${id} is not deleted`);
      }

      // Restore the record
      await modelDelegate.update({
        where: { id },
        data: {
          isDeleted: false,
          deletedAt: null,
        },
      });

      this.logger.log(`Restored ${model} with ID ${id}`);

      return {
        success: true,
        id,
        restoredAt: now,
        message: `${model} with ID ${id} has been restored`,
      };
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof BadRequestException) {
        throw error;
      }
      this.logger.error(`Failed to restore ${model} with ID ${id}: ${error}`);
      throw error;
    }
  }

  /**
   * Permanently delete a soft-deleted record
   * This actually removes the record from the database
   */
  async hardDelete(
    model: SoftDeleteModel,
    id: string
  ): Promise<{ success: boolean; message: string }> {
    if (!this.isSoftDeleteModel(model)) {
      throw new BadRequestException(`Model ${model} does not support soft delete`);
    }

    const modelDelegate = this.getModelDelegate(model);

    try {
      // Find the record (include deleted)
      const existing = await modelDelegate.findFirst({
        where: { id },
        includeDeleted: true,
      });

      if (!existing) {
        throw new NotFoundException(`${model} with ID ${id} not found`);
      }

      // Permanently delete
      await modelDelegate.delete({
        where: { id },
        hardDelete: true,
      });

      this.logger.warn(`Hard deleted ${model} with ID ${id} - data permanently removed`);

      return {
        success: true,
        message: `${model} with ID ${id} has been permanently deleted`,
      };
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof BadRequestException) {
        throw error;
      }
      this.logger.error(`Failed to hard delete ${model} with ID ${id}: ${error}`);
      throw error;
    }
  }

  /**
   * Get all soft-deleted records for a model
   */
  async findDeleted<T>(
    model: SoftDeleteModel,
    options?: {
      skip?: number;
      take?: number;
      orderBy?: Record<string, 'asc' | 'desc'>;
      where?: Record<string, unknown>;
    }
  ): Promise<{ items: T[]; total: number }> {
    if (!this.isSoftDeleteModel(model)) {
      throw new BadRequestException(`Model ${model} does not support soft delete`);
    }

    const modelDelegate = this.getModelDelegate(model);

    const where = {
      ...options?.where,
      isDeleted: true,
    };

    const [items, total] = await Promise.all([
      modelDelegate.findMany({
        where,
        skip: options?.skip,
        take: options?.take,
        orderBy: options?.orderBy || { deletedAt: 'desc' },
        includeDeleted: true,
      }),
      modelDelegate.count({
        where,
        includeDeleted: true,
      }),
    ]);

    return { items: items as T[], total };
  }

  /**
   * Count soft-deleted records for all models
   */
  async countAllDeleted(): Promise<SoftDeletedCount[]> {
    const counts: SoftDeletedCount[] = [];

    for (const model of SOFT_DELETE_MODELS) {
      const modelDelegate = this.getModelDelegate(model);
      const count = await modelDelegate.count({
        where: { isDeleted: true },
        includeDeleted: true,
      });
      counts.push({ model, count });
    }

    return counts;
  }

  /**
   * Restore all soft-deleted records for a model
   */
  async restoreAll(model: SoftDeleteModel): Promise<{ count: number; message: string }> {
    if (!this.isSoftDeleteModel(model)) {
      throw new BadRequestException(`Model ${model} does not support soft delete`);
    }

    const modelDelegate = this.getModelDelegate(model);

    const result = await modelDelegate.updateMany({
      where: { isDeleted: true },
      data: {
        isDeleted: false,
        deletedAt: null,
      },
      includeDeleted: true,
    });

    this.logger.log(`Restored ${result.count} ${model} records`);

    return {
      count: result.count,
      message: `Restored ${result.count} ${model} record(s)`,
    };
  }

  /**
   * Permanently delete all soft-deleted records for a model
   * WARNING: This is irreversible!
   */
  async purgeDeleted(model: SoftDeleteModel): Promise<{ count: number; message: string }> {
    if (!this.isSoftDeleteModel(model)) {
      throw new BadRequestException(`Model ${model} does not support soft delete`);
    }

    const modelDelegate = this.getModelDelegate(model);

    // First count how many will be deleted
    const count = await modelDelegate.count({
      where: { isDeleted: true },
      includeDeleted: true,
    });

    if (count === 0) {
      return {
        count: 0,
        message: `No soft-deleted ${model} records to purge`,
      };
    }

    // Permanently delete all soft-deleted records
    await modelDelegate.deleteMany({
      where: { isDeleted: true },
      hardDelete: true,
      includeDeleted: true,
    });

    this.logger.warn(`Purged ${count} soft-deleted ${model} records - data permanently removed`);

    return {
      count,
      message: `Permanently deleted ${count} ${model} record(s)`,
    };
  }

  /**
   * Get the Prisma model delegate for a given model name
   */
  private getModelDelegate(model: SoftDeleteModel): any {
    const modelName = model.charAt(0).toLowerCase() + model.slice(1);
    const delegate = (this.prisma as any)[modelName];

    if (!delegate) {
      throw new BadRequestException(`Model ${model} not found in Prisma client`);
    }

    return delegate;
  }
}
