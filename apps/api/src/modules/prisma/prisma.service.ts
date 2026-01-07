import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  constructor() {
    // Connection pool configuration
    // These can be set via DATABASE_URL query params or environment variables
    // Format: postgresql://USER:PASSWORD@HOST:PORT/DATABASE?connection_limit=10&pool_timeout=10
    const connectionLimit = parseInt(process.env.DATABASE_CONNECTION_LIMIT || '10', 10);
    const poolTimeout = parseInt(process.env.DATABASE_POOL_TIMEOUT || '10', 10);

    super({
      log: process.env.NODE_ENV === 'development' ? ['query', 'info', 'warn', 'error'] : ['error'],
      datasources: {
        db: {
          url: PrismaService.buildDatabaseUrl(),
        },
      },
    });

    this.logger.log(
      `Prisma connection pool configured: connection_limit=${connectionLimit}, pool_timeout=${poolTimeout}s`
    );
  }

  /**
   * Build the DATABASE_URL with connection pooling parameters
   * Appends connection_limit and pool_timeout if not already present
   */
  private static buildDatabaseUrl(): string {
    const baseUrl = process.env.DATABASE_URL;

    if (!baseUrl) {
      throw new Error('DATABASE_URL environment variable is not set');
    }

    // Parse existing URL to check for existing pool params
    const url = new URL(baseUrl);

    // Add connection pooling parameters if not already present
    if (!url.searchParams.has('connection_limit')) {
      const connectionLimit = process.env.DATABASE_CONNECTION_LIMIT || '10';
      url.searchParams.set('connection_limit', connectionLimit);
    }

    if (!url.searchParams.has('pool_timeout')) {
      const poolTimeout = process.env.DATABASE_POOL_TIMEOUT || '10';
      url.searchParams.set('pool_timeout', poolTimeout);
    }

    return url.toString();
  }

  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
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
          console.log({ error });
        }
      }
    }
  }
}
