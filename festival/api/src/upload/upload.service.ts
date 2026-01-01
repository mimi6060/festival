import {
  Injectable,
  Inject,
  BadRequestException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as sharp from 'sharp';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';
import {
  STORAGE_PROVIDER,
  StorageProvider,
  StorageFile,
  UploadOptions,
  ImageResizeOptions,
  ThumbnailConfig,
} from './interfaces/storage.interface';

/**
 * Allowed MIME types for images
 */
export const ALLOWED_IMAGE_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/avif',
];

/**
 * Allowed MIME types for documents
 */
export const ALLOWED_DOCUMENT_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/plain',
  'text/csv',
];

/**
 * Default image resize presets
 */
export const IMAGE_PRESETS = {
  thumbnail: { width: 150, height: 150, fit: 'cover' as const, quality: 80 },
  small: { width: 320, height: 320, fit: 'inside' as const, quality: 85 },
  medium: { width: 640, height: 640, fit: 'inside' as const, quality: 85 },
  large: { width: 1280, height: 1280, fit: 'inside' as const, quality: 85 },
  banner: { width: 1920, height: 600, fit: 'cover' as const, quality: 90 },
  logo: { width: 400, height: 400, fit: 'inside' as const, quality: 90 },
  avatar: { width: 200, height: 200, fit: 'cover' as const, quality: 85 },
};

export interface UploadedFile {
  fieldname: string;
  originalname: string;
  encoding: string;
  mimetype: string;
  buffer: Buffer;
  size: number;
}

export interface ImageUploadResult extends StorageFile {
  thumbnails?: StorageFile[];
}

@Injectable()
export class UploadService {
  private readonly logger = new Logger(UploadService.name);
  private readonly maxFileSize: number;
  private readonly maxImageSize: number;

  constructor(
    @Inject(STORAGE_PROVIDER)
    private readonly storageProvider: StorageProvider,
    private readonly configService: ConfigService,
  ) {
    this.maxFileSize = this.configService.get<number>('upload.maxFileSize') || 10 * 1024 * 1024; // 10MB
    this.maxImageSize = this.configService.get<number>('upload.maxImageSize') || 5 * 1024 * 1024; // 5MB
  }

  /**
   * Upload an image with optional resizing and thumbnail generation
   */
  async uploadImage(
    file: UploadedFile,
    options?: {
      folder?: string;
      resize?: ImageResizeOptions;
      thumbnails?: ThumbnailConfig[];
      generateWebp?: boolean;
    },
  ): Promise<ImageUploadResult> {
    // Validate file type
    if (!ALLOWED_IMAGE_TYPES.includes(file.mimetype)) {
      throw new BadRequestException(
        `Invalid file type. Allowed types: ${ALLOWED_IMAGE_TYPES.join(', ')}`,
      );
    }

    // Validate file size
    if (file.size > this.maxImageSize) {
      throw new BadRequestException(
        `File too large. Maximum size: ${this.maxImageSize / (1024 * 1024)}MB`,
      );
    }

    const folder = options?.folder || 'images';
    const id = uuidv4();
    const ext = path.extname(file.originalname).toLowerCase();
    const basename = path.basename(file.originalname, ext);

    try {
      // Process the main image
      let processedBuffer = file.buffer;
      let outputFormat = this.getSharpFormat(file.mimetype);

      if (options?.resize) {
        const sharpInstance = sharp(file.buffer);

        // Apply resize
        sharpInstance.resize({
          width: options.resize.width,
          height: options.resize.height,
          fit: options.resize.fit || 'inside',
          withoutEnlargement: true,
        });

        // Apply format and quality
        if (options.resize.format) {
          outputFormat = options.resize.format;
        }

        processedBuffer = await this.applyFormat(
          sharpInstance,
          outputFormat,
          options.resize.quality || 85,
        );
      }

      // Generate WebP version if requested
      if (options?.generateWebp && outputFormat !== 'webp') {
        const webpBuffer = await sharp(processedBuffer)
          .webp({ quality: 85 })
          .toBuffer();

        await this.storageProvider.upload(
          webpBuffer,
          `${basename}.webp`,
          'image/webp',
          {
            folder,
            filename: `${id}.webp`,
          },
        );
      }

      // Upload main image
      const mainFile = await this.storageProvider.upload(
        processedBuffer,
        file.originalname,
        this.getMimeType(outputFormat),
        {
          folder,
          filename: id,
          metadata: {
            originalName: file.originalname,
            originalSize: file.size.toString(),
          },
        },
      );

      // Generate thumbnails if requested
      const thumbnails: StorageFile[] = [];

      if (options?.thumbnails && options.thumbnails.length > 0) {
        for (const thumbConfig of options.thumbnails) {
          const thumbBuffer = await this.resizeImage(
            file.buffer,
            thumbConfig.options,
          );

          const thumbFile = await this.storageProvider.upload(
            thumbBuffer,
            file.originalname,
            this.getMimeType(thumbConfig.options.format || outputFormat),
            {
              folder: `${folder}/thumbnails`,
              filename: `${id}${thumbConfig.suffix}`,
            },
          );

          thumbnails.push(thumbFile);
        }
      }

      this.logger.log(`Image uploaded: ${mainFile.path}`);

      return {
        ...mainFile,
        thumbnails: thumbnails.length > 0 ? thumbnails : undefined,
      };
    } catch (error) {
      this.logger.error(`Failed to upload image: ${error.message}`);
      throw error;
    }
  }

  /**
   * Upload an image with a predefined preset
   */
  async uploadImageWithPreset(
    file: UploadedFile,
    preset: keyof typeof IMAGE_PRESETS,
    options?: { folder?: string; generateThumbnail?: boolean },
  ): Promise<ImageUploadResult> {
    const presetConfig = IMAGE_PRESETS[preset];

    const thumbnails: ThumbnailConfig[] = [];
    if (options?.generateThumbnail) {
      thumbnails.push({
        suffix: '_thumb',
        options: IMAGE_PRESETS.thumbnail,
      });
    }

    return this.uploadImage(file, {
      folder: options?.folder,
      resize: presetConfig,
      thumbnails,
    });
  }

  /**
   * Upload a document (PDF, DOC, etc.)
   */
  async uploadDocument(
    file: UploadedFile,
    options?: UploadOptions,
  ): Promise<StorageFile> {
    // Validate file type
    if (!ALLOWED_DOCUMENT_TYPES.includes(file.mimetype)) {
      throw new BadRequestException(
        `Invalid file type. Allowed types: ${ALLOWED_DOCUMENT_TYPES.join(', ')}`,
      );
    }

    // Validate file size
    if (file.size > this.maxFileSize) {
      throw new BadRequestException(
        `File too large. Maximum size: ${this.maxFileSize / (1024 * 1024)}MB`,
      );
    }

    const folder = options?.folder || 'documents';

    try {
      const result = await this.storageProvider.upload(
        file.buffer,
        file.originalname,
        file.mimetype,
        {
          ...options,
          folder,
          metadata: {
            ...options?.metadata,
            originalName: file.originalname,
            originalSize: file.size.toString(),
          },
        },
      );

      this.logger.log(`Document uploaded: ${result.path}`);
      return result;
    } catch (error) {
      this.logger.error(`Failed to upload document: ${error.message}`);
      throw error;
    }
  }

  /**
   * Delete a file from storage
   */
  async deleteFile(path: string): Promise<boolean> {
    try {
      const result = await this.storageProvider.delete(path);
      if (result) {
        this.logger.log(`File deleted: ${path}`);
      }
      return result;
    } catch (error) {
      this.logger.error(`Failed to delete file: ${error.message}`);
      throw error;
    }
  }

  /**
   * Delete multiple files
   */
  async deleteFiles(paths: string[]): Promise<{ deleted: string[]; failed: string[] }> {
    const deleted: string[] = [];
    const failed: string[] = [];

    for (const filePath of paths) {
      try {
        const result = await this.storageProvider.delete(filePath);
        if (result) {
          deleted.push(filePath);
        } else {
          failed.push(filePath);
        }
      } catch {
        failed.push(filePath);
      }
    }

    return { deleted, failed };
  }

  /**
   * Get a signed URL for temporary file access
   */
  async getSignedUrl(path: string, expiresIn?: number): Promise<string> {
    const exists = await this.storageProvider.exists(path);
    if (!exists) {
      throw new NotFoundException(`File not found: ${path}`);
    }

    return this.storageProvider.getSignedUrl(path, expiresIn);
  }

  /**
   * Get file content
   */
  async getFile(path: string): Promise<Buffer> {
    return this.storageProvider.getFile(path);
  }

  /**
   * Check if file exists
   */
  async fileExists(path: string): Promise<boolean> {
    return this.storageProvider.exists(path);
  }

  /**
   * Get file metadata
   */
  async getFileMetadata(path: string): Promise<Partial<StorageFile> | null> {
    return this.storageProvider.getMetadata(path);
  }

  /**
   * Resize an image buffer
   */
  private async resizeImage(
    buffer: Buffer,
    options: ImageResizeOptions,
  ): Promise<Buffer> {
    const sharpInstance = sharp(buffer);

    sharpInstance.resize({
      width: options.width,
      height: options.height,
      fit: options.fit || 'inside',
      withoutEnlargement: true,
    });

    const format = options.format || 'jpeg';
    return this.applyFormat(sharpInstance, format, options.quality || 85);
  }

  /**
   * Apply format and quality to Sharp instance
   */
  private async applyFormat(
    sharpInstance: sharp.Sharp,
    format: string,
    quality: number,
  ): Promise<Buffer> {
    switch (format) {
      case 'jpeg':
        return sharpInstance.jpeg({ quality }).toBuffer();
      case 'png':
        return sharpInstance.png({ quality }).toBuffer();
      case 'webp':
        return sharpInstance.webp({ quality }).toBuffer();
      case 'avif':
        return sharpInstance.avif({ quality }).toBuffer();
      default:
        return sharpInstance.jpeg({ quality }).toBuffer();
    }
  }

  /**
   * Get Sharp format from MIME type
   */
  private getSharpFormat(mimeType: string): 'jpeg' | 'png' | 'webp' | 'avif' {
    switch (mimeType) {
      case 'image/png':
        return 'png';
      case 'image/webp':
        return 'webp';
      case 'image/avif':
        return 'avif';
      default:
        return 'jpeg';
    }
  }

  /**
   * Get MIME type from format
   */
  private getMimeType(format: string): string {
    switch (format) {
      case 'png':
        return 'image/png';
      case 'webp':
        return 'image/webp';
      case 'avif':
        return 'image/avif';
      default:
        return 'image/jpeg';
    }
  }
}
