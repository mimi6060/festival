import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { BaseException, ErrorResponse, ValidationError } from '../exceptions/base.exception';
import { ErrorCodes, getErrorMessage, ErrorCode } from '../exceptions/error-codes';

/**
 * Flat error response format for API consumers
 * This is the standardized format used across all endpoints
 */
export interface FlatErrorResponse {
  statusCode: number;
  errorCode: ErrorCode;
  message: string;
  timestamp: string;
  path: string;
  requestId?: string;
  details?: Record<string, unknown>;
  validationErrors?: ValidationError[];
}

/**
 * HTTP Exception Filter
 * Handles all HttpException instances and formats the response consistently
 *
 * Output format:
 * {
 *   "statusCode": 400,
 *   "errorCode": "INSUFFICIENT_BALANCE",
 *   "message": "Solde insuffisant pour cette operation",
 *   "timestamp": "2024-01-07T12:00:00.000Z",
 *   "path": "/api/cashless/pay"
 * }
 */
@Catch(HttpException)
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: HttpException, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    const status = exception.getStatus();
    const requestId = (request.headers['x-request-id'] as string) || this.generateRequestId();
    const lang = this.getLanguageFromRequest(request);

    // Handle our custom BaseException
    if (exception instanceof BaseException) {
      const flatResponse = this.formatBaseExceptionToFlat(exception, status, request, requestId, lang);
      this.logError(exception, request, requestId, 'BaseException');
      response.status(status).json(flatResponse);
      return;
    }

    // Handle standard HttpException
    const exceptionResponse = exception.getResponse();
    const flatResponse = this.formatStandardHttpExceptionToFlat(
      exceptionResponse,
      status,
      request,
      requestId,
      lang,
    );

    this.logError(exception, request, requestId, 'HttpException');

    response.status(status).json(flatResponse);
  }

  /**
   * Format BaseException to flat error response
   */
  private formatBaseExceptionToFlat(
    exception: BaseException,
    status: HttpStatus,
    request: Request,
    requestId: string,
    lang: 'fr' | 'en',
  ): FlatErrorResponse {
    const flatResponse: FlatErrorResponse = {
      statusCode: status,
      errorCode: exception.errorCode,
      message: exception.getUserMessage(lang),
      timestamp: new Date().toISOString(),
      path: request.url,
      requestId,
    };

    if (exception.details && Object.keys(exception.details).length > 0) {
      flatResponse.details = exception.details;
    }

    if (exception.validationErrors && exception.validationErrors.length > 0) {
      flatResponse.validationErrors = exception.validationErrors;
    }

    return flatResponse;
  }

  /**
   * Format standard HttpException to flat error response
   */
  private formatStandardHttpExceptionToFlat(
    exceptionResponse: string | object,
    status: HttpStatus,
    request: Request,
    requestId: string,
    lang: 'fr' | 'en',
  ): FlatErrorResponse {
    const errorCode = this.getErrorCodeFromStatus(status);

    let message: string;
    let validationErrors: ValidationError[] | undefined;
    let details: Record<string, unknown> | undefined;

    if (typeof exceptionResponse === 'string') {
      message = exceptionResponse;
    } else if (typeof exceptionResponse === 'object') {
      const resp = exceptionResponse as Record<string, unknown>;
      message = (resp.message as string) || getErrorMessage(errorCode, lang);

      // Handle class-validator errors
      if (Array.isArray(resp.message)) {
        validationErrors = this.parseValidationMessages(resp.message);
        message = getErrorMessage(ErrorCodes.VALIDATION_FAILED, lang);
      }

      // Include additional details if present
      if (resp.error || resp.statusCode) {
        details = {
          error: resp.error,
        };
      }
    } else {
      message = getErrorMessage(errorCode, lang);
    }

    const flatResponse: FlatErrorResponse = {
      statusCode: status,
      errorCode,
      message,
      timestamp: new Date().toISOString(),
      path: request.url,
      requestId,
    };

    if (details && Object.keys(details).length > 0) {
      flatResponse.details = details;
    }

    if (validationErrors && validationErrors.length > 0) {
      flatResponse.validationErrors = validationErrors;
    }

    return flatResponse;
  }

  /**
   * Legacy format method - kept for backward compatibility
   * @deprecated Use formatStandardHttpExceptionToFlat instead
   */
  private formatStandardHttpException(
    exceptionResponse: string | object,
    status: HttpStatus,
    request: Request,
    requestId: string,
  ): ErrorResponse {
    const errorCode = this.getErrorCodeFromStatus(status);
    const lang = this.getLanguageFromRequest(request);

    let message: string;
    let validationErrors: Array<{ field: string; message: string }> | undefined;
    let details: Record<string, unknown> | undefined;

    if (typeof exceptionResponse === 'string') {
      message = exceptionResponse;
    } else if (typeof exceptionResponse === 'object') {
      const resp = exceptionResponse as Record<string, unknown>;
      message = (resp.message as string) || getErrorMessage(errorCode, lang);

      // Handle class-validator errors
      if (Array.isArray(resp.message)) {
        validationErrors = this.parseValidationMessages(resp.message);
        message = getErrorMessage(ErrorCodes.VALIDATION_FAILED, lang);
      }

      // Include additional details if present
      if (resp.error || resp.statusCode) {
        details = {
          error: resp.error,
          statusCode: resp.statusCode,
        };
      }
    } else {
      message = getErrorMessage(errorCode, lang);
    }

    return {
      success: false,
      error: {
        code: errorCode,
        message,
        details,
        validationErrors,
        timestamp: new Date().toISOString(),
        path: request.url,
        requestId,
      },
    };
  }

  private parseValidationMessages(messages: unknown[]): Array<{ field: string; message: string }> {
    return messages.map((msg) => {
      if (typeof msg === 'string') {
        // Try to extract field name from message like "email should not be empty"
        const match = msg.match(/^(\w+)\s/);
        return {
          field: match ? match[1] : 'unknown',
          message: msg,
        };
      }
      return { field: 'unknown', message: String(msg) };
    });
  }

  private getErrorCodeFromStatus(status: HttpStatus): string {
    const statusToErrorCode: Record<number, string> = {
      [HttpStatus.BAD_REQUEST]: ErrorCodes.VALIDATION_FAILED,
      [HttpStatus.UNAUTHORIZED]: ErrorCodes.AUTH_TOKEN_INVALID,
      [HttpStatus.FORBIDDEN]: ErrorCodes.FORBIDDEN_ACCESS,
      [HttpStatus.NOT_FOUND]: ErrorCodes.INTERNAL_ERROR,
      [HttpStatus.CONFLICT]: ErrorCodes.INTERNAL_ERROR,
      [HttpStatus.TOO_MANY_REQUESTS]: ErrorCodes.RATE_LIMIT_EXCEEDED,
      [HttpStatus.INTERNAL_SERVER_ERROR]: ErrorCodes.INTERNAL_ERROR,
      [HttpStatus.SERVICE_UNAVAILABLE]: ErrorCodes.SERVICE_UNAVAILABLE,
    };

    return statusToErrorCode[status] || ErrorCodes.INTERNAL_ERROR;
  }

  private getLanguageFromRequest(request: Request): 'fr' | 'en' {
    const acceptLanguage = request.headers['accept-language'] || '';
    return acceptLanguage.toLowerCase().startsWith('en') ? 'en' : 'fr';
  }

  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }

  private logError(
    exception: HttpException,
    request: Request,
    requestId: string,
    exceptionType: string,
  ): void {
    const status = exception.getStatus();
    const logContext = {
      requestId,
      type: exceptionType,
      status,
      method: request.method,
      url: request.url,
      userAgent: request.headers['user-agent'],
      ip: request.ip || request.connection?.remoteAddress,
      userId: (request as Request & { user?: { id?: string } }).user?.id,
    };

    // Log as error for 5xx, warn for 4xx
    if (status >= 500) {
      this.logger.error(
        `[${requestId}] ${request.method} ${request.url} - ${status}`,
        exception.stack,
        JSON.stringify(logContext),
      );
    } else if (status >= 400) {
      this.logger.warn(
        `[${requestId}] ${request.method} ${request.url} - ${status}: ${exception.message}`,
        JSON.stringify(logContext),
      );
    }
  }
}
