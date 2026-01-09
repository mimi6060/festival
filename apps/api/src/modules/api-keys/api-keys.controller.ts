/**
 * API Keys Controller
 *
 * REST endpoints for API key management.
 * Allows users to create, list, update, and revoke API keys.
 *
 * @module ApiKeysController
 */

import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
  ParseUUIDPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { ApiKeysService } from './api-keys.service';
import {
  CreateApiKeyDto,
  UpdateApiKeyDto,
  ApiKeyResponseDto,
  CreateApiKeyResponseDto,
  ApiKeyStatsResponseDto,
  ApiKeyQueryDto,
} from './dto/api-key.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../../common/decorators/current-user.decorator';

// ============================================================================
// Controller
// ============================================================================

@ApiTags('API Keys')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard)
@Controller('api-keys')
export class ApiKeysController {
  constructor(private readonly apiKeysService: ApiKeysService) {}

  // ==========================================================================
  // Create
  // ==========================================================================

  @Post()
  @ApiOperation({
    summary: 'Create a new API key',
    description: `
Creates a new API key for programmatic API access.

**Important:** The plaintext key is only returned once during creation.
Store it securely - it cannot be retrieved later.

**Rate Limit Tiers:**
- FREE: 100/min, 1,000/hour, 10,000/day
- STARTER: 500/min, 5,000/hour, 50,000/day
- PRO: 2,000/min, 20,000/hour, 200,000/day
- ENTERPRISE: 10,000/min, unlimited/hour, unlimited/day
    `,
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'API key created successfully',
    type: CreateApiKeyResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid input data',
  })
  @ApiResponse({
    status: HttpStatus.CONFLICT,
    description: 'API key with this name already exists',
  })
  async create(
    @Body() dto: CreateApiKeyDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<CreateApiKeyResponseDto> {
    const result = await this.apiKeysService.create({
      ...dto,
      userId: user.id,
    });

    return {
      apiKey: this.toResponseDto(result.apiKey),
      plaintextKey: result.plaintextKey,
    };
  }

  // ==========================================================================
  // Read
  // ==========================================================================

  @Get()
  @ApiOperation({
    summary: 'List all API keys',
    description: 'Returns all API keys for the authenticated user',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'List of API keys',
    type: [ApiKeyResponseDto],
  })
  async findAll(
    @CurrentUser() user: AuthenticatedUser,
    @Query() _query: ApiKeyQueryDto,
  ): Promise<ApiKeyResponseDto[]> {
    // TODO: Add filtering by query params when needed
    const apiKeys = await this.apiKeysService.findByUserId(user.id);
    return apiKeys.map((key) => this.toResponseDto(key));
  }

  @Get('stats')
  @ApiOperation({
    summary: 'Get API key statistics',
    description: 'Returns statistics about API keys for the authenticated user',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'API key statistics',
    type: ApiKeyStatsResponseDto,
  })
  async getStats(@CurrentUser() user: AuthenticatedUser): Promise<ApiKeyStatsResponseDto> {
    return this.apiKeysService.getStats(user.id);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get API key by ID',
    description: 'Returns a specific API key by its ID',
  })
  @ApiParam({
    name: 'id',
    description: 'API key ID',
    type: String,
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'The API key',
    type: ApiKeyResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'API key not found',
  })
  async findById(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<ApiKeyResponseDto> {
    const apiKey = await this.apiKeysService.findById(id, user.id);
    return this.toResponseDto(apiKey);
  }

  // ==========================================================================
  // Update
  // ==========================================================================

  @Patch(':id')
  @ApiOperation({
    summary: 'Update an API key',
    description: 'Update API key properties (name, tier, scopes, etc.)',
  })
  @ApiParam({
    name: 'id',
    description: 'API key ID',
    type: String,
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'API key updated successfully',
    type: ApiKeyResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'API key not found',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Cannot update a revoked API key',
  })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateApiKeyDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<ApiKeyResponseDto> {
    const apiKey = await this.apiKeysService.update(id, user.id, dto);
    return this.toResponseDto(apiKey);
  }

  // ==========================================================================
  // Delete/Revoke
  // ==========================================================================

  @Post(':id/revoke')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Revoke an API key',
    description: 'Revokes an API key. The key will no longer be usable but is preserved for audit purposes.',
  })
  @ApiParam({
    name: 'id',
    description: 'API key ID',
    type: String,
  })
  @ApiResponse({
    status: HttpStatus.NO_CONTENT,
    description: 'API key revoked successfully',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'API key not found',
  })
  async revoke(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<void> {
    await this.apiKeysService.revoke(id, user.id);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Delete an API key',
    description: 'Permanently deletes an API key. This action cannot be undone.',
  })
  @ApiParam({
    name: 'id',
    description: 'API key ID',
    type: String,
  })
  @ApiResponse({
    status: HttpStatus.NO_CONTENT,
    description: 'API key deleted successfully',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'API key not found',
  })
  async delete(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<void> {
    await this.apiKeysService.delete(id, user.id);
  }

  // ==========================================================================
  // Helpers
  // ==========================================================================

  private toResponseDto(apiKey: any): ApiKeyResponseDto {
    return {
      id: apiKey.id,
      userId: apiKey.userId,
      name: apiKey.name,
      key: apiKey.key,
      keyPrefix: apiKey.keyPrefix,
      tier: apiKey.tier,
      status: apiKey.status,
      scopes: apiKey.scopes,
      description: apiKey.description,
      ipWhitelist: apiKey.ipWhitelist,
      lastUsedAt: apiKey.lastUsedAt,
      lastUsedIp: apiKey.lastUsedIp,
      usageCount: apiKey.usageCount,
      expiresAt: apiKey.expiresAt,
      festivalId: apiKey.festivalId,
      createdAt: apiKey.createdAt,
      updatedAt: apiKey.updatedAt,
    };
  }
}
