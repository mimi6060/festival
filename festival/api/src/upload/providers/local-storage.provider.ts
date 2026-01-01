import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs/promises';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';
import {
  StorageProvider,
  StorageFile,
  UploadOptions,
} from '../interfaces/storage.interface';

/**
 * Local Storage Provider
 *
 * Stores files on the local filesystem.
 * Suitable for development and testing environments.
 */
@Injectable()
export class LocalStorageProvider implements StorageProvider {
  private readonly logger = new Logger(LocalStorageProvider.name);
  private readonly uploadDir: string;
  private readonly baseUrl: string;

  constructor(private readonly configService: ConfigService) {
    this.uploadDir = this.configService.get<string>('upload.localPath') || './uploads';
    this.baseUrl = this.configService.get<string>('upload.baseUrl') || '/uploads';

    // Ensure upload directory exists
    this.ensureDirectory(this.uploadDir);
  }

  private async ensureDirectory(dir: string): Promise<void> {
    try {
      await fs.access(dir);
    } catch {
      await fs.mkdir(dir, { recursive: true });
      this.logger.log(`Created upload directory: ${dir}`);
    }
  }

  async upload(
    file: Buffer,
    originalName: string,
    mimeType: string,
    options?: UploadOptions,
  ): Promise<StorageFile> {
    const id = uuidv4();
    const ext = path.extname(originalName);
    const filename = options?.filename
      ? `${options.filename}${ext}`
      : `${id}${ext}`;

    // Build folder path
    const folder = options?.folder || 'general';
    const folderPath = path.join(this.uploadDir, folder);
    await this.ensureDirectory(folderPath);

    const filePath = path.join(folderPath, filename);
    const relativePath = path.join(folder, filename);

    try {
      await fs.writeFile(filePath, file);

      const stats = await fs.stat(filePath);

      const storageFile: StorageFile = {
        id,
        originalName,
        filename,
        mimeType,
        size: stats.size,
        path: relativePath,
        url: `${this.baseUrl}/${relativePath}`,
        uploadedAt: new Date(),
        metadata: options?.metadata,
      };

      this.logger.log(`File uploaded locally: ${relativePath}`);
      return storageFile;
    } catch (error) {
      this.logger.error(`Failed to upload file: ${error.message}`);
      throw error;
    }
  }

  async delete(filePath: string): Promise<boolean> {
    const fullPath = path.join(this.uploadDir, filePath);

    try {
      await fs.unlink(fullPath);
      this.logger.log(`File deleted: ${filePath}`);
      return true;
    } catch (error) {
      if (error.code === 'ENOENT') {
        this.logger.warn(`File not found for deletion: ${filePath}`);
        return false;
      }
      this.logger.error(`Failed to delete file: ${error.message}`);
      throw error;
    }
  }

  async exists(filePath: string): Promise<boolean> {
    const fullPath = path.join(this.uploadDir, filePath);

    try {
      await fs.access(fullPath);
      return true;
    } catch {
      return false;
    }
  }

  async getSignedUrl(filePath: string, _expiresIn?: number): Promise<string> {
    // Local storage doesn't need signed URLs
    // Just return the public URL
    return `${this.baseUrl}/${filePath}`;
  }

  async getFile(filePath: string): Promise<Buffer> {
    const fullPath = path.join(this.uploadDir, filePath);

    try {
      return await fs.readFile(fullPath);
    } catch (error) {
      if (error.code === 'ENOENT') {
        throw new NotFoundException(`File not found: ${filePath}`);
      }
      throw error;
    }
  }

  async getMetadata(filePath: string): Promise<Partial<StorageFile> | null> {
    const fullPath = path.join(this.uploadDir, filePath);

    try {
      const stats = await fs.stat(fullPath);
      const filename = path.basename(filePath);

      return {
        filename,
        path: filePath,
        size: stats.size,
        url: `${this.baseUrl}/${filePath}`,
      };
    } catch {
      return null;
    }
  }
}
