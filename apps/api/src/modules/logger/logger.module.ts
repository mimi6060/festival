/**
 * Logger Module
 *
 * Production-ready logging configuration using Pino.
 * Features:
 * - JSON format for production (structured logging for log aggregation)
 * - Pretty format for development (human-readable)
 * - Log levels based on NODE_ENV
 * - ISO timestamp format
 * - Request/response logging with correlation IDs
 */

import { Module } from '@nestjs/common';
import { LoggerModule as PinoLoggerModule } from 'nestjs-pino';
import { ConfigService } from '@nestjs/config';

@Module({
  imports: [
    PinoLoggerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const isProduction = configService.get('NODE_ENV') === 'production';
        const logLevel = configService.get('LOG_LEVEL') || (isProduction ? 'info' : 'debug');

        return {
          pinoHttp: {
            // Log level based on environment
            level: logLevel,

            // Custom log level assignment for responses
            customLogLevel: (
              _req: unknown,
              res: { statusCode: number },
              err: Error | undefined
            ) => {
              if (res.statusCode >= 400 && res.statusCode < 500) {
                return 'warn';
              } else if (res.statusCode >= 500 || err) {
                return 'error';
              }
              return 'info';
            },

            // Custom success message
            customSuccessMessage: (
              req: { method?: string; url?: string },
              res: { statusCode: number }
            ) => {
              return `${req.method} ${req.url} completed with status ${res.statusCode}`;
            },

            // Custom error message
            customErrorMessage: (
              req: { method?: string; url?: string },
              res: { statusCode: number }
            ) => {
              return `${req.method} ${req.url} failed with status ${res.statusCode}`;
            },

            // Generate request ID for correlation
            genReqId: (req: { headers?: { 'x-request-id'?: string } }) => {
              return req.headers?.['x-request-id'] || crypto.randomUUID();
            },

            // Redact sensitive data
            redact: {
              paths: [
                'req.headers.authorization',
                'req.headers.cookie',
                'req.body.password',
                'req.body.confirmPassword',
                'req.body.currentPassword',
                'req.body.newPassword',
                'req.body.token',
                'req.body.refreshToken',
                'req.body.cardNumber',
                'req.body.cvv',
                'req.body.expiryDate',
                'res.headers["set-cookie"]',
              ],
              remove: true,
            },

            // Serializers for cleaner logs
            serializers: {
              req: (req: {
                id?: string;
                method?: string;
                url?: string;
                headers?: { host?: string; 'user-agent'?: string };
                remoteAddress?: string;
              }) => ({
                id: req.id,
                method: req.method,
                url: req.url,
                host: req.headers?.host,
                userAgent: req.headers?.['user-agent'],
                remoteAddress: req.remoteAddress,
              }),
              res: (res: { statusCode?: number }) => ({
                statusCode: res.statusCode,
              }),
            },

            // Transport configuration
            transport: isProduction
              ? undefined // Use default JSON output in production
              : {
                  target: 'pino-pretty',
                  options: {
                    colorize: true,
                    singleLine: false,
                    translateTime: 'SYS:standard',
                    ignore: 'pid,hostname',
                    messageFormat: '{msg}',
                  },
                },

            // Timestamp format - ISO 8601 for production
            timestamp: isProduction ? () => `,"time":"${new Date().toISOString()}"` : undefined,

            // Base context for all logs
            base: isProduction
              ? {
                  service: 'festival-api',
                  version: process.env.APP_VERSION || '1.0.0',
                  env: 'production',
                }
              : undefined,

            // Auto-logging configuration
            autoLogging: {
              ignore: (req: { url?: string }) => {
                // Don't log health check requests
                const url = req.url || '';
                return (
                  url.includes('/health') ||
                  url.includes('/ready') ||
                  url.includes('/live') ||
                  url.includes('/metrics')
                );
              },
            },
          },
        };
      },
    }),
  ],
  exports: [PinoLoggerModule],
})
export class LoggerModule {}
