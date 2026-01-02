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
  ForbiddenException,
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
import { FestivalService } from './festival.service';
import {
  UploadService,
  IMAGE_PRESETS,
  UploadedFile as UploadedFileType,
} from '../upload/upload.service';
import { UploadResponseDto } from '../upload/dto/upload.dto';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser, AuthenticatedUser } from '../auth/decorators/current-user.decorator';
import { FestivalResponseDto } from './dto/festival-response.dto';

/**
 * Festival Upload Controller
 *
 * Handles file uploads specific to festivals:
 * - Logo upload/delete
 * - Banner upload/delete
 */
@ApiTags('festivals')
@ApiBearerAuth()
@Controller('festivals')
export class FestivalUploadController {
  private readonly logger = new Logger(FestivalUploadController.name);

  constructor(
    private readonly festivalService: FestivalService,
    private readonly uploadService: UploadService,
  ) {}

  /**
   * Upload festival logo
   */
  @Post(':id/logo')
  @Roles(UserRole.ADMIN, UserRole.ORGANIZER)
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({
    summary: 'Upload festival logo',
    description: 'Upload a logo image for a festival. Automatically resizes to optimal dimensions.',
  })
  @ApiConsumes('multipart/form-data')
  @ApiParam({ name: 'id', description: 'Festival UUID' })
  @ApiBody({
    description: 'Logo image file',
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description: 'Logo image (JPEG, PNG, WebP - max 5MB)',
        },
      },
      required: ['file'],
    },
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Logo uploaded successfully',
    type: FestivalResponseDto,
  })
  @ApiResponse({ status: HttpStatus.BAD_REQUEST, description: 'Invalid file type or size' })
  @ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'Unauthorized' })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Not the festival owner' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Festival not found' })
  async uploadLogo(
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
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<FestivalResponseDto> {
    // Verify ownership
    const festival = await this.festivalService.findOne(id, user);
    if (user.role !== UserRole.ADMIN && festival.organizer?.id !== user.id) {
      throw new ForbiddenException('You can only update your own festivals');
    }

    this.logger.log(`Uploading logo for festival ${id}`);

    // Delete old logo if exists
    if (festival.logoUrl) {
      try {
        const oldPath = this.extractPathFromUrl(festival.logoUrl);
        if (oldPath) {
          await this.uploadService.deleteFile(oldPath);
        }
      } catch (error) {
        this.logger.warn(`Failed to delete old logo: ${error.message}`);
      }
    }

    // Upload new logo with logo preset
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
      'logo',
      {
        folder: `festivals/${id}/logo`,
        generateThumbnail: true,
      },
    );

    // Update festival with new logo URL
    return this.festivalService.update(
      id,
      { logoUrl: result.url },
      user,
    );
  }

  /**
   * Delete festival logo
   */
  @Delete(':id/logo')
  @Roles(UserRole.ADMIN, UserRole.ORGANIZER)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Delete festival logo',
    description: 'Remove the logo from a festival.',
  })
  @ApiParam({ name: 'id', description: 'Festival UUID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Logo deleted successfully',
    type: FestivalResponseDto,
  })
  @ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'Unauthorized' })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Not the festival owner' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Festival not found' })
  async deleteLogo(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<FestivalResponseDto> {
    const festival = await this.festivalService.findOne(id, user);
    if (user.role !== UserRole.ADMIN && festival.organizer?.id !== user.id) {
      throw new ForbiddenException('You can only update your own festivals');
    }

    if (festival.logoUrl) {
      try {
        const path = this.extractPathFromUrl(festival.logoUrl);
        if (path) {
          await this.uploadService.deleteFile(path);
        }
      } catch (error) {
        this.logger.warn(`Failed to delete logo file: ${error.message}`);
      }
    }

    return this.festivalService.update(
      id,
      { logoUrl: null as unknown as undefined },
      user,
    );
  }

  /**
   * Upload festival banner
   */
  @Post(':id/banner')
  @Roles(UserRole.ADMIN, UserRole.ORGANIZER)
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({
    summary: 'Upload festival banner',
    description: 'Upload a banner image for a festival. Automatically resizes to optimal dimensions (1920x600).',
  })
  @ApiConsumes('multipart/form-data')
  @ApiParam({ name: 'id', description: 'Festival UUID' })
  @ApiBody({
    description: 'Banner image file',
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description: 'Banner image (JPEG, PNG, WebP - max 5MB)',
        },
      },
      required: ['file'],
    },
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Banner uploaded successfully',
    type: FestivalResponseDto,
  })
  @ApiResponse({ status: HttpStatus.BAD_REQUEST, description: 'Invalid file type or size' })
  @ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'Unauthorized' })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Not the festival owner' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Festival not found' })
  async uploadBanner(
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
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<FestivalResponseDto> {
    // Verify ownership
    const festival = await this.festivalService.findOne(id, user);
    if (user.role !== UserRole.ADMIN && festival.organizer?.id !== user.id) {
      throw new ForbiddenException('You can only update your own festivals');
    }

    this.logger.log(`Uploading banner for festival ${id}`);

    // Delete old banner if exists
    if (festival.bannerUrl) {
      try {
        const oldPath = this.extractPathFromUrl(festival.bannerUrl);
        if (oldPath) {
          await this.uploadService.deleteFile(oldPath);
        }
      } catch (error) {
        this.logger.warn(`Failed to delete old banner: ${error.message}`);
      }
    }

    // Upload new banner with banner preset
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
      'banner',
      {
        folder: `festivals/${id}/banner`,
        generateThumbnail: false,
      },
    );

    // Update festival with new banner URL
    return this.festivalService.update(
      id,
      { bannerUrl: result.url },
      user,
    );
  }

  /**
   * Delete festival banner
   */
  @Delete(':id/banner')
  @Roles(UserRole.ADMIN, UserRole.ORGANIZER)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Delete festival banner',
    description: 'Remove the banner from a festival.',
  })
  @ApiParam({ name: 'id', description: 'Festival UUID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Banner deleted successfully',
    type: FestivalResponseDto,
  })
  @ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'Unauthorized' })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Not the festival owner' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Festival not found' })
  async deleteBanner(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<FestivalResponseDto> {
    const festival = await this.festivalService.findOne(id, user);
    if (user.role !== UserRole.ADMIN && festival.organizer?.id !== user.id) {
      throw new ForbiddenException('You can only update your own festivals');
    }

    if (festival.bannerUrl) {
      try {
        const path = this.extractPathFromUrl(festival.bannerUrl);
        if (path) {
          await this.uploadService.deleteFile(path);
        }
      } catch (error) {
        this.logger.warn(`Failed to delete banner file: ${error.message}`);
      }
    }

    return this.festivalService.update(
      id,
      { bannerUrl: null as unknown as undefined },
      user,
    );
  }

  /**
   * Extract storage path from URL
   */
  private extractPathFromUrl(url: string): string | null {
    if (!url) return null;

    // Handle local URLs like /uploads/festivals/xxx/logo/yyy.jpg
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
