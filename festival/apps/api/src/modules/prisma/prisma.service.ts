import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

/**
 * Prisma Service with enhanced connection pooling and error handling
 *
 * Features:
 * - Automatic connection/disconnection lifecycle management
 * - Connection health check method
 * - Connection error handling with retries
 * - Connection pool metrics
 * - Graceful shutdown support
 */
@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);
  private isConnected = false;
  private connectionRetries = 0;
  private readonly maxConnectionRetries = 5;
  private readonly retryDelayMs = 3000;

  constructor() {
    super({
      log: process.env.NODE_ENV === 'development'
        ? ['query', 'info', 'warn', 'error']
        : ['error'],
      errorFormat: 'minimal',
    });

    // Listen to connection events
    this.$on('error' as never, (e: Error) => {
      this.logger.error('Prisma connection error:', e);
      this.isConnected = false;
    });
  }

  async onModuleInit() {
    await this.connectWithRetry();
  }

  async onModuleDestroy() {
    await this.disconnect();
  }

  /**
   * Connect to the database with retry logic
   * @private
   */
  private async connectWithRetry(): Promise<void> {
    while (this.connectionRetries < this.maxConnectionRetries) {
      try {
        this.logger.log('Attempting to connect to database...');
        await this.$connect();
        this.isConnected = true;
        this.connectionRetries = 0;
        this.logger.log('Successfully connected to database');
        return;
      } catch (error) {
        this.connectionRetries++;
        this.isConnected = false;
        this.logger.error(
          `Failed to connect to database (attempt ${this.connectionRetries}/${this.maxConnectionRetries}):`,
          error instanceof Error ? error.message : error,
        );

        if (this.connectionRetries >= this.maxConnectionRetries) {
          this.logger.error('Max connection retries reached. Unable to connect to database.');
          throw error;
        }

        this.logger.log(`Retrying in ${this.retryDelayMs}ms...`);
        await this.delay(this.retryDelayMs);
      }
    }
  }

  /**
   * Disconnect from the database gracefully
   */
  async disconnect(): Promise<void> {
    if (this.isConnected) {
      try {
        this.logger.log('Disconnecting from database...');
        await this.$disconnect();
        this.isConnected = false;
        this.logger.log('Successfully disconnected from database');
      } catch (error) {
        this.logger.error('Error disconnecting from database:', error);
        throw error;
      }
    }
  }

  /**
   * Check database connection health
   * @returns Connection health status with response time
   */
  async checkConnectionHealth(): Promise<{
    isHealthy: boolean;
    responseTimeMs: number;
    error?: string;
  }> {
    const startTime = Date.now();

    try {
      // Execute a simple query to check connectivity
      await this.$queryRaw`SELECT 1`;
      const responseTimeMs = Date.now() - startTime;

      return {
        isHealthy: true,
        responseTimeMs,
      };
    } catch (error) {
      const responseTimeMs = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      this.logger.warn(`Database health check failed: ${errorMessage}`);

      return {
        isHealthy: false,
        responseTimeMs,
        error: errorMessage,
      };
    }
  }

  /**
   * Get connection pool metrics
   * @returns Connection pool statistics
   */
  getConnectionPoolMetrics(): {
    isConnected: boolean;
    connectionRetries: number;
  } {
    return {
      isConnected: this.isConnected,
      connectionRetries: this.connectionRetries,
    };
  }

  /**
   * Execute a query with automatic retry on connection errors
   * @param query Function that executes a Prisma query
   * @param maxRetries Maximum number of retries (default: 3)
   * @returns Query result
   */
  async executeWithRetry<T>(
    query: () => Promise<T>,
    maxRetries = 3,
  ): Promise<T> {
    let lastError: Error | undefined;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await query();
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        // Check if it's a connection error
        const isConnectionError =
          lastError.message.includes('connection') ||
          lastError.message.includes('ECONNREFUSED') ||
          lastError.message.includes('timeout');

        if (!isConnectionError || attempt >= maxRetries) {
          throw lastError;
        }

        this.logger.warn(
          `Query failed on attempt ${attempt}/${maxRetries}, retrying...`,
          lastError.message,
        );

        await this.delay(1000 * attempt); // Exponential backoff
      }
    }

    throw lastError;
  }

  /**
   * Clean database for testing purposes
   */
  async cleanDatabase() {
    if (process.env.NODE_ENV !== 'test') {
      throw new Error('cleanDatabase can only be called in test environment');
    }

    const tablenames = await this.$queryRaw<
      { tablename: string }[]
    >`SELECT tablename FROM pg_tables WHERE schemaname='public'`;

    for (const { tablename } of tablenames) {
      if (tablename !== '_prisma_migrations') {
        try {
          await this.$executeRawUnsafe(`TRUNCATE TABLE "public"."${tablename}" CASCADE;`);
        } catch (error) {
          this.logger.error(`Error truncating table ${tablename}:`, error);
        }
      }
    }
  }

  /**
   * Delay helper for retries
   * @private
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
