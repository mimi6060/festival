import { HttpException, HttpStatus } from '@nestjs/common';
import { ErrorCode, ErrorCodes, getErrorMessage } from './error-codes';

/**
 * Standard error response format
 */
export interface ErrorResponse {
  success: false;
  error: {
    code: ErrorCode;
    message: string;
    details?: Record<string, unknown>;
    validationErrors?: ValidationError[];
    timestamp: string;
    path?: string;
    requestId?: string;
  };
}

export interface ValidationError {
  field: string;
  message: string;
  value?: unknown;
}

/**
 * Base exception class for all custom exceptions
 */
export class BaseException extends HttpException {
  public readonly errorCode: ErrorCode;
  public readonly technicalMessage: string;
  public readonly details?: Record<string, unknown>;
  public readonly validationErrors?: ValidationError[];

  constructor(
    errorCode: ErrorCode,
    technicalMessage: string,
    statusCode: HttpStatus,
    details?: Record<string, unknown>,
    validationErrors?: ValidationError[],
  ) {
    const userMessage = getErrorMessage(errorCode, 'fr');
    super(userMessage, statusCode);
    this.errorCode = errorCode;
    this.technicalMessage = technicalMessage;
    this.details = details;
    this.validationErrors = validationErrors;
  }

  /**
   * Get localized user message
   */
  getUserMessage(lang: 'fr' | 'en' = 'fr'): string {
    return getErrorMessage(this.errorCode, lang);
  }

  /**
   * Build error response
   */
  toResponse(path?: string, requestId?: string): ErrorResponse {
    return {
      success: false,
      error: {
        code: this.errorCode,
        message: this.message,
        details: this.details,
        validationErrors: this.validationErrors,
        timestamp: new Date().toISOString(),
        path,
        requestId,
      },
    };
  }
}

// ============================================
// VALIDATION ERROR (400)
// ============================================
export class ValidationException extends BaseException {
  constructor(
    technicalMessage: string,
    validationErrors?: ValidationError[],
    details?: Record<string, unknown>,
  ) {
    super(
      ErrorCodes.VALIDATION_FAILED,
      technicalMessage,
      HttpStatus.BAD_REQUEST,
      details,
      validationErrors,
    );
  }

  static fromClassValidator(errors: { property: string; constraints?: Record<string, string> }[]): ValidationException {
    const validationErrors: ValidationError[] = errors.flatMap((error) => {
      if (error.constraints) {
        return Object.values(error.constraints).map((message) => ({
          field: error.property,
          message,
        }));
      }
      return [];
    });

    return new ValidationException('Validation failed', validationErrors);
  }
}

// ============================================
// AUTHENTICATION ERROR (401)
// ============================================
export class AuthenticationException extends BaseException {
  constructor(
    errorCode: ErrorCode = ErrorCodes.AUTH_TOKEN_INVALID,
    technicalMessage = 'Authentication failed',
    details?: Record<string, unknown>,
  ) {
    super(errorCode, technicalMessage, HttpStatus.UNAUTHORIZED, details);
  }

  static invalidCredentials(): AuthenticationException {
    return new AuthenticationException(
      ErrorCodes.AUTH_INVALID_CREDENTIALS,
      'Invalid email or password provided',
    );
  }

  static tokenExpired(): AuthenticationException {
    return new AuthenticationException(
      ErrorCodes.AUTH_TOKEN_EXPIRED,
      'JWT token has expired',
    );
  }

  static tokenInvalid(): AuthenticationException {
    return new AuthenticationException(
      ErrorCodes.AUTH_TOKEN_INVALID,
      'JWT token is invalid or malformed',
    );
  }

  static tokenMissing(): AuthenticationException {
    return new AuthenticationException(
      ErrorCodes.AUTH_TOKEN_MISSING,
      'Authorization header is missing',
    );
  }

  static refreshTokenExpired(): AuthenticationException {
    return new AuthenticationException(
      ErrorCodes.AUTH_REFRESH_TOKEN_EXPIRED,
      'Refresh token has expired',
    );
  }

  static emailNotVerified(): AuthenticationException {
    return new AuthenticationException(
      ErrorCodes.AUTH_EMAIL_NOT_VERIFIED,
      'Email address has not been verified',
    );
  }

  static accountDisabled(): AuthenticationException {
    return new AuthenticationException(
      ErrorCodes.AUTH_ACCOUNT_DISABLED,
      'User account is disabled',
    );
  }

  static accountLocked(): AuthenticationException {
    return new AuthenticationException(
      ErrorCodes.AUTH_ACCOUNT_LOCKED,
      'User account is temporarily locked',
    );
  }
}

// ============================================
// FORBIDDEN ERROR (403)
// ============================================
export class ForbiddenException extends BaseException {
  constructor(
    errorCode: ErrorCode = ErrorCodes.FORBIDDEN_ACCESS,
    technicalMessage = 'Access forbidden',
    details?: Record<string, unknown>,
  ) {
    super(errorCode, technicalMessage, HttpStatus.FORBIDDEN, details);
  }

  static insufficientRole(requiredRole: string, currentRole: string): ForbiddenException {
    return new ForbiddenException(
      ErrorCodes.FORBIDDEN_ROLE,
      `Required role: ${requiredRole}, Current role: ${currentRole}`,
      { requiredRole, currentRole },
    );
  }

  static resourceForbidden(resource: string): ForbiddenException {
    return new ForbiddenException(
      ErrorCodes.FORBIDDEN_RESOURCE,
      `Access to resource forbidden: ${resource}`,
      { resource },
    );
  }

  static tenantMismatch(tenantId: string): ForbiddenException {
    return new ForbiddenException(
      ErrorCodes.FORBIDDEN_TENANT,
      `User does not belong to tenant: ${tenantId}`,
      { tenantId },
    );
  }
}

// ============================================
// NOT FOUND ERROR (404)
// ============================================
export class NotFoundException extends BaseException {
  constructor(
    errorCode: ErrorCode,
    technicalMessage: string,
    details?: Record<string, unknown>,
  ) {
    super(errorCode, technicalMessage, HttpStatus.NOT_FOUND, details);
  }

  static user(userId: string): NotFoundException {
    return new NotFoundException(
      ErrorCodes.USER_NOT_FOUND,
      `User not found: ${userId}`,
      { userId },
    );
  }

  static festival(festivalId: string): NotFoundException {
    return new NotFoundException(
      ErrorCodes.FESTIVAL_NOT_FOUND,
      `Festival not found: ${festivalId}`,
      { festivalId },
    );
  }

  static ticket(ticketId: string): NotFoundException {
    return new NotFoundException(
      ErrorCodes.TICKET_NOT_FOUND,
      `Ticket not found: ${ticketId}`,
      { ticketId },
    );
  }

  static ticketCategory(categoryId: string): NotFoundException {
    return new NotFoundException(
      ErrorCodes.TICKET_CATEGORY_NOT_FOUND,
      `Ticket category not found: ${categoryId}`,
      { categoryId },
    );
  }

  static payment(paymentId: string): NotFoundException {
    return new NotFoundException(
      ErrorCodes.PAYMENT_NOT_FOUND,
      `Payment not found: ${paymentId}`,
      { paymentId },
    );
  }

  static cashless(accountId: string): NotFoundException {
    return new NotFoundException(
      ErrorCodes.CASHLESS_NOT_FOUND,
      `Cashless account not found: ${accountId}`,
      { accountId },
    );
  }

  static vendor(vendorId: string): NotFoundException {
    return new NotFoundException(
      ErrorCodes.VENDOR_NOT_FOUND,
      `Vendor not found: ${vendorId}`,
      { vendorId },
    );
  }

  static zone(zoneId: string): NotFoundException {
    return new NotFoundException(
      ErrorCodes.ZONE_NOT_FOUND,
      `Zone not found: ${zoneId}`,
      { zoneId },
    );
  }

  static file(fileId: string): NotFoundException {
    return new NotFoundException(
      ErrorCodes.FILE_NOT_FOUND,
      `File not found: ${fileId}`,
      { fileId },
    );
  }
}

// ============================================
// CONFLICT ERROR (409)
// ============================================
export class ConflictException extends BaseException {
  constructor(
    errorCode: ErrorCode,
    technicalMessage: string,
    details?: Record<string, unknown>,
  ) {
    super(errorCode, technicalMessage, HttpStatus.CONFLICT, details);
  }

  static emailExists(email: string): ConflictException {
    return new ConflictException(
      ErrorCodes.USER_EMAIL_EXISTS,
      `Email already exists: ${email}`,
      { email },
    );
  }

  static phoneExists(phone: string): ConflictException {
    return new ConflictException(
      ErrorCodes.USER_PHONE_EXISTS,
      `Phone number already exists: ${phone}`,
      { phone },
    );
  }

  static festivalSlugExists(slug: string): ConflictException {
    return new ConflictException(
      ErrorCodes.FESTIVAL_SLUG_EXISTS,
      `Festival slug already exists: ${slug}`,
      { slug },
    );
  }

  static paymentDuplicate(paymentId: string): ConflictException {
    return new ConflictException(
      ErrorCodes.PAYMENT_DUPLICATE,
      `Duplicate payment: ${paymentId}`,
      { paymentId },
    );
  }

  static nfcTagExists(nfcTag: string): ConflictException {
    return new ConflictException(
      ErrorCodes.CASHLESS_NFC_TAG_EXISTS,
      `NFC tag already linked: ${nfcTag}`,
      { nfcTag },
    );
  }
}

// ============================================
// RATE LIMIT ERROR (429)
// ============================================
export class RateLimitException extends BaseException {
  public readonly retryAfter: number;

  constructor(retryAfter: number, details?: Record<string, unknown>) {
    super(
      ErrorCodes.RATE_LIMIT_EXCEEDED,
      `Rate limit exceeded. Retry after ${retryAfter} seconds`,
      HttpStatus.TOO_MANY_REQUESTS,
      { ...details, retryAfter },
    );
    this.retryAfter = retryAfter;
  }
}

// ============================================
// INTERNAL ERROR (500)
// ============================================
export class InternalException extends BaseException {
  constructor(
    technicalMessage: string,
    details?: Record<string, unknown>,
  ) {
    super(
      ErrorCodes.INTERNAL_ERROR,
      technicalMessage,
      HttpStatus.INTERNAL_SERVER_ERROR,
      details,
    );
  }
}

// ============================================
// SERVICE UNAVAILABLE (503)
// ============================================
export class ServiceUnavailableException extends BaseException {
  constructor(
    serviceName: string,
    details?: Record<string, unknown>,
  ) {
    super(
      ErrorCodes.SERVICE_UNAVAILABLE,
      `Service unavailable: ${serviceName}`,
      HttpStatus.SERVICE_UNAVAILABLE,
      { serviceName, ...details },
    );
  }
}
