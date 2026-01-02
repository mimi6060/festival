import { LoggerService as NestLoggerService } from '@nestjs/common';
import { createLogger, format, transports, Logger } from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';

/**
 * Winston logger adapter for NestJS bootstrap
 * This is used before the DI container is available
 */
export class WinstonNestLogger implements NestLoggerService {
  private readonly logger: Logger;

  constructor() {
    const logLevel = process.env.LOG_LEVEL || 'info';
    const logDir = process.env.LOG_DIR || 'logs';
    const isProduction = process.env.NODE_ENV === 'production';

    // Format JSON structuré
    const structuredFormat = format.combine(
      format.timestamp({ format: 'YYYY-MM-DDTHH:mm:ss.SSSZ' }),
      format.errors({ stack: true }),
      format((info) => ({
        ...info,
        service: 'api',
        correlationId: '-',
      }))(),
      format.json(),
    );

    // Format console pour le développement
    const consoleFormat = format.combine(
      format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
      format.errors({ stack: true }),
      format.colorize({ all: true }),
      format.printf(({ timestamp, level, message, context, stack }) => {
        const contextStr = context ? `[${context}]` : '';
        const stackStr = stack ? `\n${stack}` : '';
        return `${timestamp} ${level} ${contextStr} ${message}${stackStr}`;
      }),
    );

    // Configuration des transports
    const loggerTransports: (transports.ConsoleTransportInstance | DailyRotateFile)[] = [];

    if (!isProduction) {
      loggerTransports.push(
        new transports.Console({
          format: consoleFormat,
        }),
      );
    } else {
      loggerTransports.push(
        new transports.Console({
          format: structuredFormat,
        }),
      );
    }

    if (isProduction || process.env.LOG_TO_FILE === 'true') {
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
      transports: loggerTransports,
      exitOnError: false,
    });
  }

  log(message: string, context?: string): void {
    this.logger.info(message, { context });
  }

  error(message: string, trace?: string, context?: string): void {
    this.logger.error(message, { stack: trace, context });
  }

  warn(message: string, context?: string): void {
    this.logger.warn(message, { context });
  }

  debug(message: string, context?: string): void {
    this.logger.debug(message, { context });
  }

  verbose(message: string, context?: string): void {
    this.logger.debug(message, { context });
  }
}
