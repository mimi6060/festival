/**
 * Webhook Events Enumeration
 *
 * Defines all supported webhook event types for external integrations.
 * Events follow the pattern: {resource}.{action}
 */

/**
 * All supported webhook event types
 */
export enum WebhookEvent {
  // ==========================================
  // Ticket Events
  // ==========================================
  /** Fired when a ticket is purchased */
  TICKET_PURCHASED = 'ticket.purchased',
  /** Fired when a ticket is validated/scanned at entry */
  TICKET_VALIDATED = 'ticket.validated',
  /** Fired when a ticket is refunded */
  TICKET_REFUNDED = 'ticket.refunded',
  /** Fired when a ticket is cancelled */
  TICKET_CANCELLED = 'ticket.cancelled',
  /** Fired when a ticket is transferred to another user */
  TICKET_TRANSFERRED = 'ticket.transferred',

  // ==========================================
  // Payment Events
  // ==========================================
  /** Fired when a payment is successfully completed */
  PAYMENT_COMPLETED = 'payment.completed',
  /** Fired when a payment fails */
  PAYMENT_FAILED = 'payment.failed',
  /** Fired when a payment is refunded */
  PAYMENT_REFUNDED = 'payment.refunded',
  /** Fired when a payment is pending/processing */
  PAYMENT_PENDING = 'payment.pending',

  // ==========================================
  // Cashless Events
  // ==========================================
  /** Fired when a cashless account is topped up */
  CASHLESS_TOPUP = 'cashless.topup',
  /** Fired when a cashless payment is made */
  CASHLESS_PAYMENT = 'cashless.payment',
  /** Fired when a cashless refund is processed */
  CASHLESS_REFUND = 'cashless.refund',
  /** Fired when cashless balance is transferred between users */
  CASHLESS_TRANSFER = 'cashless.transfer',

  // ==========================================
  // Festival Events
  // ==========================================
  /** Fired when a festival is updated */
  FESTIVAL_UPDATED = 'festival.updated',
  /** Fired when a festival is published */
  FESTIVAL_PUBLISHED = 'festival.published',
  /** Fired when a festival status changes */
  FESTIVAL_STATUS_CHANGED = 'festival.status_changed',

  // ==========================================
  // User Events
  // ==========================================
  /** Fired when a new user registers */
  USER_REGISTERED = 'user.registered',
  /** Fired when a user profile is updated */
  USER_UPDATED = 'user.updated',
  /** Fired when a user is deleted (GDPR) */
  USER_DELETED = 'user.deleted',

  // ==========================================
  // Vendor Events
  // ==========================================
  /** Fired when a vendor order is created */
  VENDOR_ORDER_CREATED = 'vendor.order_created',
  /** Fired when a vendor order status changes */
  VENDOR_ORDER_UPDATED = 'vendor.order_updated',

  // ==========================================
  // Zone Events
  // ==========================================
  /** Fired when someone enters a zone */
  ZONE_ENTRY = 'zone.entry',
  /** Fired when someone exits a zone */
  ZONE_EXIT = 'zone.exit',
  /** Fired when zone capacity threshold is reached */
  ZONE_CAPACITY_ALERT = 'zone.capacity_alert',
}

/**
 * Webhook event categories for grouping in UI
 */
export enum WebhookEventCategory {
  TICKETS = 'tickets',
  PAYMENTS = 'payments',
  CASHLESS = 'cashless',
  FESTIVAL = 'festival',
  USER = 'user',
  VENDOR = 'vendor',
  ZONE = 'zone',
}

/**
 * Mapping of events to their categories
 */
export const WEBHOOK_EVENT_CATEGORIES: Record<WebhookEvent, WebhookEventCategory> = {
  [WebhookEvent.TICKET_PURCHASED]: WebhookEventCategory.TICKETS,
  [WebhookEvent.TICKET_VALIDATED]: WebhookEventCategory.TICKETS,
  [WebhookEvent.TICKET_REFUNDED]: WebhookEventCategory.TICKETS,
  [WebhookEvent.TICKET_CANCELLED]: WebhookEventCategory.TICKETS,
  [WebhookEvent.TICKET_TRANSFERRED]: WebhookEventCategory.TICKETS,

  [WebhookEvent.PAYMENT_COMPLETED]: WebhookEventCategory.PAYMENTS,
  [WebhookEvent.PAYMENT_FAILED]: WebhookEventCategory.PAYMENTS,
  [WebhookEvent.PAYMENT_REFUNDED]: WebhookEventCategory.PAYMENTS,
  [WebhookEvent.PAYMENT_PENDING]: WebhookEventCategory.PAYMENTS,

  [WebhookEvent.CASHLESS_TOPUP]: WebhookEventCategory.CASHLESS,
  [WebhookEvent.CASHLESS_PAYMENT]: WebhookEventCategory.CASHLESS,
  [WebhookEvent.CASHLESS_REFUND]: WebhookEventCategory.CASHLESS,
  [WebhookEvent.CASHLESS_TRANSFER]: WebhookEventCategory.CASHLESS,

  [WebhookEvent.FESTIVAL_UPDATED]: WebhookEventCategory.FESTIVAL,
  [WebhookEvent.FESTIVAL_PUBLISHED]: WebhookEventCategory.FESTIVAL,
  [WebhookEvent.FESTIVAL_STATUS_CHANGED]: WebhookEventCategory.FESTIVAL,

  [WebhookEvent.USER_REGISTERED]: WebhookEventCategory.USER,
  [WebhookEvent.USER_UPDATED]: WebhookEventCategory.USER,
  [WebhookEvent.USER_DELETED]: WebhookEventCategory.USER,

  [WebhookEvent.VENDOR_ORDER_CREATED]: WebhookEventCategory.VENDOR,
  [WebhookEvent.VENDOR_ORDER_UPDATED]: WebhookEventCategory.VENDOR,

  [WebhookEvent.ZONE_ENTRY]: WebhookEventCategory.ZONE,
  [WebhookEvent.ZONE_EXIT]: WebhookEventCategory.ZONE,
  [WebhookEvent.ZONE_CAPACITY_ALERT]: WebhookEventCategory.ZONE,
};

/**
 * Human-readable descriptions for each webhook event
 */
export const WEBHOOK_EVENT_DESCRIPTIONS: Record<WebhookEvent, string> = {
  [WebhookEvent.TICKET_PURCHASED]: 'Triggered when a ticket is purchased',
  [WebhookEvent.TICKET_VALIDATED]: 'Triggered when a ticket is scanned and validated at entry',
  [WebhookEvent.TICKET_REFUNDED]: 'Triggered when a ticket is refunded',
  [WebhookEvent.TICKET_CANCELLED]: 'Triggered when a ticket is cancelled',
  [WebhookEvent.TICKET_TRANSFERRED]: 'Triggered when a ticket is transferred to another user',

  [WebhookEvent.PAYMENT_COMPLETED]: 'Triggered when a payment is successfully completed',
  [WebhookEvent.PAYMENT_FAILED]: 'Triggered when a payment fails',
  [WebhookEvent.PAYMENT_REFUNDED]: 'Triggered when a payment is refunded',
  [WebhookEvent.PAYMENT_PENDING]: 'Triggered when a payment is pending or processing',

  [WebhookEvent.CASHLESS_TOPUP]: 'Triggered when a cashless account is topped up',
  [WebhookEvent.CASHLESS_PAYMENT]: 'Triggered when a cashless payment is made',
  [WebhookEvent.CASHLESS_REFUND]: 'Triggered when a cashless refund is processed',
  [WebhookEvent.CASHLESS_TRANSFER]: 'Triggered when cashless balance is transferred',

  [WebhookEvent.FESTIVAL_UPDATED]: 'Triggered when festival details are updated',
  [WebhookEvent.FESTIVAL_PUBLISHED]: 'Triggered when a festival is published',
  [WebhookEvent.FESTIVAL_STATUS_CHANGED]: 'Triggered when festival status changes',

  [WebhookEvent.USER_REGISTERED]: 'Triggered when a new user registers',
  [WebhookEvent.USER_UPDATED]: 'Triggered when a user profile is updated',
  [WebhookEvent.USER_DELETED]: 'Triggered when a user is deleted (GDPR)',

  [WebhookEvent.VENDOR_ORDER_CREATED]: 'Triggered when a vendor order is created',
  [WebhookEvent.VENDOR_ORDER_UPDATED]: 'Triggered when a vendor order status changes',

  [WebhookEvent.ZONE_ENTRY]: 'Triggered when someone enters a zone',
  [WebhookEvent.ZONE_EXIT]: 'Triggered when someone exits a zone',
  [WebhookEvent.ZONE_CAPACITY_ALERT]: 'Triggered when zone capacity threshold is reached',
};

/**
 * Get all webhook events as an array
 */
export function getAllWebhookEvents(): WebhookEvent[] {
  return Object.values(WebhookEvent);
}

/**
 * Get webhook events by category
 */
export function getWebhookEventsByCategory(category: WebhookEventCategory): WebhookEvent[] {
  return Object.entries(WEBHOOK_EVENT_CATEGORIES)
    .filter(([, cat]) => cat === category)
    .map(([event]) => event as WebhookEvent);
}

/**
 * Validate if a string is a valid webhook event
 */
export function isValidWebhookEvent(event: string): event is WebhookEvent {
  return Object.values(WebhookEvent).includes(event as WebhookEvent);
}

/**
 * Get all events grouped by category
 */
export function getWebhookEventsGroupedByCategory(): Record<WebhookEventCategory, WebhookEvent[]> {
  const grouped: Record<WebhookEventCategory, WebhookEvent[]> = {
    [WebhookEventCategory.TICKETS]: [],
    [WebhookEventCategory.PAYMENTS]: [],
    [WebhookEventCategory.CASHLESS]: [],
    [WebhookEventCategory.FESTIVAL]: [],
    [WebhookEventCategory.USER]: [],
    [WebhookEventCategory.VENDOR]: [],
    [WebhookEventCategory.ZONE]: [],
  };

  for (const [event, category] of Object.entries(WEBHOOK_EVENT_CATEGORIES)) {
    grouped[category].push(event as WebhookEvent);
  }

  return grouped;
}
