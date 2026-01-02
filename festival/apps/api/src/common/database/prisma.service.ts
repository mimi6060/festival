import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  constructor() {
    super({
      log: [
        { emit: 'event', level: 'query' },
        { emit: 'stdout', level: 'info' },
        { emit: 'stdout', level: 'warn' },
        { emit: 'stdout', level: 'error' },
      ],
    });
  }

  async onModuleInit() {
    await this.$connect();
    this.logger.log('Prisma database connection established');
  }

  async onModuleDestroy() {
    await this.$disconnect();
    this.logger.log('Prisma database connection closed');
  }

  /**
   * Helper method for running queries within a transaction
   */
  async executeInTransaction<T>(fn: (prisma: PrismaClient) => Promise<T>): Promise<T> {
    return this.$transaction(async (prisma) => {
      return fn(prisma as PrismaClient);
    });
  }

  /**
   * Clean all tables (for testing purposes only)
   */
  async cleanDatabase(): Promise<void> {
    if (process.env.NODE_ENV !== 'test') {
      throw new Error('cleanDatabase can only be called in test environment');
    }

    const models = Reflect.ownKeys(this).filter(
      (key) =>
        typeof key === 'string' &&
        !key.startsWith('_') &&
        !key.startsWith('$') &&
        typeof (this as Record<string, unknown>)[key] === 'object',
    );

    await Promise.all(
      models.map(async (modelKey) => {
        const model = (this as Record<string, unknown>)[modelKey as string];
        if (model && typeof model === 'object' && 'deleteMany' in model) {
          await (model as { deleteMany: () => Promise<unknown> }).deleteMany();
        }
      }),
    );
  }
}
