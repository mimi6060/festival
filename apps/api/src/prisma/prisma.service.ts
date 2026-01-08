import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { PrismaClient, Prisma } from '@prisma/client';
import {
  createSoftDeleteFindMiddleware,
  createSoftDeleteMiddleware,
  SOFT_DELETE_MODELS,
  SoftDeleteModel,
} from './soft-delete.middleware';

@Injectable()
export class PrismaService
  extends PrismaClient<Prisma.PrismaClientOptions, 'query' | 'error' | 'warn'>
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(PrismaService.name);
  private softDeleteEnabled = true;

  constructor() {
    super({
      log:
        process.env.NODE_ENV === 'development'
          ? [
              { emit: 'event', level: 'query' },
              { emit: 'event', level: 'error' },
              { emit: 'event', level: 'warn' },
            ]
          : [
              { emit: 'event', level: 'error' },
              { emit: 'event', level: 'warn' },
            ],
    });

    // Log queries in development
    if (process.env.NODE_ENV === 'development') {
      this.$on('query', (event) => {
        this.logger.debug(`Query: ${event.query}`);
        this.logger.debug(`Params: ${event.params}`);
        this.logger.debug(`Duration: ${event.duration}ms`);
      });
    }

    this.$on('error', (event) => {
      this.logger.error(`Prisma Error: ${event.message}`);
    });

    this.$on('warn', (event) => {
      this.logger.warn(`Prisma Warning: ${event.message}`);
    });

    // Apply soft delete middleware (only if $use is available - not in tests with mocked client)
    if (typeof this.$use === 'function') {
      this.$use(createSoftDeleteFindMiddleware());
      this.$use(createSoftDeleteMiddleware());

      this.logger.log(
        `Soft delete middleware enabled for models: ${SOFT_DELETE_MODELS.join(', ')}`
      );
    }
  }

  async onModuleInit() {
    this.logger.log('Connecting to database...');
    await this.$connect();
    this.logger.log('Database connection established');
  }

  async onModuleDestroy() {
    this.logger.log('Disconnecting from database...');
    await this.$disconnect();
    this.logger.log('Database disconnected');
  }

  /**
   * Clean the database (useful for testing)
   * WARNING: This will delete all data!
   */
  async cleanDatabase() {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('Cannot clean database in production!');
    }

    const models = Reflect.ownKeys(this).filter(
      (key) => typeof key === 'string' && !key.startsWith('_') && !key.startsWith('$')
    );

    return Promise.all(
      models.map((modelKey) => {
        const model = this[modelKey as keyof this];
        if (model && typeof model === 'object' && 'deleteMany' in model) {
          return (model as { deleteMany: () => Promise<unknown> }).deleteMany();
        }
        return Promise.resolve();
      })
    );
  }

  /**
   * Execute operations in a transaction
   */
  async executeInTransaction<T>(
    fn: (
      prisma: Omit<PrismaClient, '$connect' | '$disconnect' | '$on' | '$transaction' | '$extends'>
    ) => Promise<T>
  ): Promise<T> {
    return this.$transaction(fn);
  }

  /**
   * Check if a model supports soft delete
   */
  isSoftDeleteModel(model: string): boolean {
    return SOFT_DELETE_MODELS.includes(model as SoftDeleteModel);
  }

  /**
   * Get list of models that support soft delete
   */
  getSoftDeleteModels(): readonly string[] {
    return SOFT_DELETE_MODELS;
  }
}
