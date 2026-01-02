import { Injectable, Logger } from '@nestjs/common';
import { CacheService, CacheTag } from './cache.service';

/**
 * Cache dependency types for intelligent invalidation
 */
export enum CacheDependencyType {
  /** Entity depends on another entity */
  ENTITY = 'entity',
  /** Computed value depends on multiple entities */
  COMPUTED = 'computed',
  /** Aggregation depends on child entities */
  AGGREGATION = 'aggregation',
  /** Session/user-specific cache */
  SESSION = 'session',
  /** Festival-scoped cache */
  FESTIVAL = 'festival',
}

/**
 * Cache dependency definition
 */
export interface CacheDependency {
  /** Type of dependency */
  type: CacheDependencyType;
  /** Source entity/pattern */
  source: string;
  /** Target keys/patterns to invalidate */
  targets: string[];
  /** Optional cascade depth */
  cascadeDepth?: number;
  /** Optional condition */
  condition?: (data: any) => boolean;
}

/**
 * Entity change event
 */
export interface EntityChangeEvent {
  /** Entity type (e.g., 'user', 'ticket', 'festival') */
  entityType: string;
  /** Entity ID */
  entityId: string;
  /** Change type */
  changeType: 'create' | 'update' | 'delete';
  /** Changed fields (for updates) */
  changedFields?: string[];
  /** Additional context */
  context?: Record<string, any>;
}

/**
 * Invalidation result
 */
export interface InvalidationResult {
  /** Number of keys invalidated */
  keysInvalidated: number;
  /** Keys that were invalidated */
  keys: string[];
  /** Duration in milliseconds */
  duration: number;
  /** Whether cascade invalidation occurred */
  cascaded: boolean;
}

/**
 * Smart Cache Invalidation Service
 *
 * Features:
 * - Dependency-based invalidation
 * - Cascade invalidation with depth control
 * - Pattern-based invalidation
 * - Festival-scoped invalidation
 * - Batch invalidation
 * - Invalidation tracking and metrics
 */
@Injectable()
export class CacheInvalidationService {
  private readonly logger = new Logger(CacheInvalidationService.name);

  // Dependency graph
  private readonly dependencies = new Map<string, CacheDependency[]>();

  // Invalidation metrics
  private metrics = {
    totalInvalidations: 0,
    cascadeInvalidations: 0,
    keysInvalidated: 0,
    avgDuration: 0,
  };

  // Default dependencies for common entities
  private readonly defaultDependencies: CacheDependency[] = [
    // Festival changes invalidate related caches
    {
      type: CacheDependencyType.FESTIVAL,
      source: 'festival:*',
      targets: [
        'tickets:festival:${id}:*',
        'zones:festival:${id}:*',
        'staff:festival:${id}:*',
        'vendors:festival:${id}:*',
        'analytics:*:${id}:*',
        'program:festival:${id}:*',
      ],
      cascadeDepth: 1,
    },
    // User changes invalidate sessions and tickets
    {
      type: CacheDependencyType.ENTITY,
      source: 'user:*',
      targets: [
        'session:${id}',
        'tickets:user:${id}:*',
        'cashless:user:${id}:*',
      ],
    },
    // Ticket category changes invalidate available tickets
    {
      type: CacheDependencyType.AGGREGATION,
      source: 'ticketCategory:*',
      targets: [
        'tickets:available:${festivalId}',
        'analytics:sales:${festivalId}:*',
      ],
    },
    // Zone capacity changes
    {
      type: CacheDependencyType.COMPUTED,
      source: 'zone:*',
      targets: [
        'zones:occupancy:${id}',
        'zones:festival:${festivalId}:*',
        'analytics:realtime:${festivalId}',
      ],
    },
    // Cashless transaction changes
    {
      type: CacheDependencyType.ENTITY,
      source: 'cashlessTransaction:*',
      targets: [
        'cashless:balance:${accountId}',
        'cashless:transactions:${accountId}:*',
        'analytics:cashless:${festivalId}:*',
      ],
    },
  ];

  constructor(private readonly cacheService: CacheService) {
    this.initializeDefaultDependencies();
  }

  /**
   * Initialize default dependencies
   */
  private initializeDefaultDependencies(): void {
    for (const dep of this.defaultDependencies) {
      this.registerDependency(dep);
    }
    this.logger.log(`Initialized ${this.dependencies.size} default cache dependencies`);
  }

  /**
   * Register a cache dependency
   */
  registerDependency(dependency: CacheDependency): void {
    const existing = this.dependencies.get(dependency.source) || [];
    existing.push(dependency);
    this.dependencies.set(dependency.source, existing);
  }

  /**
   * Remove a cache dependency
   */
  removeDependency(source: string): void {
    this.dependencies.delete(source);
  }

  /**
   * Handle entity change event
   */
  async onEntityChange(event: EntityChangeEvent): Promise<InvalidationResult> {
    const startTime = Date.now();
    const invalidatedKeys: string[] = [];
    let cascaded = false;

    this.logger.debug(
      `Processing entity change: ${event.entityType}:${event.entityId} (${event.changeType})`,
    );

    // Find matching dependencies
    const sourcePattern = `${event.entityType}:*`;
    const deps = this.dependencies.get(sourcePattern) || [];

    // Also check for exact matches
    const exactDeps = this.dependencies.get(`${event.entityType}:${event.entityId}`) || [];
    const allDeps = [...deps, ...exactDeps];

    for (const dep of allDeps) {
      // Check condition if present
      if (dep.condition && !dep.condition(event)) {
        continue;
      }

      // Build target keys from templates
      const targetKeys = this.buildTargetKeys(dep.targets, event);

      // Invalidate each target
      for (const targetPattern of targetKeys) {
        const count = await this.invalidatePattern(targetPattern);
        invalidatedKeys.push(targetPattern);

        // Handle cascade if enabled
        if (dep.cascadeDepth && dep.cascadeDepth > 0) {
          const cascadeResult = await this.cascadeInvalidation(
            targetPattern,
            dep.cascadeDepth - 1,
          );
          invalidatedKeys.push(...cascadeResult);
          cascaded = cascadeResult.length > 0;
        }
      }
    }

    // Update metrics
    const duration = Date.now() - startTime;
    this.updateMetrics(invalidatedKeys.length, cascaded, duration);

    const result: InvalidationResult = {
      keysInvalidated: invalidatedKeys.length,
      keys: invalidatedKeys,
      duration,
      cascaded,
    };

    this.logger.debug(
      `Invalidation complete: ${result.keysInvalidated} keys in ${result.duration}ms`,
    );

    return result;
  }

  /**
   * Invalidate by tag
   */
  async invalidateByTag(tag: CacheTag): Promise<InvalidationResult> {
    const startTime = Date.now();
    const count = await this.cacheService.invalidateByTag(tag);

    return {
      keysInvalidated: count,
      keys: [`tag:${tag}`],
      duration: Date.now() - startTime,
      cascaded: false,
    };
  }

  /**
   * Invalidate by festival
   */
  async invalidateByFestival(festivalId: string): Promise<InvalidationResult> {
    const startTime = Date.now();
    const invalidatedKeys: string[] = [];

    // Patterns to invalidate for a festival
    const patterns = [
      `festival:${festivalId}:*`,
      `tickets:festival:${festivalId}:*`,
      `zones:festival:${festivalId}:*`,
      `staff:festival:${festivalId}:*`,
      `vendors:festival:${festivalId}:*`,
      `program:festival:${festivalId}:*`,
      `analytics:*:${festivalId}:*`,
      `realtime:${festivalId}`,
    ];

    for (const pattern of patterns) {
      await this.cacheService.deletePattern(pattern);
      invalidatedKeys.push(pattern);
    }

    // Also invalidate by tag
    await this.cacheService.invalidateByTag(CacheTag.FESTIVAL);

    return {
      keysInvalidated: invalidatedKeys.length,
      keys: invalidatedKeys,
      duration: Date.now() - startTime,
      cascaded: false,
    };
  }

  /**
   * Invalidate user-related cache
   */
  async invalidateByUser(userId: string): Promise<InvalidationResult> {
    const startTime = Date.now();
    const patterns = [
      `session:${userId}`,
      `user:${userId}:*`,
      `tickets:user:${userId}:*`,
      `cashless:user:${userId}:*`,
      `notifications:user:${userId}:*`,
    ];

    for (const pattern of patterns) {
      await this.cacheService.deletePattern(pattern);
    }

    return {
      keysInvalidated: patterns.length,
      keys: patterns,
      duration: Date.now() - startTime,
      cascaded: false,
    };
  }

  /**
   * Batch invalidation for multiple entities
   */
  async batchInvalidate(
    events: EntityChangeEvent[],
  ): Promise<InvalidationResult> {
    const startTime = Date.now();
    const allKeys: string[] = [];
    let cascaded = false;

    // Group events by entity type for optimization
    const grouped = new Map<string, EntityChangeEvent[]>();
    for (const event of events) {
      const existing = grouped.get(event.entityType) || [];
      existing.push(event);
      grouped.set(event.entityType, existing);
    }

    // Process each group
    for (const [entityType, groupEvents] of grouped) {
      // If many events of same type, use pattern invalidation
      if (groupEvents.length > 10) {
        await this.cacheService.deletePattern(`${entityType}:*`);
        allKeys.push(`${entityType}:*`);
      } else {
        // Process individually
        for (const event of groupEvents) {
          const result = await this.onEntityChange(event);
          allKeys.push(...result.keys);
          cascaded = cascaded || result.cascaded;
        }
      }
    }

    return {
      keysInvalidated: allKeys.length,
      keys: allKeys,
      duration: Date.now() - startTime,
      cascaded,
    };
  }

  /**
   * Smart invalidation based on changed fields
   */
  async smartInvalidate(
    entityType: string,
    entityId: string,
    changedFields: string[],
    context?: Record<string, any>,
  ): Promise<InvalidationResult> {
    const startTime = Date.now();
    const keysToInvalidate: string[] = [];

    // Field-specific invalidation rules
    const fieldRules: Record<string, Record<string, string[]>> = {
      festival: {
        status: ['festivals:active', 'festivals:public:*'],
        name: [`festival:${entityId}:config`],
        dates: ['analytics:schedule:*', `program:festival:${entityId}:*`],
        capacity: [`zones:festival:${entityId}:*`, 'analytics:capacity:*'],
      },
      ticket: {
        status: [
          `tickets:user:${context?.userId}:*`,
          `analytics:sales:${context?.festivalId}:*`,
        ],
        usedAt: [`zones:occupancy:*`],
      },
      user: {
        email: [`session:${entityId}`],
        role: [`session:${entityId}`, `permissions:${entityId}`],
        status: [`session:${entityId}`, `user:${entityId}:*`],
      },
      cashlessAccount: {
        balance: [
          `cashless:balance:${entityId}`,
          `cashless:user:${context?.userId}:*`,
        ],
        status: [`cashless:account:${entityId}`],
      },
    };

    const entityRules = fieldRules[entityType];
    if (entityRules) {
      for (const field of changedFields) {
        const patterns = entityRules[field];
        if (patterns) {
          for (const pattern of patterns) {
            const resolvedPattern = this.resolvePattern(pattern, {
              id: entityId,
              ...context,
            });
            keysToInvalidate.push(resolvedPattern);
          }
        }
      }
    }

    // If no specific rules, fall back to entity-level invalidation
    if (keysToInvalidate.length === 0) {
      keysToInvalidate.push(`${entityType}:${entityId}:*`);
    }

    // Perform invalidation
    for (const pattern of keysToInvalidate) {
      await this.cacheService.deletePattern(pattern);
    }

    return {
      keysInvalidated: keysToInvalidate.length,
      keys: keysToInvalidate,
      duration: Date.now() - startTime,
      cascaded: false,
    };
  }

  /**
   * Get invalidation metrics
   */
  getMetrics(): typeof this.metrics {
    return { ...this.metrics };
  }

  /**
   * Reset metrics
   */
  resetMetrics(): void {
    this.metrics = {
      totalInvalidations: 0,
      cascadeInvalidations: 0,
      keysInvalidated: 0,
      avgDuration: 0,
    };
  }

  /**
   * Get registered dependencies
   */
  getDependencies(): Map<string, CacheDependency[]> {
    return new Map(this.dependencies);
  }

  // Private helper methods

  private buildTargetKeys(
    templates: string[],
    event: EntityChangeEvent,
  ): string[] {
    return templates.map((template) =>
      this.resolvePattern(template, {
        id: event.entityId,
        entityType: event.entityType,
        ...event.context,
      }),
    );
  }

  private resolvePattern(
    template: string,
    context: Record<string, any>,
  ): string {
    return template.replace(/\$\{(\w+)\}/g, (_, key) => {
      return context[key] !== undefined ? String(context[key]) : '*';
    });
  }

  private async invalidatePattern(pattern: string): Promise<number> {
    await this.cacheService.deletePattern(pattern);
    // Note: deletePattern doesn't return count, so we estimate
    return 1;
  }

  private async cascadeInvalidation(
    sourcePattern: string,
    remainingDepth: number,
  ): Promise<string[]> {
    if (remainingDepth < 0) {
      return [];
    }

    const invalidated: string[] = [];

    // Find dependencies for this pattern
    for (const [source, deps] of this.dependencies) {
      if (this.patternMatches(source, sourcePattern)) {
        for (const dep of deps) {
          for (const target of dep.targets) {
            await this.cacheService.deletePattern(target);
            invalidated.push(target);

            if (remainingDepth > 0) {
              const cascade = await this.cascadeInvalidation(
                target,
                remainingDepth - 1,
              );
              invalidated.push(...cascade);
            }
          }
        }
      }
    }

    return invalidated;
  }

  private patternMatches(pattern: string, value: string): boolean {
    const regex = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$');
    return regex.test(value);
  }

  private updateMetrics(
    keysCount: number,
    cascaded: boolean,
    duration: number,
  ): void {
    this.metrics.totalInvalidations++;
    this.metrics.keysInvalidated += keysCount;
    if (cascaded) {
      this.metrics.cascadeInvalidations++;
    }
    // Update moving average
    this.metrics.avgDuration =
      (this.metrics.avgDuration * (this.metrics.totalInvalidations - 1) +
        duration) /
      this.metrics.totalInvalidations;
  }
}
