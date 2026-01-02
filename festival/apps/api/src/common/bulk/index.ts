/**
 * Bulk Operations Module
 *
 * This module provides comprehensive bulk operation support for NestJS applications.
 *
 * Features:
 * - Bulk create, update, delete operations
 * - Configurable batch processing and concurrency
 * - Error handling with continue-on-error support
 * - Progress tracking with detailed results
 * - CSV/JSON import validation
 * - Data export in multiple formats
 *
 * @example
 * // Import in your module
 * import { BulkOperationModule, BulkOperationService } from './common/bulk';
 *
 * @example
 * // Use in a service
 * @Injectable()
 * export class UsersService {
 *   constructor(private readonly bulkService: BulkOperationService) {}
 *
 *   async bulkCreate(items: CreateUserDto[]) {
 *     return this.bulkService.bulkCreate(
 *       items,
 *       (item) => this.repository.create(item),
 *       { continueOnError: true }
 *     );
 *   }
 * }
 */

// DTOs
export {
  BulkOperationType,
  BulkOperationStatus,
  OperationResultStatus,
  BulkOperationDto,
  BulkDeleteDto,
  BulkUpdateDto,
  BulkUpdateItemDto,
  BulkImportDto,
  BulkExportDto,
  OperationResult,
  BulkOperationResponseDto,
} from './bulk-operation.dto';

// Service
export { BulkOperationService } from './bulk-operation.service';
export type {
  BulkOperationConfig,
  CreateCallback,
  UpdateCallback,
  DeleteCallback,
  ValidateCallback,
} from './bulk-operation.service';

// Controller
export {
  BulkOperationController,
  GenericBulkController,
} from './bulk-operation.controller';

// Module
export { BulkOperationModule } from './bulk-operation.module';
