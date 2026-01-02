import { Module, Global } from '@nestjs/common';
import { BulkOperationService } from './bulk-operation.service';
import { GenericBulkController } from './bulk-operation.controller';

/**
 * Bulk Operation Module
 *
 * Provides bulk operation functionality across the application.
 *
 * This module is global, so BulkOperationService is available everywhere
 * without explicitly importing the module.
 *
 * @example
 * // In app.module.ts
 * @Module({
 *   imports: [BulkOperationModule],
 * })
 * export class AppModule {}
 *
 * @example
 * // In a service
 * @Injectable()
 * export class UsersService {
 *   constructor(private readonly bulkService: BulkOperationService) {}
 *
 *   async bulkCreateUsers(dto: BulkOperationDto<CreateUserDto>) {
 *     return this.bulkService.bulkCreate(
 *       dto.items,
 *       (item) => this.prisma.user.create({ data: item })
 *     );
 *   }
 * }
 */
@Global()
@Module({
  controllers: [GenericBulkController],
  providers: [
    {
      provide: BulkOperationService,
      useFactory: () =>
        new BulkOperationService({
          batchSize: parseInt(process.env.BULK_BATCH_SIZE || '100', 10),
          concurrency: parseInt(process.env.BULK_CONCURRENCY || '10', 10),
          itemTimeout: parseInt(process.env.BULK_ITEM_TIMEOUT || '5000', 10),
          verbose: process.env.BULK_VERBOSE === 'true',
        }),
    },
  ],
  exports: [BulkOperationService],
})
export class BulkOperationModule {}
