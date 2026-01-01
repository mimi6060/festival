import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { v4 as uuidv4 } from 'uuid';
import * as path from 'path';
import {
  StorageProvider,
  StorageFile,
  UploadOptions,
} from '../interfaces/storage.interface';

/**
 * S3 Storage Provider
 *
 * Stores files on AWS S3 or compatible services (MinIO, DigitalOcean Spaces).
 * Suitable for production environments.
 */
@Injectable()
export class S3StorageProvider implements StorageProvider {
  private readonly logger = new Logger(S3StorageProvider.name);
  private readonly s3Client: S3Client;
  private readonly bucket: string;
  private readonly region: string;
  private readonly baseUrl: string;
  private readonly signedUrlExpiry: number;

  constructor(private readonly configService: ConfigService) {
    this.bucket = this.configService.get<string>('upload.s3.bucket') || '';
    this.region = this.configService.get<string>('upload.s3.region') || 'eu-west-1';
    this.signedUrlExpiry = this.configService.get<number>('upload.s3.signedUrlExpiry') || 3600;

    const endpoint = this.configService.get<string>('upload.s3.endpoint');

    this.s3Client = new S3Client({
      region: this.region,
      endpoint: endpoint || undefined,
      forcePathStyle: !!endpoint, // Required for MinIO/custom endpoints
      credentials: {
        accessKeyId: this.configService.get<string>('upload.s3.accessKeyId') || '',
        secretAccessKey: this.configService.get<string>('upload.s3.secretAccessKey') || '',
      },
    });

    // Build base URL for public files
    if (endpoint) {
      this.baseUrl = `${endpoint}/${this.bucket}`;
    } else {
      this.baseUrl = `https://${this.bucket}.s3.${this.region}.amazonaws.com`;
    }

    this.logger.log(`S3 Storage initialized for bucket: ${this.bucket}`);
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

    // Build key (path in S3)
    const folder = options?.folder || 'general';
    const key = `${folder}/${filename}`;

    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: key,
      Body: file,
      ContentType: options?.contentType || mimeType,
      Metadata: options?.metadata,
      ACL: options?.isPublic !== false ? 'public-read' : 'private',
    });

    try {
      await this.s3Client.send(command);

      const storageFile: StorageFile = {
        id,
        originalName,
        filename,
        mimeType,
        size: file.length,
        path: key,
        url: options?.isPublic !== false ? `${this.baseUrl}/${key}` : key,
        uploadedAt: new Date(),
        metadata: options?.metadata,
      };

      this.logger.log(`File uploaded to S3: ${key}`);
      return storageFile;
    } catch (error) {
      this.logger.error(`Failed to upload to S3: ${error.message}`);
      throw error;
    }
  }

  async delete(key: string): Promise<boolean> {
    const command = new DeleteObjectCommand({
      Bucket: this.bucket,
      Key: key,
    });

    try {
      await this.s3Client.send(command);
      this.logger.log(`File deleted from S3: ${key}`);
      return true;
    } catch (error) {
      this.logger.error(`Failed to delete from S3: ${error.message}`);
      return false;
    }
  }

  async exists(key: string): Promise<boolean> {
    const command = new HeadObjectCommand({
      Bucket: this.bucket,
      Key: key,
    });

    try {
      await this.s3Client.send(command);
      return true;
    } catch (error) {
      if (error.name === 'NotFound' || error.$metadata?.httpStatusCode === 404) {
        return false;
      }
      throw error;
    }
  }

  async getSignedUrl(key: string, expiresIn?: number): Promise<string> {
    const command = new GetObjectCommand({
      Bucket: this.bucket,
      Key: key,
    });

    const expiry = expiresIn || this.signedUrlExpiry;

    try {
      const signedUrl = await getSignedUrl(this.s3Client, command, {
        expiresIn: expiry,
      });
      return signedUrl;
    } catch (error) {
      this.logger.error(`Failed to generate signed URL: ${error.message}`);
      throw error;
    }
  }

  async getFile(key: string): Promise<Buffer> {
    const command = new GetObjectCommand({
      Bucket: this.bucket,
      Key: key,
    });

    try {
      const response = await this.s3Client.send(command);

      if (!response.Body) {
        throw new NotFoundException(`File not found: ${key}`);
      }

      // Convert stream to buffer
      const chunks: Uint8Array[] = [];
      for await (const chunk of response.Body as AsyncIterable<Uint8Array>) {
        chunks.push(chunk);
      }

      return Buffer.concat(chunks);
    } catch (error) {
      if (error.name === 'NoSuchKey' || error.$metadata?.httpStatusCode === 404) {
        throw new NotFoundException(`File not found: ${key}`);
      }
      throw error;
    }
  }

  async getMetadata(key: string): Promise<Partial<StorageFile> | null> {
    const command = new HeadObjectCommand({
      Bucket: this.bucket,
      Key: key,
    });

    try {
      const response = await this.s3Client.send(command);
      const filename = path.basename(key);

      return {
        filename,
        path: key,
        size: response.ContentLength,
        mimeType: response.ContentType,
        url: `${this.baseUrl}/${key}`,
        metadata: response.Metadata,
      };
    } catch (error) {
      if (error.name === 'NotFound' || error.$metadata?.httpStatusCode === 404) {
        return null;
      }
      throw error;
    }
  }
}
