import { Injectable, LoggerService as NestLoggerService, Scope } from '@nestjs/common';
import { createLogger, format, transports, Logger } from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';
import { AsyncLocalStorage } from 'async_hooks';

export interface LogContext {
  correlationId?: string;
  userId?: string;
  [key: string]: unknown;
}

// AsyncLocalStorage pour le correlation ID
export const asyncLocalStorage = new AsyncLocalStorage<Map<string, unknown>>();

@Injectable({ scope: Scope.DEFAULT })
export class LoggerService implements NestLoggerService {
  private readonly logger: Logger;
  private readonly serviceName: string = 'api';

  constructor() {
    const logLevel = process.env.LOG_LEVEL || 'info';
    const logDir = process.env.LOG_DIR || 'logs';
    const isProduction = process.env.NODE_ENV === 'production';

    // Format JSON structuré
    const structuredFormat = format.combine(
      format.timestamp({ format: 'YYYY-MM-DDTHH:mm:ss.SSSZ' }),
      format.errors({ stack: true }),
      format((info) => {
        const store = asyncLocalStorage.getStore();
        const correlationId = store?.get('correlationId') as string || '-';
        const userId = store?.get('userId') as string || undefined;

        return {
          ...info,
          correlationId,
          userId,
          service: this.serviceName,
        };
      })(),
      format.json(),
    );

    // Format console pour le développement
    const consoleFormat = format.combine(
      format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
      format.errors({ stack: true }),
      format((info) => {
        const store = asyncLocalStorage.getStore();
        const correlationId = store?.get('correlationId') as string || '-';
        return { ...info, correlationId };
      })(),
      format.colorize({ all: true }),
      format.printf(({ timestamp, level, message, correlationId, context, stack, ...meta }) => {
        const contextStr = context ? `[${context}]` : '';
        const metaStr = Object.keys(meta).length > 0 ? ` ${JSON.stringify(meta)}` : '';
        const stackStr = stack ? `\n${stack}` : '';
        return `${timestamp} ${level} ${contextStr} [${correlationId}] ${message}${metaStr}${stackStr}`;
      }),
    );

    // Configuration des transports
    const loggerTransports: (transports.ConsoleTransportInstance | DailyRotateFile)[] = [];

    // Console transport (toujours actif en dev, optionnel en prod)
    if (!isProduction) {
      loggerTransports.push(
        new transports.Console({
          format: consoleFormat,
        }),
      );
    } else {
      // En production, console avec format JSON
      loggerTransports.push(
        new transports.Console({
          format: structuredFormat,
        }),
      );
    }

    // File rotate transport (principalement pour production)
    if (isProduction || process.env.LOG_TO_FILE === 'true') {
      // Logs d'erreur séparés
      loggerTransports.push(
        new DailyRotateFile({
          dirname: logDir,
          filename: 'error-%DATE%.log',
          datePattern: 'YYYY-MM-DD',
          level: 'error',
          format: structuredFormat,
          maxSize: '20m',
          maxFiles: '14d',
          zippedArchive: true,
        }),
      );

      // Tous les logs
      loggerTransports.push(
        new DailyRotateFile({
          dirname: logDir,
          filename: 'combined-%DATE%.log',
          datePattern: 'YYYY-MM-DD',
          format: structuredFormat,
          maxSize: '20m',
          maxFiles: '14d',
          zippedArchive: true,
        }),
      );
    }

    this.logger = createLogger({
      level: logLevel,
      levels: {
        error: 0,
        warn: 1,
        info: 2,
        http: 3,
        debug: 4,
      },
      transports: loggerTransports,
      exitOnError: false,
    });
  }

  /**
   * Set correlation ID in the current async context
   */
  setCorrelationId(correlationId: string): void {
    const store = asyncLocalStorage.getStore();
    if (store) {
      store.set('correlationId', correlationId);
    }
  }

  /**
   * Get correlation ID from the current async context
   */
  getCorrelationId(): string | undefined {
    const store = asyncLocalStorage.getStore();
    return store?.get('correlationId') as string | undefined;
  }

  /**
   * Set user ID in the current async context
   */
  setUserId(userId: string): void {
    const store = asyncLocalStorage.getStore();
    if (store) {
      store.set('userId', userId);
    }
  }

  /**
   * Run a function within an async context
   */
  runWithContext<T>(fn: () => T): T {
    const store = new Map<string, unknown>();
    return asyncLocalStorage.run(store, fn);
  }

  /**
   * Log an error message
   */
  error(message: string, trace?: string, context?: string): void;
  error(message: string, context?: LogContext): void;
  error(message: string, traceOrContext?: string | LogContext, context?: string): void {
    if (typeof traceOrContext === 'string') {
      this.logger.error(message, { stack: traceOrContext, context });
    } else {
      this.logger.error(message, traceOrContext);
    }
  }

  /**
   * Log a warning message
   */
  warn(message: string, context?: string): void;
  warn(message: string, context?: LogContext): void;
  warn(message: string, context?: string | LogContext): void {
    if (typeof context === 'string') {
      this.logger.warn(message, { context });
    } else {
      this.logger.warn(message, context);
    }
  }

  /**
   * Log an info message
   */
  log(message: string, context?: string): void;
  log(message: string, context?: LogContext): void;
  log(message: string, context?: string | LogContext): void {
    if (typeof context === 'string') {
      this.logger.info(message, { context });
    } else {
      this.logger.info(message, context);
    }
  }

  /**
   * Log a debug message
   */
  debug(message: string, context?: string): void;
  debug(message: string, context?: LogContext): void;
  debug(message: string, context?: string | LogContext): void {
    if (typeof context === 'string') {
      this.logger.debug(message, { context });
    } else {
      this.logger.debug(message, context);
    }
  }

  /**
   * Log a verbose message (maps to debug in Winston)
   */
  verbose(message: string, context?: string): void;
  verbose(message: string, context?: LogContext): void;
  verbose(message: string, context?: string | LogContext): void {
    if (typeof context === 'string') {
      this.logger.debug(message, { context });
    } else {
      this.logger.debug(message, context);
    }
  }

  /**
   * Log HTTP request details
   */
  http(message: string, meta?: Record<string, unknown>): void {
    this.logger.log('http', message, meta);
  }

  /**
   * Log with custom level and structured context
   */
  logWithContext(
    level: 'error' | 'warn' | 'info' | 'http' | 'debug',
    message: string,
    context: LogContext,
  ): void {
    this.logger.log(level, message, context);
  }

  /**
   * Get the underlying Winston logger instance
   */
  getWinstonLogger(): Logger {
    return this.logger;
  }
}
