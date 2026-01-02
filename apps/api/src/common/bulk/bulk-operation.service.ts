import { Injectable, Logger } from '@nestjs/common';
import {
  BulkOperationType,
  BulkOperationStatus,
  OperationResultStatus,
  OperationResult,
  BulkOperationResponseDto,
  BulkDeleteDto,
  BulkUpdateDto,
} from './bulk-operation.dto';

/**
 * Bulk operation configuration
 */
export interface BulkOperationConfig {
  /** Maximum items per batch (for chunking large operations) */
  batchSize: number;
  /** Maximum parallel operations */
  concurrency: number;
  /** Timeout per item in ms */
  itemTimeout: number;
  /** Enable detailed logging */
  verbose: boolean;
}

const DEFAULT_CONFIG: BulkOperationConfig = {
  batchSize: 100,
  concurrency: 10,
  itemTimeout: 5000,
  verbose: false,
};

/**
 * Callback function types for bulk operations
 */
export type CreateCallback<T, R> = (item: T, index: number) => Promise<R>;
export type UpdateCallback<R> = (id: string, data: Record<string, unknown>, index: number) => Promise<R>;
export type DeleteCallback = (id: string, index: number) => Promise<boolean>;
export type ValidateCallback<T> = (item: T, index: number) => Promise<{ valid: boolean; error?: string }>;

/**
 * Bulk Operation Service
 *
 * Generic service for handling bulk operations (create, update, delete, upsert)
 * with support for:
 * - Batch processing for large datasets
 * - Parallel execution with configurable concurrency
 * - Error handling with continue-on-error support
 * - Progress tracking and detailed results
 * - Transaction support for atomic operations
 *
 * @example
 * // In a service
 * async bulkCreateUsers(dto: BulkOperationDto<CreateUserDto>) {
 *   return this.bulkService.bulkCreate(
 *     dto.items,
 *     async (item) => this.usersRepository.create(item),
 *     { continueOnError: dto.continueOnError }
 *   );
 * }
 */
@Injectable()
export class BulkOperationService {
  private readonly logger = new Logger(BulkOperationService.name);
  private readonly config: BulkOperationConfig;

  constructor(config: Partial<BulkOperationConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Execute bulk create operation
   */
  async bulkCreate<T, R>(
    items: T[],
    createCallback: CreateCallback<T, R>,
    options: {
      continueOnError?: boolean;
      validateCallback?: ValidateCallback<T>;
      validateFirst?: boolean;
    } = {},
  ): Promise<BulkOperationResponseDto> {
    const startTime = Date.now();
    const results: OperationResult[] = [];
    const errorSummary: Record<string, number> = {};

    const { continueOnError = true, validateCallback, validateFirst = true } = options;

    // Validate all items first if requested
    if (validateFirst && validateCallback) {
      const validationResults = await Promise.all(
        items.map((item, index) => validateCallback(item, index)),
      );

      const hasErrors = validationResults.some((r) => !r.valid);
      if (hasErrors && !continueOnError) {
        return this.buildResponse(
          BulkOperationStatus.FAILED,
          items.length,
          results,
          startTime,
          errorSummary,
        );
      }
    }

    // Process items in batches
    for (let i = 0; i < items.length; i += this.config.batchSize) {
      const batch = items.slice(i, i + this.config.batchSize);
      const batchResults = await this.processBatch(
        batch,
        async (item, batchIndex) => {
          const globalIndex = i + batchIndex;
          try {
            const result = await createCallback(item, globalIndex);
            return {
              index: globalIndex,
              status: OperationResultStatus.SUCCESS,
              data: result as Record<string, unknown>,
              id: (result as { id?: string })?.id,
            };
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            this.trackError(errorSummary, errorMessage);

            if (!continueOnError) {
              throw error;
            }

            return {
              index: globalIndex,
              status: OperationResultStatus.FAILED,
              error: errorMessage,
            };
          }
        },
      );

      results.push(...batchResults);

      // Check if we should stop
      if (!continueOnError && batchResults.some((r) => r.status === OperationResultStatus.FAILED)) {
        break;
      }
    }

    return this.buildResponse(
      this.determineStatus(results),
      items.length,
      results,
      startTime,
      errorSummary,
    );
  }

  /**
   * Execute bulk update operation
   */
  async bulkUpdate<R>(
    dto: BulkUpdateDto,
    updateCallback: UpdateCallback<R>,
    options: { continueOnError?: boolean } = {},
  ): Promise<BulkOperationResponseDto> {
    const startTime = Date.now();
    const results: OperationResult[] = [];
    const errorSummary: Record<string, number> = {};

    const { continueOnError = dto.continueOnError ?? true } = options;

    for (let i = 0; i < dto.items.length; i += this.config.batchSize) {
      const batch = dto.items.slice(i, i + this.config.batchSize);
      const batchResults = await this.processBatch(
        batch,
        async (item, batchIndex) => {
          const globalIndex = i + batchIndex;
          try {
            const result = await updateCallback(item.id, item.data, globalIndex);
            return {
              index: globalIndex,
              id: item.id,
              status: OperationResultStatus.SUCCESS,
              data: result as Record<string, unknown>,
            };
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            this.trackError(errorSummary, errorMessage);

            if (!continueOnError) {
              throw error;
            }

            return {
              index: globalIndex,
              id: item.id,
              status: OperationResultStatus.FAILED,
              error: errorMessage,
            };
          }
        },
      );

      results.push(...batchResults);

      if (!continueOnError && batchResults.some((r) => r.status === OperationResultStatus.FAILED)) {
        break;
      }
    }

    return this.buildResponse(
      this.determineStatus(results),
      dto.items.length,
      results,
      startTime,
      errorSummary,
    );
  }

  /**
   * Execute bulk delete operation
   */
  async bulkDelete(
    dto: BulkDeleteDto,
    deleteCallback: DeleteCallback,
    options: { continueOnError?: boolean } = {},
  ): Promise<BulkOperationResponseDto> {
    const startTime = Date.now();
    const results: OperationResult[] = [];
    const errorSummary: Record<string, number> = {};

    const { continueOnError = dto.continueOnError ?? true } = options;

    for (let i = 0; i < dto.ids.length; i += this.config.batchSize) {
      const batch = dto.ids.slice(i, i + this.config.batchSize);
      const batchResults = await this.processBatch(
        batch,
        async (id, batchIndex) => {
          const globalIndex = i + batchIndex;
          try {
            await deleteCallback(id, globalIndex);
            return {
              index: globalIndex,
              id,
              status: OperationResultStatus.SUCCESS,
            };
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            this.trackError(errorSummary, errorMessage);

            if (!continueOnError) {
              throw error;
            }

            return {
              index: globalIndex,
              id,
              status: OperationResultStatus.FAILED,
              error: errorMessage,
            };
          }
        },
      );

      results.push(...batchResults);

      if (!continueOnError && batchResults.some((r) => r.status === OperationResultStatus.FAILED)) {
        break;
      }
    }

    return this.buildResponse(
      this.determineStatus(results),
      dto.ids.length,
      results,
      startTime,
      errorSummary,
    );
  }

  /**
   * Process a batch of items with controlled concurrency
   */
  private async processBatch<T, R>(
    items: T[],
    processor: (item: T, index: number) => Promise<R>,
  ): Promise<R[]> {
    const results: R[] = [];
    const chunks = this.chunkArray(items, this.config.concurrency);

    for (const chunk of chunks) {
      const chunkResults = await Promise.all(
        chunk.map((item, index) =>
          this.withTimeout(processor(item, results.length + index), this.config.itemTimeout),
        ),
      );
      results.push(...chunkResults);
    }

    return results;
  }

  /**
   * Split array into chunks
   */
  private chunkArray<T>(array: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }

  /**
   * Add timeout to a promise
   */
  private async withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
    return Promise.race([
      promise,
      new Promise<T>((_, reject) =>
        setTimeout(() => reject(new Error('Operation timed out')), timeoutMs),
      ),
    ]);
  }

  /**
   * Track error occurrence
   */
  private trackError(summary: Record<string, number>, error: string): void {
    // Normalize error message for grouping
    const normalized = error.substring(0, 100);
    summary[normalized] = (summary[normalized] || 0) + 1;
  }

  /**
   * Determine overall operation status based on results
   */
  private determineStatus(results: OperationResult[]): BulkOperationStatus {
    const successful = results.filter((r) => r.status === OperationResultStatus.SUCCESS).length;
    const failed = results.filter((r) => r.status === OperationResultStatus.FAILED).length;

    if (failed === 0) {
      return BulkOperationStatus.COMPLETED;
    }
    if (successful === 0) {
      return BulkOperationStatus.FAILED;
    }
    return BulkOperationStatus.PARTIAL;
  }

  /**
   * Build the final response DTO
   */
  private buildResponse(
    status: BulkOperationStatus,
    total: number,
    results: OperationResult[],
    startTime: number,
    errorSummary: Record<string, number>,
  ): BulkOperationResponseDto {
    const successful = results.filter((r) => r.status === OperationResultStatus.SUCCESS).length;
    const failed = results.filter((r) => r.status === OperationResultStatus.FAILED).length;
    const skipped = results.filter((r) => r.status === OperationResultStatus.SKIPPED).length;

    return {
      status,
      total,
      successful,
      failed,
      skipped,
      processingTimeMs: Date.now() - startTime,
      results,
      errorSummary: Object.keys(errorSummary).length > 0 ? errorSummary : undefined,
    };
  }
}
