import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import * as Sentry from '@sentry/node';
import { nodeProfilingIntegration } from '@sentry/profiling-node';

@Injectable()
export class SentryService implements OnModuleInit {
  private readonly logger = new Logger(SentryService.name);

  onModuleInit() {
    const dsn = process.env.SENTRY_DSN;

    if (!dsn) {
      this.logger.warn('Sentry DSN not configured. Error tracking disabled.');
      return;
    }

    Sentry.init({
      dsn,
      environment: process.env.NODE_ENV || 'development',
      release: process.env.APP_VERSION || '1.0.0',
      integrations: [nodeProfilingIntegration()],
      // Performance Monitoring
      tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
      // Set sampling rate for profiling - this is relative to tracesSampleRate
      profilesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
      // Capture errors in development
      beforeSend(event, hint) {
        // Add additional context
        if (hint.originalException instanceof Error) {
          event.extra = {
            ...event.extra,
            errorName: hint.originalException.name,
            errorStack: hint.originalException.stack,
          };
        }
        return event;
      },
    });

    this.logger.log('Sentry error tracking initialized');
  }

  captureException(exception: Error, context?: Record<string, unknown>): void {
    Sentry.withScope((scope) => {
      if (context) {
        Object.entries(context).forEach(([key, value]) => {
          scope.setExtra(key, value);
        });
      }
      Sentry.captureException(exception);
    });
  }

  captureMessage(message: string, level: Sentry.SeverityLevel = 'info'): void {
    Sentry.captureMessage(message, level);
  }

  setUser(user: { id: string; email?: string; role?: string }): void {
    Sentry.setUser(user);
  }

  setContext(name: string, context: Record<string, unknown>): void {
    Sentry.setContext(name, context);
  }

  addBreadcrumb(breadcrumb: Sentry.Breadcrumb): void {
    Sentry.addBreadcrumb(breadcrumb);
  }

  startTransaction(name: string, op: string): ReturnType<typeof Sentry.startSpan> {
    return Sentry.startSpan({ name, op }, (span) => span);
  }
}
