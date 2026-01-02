import { Module, DynamicModule, Provider } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MulterModule } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { UploadController } from './upload.controller';
import { UploadService } from './upload.service';
import { LocalStorageProvider } from './providers/local-storage.provider';
import { S3StorageProvider } from './providers/s3-storage.provider';
import { STORAGE_PROVIDER } from './interfaces/storage.interface';

/**
 * Storage type configuration
 */
export type StorageType = 'local' | 's3';

/**
 * Upload Module Configuration
 */
export interface UploadModuleOptions {
  /** Storage type: 'local' or 's3' */
  storageType?: StorageType;
  /** Whether to use global module */
  isGlobal?: boolean;
}

/**
 * Upload Module
 *
 * Provides file upload functionality with support for:
 * - Image upload with resize and optimization (Sharp)
 * - Document upload (PDF, DOC, etc.)
 * - Local storage (development) and S3 storage (production)
 * - Signed URL generation for S3
 * - Thumbnail generation
 *
 * Usage:
 * ```typescript
 * // In app.module.ts
 * UploadModule.register({
 *   storageType: 'local', // or 's3' for production
 *   isGlobal: true,
 * })
 * ```
 *
 * Or with async configuration:
 * ```typescript
 * UploadModule.registerAsync({
 *   imports: [ConfigModule],
 *   useFactory: (configService: ConfigService) => ({
 *     storageType: configService.get('STORAGE_TYPE') || 'local',
 *   }),
 *   inject: [ConfigService],
 * })
 * ```
 */
@Module({})
export class UploadModule {
  /**
   * Register module with static configuration
   */
  static register(options?: UploadModuleOptions): DynamicModule {
    const storageType = options?.storageType || 'local';

    const storageProvider: Provider = {
      provide: STORAGE_PROVIDER,
      useClass: storageType === 's3' ? S3StorageProvider : LocalStorageProvider,
    };

    return {
      module: UploadModule,
      global: options?.isGlobal || false,
      imports: [
        ConfigModule,
        MulterModule.register({
          storage: memoryStorage(),
          limits: {
            fileSize: 10 * 1024 * 1024, // 10MB default limit
          },
        }),
      ],
      controllers: [UploadController],
      providers: [storageProvider, UploadService],
      exports: [UploadService, STORAGE_PROVIDER],
    };
  }

  /**
   * Register module with async configuration
   */
  static registerAsync(options: {
    imports?: any[];
    useFactory: (...args: any[]) => Promise<UploadModuleOptions> | UploadModuleOptions;
    inject?: any[];
    isGlobal?: boolean;
  }): DynamicModule {
    const storageProvider: Provider = {
      provide: STORAGE_PROVIDER,
      useFactory: async (configService: ConfigService, ...args: any[]) => {
        const moduleOptions = await options.useFactory(configService, ...args);
        const storageType = moduleOptions.storageType || 'local';

        if (storageType === 's3') {
          return new S3StorageProvider(configService);
        }
        return new LocalStorageProvider(configService);
      },
      inject: [ConfigService, ...(options.inject || [])],
    };

    return {
      module: UploadModule,
      global: options.isGlobal || false,
      imports: [
        ConfigModule,
        MulterModule.register({
          storage: memoryStorage(),
          limits: {
            fileSize: 10 * 1024 * 1024, // 10MB default limit
          },
        }),
        ...(options.imports || []),
      ],
      controllers: [UploadController],
      providers: [storageProvider, UploadService],
      exports: [UploadService, STORAGE_PROVIDER],
    };
  }

  /**
   * Default module configuration (uses local storage)
   * Automatically selects storage based on STORAGE_TYPE env variable
   */
  static forRoot(): DynamicModule {
    return this.registerAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => {
        const storageType = configService.get<StorageType>('upload.storageType') || 'local';
        return { storageType };
      },
      inject: [ConfigService],
      isGlobal: true,
    });
  }
}
