import {
  Controller,
  Post,
  Get,
  Delete,
  Param,
  Body,
  Query,
  UseInterceptors,
  UploadedFile,
  ParseFilePipe,
  MaxFileSizeValidator,
  FileTypeValidator,
  HttpCode,
  HttpStatus,
  Logger,
  Res,
  StreamableFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiConsumes,
  ApiBody,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { Response } from 'express';
import { UploadService, IMAGE_PRESETS, UploadedFile as UploadedFileType } from './upload.service';
import {
  UploadImageDto,
  UploadDocumentDto,
  UploadResponseDto,
  SignedUrlResponseDto,
  GetSignedUrlDto,
  DeleteResponseDto,
  ImagePreset,
} from './dto/upload.dto';
import { Public } from '../auth/decorators/public.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '@prisma/client';

@ApiTags('Upload')
@ApiBearerAuth()
@Controller('upload')
export class UploadController {
  private readonly logger = new Logger(UploadController.name);

  constructor(private readonly uploadService: UploadService) {}

  /**
   * Upload an image with optional resize and thumbnail generation
   */
  @Post('image')
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({ summary: 'Upload an image' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    description: 'Image file to upload',
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description: 'Image file (JPEG, PNG, GIF, WebP, AVIF)',
        },
        folder: {
          type: 'string',
          description: 'Folder to store the image',
        },
        preset: {
          type: 'string',
          enum: Object.values(ImagePreset),
          description: 'Image preset for resize',
        },
        width: {
          type: 'number',
          description: 'Custom width',
        },
        height: {
          type: 'number',
          description: 'Custom height',
        },
        quality: {
          type: 'number',
          description: 'Image quality (1-100)',
        },
        generateThumbnail: {
          type: 'boolean',
          description: 'Generate thumbnail',
        },
        generateWebp: {
          type: 'boolean',
          description: 'Generate WebP version',
        },
      },
      required: ['file'],
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Image uploaded successfully',
    type: UploadResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Invalid file type or size' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async uploadImage(
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 5 * 1024 * 1024 }), // 5MB
          new FileTypeValidator({ fileType: /^image\/(jpeg|png|gif|webp|avif)$/ }),
        ],
      }),
    )
    file: Express.Multer.File,
    @Body() uploadImageDto: UploadImageDto,
  ): Promise<UploadResponseDto> {
    this.logger.log(`Uploading image: ${file.originalname}`);

    const uploadedFile: UploadedFileType = {
      fieldname: file.fieldname,
      originalname: file.originalname,
      encoding: file.encoding,
      mimetype: file.mimetype,
      buffer: file.buffer,
      size: file.size,
    };

    // Use preset if specified, otherwise use custom resize options
    if (uploadImageDto.preset) {
      const result = await this.uploadService.uploadImageWithPreset(
        uploadedFile,
        uploadImageDto.preset as keyof typeof IMAGE_PRESETS,
        {
          folder: uploadImageDto.folder,
          generateThumbnail: uploadImageDto.generateThumbnail,
        },
      );
      return this.toUploadResponse(result);
    }

    // Custom resize options
    const resize =
      uploadImageDto.width || uploadImageDto.height
        ? {
            width: uploadImageDto.width,
            height: uploadImageDto.height,
            fit: uploadImageDto.fit as 'cover' | 'contain' | 'fill' | 'inside' | 'outside',
            quality: uploadImageDto.quality,
            format: uploadImageDto.format as 'jpeg' | 'png' | 'webp' | 'avif',
          }
        : undefined;

    const thumbnails = uploadImageDto.generateThumbnail
      ? [{ suffix: '_thumb', options: IMAGE_PRESETS.thumbnail }]
      : undefined;

    const result = await this.uploadService.uploadImage(uploadedFile, {
      folder: uploadImageDto.folder,
      resize,
      thumbnails,
      generateWebp: uploadImageDto.generateWebp,
    });

    return this.toUploadResponse(result);
  }

  /**
   * Upload a document (PDF, DOC, etc.)
   */
  @Post('document')
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({ summary: 'Upload a document' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    description: 'Document file to upload',
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description: 'Document file (PDF, DOC, DOCX, XLS, XLSX, TXT, CSV)',
        },
        folder: {
          type: 'string',
          description: 'Folder to store the document',
        },
        isPublic: {
          type: 'boolean',
          description: 'Whether the file should be publicly accessible',
        },
      },
      required: ['file'],
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Document uploaded successfully',
    type: UploadResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Invalid file type or size' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async uploadDocument(
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 10 * 1024 * 1024 }), // 10MB
          new FileTypeValidator({
            fileType:
              /^application\/(pdf|msword|vnd\.openxmlformats-officedocument\.(wordprocessingml\.document|spreadsheetml\.sheet)|vnd\.ms-excel)|text\/(plain|csv)$/,
          }),
        ],
      }),
    )
    file: Express.Multer.File,
    @Body() uploadDocumentDto: UploadDocumentDto,
  ): Promise<UploadResponseDto> {
    this.logger.log(`Uploading document: ${file.originalname}`);

    const uploadedFile: UploadedFileType = {
      fieldname: file.fieldname,
      originalname: file.originalname,
      encoding: file.encoding,
      mimetype: file.mimetype,
      buffer: file.buffer,
      size: file.size,
    };

    const result = await this.uploadService.uploadDocument(uploadedFile, {
      folder: uploadDocumentDto.folder,
      isPublic: uploadDocumentDto.isPublic,
    });

    return this.toUploadResponse(result);
  }

  /**
   * Get a file by path (serve file content)
   */
  @Get(':path(*)')
  @Public()
  @ApiOperation({ summary: 'Get a file by path' })
  @ApiParam({
    name: 'path',
    description: 'File path in storage',
    example: 'images/550e8400-e29b-41d4-a716-446655440000.jpg',
  })
  @ApiResponse({ status: 200, description: 'File content' })
  @ApiResponse({ status: 404, description: 'File not found' })
  async getFile(
    @Param('path') path: string,
    @Res({ passthrough: true }) res: Response,
  ): Promise<StreamableFile> {
    const fileBuffer = await this.uploadService.getFile(path);
    const metadata = await this.uploadService.getFileMetadata(path);

    if (metadata?.mimeType) {
      res.set('Content-Type', metadata.mimeType);
    }

    return new StreamableFile(fileBuffer);
  }

  /**
   * Get a signed URL for a file
   */
  @Get('signed-url/:path(*)')
  @ApiOperation({ summary: 'Get a signed URL for temporary file access' })
  @ApiParam({
    name: 'path',
    description: 'File path in storage',
    example: 'documents/report.pdf',
  })
  @ApiQuery({
    name: 'expiresIn',
    required: false,
    description: 'Expiration time in seconds (default: 3600)',
  })
  @ApiResponse({
    status: 200,
    description: 'Signed URL generated',
    type: SignedUrlResponseDto,
  })
  @ApiResponse({ status: 404, description: 'File not found' })
  async getSignedUrl(
    @Param('path') path: string,
    @Query() query: GetSignedUrlDto,
  ): Promise<SignedUrlResponseDto> {
    const expiresIn = query.expiresIn || 3600;
    const url = await this.uploadService.getSignedUrl(path, expiresIn);

    return {
      url,
      expiresIn,
    };
  }

  /**
   * Delete a file
   */
  @Delete(':path(*)')
  @Roles(UserRole.ADMIN, UserRole.ORGANIZER)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete a file' })
  @ApiParam({
    name: 'path',
    description: 'File path in storage',
    example: 'images/550e8400-e29b-41d4-a716-446655440000.jpg',
  })
  @ApiResponse({
    status: 200,
    description: 'File deleted successfully',
    type: DeleteResponseDto,
  })
  @ApiResponse({ status: 404, description: 'File not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin or Organizer role required' })
  async deleteFile(@Param('path') path: string): Promise<DeleteResponseDto> {
    this.logger.log(`Deleting file: ${path}`);

    const success = await this.uploadService.deleteFile(path);

    return {
      success,
      message: success ? 'File deleted successfully' : 'File not found',
    };
  }

  /**
   * Transform storage file to response DTO
   */
  private toUploadResponse(file: {
    id: string;
    originalName: string;
    filename: string;
    mimeType: string;
    size: number;
    path: string;
    url: string;
    uploadedAt: Date;
    thumbnails?: Array<{
      id: string;
      originalName: string;
      filename: string;
      mimeType: string;
      size: number;
      path: string;
      url: string;
      uploadedAt: Date;
    }>;
  }): UploadResponseDto {
    return {
      id: file.id,
      originalName: file.originalName,
      filename: file.filename,
      mimeType: file.mimeType,
      size: file.size,
      path: file.path,
      url: file.url,
      uploadedAt: file.uploadedAt,
      thumbnails: file.thumbnails?.map((t) => ({
        id: t.id,
        originalName: t.originalName,
        filename: t.filename,
        mimeType: t.mimeType,
        size: t.size,
        path: t.path,
        url: t.url,
        uploadedAt: t.uploadedAt,
      })),
    };
  }
}
