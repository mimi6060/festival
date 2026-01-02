import {
  Controller,
  Post,
  Delete,
  Param,
  UseInterceptors,
  UploadedFile,
  ParseFilePipe,
  MaxFileSizeValidator,
  FileTypeValidator,
  HttpCode,
  HttpStatus,
  ParseUUIDPipe,
  Logger,
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
} from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { ProgramService } from './program.service';
import {
  UploadService,
  UploadedFile as UploadedFileType,
} from '../upload/upload.service';
import { Roles } from '../auth/decorators/roles.decorator';
import { ArtistResponseDto } from './dto/artist.dto';

/**
 * Artists Upload Controller
 *
 * Handles file uploads specific to artists:
 * - Image upload/delete
 */
@ApiTags('artists')
@ApiBearerAuth()
@Controller('artists')
export class ArtistsUploadController {
  private readonly logger = new Logger(ArtistsUploadController.name);

  constructor(
    private readonly programService: ProgramService,
    private readonly uploadService: UploadService,
  ) {}

  /**
   * Upload artist image
   */
  @Post(':id/image')
  @Roles(UserRole.ADMIN, UserRole.ORGANIZER)
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({
    summary: 'Upload artist image',
    description: 'Upload an image for an artist. Automatically resizes to optimal dimensions.',
  })
  @ApiConsumes('multipart/form-data')
  @ApiParam({ name: 'id', description: 'Artist UUID' })
  @ApiBody({
    description: 'Artist image file',
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description: 'Artist image (JPEG, PNG, WebP - max 5MB)',
        },
      },
      required: ['file'],
    },
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Image uploaded successfully',
    type: ArtistResponseDto,
  })
  @ApiResponse({ status: HttpStatus.BAD_REQUEST, description: 'Invalid file type or size' })
  @ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'Unauthorized' })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Forbidden - requires ADMIN or ORGANIZER role' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Artist not found' })
  async uploadImage(
    @Param('id', ParseUUIDPipe) id: string,
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 5 * 1024 * 1024 }),
          new FileTypeValidator({ fileType: /^image\/(jpeg|png|webp)$/ }),
        ],
      }),
    )
    file: Express.Multer.File,
  ): Promise<ArtistResponseDto> {
    // Verify artist exists
    const artist = await this.programService.findArtistById(id);

    this.logger.log(`Uploading image for artist ${id}`);

    // Delete old image if exists
    if (artist.imageUrl) {
      try {
        const oldPath = this.extractPathFromUrl(artist.imageUrl);
        if (oldPath) {
          await this.uploadService.deleteFile(oldPath);
        }
      } catch (error) {
        this.logger.warn(`Failed to delete old image: ${error.message}`);
      }
    }

    // Upload new image with avatar preset (square, optimized for profile images)
    const uploadedFile: UploadedFileType = {
      fieldname: file.fieldname,
      originalname: file.originalname,
      encoding: file.encoding,
      mimetype: file.mimetype,
      buffer: file.buffer,
      size: file.size,
    };

    const result = await this.uploadService.uploadImageWithPreset(
      uploadedFile,
      'medium', // Use medium preset for artist images
      {
        folder: `artists/${id}`,
        generateThumbnail: true,
      },
    );

    // Update artist with new image URL
    return this.programService.updateArtist(id, { imageUrl: result.url });
  }

  /**
   * Delete artist image
   */
  @Delete(':id/image')
  @Roles(UserRole.ADMIN, UserRole.ORGANIZER)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Delete artist image',
    description: 'Remove the image from an artist.',
  })
  @ApiParam({ name: 'id', description: 'Artist UUID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Image deleted successfully',
    type: ArtistResponseDto,
  })
  @ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'Unauthorized' })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Forbidden - requires ADMIN or ORGANIZER role' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Artist not found' })
  async deleteImage(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<ArtistResponseDto> {
    const artist = await this.programService.findArtistById(id);

    if (artist.imageUrl) {
      try {
        const path = this.extractPathFromUrl(artist.imageUrl);
        if (path) {
          await this.uploadService.deleteFile(path);
          // Also try to delete thumbnail
          const thumbPath = path.replace(/(\.[^.]+)$/, '_thumb$1');
          await this.uploadService.deleteFile(thumbPath).catch(() => {});
        }
      } catch (error) {
        this.logger.warn(`Failed to delete image file: ${error.message}`);
      }
    }

    return this.programService.updateArtist(id, { imageUrl: undefined });
  }

  /**
   * Extract storage path from URL
   */
  private extractPathFromUrl(url: string): string | null {
    if (!url) return null;

    // Handle local URLs like /uploads/artists/xxx/yyy.jpg
    if (url.startsWith('/uploads/')) {
      return url.replace('/uploads/', '');
    }

    // Handle S3 URLs - extract path after bucket name
    try {
      const urlObj = new URL(url);
      return urlObj.pathname.slice(1); // Remove leading slash
    } catch {
      // Not a valid URL, try to use as path directly
      return url;
    }
  }
}
