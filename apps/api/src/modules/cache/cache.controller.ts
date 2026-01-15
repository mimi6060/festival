import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
  ApiParam,
  ApiBody,
} from '@nestjs/swagger';
import { CacheService, CacheTag, CacheStats } from './cache.service';
import { CacheInvalidationService, EntityChangeEvent, InvalidationResult } from './cache-invalidation.service';
import { LRUCache, LRUStats } from './lru-cache';

/**
 * DTO for cache entry details (used in API documentation)
 */
class _CacheEntryDto {
  key!: string;
  ttl!: number | null;
  size!: number;
  accessCount!: number;
  createdAt!: string;
  lastAccessed!: string;
}

/**
 * DTO for invalidation request
 */
class InvalidateByTagDto {
  tag!: CacheTag;
}

class InvalidateByPatternDto {
  pattern!: string;
}

class InvalidateByFestivalDto {
  festivalId!: string;
}

class InvalidateByUserDto {
  userId!: string;
}

class EntityChangeDto {
  entityType!: string;
  entityId!: string;
  changeType!: 'create' | 'update' | 'delete';
  changedFields?: string[];
  context?: Record<string, any>;
}

/**
 * Dashboard summary response
 */
class CacheDashboardDto {
  stats!: CacheStats;
  invalidationMetrics!: {
    totalInvalidations: number;
    cascadeInvalidations: number;
    keysInvalidated: number;
    avgDuration: number;
  };
  topKeys!: { key: string; accessCount: number }[];
  tagDistribution!: Record<string, number>;
  memoryBreakdown!: {
    total: string;
    used: string;
    peak: string;
  };
  health!: {
    status: 'healthy' | 'degraded' | 'unhealthy';
    latency: number;
    connected: boolean;
  };
}

/**
 * Cache Monitoring Controller
 *
 * Provides endpoints for:
 * - Cache statistics and metrics
 * - Cache invalidation operations
 * - Health monitoring
 * - Performance insights
 *
 * Note: In production, these endpoints should be protected with admin-only access.
 */
@ApiTags('Cache Management')
@ApiBearerAuth()
@Controller('cache')
export class CacheController {
  // Local LRU cache for hot keys tracking
  private readonly hotKeysCache: LRUCache<number>;

  constructor(
    private readonly cacheService: CacheService,
    private readonly invalidationService: CacheInvalidationService,
  ) {
    this.hotKeysCache = new LRUCache({
      maxSize: 1000,
      defaultTtl: 3600000, // 1 hour
    });
  }

  // ==================== DASHBOARD ====================

  @Get('dashboard')
  @ApiOperation({ summary: 'Get cache monitoring dashboard data' })
  @ApiResponse({
    status: 200,
    description: 'Dashboard data retrieved successfully',
    type: CacheDashboardDto,
  })
  async getDashboard(): Promise<CacheDashboardDto> {
    const stats = await this.cacheService.getStats();
    const invalidationMetrics = this.invalidationService.getMetrics();
    const health = await this.checkHealth();

    return {
      stats,
      invalidationMetrics,
      topKeys: this.getTopKeys(10),
      tagDistribution: await this.getTagDistribution(),
      memoryBreakdown: {
        total: stats.memory,
        used: stats.memory,
        peak: 'N/A', // Would need Redis INFO for this
      },
      health,
    };
  }

  // ==================== STATISTICS ====================

  @Get('stats')
  @ApiOperation({ summary: 'Get cache statistics' })
  @ApiResponse({
    status: 200,
    description: 'Cache statistics retrieved successfully',
    type: Object,
  })
  async getStats(): Promise<CacheStats> {
    return this.cacheService.getStats();
  }

  @Get('stats/detailed')
  @ApiOperation({ summary: 'Get detailed cache statistics' })
  @ApiResponse({
    status: 200,
    description: 'Detailed cache statistics retrieved successfully',
  })
  async getDetailedStats(): Promise<{
    cache: CacheStats;
    invalidation: any;
    hotKeys: LRUStats;
  }> {
    return {
      cache: await this.cacheService.getStats(),
      invalidation: this.invalidationService.getMetrics(),
      hotKeys: this.hotKeysCache.getStats(),
    };
  }

  @Post('stats/reset')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Reset cache statistics' })
  @ApiResponse({
    status: 204,
    description: 'Statistics reset successfully',
  })
  resetStats(): void {
    this.cacheService.resetStats();
    this.invalidationService.resetMetrics();
    this.hotKeysCache.clear();
  }

  // ==================== CACHE OPERATIONS ====================

  @Get('keys')
  @ApiOperation({ summary: 'List cache keys matching pattern' })
  @ApiQuery({ name: 'pattern', required: false, example: 'festival:*' })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 100 })
  @ApiResponse({
    status: 200,
    description: 'Keys retrieved successfully',
    type: [String],
  })
  async listKeys(
    @Query('pattern') pattern?: string,
    @Query('limit') limit?: number,
  ): Promise<string[]> {
    // Note: This is a simplified implementation
    // In production, you'd need to use Redis SCAN for large keyspaces
    const allKeys = this.hotKeysCache.keys();
    const filtered = pattern
      ? allKeys.filter((k) => this.matchPattern(k, pattern))
      : allKeys;
    return filtered.slice(0, limit || 100);
  }

  @Get('key/:key')
  @ApiOperation({ summary: 'Get cache entry details' })
  @ApiParam({ name: 'key', description: 'Cache key' })
  @ApiResponse({
    status: 200,
    description: 'Cache entry details retrieved',
  })
  async getKeyDetails(@Param('key') key: string): Promise<{
    exists: boolean;
    value?: any;
    type?: string;
  }> {
    const value = await this.cacheService.get(key);
    return {
      exists: value !== null,
      value: value !== null ? value : undefined,
      type: value !== null ? typeof value : undefined,
    };
  }

  @Delete('key/:key')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a specific cache key' })
  @ApiParam({ name: 'key', description: 'Cache key to delete' })
  @ApiResponse({
    status: 204,
    description: 'Key deleted successfully',
  })
  async deleteKey(@Param('key') key: string): Promise<void> {
    await this.cacheService.delete(key);
  }

  @Post('clear')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Clear all cache entries' })
  @ApiResponse({
    status: 204,
    description: 'Cache cleared successfully',
  })
  async clearCache(): Promise<void> {
    await this.cacheService.clear();
    this.hotKeysCache.clear();
  }

  // ==================== INVALIDATION ====================

  @Post('invalidate/tag')
  @ApiOperation({ summary: 'Invalidate cache entries by tag' })
  @ApiBody({ type: InvalidateByTagDto })
  @ApiResponse({
    status: 200,
    description: 'Cache invalidated successfully',
  })
  async invalidateByTag(
    @Body() dto: InvalidateByTagDto,
  ): Promise<InvalidationResult> {
    return this.invalidationService.invalidateByTag(dto.tag);
  }

  @Post('invalidate/pattern')
  @ApiOperation({ summary: 'Invalidate cache entries by pattern' })
  @ApiBody({ type: InvalidateByPatternDto })
  @ApiResponse({
    status: 200,
    description: 'Cache invalidated successfully',
  })
  async invalidateByPattern(
    @Body() dto: InvalidateByPatternDto,
  ): Promise<{ pattern: string; invalidated: boolean }> {
    await this.cacheService.deletePattern(dto.pattern);
    return { pattern: dto.pattern, invalidated: true };
  }

  @Post('invalidate/festival')
  @ApiOperation({ summary: 'Invalidate all cache for a festival' })
  @ApiBody({ type: InvalidateByFestivalDto })
  @ApiResponse({
    status: 200,
    description: 'Festival cache invalidated successfully',
  })
  async invalidateByFestival(
    @Body() dto: InvalidateByFestivalDto,
  ): Promise<InvalidationResult> {
    return this.invalidationService.invalidateByFestival(dto.festivalId);
  }

  @Post('invalidate/user')
  @ApiOperation({ summary: 'Invalidate all cache for a user' })
  @ApiBody({ type: InvalidateByUserDto })
  @ApiResponse({
    status: 200,
    description: 'User cache invalidated successfully',
  })
  async invalidateByUser(
    @Body() dto: InvalidateByUserDto,
  ): Promise<InvalidationResult> {
    return this.invalidationService.invalidateByUser(dto.userId);
  }

  @Post('invalidate/entity')
  @ApiOperation({ summary: 'Trigger cache invalidation for entity change' })
  @ApiBody({ type: EntityChangeDto })
  @ApiResponse({
    status: 200,
    description: 'Entity cache invalidated successfully',
  })
  async invalidateEntity(
    @Body() dto: EntityChangeDto,
  ): Promise<InvalidationResult> {
    const event: EntityChangeEvent = {
      entityType: dto.entityType,
      entityId: dto.entityId,
      changeType: dto.changeType,
      changedFields: dto.changedFields,
      context: dto.context,
    };
    return this.invalidationService.onEntityChange(event);
  }

  // ==================== HEALTH ====================

  @Get('health')
  @ApiOperation({ summary: 'Check cache health status' })
  @ApiResponse({
    status: 200,
    description: 'Health status retrieved successfully',
  })
  async getHealth(): Promise<{
    status: 'healthy' | 'degraded' | 'unhealthy';
    latency: number;
    connected: boolean;
    details: any;
  }> {
    const health = await this.checkHealth();
    const stats = await this.cacheService.getStats();

    return {
      ...health,
      details: {
        keys: stats.keys,
        memory: stats.memory,
        hitRate: `${stats.hitRate}%`,
      },
    };
  }

  @Get('health/latency')
  @ApiOperation({ summary: 'Measure cache latency' })
  @ApiResponse({
    status: 200,
    description: 'Latency measurement completed',
  })
  async measureLatency(): Promise<{
    read: number;
    write: number;
    delete: number;
    unit: string;
  }> {
    const testKey = `_latency_test_${Date.now()}`;
    const testValue = { test: true, timestamp: Date.now() };

    // Measure write latency
    const writeStart = Date.now();
    await this.cacheService.set(testKey, testValue, 60);
    const writeLatency = Date.now() - writeStart;

    // Measure read latency
    const readStart = Date.now();
    await this.cacheService.get(testKey);
    const readLatency = Date.now() - readStart;

    // Measure delete latency
    const deleteStart = Date.now();
    await this.cacheService.delete(testKey);
    const deleteLatency = Date.now() - deleteStart;

    return {
      read: readLatency,
      write: writeLatency,
      delete: deleteLatency,
      unit: 'ms',
    };
  }

  // ==================== CONFIGURATION ====================

  @Get('dependencies')
  @ApiOperation({ summary: 'Get registered cache dependencies' })
  @ApiResponse({
    status: 200,
    description: 'Dependencies retrieved successfully',
  })
  getDependencies(): { source: string; targets: string[] }[] {
    const deps = this.invalidationService.getDependencies();
    const result: { source: string; targets: string[] }[] = [];

    for (const [source, depList] of deps) {
      for (const dep of depList) {
        result.push({
          source,
          targets: dep.targets,
        });
      }
    }

    return result;
  }

  @Get('tags')
  @ApiOperation({ summary: 'Get available cache tags' })
  @ApiResponse({
    status: 200,
    description: 'Tags retrieved successfully',
    type: [String],
  })
  getTags(): string[] {
    return Object.values(CacheTag);
  }

  // ==================== PRIVATE HELPERS ====================

  private async checkHealth(): Promise<{
    status: 'healthy' | 'degraded' | 'unhealthy';
    latency: number;
    connected: boolean;
  }> {
    const start = Date.now();
    const testKey = `_health_check_${Date.now()}`;

    try {
      await this.cacheService.set(testKey, 'test', 10);
      const value = await this.cacheService.get(testKey);
      await this.cacheService.delete(testKey);

      const latency = Date.now() - start;
      const stats = await this.cacheService.getStats();

      let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';

      // Check for degraded state
      if (latency > 100 || stats.hitRate < 50) {
        status = 'degraded';
      }

      // Check for unhealthy state
      if (!stats.connected || value !== 'test') {
        status = 'unhealthy';
      }

      return {
        status,
        latency,
        connected: stats.connected,
      };
    } catch {
      return {
        status: 'unhealthy',
        latency: Date.now() - start,
        connected: false,
      };
    }
  }

  private getTopKeys(limit: number): { key: string; accessCount: number }[] {
    const entries = this.hotKeysCache.entries();
    return entries
      .sort((a, b) => b.metadata.accessCount - a.metadata.accessCount)
      .slice(0, limit)
      .map((e) => ({
        key: e.key,
        accessCount: e.metadata.accessCount,
      }));
  }

  private async getTagDistribution(): Promise<Record<string, number>> {
    const distribution: Record<string, number> = {};

    for (const tag of Object.values(CacheTag)) {
      // In a real implementation, you'd count keys per tag from Redis
      distribution[tag] = 0;
    }

    return distribution;
  }

  private matchPattern(key: string, pattern: string): boolean {
    const regex = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$');
    return regex.test(key);
  }
}
