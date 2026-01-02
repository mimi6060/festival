/**
 * File Utilities
 * Functions for file handling, validation, and processing
 */

// ============================================================================
// Types
// ============================================================================

export interface FileInfo {
  name: string;
  extension: string;
  size: number;
  mimeType: string;
  isImage: boolean;
  isDocument: boolean;
  isVideo: boolean;
  isAudio: boolean;
}

export interface ImageDimensions {
  width: number;
  height: number;
  aspectRatio: number;
}

export interface FileValidationResult {
  isValid: boolean;
  errors: string[];
}

export interface FileUploadConfig {
  maxSizeBytes: number;
  allowedTypes: string[];
  allowedExtensions: string[];
}

// ============================================================================
// Constants
// ============================================================================

export const FILE_SIZE_UNITS = ['B', 'KB', 'MB', 'GB', 'TB'] as const;

export const MIME_TYPES = {
  // Images
  'image/jpeg': { extensions: ['.jpg', '.jpeg'], category: 'image' },
  'image/png': { extensions: ['.png'], category: 'image' },
  'image/gif': { extensions: ['.gif'], category: 'image' },
  'image/webp': { extensions: ['.webp'], category: 'image' },
  'image/svg+xml': { extensions: ['.svg'], category: 'image' },
  'image/bmp': { extensions: ['.bmp'], category: 'image' },
  'image/heic': { extensions: ['.heic'], category: 'image' },
  'image/heif': { extensions: ['.heif'], category: 'image' },

  // Documents
  'application/pdf': { extensions: ['.pdf'], category: 'document' },
  'application/msword': { extensions: ['.doc'], category: 'document' },
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': {
    extensions: ['.docx'],
    category: 'document',
  },
  'application/vnd.ms-excel': { extensions: ['.xls'], category: 'document' },
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': {
    extensions: ['.xlsx'],
    category: 'document',
  },
  'application/vnd.ms-powerpoint': { extensions: ['.ppt'], category: 'document' },
  'application/vnd.openxmlformats-officedocument.presentationml.presentation': {
    extensions: ['.pptx'],
    category: 'document',
  },
  'text/plain': { extensions: ['.txt'], category: 'document' },
  'text/csv': { extensions: ['.csv'], category: 'document' },
  'application/json': { extensions: ['.json'], category: 'document' },

  // Videos
  'video/mp4': { extensions: ['.mp4'], category: 'video' },
  'video/webm': { extensions: ['.webm'], category: 'video' },
  'video/quicktime': { extensions: ['.mov'], category: 'video' },
  'video/x-msvideo': { extensions: ['.avi'], category: 'video' },
  'video/x-matroska': { extensions: ['.mkv'], category: 'video' },

  // Audio
  'audio/mpeg': { extensions: ['.mp3'], category: 'audio' },
  'audio/wav': { extensions: ['.wav'], category: 'audio' },
  'audio/ogg': { extensions: ['.ogg'], category: 'audio' },
  'audio/webm': { extensions: ['.weba'], category: 'audio' },
  'audio/aac': { extensions: ['.aac'], category: 'audio' },
  'audio/flac': { extensions: ['.flac'], category: 'audio' },

  // Archives
  'application/zip': { extensions: ['.zip'], category: 'archive' },
  'application/x-rar-compressed': { extensions: ['.rar'], category: 'archive' },
  'application/x-7z-compressed': { extensions: ['.7z'], category: 'archive' },
  'application/gzip': { extensions: ['.gz'], category: 'archive' },
} as const;

export const IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg', '.bmp', '.heic', '.heif'];
export const DOCUMENT_EXTENSIONS = ['.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx', '.txt', '.csv'];
export const VIDEO_EXTENSIONS = ['.mp4', '.webm', '.mov', '.avi', '.mkv'];
export const AUDIO_EXTENSIONS = ['.mp3', '.wav', '.ogg', '.aac', '.flac'];

// ============================================================================
// File Information
// ============================================================================

/**
 * Get file extension from filename
 */
export function getFileExtension(filename: string): string {
  const lastDot = filename.lastIndexOf('.');
  if (lastDot === -1 || lastDot === filename.length - 1) {
    return '';
  }
  return filename.slice(lastDot).toLowerCase();
}

/**
 * Get filename without extension
 */
export function getFileNameWithoutExtension(filename: string): string {
  const lastDot = filename.lastIndexOf('.');
  if (lastDot === -1) {
    return filename;
  }
  return filename.slice(0, lastDot);
}

/**
 * Get MIME type from extension
 */
export function getMimeTypeFromExtension(extension: string): string | null {
  const ext = extension.toLowerCase().startsWith('.') ? extension.toLowerCase() : `.${extension.toLowerCase()}`;

  for (const [mimeType, info] of Object.entries(MIME_TYPES)) {
    if (info.extensions.includes(ext as never)) {
      return mimeType;
    }
  }

  return null;
}

/**
 * Get file info from filename and MIME type
 */
export function getFileInfo(filename: string, mimeType: string, size: number): FileInfo {
  const extension = getFileExtension(filename);

  return {
    name: filename,
    extension,
    size,
    mimeType,
    isImage: isImageFile(mimeType, extension),
    isDocument: isDocumentFile(mimeType, extension),
    isVideo: isVideoFile(mimeType, extension),
    isAudio: isAudioFile(mimeType, extension),
  };
}

// ============================================================================
// File Type Checking
// ============================================================================

/**
 * Check if file is an image
 */
export function isImageFile(mimeType: string, extension?: string): boolean {
  if (mimeType.startsWith('image/')) return true;
  if (extension && IMAGE_EXTENSIONS.includes(extension.toLowerCase())) return true;
  return false;
}

/**
 * Check if file is a document
 */
export function isDocumentFile(mimeType: string, extension?: string): boolean {
  const docMimeTypes = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument',
    'application/vnd.ms-excel',
    'application/vnd.ms-powerpoint',
    'text/plain',
    'text/csv',
  ];

  if (docMimeTypes.some((type) => mimeType.startsWith(type))) return true;
  if (extension && DOCUMENT_EXTENSIONS.includes(extension.toLowerCase())) return true;
  return false;
}

/**
 * Check if file is a video
 */
export function isVideoFile(mimeType: string, extension?: string): boolean {
  if (mimeType.startsWith('video/')) return true;
  if (extension && VIDEO_EXTENSIONS.includes(extension.toLowerCase())) return true;
  return false;
}

/**
 * Check if file is an audio file
 */
export function isAudioFile(mimeType: string, extension?: string): boolean {
  if (mimeType.startsWith('audio/')) return true;
  if (extension && AUDIO_EXTENSIONS.includes(extension.toLowerCase())) return true;
  return false;
}

// ============================================================================
// File Size
// ============================================================================

/**
 * Format file size in human-readable format
 */
export function formatFileSize(bytes: number, decimals = 2): string {
  if (bytes === 0) return '0 B';

  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;

  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${FILE_SIZE_UNITS[i]}`;
}

/**
 * Parse file size string to bytes
 */
export function parseFileSize(sizeStr: string): number {
  const regex = /^([\d.]+)\s*(B|KB|MB|GB|TB)$/i;
  const match = sizeStr.trim().match(regex);

  if (!match) {
    throw new Error(`Invalid file size format: ${sizeStr}`);
  }

  const value = parseFloat(match[1]);
  const unit = match[2].toUpperCase();

  const multipliers: Record<string, number> = {
    B: 1,
    KB: 1024,
    MB: 1024 * 1024,
    GB: 1024 * 1024 * 1024,
    TB: 1024 * 1024 * 1024 * 1024,
  };

  return Math.round(value * multipliers[unit]);
}

/**
 * Convert bytes to specific unit
 */
export function convertBytes(
  bytes: number,
  unit: 'KB' | 'MB' | 'GB'
): number {
  const divisors = {
    KB: 1024,
    MB: 1024 * 1024,
    GB: 1024 * 1024 * 1024,
  };

  return bytes / divisors[unit];
}

// ============================================================================
// File Validation
// ============================================================================

/**
 * Validate file against configuration
 */
export function validateFile(
  filename: string,
  mimeType: string,
  size: number,
  config: FileUploadConfig
): FileValidationResult {
  const errors: string[] = [];
  const extension = getFileExtension(filename);

  // Check file size
  if (size > config.maxSizeBytes) {
    errors.push(
      `La taille du fichier (${formatFileSize(size)}) depasse la limite autorisee (${formatFileSize(config.maxSizeBytes)})`
    );
  }

  // Check MIME type
  if (config.allowedTypes.length > 0 && !config.allowedTypes.includes(mimeType)) {
    errors.push(`Type de fichier non autorise: ${mimeType}`);
  }

  // Check extension
  if (config.allowedExtensions.length > 0 && !config.allowedExtensions.includes(extension)) {
    errors.push(`Extension de fichier non autorisee: ${extension}`);
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Create validation config for images
 */
export function createImageUploadConfig(maxSizeMB = 5): FileUploadConfig {
  return {
    maxSizeBytes: maxSizeMB * 1024 * 1024,
    allowedTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
    allowedExtensions: ['.jpg', '.jpeg', '.png', '.gif', '.webp'],
  };
}

/**
 * Create validation config for documents
 */
export function createDocumentUploadConfig(maxSizeMB = 10): FileUploadConfig {
  return {
    maxSizeBytes: maxSizeMB * 1024 * 1024,
    allowedTypes: [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ],
    allowedExtensions: ['.pdf', '.doc', '.docx'],
  };
}

// ============================================================================
// File Name Operations
// ============================================================================

/**
 * Sanitize filename for safe storage
 */
export function sanitizeFileName(filename: string): string {
  // Remove path separators
  let sanitized = filename.replace(/[/\\]/g, '');

  // Replace spaces with underscores
  sanitized = sanitized.replace(/\s+/g, '_');

  // Remove special characters except dots, hyphens, underscores
  sanitized = sanitized.replace(/[^a-zA-Z0-9._-]/g, '');

  // Remove leading dots (hidden files)
  sanitized = sanitized.replace(/^\.+/, '');

  // Limit length
  const ext = getFileExtension(sanitized);
  const name = getFileNameWithoutExtension(sanitized);
  if (name.length > 200) {
    sanitized = name.slice(0, 200) + ext;
  }

  return sanitized || 'file';
}

/**
 * Generate unique filename with timestamp
 */
export function generateUniqueFileName(originalName: string): string {
  const ext = getFileExtension(originalName);
  const nameWithoutExt = getFileNameWithoutExtension(sanitizeFileName(originalName));
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);

  return `${nameWithoutExt}_${timestamp}_${random}${ext}`;
}

/**
 * Generate filename with prefix
 */
export function generatePrefixedFileName(
  originalName: string,
  prefix: string
): string {
  const ext = getFileExtension(originalName);
  const nameWithoutExt = getFileNameWithoutExtension(sanitizeFileName(originalName));
  const timestamp = Date.now();

  return `${prefix}_${timestamp}_${nameWithoutExt}${ext}`;
}

/**
 * Truncate filename to max length while preserving extension
 */
export function truncateFileName(filename: string, maxLength: number): string {
  if (filename.length <= maxLength) return filename;

  const ext = getFileExtension(filename);
  const name = getFileNameWithoutExtension(filename);

  const maxNameLength = maxLength - ext.length - 3; // 3 for "..."
  if (maxNameLength <= 0) return filename.slice(0, maxLength);

  return name.slice(0, maxNameLength) + '...' + ext;
}

// ============================================================================
// Path Operations
// ============================================================================

/**
 * Get file path components
 */
export function parseFilePath(filePath: string): {
  directory: string;
  filename: string;
  extension: string;
  basename: string;
} {
  const lastSeparator = Math.max(filePath.lastIndexOf('/'), filePath.lastIndexOf('\\'));
  const directory = lastSeparator === -1 ? '' : filePath.slice(0, lastSeparator);
  const filename = filePath.slice(lastSeparator + 1);
  const extension = getFileExtension(filename);
  const basename = getFileNameWithoutExtension(filename);

  return { directory, filename, extension, basename };
}

/**
 * Join path components
 */
export function joinPath(...parts: string[]): string {
  return parts
    .filter((part) => part.length > 0)
    .map((part, index) => {
      if (index === 0) return part.replace(/[/\\]+$/, '');
      return part.replace(/^[/\\]+|[/\\]+$/g, '');
    })
    .join('/');
}

/**
 * Get relative path
 */
export function getRelativePath(from: string, to: string): string {
  const fromParts = from.split(/[/\\]/).filter(Boolean);
  const toParts = to.split(/[/\\]/).filter(Boolean);

  let commonLength = 0;
  while (
    commonLength < fromParts.length &&
    commonLength < toParts.length &&
    fromParts[commonLength] === toParts[commonLength]
  ) {
    commonLength++;
  }

  const upCount = fromParts.length - commonLength;
  const relativeParts = [...Array(upCount).fill('..'), ...toParts.slice(commonLength)];

  return relativeParts.join('/') || '.';
}

// ============================================================================
// Base64 Operations
// ============================================================================

/**
 * Check if string is base64 encoded
 */
export function isBase64(str: string): boolean {
  const base64Regex = /^data:([a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+)?;base64,([A-Za-z0-9+/=]+)$/;
  return base64Regex.test(str);
}

/**
 * Extract MIME type from base64 data URL
 */
export function getMimeTypeFromBase64(base64: string): string | null {
  const match = base64.match(/^data:([a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+);base64,/);
  return match ? match[1] : null;
}

/**
 * Get base64 data without prefix
 */
export function getBase64Data(base64: string): string {
  const commaIndex = base64.indexOf(',');
  return commaIndex !== -1 ? base64.slice(commaIndex + 1) : base64;
}

/**
 * Calculate base64 file size in bytes
 */
export function getBase64FileSize(base64: string): number {
  const data = getBase64Data(base64);
  const padding = (data.match(/=+$/) || [''])[0].length;
  return (data.length * 3) / 4 - padding;
}

// ============================================================================
// URL Operations
// ============================================================================

/**
 * Get filename from URL
 */
export function getFileNameFromUrl(url: string): string {
  try {
    const urlObj = new URL(url);
    const pathname = urlObj.pathname;
    const lastSlash = pathname.lastIndexOf('/');
    const filename = decodeURIComponent(pathname.slice(lastSlash + 1));

    // Remove query params from filename
    const queryIndex = filename.indexOf('?');
    return queryIndex !== -1 ? filename.slice(0, queryIndex) : filename;
  } catch {
    // If URL parsing fails, try simple extraction
    const lastSlash = url.lastIndexOf('/');
    return url.slice(lastSlash + 1).split('?')[0];
  }
}

/**
 * Check if URL is a valid file URL
 */
export function isValidFileUrl(url: string): boolean {
  try {
    const urlObj = new URL(url);
    return ['http:', 'https:', 'file:'].includes(urlObj.protocol);
  } catch {
    return false;
  }
}

// ============================================================================
// Image Utilities
// ============================================================================

/**
 * Generate thumbnail URL (for compatible CDNs)
 */
export function generateThumbnailUrl(
  originalUrl: string,
  width: number,
  height?: number
): string {
  // This is a placeholder - actual implementation depends on CDN
  const params = new URLSearchParams();
  params.set('w', width.toString());
  if (height) params.set('h', height.toString());
  params.set('fit', 'cover');

  const separator = originalUrl.includes('?') ? '&' : '?';
  return `${originalUrl}${separator}${params.toString()}`;
}

/**
 * Get image dimensions from base64 (browser only)
 * Note: This function only works in browser environments with DOM access
 */
export async function getImageDimensionsFromBase64(base64: string): Promise<ImageDimensions> {
  return new Promise((resolve, reject) => {
    // Check for browser environment using globalThis for cross-platform compatibility
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const globalWindow = (globalThis as any).window;
    if (!globalWindow || typeof globalWindow.Image !== 'function') {
      reject(new Error('This function is only available in browser environment'));
      return;
    }

     
    const img = new globalWindow.Image();
    img.onload = () => {
      resolve({
        width: img.width,
        height: img.height,
        aspectRatio: img.width / img.height,
      });
    };
    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = base64;
  });
}
