import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { Prisma } from '@prisma/client';
import { ErrorCodes, getErrorMessage, ErrorCode } from '../exceptions/error-codes';

/**
 * Flat error response format for API consumers
 * This is the standardized format used across all endpoints
 */
interface FlatErrorResponse {
  statusCode: number;
  errorCode: ErrorCode;
  message: string;
  timestamp: string;
  path: string;
  requestId?: string;
  details?: Record<string, unknown>;
}

/**
 * Prisma Error Codes
 */
const PrismaErrorCodes = {
  UNIQUE_CONSTRAINT: 'P2002',
  FOREIGN_KEY_CONSTRAINT: 'P2003',
  RECORD_NOT_FOUND: 'P2025',
  REQUIRED_FIELD_MISSING: 'P2011',
  CONNECTION_ERROR: 'P1001',
  TIMEOUT: 'P1008',
  TOO_MANY_CONNECTIONS: 'P1010',
} as const;

/**
 * All Exceptions Filter
 * Catches all unhandled exceptions (non-HTTP) and formats them consistently
 * Handles Prisma errors, TypeError, RangeError, etc.
 *
 * Output format:
 * {
 *   "statusCode": 500,
 *   "errorCode": "ERR_1000",
 *   "message": "Une erreur interne est survenue.",
 *   "timestamp": "2024-01-07T12:00:00.000Z",
 *   "path": "/api/endpoint"
 * }
 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    const requestId = (request.headers['x-request-id'] as string) || this.generateRequestId();

    // Handle Prisma errors
    if (this.isPrismaError(exception)) {
      const { status, errorResponse } = this.handlePrismaError(exception, request, requestId);
      this.logError(exception, request, requestId, 'PrismaError');
      response.status(status).json(errorResponse);
      return;
    }

    // Handle standard JavaScript errors
    if (exception instanceof Error) {
      const { status, errorResponse } = this.handleStandardError(exception, request, requestId);
      this.logError(exception, request, requestId, exception.constructor.name);
      response.status(status).json(errorResponse);
      return;
    }

    // Handle unknown errors
    const errorResponse = this.handleUnknownError(exception, request, requestId);
    this.logError(new Error(String(exception)), request, requestId, 'UnknownError');
    response.status(HttpStatus.INTERNAL_SERVER_ERROR).json(errorResponse);
  }

  private isPrismaError(exception: unknown): exception is Prisma.PrismaClientKnownRequestError | Prisma.PrismaClientUnknownRequestError | Prisma.PrismaClientInitializationError {
    return (
      exception instanceof Prisma.PrismaClientKnownRequestError ||
      exception instanceof Prisma.PrismaClientUnknownRequestError ||
      exception instanceof Prisma.PrismaClientInitializationError
    );
  }

  private handlePrismaError(
    exception: Prisma.PrismaClientKnownRequestError | Prisma.PrismaClientUnknownRequestError | Prisma.PrismaClientInitializationError,
    request: Request,
    requestId: string,
  ): { status: HttpStatus; errorResponse: FlatErrorResponse } {
    const lang = this.getLanguageFromRequest(request);
    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let errorCode: ErrorCode = ErrorCodes.INTERNAL_ERROR;
    let message = getErrorMessage(ErrorCodes.INTERNAL_ERROR, lang);
    let details: Record<string, unknown> = {};

    if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      switch (exception.code) {
        case PrismaErrorCodes.UNIQUE_CONSTRAINT:
          status = HttpStatus.CONFLICT;
          errorCode = this.getConflictErrorCode(exception.meta);
          message = getErrorMessage(errorCode, lang);
          details = { fields: exception.meta?.target };
          break;

        case PrismaErrorCodes.FOREIGN_KEY_CONSTRAINT:
          status = HttpStatus.BAD_REQUEST;
          message = lang === 'fr'
            ? 'Reference a une ressource inexistante.'
            : 'Reference to non-existent resource.';
          details = { field: exception.meta?.field_name };
          break;

        case PrismaErrorCodes.RECORD_NOT_FOUND:
          status = HttpStatus.NOT_FOUND;
          message = lang === 'fr'
            ? 'Ressource non trouvee.'
            : 'Resource not found.';
          break;

        case PrismaErrorCodes.REQUIRED_FIELD_MISSING:
          status = HttpStatus.BAD_REQUEST;
          errorCode = ErrorCodes.VALIDATION_FAILED;
          message = lang === 'fr'
            ? 'Champ obligatoire manquant.'
            : 'Required field missing.';
          break;

        case PrismaErrorCodes.CONNECTION_ERROR:
        case PrismaErrorCodes.TIMEOUT:
        case PrismaErrorCodes.TOO_MANY_CONNECTIONS:
          status = HttpStatus.SERVICE_UNAVAILABLE;
          errorCode = ErrorCodes.SERVICE_UNAVAILABLE;
          message = getErrorMessage(ErrorCodes.SERVICE_UNAVAILABLE, lang);
          details = { prismaCode: exception.code };
          break;

        default:
          details = { prismaCode: exception.code };
      }
    } else if (exception instanceof Prisma.PrismaClientInitializationError) {
      status = HttpStatus.SERVICE_UNAVAILABLE;
      errorCode = ErrorCodes.SERVICE_UNAVAILABLE;
      message = lang === 'fr'
        ? 'Base de donnees indisponible.'
        : 'Database unavailable.';
    }

    const flatResponse: FlatErrorResponse = {
      statusCode: status,
      errorCode,
      message,
      timestamp: new Date().toISOString(),
      path: request.url,
      requestId,
    };

    if (Object.keys(details).length > 0) {
      flatResponse.details = details;
    }

    return {
      status,
      errorResponse: flatResponse,
    };
  }

  private getConflictErrorCode(meta?: Record<string, unknown>): ErrorCode {
    const target = meta?.target as string[] | undefined;
    if (!target) return ErrorCodes.INTERNAL_ERROR;

    // Map unique constraint fields to specific error codes
    if (target.includes('email')) return ErrorCodes.USER_EMAIL_EXISTS;
    if (target.includes('phone')) return ErrorCodes.USER_PHONE_EXISTS;
    if (target.includes('slug')) return ErrorCodes.FESTIVAL_SLUG_EXISTS;
    if (target.includes('nfcTagId')) return ErrorCodes.CASHLESS_NFC_TAG_EXISTS;

    return ErrorCodes.INTERNAL_ERROR;
  }

  private handleStandardError(
    exception: Error,
    request: Request,
    requestId: string,
  ): { status: HttpStatus; errorResponse: FlatErrorResponse } {
    const lang = this.getLanguageFromRequest(request);
    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let errorCode: ErrorCode = ErrorCodes.INTERNAL_ERROR;
    let message = getErrorMessage(ErrorCodes.INTERNAL_ERROR, lang);
    const details: Record<string, unknown> = {};

    // Handle specific error types
    if (exception instanceof TypeError) {
      status = HttpStatus.INTERNAL_SERVER_ERROR;
      details.errorType = 'TypeError';
    } else if (exception instanceof RangeError) {
      status = HttpStatus.BAD_REQUEST;
      errorCode = ErrorCodes.VALIDATION_FAILED;
      message = lang === 'fr'
        ? 'Valeur hors limites.'
        : 'Value out of range.';
      details.errorType = 'RangeError';
    } else if (exception instanceof SyntaxError) {
      status = HttpStatus.BAD_REQUEST;
      errorCode = ErrorCodes.VALIDATION_FAILED;
      message = lang === 'fr'
        ? 'Syntaxe invalide dans la requete.'
        : 'Invalid syntax in request.';
      details.errorType = 'SyntaxError';
    }

    // Include error name in development
    if (process.env.NODE_ENV === 'development') {
      details.errorName = exception.name;
      details.errorMessage = exception.message;
    }

    const flatResponse: FlatErrorResponse = {
      statusCode: status,
      errorCode,
      message,
      timestamp: new Date().toISOString(),
      path: request.url,
      requestId,
    };

    if (Object.keys(details).length > 0) {
      flatResponse.details = details;
    }

    return {
      status,
      errorResponse: flatResponse,
    };
  }

  private handleUnknownError(
    exception: unknown,
    request: Request,
    requestId: string,
  ): FlatErrorResponse {
    const lang = this.getLanguageFromRequest(request);

    const flatResponse: FlatErrorResponse = {
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      errorCode: ErrorCodes.INTERNAL_ERROR,
      message: getErrorMessage(ErrorCodes.INTERNAL_ERROR, lang),
      timestamp: new Date().toISOString(),
      path: request.url,
      requestId,
    };

    if (process.env.NODE_ENV === 'development') {
      flatResponse.details = { raw: String(exception) };
    }

    return flatResponse;
  }

  private getLanguageFromRequest(request: Request): 'fr' | 'en' {
    const acceptLanguage = request.headers['accept-language'] || '';
    return acceptLanguage.toLowerCase().startsWith('en') ? 'en' : 'fr';
  }

  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }

  private logError(
    exception: Error,
    request: Request,
    requestId: string,
    errorType: string,
  ): void {
    const logContext = {
      requestId,
      type: errorType,
      method: request.method,
      url: request.url,
      userAgent: request.headers['user-agent'],
      ip: request.ip || request.connection?.remoteAddress,
      userId: (request as Request & { user?: { id?: string } }).user?.id,
      body: this.sanitizeBody(request.body),
      query: request.query,
    };

    this.logger.error(
      `[${requestId}] ${request.method} ${request.url} - Unhandled ${errorType}: ${exception.message}`,
      exception.stack,
      JSON.stringify(logContext),
    );
  }

  private sanitizeBody(body: unknown): unknown {
    if (!body || typeof body !== 'object') return body;

    const sanitized = { ...body as Record<string, unknown> };
    const sensitiveFields = ['password', 'token', 'secret', 'apiKey', 'cardNumber', 'cvv', 'pin'];

    for (const field of sensitiveFields) {
      if (sanitized[field]) {
        sanitized[field] = '[REDACTED]';
      }
    }

    return sanitized;
  }
}
