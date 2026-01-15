import { HttpException, HttpStatus, Logger, BadRequestException, UnauthorizedException, ForbiddenException, NotFoundException as NestNotFoundException, ConflictException as NestConflictException, ArgumentsHost } from '@nestjs/common';
import { HttpExceptionFilter, FlatErrorResponse } from './http-exception.filter';
import { ValidationException, AuthenticationException, ForbiddenException as CustomForbiddenException, NotFoundException, ConflictException } from '../exceptions/base.exception';
import { ErrorCodes } from '../exceptions/error-codes';

describe('HttpExceptionFilter', () => {
  let filter: HttpExceptionFilter;
  let mockJson: jest.Mock;
  let mockStatus: jest.Mock;
  let mockResponse: { status: jest.Mock; json: jest.Mock };
  let mockRequest: Record<string, unknown>;
  let mockArgumentsHost: ArgumentsHost;

  beforeEach(() => {
    filter = new HttpExceptionFilter();
    mockJson = jest.fn();
    mockStatus = jest.fn().mockReturnValue({ json: mockJson });
    mockResponse = { status: mockStatus, json: mockJson };
    mockRequest = {
      url: '/api/test',
      method: 'POST',
      ip: '127.0.0.1',
      connection: { remoteAddress: '127.0.0.1' },
      headers: {
        'user-agent': 'Jest Test Agent',
        'accept-language': 'fr',
      },
    };
    mockArgumentsHost = {
      switchToHttp: () => ({
        getRequest: () => mockRequest,
        getResponse: () => mockResponse,
      }),
    } as unknown as ArgumentsHost;

    // Mock logger to prevent console output
    jest.spyOn(Logger.prototype, 'log').mockImplementation();
    jest.spyOn(Logger.prototype, 'warn').mockImplementation();
    jest.spyOn(Logger.prototype, 'error').mockImplementation();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('BaseException handling', () => {
    it('should format BaseException with flat response', () => {
      const exception = new ValidationException('Validation failed');

      filter.catch(exception, mockArgumentsHost);

      expect(mockStatus).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
      expect(mockJson).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: HttpStatus.BAD_REQUEST,
          errorCode: ErrorCodes.VALIDATION_FAILED,
          message: expect.any(String),
          timestamp: expect.any(String),
          path: '/api/test',
          requestId: expect.any(String),
        }),
      );
    });

    it('should include details when present in BaseException', () => {
      const exception = new NotFoundException(
        ErrorCodes.USER_NOT_FOUND,
        'User not found',
        { userId: '123' },
      );

      filter.catch(exception, mockArgumentsHost);

      expect(mockJson).toHaveBeenCalledWith(
        expect.objectContaining({
          details: { userId: '123' },
        }),
      );
    });

    it('should include validation errors when present', () => {
      const validationErrors = [
        { field: 'email', message: 'must be a valid email' },
        { field: 'password', message: 'must be at least 8 characters' },
      ];
      const exception = new ValidationException(
        'Validation failed',
        validationErrors,
      );

      filter.catch(exception, mockArgumentsHost);

      expect(mockJson).toHaveBeenCalledWith(
        expect.objectContaining({
          validationErrors,
        }),
      );
    });

    it('should not include details when empty', () => {
      const exception = new ValidationException('Validation failed');

      filter.catch(exception, mockArgumentsHost);

      const response = mockJson.mock.calls[0][0] as FlatErrorResponse;
      expect(response.details).toBeUndefined();
    });

    it('should handle AuthenticationException', () => {
      const exception = AuthenticationException.invalidCredentials();

      filter.catch(exception, mockArgumentsHost);

      expect(mockStatus).toHaveBeenCalledWith(HttpStatus.UNAUTHORIZED);
      expect(mockJson).toHaveBeenCalledWith(
        expect.objectContaining({
          errorCode: ErrorCodes.AUTH_INVALID_CREDENTIALS,
        }),
      );
    });

    it('should handle ForbiddenException', () => {
      const exception = CustomForbiddenException.insufficientRole('ADMIN', 'USER');

      filter.catch(exception, mockArgumentsHost);

      expect(mockStatus).toHaveBeenCalledWith(HttpStatus.FORBIDDEN);
      expect(mockJson).toHaveBeenCalledWith(
        expect.objectContaining({
          errorCode: ErrorCodes.FORBIDDEN_ROLE,
          details: { requiredRole: 'ADMIN', currentRole: 'USER' },
        }),
      );
    });

    it('should handle ConflictException', () => {
      const exception = ConflictException.emailExists('test@example.com');

      filter.catch(exception, mockArgumentsHost);

      expect(mockStatus).toHaveBeenCalledWith(HttpStatus.CONFLICT);
      expect(mockJson).toHaveBeenCalledWith(
        expect.objectContaining({
          errorCode: ErrorCodes.USER_EMAIL_EXISTS,
        }),
      );
    });
  });

  describe('Standard HttpException handling', () => {
    it('should format standard BadRequestException', () => {
      const exception = new BadRequestException('Bad request');

      filter.catch(exception, mockArgumentsHost);

      expect(mockStatus).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
      expect(mockJson).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: HttpStatus.BAD_REQUEST,
          errorCode: ErrorCodes.VALIDATION_FAILED,
          message: expect.any(String),
        }),
      );
    });

    it('should format UnauthorizedException', () => {
      const exception = new UnauthorizedException('Unauthorized');

      filter.catch(exception, mockArgumentsHost);

      expect(mockStatus).toHaveBeenCalledWith(HttpStatus.UNAUTHORIZED);
      expect(mockJson).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: HttpStatus.UNAUTHORIZED,
          errorCode: ErrorCodes.AUTH_TOKEN_INVALID,
        }),
      );
    });

    it('should format ForbiddenException', () => {
      const exception = new ForbiddenException('Forbidden');

      filter.catch(exception, mockArgumentsHost);

      expect(mockStatus).toHaveBeenCalledWith(HttpStatus.FORBIDDEN);
      expect(mockJson).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: HttpStatus.FORBIDDEN,
          errorCode: ErrorCodes.FORBIDDEN_ACCESS,
        }),
      );
    });

    it('should format NotFoundException', () => {
      const exception = new NestNotFoundException('Not found');

      filter.catch(exception, mockArgumentsHost);

      expect(mockStatus).toHaveBeenCalledWith(HttpStatus.NOT_FOUND);
    });

    it('should format ConflictException', () => {
      const exception = new NestConflictException('Conflict');

      filter.catch(exception, mockArgumentsHost);

      expect(mockStatus).toHaveBeenCalledWith(HttpStatus.CONFLICT);
    });

    it('should format HttpException with string response', () => {
      const exception = new HttpException('Custom error', HttpStatus.BAD_REQUEST);

      filter.catch(exception, mockArgumentsHost);

      expect(mockJson).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Custom error',
        }),
      );
    });

    it('should format HttpException with object response', () => {
      const exception = new HttpException(
        { message: 'Custom message', error: 'Custom error' },
        HttpStatus.BAD_REQUEST,
      );

      filter.catch(exception, mockArgumentsHost);

      expect(mockJson).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Custom message',
        }),
      );
    });
  });

  describe('class-validator errors', () => {
    it('should parse class-validator validation errors', () => {
      const exception = new BadRequestException({
        message: [
          'email must be an email',
          'password must be longer than 8 characters',
        ],
        error: 'Bad Request',
      });

      filter.catch(exception, mockArgumentsHost);

      expect(mockJson).toHaveBeenCalledWith(
        expect.objectContaining({
          errorCode: ErrorCodes.VALIDATION_FAILED,
          validationErrors: expect.arrayContaining([
            expect.objectContaining({ field: 'email' }),
            expect.objectContaining({ field: 'password' }),
          ]),
        }),
      );
    });

    it('should extract field name from validation message', () => {
      const exception = new BadRequestException({
        message: ['firstName should not be empty'],
        error: 'Bad Request',
      });

      filter.catch(exception, mockArgumentsHost);

      const response = mockJson.mock.calls[0][0] as FlatErrorResponse;
      expect(response.validationErrors?.[0]?.field).toBe('firstName');
    });

    it('should handle messages without field prefix', () => {
      const exception = new BadRequestException({
        message: ['validation failed'],
        error: 'Bad Request',
      });

      filter.catch(exception, mockArgumentsHost);

      const response = mockJson.mock.calls[0][0] as FlatErrorResponse;
      expect(response.validationErrors?.[0]?.field).toBe('validation');
    });
  });

  describe('language handling', () => {
    it('should return French message by default', () => {
      mockRequest.headers = { 'accept-language': 'fr' };
      const exception = new ValidationException('Test');

      filter.catch(exception, mockArgumentsHost);

      expect(mockJson).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining('invalide'),
        }),
      );
    });

    it('should return English message when Accept-Language is en', () => {
      mockRequest.headers = { 'accept-language': 'en-US' };
      const exception = new ValidationException('Test');

      filter.catch(exception, mockArgumentsHost);

      expect(mockJson).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining('invalid'),
        }),
      );
    });

    it('should default to French when no Accept-Language', () => {
      mockRequest.headers = {};
      const exception = new ValidationException('Test');

      filter.catch(exception, mockArgumentsHost);

      expect(mockJson).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining('invalide'),
        }),
      );
    });
  });

  describe('request ID handling', () => {
    it('should use x-request-id header when present', () => {
      mockRequest.headers = { 'x-request-id': 'custom-request-123' };
      const exception = new BadRequestException('Test');

      filter.catch(exception, mockArgumentsHost);

      expect(mockJson).toHaveBeenCalledWith(
        expect.objectContaining({
          requestId: 'custom-request-123',
        }),
      );
    });

    it('should generate request ID when not present', () => {
      mockRequest.headers = {};
      const exception = new BadRequestException('Test');

      filter.catch(exception, mockArgumentsHost);

      const response = mockJson.mock.calls[0][0] as FlatErrorResponse;
      expect(response.requestId).toMatch(/^req_\d+_[a-z0-9]+$/);
    });
  });

  describe('logging', () => {
    it('should log warning for 4xx errors', () => {
      const warnSpy = jest.spyOn(Logger.prototype, 'warn');
      const exception = new BadRequestException('Test');

      filter.catch(exception, mockArgumentsHost);

      expect(warnSpy).toHaveBeenCalled();
    });

    it('should log error for 5xx errors', () => {
      const errorSpy = jest.spyOn(Logger.prototype, 'error');
      const exception = new HttpException('Test', HttpStatus.INTERNAL_SERVER_ERROR);

      filter.catch(exception, mockArgumentsHost);

      expect(errorSpy).toHaveBeenCalled();
    });

    it('should include stack trace for 5xx errors', () => {
      const errorSpy = jest.spyOn(Logger.prototype, 'error');
      const exception = new HttpException('Test', HttpStatus.INTERNAL_SERVER_ERROR);

      filter.catch(exception, mockArgumentsHost);

      expect(errorSpy).toHaveBeenCalledWith(
        expect.any(String),
        exception.stack,
        expect.any(String),
      );
    });

    it('should log request context', () => {
      const warnSpy = jest.spyOn(Logger.prototype, 'warn');
      mockRequest.user = { id: 'user-123' };
      const exception = new BadRequestException('Test');

      filter.catch(exception, mockArgumentsHost);

      expect(warnSpy).toHaveBeenCalledWith(
        expect.any(String),
        expect.stringContaining('user-123'),
      );
    });
  });

  describe('response format', () => {
    it('should include timestamp in ISO format', () => {
      const exception = new BadRequestException('Test');

      filter.catch(exception, mockArgumentsHost);

      const response = mockJson.mock.calls[0][0] as FlatErrorResponse;
      expect(response.timestamp).toMatch(
        /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/,
      );
    });

    it('should include path from request', () => {
      mockRequest.url = '/api/users/123';
      const exception = new BadRequestException('Test');

      filter.catch(exception, mockArgumentsHost);

      expect(mockJson).toHaveBeenCalledWith(
        expect.objectContaining({
          path: '/api/users/123',
        }),
      );
    });

    it('should match FlatErrorResponse interface', () => {
      const exception = new BadRequestException('Test');

      filter.catch(exception, mockArgumentsHost);

      const response = mockJson.mock.calls[0][0] as FlatErrorResponse;
      expect(response).toHaveProperty('statusCode');
      expect(response).toHaveProperty('errorCode');
      expect(response).toHaveProperty('message');
      expect(response).toHaveProperty('timestamp');
      expect(response).toHaveProperty('path');
      expect(response).toHaveProperty('requestId');
    });
  });

  describe('error code mapping', () => {
    it.each([
      [HttpStatus.BAD_REQUEST, ErrorCodes.VALIDATION_FAILED],
      [HttpStatus.UNAUTHORIZED, ErrorCodes.AUTH_TOKEN_INVALID],
      [HttpStatus.FORBIDDEN, ErrorCodes.FORBIDDEN_ACCESS],
      [HttpStatus.TOO_MANY_REQUESTS, ErrorCodes.RATE_LIMIT_EXCEEDED],
      [HttpStatus.INTERNAL_SERVER_ERROR, ErrorCodes.INTERNAL_ERROR],
      [HttpStatus.SERVICE_UNAVAILABLE, ErrorCodes.SERVICE_UNAVAILABLE],
    ])(
      'should map status %i to error code %s',
      (status, expectedCode) => {
        const exception = new HttpException('Test', status);

        filter.catch(exception, mockArgumentsHost);

        expect(mockJson).toHaveBeenCalledWith(
          expect.objectContaining({
            errorCode: expectedCode,
          }),
        );
      },
    );

    it('should use INTERNAL_ERROR for unmapped status codes', () => {
      const exception = new HttpException('Test', 418); // I'm a teapot

      filter.catch(exception, mockArgumentsHost);

      expect(mockJson).toHaveBeenCalledWith(
        expect.objectContaining({
          errorCode: ErrorCodes.INTERNAL_ERROR,
        }),
      );
    });
  });

  describe('edge cases', () => {
    it('should handle exception with undefined message', () => {
      const exception = new HttpException({}, HttpStatus.BAD_REQUEST);

      filter.catch(exception, mockArgumentsHost);

      expect(mockStatus).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
      expect(mockJson).toHaveBeenCalled();
    });

    it('should handle exception with empty object response', () => {
      const exception = new HttpException({}, HttpStatus.BAD_REQUEST);

      filter.catch(exception, mockArgumentsHost);

      expect(mockStatus).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
      expect(mockJson).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: HttpStatus.BAD_REQUEST,
          errorCode: expect.any(String),
          message: expect.any(String),
        }),
      );
    });

    it('should handle request without user', () => {
      delete mockRequest.user;
      const exception = new BadRequestException('Test');

      expect(() => filter.catch(exception, mockArgumentsHost)).not.toThrow();
    });

    it('should handle request without connection', () => {
      delete mockRequest.connection;
      const exception = new BadRequestException('Test');

      expect(() => filter.catch(exception, mockArgumentsHost)).not.toThrow();
    });
  });
});
