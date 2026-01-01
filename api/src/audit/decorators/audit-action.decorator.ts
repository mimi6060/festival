import { SetMetadata } from '@nestjs/common';

export const AUDIT_ACTION_KEY = 'audit_action';

export interface AuditActionMetadata {
  action: string;
  entityType: string;
  extractEntityId?: (request: any) => string | null;
  extractOldValue?: (request: any) => Record<string, unknown> | null;
  extractNewValue?: (response: any, request: any) => Record<string, unknown> | null;
}

/**
 * Decorator to mark a controller method for automatic audit logging
 *
 * @example
 * // Basic usage - logs action and entity type
 * @AuditAction('CREATE', 'Payment')
 *
 * @example
 * // With entity ID extraction from URL params
 * @AuditAction('UPDATE', 'User', {
 *   extractEntityId: (req) => req.params.id,
 * })
 *
 * @example
 * // With full value extraction
 * @AuditAction('UPDATE', 'Festival', {
 *   extractEntityId: (req) => req.params.id,
 *   extractOldValue: (req) => req.body.originalData,
 *   extractNewValue: (res) => res.data,
 * })
 */
export const AuditAction = (
  action: string,
  entityType: string,
  options?: Partial<Omit<AuditActionMetadata, 'action' | 'entityType'>>,
): MethodDecorator => {
  return SetMetadata(AUDIT_ACTION_KEY, {
    action,
    entityType,
    ...options,
  });
};

// Predefined audit actions for common operations
export const AuditActions = {
  // Authentication
  LOGIN: 'LOGIN',
  LOGOUT: 'LOGOUT',
  REGISTER: 'REGISTER',
  PASSWORD_RESET: 'PASSWORD_RESET',
  PASSWORD_CHANGE: 'PASSWORD_CHANGE',
  TOKEN_REFRESH: 'TOKEN_REFRESH',

  // CRUD operations
  CREATE: 'CREATE',
  READ: 'READ',
  UPDATE: 'UPDATE',
  DELETE: 'DELETE',
  SOFT_DELETE: 'SOFT_DELETE',
  RESTORE: 'RESTORE',

  // Payment operations
  PAYMENT_INITIATED: 'PAYMENT_INITIATED',
  PAYMENT_COMPLETED: 'PAYMENT_COMPLETED',
  PAYMENT_FAILED: 'PAYMENT_FAILED',
  REFUND_REQUESTED: 'REFUND_REQUESTED',
  REFUND_COMPLETED: 'REFUND_COMPLETED',

  // Cashless operations
  CASHLESS_TOPUP: 'CASHLESS_TOPUP',
  CASHLESS_PAYMENT: 'CASHLESS_PAYMENT',
  CASHLESS_TRANSFER: 'CASHLESS_TRANSFER',
  CASHLESS_REFUND: 'CASHLESS_REFUND',
  NFC_LINKED: 'NFC_LINKED',

  // Ticket operations
  TICKET_PURCHASED: 'TICKET_PURCHASED',
  TICKET_VALIDATED: 'TICKET_VALIDATED',
  TICKET_CANCELLED: 'TICKET_CANCELLED',

  // Admin operations
  USER_BANNED: 'USER_BANNED',
  USER_ACTIVATED: 'USER_ACTIVATED',
  ROLE_CHANGED: 'ROLE_CHANGED',

  // Security events
  FAILED_LOGIN: 'FAILED_LOGIN',
  SUSPICIOUS_ACTIVITY: 'SUSPICIOUS_ACTIVITY',
  API_KEY_GENERATED: 'API_KEY_GENERATED',
  API_KEY_REVOKED: 'API_KEY_REVOKED',
};

// Entity types for consistency
export const EntityTypes = {
  USER: 'User',
  FESTIVAL: 'Festival',
  TICKET: 'Ticket',
  TICKET_CATEGORY: 'TicketCategory',
  PAYMENT: 'Payment',
  CASHLESS_ACCOUNT: 'CashlessAccount',
  CASHLESS_TRANSACTION: 'CashlessTransaction',
  ZONE: 'Zone',
  STAFF_ASSIGNMENT: 'StaffAssignment',
  AUTH: 'Auth',
  SYSTEM: 'System',
};
