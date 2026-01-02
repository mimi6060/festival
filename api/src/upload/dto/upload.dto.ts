import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsEnum,
  IsNumber,
  IsBoolean,
  Min,
  Max,
} from 'class-validator';

/**
 * Image preset types for predefined resize configurations
 */
export enum ImagePreset {
  THUMBNAIL = 'thumbnail',
  SMALL = 'small',
  MEDIUM = 'medium',
  LARGE = 'large',
  BANNER = 'banner',
  LOGO = 'logo',
  AVATAR = 'avatar',
}

/**
 * Image fit modes for resize
 */
export enum ImageFit {
  COVER = 'cover',
  CONTAIN = 'contain',
  FILL = 'fill',
  INSIDE = 'inside',
  OUTSIDE = 'outside',
}

/**
 * Output image formats
 */
export enum ImageFormat {
  JPEG = 'jpeg',
  PNG = 'png',
  WEBP = 'webp',
  AVIF = 'avif',
}

/**
 * DTO for image upload with custom resize options
 */
export class UploadImageDto {
  @ApiPropertyOptional({
    description: 'Folder to store the image in',
    example: 'festivals/logos',
  })
  @IsOptional()
  @IsString()
  folder?: string;

  @ApiPropertyOptional({
    description: 'Image preset for resize',
    enum: ImagePreset,
    example: ImagePreset.LOGO,
  })
  @IsOptional()
  @IsEnum(ImagePreset)
  preset?: ImagePreset;

  @ApiPropertyOptional({
    description: 'Custom width for resize (ignored if preset is set)',
    example: 800,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(4096)
  width?: number;

  @ApiPropertyOptional({
    description: 'Custom height for resize (ignored if preset is set)',
    example: 600,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(4096)
  height?: number;

  @ApiPropertyOptional({
    description: 'Fit mode for resize',
    enum: ImageFit,
    default: ImageFit.INSIDE,
  })
  @IsOptional()
  @IsEnum(ImageFit)
  fit?: ImageFit;

  @ApiPropertyOptional({
    description: 'Image quality (1-100)',
    example: 85,
    default: 85,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(100)
  quality?: number;

  @ApiPropertyOptional({
    description: 'Output format',
    enum: ImageFormat,
  })
  @IsOptional()
  @IsEnum(ImageFormat)
  format?: ImageFormat;

  @ApiPropertyOptional({
    description: 'Generate thumbnail',
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  generateThumbnail?: boolean;

  @ApiPropertyOptional({
    description: 'Generate WebP version',
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  generateWebp?: boolean;
}

/**
 * DTO for document upload
 */
export class UploadDocumentDto {
  @ApiPropertyOptional({
    description: 'Folder to store the document in',
    example: 'festivals/documents',
  })
  @IsOptional()
  @IsString()
  folder?: string;

  @ApiPropertyOptional({
    description: 'Whether the file should be publicly accessible',
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  isPublic?: boolean;
}

/**
 * Response DTO for uploaded file
 */
export class UploadResponseDto {
  @ApiProperty({
    description: 'Unique file identifier',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  id: string;

  @ApiProperty({
    description: 'Original filename',
    example: 'my-image.jpg',
  })
  originalName: string;

  @ApiProperty({
    description: 'Stored filename',
    example: '550e8400-e29b-41d4-a716-446655440000.jpg',
  })
  filename: string;

  @ApiProperty({
    description: 'MIME type',
    example: 'image/jpeg',
  })
  mimeType: string;

  @ApiProperty({
    description: 'File size in bytes',
    example: 102400,
  })
  size: number;

  @ApiProperty({
    description: 'Storage path',
    example: 'images/550e8400-e29b-41d4-a716-446655440000.jpg',
  })
  path: string;

  @ApiProperty({
    description: 'Public URL to access the file',
    example: '/uploads/images/550e8400-e29b-41d4-a716-446655440000.jpg',
  })
  url: string;

  @ApiProperty({
    description: 'Upload timestamp',
  })
  uploadedAt: Date;

  @ApiPropertyOptional({
    description: 'Thumbnail URLs if generated',
    type: [String],
  })
  thumbnails?: UploadResponseDto[];
}

/**
 * Response DTO for signed URL
 */
export class SignedUrlResponseDto {
  @ApiProperty({
    description: 'Signed URL for temporary access',
    example: 'https://s3.amazonaws.com/bucket/file?signature=...',
  })
  url: string;

  @ApiProperty({
    description: 'Expiration time in seconds',
    example: 3600,
  })
  expiresIn: number;
}

/**
 * DTO for requesting signed URL
 */
export class GetSignedUrlDto {
  @ApiPropertyOptional({
    description: 'Expiration time in seconds',
    default: 3600,
    example: 3600,
  })
  @IsOptional()
  @IsNumber()
  @Min(60)
  @Max(604800) // 7 days max
  expiresIn?: number;
}

/**
 * Response for delete operations
 */
export class DeleteResponseDto {
  @ApiProperty({
    description: 'Whether the deletion was successful',
    example: true,
  })
  success: boolean;

  @ApiProperty({
    description: 'Message',
    example: 'File deleted successfully',
  })
  message: string;
}
