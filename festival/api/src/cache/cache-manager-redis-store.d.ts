declare module 'cache-manager-redis-store' {
  import { Store } from 'cache-manager';

  interface RedisStoreOptions {
    socket?: {
      host?: string;
      port?: number;
    };
    password?: string;
    ttl?: number;
  }

  export const redisStore: (options?: RedisStoreOptions) => Store;
}
