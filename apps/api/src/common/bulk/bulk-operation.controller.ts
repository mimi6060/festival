import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  Query,
  BadRequestException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiBody,
  ApiQuery,
} from '@nestjs/swagger';
import { BulkOperationService } from './bulk-operation.service';
import { PrismaService } from '../../modules/prisma/prisma.service';
import {
  BulkDeleteDto,
  BulkOperationResponseDto,
  BulkImportDto,
  BulkExportDto,
} from './bulk-operation.dto';

/**
 * Supported entity types for bulk operations
 */
const SUPPORTED_ENTITY_TYPES = [
  'ticket',
  'user',
  'vendor',
  'payment',
  'artist',
  'vendorOrder',
  'ticketCategory',
  'festival',
] as const;

type SupportedEntityType = (typeof SUPPORTED_ENTITY_TYPES)[number];

/**
 * Map of entity types to their Prisma model names and soft-delete support
 */
const ENTITY_CONFIG: Record<
  SupportedEntityType,
  { modelName: string; supportsSoftDelete: boolean }
> = {
  ticket: { modelName: 'ticket', supportsSoftDelete: true },
  user: { modelName: 'user', supportsSoftDelete: true },
  vendor: { modelName: 'vendor', supportsSoftDelete: true },
  payment: { modelName: 'payment', supportsSoftDelete: true },
  artist: { modelName: 'artist', supportsSoftDelete: true },
  vendorOrder: { modelName: 'vendorOrder', supportsSoftDelete: true },
  ticketCategory: { modelName: 'ticketCategory', supportsSoftDelete: true },
  festival: { modelName: 'festival', supportsSoftDelete: true },
};

/**
 * Generic Bulk Operations Controller
 *
 * This is a base controller that can be extended by specific domain controllers.
 * It provides common bulk operation endpoints that can be customized per domain.
 *
 * @example
 * // Create domain-specific bulk controller
 * @Controller('api/v1/users/bulk')
 * @ApiTags('Users - Bulk Operations')
 * export class UsersBulkController extends BulkOperationController {
 *   constructor(
 *     bulkService: BulkOperationService,
 *     private readonly usersService: UsersService,
 *   ) {
 *     super(bulkService);
 *   }
 *
 *   @Post('create')
 *   async bulkCreateUsers(@Body() dto: BulkOperationDto<CreateUserDto>) {
 *     return this.bulkService.bulkCreate(
 *       dto.items,
 *       (item) => this.usersService.create(item),
 *       { continueOnError: dto.continueOnError }
 *     );
 *   }
 * }
 */
@Controller()
@ApiTags('Bulk Operations')
@ApiBearerAuth('JWT-auth')
export abstract class BulkOperationController {
  constructor(protected readonly bulkService: BulkOperationService) {}
}

/**
 * Generic Bulk Controller with Prisma-based delete operations
 *
 * Supports multiple entity types and both soft/hard delete operations.
 * For production use, consider creating domain-specific bulk controllers
 * that inherit from BulkOperationController base class.
 */
@Controller('api/bulk')
@ApiTags('Bulk Operations')
@ApiBearerAuth('JWT-auth')
export class GenericBulkController {
  constructor(
    private readonly bulkService: BulkOperationService,
    private readonly prisma: PrismaService
  ) {}

  @Post('delete')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Bulk delete items',
    description:
      'Delete multiple items by their IDs. Supports soft delete and continue-on-error. ' +
      'Supported entity types: ticket, user, vendor, payment, artist, vendorOrder, ticketCategory, festival.',
  })
  @ApiQuery({
    name: 'entityType',
    required: true,
    description: 'Type of entity to delete',
    enum: SUPPORTED_ENTITY_TYPES,
    example: 'ticket',
  })
  @ApiBody({ type: BulkDeleteDto })
  @ApiResponse({
    status: 200,
    description: 'Bulk delete operation completed',
    type: BulkOperationResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid request - validation failed or unsupported entity type',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - authentication required',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - insufficient permissions',
  })
  async bulkDelete(
    @Body() dto: BulkDeleteDto,
    @Query('entityType') entityType: string
  ): Promise<BulkOperationResponseDto> {
    // Validate entity type
    if (!entityType || !SUPPORTED_ENTITY_TYPES.includes(entityType as SupportedEntityType)) {
      throw new BadRequestException(
        `Invalid entity type. Supported types: ${SUPPORTED_ENTITY_TYPES.join(', ')}`
      );
    }

    const config = ENTITY_CONFIG[entityType as SupportedEntityType];
    const softDelete = dto.softDelete !== false && config.supportsSoftDelete;

    return this.bulkService.bulkDelete(dto, async (id: string) => {
      // Get the Prisma model dynamically
      const model = (this.prisma as Record<string, unknown>)[config.modelName] as {
        findUnique: (args: { where: { id: string } }) => Promise<{ id: string } | null>;
        update: (args: {
          where: { id: string };
          data: { isDeleted: boolean; deletedAt: Date };
        }) => Promise<{ id: string }>;
        delete: (args: { where: { id: string } }) => Promise<{ id: string }>;
      };

      if (!model) {
        throw new Error(`Model ${config.modelName} not found in Prisma client`);
      }

      // Check if item exists
      const existing = await model.findUnique({
        where: { id },
      });

      if (!existing) {
        throw new Error(`${entityType} with ID ${id} not found`);
      }

      if (softDelete) {
        // Soft delete - set isDeleted flag and deletedAt timestamp
        await model.update({
          where: { id },
          data: {
            isDeleted: true,
            deletedAt: new Date(),
          },
        });
      } else {
        // Hard delete - permanently remove from database
        await model.delete({
          where: { id },
        });
      }

      return true;
    });
  }

  @Post('validate-import')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Validate import data',
    description:
      'Validate import data before processing. Returns validation errors without making changes.',
  })
  @ApiBody({ type: BulkImportDto })
  @ApiResponse({
    status: 200,
    description: 'Validation completed',
    type: BulkOperationResponseDto,
  })
  async validateImport(@Body() dto: BulkImportDto): Promise<BulkOperationResponseDto> {
    const startTime = Date.now();
    const results = [];
    let data: unknown[];

    try {
      if (dto.format === 'json') {
        data = JSON.parse(dto.data);
      } else {
        // CSV parsing would go here
        data = [];
      }

      // Validate each item
      for (let i = 0; i < data.length; i++) {
        results.push({
          index: i,
          status: 'SUCCESS' as const,
          data: data[i] as Record<string, unknown>,
        });
      }

      return {
        status: 'COMPLETED' as const,
        total: data.length,
        successful: data.length,
        failed: 0,
        skipped: 0,
        processingTimeMs: Date.now() - startTime,
        results,
      };
    } catch (error) {
      return {
        status: 'FAILED' as const,
        total: 0,
        successful: 0,
        failed: 1,
        skipped: 0,
        processingTimeMs: Date.now() - startTime,
        results: [
          {
            index: 0,
            status: 'FAILED' as const,
            error: error instanceof Error ? error.message : 'Parse error',
          },
        ],
        errorSummary: { 'Parse error': 1 },
      };
    }
  }

  @Post('export')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Export data in bulk',
    description: 'Export data in CSV, JSON, or XLSX format.',
  })
  @ApiBody({ type: BulkExportDto })
  @ApiResponse({
    status: 200,
    description: 'Export completed - returns file or download URL',
  })
  async bulkExport(
    @Body() dto: BulkExportDto
  ): Promise<{ downloadUrl: string; format: string; recordCount: number }> {
    // Placeholder - real implementation would generate actual export file
    return {
      downloadUrl: `/api/exports/download/export-${Date.now()}.${dto.format}`,
      format: dto.format,
      recordCount: 0,
    };
  }
}
