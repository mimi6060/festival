/**
 * Storage Provider Interface
 *
 * Abstract interface for storage implementations.
 * Allows switching between local storage (development) and S3 (production).
 */

export interface StorageFile {
  /** Unique identifier for the stored file */
  id: string;
  /** Original filename */
  originalName: string;
  /** Generated filename in storage */
  filename: string;
  /** MIME type of the file */
  mimeType: string;
  /** File size in bytes */
  size: number;
  /** Full path or key in storage */
  path: string;
  /** Public URL or relative path to access the file */
  url: string;
  /** Timestamp of upload */
  uploadedAt: Date;
  /** Optional metadata */
  metadata?: Record<string, string>;
}

export interface UploadOptions {
  /** Folder/prefix in storage */
  folder?: string;
  /** Custom filename (without extension) */
  filename?: string;
  /** Additional metadata to store */
  metadata?: Record<string, string>;
  /** Content type override */
  contentType?: string;
  /** Whether file should be publicly accessible */
  isPublic?: boolean;
}

export interface ImageResizeOptions {
  /** Width in pixels */
  width?: number;
  /** Height in pixels */
  height?: number;
  /** Fit mode for resize */
  fit?: 'cover' | 'contain' | 'fill' | 'inside' | 'outside';
  /** Image quality (1-100) */
  quality?: number;
  /** Output format */
  format?: 'jpeg' | 'png' | 'webp' | 'avif';
}

export interface ThumbnailConfig {
  /** Suffix for thumbnail filename */
  suffix: string;
  /** Resize options for thumbnail */
  options: ImageResizeOptions;
}

export const STORAGE_PROVIDER = 'STORAGE_PROVIDER';

export interface StorageProvider {
  /**
   * Upload a file to storage
   * @param file Buffer or stream of file data
   * @param originalName Original filename
   * @param mimeType MIME type of the file
   * @param options Upload options
   * @returns Promise with stored file information
   */
  upload(
    file: Buffer,
    originalName: string,
    mimeType: string,
    options?: UploadOptions,
  ): Promise<StorageFile>;

  /**
   * Delete a file from storage
   * @param path Path or key of the file
   * @returns Promise resolving to true if deleted
   */
  delete(path: string): Promise<boolean>;

  /**
   * Check if a file exists in storage
   * @param path Path or key of the file
   * @returns Promise resolving to true if exists
   */
  exists(path: string): Promise<boolean>;

  /**
   * Get a signed URL for temporary access (S3)
   * @param path Path or key of the file
   * @param expiresIn Expiration time in seconds
   * @returns Promise with signed URL
   */
  getSignedUrl(path: string, expiresIn?: number): Promise<string>;

  /**
   * Get file content
   * @param path Path or key of the file
   * @returns Promise with file buffer
   */
  getFile(path: string): Promise<Buffer>;

  /**
   * Get file metadata
   * @param path Path or key of the file
   * @returns Promise with file metadata
   */
  getMetadata(path: string): Promise<Partial<StorageFile> | null>;
}
