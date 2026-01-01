import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { LoggerService } from './logger.service';

@Injectable()
export class HttpLoggingMiddleware implements NestMiddleware {
  constructor(private readonly logger: LoggerService) {}

  use(req: Request, res: Response, next: NextFunction): void {
    const startTime = Date.now();
    const { method, originalUrl, ip } = req;
    const userAgent = req.get('user-agent') || '';
    const correlationId = req.correlationId || '-';

    // Log request start
    this.logger.http(`Incoming ${method} ${originalUrl}`, {
      type: 'request',
      method,
      url: originalUrl,
      ip,
      userAgent,
      correlationId,
    });

    // Capture original end function
    const originalEnd = res.end;
    const logger = this.logger;

    // Override end to log response
    res.end = function (this: Response, ...args: Parameters<Response['end']>) {
      const duration = Date.now() - startTime;
      const { statusCode } = res;
      const contentLength = res.get('content-length') || 0;

      // Determine log level based on status code
      const logLevel = statusCode >= 500 ? 'error' : statusCode >= 400 ? 'warn' : 'http';

      logger.logWithContext(logLevel, `${method} ${originalUrl} ${statusCode} ${duration}ms`, {
        type: 'response',
        method,
        url: originalUrl,
        statusCode,
        duration,
        contentLength: Number(contentLength),
        ip,
        userAgent,
        correlationId,
      });

      return originalEnd.apply(this, args);
    } as typeof res.end;

    next();
  }
}
