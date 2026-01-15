import { HttpStatus, Logger, ArgumentsHost } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { AllExceptionsFilter } from './all-exceptions.filter';
import { ErrorCodes } from '../exceptions/error-codes';

describe('AllExceptionsFilter', () => {
  let filter: AllExceptionsFilter;
  let mockJson: jest.Mock;
  let mockStatus: jest.Mock;
  let mockResponse: { status: jest.Mock; json: jest.Mock };
  let mockRequest: Record<string, unknown>;
  let mockArgumentsHost: ArgumentsHost;

  beforeEach(() => {
    filter = new AllExceptionsFilter();
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
      query: {},
      body: {},
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

  describe('Prisma errors', () => {
    describe('PrismaClientKnownRequestError', () => {
      it('should handle unique constraint violation (P2002)', () => {
        const error = new Prisma.PrismaClientKnownRequestError('Unique constraint', {
          code: 'P2002',
          clientVersion: '5.0.0',
          meta: { target: ['email'] },
        });

        filter.catch(error, mockArgumentsHost);

        expect(mockStatus).toHaveBeenCalledWith(HttpStatus.CONFLICT);
        expect(mockJson).toHaveBeenCalledWith(
          expect.objectContaining({
            statusCode: HttpStatus.CONFLICT,
            errorCode: ErrorCodes.USER_EMAIL_EXISTS,
            details: { fields: ['email'] },
          }),
        );
      });

      it('should handle phone unique constraint', () => {
        const error = new Prisma.PrismaClientKnownRequestError('Unique constraint', {
          code: 'P2002',
          clientVersion: '5.0.0',
          meta: { target: ['phone'] },
        });

        filter.catch(error, mockArgumentsHost);

        expect(mockJson).toHaveBeenCalledWith(
          expect.objectContaining({
            errorCode: ErrorCodes.USER_PHONE_EXISTS,
          }),
        );
      });

      it('should handle slug unique constraint', () => {
        const error = new Prisma.PrismaClientKnownRequestError('Unique constraint', {
          code: 'P2002',
          clientVersion: '5.0.0',
          meta: { target: ['slug'] },
        });

        filter.catch(error, mockArgumentsHost);

        expect(mockJson).toHaveBeenCalledWith(
          expect.objectContaining({
            errorCode: ErrorCodes.FESTIVAL_SLUG_EXISTS,
          }),
        );
      });

      it('should handle NFC tag unique constraint', () => {
        const error = new Prisma.PrismaClientKnownRequestError('Unique constraint', {
          code: 'P2002',
          clientVersion: '5.0.0',
          meta: { target: ['nfcTagId'] },
        });

        filter.catch(error, mockArgumentsHost);

        expect(mockJson).toHaveBeenCalledWith(
          expect.objectContaining({
            errorCode: ErrorCodes.CASHLESS_NFC_TAG_EXISTS,
          }),
        );
      });

      it('should handle foreign key constraint violation (P2003)', () => {
        const error = new Prisma.PrismaClientKnownRequestError('Foreign key constraint', {
          code: 'P2003',
          clientVersion: '5.0.0',
          meta: { field_name: 'festivalId' },
        });

        filter.catch(error, mockArgumentsHost);

        expect(mockStatus).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
        expect(mockJson).toHaveBeenCalledWith(
          expect.objectContaining({
            details: { field: 'festivalId' },
          }),
        );
      });

      it('should handle record not found (P2025)', () => {
        const error = new Prisma.PrismaClientKnownRequestError('Record not found', {
          code: 'P2025',
          clientVersion: '5.0.0',
        });

        filter.catch(error, mockArgumentsHost);

        expect(mockStatus).toHaveBeenCalledWith(HttpStatus.NOT_FOUND);
      });

      it('should handle required field missing (P2011)', () => {
        const error = new Prisma.PrismaClientKnownRequestError('Required field missing', {
          code: 'P2011',
          clientVersion: '5.0.0',
        });

        filter.catch(error, mockArgumentsHost);

        expect(mockStatus).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
        expect(mockJson).toHaveBeenCalledWith(
          expect.objectContaining({
            errorCode: ErrorCodes.VALIDATION_FAILED,
          }),
        );
      });

      it('should handle connection error (P1001)', () => {
        const error = new Prisma.PrismaClientKnownRequestError('Connection error', {
          code: 'P1001',
          clientVersion: '5.0.0',
        });

        filter.catch(error, mockArgumentsHost);

        expect(mockStatus).toHaveBeenCalledWith(HttpStatus.SERVICE_UNAVAILABLE);
        expect(mockJson).toHaveBeenCalledWith(
          expect.objectContaining({
            errorCode: ErrorCodes.SERVICE_UNAVAILABLE,
          }),
        );
      });

      it('should handle timeout error (P1008)', () => {
        const error = new Prisma.PrismaClientKnownRequestError('Timeout', {
          code: 'P1008',
          clientVersion: '5.0.0',
        });

        filter.catch(error, mockArgumentsHost);

        expect(mockStatus).toHaveBeenCalledWith(HttpStatus.SERVICE_UNAVAILABLE);
      });

      it('should handle too many connections (P1010)', () => {
        const error = new Prisma.PrismaClientKnownRequestError('Too many connections', {
          code: 'P1010',
          clientVersion: '5.0.0',
        });

        filter.catch(error, mockArgumentsHost);

        expect(mockStatus).toHaveBeenCalledWith(HttpStatus.SERVICE_UNAVAILABLE);
      });

      it('should handle unknown Prisma error code', () => {
        const error = new Prisma.PrismaClientKnownRequestError('Unknown', {
          code: 'P9999',
          clientVersion: '5.0.0',
        });

        filter.catch(error, mockArgumentsHost);

        expect(mockStatus).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);
        expect(mockJson).toHaveBeenCalledWith(
          expect.objectContaining({
            details: expect.objectContaining({ prismaCode: 'P9999' }),
          }),
        );
      });
    });

    describe('PrismaClientInitializationError', () => {
      it('should handle initialization error', () => {
        const error = new Prisma.PrismaClientInitializationError(
          'Database unavailable',
          '5.0.0',
        );

        filter.catch(error, mockArgumentsHost);

        expect(mockStatus).toHaveBeenCalledWith(HttpStatus.SERVICE_UNAVAILABLE);
        expect(mockJson).toHaveBeenCalledWith(
          expect.objectContaining({
            errorCode: ErrorCodes.SERVICE_UNAVAILABLE,
          }),
        );
      });
    });

    describe('PrismaClientUnknownRequestError', () => {
      it('should handle unknown Prisma request error', () => {
        const error = new Prisma.PrismaClientUnknownRequestError(
          'Unknown error',
          { clientVersion: '5.0.0' },
        );

        filter.catch(error, mockArgumentsHost);

        expect(mockStatus).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);
      });
    });
  });

  describe('Standard JavaScript errors', () => {
    it('should handle TypeError', () => {
      const error = new TypeError('Cannot read property of undefined');

      filter.catch(error, mockArgumentsHost);

      expect(mockStatus).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);
      expect(mockJson).toHaveBeenCalledWith(
        expect.objectContaining({
          errorCode: ErrorCodes.INTERNAL_ERROR,
        }),
      );
    });

    it('should handle RangeError', () => {
      const error = new RangeError('Value out of range');

      filter.catch(error, mockArgumentsHost);

      expect(mockStatus).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
      expect(mockJson).toHaveBeenCalledWith(
        expect.objectContaining({
          errorCode: ErrorCodes.VALIDATION_FAILED,
        }),
      );
    });

    it('should handle SyntaxError', () => {
      const error = new SyntaxError('Unexpected token');

      filter.catch(error, mockArgumentsHost);

      expect(mockStatus).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
      expect(mockJson).toHaveBeenCalledWith(
        expect.objectContaining({
          errorCode: ErrorCodes.VALIDATION_FAILED,
        }),
      );
    });

    it('should handle generic Error', () => {
      const error = new Error('Something went wrong');

      filter.catch(error, mockArgumentsHost);

      expect(mockStatus).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);
      expect(mockJson).toHaveBeenCalledWith(
        expect.objectContaining({
          errorCode: ErrorCodes.INTERNAL_ERROR,
        }),
      );
    });
  });

  describe('Unknown errors', () => {
    it('should handle string error', () => {
      filter.catch('Something went wrong', mockArgumentsHost);

      expect(mockStatus).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);
      expect(mockJson).toHaveBeenCalledWith(
        expect.objectContaining({
          errorCode: ErrorCodes.INTERNAL_ERROR,
        }),
      );
    });

    it('should handle number error', () => {
      filter.catch(42, mockArgumentsHost);

      expect(mockStatus).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);
    });

    it('should handle null error', () => {
      filter.catch(null, mockArgumentsHost);

      expect(mockStatus).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);
    });

    it('should handle undefined error', () => {
      filter.catch(undefined, mockArgumentsHost);

      expect(mockStatus).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);
    });

    it('should handle object error', () => {
      filter.catch({ error: 'Something went wrong' }, mockArgumentsHost);

      expect(mockStatus).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);
    });
  });

  describe('language handling', () => {
    it('should return French message by default', () => {
      mockRequest.headers = { 'accept-language': 'fr' };
      const error = new Error('Test error');

      filter.catch(error, mockArgumentsHost);

      expect(mockJson).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining('erreur'),
        }),
      );
    });

    it('should return English message when Accept-Language is en', () => {
      mockRequest.headers = { 'accept-language': 'en-US' };
      const error = new Error('Test error');

      filter.catch(error, mockArgumentsHost);

      expect(mockJson).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining('error'),
        }),
      );
    });

    it('should default to French when no Accept-Language', () => {
      mockRequest.headers = {};
      const error = new Error('Test error');

      filter.catch(error, mockArgumentsHost);

      expect(mockJson).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining('erreur'),
        }),
      );
    });

    it('should handle English for Prisma not found error', () => {
      mockRequest.headers = { 'accept-language': 'en' };
      const error = new Prisma.PrismaClientKnownRequestError('Record not found', {
        code: 'P2025',
        clientVersion: '5.0.0',
      });

      filter.catch(error, mockArgumentsHost);

      expect(mockJson).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining('not found'),
        }),
      );
    });

    it('should handle English for RangeError', () => {
      mockRequest.headers = { 'accept-language': 'en' };
      const error = new RangeError('Out of range');

      filter.catch(error, mockArgumentsHost);

      expect(mockJson).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining('out of range'),
        }),
      );
    });
  });

  describe('request ID handling', () => {
    it('should use x-request-id header when present', () => {
      mockRequest.headers = { 'x-request-id': 'custom-request-123' };
      const error = new Error('Test error');

      filter.catch(error, mockArgumentsHost);

      expect(mockJson).toHaveBeenCalledWith(
        expect.objectContaining({
          requestId: 'custom-request-123',
        }),
      );
    });

    it('should generate request ID when not present', () => {
      mockRequest.headers = {};
      const error = new Error('Test error');

      filter.catch(error, mockArgumentsHost);

      const response = mockJson.mock.calls[0][0];
      expect(response.requestId).toMatch(/^req_\d+_[a-z0-9]+$/);
    });
  });

  describe('logging', () => {
    it('should log error with stack trace', () => {
      const errorSpy = jest.spyOn(Logger.prototype, 'error');
      const error = new Error('Test error');

      filter.catch(error, mockArgumentsHost);

      expect(errorSpy).toHaveBeenCalledWith(
        expect.any(String),
        error.stack,
        expect.any(String),
      );
    });

    it('should log error type', () => {
      const errorSpy = jest.spyOn(Logger.prototype, 'error');
      const error = new TypeError('Type error');

      filter.catch(error, mockArgumentsHost);

      expect(errorSpy).toHaveBeenCalledWith(
        expect.stringContaining('TypeError'),
        expect.any(String),
        expect.any(String),
      );
    });

    it('should log request context', () => {
      const errorSpy = jest.spyOn(Logger.prototype, 'error');
      mockRequest.user = { id: 'user-123' };
      const error = new Error('Test error');

      filter.catch(error, mockArgumentsHost);

      expect(errorSpy).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(String),
        expect.stringContaining('user-123'),
      );
    });

    it('should log PrismaError type', () => {
      const errorSpy = jest.spyOn(Logger.prototype, 'error');
      const error = new Prisma.PrismaClientKnownRequestError('Test', {
        code: 'P2002',
        clientVersion: '5.0.0',
      });

      filter.catch(error, mockArgumentsHost);

      expect(errorSpy).toHaveBeenCalledWith(
        expect.stringContaining('PrismaError'),
        expect.any(String),
        expect.any(String),
      );
    });
  });

  describe('body sanitization', () => {
    it('should redact password in body', () => {
      const errorSpy = jest.spyOn(Logger.prototype, 'error');
      mockRequest.body = { email: 'test@test.com', password: 'secret123' };
      const error = new Error('Test');

      filter.catch(error, mockArgumentsHost);

      expect(errorSpy).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(String),
        expect.stringContaining('[REDACTED]'),
      );
    });

    it('should redact token in body', () => {
      const errorSpy = jest.spyOn(Logger.prototype, 'error');
      mockRequest.body = { token: 'jwt-token-here' };
      const error = new Error('Test');

      filter.catch(error, mockArgumentsHost);

      expect(errorSpy).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(String),
        expect.stringContaining('[REDACTED]'),
      );
    });

    it('should redact secret in body', () => {
      mockRequest.body = { secret: 'my-secret-key' };
      const error = new Error('Test');

      filter.catch(error, mockArgumentsHost);

      const logCall = (Logger.prototype.error as jest.Mock).mock.calls[0];
      expect(logCall[2]).toContain('[REDACTED]');
    });

    it('should redact apiKey in body', () => {
      mockRequest.body = { apiKey: 'api-key-123' };
      const error = new Error('Test');

      filter.catch(error, mockArgumentsHost);

      const logCall = (Logger.prototype.error as jest.Mock).mock.calls[0];
      expect(logCall[2]).toContain('[REDACTED]');
    });

    it('should redact cardNumber in body', () => {
      mockRequest.body = { cardNumber: '4111111111111111' };
      const error = new Error('Test');

      filter.catch(error, mockArgumentsHost);

      const logCall = (Logger.prototype.error as jest.Mock).mock.calls[0];
      expect(logCall[2]).toContain('[REDACTED]');
    });

    it('should redact cvv in body', () => {
      mockRequest.body = { cvv: '123' };
      const error = new Error('Test');

      filter.catch(error, mockArgumentsHost);

      const logCall = (Logger.prototype.error as jest.Mock).mock.calls[0];
      expect(logCall[2]).toContain('[REDACTED]');
    });

    it('should redact pin in body', () => {
      mockRequest.body = { pin: '1234' };
      const error = new Error('Test');

      filter.catch(error, mockArgumentsHost);

      const logCall = (Logger.prototype.error as jest.Mock).mock.calls[0];
      expect(logCall[2]).toContain('[REDACTED]');
    });

    it('should handle null body', () => {
      mockRequest.body = null;
      const error = new Error('Test');

      expect(() => filter.catch(error, mockArgumentsHost)).not.toThrow();
    });

    it('should handle undefined body', () => {
      mockRequest.body = undefined;
      const error = new Error('Test');

      expect(() => filter.catch(error, mockArgumentsHost)).not.toThrow();
    });

    it('should handle string body', () => {
      mockRequest.body = 'plain text body';
      const error = new Error('Test');

      expect(() => filter.catch(error, mockArgumentsHost)).not.toThrow();
    });
  });

  describe('development mode', () => {
    const originalEnv = process.env.NODE_ENV;

    afterEach(() => {
      process.env.NODE_ENV = originalEnv;
    });

    it('should include error details in development', () => {
      process.env.NODE_ENV = 'development';
      const error = new Error('Detailed error message');

      filter.catch(error, mockArgumentsHost);

      expect(mockJson).toHaveBeenCalledWith(
        expect.objectContaining({
          details: expect.objectContaining({
            errorName: 'Error',
            errorMessage: 'Detailed error message',
          }),
        }),
      );
    });

    it('should include raw error in development for unknown errors', () => {
      process.env.NODE_ENV = 'development';

      filter.catch({ custom: 'error' }, mockArgumentsHost);

      expect(mockJson).toHaveBeenCalledWith(
        expect.objectContaining({
          details: expect.objectContaining({
            raw: expect.any(String),
          }),
        }),
      );
    });

    it('should not include error details in production', () => {
      process.env.NODE_ENV = 'production';
      const error = new Error('Error message');

      filter.catch(error, mockArgumentsHost);

      const response = mockJson.mock.calls[0][0];
      expect(response.details?.errorMessage).toBeUndefined();
    });
  });

  describe('response format', () => {
    it('should include timestamp in ISO format', () => {
      const error = new Error('Test');

      filter.catch(error, mockArgumentsHost);

      const response = mockJson.mock.calls[0][0];
      expect(response.timestamp).toMatch(
        /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/,
      );
    });

    it('should include path from request', () => {
      mockRequest.url = '/api/users/123';
      const error = new Error('Test');

      filter.catch(error, mockArgumentsHost);

      expect(mockJson).toHaveBeenCalledWith(
        expect.objectContaining({
          path: '/api/users/123',
        }),
      );
    });

    it('should have consistent response structure', () => {
      const error = new Error('Test');

      filter.catch(error, mockArgumentsHost);

      const response = mockJson.mock.calls[0][0];
      expect(response).toHaveProperty('statusCode');
      expect(response).toHaveProperty('errorCode');
      expect(response).toHaveProperty('message');
      expect(response).toHaveProperty('timestamp');
      expect(response).toHaveProperty('path');
      expect(response).toHaveProperty('requestId');
    });
  });

  describe('conflict error code mapping', () => {
    it('should use INTERNAL_ERROR when no meta target', () => {
      const error = new Prisma.PrismaClientKnownRequestError('Unique constraint', {
        code: 'P2002',
        clientVersion: '5.0.0',
        meta: {},
      });

      filter.catch(error, mockArgumentsHost);

      expect(mockJson).toHaveBeenCalledWith(
        expect.objectContaining({
          errorCode: ErrorCodes.INTERNAL_ERROR,
        }),
      );
    });

    it('should use INTERNAL_ERROR for unknown unique field', () => {
      const error = new Prisma.PrismaClientKnownRequestError('Unique constraint', {
        code: 'P2002',
        clientVersion: '5.0.0',
        meta: { target: ['unknownField'] },
      });

      filter.catch(error, mockArgumentsHost);

      expect(mockJson).toHaveBeenCalledWith(
        expect.objectContaining({
          errorCode: ErrorCodes.INTERNAL_ERROR,
        }),
      );
    });
  });
});
