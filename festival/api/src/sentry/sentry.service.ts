import { Injectable } from '@nestjs/common';
import * as Sentry from '@sentry/node';

export type BreadcrumbCategory = 'payment' | 'cashless' | 'auth' | 'ticket' | 'festival' | 'http';

export interface BreadcrumbData {
  category: BreadcrumbCategory;
  message: string;
  data?: Record<string, unknown>;
  level?: Sentry.SeverityLevel;
}

@Injectable()
export class SentryService {
  /**
   * Add a custom breadcrumb for tracking user actions
   */
  addBreadcrumb(breadcrumb: BreadcrumbData): void {
    Sentry.addBreadcrumb({
      category: breadcrumb.category,
      message: breadcrumb.message,
      data: breadcrumb.data,
      level: breadcrumb.level || 'info',
      timestamp: Date.now() / 1000,
    });
  }

  /**
   * Add a payment-related breadcrumb
   */
  addPaymentBreadcrumb(
    action: string,
    data: {
      amount?: number;
      currency?: string;
      paymentIntentId?: string;
      userId?: string;
      festivalId?: string;
      status?: string;
    },
  ): void {
    this.addBreadcrumb({
      category: 'payment',
      message: `Payment: ${action}`,
      data: {
        ...data,
        timestamp: new Date().toISOString(),
      },
      level: 'info',
    });
  }

  /**
   * Add a cashless-related breadcrumb
   */
  addCashlessBreadcrumb(
    action: string,
    data: {
      braceletId?: string;
      userId?: string;
      amount?: number;
      operation?: 'topup' | 'payment' | 'transfer' | 'refund' | 'link' | 'unlink';
      balance?: number;
    },
  ): void {
    this.addBreadcrumb({
      category: 'cashless',
      message: `Cashless: ${action}`,
      data: {
        ...data,
        timestamp: new Date().toISOString(),
      },
      level: 'info',
    });
  }

  /**
   * Add an auth-related breadcrumb
   */
  addAuthBreadcrumb(
    action: string,
    data: {
      userId?: string;
      email?: string;
      method?: 'login' | 'logout' | 'register' | 'refresh' | 'password-reset';
      success?: boolean;
      reason?: string;
    },
  ): void {
    this.addBreadcrumb({
      category: 'auth',
      message: `Auth: ${action}`,
      data: {
        ...data,
        timestamp: new Date().toISOString(),
      },
      level: data.success === false ? 'warning' : 'info',
    });
  }

  /**
   * Add a ticket-related breadcrumb
   */
  addTicketBreadcrumb(
    action: string,
    data: {
      ticketId?: string;
      userId?: string;
      festivalId?: string;
      categoryId?: string;
      status?: string;
    },
  ): void {
    this.addBreadcrumb({
      category: 'ticket',
      message: `Ticket: ${action}`,
      data: {
        ...data,
        timestamp: new Date().toISOString(),
      },
      level: 'info',
    });
  }

  /**
   * Set user context for Sentry
   */
  setUser(user: {
    id: string;
    email?: string;
    username?: string;
    role?: string;
  }): void {
    Sentry.setUser({
      id: user.id,
      email: user.email,
      username: user.username,
      role: user.role,
    });
  }

  /**
   * Clear user context
   */
  clearUser(): void {
    Sentry.setUser(null);
  }

  /**
   * Set additional context tags
   */
  setTag(key: string, value: string): void {
    Sentry.setTag(key, value);
  }

  /**
   * Set extra context data
   */
  setExtra(key: string, value: unknown): void {
    Sentry.setExtra(key, value);
  }

  /**
   * Capture an exception manually
   */
  captureException(error: Error, context?: Record<string, unknown>): string {
    return Sentry.captureException(error, {
      extra: context,
    });
  }

  /**
   * Capture a message manually
   */
  captureMessage(
    message: string,
    level: Sentry.SeverityLevel = 'info',
    context?: Record<string, unknown>,
  ): string {
    return Sentry.captureMessage(message, {
      level,
      extra: context,
    });
  }

  /**
   * Start a new transaction for performance monitoring
   */
  startTransaction(
    name: string,
    op: string,
    data?: Record<string, unknown>,
  ): Sentry.Span | undefined {
    return Sentry.startInactiveSpan({
      name,
      op,
      attributes: data as Record<string, string | number | boolean>,
    });
  }
}
