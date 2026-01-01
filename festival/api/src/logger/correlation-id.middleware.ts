import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { asyncLocalStorage, LoggerService } from './logger.service';

// Extend Express Request to include correlation ID
declare global {
  namespace Express {
    interface Request {
      correlationId?: string;
    }
  }
}

@Injectable()
export class CorrelationIdMiddleware implements NestMiddleware {
  constructor(private readonly logger: LoggerService) {}

  use(req: Request, res: Response, next: NextFunction): void {
    // Get correlation ID from header or generate a new one
    const correlationId =
      (req.headers['x-correlation-id'] as string) ||
      (req.headers['x-request-id'] as string) ||
      uuidv4();

    // Attach to request object
    req.correlationId = correlationId;

    // Set response header
    res.setHeader('X-Correlation-ID', correlationId);

    // Run the rest of the request within the async context
    const store = new Map<string, unknown>();
    store.set('correlationId', correlationId);

    asyncLocalStorage.run(store, () => {
      next();
    });
  }
}
