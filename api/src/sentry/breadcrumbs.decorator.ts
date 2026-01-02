import { SetMetadata } from '@nestjs/common';

export const SENTRY_BREADCRUMB_KEY = 'sentry:breadcrumb';

export interface BreadcrumbOptions {
  category: 'payment' | 'cashless' | 'auth' | 'ticket' | 'festival';
  action: string;
  extractData?: (args: unknown[]) => Record<string, unknown>;
}

/**
 * Decorator to automatically add Sentry breadcrumbs to methods
 *
 * @example
 * ```typescript
 * @SentryBreadcrumb({
 *   category: 'payment',
 *   action: 'createPaymentIntent',
 *   extractData: ([dto]) => ({ amount: dto.amount, currency: dto.currency })
 * })
 * async createPaymentIntent(dto: CreatePaymentDto) {
 *   // ...
 * }
 * ```
 */
export const SentryBreadcrumb = (options: BreadcrumbOptions) =>
  SetMetadata(SENTRY_BREADCRUMB_KEY, options);
