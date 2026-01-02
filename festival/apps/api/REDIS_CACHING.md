# Redis Caching Implementation

## Overview

The NestJS API has been enhanced with Redis caching to optimize performance for frequently accessed endpoints. This implementation reduces database load and speeds up response times for the admin dashboard.

## Architecture

### Cache Service
- **Location**: `apps/api/src/modules/cache/`
- **Type**: Custom Redis-based caching with fallback to in-memory
- **Global Module**: The CacheModule is globally available across all modules

### Cache Strategy
- **Primary**: Redis (localhost:6379)
- **Fallback**: In-memory Map (when Redis is unavailable)
- **Features**:
  - TTL-based expiration
  - Tag-based invalidation
  - Distributed locking (cache stampede prevention)
  - Cache statistics and monitoring

## Cached Endpoints

### Festivals Controller

#### GET /festivals
- **Cache TTL**: 60 seconds
- **Cache Key**: `festivals:list:{query-params}`
- **Tags**: `FESTIVAL`
- **Invalidated by**: Create, Update, Delete, Publish, Cancel festival operations

#### GET /festivals/:id
- **Cache TTL**: 30 seconds
- **Cache Key**: `festivals:id:{festival-id}`
- **Tags**: `FESTIVAL`
- **Invalidated by**: Same as above

#### GET /festivals/by-slug/:slug
- **Cache TTL**: 30 seconds
- **Cache Key**: `festivals:slug:{slug}`
- **Tags**: `FESTIVAL`
- **Invalidated by**: Same as above

### Users Controller

#### GET /users
- **Cache TTL**: 30 seconds
- **Cache Key**: `users:list:{query-params}`
- **Tags**: `USER`
- **Invalidated by**: Create, Update, Delete, Ban, Unban, Change Role operations

## Cache Decorators

### @Cacheable
Caches the result of a method. If cached value exists, returns it without executing the method.

```typescript
@Cacheable({
  key: { prefix: 'festivals:list', paramIndices: [0] },
  ttl: 60,
  tags: [CacheTag.FESTIVAL]
})
@Get()
async findAll(@Query() query: FestivalQueryDto): Promise<PaginatedFestivalsResponseDto> {
  // Method implementation
}
```

### @CacheEvict
Evicts cache entries when the method is called (used for mutations).

```typescript
@CacheEvict({ tags: [CacheTag.FESTIVAL] })
@Post()
async create(@Body() dto: CreateFestivalDto): Promise<FestivalResponseDto> {
  // Method implementation
}
```

### @CachePut
Always executes the method and updates the cache with the result.

```typescript
@CachePut({ key: 'festivals:id:${0}' })
@Put(':id')
async update(@Param('id') id: string, @Body() dto: UpdateFestivalDto) {
  // Method implementation
}
```

## Cache Tags

Cache tags enable intelligent invalidation of related cache entries:

- `FESTIVAL` - Festival-related data
- `TICKET` - Ticket-related data
- `USER` - User-related data
- `CASHLESS` - Cashless account data
- `VENDOR` - Vendor data
- `ANALYTICS` - Analytics and statistics
- `CONFIG` - Configuration data
- `SESSION` - Session data

## Cache Invalidation Strategy

### Tag-based Invalidation
When data is modified, all cache entries with the corresponding tag are invalidated:

```typescript
// Creating a festival invalidates all FESTIVAL-tagged caches
@CacheEvict({ tags: [CacheTag.FESTIVAL] })
```

This ensures:
- GET /festivals (list) is refreshed
- GET /festivals/:id is refreshed for all cached festival IDs
- GET /festivals/by-slug/:slug is refreshed for all cached slugs

### Pattern-based Invalidation
For more granular control:

```typescript
@CacheEvict({ pattern: 'users:*' })
```

## Configuration

### Redis Connection
The cache service connects to Redis using environment variables:

```env
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_DB=0
```

### Cache Settings
Default TTL values can be configured in the CacheService:

- `DEFAULT_TTL`: 3600 seconds (1 hour)
- `REALTIME_TTL`: 10 seconds
- `CONFIG_TTL`: 86400 seconds (24 hours)
- `SESSION_TTL`: 1800 seconds (30 minutes)

## Monitoring

### Cache Statistics
Access cache statistics via the CacheService:

```typescript
const stats = await cacheService.getStats();
// Returns: { hits, misses, hitRate, keys, memory, connected }
```

### Logs
The cache system logs important events:
- Connection established/lost
- Cache hits/misses
- Invalidation events
- Errors

## Performance Impact

### Expected Improvements
- **Database Load**: 40-60% reduction for read-heavy endpoints
- **Response Time**: 50-80% faster for cached responses
- **Admin Dashboard**: Significantly faster page loads and data refreshes

### Monitoring Response Times
Use Prometheus metrics to monitor cache effectiveness:
- `cache_hits_total`
- `cache_misses_total`
- `cache_keys_count`
- Request duration histograms

## Testing

### Manual Testing

1. **Start Redis**:
   ```bash
   docker-compose up -d redis
   ```

2. **Verify Redis Connection**:
   ```bash
   docker-compose logs redis
   ```

3. **Test Cached Endpoint**:
   ```bash
   # First request (cache miss)
   curl -X GET http://localhost:3333/api/festivals

   # Second request (cache hit - should be faster)
   curl -X GET http://localhost:3333/api/festivals
   ```

4. **Test Cache Invalidation**:
   ```bash
   # Create a festival (invalidates cache)
   curl -X POST http://localhost:3333/api/festivals \
     -H "Content-Type: application/json" \
     -d '{"name": "Test Festival", ...}'

   # List festivals (cache miss after invalidation)
   curl -X GET http://localhost:3333/api/festivals
   ```

### Redis CLI Testing

Connect to Redis and inspect cache:

```bash
# Connect to Redis
docker-compose exec redis redis-cli

# List all cache keys
KEYS *

# Get cache value
GET festivals:list:...

# Check TTL
TTL festivals:list:...

# Monitor cache operations in real-time
MONITOR
```

## Troubleshooting

### Redis Connection Issues
If Redis is unavailable, the system automatically falls back to in-memory caching:

```
[CacheService] Redis connection failed, using in-memory fallback
```

### Cache Not Working
1. Check if CacheModule is imported in app.module.ts (it is globally imported)
2. Verify CacheInterceptor is registered in the module
3. Check Redis connectivity
4. Review cache decorator configuration

### Performance Not Improved
1. Verify cache hit rate using `getStats()`
2. Check if TTL is too short
3. Ensure invalidation isn't too aggressive
4. Monitor Redis memory usage

## Best Practices

1. **TTL Selection**:
   - Frequently changing data: 10-30 seconds
   - Moderately stable data: 30-120 seconds
   - Stable configuration: 1 hour - 24 hours

2. **Cache Invalidation**:
   - Use tag-based invalidation for related data
   - Prefer conservative invalidation (invalidate more rather than less)
   - Document invalidation triggers

3. **Cache Keys**:
   - Include parameters that affect the result
   - Use consistent naming conventions
   - Keep keys reasonably short

4. **Monitoring**:
   - Track cache hit rate (target: >70%)
   - Monitor cache size
   - Alert on Redis connection failures

## Future Enhancements

1. **Distributed Caching**: Redis Cluster for high availability
2. **Cache Warming**: Pre-populate cache on application startup
3. **Smart TTL**: Adaptive TTL based on data change frequency
4. **Cache Compression**: Compress large responses
5. **Multi-level Caching**: L1 (in-memory) + L2 (Redis) cache

## Dependencies

- `redis`: ^5.10.0 (native Redis client)
- `ioredis`: ^5.8.2 (alternative Redis client with clustering support)

## References

- [NestJS Caching Documentation](https://docs.nestjs.com/techniques/caching)
- [Redis Documentation](https://redis.io/docs/)
- [Cache Patterns](https://aws.amazon.com/caching/best-practices/)
