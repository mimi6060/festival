import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  BadRequestException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { ErrorResponse, ValidationError } from '../exceptions/base.exception';
import { ErrorCodes, getErrorMessage } from '../exceptions/error-codes';

/**
 * Validation Exception Filter
 * Specialized filter for handling class-validator validation errors
 * Formats validation errors in a user-friendly way
 */
@Catch(BadRequestException)
export class ValidationExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(ValidationExceptionFilter.name);

  catch(exception: BadRequestException, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    const requestId = (request.headers['x-request-id'] as string) || this.generateRequestId();
    const lang = this.getLanguageFromRequest(request);

    const exceptionResponse = exception.getResponse();

    // Check if this is a validation error
    if (this.isValidationError(exceptionResponse)) {
      const validationErrors = this.extractValidationErrors(exceptionResponse);
      const errorResponse = this.formatValidationErrorResponse(
        validationErrors,
        request,
        requestId,
        lang,
      );

      this.logValidationError(validationErrors, request, requestId);

      response.status(HttpStatus.BAD_REQUEST).json(errorResponse);
      return;
    }

    // Not a validation error, let other filters handle it
    const errorResponse = this.formatGenericBadRequest(
      exceptionResponse,
      request,
      requestId,
      lang,
    );

    this.logger.warn(
      `[${requestId}] ${request.method} ${request.url} - Bad Request: ${JSON.stringify(exceptionResponse)}`,
    );

    response.status(HttpStatus.BAD_REQUEST).json(errorResponse);
  }

  private isValidationError(response: unknown): boolean {
    if (typeof response !== 'object' || response === null) return false;

    const resp = response as Record<string, unknown>;

    // Check for class-validator style errors (array of messages)
    if (Array.isArray(resp.message)) {
      return true;
    }

    // Check for our ValidationException style
    if (resp.validationErrors && Array.isArray(resp.validationErrors)) {
      return true;
    }

    return false;
  }

  private extractValidationErrors(response: unknown): ValidationError[] {
    const resp = response as Record<string, unknown>;
    const errors: ValidationError[] = [];

    // Handle class-validator format (array of constraint messages)
    if (Array.isArray(resp.message)) {
      for (const msg of resp.message) {
        if (typeof msg === 'string') {
          errors.push(this.parseConstraintMessage(msg));
        } else if (typeof msg === 'object' && msg !== null) {
          // Nested validation object
          const nestedMsg = msg as { property?: string; constraints?: Record<string, string>; children?: unknown[] };
          if (nestedMsg.constraints) {
            for (const constraint of Object.values(nestedMsg.constraints)) {
              errors.push({
                field: nestedMsg.property || 'unknown',
                message: constraint,
              });
            }
          }
          // Handle nested children (for nested DTOs)
          if (nestedMsg.children && Array.isArray(nestedMsg.children)) {
            errors.push(...this.extractNestedErrors(nestedMsg.children, nestedMsg.property || ''));
          }
        }
      }
    }

    // Handle our ValidationException format
    if (resp.validationErrors && Array.isArray(resp.validationErrors)) {
      errors.push(...(resp.validationErrors as ValidationError[]));
    }

    return errors;
  }

  private extractNestedErrors(children: unknown[], parentPath: string): ValidationError[] {
    const errors: ValidationError[] = [];

    for (const child of children) {
      if (typeof child === 'object' && child !== null) {
        const nestedChild = child as { property?: string; constraints?: Record<string, string>; children?: unknown[] };
        const fieldPath = parentPath ? `${parentPath}.${nestedChild.property}` : nestedChild.property || 'unknown';

        if (nestedChild.constraints) {
          for (const constraint of Object.values(nestedChild.constraints)) {
            errors.push({
              field: fieldPath,
              message: constraint,
            });
          }
        }

        if (nestedChild.children && Array.isArray(nestedChild.children)) {
          errors.push(...this.extractNestedErrors(nestedChild.children, fieldPath));
        }
      }
    }

    return errors;
  }

  private parseConstraintMessage(message: string): ValidationError {
    // Try to extract field name from common patterns
    // Pattern 1: "email must be an email" -> field: email
    // Pattern 2: "password must be longer than 8 characters" -> field: password
    const match = message.match(/^(\w+)\s+(.*)/);
    if (match) {
      return {
        field: match[1],
        message: message,
      };
    }

    return {
      field: 'unknown',
      message: message,
    };
  }

  private formatValidationErrorResponse(
    validationErrors: ValidationError[],
    request: Request,
    requestId: string,
    lang: 'fr' | 'en',
  ): ErrorResponse {
    // Group errors by field
    const errorsByField = this.groupErrorsByField(validationErrors);

    // Translate common validation messages
    const translatedErrors = validationErrors.map((error) => ({
      ...error,
      message: this.translateValidationMessage(error.message, lang),
    }));

    return {
      success: false,
      error: {
        code: ErrorCodes.VALIDATION_FAILED,
        message: getErrorMessage(ErrorCodes.VALIDATION_FAILED, lang),
        details: {
          fieldCount: Object.keys(errorsByField).length,
          errorCount: validationErrors.length,
        },
        validationErrors: translatedErrors,
        timestamp: new Date().toISOString(),
        path: request.url,
        requestId,
      },
    };
  }

  private groupErrorsByField(errors: ValidationError[]): Record<string, ValidationError[]> {
    const grouped: Record<string, ValidationError[]> = {};

    for (const error of errors) {
      if (!grouped[error.field]) {
        grouped[error.field] = [];
      }
      grouped[error.field].push(error);
    }

    return grouped;
  }

  private translateValidationMessage(message: string, lang: 'fr' | 'en'): string {
    if (lang === 'en') return message;

    // Common validation message translations
    const translations: Record<string, string> = {
      'must be an email': 'doit etre une adresse email valide',
      'must be a string': 'doit etre une chaine de caracteres',
      'must be a number': 'doit etre un nombre',
      'must be a boolean': 'doit etre un booleen',
      'must be an array': 'doit etre un tableau',
      'must be an object': 'doit etre un objet',
      'must be a UUID': 'doit etre un UUID valide',
      'must be a valid enum value': 'doit etre une valeur valide',
      'should not be empty': 'ne doit pas etre vide',
      'must not be empty': 'ne doit pas etre vide',
      'must be longer than': 'doit contenir au moins',
      'must be shorter than': 'doit contenir au maximum',
      'must be at least': 'doit etre au moins',
      'must not be greater than': 'ne doit pas depasser',
      'must be a positive number': 'doit etre un nombre positif',
      'must be a negative number': 'doit etre un nombre negatif',
      'must be an integer': 'doit etre un nombre entier',
      'must match': 'doit correspondre au format',
      'must be a valid ISO 8601 date string': 'doit etre une date valide',
      'must be a valid phone number': 'doit etre un numero de telephone valide',
      'must be a URL address': 'doit etre une URL valide',
    };

    let translated = message;
    for (const [en, fr] of Object.entries(translations)) {
      if (message.toLowerCase().includes(en.toLowerCase())) {
        translated = translated.replace(new RegExp(en, 'gi'), fr);
      }
    }

    return translated;
  }

  private formatGenericBadRequest(
    response: unknown,
    request: Request,
    requestId: string,
    lang: 'fr' | 'en',
  ): ErrorResponse {
    let message: string;

    if (typeof response === 'string') {
      message = response;
    } else if (typeof response === 'object' && response !== null) {
      const resp = response as Record<string, unknown>;
      message = (resp.message as string) || getErrorMessage(ErrorCodes.VALIDATION_FAILED, lang);
    } else {
      message = getErrorMessage(ErrorCodes.VALIDATION_FAILED, lang);
    }

    return {
      success: false,
      error: {
        code: ErrorCodes.VALIDATION_FAILED,
        message,
        timestamp: new Date().toISOString(),
        path: request.url,
        requestId,
      },
    };
  }

  private getLanguageFromRequest(request: Request): 'fr' | 'en' {
    const acceptLanguage = request.headers['accept-language'] || '';
    return acceptLanguage.toLowerCase().startsWith('en') ? 'en' : 'fr';
  }

  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }

  private logValidationError(
    errors: ValidationError[],
    request: Request,
    requestId: string,
  ): void {
    const logContext = {
      requestId,
      method: request.method,
      url: request.url,
      errors: errors.map((e) => ({ field: e.field, message: e.message })),
      errorCount: errors.length,
      userAgent: request.headers['user-agent'],
      ip: request.ip || request.connection?.remoteAddress,
    };

    this.logger.warn(
      `[${requestId}] ${request.method} ${request.url} - Validation failed: ${errors.length} error(s)`,
      JSON.stringify(logContext),
    );
  }
}
