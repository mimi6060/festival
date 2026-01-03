import { Module, Global } from '@nestjs/common';
import { CacheService } from './cache.service';
import { CacheInvalidationService } from './cache-invalidation.service';
import { CacheWarmingService } from './cache-warming.service';

@Global()
@Module({
  providers: [CacheService, CacheInvalidationService, CacheWarmingService],
  exports: [CacheService, CacheInvalidationService],
})
export class CacheModule {}
