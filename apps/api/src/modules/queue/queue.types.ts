/**
 * Queue Types and Interfaces
 *
 * This file defines all types used by the queue system.
 */

/**
 * Available queue names in the system
 */
export enum QueueName {
  /** Email sending queue */
  EMAIL = 'email',
  /** Notification dispatch queue */
  NOTIFICATION = 'notification',
  /** Payment processing queue */
  PAYMENT = 'payment',
  /** Ticket generation queue */
  TICKET = 'ticket',
  /** PDF generation queue */
  PDF = 'pdf',
  /** Analytics processing queue */
  ANALYTICS = 'analytics',
  /** Cashless transaction queue */
  CASHLESS = 'cashless',
  /** Webhook delivery queue */
  WEBHOOK = 'webhook',
  /** Report generation queue */
  REPORT = 'report',
  /** Data export queue */
  EXPORT = 'export',
  /** Data import queue */
  IMPORT = 'import',
  /** Cleanup and maintenance queue */
  MAINTENANCE = 'maintenance',
}

/**
 * Job priority levels
 */
export enum JobPriority {
  CRITICAL = 1,
  HIGH = 2,
  NORMAL = 3,
  LOW = 4,
  BACKGROUND = 5,
}

/**
 * Job status values
 */
export enum JobStatus {
  WAITING = 'waiting',
  ACTIVE = 'active',
  COMPLETED = 'completed',
  FAILED = 'failed',
  DELAYED = 'delayed',
  PAUSED = 'paused',
}

/**
 * Base job data interface
 */
export interface BaseJobData {
  /** Job identifier for tracking */
  jobId?: string;
  /** User ID who initiated the job */
  userId?: string;
  /** Festival ID for multi-tenant context */
  festivalId?: string;
  /** Job creation timestamp */
  createdAt?: Date;
  /** Additional metadata */
  metadata?: Record<string, unknown>;
}

/**
 * Email job data
 */
export interface EmailJobData extends BaseJobData {
  to: string | string[];
  subject: string;
  template: string;
  context: Record<string, unknown>;
  attachments?: {
    filename: string;
    content?: string | Buffer;
    path?: string;
  }[];
  replyTo?: string;
  cc?: string[];
  bcc?: string[];
}

/**
 * Notification job data
 */
export interface NotificationJobData extends BaseJobData {
  type: 'push' | 'in-app' | 'sms' | 'all';
  title: string;
  body: string;
  targetUserIds?: string[];
  targetFestivalId?: string;
  targetRole?: string;
  data?: Record<string, unknown>;
  imageUrl?: string;
  actionUrl?: string;
}

/**
 * Payment job data
 */
export interface PaymentJobData extends BaseJobData {
  paymentId: string;
  action: 'process' | 'refund' | 'verify' | 'capture';
  amount?: number;
  currency?: string;
  stripePaymentIntentId?: string;
}

/**
 * Ticket job data
 */
export interface TicketJobData extends BaseJobData {
  ticketId?: string;
  action: 'generate' | 'send' | 'validate' | 'cancel';
  ticketCategoryId?: string;
  quantity?: number;
  purchaseData?: Record<string, unknown>;
}

/**
 * PDF generation job data
 */
export interface PdfJobData extends BaseJobData {
  type: 'ticket' | 'invoice' | 'badge' | 'program' | 'report';
  templateData: Record<string, unknown>;
  outputPath?: string;
  sendEmail?: boolean;
  recipientEmail?: string;
}

/**
 * Analytics job data
 */
export interface AnalyticsJobData extends BaseJobData {
  eventType: string;
  eventData: Record<string, unknown>;
  aggregationType?: 'realtime' | 'hourly' | 'daily';
}

/**
 * Cashless job data
 */
export interface CashlessJobData extends BaseJobData {
  accountId: string;
  action: 'topup' | 'payment' | 'refund' | 'transfer';
  amount: number;
  transactionId?: string;
  vendorId?: string;
  targetAccountId?: string;
}

/**
 * Webhook job data
 */
export interface WebhookJobData extends BaseJobData {
  url: string;
  payload: Record<string, unknown>;
  headers?: Record<string, string>;
  retryCount?: number;
  eventType: string;
}

/**
 * Report job data
 */
export interface ReportJobData extends BaseJobData {
  reportType: 'sales' | 'attendance' | 'financial' | 'analytics' | 'custom';
  dateRange: {
    start: Date;
    end: Date;
  };
  filters?: Record<string, unknown>;
  format: 'pdf' | 'csv' | 'xlsx';
  deliveryMethod: 'download' | 'email';
  recipientEmail?: string;
}

/**
 * Export job data
 */
export interface ExportJobData extends BaseJobData {
  entityType: 'users' | 'tickets' | 'payments' | 'transactions' | 'orders';
  format: 'csv' | 'json' | 'xlsx';
  filters?: Record<string, unknown>;
  fields?: string[];
  limit?: number;
}

/**
 * Import job data
 */
export interface ImportJobData extends BaseJobData {
  entityType: 'users' | 'tickets' | 'products';
  format: 'csv' | 'json';
  filePath: string;
  mapping?: Record<string, string>;
  upsert?: boolean;
  validateOnly?: boolean;
}

/**
 * Maintenance job data
 */
export interface MaintenanceJobData extends BaseJobData {
  task: 'cleanup' | 'optimize' | 'backup' | 'archive' | 'expire-sessions';
  options?: Record<string, unknown>;
}

/**
 * Job options configuration
 */
export interface QueueJobOptions {
  /** Job priority (1-5, lower is higher priority) */
  priority?: JobPriority;
  /** Delay in milliseconds before processing */
  delay?: number;
  /** Number of retry attempts */
  attempts?: number;
  /** Backoff strategy for retries */
  backoff?: {
    type: 'exponential' | 'fixed';
    delay: number;
  };
  /** Remove job on completion */
  removeOnComplete?: boolean | number;
  /** Remove job on failure */
  removeOnFail?: boolean | number;
  /** Job ID for deduplication */
  jobId?: string;
  /** Repeat configuration for scheduled jobs */
  repeat?: {
    pattern?: string; // Cron pattern
    every?: number; // Repeat every X milliseconds
    limit?: number; // Max number of times to repeat
  };
}

/**
 * Queue statistics
 */
export interface QueueStats {
  name: string;
  waiting: number;
  active: number;
  completed: number;
  failed: number;
  delayed: number;
  paused: boolean;
}

/**
 * Job result
 */
export interface JobResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  duration?: number;
}

/**
 * Union type for all job data types
 */
export type JobData =
  | EmailJobData
  | NotificationJobData
  | PaymentJobData
  | TicketJobData
  | PdfJobData
  | AnalyticsJobData
  | CashlessJobData
  | WebhookJobData
  | ReportJobData
  | ExportJobData
  | ImportJobData
  | MaintenanceJobData;
