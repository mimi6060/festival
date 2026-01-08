import {
  FILE_SIZE_UNITS,
  MIME_TYPES,
  IMAGE_EXTENSIONS,
  DOCUMENT_EXTENSIONS,
  VIDEO_EXTENSIONS,
  AUDIO_EXTENSIONS,
  getFileExtension,
  getFileNameWithoutExtension,
  getMimeTypeFromExtension,
  getFileInfo,
  isImageFile,
  isDocumentFile,
  isVideoFile,
  isAudioFile,
  formatFileSize,
  parseFileSize,
  convertBytes,
  validateFile,
  createImageUploadConfig,
  createDocumentUploadConfig,
  sanitizeFileName,
  generateUniqueFileName,
  generatePrefixedFileName,
  truncateFileName,
  parseFilePath,
  joinPath,
  getRelativePath,
  isBase64,
  getMimeTypeFromBase64,
  getBase64Data,
  getBase64FileSize,
  getFileNameFromUrl,
  isValidFileUrl,
  generateThumbnailUrl,
} from './file.utils';

describe('File Utils', () => {
  // ============================================================================
  // Constants
  // ============================================================================
  describe('Constants', () => {
    it('should have file size units', () => {
      expect(FILE_SIZE_UNITS).toContain('B');
      expect(FILE_SIZE_UNITS).toContain('KB');
      expect(FILE_SIZE_UNITS).toContain('MB');
      expect(FILE_SIZE_UNITS).toContain('GB');
      expect(FILE_SIZE_UNITS).toContain('TB');
    });

    it('should have common MIME types', () => {
      expect(MIME_TYPES['image/jpeg']).toBeDefined();
      expect(MIME_TYPES['application/pdf']).toBeDefined();
      expect(MIME_TYPES['video/mp4']).toBeDefined();
    });

    it('should have image extensions', () => {
      expect(IMAGE_EXTENSIONS).toContain('.jpg');
      expect(IMAGE_EXTENSIONS).toContain('.png');
      expect(IMAGE_EXTENSIONS).toContain('.gif');
    });

    it('should have document extensions', () => {
      expect(DOCUMENT_EXTENSIONS).toContain('.pdf');
      expect(DOCUMENT_EXTENSIONS).toContain('.doc');
      expect(DOCUMENT_EXTENSIONS).toContain('.docx');
    });

    it('should have video extensions', () => {
      expect(VIDEO_EXTENSIONS).toContain('.mp4');
      expect(VIDEO_EXTENSIONS).toContain('.mov');
    });

    it('should have audio extensions', () => {
      expect(AUDIO_EXTENSIONS).toContain('.mp3');
      expect(AUDIO_EXTENSIONS).toContain('.wav');
    });
  });

  // ============================================================================
  // getFileExtension
  // ============================================================================
  describe('getFileExtension', () => {
    it('should get extension from filename', () => {
      expect(getFileExtension('document.pdf')).toBe('.pdf');
    });

    it('should handle multiple dots', () => {
      expect(getFileExtension('my.file.name.jpg')).toBe('.jpg');
    });

    it('should return lowercase extension', () => {
      expect(getFileExtension('Document.PDF')).toBe('.pdf');
    });

    it('should return empty for no extension', () => {
      expect(getFileExtension('filename')).toBe('');
    });

    it('should return empty for dot at end', () => {
      expect(getFileExtension('filename.')).toBe('');
    });

    it('should handle hidden files', () => {
      expect(getFileExtension('.gitignore')).toBe('.gitignore');
    });
  });

  // ============================================================================
  // getFileNameWithoutExtension
  // ============================================================================
  describe('getFileNameWithoutExtension', () => {
    it('should get name without extension', () => {
      expect(getFileNameWithoutExtension('document.pdf')).toBe('document');
    });

    it('should handle multiple dots', () => {
      expect(getFileNameWithoutExtension('my.file.name.jpg')).toBe('my.file.name');
    });

    it('should return full name if no extension', () => {
      expect(getFileNameWithoutExtension('filename')).toBe('filename');
    });
  });

  // ============================================================================
  // getMimeTypeFromExtension
  // ============================================================================
  describe('getMimeTypeFromExtension', () => {
    it('should get MIME type for jpg', () => {
      expect(getMimeTypeFromExtension('.jpg')).toBe('image/jpeg');
    });

    it('should get MIME type for jpeg', () => {
      expect(getMimeTypeFromExtension('.jpeg')).toBe('image/jpeg');
    });

    it('should get MIME type for pdf', () => {
      expect(getMimeTypeFromExtension('.pdf')).toBe('application/pdf');
    });

    it('should handle extension without dot', () => {
      expect(getMimeTypeFromExtension('png')).toBe('image/png');
    });

    it('should return null for unknown extension', () => {
      expect(getMimeTypeFromExtension('.xyz')).toBeNull();
    });
  });

  // ============================================================================
  // getFileInfo
  // ============================================================================
  describe('getFileInfo', () => {
    it('should get info for image file', () => {
      const info = getFileInfo('photo.jpg', 'image/jpeg', 1024);
      expect(info.name).toBe('photo.jpg');
      expect(info.extension).toBe('.jpg');
      expect(info.mimeType).toBe('image/jpeg');
      expect(info.size).toBe(1024);
      expect(info.isImage).toBe(true);
      expect(info.isDocument).toBe(false);
    });

    it('should get info for document file', () => {
      const info = getFileInfo('document.pdf', 'application/pdf', 2048);
      expect(info.isDocument).toBe(true);
      expect(info.isImage).toBe(false);
    });

    it('should get info for video file', () => {
      const info = getFileInfo('video.mp4', 'video/mp4', 10240);
      expect(info.isVideo).toBe(true);
    });

    it('should get info for audio file', () => {
      const info = getFileInfo('audio.mp3', 'audio/mpeg', 5120);
      expect(info.isAudio).toBe(true);
    });
  });

  // ============================================================================
  // isImageFile / isDocumentFile / isVideoFile / isAudioFile
  // ============================================================================
  describe('isImageFile', () => {
    it('should detect image by MIME type', () => {
      expect(isImageFile('image/jpeg')).toBe(true);
      expect(isImageFile('image/png')).toBe(true);
    });

    it('should detect image by extension', () => {
      expect(isImageFile('application/octet-stream', '.jpg')).toBe(true);
    });

    it('should reject non-image', () => {
      expect(isImageFile('application/pdf')).toBe(false);
    });
  });

  describe('isDocumentFile', () => {
    it('should detect document by MIME type', () => {
      expect(isDocumentFile('application/pdf')).toBe(true);
      expect(isDocumentFile('application/msword')).toBe(true);
    });

    it('should detect document by extension', () => {
      expect(isDocumentFile('application/octet-stream', '.pdf')).toBe(true);
    });
  });

  describe('isVideoFile', () => {
    it('should detect video by MIME type', () => {
      expect(isVideoFile('video/mp4')).toBe(true);
    });

    it('should detect video by extension', () => {
      expect(isVideoFile('application/octet-stream', '.mp4')).toBe(true);
    });
  });

  describe('isAudioFile', () => {
    it('should detect audio by MIME type', () => {
      expect(isAudioFile('audio/mpeg')).toBe(true);
    });

    it('should detect audio by extension', () => {
      expect(isAudioFile('application/octet-stream', '.mp3')).toBe(true);
    });
  });

  // ============================================================================
  // formatFileSize
  // ============================================================================
  describe('formatFileSize', () => {
    it('should format bytes', () => {
      expect(formatFileSize(500)).toBe('500 B');
    });

    it('should format kilobytes', () => {
      expect(formatFileSize(1024)).toBe('1 KB');
    });

    it('should format megabytes', () => {
      expect(formatFileSize(1048576)).toBe('1 MB');
    });

    it('should format gigabytes', () => {
      expect(formatFileSize(1073741824)).toBe('1 GB');
    });

    it('should format with decimals', () => {
      expect(formatFileSize(1536, 2)).toBe('1.5 KB');
    });

    it('should handle zero', () => {
      expect(formatFileSize(0)).toBe('0 B');
    });
  });

  // ============================================================================
  // parseFileSize
  // ============================================================================
  describe('parseFileSize', () => {
    it('should parse bytes', () => {
      expect(parseFileSize('500 B')).toBe(500);
    });

    it('should parse kilobytes', () => {
      expect(parseFileSize('1 KB')).toBe(1024);
    });

    it('should parse megabytes', () => {
      expect(parseFileSize('1 MB')).toBe(1048576);
    });

    it('should parse gigabytes', () => {
      expect(parseFileSize('1 GB')).toBe(1073741824);
    });

    it('should parse with decimals', () => {
      expect(parseFileSize('1.5 KB')).toBe(1536);
    });

    it('should handle case insensitivity', () => {
      expect(parseFileSize('1 kb')).toBe(1024);
    });

    it('should throw for invalid format', () => {
      expect(() => parseFileSize('invalid')).toThrow();
    });
  });

  // ============================================================================
  // convertBytes
  // ============================================================================
  describe('convertBytes', () => {
    it('should convert to KB', () => {
      expect(convertBytes(1024, 'KB')).toBe(1);
    });

    it('should convert to MB', () => {
      expect(convertBytes(1048576, 'MB')).toBe(1);
    });

    it('should convert to GB', () => {
      expect(convertBytes(1073741824, 'GB')).toBe(1);
    });
  });

  // ============================================================================
  // validateFile
  // ============================================================================
  describe('validateFile', () => {
    const config = {
      maxSizeBytes: 1024 * 1024, // 1MB
      allowedTypes: ['image/jpeg', 'image/png'],
      allowedExtensions: ['.jpg', '.jpeg', '.png'],
    };

    it('should validate valid file', () => {
      const result = validateFile('photo.jpg', 'image/jpeg', 500000, config);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject file too large', () => {
      const result = validateFile('photo.jpg', 'image/jpeg', 2000000, config);
      expect(result.isValid).toBe(false);
      expect(result.errors[0]).toContain('taille');
    });

    it('should reject invalid MIME type', () => {
      const result = validateFile('doc.pdf', 'application/pdf', 500000, config);
      expect(result.isValid).toBe(false);
      expect(result.errors[0]).toContain('Type');
    });

    it('should reject invalid extension', () => {
      const result = validateFile('photo.gif', 'image/gif', 500000, config);
      expect(result.isValid).toBe(false);
    });

    it('should collect multiple errors', () => {
      const result = validateFile('doc.pdf', 'application/pdf', 2000000, config);
      expect(result.errors.length).toBeGreaterThan(1);
    });
  });

  // ============================================================================
  // createImageUploadConfig / createDocumentUploadConfig
  // ============================================================================
  describe('createImageUploadConfig', () => {
    it('should create image config with default size', () => {
      const config = createImageUploadConfig();
      expect(config.maxSizeBytes).toBe(5 * 1024 * 1024);
      expect(config.allowedTypes).toContain('image/jpeg');
    });

    it('should create image config with custom size', () => {
      const config = createImageUploadConfig(10);
      expect(config.maxSizeBytes).toBe(10 * 1024 * 1024);
    });
  });

  describe('createDocumentUploadConfig', () => {
    it('should create document config with default size', () => {
      const config = createDocumentUploadConfig();
      expect(config.maxSizeBytes).toBe(10 * 1024 * 1024);
      expect(config.allowedTypes).toContain('application/pdf');
    });
  });

  // ============================================================================
  // sanitizeFileName
  // ============================================================================
  describe('sanitizeFileName', () => {
    it('should replace spaces with underscores', () => {
      expect(sanitizeFileName('my file.pdf')).toBe('my_file.pdf');
    });

    it('should remove special characters', () => {
      expect(sanitizeFileName('file@#$.pdf')).toBe('file.pdf');
    });

    it('should remove path separators', () => {
      expect(sanitizeFileName('../file.pdf')).toBe('file.pdf');
      expect(sanitizeFileName('folder/file.pdf')).toBe('folderfile.pdf');
    });

    it('should remove leading dots', () => {
      expect(sanitizeFileName('..hidden.txt')).toBe('hidden.txt');
    });

    it('should limit length', () => {
      const longName = 'a'.repeat(300) + '.pdf';
      const sanitized = sanitizeFileName(longName);
      expect(sanitized.length).toBeLessThanOrEqual(204);
    });

    it('should return "file" for empty result', () => {
      expect(sanitizeFileName('...')).toBe('file');
    });
  });

  // ============================================================================
  // generateUniqueFileName
  // ============================================================================
  describe('generateUniqueFileName', () => {
    it('should generate unique filename', () => {
      const name1 = generateUniqueFileName('photo.jpg');
      const name2 = generateUniqueFileName('photo.jpg');
      expect(name1).not.toBe(name2);
    });

    it('should preserve extension', () => {
      const name = generateUniqueFileName('photo.jpg');
      expect(name).toMatch(/\.jpg$/);
    });

    it('should include timestamp', () => {
      const name = generateUniqueFileName('photo.jpg');
      expect(name).toMatch(/\d+/);
    });
  });

  // ============================================================================
  // generatePrefixedFileName
  // ============================================================================
  describe('generatePrefixedFileName', () => {
    it('should add prefix', () => {
      const name = generatePrefixedFileName('photo.jpg', 'user123');
      expect(name).toMatch(/^user123_/);
    });

    it('should preserve extension', () => {
      const name = generatePrefixedFileName('photo.jpg', 'user123');
      expect(name).toMatch(/\.jpg$/);
    });
  });

  // ============================================================================
  // truncateFileName
  // ============================================================================
  describe('truncateFileName', () => {
    it('should truncate long filename', () => {
      const name = truncateFileName('very_long_filename_here.jpg', 15);
      expect(name.length).toBeLessThanOrEqual(15);
      expect(name).toContain('...');
    });

    it('should preserve extension', () => {
      const name = truncateFileName('very_long_filename.jpg', 15);
      expect(name).toMatch(/\.jpg$/);
    });

    it('should not truncate short filename', () => {
      const name = truncateFileName('short.jpg', 20);
      expect(name).toBe('short.jpg');
    });
  });

  // ============================================================================
  // parseFilePath
  // ============================================================================
  describe('parseFilePath', () => {
    it('should parse Unix path', () => {
      const result = parseFilePath('/path/to/file.txt');
      expect(result.directory).toBe('/path/to');
      expect(result.filename).toBe('file.txt');
      expect(result.extension).toBe('.txt');
      expect(result.basename).toBe('file');
    });

    it('should parse Windows path', () => {
      const result = parseFilePath('C:\\path\\to\\file.txt');
      expect(result.directory).toBe('C:\\path\\to');
      expect(result.filename).toBe('file.txt');
    });

    it('should handle filename only', () => {
      const result = parseFilePath('file.txt');
      expect(result.directory).toBe('');
      expect(result.filename).toBe('file.txt');
    });
  });

  // ============================================================================
  // joinPath
  // ============================================================================
  describe('joinPath', () => {
    it('should join path parts', () => {
      expect(joinPath('path', 'to', 'file.txt')).toBe('path/to/file.txt');
    });

    it('should handle leading/trailing slashes', () => {
      expect(joinPath('path/', '/to/', '/file.txt')).toBe('path/to/file.txt');
    });

    it('should handle empty parts', () => {
      expect(joinPath('path', '', 'file.txt')).toBe('path/file.txt');
    });
  });

  // ============================================================================
  // getRelativePath
  // ============================================================================
  describe('getRelativePath', () => {
    it('should get relative path from same level', () => {
      expect(getRelativePath('/a/b', '/a/c')).toBe('../c');
    });

    it('should get relative path from deeper', () => {
      expect(getRelativePath('/a/b/c', '/a/d')).toBe('../../d');
    });

    it('should return . for same path', () => {
      expect(getRelativePath('/a/b', '/a/b')).toBe('.');
    });
  });

  // ============================================================================
  // Base64 Operations
  // ============================================================================
  describe('isBase64', () => {
    it('should detect base64 data URL', () => {
      expect(isBase64('data:image/png;base64,iVBORw0KGgo=')).toBe(true);
    });

    it('should reject non-base64', () => {
      expect(isBase64('not-base64')).toBe(false);
    });

    it('should handle base64 without MIME type', () => {
      expect(isBase64('data:;base64,SGVsbG8=')).toBe(true);
    });
  });

  describe('getMimeTypeFromBase64', () => {
    it('should extract MIME type', () => {
      expect(getMimeTypeFromBase64('data:image/png;base64,abc')).toBe('image/png');
    });

    it('should return null for invalid', () => {
      expect(getMimeTypeFromBase64('not-base64')).toBeNull();
    });
  });

  describe('getBase64Data', () => {
    it('should extract data part', () => {
      expect(getBase64Data('data:image/png;base64,iVBORw0KGgo=')).toBe('iVBORw0KGgo=');
    });

    it('should return as-is if no comma', () => {
      expect(getBase64Data('iVBORw0KGgo=')).toBe('iVBORw0KGgo=');
    });
  });

  describe('getBase64FileSize', () => {
    it('should calculate approximate file size', () => {
      // Base64 string "SGVsbG8=" decodes to "Hello" (5 bytes)
      const size = getBase64FileSize('data:text/plain;base64,SGVsbG8=');
      expect(size).toBeCloseTo(5, 0);
    });

    it('should handle padding', () => {
      const size = getBase64FileSize('SGVsbG8=');
      expect(size).toBeCloseTo(5, 0);
    });
  });

  // ============================================================================
  // URL Operations
  // ============================================================================
  describe('getFileNameFromUrl', () => {
    it('should extract filename from URL', () => {
      expect(getFileNameFromUrl('https://example.com/path/file.pdf')).toBe('file.pdf');
    });

    it('should handle URL with query params', () => {
      expect(getFileNameFromUrl('https://example.com/file.pdf?token=123')).toBe('file.pdf');
    });

    it('should decode URL encoding', () => {
      expect(getFileNameFromUrl('https://example.com/my%20file.pdf')).toBe('my file.pdf');
    });

    it('should handle simple path', () => {
      expect(getFileNameFromUrl('/path/to/file.pdf')).toBe('file.pdf');
    });
  });

  describe('isValidFileUrl', () => {
    it('should validate http URL', () => {
      expect(isValidFileUrl('http://example.com/file.pdf')).toBe(true);
    });

    it('should validate https URL', () => {
      expect(isValidFileUrl('https://example.com/file.pdf')).toBe(true);
    });

    it('should validate file URL', () => {
      expect(isValidFileUrl('file:///path/to/file.pdf')).toBe(true);
    });

    it('should reject invalid URL', () => {
      expect(isValidFileUrl('not-a-url')).toBe(false);
    });

    it('should reject FTP URL', () => {
      expect(isValidFileUrl('ftp://example.com/file.pdf')).toBe(false);
    });
  });

  // ============================================================================
  // generateThumbnailUrl
  // ============================================================================
  describe('generateThumbnailUrl', () => {
    it('should add width parameter', () => {
      const url = generateThumbnailUrl('https://example.com/image.jpg', 200);
      expect(url).toContain('w=200');
    });

    it('should add height parameter when provided', () => {
      const url = generateThumbnailUrl('https://example.com/image.jpg', 200, 150);
      expect(url).toContain('w=200');
      expect(url).toContain('h=150');
    });

    it('should handle URL with existing params', () => {
      const url = generateThumbnailUrl('https://example.com/image.jpg?token=abc', 200);
      expect(url).toContain('&w=200');
    });
  });
});
